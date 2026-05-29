import React from "react";
import { render, screen } from "@testing-library/react";
import SupportTicketForm from "../SupportTicketForm";

describe("SupportTicketForm", () => {
  it("shows email field on public support page even when signed in", () => {
    render(
      <SupportTicketForm
        sessionUser={{ email: "member@example.com", firstName: "Test" }}
        showEmailField
        requireEmail
        ticketSource="support-page"
        showIntro={false}
      />
    );

    const emailInput = screen.getByTestId("map-help-email");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue("member@example.com");
    expect(emailInput).toBeRequired();
  });
});
