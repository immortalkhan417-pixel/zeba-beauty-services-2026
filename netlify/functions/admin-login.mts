import type { Config } from "@netlify/functions";
import { adminConfigured, clean, clearSessionCookie, createSessionCookie, error, getAdmin, json, safeEqual } from "../../lib/salon.js";

export default async (req: Request) => {
  const { pathname } = new URL(req.url);

  if (pathname === "/api/admin/me") {
    const username = getAdmin(req);
    return json({ authenticated: !!username, username, configured: adminConfigured() });
  }

  if (pathname === "/api/admin/logout") {
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() } });
  }

  if (!adminConfigured()) {
    return error("Owner login is not set up yet. Add ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET (32+ characters) in the Netlify environment variables.", 503);
  }
  const body = await req.json().catch(() => ({}));
  const username = clean(body.username, 80), password = String(body.password ?? "");
  const userOk = safeEqual(username, process.env.ADMIN_USERNAME!);
  const passOk = safeEqual(password, process.env.ADMIN_PASSWORD!);
  if (!userOk || !passOk) return error("Incorrect username or password.", 401);

  return new Response(JSON.stringify({ ok: true, username }), {
    headers: { "content-type": "application/json", "set-cookie": createSessionCookie(username) },
  });
};

export const config: Config = {
  path: ["/api/admin/login", "/api/admin/logout", "/api/admin/me"],
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
