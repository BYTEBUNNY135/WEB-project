
const API = "http://localhost:5000/api";

let selectedRole = "parker";
let selectedSlot = "B2";
let selectedSpace = "Green View Parking";
let selectedRate = 40;
let selectedMeta = "0.3 km away · Cyber City Block A";
let selectedDate = "2026-11-18";
let authMode = "signup";
let dashTab = "overview";

// INITIAL SETUP
function initializeApp() {
  const mobileToggle = document.getElementById("mobileToggle");
  const navMenu = document.getElementById("navMenu");

  if (mobileToggle && navMenu) {
    mobileToggle.onclick = () => navMenu.classList.toggle("open");
  }

  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = today();
    if (input.value && input.value < today()) input.value = today();
  });

  const authForm = document.querySelector("#view-auth form");
  if (authForm) authForm.onsubmit = handleAuthSubmit;

  const hostForm = document.querySelector("#view-host form");

  if (hostForm) {
    hostForm.removeAttribute("onsubmit");
    hostForm.addEventListener("submit", handleHostPublish);
  }

  const savedUser = getUser();
  if (savedUser) console.log("User loaded:", savedUser.name);

  updateAuthMode();
  updateHostPreview();
  updateBookingSummary();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// GENERAL HELPERS
function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("pobUser") || "null");
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem("pobUser", JSON.stringify(user));
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function postJSON(endpoint, payload) {
  const response = await fetch(`${API}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Unable to save information.");
  }

  return result;
}

// NAVIGATION
function navigateTo(view, options = {}) {
  const target = document.getElementById(`view-${view}`);

  if (!target) {
    showToast("Page not found.");
    return;
  }

  document.querySelectorAll(".page-view").forEach(section => {
    section.classList.remove("active");
  });

  target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.view === view);
  });

  document.getElementById("navMenu")?.classList.remove("open");

  if (view === "auth") {
    authMode = options.mode || "signup";
    updateAuthMode();
  }

  if (view === "dashboard") loadDashboard();
  if (view === "host") updateHostPreview();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// AUTHENTICATION
function selectAuthRole(role) {
  selectedRole = role;

  ["parker", "host"].forEach(name => {
    const element = document.getElementById(
      "role" + name.charAt(0).toUpperCase() + name.slice(1)
    );

    if (element) element.classList.toggle("selected", name === role);
  });

  const selector = document.getElementById("authRoleSelector");
  if (selector?.tagName === "SELECT") selector.value = role;
}

function updateAuthMode() {
  const isLogin = authMode === "login";

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("authHeading", isLogin ? "Welcome Back" : "Create Your Account");
  setText(
    "authDescription",
    isLogin
      ? "Log in to continue to PARK-O-BUDDY."
      : "Join PARK-O-BUDDY and find or list parking spaces."
  );
  setText("authSubmitButton", isLogin ? "Log In" : "Create Account");

  const nameGroup = document.getElementById("authNameGroup");
  const phoneGroup = document.getElementById("authPhoneGroup");
  const roleSelector = document.getElementById("authRoleSelector");

  if (nameGroup) nameGroup.style.display = isLogin ? "none" : "";
  if (phoneGroup) phoneGroup.style.display = isLogin ? "none" : "";
  if (roleSelector) roleSelector.style.display = isLogin ? "none" : "";

  const nameInput = document.getElementById("authName");
  const phoneInput = document.getElementById("authPhone");

  if (nameInput) nameInput.required = !isLogin;
  if (phoneInput) phoneInput.required = !isLogin;

  setText(
    "authSwitchText",
    isLogin ? "Don't have an account? " : "Already have an account? "
  );

  const switchLink = document.getElementById("authSwitchLink");

  if (switchLink) {
    switchLink.textContent = isLogin ? "Create Account" : "Log In";
    switchLink.onclick = event => {
      event.preventDefault();
      authMode = isLogin ? "signup" : "login";
      updateAuthMode();
    };
  }

  if (!isLogin && roleSelector?.tagName === "SELECT") {
    selectedRole = roleSelector.value || selectedRole;
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("authName")?.value.trim() || "";
  const email = document.getElementById("authEmail")?.value.trim().toLowerCase() || "";
  const phone = document.getElementById("authPhone")?.value.trim() || "";
  const password = document.getElementById("authPassword")?.value || "";
  const button = document.getElementById("authSubmitButton");

  if (!email || !password) {
    showToast("Please enter your email and password.");
    return;
  }

  if (authMode === "signup" && (!name || !phone || password.length < 8)) {
    showToast("Please enter all details and a password of at least 8 characters.");
    return;
  }

  const selector = document.getElementById("authRoleSelector");
  if (authMode === "signup" && selector?.tagName === "SELECT") {
    selectedRole = selector.value || "parker";
  }

  const originalText = button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = "Please wait...";
  }

  try {
    const result = authMode === "login"
      ? await postJSON("auth/login", { email, password })
      : await postJSON("auth/register", {
          name, email, phone, password, role: selectedRole
        });

    if (!result.user) throw new Error("Account details were not returned.");

    saveUser(result.user);
    showToast(authMode === "login" ? "Login successful!" : "Account created!");
    navigateTo("dashboard");
  } catch (error) {
    console.error("Authentication error:", error);
    showToast(error.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText || "Submit";
    }
  }
}

// SEARCH AND RESULTS
function toggleFilterChip(button) {
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.remove("active");
  });
  button.classList.add("active");
}

function highlightMapPin(index) {
  document.querySelectorAll(".map-price-pin").forEach(pin => {
    pin.classList.remove("active");
  });
  document.getElementById(`pin-${index}`)?.classList.add("active");
}

function unhighlightMapPin() {}

function scrollToListingCard(index) {
  highlightMapPin(index);
  document.getElementById(`card-spot-${index}`)?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

// PARKING SLOT SELECTION
function selectSpaceAndChooseSlot(name, rate, meta) {
  selectedSpace = name;
  selectedRate = Number(rate);
  selectedMeta = meta;

  const searchDate = document.querySelector("#view-search input[type='date']");
  const homeDate = document.querySelector("#view-home input[type='date']");

  selectedDate = searchDate?.value || homeDate?.value || today();

  updateBookingSummary();
  navigateTo("slot");
}

function selectSlot(slot) {
  const button = document.getElementById(`slot-${slot}`);

  if (button?.disabled || button?.classList.contains("occupied")) {
    showToast("This parking slot is occupied.");
    return;
  }

  selectedSlot = slot;

  document.querySelectorAll(".slot-btn").forEach(element => {
    element.classList.remove("selected");
  });

  button?.classList.add("selected");
  updateBookingSummary();
}

function updateBookingSummary() {
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("summaryFacilityName", selectedSpace);
  setText("summarySelectedSlot", selectedSlot);
  setText("summaryTotalAmount", `₹${selectedRate * 4}`);
  setText("slotSpaceTitle", selectedSpace);
  setText("slotSpaceMeta", selectedMeta);
}

// BOOKING
async function confirmBooking() {
  const user = getUser();

  if (!user?.email) {
    showToast("Please log in before booking.");
    navigateTo("auth", { mode: "login" });
    return;
  }

  const payload = {
    name: user.name,
    email: user.email,
    space: selectedSpace,
    slot: selectedSlot,
    date: selectedDate || today(),
    total: selectedRate * 4
  };

  try {
    const result = await postJSON("mongo-bookings", payload);
    const booking = result.booking || result;
    booking.id = booking.id || booking._id;

    localStorage.setItem("pobLastBooking", JSON.stringify(booking));
    loadConfirmation();
    showToast("Booking saved successfully!");
    navigateTo("confirmation");
  } catch (error) {
    console.error("Booking error:", error);
    showToast(error.message);
  }
}

// BOOKING CONFIRMATION
function loadConfirmation() {
  const booking = JSON.parse(localStorage.getItem("pobLastBooking") || "null");
  if (!booking) return;

  const put = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  put("ticketBookingId", booking.id || booking._id || "Confirmed");
  put("ticketSpaceName", booking.space || selectedSpace);
  put("ticketSlot", booking.slot || selectedSlot);
  put("ticketDate", booking.date || today());
  put("ticketAmount", `₹${Number(booking.total || 0).toFixed(2)}`);
}

// HOST LISTING
function updateHostPreview() {
  const title = document.getElementById("hostTitle")?.value || "";
  const address = document.getElementById("hostAddress")?.value || "";
  const price = document.getElementById("hostPrice")?.value || "0";

  const previewTitle = document.getElementById("previewTitle");
  const previewAddress = document.getElementById("previewAddress");
  const previewPrice = document.getElementById("previewPrice");

  if (previewTitle) previewTitle.textContent = title;
  if (previewAddress) previewAddress.textContent = `📍 ${address}`;

  if (previewPrice) {
    previewPrice.innerHTML = `₹${escapeHTML(price)}<span>/hr</span>`;
  }
}

async function handleHostPublish(event) {
  event.preventDefault();

  console.log("Publish button clicked.");

  const user = getUser();

  if (!user?.email) {
    showToast("Please log in before publishing a parking space.");
    navigateTo("auth", { mode: "login" });
    return;
  }

  const title = document.getElementById("hostTitle")?.value.trim() || "";
  const address = document.getElementById("hostAddress")?.value.trim() || "";
  const type = document.getElementById("hostType")?.value || "";
  const price = Number(document.getElementById("hostPrice")?.value);

  if (!title || !address || !type || !Number.isFinite(price) || price <= 0) {
    showToast("Please enter valid parking space details.");
    return;
  }

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const originalText = button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = "Publishing...";
  }

  try {
    const result = await postJSON("host/publish", {
      title,
      address,
      type,
      price,
      email: user.email
    });

    showToast(result.message || "Parking space published successfully!");
    form.reset();
    updateHostPreview();
  } catch (error) {
    console.error("Host publishing error:", error);
    showToast(error.message || "Unable to publish parking space.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText || "Publish Parking Space";
    }
  }
}

// DASHBOARD
function switchDashTab(tab, button) {
  dashTab = tab;

  document.querySelectorAll(".sidebar-menu button").forEach(item => {
    item.classList.remove("active");
  });

  if (button) button.classList.add("active");
  loadDashboard();
}

async function loadDashboard() {
  const user = getUser();
  const table = document.getElementById("dashBookingsTable");

  const nameElement = document.getElementById("dashboardName");
  const emailElement = document.getElementById("dashboardEmail");

  if (nameElement) nameElement.textContent = user?.name || "User";
  if (emailElement) emailElement.textContent = user?.email || "";

  if (!user) {
    if (table) {
      table.innerHTML = "<tr><td colspan='5'>Please log in to view your dashboard.</td></tr>";
    }
    return;
  }

  try {
    const response = await fetch(`${API}/mongo-bookings`);
    if (!response.ok) throw new Error("Could not load bookings.");

    const data = await response.json();
    const bookings = (data.bookings || []).filter(
      booking => booking.email === user.email
    );

    const spacesResponse = await fetch(
      `${API}/host/my-spaces?email=${encodeURIComponent(user.email)}`
    );

    if (!spacesResponse.ok) throw new Error("Could not load parking spaces.");

    const spacesData = await spacesResponse.json();
    const spaces = spacesData.spaces || [];

    if (table) {
      if (dashTab === "spaces") {
        table.innerHTML = spaces.length
          ? spaces.map(space => `
              <tr>
                <td>${escapeHTML(space.title)}</td>
                <td>${escapeHTML(space.address)}</td>
                <td>₹${Number(space.price).toFixed(2)}/hr</td>
                <td colspan="2">Listed</td>
              </tr>
            `).join("")
          : "<tr><td colspan='5'>No spaces listed yet.</td></tr>";
      } else {
        table.innerHTML = bookings.length
          ? bookings.map(booking => `
              <tr>
                <td>${escapeHTML(booking.space)}</td>
                <td>${escapeHTML(booking.date)}</td>
                <td>09:00 AM – 01:00 PM</td>
                <td>${escapeHTML(booking.slot)}</td>
                <td>Confirmed</td>
              </tr>
            `).join("")
          : "<tr><td colspan='5'>No bookings found yet.</td></tr>";
      }
    }
  } catch (error) {
    console.error("Dashboard error:", error);

    if (table) {
      table.innerHTML = "<tr><td colspan='5'>Unable to load dashboard.</td></tr>";
    }
  }
}
