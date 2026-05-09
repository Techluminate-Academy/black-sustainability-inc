import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

jest.mock("@/lib/reloadPage", () => ({ reloadPage: jest.fn() }));

import ImpersonationToolbar from "@/components/ImpersonationToolbar";
import { reloadPage } from "@/lib/reloadPage";

const STATUS_URL = "/api/me/impersonation-status";
const IMPERSONATE_URL = "/api/test/impersonate";

type FetchHandler = (url: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<any>;
}>;

const installFetch = (handler: FetchHandler) => {
  (global as any).fetch = jest.fn(async (input: any, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.url;
    return handler(url, init);
  });
  return (global as any).fetch as jest.Mock;
};

const mockReload = () => reloadPage as jest.Mock;

describe("ImpersonationToolbar", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    (reloadPage as jest.Mock).mockClear();
  });

  it("renders nothing for non-allowlisted users (allowed: false)", async () => {
    installFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, allowed: false, mode: null }),
    }));

    const { container } = render(<ImpersonationToolbar />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("renders nothing when the status endpoint errors (defensive default)", async () => {
    installFetch(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: "boom" }),
    }));

    const { container } = render(<ImpersonationToolbar />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("renders the toolbar for allowlisted users and shows the current OFF state", async () => {
    installFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, allowed: true, mode: null }),
    }));

    render(<ImpersonationToolbar />);

    expect(await screen.findByRole("region", { name: /tester impersonation/i }))
      .toBeInTheDocument();
    expect(screen.getByText(/Current mode:/i)).toBeInTheDocument();
    expect(screen.getByText(/^OFF$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view as paid/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view as unpaid/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeDisabled();
  });

  it("reflects active mode when the user is currently impersonating PAID", async () => {
    installFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, allowed: true, mode: "paid" }),
    }));

    render(<ImpersonationToolbar />);

    expect(await screen.findByText(/^PAID$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).not.toBeDisabled();
  });

  it("posts to /api/test/impersonate with mode=paid and reloads on success", async () => {
    const reload = mockReload();
    const calls: Array<{ url: string; body?: any }> = [];
    installFetch(async (url, init) => {
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ url, body });
      if (url === STATUS_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, allowed: true, mode: null }),
        };
      }
      if (url === IMPERSONATE_URL) {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    render(<ImpersonationToolbar />);
    const paidBtn = await screen.findByRole("button", { name: /view as paid/i });

    await act(async () => {
      fireEvent.click(paidBtn);
    });

    await waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });

    const impersonate = calls.find((c) => c.url === IMPERSONATE_URL)!;
    expect(impersonate).toBeDefined();
    expect(impersonate.body).toEqual({ mode: "paid" });
  });

  it("alerts and does not reload when the impersonate API rejects", async () => {
    const reload = mockReload();
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    installFetch(async (url) => {
      if (url === STATUS_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, allowed: true, mode: null }),
        };
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ ok: false, error: "Unauthorized" }),
      };
    });

    render(<ImpersonationToolbar />);
    const paidBtn = await screen.findByRole("button", { name: /view as paid/i });

    await act(async () => {
      fireEvent.click(paidBtn);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(reload).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
