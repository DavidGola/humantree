import logging
import time

from fastapi import HTTPException
from opentelemetry import trace
from sqlalchemy.ext.asyncio import AsyncSession

from app.metrics import (
    agent_attempts_total,
    agent_fallback_total,
    agent_quality_score,
    agent_run_duration_seconds,
    agent_runs_total,
)
from app.services.agent.evaluator import evaluate_tree
from app.services.agent.improver import improve_tree
from app.services.agent.state import (
    AgentConfig,
    AgentMetadata,
    AgentPhase,
    AgentResult,
    AgentState,
    AgentStep,
)
from app.services.ai_service import (
    SYSTEM_PROMPT,
    _call_provider,
    _extract_json,
    _validate_tree_structure,
)
from app.services.api_key_service import get_api_key, list_api_keys
from app.constants import MAX_TOKENS_GENERATE

logger = logging.getLogger(__name__)
tracer = trace.get_tracer("humantree.agent")


async def _call_with_fallback(
    providers: dict[str, str],
    primary: str,
    call_fn,
) -> tuple:
    """Try primary provider, then fallback to others on failure.

    Args:
        providers: {provider_name: api_key} mapping
        primary: primary provider name
        call_fn: async callable(provider, api_key) -> result

    Returns:
        (result, provider_used, fallback_used)
    """
    order = [primary] + [p for p in providers if p != primary]
    last_error = None

    for provider in order:
        api_key = providers.get(provider)
        if not api_key:
            continue
        try:
            result = await call_fn(provider, api_key)
            return result, provider, provider != primary
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Provider {provider} failed: {e}")
            last_error = e
            continue

    raise last_error or HTTPException(status_code=502, detail="All providers failed")


async def run_tree_agent(
    db: AsyncSession,
    user_id: int,
    prompt: str,
    provider: str | None = None,
    config: AgentConfig | None = None,
) -> AgentResult:
    """Orchestrate skill tree generation with quality evaluation and provider fallback."""
    if config is None:
        config = AgentConfig()

    # Resolve providers and API keys
    configured = await list_api_keys(db, user_id)
    if not configured:
        raise HTTPException(
            status_code=400,
            detail="Aucune clé API configurée. Ajoutez une clé dans votre profil.",
        )

    if provider is None:
        provider = configured[0].provider

    # Build providers dict {provider: api_key}
    providers: dict[str, str] = {}
    for cfg in configured:
        key = await get_api_key(db, user_id, cfg.provider)
        if key:
            providers[cfg.provider] = key

    if provider not in providers:
        raise HTTPException(
            status_code=400,
            detail=f"Aucune clé API configurée pour {provider}.",
        )

    state = AgentState(provider_used=provider)
    start_time = time.perf_counter()

    with tracer.start_as_current_span(
        "agent_pipeline",
        attributes={
            "agent.prompt_length": len(prompt),
            "agent.max_attempts": config.max_attempts,
            "agent.quality_threshold": config.quality_threshold,
            "agent.timeout_budget": config.timeout_budget,
        },
    ) as root_span:
        while state.phase != AgentPhase.DONE:
            elapsed = time.perf_counter() - start_time
            remaining = config.timeout_budget - elapsed

            if remaining < 15.0 and state.tree_data is not None:
                logger.info("Agent timeout budget low, finishing with best result")
                state.phase = AgentPhase.DONE
                break

            if state.phase == AgentPhase.GENERATE:
                await _step_generate(state, providers, provider, prompt, config, root_span)

            elif state.phase == AgentPhase.EVALUATE:
                await _step_evaluate(state, providers, config, root_span)

            elif state.phase == AgentPhase.IMPROVE:
                elapsed = time.perf_counter() - start_time
                if config.timeout_budget - elapsed < 15.0:
                    logger.info("Agent timeout budget low, skipping improve")
                    state.phase = AgentPhase.DONE
                    break
                await _step_improve(state, providers, prompt, root_span)

        duration = time.perf_counter() - start_time

        # Use best result if available
        tree = state.best_tree or state.tree_data
        quality = state.best_quality or state.quality

        # Determine outcome
        if tree is None:
            outcome = "error"
        elif state.fallback_used:
            outcome = "fallback_success"
        elif quality and quality.overall < config.quality_threshold:
            outcome = "degraded"
        else:
            outcome = "success"

        # Prometheus metrics
        agent_runs_total.labels(outcome=outcome).inc()
        agent_run_duration_seconds.observe(duration)
        agent_attempts_total.observe(state.attempts)
        if quality:
            agent_quality_score.observe(quality.overall)
        if state.fallback_used and state.fallback_provider:
            agent_fallback_total.labels(
                primary_provider=provider,
                fallback_provider=state.fallback_provider,
            ).inc()

        # OTel span
        root_span.set_attribute("agent.outcome", outcome)
        root_span.set_attribute("agent.total_attempts", state.attempts)
        root_span.set_attribute("agent.fallback_used", state.fallback_used)
        root_span.set_attribute("agent.provider_used", state.provider_used)
        root_span.set_attribute("agent.duration_seconds", round(duration, 3))
        if quality:
            root_span.set_attribute("agent.final_quality_score", quality.overall)

        # Structured log
        logger.info(
            "agent_pipeline",
            extra={
                "event": "agent_pipeline",
                "outcome": outcome,
                "attempts": state.attempts,
                "provider_used": state.provider_used,
                "fallback_used": state.fallback_used,
                "quality_score": quality.overall if quality else None,
                "duration_seconds": round(duration, 3),
                "total_input_tokens": state.total_input_tokens,
                "total_output_tokens": state.total_output_tokens,
            },
        )

        if tree is None:
            raise HTTPException(status_code=502, detail="L'agent n'a pas pu générer un arbre valide.")

        return AgentResult(
            tree_data=tree,
            metadata=AgentMetadata(
                provider_used=state.provider_used,
                fallback_used=state.fallback_used,
                fallback_provider=state.fallback_provider,
                quality_score=quality,
                attempts=state.attempts,
                total_input_tokens=state.total_input_tokens,
                total_output_tokens=state.total_output_tokens,
                agent_duration_seconds=round(duration, 3),
                steps=state.steps,
            ),
        )


