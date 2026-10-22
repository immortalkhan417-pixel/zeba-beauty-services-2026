import type { Config } from "@netlify/functions";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { bookings, services } from "../../db/schema.js";
import { BOOKING_STATUSES, clean, DEFAULT_HOURS, error, getAdmin, getSetting, isUniqueViolation, json, putSetting, TIME_RE } from "../../lib/salon.js";
import type { Hours, Offer } from "../../lib/salon.js";

export default async (req: Request) => {
  if (!getAdmin(req)) return error("Please sign in as the salon owner.", 401);
  const { pathname } = new URL(req.url);
  const [, , , resource, rawId] = pathname.split("/"); // /api/admin/:resource/:id
  const id = Number(rawId);
  const body = ["POST", "PATCH", "PUT"].includes(req.method) ? await req.json().catch(() => ({})) : {};

  if (resource === "bookings" && req.method === "GET" && !rawId) {
    return json(await db.select().from(bookings).orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime), desc(bookings.id)).limit(500));
  }

  if (resource === "bookings" && req.method === "PATCH" && Number.isInteger(id)) {
    const status = clean(body.status, 20);
    if (!(BOOKING_STATUSES as readonly string[]).includes(status)) return error("Invalid booking status.");
    const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!b) return error("Booking not found.", 404);
    const conflictMsg = "Another booking request already uses this time. Review the other request first.";
    if (status === "pending" || status === "approved") {
      const [conflict] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.bookingDate, b.bookingDate), eq(bookings.bookingTime, b.bookingTime), ne(bookings.id, b.id), inArray(bookings.status, ["pending", "approved"])));
      if (conflict) return error(conflictMsg, 409);
    }
    try {
      await db.update(bookings).set({ status }).where(eq(bookings.id, id));
    } catch (e) {
      if (isUniqueViolation(e)) return error(conflictMsg, 409);
      throw e;
    }
    return json({ ok: true, status });
  }

  if (resource === "services" && req.method === "GET") {
    return json(await db.select().from(services).orderBy(asc(services.category), asc(services.name)));
  }

  if (resource === "services" && (req.method === "PATCH" || req.method === "POST")) {
    const creating = req.method === "POST";
    const name = clean(body.name, 100), category = clean(body.category, 80), description = clean(body.description, 500);
    const price = clean(body.price, 80) || "Contact for pricing", image = clean(body.image, 1000);
    const duration = Number(body.duration ?? 45);
    if (name.length < 2 || !Number.isInteger(duration) || duration < 5 || duration > 600 || (creating && !category)) {
      return error("Provide a service name, category and valid duration (5–600 minutes).");
    }
    if (image && !/^https:\/\//.test(image)) return error("Image must be an https:// link.");
    try {
      if (creating) {
        const [row] = await db.insert(services).values({ name, category, description, duration, price, image }).returning({ id: services.id });
        return json({ id: row.id }, 201);
      }
      const updated = await db
        .update(services)
        .set({ name, description, price, duration, active: !!body.active, ...(category ? { category } : {}), ...(image ? { image } : {}) })
        .where(eq(services.id, id))
        .returning({ id: services.id });
      return updated.length ? json({ ok: true }) : error("Service not found.", 404);
    } catch (e) {
      if (isUniqueViolation(e)) return error("A service with that name already exists.");
      throw e;
    }
  }

  if (resource === "settings" && req.method === "GET") {
    return json({ hours: await getSetting<Hours>("hours", DEFAULT_HOURS), offers: await getSetting<Offer[]>("offers", []) });
  }

  if (resource === "settings" && req.method === "PUT") {
    const h = body.hours ?? {};
    const slotMinutes = Number(h.slotMinutes);
    if (!TIME_RE.test(h.start) || !TIME_RE.test(h.end) || h.start >= h.end || !Number.isInteger(slotMinutes) || slotMinutes < 15 || slotMinutes > 240) {
      return error("Check opening hours and slot length.");
    }
    const closedDays = Array.isArray(h.closedDays) ? [...new Set(h.closedDays.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6))] : [];
    await putSetting("hours", { start: h.start, end: h.end, slotMinutes, closedDays });
    if (Array.isArray(body.offers)) {
      await putSetting(
        "offers",
        body.offers.slice(0, 10).map((o: Offer) => ({ name: clean(o.name, 100), description: clean(o.description, 300), active: !!o.active })).filter((o: Offer) => o.name),
      );
    }
    return json({ ok: true });
  }

  return error("Not found.", 404);
};

export const config: Config = {
  path: ["/api/admin/bookings", "/api/admin/bookings/:id", "/api/admin/services", "/api/admin/services/:id", "/api/admin/settings"],
};
