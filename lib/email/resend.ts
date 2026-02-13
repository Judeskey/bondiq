// lib/email/resend.ts
import { Resend } from "resend";

export function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function getAppUrl() {
  return (process.env.APP_URL || "http://localhost:3001")
    .trim()
    .replace(/\/+$/, "");
}

/**
 * DEFAULT sender (used by invites, auth, etc.)
 * This keeps your old behavior.
 */
export function getFromAddress() {
  return (
    process.env.EMAIL_FROM ||
    process.env.MAIL_FROM ||
    "BondIQ <no_reply@bondiq.app>"
  ).trim();
}

/**
 * ONLY for weekly reflections.
 * Does not affect invites.
 */
export function getCareFromAddress() {
  return (
    process.env.MAIL_FROM_REFLECTIONS ||
    "BondIQ Care <care@bondiq.app>"
  ).trim();
}
