CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"service_ids" jsonb NOT NULL,
	"service_names" text NOT NULL,
	"booking_date" text NOT NULL,
	"booking_time" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration" integer DEFAULT 45 NOT NULL,
	"price" text DEFAULT 'Contact for pricing' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_open_slot_idx" ON "bookings" ("booking_date","booking_time") WHERE status in ('pending', 'approved');