import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MapProfileInfoHint from "../index";

describe("MapProfileInfoHint", () => {
  it("shows the Network profile tooltip on click", () => {
    render(<MapProfileInfoHint />);
    fireEvent.click(screen.getByTestId("member-map-profile-info-hint"));
    expect(screen.getByTestId("member-map-profile-info-tooltip")).toHaveClass("block");
    expect(screen.getByTestId("member-map-profile-info-tooltip")).toHaveTextContent(
      /Black Sustainability Network/i
    );
  });
});
