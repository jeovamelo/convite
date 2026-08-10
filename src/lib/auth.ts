import crypto from "crypto";
import { cookies } from "next/headers";

const AUTH_COOKIE = "lm_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 8;

function getSecret() {
  return process.env.ADMIN_AUTH_SECRET || "change-me-in-production";
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("hex");
}

export function createSessionToken() {
  const payload = `${Date.now()}.${crypto.randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string | null) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length < 3) return false;
  const payload = parts.slice(0, 2).join(".");
  const signature = parts[2];
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "123456";
}

export function setAdminSessionCookie(value: string) {
  cookies().set(AUTH_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminSessionCookie() {
  cookies().set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getAdminSessionCookie() {
  return cookies().get(AUTH_COOKIE)?.value ?? null;
}
