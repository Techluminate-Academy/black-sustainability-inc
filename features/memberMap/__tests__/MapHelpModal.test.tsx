import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MapHelpModal from "../MapHelpModal";
import { MAP_HELP_INTRO } from "@/lib/mapSupportConfig";

jest.mock("@/lib/mapSupportConfig", () => ({
  MAP_HELP_INTRO: "Running into any issues? Let us know here:",
  getMapSupportFormUrl: () => "https://forms.test/map-support",
}));

describe("MapHelpModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when closed", () => {
    render(<MapHelpModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows approved text and external form link when open", async () => {
    render(<MapHelpModal isOpen onClose={onClose} />);

    expect(await screen.findByTestId("map-help-intro")).toHaveTextContent(MAP_HELP_INTRO);
    const link = screen.getByTestId("map-help-form-link");
    expect(link).toHaveAttribute("href", "https://forms.test/map-support");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("closes on backdrop click and Escape", async () => {
    render(<MapHelpModal isOpen onClose={onClose} />);

    fireEvent.click(await screen.findByTestId("map-help-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
