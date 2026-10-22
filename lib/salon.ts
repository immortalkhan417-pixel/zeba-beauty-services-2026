import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { settings } from "../db/schema.js";

export type Hours = { start: string; end: string; slotMinutes: number; closedDays: number[] };
export type Offer = { name: string; description: string; active: boolean };

export const SALON_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_HOURS: Hours = { start: "10:00", end: "19:00", slotMinutes: 30, closedDays: [0] };
export const BOOKING_STATUSES = ["pending", "approved", "rejected", "rescheduled", "completed"] as const;

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const error = (message: string, status = 400) => json({ error: message }, status);
export const clean = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// "Today" and "now" are evaluated in the salon's local time, not the server's.
export function salonNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: SALON_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export const isValidDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && s >= salonNow().date;
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function allSlots(hours: Hours) {
  const slots: string[] = [];
  for (let m = toMinutes(hours.start); m + hours.slotMinutes <= toMinutes(hours.end); m += hours.slotMinutes) {
    slots.push(fromMinutes(m));
  }
  return slots;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return (row?.value as T) ?? fallback;
}

export async function putSetting(key: string, value: unknown) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
};

// ---- Owner session: a signed, HttpOnly cookie. Credentials come from environment variables. ----

const COOKIE = "zeba_admin";
const SESSION_SECONDS = 8 * 60 * 60;

const sessionSecret = () => process.env.SESSION_SECRET || "";
const sign = (payload: string) => createHmac("sha256", sessionSecret()).update(payload).digest("base64url");

export function safeEqual(a: string, b: string) {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const adminConfigured = () =>
  Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && sessionSecret().length >= 32);

export function createSessionCookie(username: string) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export const clearSessionCookie = () => `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function getAdmin(req: Request): string | null {
  if (!adminConfigured()) return null;
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof u === "string" && Date.now() < exp ? u : null;
  } catch {
    return null;
  }
}
