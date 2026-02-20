import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../components/Button";

describe("Button", () => {
  it("affiche le texte enfant", () => {
    render(<Button variant="primary">Cliquer</Button>);
    expect(screen.getByText("Cliquer")).toBeDefined();
  });

  it("appelle onClick au clic", () => {
    const handleClick = vi.fn();
    render(
      <Button variant="primary" onClick={handleClick}>
        Cliquer
      </Button>,
    );
    fireEvent.click(screen.getByText("Cliquer"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("ne crash pas sans onClick", () => {
    render(<Button variant="primary">Safe</Button>);
    fireEvent.click(screen.getByText("Safe"));
  });

  it("a le type 'button' par défaut", () => {
    render(<Button variant="primary">Test</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("accepte le type 'submit'", () => {
    render(
      <Button variant="primary" type="submit">
        Submit
      </Button>,
    );
    expect(screen.getByRole("button").getAttribute("type")).toBe("submit");
  });

  it("applique le style primary", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-blue-600");
  });

  it("applique le style danger", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-red-600");
  });

  it("applique le style secondary", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-gray-100");
  });

  it("applique le style success", () => {
    render(<Button variant="success">Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-emerald-500");
  });
});
