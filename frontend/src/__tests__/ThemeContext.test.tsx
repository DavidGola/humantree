import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("useTheme", () => {
  it("isDarkMode est false par défaut", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.isDarkMode).toBe(false);
  });

  it("restore dark mode depuis localStorage", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.isDarkMode).toBe(true);
  });

  it("toggleDarkMode passe en dark", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.toggleDarkMode());
    expect(result.current.isDarkMode).toBe(true);
  });

  it("toggleDarkMode repasse en light", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.toggleDarkMode());
    expect(result.current.isDarkMode).toBe(false);
  });

  it("dark mode ajoute la classe 'dark' sur documentElement", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.toggleDarkMode());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("light mode retire la classe 'dark' de documentElement", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.toggleDarkMode());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persiste 'dark' dans localStorage", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.toggleDarkMode());
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("persiste 'light' dans localStorage", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.toggleDarkMode());
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