async def _step_generate(
    state: AgentState,
    providers: dict[str, str],
    primary: str,
    prompt: str,
    config: AgentConfig,
    root_span,
):
    """GENERATE phase: call LLM and parse tree."""
    step_start = time.perf_counter()
    state.attempts += 1

    with tracer.start_as_current_span("agent_step.generate", attributes={"agent.step.attempt": state.attempts}):
        try:
            async def _gen(prov, key):
                return await _call_provider(
                    prov, key, prompt, SYSTEM_PROMPT,
                    max_tokens=MAX_TOKENS_GENERATE, json_mode=True, endpoint="generate-tree",
                )

            result, used_provider, fallback = await _call_with_fallback(providers, primary, _gen)
            state.provider_used = used_provider
            if fallback:
                state.fallback_used = True
                state.fallback_provider = used_provider
            state.total_input_tokens += result.input_tokens
            state.total_output_tokens += result.output_tokens

            tree_data = _extract_json(result.text)
            _validate_tree_structure(tree_data)
            state.tree_data = tree_data

            # Track best
            if state.best_tree is None:
                state.best_tree = tree_data

            state.phase = AgentPhase.EVALUATE
            state.steps.append(AgentStep(
                phase="generate", provider=used_provider,
                duration_seconds=round(time.perf_counter() - step_start, 3),
                success=True, input_tokens=result.input_tokens, output_tokens=result.output_tokens,
            ))

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Generate step failed: {e}")
            state.steps.append(AgentStep(
                phase="generate", provider=state.provider_used,
                duration_seconds=round(time.perf_counter() - step_start, 3), success=False,
            ))
            if state.attempts >= config.max_attempts:
                state.phase = AgentPhase.DONE
            else:
                state.phase = AgentPhase.GENERATE


async def _step_evaluate(
    state: AgentState,
    providers: dict[str, str],
    config: AgentConfig,
    root_span,
):
    """EVALUATE phase: score the current tree."""
    step_start = time.perf_counter()

    with tracer.start_as_current_span("agent_step.evaluate"):
        api_key = providers.get(state.provider_used, "")
        quality = await evaluate_tree(state.tree_data or {}, state.provider_used, api_key)
        state.quality = quality

        # Track best result
        if state.best_quality is None or quality.overall > state.best_quality.overall:
            state.best_tree = state.tree_data
            state.best_quality = quality

        root_span.set_attribute("agent.step.quality_score", quality.overall)

        state.steps.append(AgentStep(
            phase="evaluate", provider=state.provider_used,
            duration_seconds=round(time.perf_counter() - step_start, 3), success=True,
        ))

        if quality.overall >= config.quality_threshold:
            state.phase = AgentPhase.DONE
        elif state.attempts >= config.max_attempts:
            state.phase = AgentPhase.DONE
        else:
            state.phase = AgentPhase.IMPROVE


async def _step_improve(
    state: AgentState,
    providers: dict[str, str],
    prompt: str,
    root_span,
):
    """IMPROVE phase: regenerate tree with feedback."""
    step_start = time.perf_counter()
    state.attempts += 1

    with tracer.start_as_current_span("agent_step.improve", attributes={"agent.step.attempt": state.attempts}):
        try:
            api_key = providers.get(state.provider_used, "")
            feedback = state.quality.feedback if state.quality else ""
            improved = await improve_tree(
                state.tree_data or {}, feedback, prompt, state.provider_used, api_key,
            )
            state.tree_data = improved
            state.phase = AgentPhase.EVALUATE
            state.steps.append(AgentStep(
                phase="improve", provider=state.provider_used,
                duration_seconds=round(time.perf_counter() - step_start, 3), success=True,
            ))

        except Exception as e:
            logger.warning(f"Improve step failed: {e}")
            state.steps.append(AgentStep(
                phase="improve", provider=state.provider_used,
                duration_seconds=round(time.perf_counter() - step_start, 3), success=False,
            ))
            state.phase = AgentPhase.DONE
