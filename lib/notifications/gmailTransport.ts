/**
 * Shared Gmail SMTP transport for server-side notifications.
 * Credentials: EMAIL_USER + EMAIL_PASSWORD from .env (Gmail App Password).
 */
import nodemailer from "nodemailer";
import type Transporter from "nodemailer";

export type GmailTransportConfig = {
  transporter: Transporter;
  /** Authenticated Gmail account (EMAIL_USER). Used as the SMTP From address. */
  authUser: string;
};

export function isGmailConfigured(): boolean {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASSWORD?.trim();
  return Boolean(user && pass);
}

/** Returns null when EMAIL_USER or EMAIL_PASSWORD is missing. */
export function getGmailTransport(): GmailTransportConfig | null {
  const authUser = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASSWORD?.trim();
  if (!authUser || !pass) return null;

  return {
    authUser,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user: authUser, pass },
    }),
  };
}

/** Build a RFC5322 From header using EMAIL_USER as the envelope address. */
export function gmailFromHeader(displayName: string, authUser?: string): string {
  const from = (authUser ?? process.env.EMAIL_USER?.trim()) || "";
  return `"${displayName}" <${from}>`;
}
