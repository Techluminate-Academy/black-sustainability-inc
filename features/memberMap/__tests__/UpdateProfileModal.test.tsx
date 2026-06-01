import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateProfileModal from "../UpdateProfileModal";

const mockProfile = {
  firstName: "Jerry",
  lastName: "Bony",
  email: "jerry@example.com",
  photoUrl: "",
  location: null,
  organizationName: "Tech Co",
  bio: "Test bio",
  memberLevelLabel: null,
};

describe("UpdateProfileModal", () => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  const sessionUser = { firstName: "Jerry", lastName: "Bony", email: "jerry@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url: string) => {
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: { email: "jerry@example.com", mightyId: 1, firstName: "Jerry", lastName: "Bony" },
          }),
        });
      }
      if (url.includes("/api/member/map-profile")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true, profile: mockProfile }),
        });
      }
      if (url.includes("/api/member/update-profile")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true, profile: mockProfile }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    }) as jest.Mock;
  });

  it("does not render when closed", () => {
    render(
      <UpdateProfileModal isOpen={false} onClose={onClose} sessionUser={sessionUser} />
    );
    expect(screen.queryByTestId("update-profile-overlay")).not.toBeInTheDocument();
  });

  it("loads profile fields and saves", async () => {
    render(
      <UpdateProfileModal isOpen onClose={onClose} onSaved={onSaved} sessionUser={sessionUser} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("update-profile-first-name")).toHaveValue("Jerry");
    });
    expect(screen.getByTestId("update-profile-guidance")).toBeInTheDocument();
    expect(screen.getByText(/how to update your map listing/i)).toBeInTheDocument();
    expect(screen.getByTestId("update-profile-organization")).toHaveValue("Tech Co");

    fireEvent.click(screen.getByTestId("update-profile-submit"));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("closes on backdrop click", async () => {
    render(<UpdateProfileModal isOpen onClose={onClose} sessionUser={sessionUser} />);
    await screen.findByTestId("update-profile-form");
    fireEvent.click(screen.getByTestId("update-profile-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
