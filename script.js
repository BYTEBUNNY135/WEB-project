/* PARK-O-BUDDY — client interactions and API integration */
const API = "/api";
let selectedRole = "parker";
let selectedSlot = "B2";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("mobileToggle");
  const nav = document.getElementById("navLinks");
  if (toggle && nav) toggle.addEventListener("click", () => nav.classList.toggle("open"));

  const authForm = document.getElementById("signupForm");
  if (authForm) authForm.addEventListener("submit", submitSignup);

  const hostForm = document.getElementById("hostForm");
  if (hostForm) hostForm.addEventListener("submit", submitHostListing);

  const sort = document.getElementById("sortResults");
  if (sort) sort.addEventListener("change", sortListingCards);

  const date = document.getElementById("searchDate");
  if (date) date.min = new Date().toISOString().slice(0, 10);

  const url = new URLSearchParams(location.search);
  const space = url.get("space");
  const rate = Number(url.get("rate")) || 40;
  const facility = document.getElementById("facilityNameDisplay");
  const summaryFacility = document.getElementById("summaryFacility");
  if (space && facility) facility.textContent = space;
  if (space && summaryFacility) summaryFacility.textContent = space;
  if (document.getElementById("summaryTotal")) updateBookingTotal(rate);

  const slotButtons = document.querySelectorAll(".slot-box-btn:not(:disabled)");
  slotButtons.forEach(btn => btn.addEventListener("click", () => selectSlot(btn.textContent.trim(), btn)));
  const preselected = document.querySelector(".slot-box-btn.selected");
  if (preselected) selectedSlot = preselected.textContent.trim();

  if (document.getElementById("dashboardData")) loadDashboard();
  if (document.getElementById("confirmationId")) loadConfirmation();
});

function setRole(role) {
  selectedRole = role;
  ["parker", "host", "both"].forEach(name => {
    const el = document.getElementById("role" + name[0].toUpperCase() + name.slice(1));
    if (!el) return;
    const active = name === role;
    el.classList.toggle("selected", active);
    el.style.borderColor = active ? "var(--brand-green)" : "var(--border-color)";
    el.style.background = active ? "var(--brand-green-light)" : "#FFFFFF";
    el.setAttribute("aria-pressed", String(active));
  });
}

function showMessage(id, message, success = false) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
    el.style.color = success ? "#15803d" : "#b91c1c";
  }
}

