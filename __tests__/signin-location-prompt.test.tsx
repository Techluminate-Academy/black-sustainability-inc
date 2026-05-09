import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockReplace = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({
    query: { next: "/directory" },
    replace: mockReplace,
  }),
}));

function mockFetchSequence(responses: Array<{ ok: boolean; json: any }>) {
  let i = 0;
  global.fetch = jest.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.ok,
      json: async () => r.json,
    } as any;
  }) as any;
}

describe("signin → location prompt integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to /update-location when member missing location/coords", async () => {
    mockFetchSequence([
      { ok: true, json: { ok: true, user: { firstName: "Jerry" } } }, // /api/auth/login
      { ok: true, json: { ok: true, mongo: { location: null, latitude: null, longitude: null } } }, // /api/member/me
    ]);

    const SignInPage = (await import("@/pages/signin")).default;
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jerry@techluminateacademy.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to map/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        "/update-location?forced=1&next=%2Fdirectory"
      );
    });
  });

  it("does not redirect when member opted out", async () => {
    mockFetchSequence([
      { ok: true, json: { ok: true, user: { firstName: "Jerry" } } }, // /api/auth/login
      { ok: true, json: { ok: true, mongo: { locationPromptOptOut: true } } }, // /api/member/me
    ]);

    const SignInPage = (await import("@/pages/signin")).default;
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jerry@techluminateacademy.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to map/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/directory");
    });
  });
});

