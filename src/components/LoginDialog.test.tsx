import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginDialog from "./LoginDialog";

describe("LoginDialog", () => {
  it("clearly offers Google sign-in while truthfully deferring email codes", () => {
    const onGoogleSignIn = vi.fn();
    render(<LoginDialog open onOpenChange={vi.fn()} onGoogleSignIn={onGoogleSignIn} />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(onGoogleSignIn).toHaveBeenCalledOnce();
    expect(screen.getByText("Email code sign-in is coming soon")).toBeTruthy();
  });
});