async function postJSON(endpoint, payload) {
  const response = await fetch(`${API}/${endpoint}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to save your information.");
  return result;
}

async function submitSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const payload = {
    name: document.getElementById("signupName").value.trim(),
    email: document.getElementById("signupEmail").value.trim().toLowerCase(),
    phone: document.getElementById("signupPhone").value.trim(),
    password: document.getElementById("signupPassword").value,
    role: selectedRole
  };
  if (payload.password.length < 8) {
    showMessage("authMessage", "Password must contain at least 8 characters.");
    return;
  }
  try {
    const result = await postJSON("users", payload);
    localStorage.setItem("pobUser", JSON.stringify(result.user));
    showMessage("authMessage", "Account created successfully! Opening your dashboard…", true);
    setTimeout(() => location.href = "dashboard.html", 500);
  } catch (error) {
    showMessage("authMessage", error.message);
  }
}

function updateLivePreview() {
  const get = id => document.getElementById(id);
  if (get("previewTitle")) get("previewTitle").textContent = get("hostTitleInput").value || "My Parking Space";
  if (get("previewAddress")) get("previewAddress").textContent = "📍 " + (get("hostAddressInput").value || "City location");
  if (get("previewType")) get("previewType").textContent = get("hostTypeInput").value.toUpperCase();
  if (get("previewPrice")) get("previewPrice").textContent = "₹" + (get("hostPriceInput").value || "0");
}

async function submitHostListing(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const user = JSON.parse(localStorage.getItem("pobUser") || "null");
  const payload = {
    title: document.getElementById("hostTitleInput").value.trim(),
    address: document.getElementById("hostAddressInput").value.trim(),
    type: document.getElementById("hostTypeInput").value,
    price: Number(document.getElementById("hostPriceInput").value),
    amenities: [...form.querySelectorAll('input[name="amenities"]:checked')].map(x => x.value),
    hostEmail: user?.email || "guest@parkobuddy.local"
  };
  try {
    const result = await postJSON("spaces", payload);
    showMessage("hostMessage", `Your parking space was published! Listing ID: ${result.space.id}`, true);
    form.reset();
    updateLivePreview();
  } catch (error) {
    showMessage("hostMessage", error.message);
  }
}

function selectSlot(code, button) {
  selectedSlot = code;
  document.querySelectorAll(".slot-box-btn").forEach(btn => btn.classList.remove("selected"));
  if (button) button.classList.add("selected");
  const summary = document.getElementById("summarySlot");
  if (summary) summary.textContent = code;
}

function updateBookingTotal(rate) {
  const total = document.getElementById("summaryTotal");
  if (total) total.textContent = "₹" + (rate * 4).toFixed(2);
}

async function submitBooking() {
  const params = new URLSearchParams(location.search);
  const user = JSON.parse(localStorage.getItem("pobUser") || "null");
  const rate = Number(params.get("rate")) || 40;
  const payload = {
    space: params.get("space") || document.getElementById("facilityNameDisplay")?.textContent || "Downtown Hub Garage",
    slot: selectedSlot,
    date: new Date().toISOString().slice(0,10),
    checkin: "09:00",
    checkout: "13:00",
    durationHours: 4,
    rate,
    total: rate * 4,
    parkerEmail: user?.email || "guest@parkobuddy.local"
  };
  const btn = document.getElementById("confirmBookingBtn");
  if (btn) btn.disabled = true;
  try {
    const result = await postJSON("bookings", payload);
    localStorage.setItem("pobLastBooking", JSON.stringify(result.booking));
    location.href = "confirmation.html";
  } catch (error) {
    showMessage("bookingMessage", error.message);
    if (btn) btn.disabled = false;
  }
}

async function loadConfirmation() {
  const booking = JSON.parse(localStorage.getItem("pobLastBooking") || "null");
  if (!booking) return;
  const put = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  put("confirmationId", booking.id);
  put("confirmationFacility", booking.space);
  put("confirmationSlot", booking.slot);
  put("confirmationDate", booking.date);
  put("confirmationTime", `${booking.checkin} – ${booking.checkout}`);
  put("confirmationTotal", `₹${Number(booking.total).toFixed(2)}`);
}

async function loadDashboard() {
  const panel = document.getElementById("dashboardData");
  const user = JSON.parse(localStorage.getItem("pobUser") || "null");
  try {
    const response = await fetch(`${API}/dashboard?email=${encodeURIComponent(user?.email || "")}`);
    const data = await response.json();
    const bookings = data.bookings || [];
    const spaces = data.spaces || [];
    panel.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
        <div class="card" style="padding:20px;"><strong>${bookings.length}</strong><p class="text-muted">Bookings</p></div>
        <div class="card" style="padding:20px;"><strong>${spaces.length}</strong><p class="text-muted">Hosted spaces</p></div>
        <div class="card" style="padding:20px;"><strong>₹${spaces.reduce((n,x)=>n+Number(x.price||0),0)}</strong><p class="text-muted">Hourly listing rates total</p></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">
        <section class="card" style="padding:20px;"><h3>My Bookings</h3>
          ${bookings.length ? bookings.map(b=>`<p style="padding:12px 0;border-bottom:1px solid var(--border-color);"><strong>${escapeHTML(b.space)}</strong><br><span class="text-muted">${escapeHTML(b.date)} · Slot ${escapeHTML(b.slot)} · ₹${Number(b.total).toFixed(2)}</span></p>`).join("") : '<p class="text-muted" style="margin-top:12px;">No bookings yet. <a href="search.html">Find a parking space</a>.</p>'}
        </section>
        <section class="card" style="padding:20px;"><h3>My Hosted Spaces</h3>
          ${spaces.length ? spaces.map(x=>`<p style="padding:12px 0;border-bottom:1px solid var(--border-color);"><strong>${escapeHTML(x.title)}</strong><br><span class="text-muted">${escapeHTML(x.address)} · ₹${Number(x.price).toFixed(2)}/hr</span></p>`).join("") : '<p class="text-muted" style="margin-top:12px;">No spaces listed yet. <a href="host.html">Host a parking space</a>.</p>'}
        </section>
      </div>`;
  } catch (error) {
    panel.textContent = "Dashboard data could not be loaded. Please make sure the Python server is running.";
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function toggleFilter(button) {
  const parent = button.parentElement;
  if (parent) parent.querySelectorAll(".chip-btn").forEach(x => x.classList.remove("active"));
  button.classList.add("active");
}
function highlightListing(index) {
  document.querySelectorAll(".map-pin-badge").forEach(x => x.classList.remove("active"));
  const card = document.getElementById(`listing-${index}`);
  if (card) {
    card.scrollIntoView({behavior:"smooth",block:"center"});
    card.style.borderColor = "var(--brand-green)";
    setTimeout(() => card.style.borderColor = "var(--border-color)", 1500);
  }
}
function sortListingCards(event) {
  const cards = [...document.querySelectorAll(".listing-card-horizontal")];
  const mode = event.target.value;
  const number = el => Number((el.textContent.match(/₹\s*(\d+)/) || [0,0])[1]);
  cards.sort((a,b) => mode === "price-low" ? number(a)-number(b) : mode === "price-high" ? number(b)-number(a) : 0);
  const parent = cards[0]?.parentElement;
  if (parent) cards.forEach(card => parent.appendChild(card));
}
