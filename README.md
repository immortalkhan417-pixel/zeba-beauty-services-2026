# Zeba Beauty Services

A mobile-first luxury beauty salon website with a Node.js/Express API, SQLite-backed booking requests, availability lookup, and a password-protected salon owner dashboard.

## Included

- Responsive blush-pink, ivory and champagne-gold website
- All 20 requested services across five categories
- Service filtering and wishlist (saved in this browser only)
- Beauty Match quiz
- Inspiration gallery with full-screen image preview
- WhatsApp booking link for `+91 99306 05111` and Instagram link for `@zebarfat`
- SQLite database stores booking requests, service configuration, hours/offers and login sessions
- Availability API and a database transaction to avoid two requests taking the same time simultaneously
- Owner dashboard for viewing booking requests, changing statuses, editing service prices/durations/active state, adding services, and changing hours/offers
- Booking status is `pending` until the salon owner confirms it

## Requirements

- Node.js 20 or newer
- npm

## Run locally

1. Extract the ZIP and open a terminal in this folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Change `ADMIN_PASSWORD` to a strong private password and set `SESSION_SECRET` to a random string of at least 32 characters. Never publish your `.env` file.
5. Start the app:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000`.
7. Select **Owner login** in the footer to open the dashboard. Use the username/password from `.env`.

The SQLite database and session store are created automatically in `data/` on first run. Back up this folder regularly. Do not delete it if you want to keep bookings.

## Deploy to a public URL

Deploy to a Node.js host that supports persistent disk storage (for example, a VPS or a hosting service with a persistent volume). A serverless host with an ephemeral filesystem will not preserve the SQLite database between deployments/restarts.

1. Upload/push this project to your hosting provider.
2. Set the start command to `npm start` and Node.js version to 20+.
3. Add environment variables in the host dashboard:
   - `NODE_ENV=production`
   - `SESSION_SECRET` = a unique random secret of at least 32 characters
   - `ADMIN_USERNAME` = your chosen private username
   - `ADMIN_PASSWORD` = a strong, unique password
   - `TRUST_PROXY=true` only if your app is behind the hosting provider's trusted HTTPS reverse proxy.
4. Attach a persistent disk and ensure the app's `data/` directory is stored on it. For providers that mount disks at a custom path, update `dataDir` in `server.js` to use that mounted path.
5. Enable HTTPS, deploy, and open the provided URL.
6. Submit a test booking, verify it appears in the owner dashboard, and check that WhatsApp opens with the request details.

## Booking behaviour and limitations

- A customer submission is saved in SQLite with `pending` status. It is not a confirmed appointment until the salon owner contacts the customer and confirms it.
- Available times are generated from configured opening hours and existing pending/approved bookings. Closed days can be set in the dashboard settings.
- This starter version treats each time slot as one booking regardless of selected service duration. For production scheduling, extend it to calculate service duration, breaks, staff capacity, holidays, and overlap conflicts before confirming a slot.
- The dashboard's **Reschedule** action marks a booking as `rescheduled` for follow-up; it does not yet assign a new date/time. Agree on a new time with the customer before confirming it.
- Automatic reminders, payment collection, actual Instagram feed synchronization, gallery image uploads, and multi-staff scheduling are not configured.
- Gallery photos are remote Unsplash images used as inspiration placeholders. Replace them with appropriately licensed images or owner-provided images. They are not represented as Zeba customer results. The website uses high-quality web-optimised photos, not guaranteed native 8K originals.
- The initial admin credentials in `.env.example` are only placeholders. Always change them before deployment.

## Security notes

Use HTTPS in production, a strong `SESSION_SECRET`, a strong private admin password, persistent disk backups, and restricted access to environment variables. Review the app's authentication and scheduling requirements before using it for a high-volume salon business.
