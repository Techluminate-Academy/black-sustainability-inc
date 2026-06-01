import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MapHelpModal from "../MapHelpModal";
import { MAP_HELP_INTRO } from "@/lib/mapSupportConfig";

jest.mock("@/lib/mapSupportConfig", () => ({
  MAP_HELP_INTRO: "Running into any issues? Let us know here:",
}));

describe("MapHelpModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as unknown) = jest.fn();
  });

  it("does not render when closed", () => {
    render(<MapHelpModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows approved intro text and the ticket form when open", async () => {
    render(<MapHelpModal isOpen onClose={onClose} />);

    expect(await screen.findByTestId("map-help-intro")).toHaveTextContent(MAP_HELP_INTRO);
    expect(screen.getByTestId("map-help-message")).toBeInTheDocument();
    expect(screen.getByTestId("map-help-submit")).toBeInTheDocument();
  });

  it("shows an optional email field only for anonymous users", async () => {
    const { rerender } = render(<MapHelpModal isOpen onClose={onClose} />);
    expect(await screen.findByTestId("map-help-email")).toBeInTheDocument();

    rerender(
      <MapHelpModal
        isOpen
        onClose={onClose}
        sessionUser={{ email: "member@example.com" }}
      />
    );
    expect(screen.queryByTestId("map-help-email")).not.toBeInTheDocument();
  });

  it("submits the ticket and shows the ticket number on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, ticketNumber: "BSN-000042", confirmationSent: true }),
    });

    render(
      <MapHelpModal isOpen onClose={onClose} sessionUser={{ email: "member@example.com" }} />
    );

    fireEvent.change(screen.getByTestId("map-help-message"), {
      target: { value: "My pin is not showing on the map." },
    });
    fireEvent.click(screen.getByTestId("map-help-submit"));

    expect(await screen.findByTestId("map-help-success")).toBeInTheDocument();
    expect(screen.getByTestId("map-help-ticket-number")).toHaveTextContent("BSN-000042");

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      message: "My pin is not showing on the map.",
      email: "member@example.com",
    });
  });

  it("shows an error when the message is too short", async () => {
    render(<MapHelpModal isOpen onClose={onClose} sessionUser={{ email: "m@example.com" }} />);

    fireEvent.change(screen.getByTestId("map-help-message"), { target: { value: "x" } });
    fireEvent.click(screen.getByTestId("map-help-submit"));

    expect(await screen.findByTestId("map-help-error")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("surfaces server errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ ok: false, error: "Failed to submit ticket. Please try again." }),
    });

    render(<MapHelpModal isOpen onClose={onClose} sessionUser={{ email: "m@example.com" }} />);

    fireEvent.change(screen.getByTestId("map-help-message"), {
      target: { value: "Something is broken" },
    });
    fireEvent.click(screen.getByTestId("map-help-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("map-help-error")).toHaveTextContent(
        "Failed to submit ticket. Please try again."
      )
    );
  });

  it("closes on backdrop click and Escape", async () => {
    render(<MapHelpModal isOpen onClose={onClose} />);

    fireEvent.click(await screen.findByTestId("map-help-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
