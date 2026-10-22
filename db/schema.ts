import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const services = pgTable("services", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  category: text().notNull(),
  description: text().notNull().default(""),
  duration: integer().notNull().default(45),
  price: text().notNull().default("Contact for pricing"),
  image: text().notNull().default(""),
  active: boolean().notNull().default(true),
});

export const bookings = pgTable(
  "bookings",
  {
    id: serial().primaryKey(),
    customerName: text("customer_name").notNull(),
    phone: text().notNull(),
    serviceIds: jsonb("service_ids").$type<number[]>().notNull(),
    serviceNames: text("service_names").notNull(),
    bookingDate: text("booking_date").notNull(),
    bookingTime: text("booking_time").notNull(),
    notes: text().notNull().default(""),
    status: text().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Only one open (pending/approved) request may hold a given slot.
    uniqueIndex("bookings_open_slot_idx")
      .on(t.bookingDate, t.bookingTime)
      .where(sql`status in ('pending', 'approved')`),
  ],
);

export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
});
