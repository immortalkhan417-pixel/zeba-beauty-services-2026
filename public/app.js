const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WISHLIST_KEY = "zeba-wishlist";

let services = [];
let whatsapp = "919930605111";
let activeCategory = "All";
const wishlist = new Set(JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]"));

const api = async (path, opts = {}) => {
  const res = await fetch(path, { headers: { "content-type": "application/json" }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || (res.status === 429 ? "Too many requests. Please wait a minute and try again." : "Something went wrong. Please try again."));
  return data;
};
const fmtTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const salonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

// ---------- Navigation ----------
$(".nav-toggle").addEventListener("click", (e) => {
  const open = $("#nav-links").classList.toggle("open");
  e.currentTarget.setAttribute("aria-expanded", open);
});
$("#nav-links").addEventListener("click", (e) => e.target.closest("a") && $("#nav-links").classList.remove("open"));

// ---------- Config: hours & offers ----------
async function loadConfig() {
  try {
    const cfg = await api("/api/config");
    whatsapp = cfg.whatsapp;
    const open = DAYS.filter((_, i) => !cfg.hours.closedDays.includes(i));
    const closed = cfg.hours.closedDays.map((d) => DAYS[d]).join(", ");
    const text = `Open ${fmtTime(cfg.hours.start)} – ${fmtTime(cfg.hours.end)}${closed ? ` · Closed ${closed}` : open.length === 7 ? " · Every day" : ""}`;
    $("#hours-line").textContent = text;
    $("#footer-hours").textContent = text;
    $("#offers").innerHTML = cfg.offers
      .map((o) => `<article class="offer"><h3>${esc(o.name)}</h3><p>${esc(o.description)}</p></article>`)
      .join("");
  } catch {
    /* Non-critical: the page still works without hours/offers. */
  }
}

// ---------- Services, filters & wishlist ----------
function renderFilters() {
  const cats = ["All", ...new Set(services.map((s) => s.category))];
  $("#filters").innerHTML = cats
    .map((c) => `<button class="filter" role="tab" aria-selected="${c === activeCategory}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join("");
}

function renderServices() {
  const list = services.filter((s) => activeCategory === "All" || s.category === activeCategory);
  $("#service-grid").innerHTML = list
    .map(
      (s) => `<article class="service">
        ${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy">` : ""}
        <div class="service-body">
          <span class="service-cat">${esc(s.category)}</span>
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.description)}</p>
          <div class="service-meta"><span>≈ ${s.duration} min</span><span>${esc(s.price)}</span></div>
          <div class="service-actions">
            <button class="btn btn-ghost heart" data-wish="${s.id}" aria-pressed="${wishlist.has(s.id)}" aria-label="${wishlist.has(s.id) ? "Remove from" : "Add to"} wishlist: ${esc(s.name)}">${wishlist.has(s.id) ? "♥" : "♡"}</button>
            <button class="btn" data-book="${s.id}">Book this</button>
          </div>
        </div>
      </article>`,
    )
    .join("");
}

function renderWishlist() {
  const items = services.filter((s) => wishlist.has(s.id));
  $("#wishlist").hidden = !items.length;
  $("#wishlist-list").innerHTML = items
    .map((s) => `<li>${esc(s.name)} <button data-unwish="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></li>`)
    .join("");
}

function toggleWish(id) {
  wishlist.has(id) ? wishlist.delete(id) : wishlist.add(id);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishlist]));
  renderServices();
  renderWishlist();
}

function preselect(ids) {
  document.querySelectorAll('#service-picks input').forEach((i) => (i.checked = ids.includes(Number(i.value))));
  $("#book").scrollIntoView();
}

$("#filters").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cat]");
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  renderFilters();
  renderServices();
});
$("#service-grid").addEventListener("click", (e) => {
  const wish = e.target.closest("[data-wish]");
  const book = e.target.closest("[data-book]");
  if (wish) toggleWish(Number(wish.dataset.wish));
  if (book) preselect([Number(book.dataset.book)]);
});
$("#wishlist-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-unwish]");
  if (b) toggleWish(Number(b.dataset.unwish));
});
$("#wishlist-book").addEventListener("click", () => preselect([...wishlist]));

async function loadServices() {
  try {
    services = await api("/api/services");
    for (const id of [...wishlist]) if (!services.some((s) => s.id === id)) wishlist.delete(id);
    renderFilters();
    renderServices();
    renderWishlist();
    $("#service-picks").innerHTML = services
      .map((s) => `<label><input type="checkbox" name="serviceIds" value="${s.id}">${esc(s.name)}</label>`)
      .join("");
  } catch (err) {
    $("#service-grid").innerHTML = `<p class="muted">${esc(err.message)}</p>`;
  }
}

