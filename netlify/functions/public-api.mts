import type { Config } from "@netlify/functions";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { bookings, services } from "../../db/schema.js";
import { allSlots, clean, DEFAULT_HOURS, error, getSetting, isValidDate, json, salonNow, toMinutes, weekday } from "../../lib/salon.js";
import type { Hours, Offer } from "../../lib/salon.js";

export default async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/services") {
    const rows = await db
      .select({ id: services.id, name: services.name, category: services.category, description: services.description, duration: services.duration, price: services.price, image: services.image })
      .from(services)
      .where(eq(services.active, true))
      .orderBy(asc(services.id));
    return json(rows);
  }

  if (url.pathname === "/api/config") {
    return json({
      instagram: "https://www.instagram.com/zebarfat/",
      whatsapp: "919930605111",
      hours: await getSetting<Hours>("hours", DEFAULT_HOURS),
      offers: (await getSetting<Offer[]>("offers", [])).filter((o) => o.active),
    });
  }

  if (url.pathname === "/api/availability") {
    const date = clean(url.searchParams.get("date"), 10);
    if (!isValidDate(date)) return error("Choose a valid future date.");
    const hours = await getSetting<Hours>("hours", DEFAULT_HOURS);
    if (hours.closedDays.includes(weekday(date))) return json({ date, slots: [], message: "The salon is closed on this day." });
    const taken = new Set(
      (await db
        .select({ time: bookings.bookingTime })
        .from(bookings)
        .where(and(eq(bookings.bookingDate, date), inArray(bookings.status, ["pending", "approved"]))))
        .map((b) => b.time),
    );
    const now = salonNow();
    const slots = allSlots(hours).filter((t) => !taken.has(t) && (date !== now.date || toMinutes(t) > now.minutes));
    return json({ date, slots });
  }

  return error("Not found.", 404);
};

export const config: Config = {
  path: ["/api/services", "/api/config", "/api/availability"],
  method: "GET",
};
