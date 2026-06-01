"use client";

import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import SupportTicketForm, {
  type SupportTicketSessionUser,
} from "@/features/memberMap/SupportTicketForm";

type SessionResp =
  | { authenticated: false; user: null }
  | {
      authenticated: true;
      user: { email: string; mightyId: number; firstName?: string | null; lastName?: string | null };
    };

/**
 * Public map support form — no login required.
 * Staff review tickets at /admin/support-tickets (admin only).
 */
export default function SupportPage() {
  const [sessionUser, setSessionUser] = useState<SupportTicketSessionUser>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = (await res.json()) as SessionResp;
        if (!cancelled && data.authenticated) {
          setSessionUser({
            email: data.user.email,
            firstName: data.user.firstName ?? null,
            lastName: data.user.lastName ?? null,
          });
        }
      } catch {
        // Anonymous is fine — the form shows an optional email field.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Head>
        <title>Map Support · Black Sustainability</title>
        <meta
          name="description"
          content="Report an issue with the Black Sustainability member map. Our team will follow up with a ticket number."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-[100dvh] bg-gradient-to-b from-green-50 to-white px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              <span aria-hidden="true">←</span> Back to the map
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="bg-green-600 px-6 py-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-100">
                Black Sustainability
              </p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">Member Map Support</h1>
              <p className="mt-2 text-sm leading-relaxed text-green-50">
                Running into an issue with the map? Send us the details and we&apos;ll create a
                support ticket. You&apos;ll get a ticket number and our team will follow up.
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6">
              <SupportTicketForm
                sessionUser={sessionUser}
                showIntro={false}
                submitLabel="Submit ticket"
                showEmailField
                requireEmail
                ticketSource="support-page"
              />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            For account or membership questions, visit the{" "}
            <a
              href="https://www.blacksustainability.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-green-700 underline underline-offset-2 hover:text-green-800"
            >
              Black Sustainability Network
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
}
