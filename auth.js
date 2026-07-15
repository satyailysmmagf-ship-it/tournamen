/* ============================================================
   CoffeMC — shared auth / API helper
   Include this BEFORE script.js on every page.

   The real backend (Cloudflare Worker) uses HttpOnly cookie
   sessions, not bearer tokens — the browser sends the session
   cookie automatically on every request as long as we pass
   `credentials: "include"`. We keep a *copy* of the logged-in
   user's public info in localStorage purely so the UI (nav bar,
   "Welcome back" text, admin links) can render instantly without
   waiting on a network round trip. That cached copy is never used
   to authenticate anything — the server always re-checks the
   cookie on every request.
   ============================================================ */

// >>> EDIT THIS to your deployed Worker URL <<<
const API_BASE = "https://api2.caffemc.xyz";

const AUTH_USER_KEY = "coffemc_user";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function setStoredUser(user) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(AUTH_USER_KEY);
}
function isLoggedIn() {
  return !!getStoredUser();
}

/**
 * Wrapper around fetch() that adds the API_BASE + /api prefix and
 * always sends the session cookie (credentials: "include").
 */
async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  return res;
}

/**
 * Ask the server who's actually logged in right now (the source of
 * truth), and keep the local cache in sync. Call this on pages that
 * need to be sure (dashboard, admin) rather than trusting localStorage
 * alone, since the cookie may have expired since the last visit.
 */
async function fetchCurrentUser() {
  try {
    const res = await apiFetch("/auth/me");
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = await res.json();
    setStoredUser(data.user);
    return data.user;
  } catch (e) {
    return null;
  }
}

/** Redirect to login if not authenticated (checked against the server). */
async function requireLogin(returnTo) {
  const user = await fetchCurrentUser();
  if (!user) {
    const target = returnTo || window.location.pathname;
    window.location.href = `login.html?next=${encodeURIComponent(target)}`;
    return null;
  }
  return user;
}

/** Redirect away if the current user isn't an admin. */
async function requireAdmin() {
  const user = await requireLogin("admin.html");
  if (!user) return null;
  if (user.role !== "admin") {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch (e) {
    /* ignore network errors on logout */
  }
  clearSession();
  window.location.href = "index.html";
}

/**
 * Populate the shared nav with login/dashboard/logout links based on
 * cached auth state. Looks for elements with class "auth-nav-slot"
 * (desktop and mobile) and fills them in.
 */
function renderAuthNav() {
  const user = getStoredUser();
  document.querySelectorAll(".auth-nav-slot").forEach((slot) => {
    slot.innerHTML = "";

    if (user) {
      const dash = document.createElement("a");
      dash.href = "dashboard.html";
      dash.textContent = "Dashboard";
      slot.appendChild(dash);

      if (user.role === "admin") {
        const admin = document.createElement("a");
        admin.href = "admin.html";
        admin.textContent = "Admin";
        slot.appendChild(admin);
      }

      const out = document.createElement("a");
      out.href = "#";
      out.textContent = "Log out";
      out.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
      slot.appendChild(out);
    } else {
      const login = document.createElement("a");
      login.href = "login.html";
      login.textContent = "Log in";
      slot.appendChild(login);

      const register = document.createElement("a");
      register.href = "register.html";
      register.textContent = "Register";
      slot.appendChild(register);
    }
  });
}

document.addEventListener("DOMContentLoaded", renderAuthNav);