// ---------- Beauty Match quiz ----------
const MATCHES = {
  skin: { refresh: ["Clean Up", "D-Tan"], treat: ["Facial", "Anti-Ageing Facial"], transform: ["Advanced Facial", "Anti-Ageing Facial"] },
  hair: { refresh: ["Hair Spa", "Hair Spa"], treat: ["Hair Treatment", "Botox Hair Treatment"], transform: ["Global Hair Colour", "Balayage"] },
  eyes: { refresh: ["Threading", "Threading"], treat: ["Threading", "Lash Extension"], transform: ["Lash Extension", "Permanent Eyebrow"] },
};
$("#quiz-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const pick = MATCHES[f.get("focus")][f.get("goal")][f.get("time") === "short" ? 0 : 1];
  const s = services.find((x) => x.name === pick);
  $("#quiz-result").innerHTML = `<p class="eyebrow">Your match</p><h3>${esc(pick)}</h3>
    <p>${esc(s?.description || "Ask us about this service during your consultation.")}</p>
    ${s ? `<button class="btn btn-small" type="button" data-match="${s.id}">Book ${esc(pick)}</button>` : ""}`;
});
$("#quiz-result").addEventListener("click", (e) => {
  const b = e.target.closest("[data-match]");
  if (b) preselect([Number(b.dataset.match)]);
});

// ---------- Gallery ----------
const GALLERY = [
  "1522337360788-8b13dee7a37e", "1540555700478-4be289fbecef", "1519690889869-e705e59f72e1", "1583001809873-a128495da465",
  "1562322140-8baeececf3df", "1552693673-1bf958298935", "1560869713-7d0a29430803", "1515886657613-9f3515b0c78f", "1524504388940-b1c1722653e1",
];
const img = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;
$("#gallery-grid").innerHTML = GALLERY.map(
  (id) => `<button data-full="${img(id, 1800)}" aria-label="View larger"><img src="${img(id, 600)}" alt="Beauty inspiration" loading="lazy"></button>`,
).join("");
const lightbox = $("#lightbox");
$("#gallery-grid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-full]");
  if (!b) return;
  $("img", lightbox).src = b.dataset.full;
  lightbox.showModal();
});
lightbox.addEventListener("click", (e) => (e.target === lightbox || e.target.closest(".lightbox-close")) && lightbox.close());

// ---------- Booking ----------
const form = $("#booking-form");
const msg = $("#booking-msg");
const dateInput = form.elements.date;
dateInput.min = salonToday();

const showMsg = (text, isError = false) => {
  msg.textContent = text;
  msg.classList.toggle("error", isError);
};

async function loadSlots() {
  const slots = $("#slots");
  if (!dateInput.value) return;
  slots.innerHTML = '<span class="muted">Checking availability…</span>';
  try {
    const data = await api(`/api/availability?date=${encodeURIComponent(dateInput.value)}`);
    slots.innerHTML = data.slots.length
      ? data.slots.map((t) => `<label><input type="radio" name="time" value="${t}" required>${fmtTime(t)}</label>`).join("")
      : `<span class="muted">${esc(data.message || "No open times left on this day. Please try another date.")}</span>`;
  } catch (err) {
    slots.innerHTML = `<span class="muted">${esc(err.message)}</span>`;
  }
}
dateInput.addEventListener("change", loadSlots);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = {
    name: fd.get("name"),
    phone: fd.get("phone"),
    date: fd.get("date"),
    time: fd.get("time"),
    notes: fd.get("notes"),
    serviceIds: fd.getAll("serviceIds").map(Number),
  };
  if (!payload.serviceIds.length) return showMsg("Please choose at least one service.", true);
  if (!payload.date || !payload.time) return showMsg("Please choose a date and an open time.", true);

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  showMsg("Sending your request…");
  try {
    const res = await api("/api/bookings", { method: "POST", body: JSON.stringify(payload) });
    const b = res.booking;
    const text = `Hello Zeba Beauty Services! I've requested an appointment (ref #${res.id}).\nName: ${b.name}\nPhone: ${b.phone}\nServices: ${b.services.join(", ")}\nDate: ${b.date} at ${fmtTime(b.time)}${b.notes ? `\nNotes: ${b.notes}` : ""}`;
    form.innerHTML = `<div class="success">
      <p class="eyebrow">Request received · #${res.id}</p>
      <h3>Thank you, ${esc(b.name)}!</h3>
      <p>${esc(res.message)}</p>
      <p><strong>${esc(b.services.join(", "))}</strong><br>${esc(b.date)} at ${fmtTime(b.time)}</p>
      <a class="btn" href="https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Send details on WhatsApp</a>
      <a class="btn btn-ghost" href="/">Make another request</a>
    </div>`;
  } catch (err) {
    showMsg(err.message, true);
    btn.disabled = false;
    loadSlots();
  }
});

loadConfig();
loadServices();
