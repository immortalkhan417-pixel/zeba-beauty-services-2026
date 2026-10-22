import type { Config } from "@netlify/functions";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { bookings, services } from "../../db/schema.js";
import { allSlots, clean, DEFAULT_HOURS, error, getSetting, isUniqueViolation, isValidDate, json, salonNow, TIME_RE, toMinutes, weekday } from "../../lib/salon.js";
import type { Hours } from "../../lib/salon.js";

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const name = clean(body.name, 100), phone = clean(body.phone, 30), notes = clean(body.notes, 1000);
  const date = clean(body.date, 10), time = clean(body.time, 5);
  const ids = Array.isArray(body.serviceIds) ? [...new Set(body.serviceIds.map(Number).filter(Number.isInteger))] as number[] : [];

  if (name.length < 2) return error("Please enter your name.");
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) return error("Please enter a valid phone number.");
  if (!ids.length || ids.length > 10) return error("Choose between 1 and 10 services.");
  if (!isValidDate(date) || !TIME_RE.test(time)) return error("Choose a valid future date and time.");

  const selected = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.active, true), inArray(services.id, ids)));
  if (selected.length !== ids.length) return error("One or more selected services are unavailable.");

  const hours = await getSetting<Hours>("hours", DEFAULT_HOURS);
  if (hours.closedDays.includes(weekday(date))) return error("The salon is closed on that date.", 409);
  if (!allSlots(hours).includes(time)) return error("Please choose a listed appointment time.");
  const now = salonNow();
  if (date === now.date && toMinutes(time) <= now.minutes) return error("Please choose a future time.");

  try {
    // The partial unique index on open bookings prevents two requests taking the same slot.
    const [created] = await db
      .insert(bookings)
      .values({ customerName: name, phone, serviceIds: ids, serviceNames: selected.map((s) => s.name).join(", "), bookingDate: date, bookingTime: time, notes })
      .returning({ id: bookings.id });
    return json(
      {
        id: created.id,
        status: "pending",
        message: "Your booking request has been saved. It is not confirmed until the salon owner replies.",
        booking: { name, phone, services: selected.map((s) => s.name), date, time, notes },
      },
      201,
    );
  } catch (e) {
    if (isUniqueViolation(e)) return error("That time was just taken. Please choose another slot.", 409);
    console.error(e);
    return error("Could not save your booking. Please try again.", 500);
  }
};

export const config: Config = {
  path: "/api/bookings",
  method: "POST",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
