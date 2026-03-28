import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def setup_tracing(app, engine):
    """Configure OpenTelemetry tracing pour FastAPI + SQLAlchemy."""
    if os.getenv("ENVIRONMENT") == "test":
        return

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://tempo:4318")

    resource = Resource.create({"service.name": "humantree-backend"})

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces")
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Instrumente automatiquement FastAPI (chaque requête = une trace)
    FastAPIInstrumentor.instrument_app(app)

    # Instrumente SQLAlchemy (chaque requête SQL = un span dans la trace)
    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
