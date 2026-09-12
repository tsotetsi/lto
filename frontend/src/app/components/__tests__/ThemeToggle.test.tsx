import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "../ThemeToggle";

// Create a simple mock for useTheme
const mockToggleTheme = jest.fn();
let mockTheme: "dark" | "light" = "dark";

jest.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: mockToggleTheme,
    setTheme: jest.fn(),
  }),
}));

beforeEach(() => {
  mockTheme = "dark";
  mockToggleTheme.mockClear();
});

describe("ThemeToggle", () => {
  it("renders a button with aria-label", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("shows title 'Switch to light mode' when theme is dark", () => {
    render(<ThemeToggle />);
    expect(screen.getByTitle("Switch to light mode")).toBeInTheDocument();
  });

  it("shows title 'Switch to dark mode' when theme is light", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Switch to dark mode")).toBeInTheDocument();
  });

  it("calls toggleTheme on click", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("renders with the sun icon visible in dark mode", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    // In dark mode, the sun icon (first svg) has opacity-100 class
    const svgs = button.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
    expect(svgs[0].classList.contains("opacity-100")).toBe(true);
    expect(svgs[1].classList.contains("opacity-100")).toBe(false);
  });

  it("renders with the moon icon visible in light mode", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    const svgs = button.querySelectorAll("svg");
    expect(svgs[0].classList.contains("opacity-100")).toBe(false);
    expect(svgs[1].classList.contains("opacity-100")).toBe(true);
  });
});
