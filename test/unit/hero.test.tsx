import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Hero } from "@/components/landing/hero";

describe("Hero", () => {
  test("renders the primary heading and main call to action", () => {
    render(<Hero />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Crypto Prediction Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Launch Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
