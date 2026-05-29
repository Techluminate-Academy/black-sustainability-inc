import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MemberMapProfileModal from "../MemberMapProfileModal";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} src={props.src} />
  ),
}));

jest.mock("@/components/common/BioWithReadMore", () => ({
  __esModule: true,
  default: ({ bio }: { bio: string }) => <p>{bio}</p>,
}));

jest.mock("@/icons", () => ({
  __esModule: true,
  default: {
    email: () => <span data-testid="icon-email" />,
    location: () => <span data-testid="icon-location" />,
    organization: () => <span data-testid="icon-organization" />,
  },
}));

const mockProfile = {
  firstName: "Jerry",
  lastName: "Bony",
  email: "jerry@example.com",
  photoUrl: "",
  location: "New York, NY, USA",
  organizationName: null,
  bio: "Test bio",
  memberLevelLabel: null,
};

describe("MemberMapProfileModal", () => {
  const onClose = jest.fn();
  const onEditProfile = jest.fn();
  const sessionUser = { firstName: "Jerry", lastName: "Bony", email: "jerry@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, profile: mockProfile }),
    }) as jest.Mock;
  });

  it("does not render when closed", () => {
    render(<MemberMapProfileModal isOpen={false} onClose={onClose} sessionUser={sessionUser} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows backdrop and loading, then profile fields", async () => {
    render(
      <MemberMapProfileModal
        isOpen
        onClose={onClose}
        onEditProfile={onEditProfile}
        sessionUser={sessionUser}
      />
    );

    const backdrop = await screen.findByTestId("member-map-profile-backdrop");
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveStyle({ backgroundColor: "rgba(0, 0, 0, 0.6)" });

    expect(screen.getByTestId("member-map-profile-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("member-map-profile-name")).not.toBeInTheDocument();

    expect(await screen.findByTestId("member-map-profile-name")).toHaveTextContent("Jerry Bony");
    expect(screen.getByText("jerry@example.com")).toBeInTheDocument();
    expect(screen.getByText("New York, NY, USA")).toBeInTheDocument();
    expect(screen.getByText("Test bio")).toBeInTheDocument();
    expect(screen.getByTestId("member-map-profile-level")).toHaveTextContent(/Member level:/i);
    expect(screen.getByTestId("member-map-profile-level")).toHaveTextContent(/Not provided/i);
    expect(screen.getByTestId("member-level-visibility-hint")).toBeInTheDocument();

    const bsnLink = screen.getByTestId("member-map-profile-bsn-link");
    expect(bsnLink).toHaveAttribute("href", "https://www.blacksustainability.org/");
    expect(bsnLink).toHaveAttribute("target", "_blank");
    expect(bsnLink).toHaveTextContent("Visit the Black Sustainability Network");
    expect(screen.getByTestId("member-map-profile-info-hint")).toBeInTheDocument();
  });

  it("shows profile info tooltip on hint click", async () => {
    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    await screen.findByTestId("member-map-profile-name");
    fireEvent.click(screen.getByTestId("member-map-profile-info-hint"));
    expect(screen.getByTestId("member-map-profile-info-tooltip")).toHaveClass("block");
  });

  it("shows BSN home link while loading", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);

    const bsnLink = screen.getByTestId("member-map-profile-bsn-link");
    expect(bsnLink).toBeInTheDocument();
    expect(bsnLink).toHaveAttribute("href", "https://www.blacksustainability.org/");

    resolveFetch({
      ok: true,
      json: async () => ({ ok: true, profile: mockProfile }),
    });
    await screen.findByTestId("member-map-profile-name");
    expect(screen.getByTestId("member-map-profile-bsn-link")).toBeInTheDocument();
  });

  it("shows member level visibility tooltip on hint click", async () => {
    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    await screen.findByTestId("member-map-profile-name");
    fireEvent.click(screen.getByTestId("member-level-visibility-hint"));
    expect(screen.getByTestId("member-level-visibility-tooltip")).toHaveClass("block");
  });

  it("closes when backdrop is clicked", async () => {
    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    const backdrop = await screen.findByTestId("member-map-profile-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when Close button is clicked", async () => {
    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    fireEvent.click(await screen.findByRole("button", { name: /close profile/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape key", async () => {
    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ ok: false, error: "Failed to load profile" }),
    });

    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load profile");
  });

  it("locks body scroll while open", async () => {
    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    await screen.findByRole("dialog");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("uses mobile-friendly layout classes on the panel", async () => {
    render(<MemberMapProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    const panel = await screen.findByTestId("member-map-profile-modal");
    expect(panel.className).toMatch(/rounded-t-2xl/);
    expect(panel.className).toMatch(/max-h-\[min\(88dvh/);
    await waitFor(() => {
      expect(screen.getByTestId("member-map-profile-name")).toBeInTheDocument();
    });
  });
});
