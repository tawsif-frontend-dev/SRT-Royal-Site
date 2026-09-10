/* ─────────────────────────────────────────────
   SRT ROYAL — PREMIUM FRONTEND APP.JS
   Updated with 6 new features by Sr. Tawsif:
   1) Profile photo upload/change
   2) Name, company, phone edit
   3) Hire request history
   4) Unique client ID card
   5) Member since date
   6) Project status badges (CEO dropdown + client badge)
───────────────────────────────────────────── */

/* ─── HELPERS ─── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const API_BASE = "";
const TOKEN_KEY = "srt_token";
const USER_KEY  = "srt_user";

/* "Remember me": checked → localStorage (survives closing the browser);
   unchecked → sessionStorage (cleared when the browser closes). */
function authStore() {
  return sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : localStorage;
}
const getToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
const getUser = () => { try { return JSON.parse(authStore().getItem(USER_KEY) || "null"); } catch { return null; } };
const setUser = (u) => { try { authStore().setItem(USER_KEY, JSON.stringify(u)); } catch (_) {} };
function setAuth(token, user, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  [TOKEN_KEY, USER_KEY].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); });
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
}
const clearAuth = () => { [TOKEN_KEY, USER_KEY].forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); }); };

/* ─── Separate portals: admin goes to admin-portal.html, everyone else to dashboard.html ─── */
const portalUrlFor = (user) => (user && user.role === "admin" ? "admin-portal.html" : "dashboard.html");

/* ─── OAuth: the server redirects back here with #token=... ─── */
if (window.location.hash.startsWith("#token=")) {
  (async () => {
    const token = decodeURIComponent(window.location.hash.slice(7));
    clearAuth();
    history.replaceState(null, "", window.location.pathname);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("token rejected");
      const data = await safeJsonResponse(res);
      setAuth(token, data.user, true);
      window.location.replace(portalUrlFor(data.user));
    } catch (_) {
      showMsg(document.querySelector(".form-error"), "❌ Social sign-in failed. Please try again.", true);
    }
  })();
}

function showMsg(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.classList.toggle("form-error", isError);
  el.classList.toggle("form-success", !isError);
}
function hideMsg(el) { el?.classList.add("hidden"); }

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

/* ─── Safe fetch helper ─── */
async function safeJsonResponse(res) {
  try {
    return await res.json();
  } catch (e) {
    throw new Error(`Server error: ${res.status} ${res.statusText}. Backend is not available.`);
  }
}

/* ─── Status badge helper ─── */
function statusBadge(status) {
  const map = {
    pending:     { color: "#f59e0b", label: "⏳ Pending" },
    accepted:    { color: "#3b82f6", label: "🔵 Accepted" },
    in_progress: { color: "#3b82f6", label: "🔧 In Progress" },
    completed:   { color: "#22c55e", label: "✅ Completed" },
    rejected:    { color: "#ef4444", label: "❌ Rejected" },
    cancelled:   { color: "#6b7280", label: "🚫 Cancelled" },
    active:  { color: "#3b82f6", label: "🔵 Active" },
    done:    { color: "#22c55e", label: "✅ Done" },
  };
  const s = map[status] || map.pending;
  return `<span class="status-badge" style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44;">${s.label}</span>`;
}

/* ─────────────────────────────────────────────
   NAVBAR SCROLL EFFECT
───────────────────────────────────────────── */
const navbar = $("#navbar");
window.addEventListener("scroll", () => {
  navbar?.classList.toggle("scrolled", window.scrollY > 40);
}, { passive: true });

/* ─────────────────────────────────────────────
   MOBILE MENU
───────────────────────────────────────────── */
const hamburger = $("#hamburger");
const navLinks  = $("#navLinks");

hamburger?.addEventListener("click", () => {
  const open = navLinks?.classList.toggle("open");
  hamburger.classList.toggle("active", !!open);
  hamburger.setAttribute("aria-expanded", String(!!open));
});

$$(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks?.classList.remove("open");
    hamburger?.classList.remove("active");
    hamburger?.setAttribute("aria-expanded", "false");
  });
});

/* ─────────────────────────────────────────────
   ACTIVE NAV LINK ON SCROLL
───────────────────────────────────────────── */
const sections = $$("section[id]");
const navItems = $$(".nav-link");

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((sec) => {
    const top = sec.offsetTop - 140;
    if (window.scrollY >= top && window.scrollY < top + sec.offsetHeight) {
      current = sec.id;
    }
  });
  navItems.forEach((l) => {
    l.classList.toggle("active", l.getAttribute("href") === `#${current}`);
  });
}, { passive: true });

/* ─────────────────────────────────────────────
   SCROLL REVEAL ANIMATION (staggered per group)
───────────────────────────────────────────── */
const revealEls = $$(".reveal, .reveal-left, .reveal-right, .hiw-card, .designer-card, .testimonial-card, .hero-stat, .portfolio-card");

// Stagger delay: siblings sharing a parent animate in sequence (max 5-step cycle)
revealEls.forEach((el) => {
  if (!el.classList.contains("reveal") && !el.classList.contains("reveal-left") && !el.classList.contains("reveal-right")) {
    el.classList.add("reveal");
  }
  const siblings = Array.from(el.parentElement?.children || []).filter((c) => revealEls.includes(c));
  const idx = siblings.indexOf(el);
  el.style.setProperty("--reveal-delay", `${Math.min(idx, 5) * 0.09}s`);
});

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach((el) => revealObs.observe(el));

/* ─────────────────────────────────────────────
   SCROLL PROGRESS BAR
───────────────────────────────────────────── */
const scrollProgress = $("#scrollProgress");
window.addEventListener("scroll", () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  if (scrollProgress) scrollProgress.style.width = `${scrolled}%`;
}, { passive: true });

/* ─────────────────────────────────────────────
   HIRE REQUEST FORM
───────────────────────────────────────────── */
const hireForm = $("#hireForm");

hireForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn       = $("#hireSubmitBtn");
  const btnText   = btn?.querySelector(".btn-text");
  const btnLoad   = btn?.querySelector(".btn-loading");
  const successEl = $("#hireSuccess");
  const errorEl   = $("#hireError");

  hideMsg(successEl); hideMsg(errorEl);

  const data = {
    projectTitle: $("#projectTitle")?.value.trim(),
    description:  $("#projectDesc")?.value.trim(),
    budget:       $("#projectBudget")?.value,
    timeline:     $("#projectTimeline")?.value,
    designStyle:  $("#designStyle")?.value || "",
    name:         $("#clientName")?.value.trim(),
    email:        $("#clientEmail")?.value.trim(),
    whatsapp:     $("#clientWhatsapp")?.value.trim() || "",
    designerId:   $("#designerId")?.value || "",
  };

  const token = getToken();
  const required = ["projectTitle","description","timeline", ...(token ? [] : ["name","email"])];
  for (const k of required) {
    if (!data[k]) {
      showMsg(errorEl, "❌ Please fill in all required fields.", true);
      return;
    }
  }
  if (!token && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    showMsg(errorEl, "❌ Please enter a valid email address.", true);
    return;
  }

  btn.disabled = true;
  btnText?.classList.add("hidden");
  btnLoad?.classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/hire-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        designerId:   data.designerId,
        projectTitle: data.projectTitle,
        description:  data.description,
        budgetLabel:  data.budget,
        budget:       data.budget,
        timeline:     data.timeline,
        designStyle:  data.designStyle,
        name:         data.name,
        email:        data.email,
        whatsapp:     data.whatsapp,
      }),
    });
    const result = await safeJsonResponse(res);
    if (!res.ok) throw new Error(result.message || "Could not submit hire request.");

    showMsg(successEl, `✅ ${result.message || "Request received! We'll be in touch within 24 hours."}`);
    hireForm.reset();
  } catch (err) {
    console.error("Hire form error:", err);
    showMsg(errorEl, `❌ ${err.message}`, true);
  } finally {
    btn.disabled = false;
    btnText?.classList.remove("hidden");
    btnLoad?.classList.add("hidden");
  }
});

/* ---- Auth page: sign in / sign up tabs -------------------------------- */
  var authTabs = document.querySelectorAll('.auth-tabs__btn');
  var formPanels = document.querySelectorAll('.form-panel');

  function setAuthMode(mode) {
    authTabs.forEach(function (tab) {
      var isActive = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    formPanels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.dataset.panel === mode);
    });
  }

  if (authTabs.length) {
    authTabs.forEach(function (tab) {
      tab.addEventListener('click', function () { setAuthMode(tab.dataset.mode); });
    });
    // Deep-link support: signin.html#signup opens straight to the sign-up tab
    var initialMode = window.location.hash === '#signup' ? 'signup' : 'signin';
    setAuthMode(initialMode);
  }

/* ─── Redirect away from the login page if already signed in ─── */
if (document.body.classList.contains('auth-page') && getToken() && getUser()) {
  window.location.replace(portalUrlFor(getUser()));
}

var authForms = document.querySelectorAll('.auth-card form.form-panel');
authForms.forEach(function (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const mode      = form.dataset.panel; // "signin" | "signup"
    const remember  = form.querySelector('.form-check input')?.checked ?? true;
    const submitBtn = form.querySelector('.auth-card__submit');
    const errorEl   = form.querySelector('.form-error');
    const successEl = form.querySelector('.form-success');
    hideMsg(errorEl); hideMsg(successEl);

    let payload, endpoint;
    if (mode === 'signup') {
      const name     = form.querySelector('#signupName')?.value.trim();
      const email    = form.querySelector('#signupEmail')?.value.trim();
      const password = form.querySelector('#signupPassword')?.value;
      if (!name || !email || !password) {
        showMsg(errorEl, '❌ Please fill in every field.', true);
        return;
      }
      if (password.length < 8) {
        showMsg(errorEl, '❌ Password must be at least 8 characters.', true);
        return;
      }
      payload  = { name, email, password };
      endpoint = '/api/auth/signup';
    } else {
      const email    = form.querySelector('#signinEmail')?.value.trim();
      const password = form.querySelector('#signinPassword')?.value;
      if (!email || !password) {
        showMsg(errorEl, '❌ Please enter your email and password.', true);
        return;
      }
      payload  = { email, password };
      endpoint = '/api/auth/login';
    }

    const originalLabel = submitBtn?.querySelector('span')?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      const label = submitBtn.querySelector('span');
      if (label) label.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…';
    }

    try {
      const res  = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await safeJsonResponse(res);
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');

      setAuth(data.token, data.user, remember);
      showMsg(successEl, mode === 'signup' ? '✅ Account created! Redirecting…' : '✅ Signed in! Redirecting…');
      setTimeout(() => { window.location.href = portalUrlFor(data.user); }, 600);
    } catch (err) {
      showMsg(errorEl, `❌ ${err.message}`, true);
      if (submitBtn) {
        submitBtn.disabled = false;
        const label = submitBtn.querySelector('span');
        if (label) label.textContent = originalLabel || (mode === 'signup' ? 'Create free account' : 'Sign in');
      }
    }
  });
});

/* ─────────────────────────────────────────────
   CONTACT PAGE FORM
───────────────────────────────────────────── */
const contactForm = $("#contactForm");
contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn       = $("#contactSubmitBtn");
  const btnText   = btn?.querySelector(".btn-text");
  const btnLoad   = btn?.querySelector(".btn-loading");
  const successEl = $("#contactSuccess");
  const errorEl   = $("#contactError");
  hideMsg(successEl); hideMsg(errorEl);

  const payload = {
    name:    $("#contactName")?.value.trim(),
    email:   $("#contactEmail")?.value.trim(),
    phone:   $("#contactPhone")?.value.trim() || "",
    subject: $("#contactSubject")?.value.trim() || "",
    message: $("#contactMessage")?.value.trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    showMsg(errorEl, "❌ Please fill in your name, email, and message.", true);
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    showMsg(errorEl, "❌ Please enter a valid email address.", true);
    return;
  }

  btn.disabled = true;
  btnText?.classList.add("hidden");
  btnLoad?.classList.remove("hidden");
  try {
    const res = await fetch(`${API_BASE}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await safeJsonResponse(res);
    if (!res.ok) throw new Error(data.message || "Could not send your message.");
    showMsg(successEl, `✅ ${data.message}`);
    contactForm.reset();
  } catch (err) {
    showMsg(errorEl, `❌ ${err.message}`, true);
  } finally {
    btn.disabled = false;
    btnText?.classList.remove("hidden");
    btnLoad?.classList.add("hidden");
  }
});

/* ─── OAuth buttons: redirect to the server's provider entry points ─── */
document.querySelectorAll('.oauth-btn').forEach((btn) => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const provider = btn.textContent.toLowerCase().includes("google") ? "google" : "github";
    const label = provider === "google" ? "Google" : "GitHub";
    try {
      const res  = await fetch(`${API_BASE}/api/health`);
      const data = await safeJsonResponse(res);
      if (!data.features?.[`${provider}OAuth`]) {
        alert(`${label} sign-in is not configured on this server yet. ${label} OAuth credentials must be added to the environment first.`);
        return;
      }
      window.location.href = `${API_BASE}/api/auth/${provider}`;
    } catch (_) {
      alert("Could not reach the server. Please try again.");
    }
  });
});

/* ─── Forgot password ─── */
var forgotLink = document.querySelector('.form-link[href="#forgot"]');
if (forgotLink) {
  forgotLink.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('forgot'); });
}

var forgotForm = document.querySelector('.form-panel[data-panel="forgot"]');
forgotForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email     = $('#forgotEmail')?.value.trim();
  const errorEl   = forgotForm.querySelector('.form-error');
  const successEl = forgotForm.querySelector('.form-success');
  const submitBtn = forgotForm.querySelector('.auth-card__submit');
  hideMsg(errorEl); hideMsg(successEl);
  if (!email) { showMsg(errorEl, '❌ Please enter your email address.', true); return; }
  if (submitBtn) submitBtn.disabled = true;
  try {
    const res  = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await safeJsonResponse(res);
    if (!res.ok) throw new Error(data.message || 'Could not send the reset email.');
    showMsg(successEl, `✅ ${data.message}`);
  } catch (err) {
    showMsg(errorEl, `❌ ${err.message}`, true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

/* ─────────────────────────────────────────────
   LOAD FULL PROFILE FROM SERVER
   (gets user + hireRequests from /api/me)
───────────────────────────────────────────── */
async function loadFullProfile() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await safeJsonResponse(res);
    if (data.user) setUser(data.user);
    // Save hire requests in memory for rendering
    const requestsRes = await fetch(`${API_BASE}/api/hire-requests`, { headers: { Authorization: `Bearer ${token}` } });
    const requestsData = await safeJsonResponse(requestsRes);
    window._srtHireRequests = requestsData.hireRequests || [];

    const projectsRes = await fetch(`${API_BASE}/api/projects`, { headers: { Authorization: `Bearer ${token}` } });
    const projectsData = await safeJsonResponse(projectsRes);
    window._srtProjects = projectsData.projects || [];

    const projectSelect = $("#reviewProject");
    window._srtProjects.filter((project) => project.status === "completed").forEach((project) => {
      const option = document.createElement("option");
      option.value = project._id || project.id;
      option.textContent = project.title;
      projectSelect?.appendChild(option);
    });

    if (data.user && data.user.role === "designer") {
      const earningsRes = await fetch(`${API_BASE}/api/payments/my-earnings`, { headers: { Authorization: `Bearer ${token}` } });
      window._srtEarnings = earningsRes.ok ? await safeJsonResponse(earningsRes) : { payments: [], totalEarned: 0 };
    }
  } catch (_) {}
}

async function loadMarketplaceOptions() {
  const designerSelect = $("#designerId");
  if (designerSelect) {
    try {
      const res = await fetch(`${API_BASE}/api/designers?limit=50`);
      const data = await safeJsonResponse(res);
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Any available designer (we'll match the best)";
      designerSelect.appendChild(option);
      (data.designers || []).forEach((designer) => {
        const option = document.createElement("option");
        option.value = designer._id || designer.id;
        option.textContent = designer.user?.name || "Designer";
        designerSelect.appendChild(option);
      });
      // Pre-select a designer when arriving via hire.html?designer=ID
      const preselect = new URLSearchParams(window.location.search).get("designer");
      if (preselect) designerSelect.value = preselect;
    } catch (_) {}
  }

  const designerGrid = document.querySelector(".designers-grid");
  if (!designerGrid) return;
  try {
    const res = await fetch(`${API_BASE}/api/designers?limit=6`);
    const data = await safeJsonResponse(res);
    if (!res.ok || !Array.isArray(data.designers) || data.designers.length === 0) return;
    designerGrid.innerHTML = data.designers.map((designer) => {
      const user = designer.user || {};
      const name = user.name || "Designer";
      const email = user.email || "";
      const photo = user.photo || "";
      return `<article class="designer-card reveal visible">
        <div class="designer-card-top"><div class="designer-avatar-wrap">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" class="designer-avatar">` : `<div class="designer-avatar profile-avatar">${escapeHtml(name.charAt(0))}</div>`}</div>
        <div class="designer-info"><h3 class="designer-name">${escapeHtml(name)}</h3><p class="designer-title">${escapeHtml(designer.availability || "Available")}</p><div class="designer-rating"><span class="stars">★★★★★</span><span class="rating-val">${Number(designer.rating || 0).toFixed(1)}</span><span class="rating-count">(${designer.ratingCount || 0} reviews)</span></div></div></div>
        <div class="designer-skills">${(designer.skills || []).slice(0, 5).map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}</div>
        <div class="designer-footer"><div class="designer-meta"><span>${escapeHtml(`${designer.experience || 0}+ yrs exp`)}</span></div><div class="designer-actions"><a href="mailto:${escapeHtml(email)}" class="btn btn-outline btn-sm" title="Email ${escapeHtml(name)}">📧 Email</a><a href="hire.html?designer=${escapeHtml(designer._id || designer.id)}" class="btn btn-gold btn-sm">Hire Now</a></div></div>
      </article>`;
    }).join("");
    designerGrid.querySelectorAll("[data-designer-id]").forEach((link) => link.addEventListener("click", () => {
      const select = $("#designerId");
      if (select) select.value = link.dataset.designerId;
    }));
  } catch (_) {}
}

/* ─────────────────────────────────────────────
   FEATURE 1: PHOTO UPLOAD
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   FEATURE 2: PROFILE EDIT (name, company, phone)
───────────────────────────────────────────── */
async function saveProfileEdit(name, company, phone, photo) {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, company, phone, ...(photo ? { photo } : {}) }),
    });
    const data = await safeJsonResponse(res);
    if (!res.ok) throw new Error(data.message || "Update failed");
    if (data.user) setUser(data.user);
    return true;
  } catch (err) {
    alert("Profile update failed: " + err.message);
    return false;
  }
}

/* ─────────────────────────────────────────────
   FEATURE 6: CEO — Change project status
───────────────────────────────────────────── */
async function updateHireStatus(requestId, newStatus) {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/hire-requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await safeJsonResponse(res);
    if (!res.ok) throw new Error(data.message || "Status update failed");
    return data.hireRequest;
  } catch (err) {
    alert("Status update failed: " + err.message);
    return null;
  }
}

async function updateProjectStatus(projectId, newStatus) {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/projects/${projectId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await safeJsonResponse(res);
    if (!res.ok) throw new Error(data.message || "Status update failed");
    return data.project;
  } catch (err) {
    alert("Status update failed: " + err.message);
    return null;
  }
}

/* ─────────────────────────────────────────────
   RENDER PROFILE: DESIGNER VIEW
───────────────────────────────────────────── */
function renderDesignerProfile(user, hireRequests, projects, earnings) {
  const profileContent = $("#profileContent");
  if (!profileContent) return;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Unknown";

  const pendingRequests = (hireRequests || []).filter((r) => r.status === "pending");
  const otherRequests = (hireRequests || []).filter((r) => r.status !== "pending");

  const pendingHtml = pendingRequests.length === 0
    ? `<p class="text-muted" style="padding:12px 0;">No new hire requests right now.</p>`
    : pendingRequests.map((r) => `
        <div class="hire-request-card" style="border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div>
              <strong>${escapeHtml(r.projectTitle || "—")}</strong>
              <p class="text-muted" style="margin:4px 0;font-size:.88rem;">${escapeHtml((r.description || "").slice(0, 140))}${(r.description || "").length > 140 ? "…" : ""}</p>
              <p class="text-muted" style="font-size:.82rem;">Budget: ${escapeHtml(r.budgetLabel || String(r.budget || "—"))} · Timeline: ${escapeHtml(r.timeline || "—")}</p>
            </div>
            <div style="display:flex;gap:8px;align-items:flex-start;">
              <button class="btn btn-gold btn-sm hire-accept-btn" data-id="${r._id || r.id}">Accept</button>
              <button class="btn btn-outline btn-sm hire-reject-btn" data-id="${r._id || r.id}">Reject</button>
            </div>
          </div>
        </div>
      `).join("");

  const historyRows = otherRequests.length === 0 ? "" : `
    <div class="table-wrap" style="margin-top:14px;">
      <table class="requests-table">
        <thead><tr><th>Project</th><th>Budget</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${otherRequests.map((r) => `
          <tr>
            <td>${escapeHtml(r.projectTitle || "—")}</td>
            <td>${escapeHtml(r.budgetLabel || String(r.budget || "—"))}</td>
            <td>${statusBadge(r.status || "pending")}</td>
            <td style="color:var(--text-muted);font-size:.8rem;">${new Date(r.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </div>
  `;

  const projectTransitions = { pending: "in_progress", in_progress: "completed" };
  const projectActionLabel = { pending: "Start Project", in_progress: "Mark Completed" };
  const projectsHtml = (projects || []).length === 0
    ? `<p class="text-muted" style="padding:12px 0;">No projects yet.</p>`
    : `<div class="table-wrap">
        <table class="requests-table">
          <thead><tr><th>Project</th><th>Client</th><th>Budget</th><th>Status</th><th></th></tr></thead>
          <tbody>${projects.map((p) => `
            <tr id="project-row-${p._id || p.id}">
              <td>${escapeHtml(p.title || "—")}</td>
              <td>${escapeHtml((p.client && p.client.name) || "—")}</td>
              <td>${escapeHtml(String(p.budget || "—"))}</td>
              <td id="project-status-${p._id || p.id}">${statusBadge(p.status || "pending")}</td>
              <td>${projectTransitions[p.status] ? `<button class="btn btn-outline btn-sm project-advance-btn" data-id="${p._id || p.id}" data-next="${projectTransitions[p.status]}">${projectActionLabel[p.status]}</button>` : ""}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>`;

  const paidPayments = (earnings?.payments || []).filter((p) => p.status === "paid");
  const earningsRows = paidPayments.length === 0
    ? `<p class="text-muted" style="padding:12px 0;">No confirmed payments yet.</p>`
    : `<div class="table-wrap">
        <table class="requests-table">
          <thead><tr><th>Project</th><th>Your Share</th><th>Client</th><th>Paid On</th></tr></thead>
          <tbody>${paidPayments.map((p) => `
            <tr>
              <td>${escapeHtml((p.project && p.project.title) || "—")}</td>
              <td>${escapeHtml(p.currency || "BDT")} ${p.developerShare}</td>
              <td>${escapeHtml((p.user && p.user.name) || "—")}</td>
              <td style="color:var(--text-muted);font-size:.8rem;">${p.completedAt ? new Date(p.completedAt).toLocaleDateString() : "—"}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>`;

  profileContent.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar-wrap" id="profileAvatarWrap">
        ${user.photo
          ? `<img src="${escapeHtml(user.photo)}" alt="Profile" class="profile-photo" id="profilePhotoImg"/>`
          : `<div class="profile-avatar" id="profileAvatarInitial">${(user.name || user.email || "?").charAt(0).toUpperCase()}</div>`
        }
      </div>
      <div>
        <h3>Welcome, ${escapeHtml(user.name || "Designer")}</h3>
        <p class="text-muted"><a href="mailto:${escapeHtml(user.email || "")}">${escapeHtml(user.email || "")}</a></p>
        <p class="client-id-badge">🎨 Designer</p>
        <p class="member-since">📅 Member since ${memberSince}</p>
      </div>
    </div>

    <div class="profile-edit-wrap" id="profileEditWrap" style="display:none;">
      <h4 class="profile-sub-title">✏️ Edit Profile</h4>
      <div class="form-row-two">
        <div class="form-group"><label>Full Name</label><input type="text" id="editName" value="${escapeHtml(user.name || "")}" class="form-input"/></div>
        <div class="form-group"><label>Phone</label><input type="text" id="editPhone" value="${escapeHtml(user.phone || "")}" class="form-input"/></div>
      </div>
      <div class="form-group"><label>Profile image URL (HTTPS, optional)</label><input type="url" id="editPhotoUrl" value="${escapeHtml(user.photo || "")}" class="form-input" placeholder="https://..."/></div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-gold" id="saveProfileBtn">💾 Save Changes</button>
        <button class="btn btn-outline" id="cancelEditBtn">Cancel</button>
      </div>
      <p class="form-success hidden" id="editSuccess">✅ Profile updated!</p>
    </div>

    <div class="profile-actions">
      <button class="btn btn-outline" id="editProfileBtn">✏️ Edit Profile</button>
      <button class="btn btn-outline" id="logoutBtn">Sign Out</button>
    </div>

    <div class="earnings-summary" style="margin-top:28px;padding:20px;border:1px solid var(--border);border-radius:var(--radius);">
      <h4 class="profile-sub-title" style="margin-top:0;">💰 Total Earned</h4>
      <p style="font-size:1.8rem;font-weight:800;color:var(--gold, #CFA85A);margin:0;">৳${(earnings?.totalEarned || 0).toLocaleString()}</p>
      <p class="text-muted" style="font-size:.82rem;">From confirmed payments only. Your share is always 50% of what the client pays, calculated on the server.</p>
    </div>

    <div style="margin-top:28px;">
      <h4 class="profile-sub-title">📥 New Hire Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ""}</h4>
      ${pendingHtml}
      ${historyRows}
    </div>

    <div style="margin-top:28px;">
      <h4 class="profile-sub-title">🗂️ My Projects</h4>
      ${projectsHtml}
    </div>

    <div style="margin-top:28px;">
      <h4 class="profile-sub-title">💳 Payment History</h4>
      ${earningsRows}
    </div>
  `;

  $("#editProfileBtn")?.addEventListener("click", () => {
    $("#profileEditWrap").style.display = "block";
    $("#editProfileBtn").style.display = "none";
  });
  $("#cancelEditBtn")?.addEventListener("click", () => {
    $("#profileEditWrap").style.display = "none";
    $("#editProfileBtn").style.display = "";
  });
  $("#saveProfileBtn")?.addEventListener("click", async () => {
    const name = $("#editName")?.value.trim();
    const phone = $("#editPhone")?.value.trim();
    const photo = $("#editPhotoUrl")?.value.trim();
    if (!name) { alert("Name cannot be empty."); return; }
    const btn = $("#saveProfileBtn");
    btn.disabled = true; btn.textContent = "Saving…";
    const ok = await saveProfileEdit(name, "", phone, photo);
    btn.disabled = false; btn.textContent = "💾 Save Changes";
    if (ok) {
      showMsg($("#editSuccess"), "✅ Profile updated!");
      setTimeout(() => updateAuthUI(), 800);
    }
  });

  $("#logoutBtn")?.addEventListener("click", () => {
    clearAuth();
    window._srtHireRequests = [];
    window._srtProjects = [];
    updateAuthUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $$(".hire-accept-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true; btn.textContent = "Accepting…";
      const result = await updateHireStatus(btn.dataset.id, "accepted");
      if (result) { await loadFullProfile(); updateAuthUI(); }
      else { btn.disabled = false; btn.textContent = "Accept"; }
    });
  });
  $$(".hire-reject-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Reject this hire request?")) return;
      btn.disabled = true; btn.textContent = "Rejecting…";
      const result = await updateHireStatus(btn.dataset.id, "rejected");
      if (result) { await loadFullProfile(); updateAuthUI(); }
      else { btn.disabled = false; btn.textContent = "Reject"; }
    });
  });
  $$(".project-advance-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const result = await updateProjectStatus(btn.dataset.id, btn.dataset.next);
      if (result) { await loadFullProfile(); updateAuthUI(); }
      else { btn.disabled = false; }
    });
  });
}

/* ─────────────────────────────────────────────
   RENDER PROFILE: CLIENT VIEW
───────────────────────────────────────────── */
function renderClientProfile(user, hireRequests) {
  const profileContent = $("#profileContent");
  if (!profileContent) return;

  // Feature 5: Member since date
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Unknown";

  // Feature 3: Hire request history table rows
  let requestsHtml = "";
  if (hireRequests && hireRequests.length > 0) {
    const rows = hireRequests.map(r => `
      <tr>
        <td>${escapeHtml(r.projectTitle || "—")}</td>
        <td>${escapeHtml(r.budget || "—")}</td>
        <td>${escapeHtml(r.timeline || "—")}</td>
        <td>${statusBadge(r.status || "pending")}</td>
        <td style="color:var(--text-muted);font-size:.8rem;">${new Date(r.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join("");
    requestsHtml = `
      <div class="profile-requests">
        <h4 class="profile-sub-title">📋 My Hire Requests</h4>
        <div class="table-wrap">
          <table class="requests-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Budget</th>
                <th>Timeline</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    requestsHtml = `
      <div class="profile-requests">
        <h4 class="profile-sub-title">📋 My Hire Requests</h4>
        <p class="text-muted" style="text-align:center;padding:20px 0;">
          No hire requests yet. <a href="#hire" class="text-gold">Submit one now →</a>
        </p>
      </div>
    `;
  }

  profileContent.innerHTML = `
    <!-- Profile Header -->
    <div class="profile-header">
      <!-- Feature 1: Profile photo with upload button -->
      <div class="profile-avatar-wrap" id="profileAvatarWrap">
        ${user.photo
          ? `<img src="${escapeHtml(user.photo)}" alt="Profile" class="profile-photo" id="profilePhotoImg"/>`
          : `<div class="profile-avatar" id="profileAvatarInitial">${(user.name || user.email || "?").charAt(0).toUpperCase()}</div>`
        }
      </div>
      <div>
        <h3 id="displayName">Welcome, ${escapeHtml(user.name || "Client")}</h3>
        <p class="text-muted"><a href="mailto:${escapeHtml(user.email || "")}">${escapeHtml(user.email || "")}</a></p>
        ${user.company ? `<p class="text-muted" id="displayCompany">🏢 ${escapeHtml(user.company)}</p>` : ""}
        ${user.phone ? `<p class="text-muted" id="displayPhone">📞 ${escapeHtml(user.phone)}</p>` : ""}
        <!-- Feature 4 & 5: Client ID + Member Since -->
        <p class="client-id-badge" id="displayClientId">🆔 ${escapeHtml(user.clientId || "—")}</p>
        <p class="member-since">📅 Member since ${memberSince}</p>
      </div>
    </div>

    <!-- Feature 2: Edit Profile Form -->
    <div class="profile-edit-wrap" id="profileEditWrap" style="display:none;">
      <h4 class="profile-sub-title">✏️ Edit Profile</h4>
      <div class="form-row-two">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="editName" value="${escapeHtml(user.name || "")}" class="form-input"/>
        </div>
        <div class="form-group">
          <label>Company</label>
          <input type="text" id="editCompany" value="${escapeHtml(user.company || "")}" class="form-input"/>
        </div>
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="text" id="editPhone" value="${escapeHtml(user.phone || "")}" class="form-input"/>
      </div>
      <div class="form-group">
        <label>Profile image URL (HTTPS, optional)</label>
        <input type="url" id="editPhotoUrl" value="${escapeHtml(user.photo || "")}" class="form-input" placeholder="https://..."/>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button class="btn btn-gold" id="saveProfileBtn">💾 Save Changes</button>
        <button class="btn btn-outline" id="cancelEditBtn">Cancel</button>
      </div>
      <p class="form-success hidden" id="editSuccess">✅ Profile updated!</p>
    </div>

    <!-- Action Buttons -->
    <div class="profile-actions">
      <a href="#hire" class="btn btn-gold">+ New Hire Request</a>
      <button class="btn btn-outline" id="editProfileBtn">✏️ Edit Profile</button>
      <button class="btn btn-outline" id="logoutBtn">Sign Out</button>
    </div>

    <!-- Feature 3: Hire Request History -->
    ${requestsHtml}

    <!-- Feature 4 & 5: ID Card -->
    <div class="id-card-section">
      <h4 class="profile-sub-title">🆔 Your Client ID Card</h4>
      <div class="id-card">
        <div class="id-card-header">
          <span class="id-card-brand">SRT <span class="logo-accent">Royal</span></span>
          <span class="id-card-type">CLIENT</span>
        </div>
        <div class="id-card-body">
          <div class="id-card-photo-wrap">
            ${user.photo
              ? `<img src="${escapeHtml(user.photo)}" alt="Profile" class="id-card-photo"/>`
              : `<div class="id-card-photo-placeholder">${(user.name || "?").charAt(0).toUpperCase()}</div>`
            }
          </div>
          <div class="id-card-info">
            <h3 class="id-card-name">${escapeHtml(user.name || "—")}</h3>
            <p class="id-card-role">${user.role || "Client"}</p>
            ${user.company ? `<p class="id-card-company">🏢 ${escapeHtml(user.company)}</p>` : ""}
            <div class="id-card-id">${escapeHtml(user.clientId || "—")}</div>
            <p class="id-card-since">Member since ${memberSince}</p>
          </div>
        </div>
        <div class="id-card-footer">
          <span class="id-card-status-dot"></span>
          <span>Active Member</span>
        </div>
      </div>
    </div>
  `;

  /* ── Event Listeners for Client Profile ── */

  // Edit toggle
  $("#editProfileBtn")?.addEventListener("click", () => {
    $("#profileEditWrap").style.display = "block";
    $("#editProfileBtn").style.display = "none";
  });

  $("#cancelEditBtn")?.addEventListener("click", () => {
    $("#profileEditWrap").style.display = "none";
    $("#editProfileBtn").style.display = "";
  });

  $("#saveProfileBtn")?.addEventListener("click", async () => {
    const name    = $("#editName")?.value.trim();
    const company = $("#editCompany")?.value.trim();
    const phone   = $("#editPhone")?.value.trim();
    const photo   = $("#editPhotoUrl")?.value.trim();

    if (!name) { alert("Name cannot be empty."); return; }

    const btn = $("#saveProfileBtn");
    btn.disabled = true; btn.textContent = "Saving…";

    const ok = await saveProfileEdit(name, company, phone, photo);
    btn.disabled = false; btn.textContent = "💾 Save Changes";

    if (ok) {
      showMsg($("#editSuccess"), "✅ Profile updated!");
      setTimeout(() => {
        updateAuthUI();
      }, 800);
    }
  });

  // Logout
  $("#logoutBtn")?.addEventListener("click", () => {
    clearAuth();
    window._srtHireRequests = [];
    updateAuthUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ─────────────────────────────────────────────
   RENDER PROFILE: CEO / ADMIN VIEW
───────────────────────────────────────────── */
async function renderCEOProfile(user) {
  const profileContent = $("#profileContent");
  if (!profileContent) return;

  profileContent.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar ceo-avatar">👑</div>
      <div>
        <h3>CEO Dashboard</h3>
        <p class="text-muted"><a href="mailto:${escapeHtml(user.email)}">${escapeHtml(user.email)}</a></p>
        <p class="client-id-badge">🆔 ${escapeHtml(user.clientId || "SRT-CEO-0001")}</p>
      </div>
    </div>
    <div class="profile-actions">
      <button class="btn btn-outline" id="logoutBtn">Sign Out</button>
    </div>
    <div id="adminClientsWrap">
      <h4 class="profile-sub-title">👥 All Clients</h4>
      <p class="text-muted" id="adminLoadingMsg">Loading clients…</p>
    </div>
    <div id="adminRequestsWrap" style="margin-top:32px;">
      <h4 class="profile-sub-title">📋 All Hire Requests</h4>
      <p class="text-muted" id="adminReqLoadingMsg">Loading requests…</p>
    </div>
    <div id="adminMessagesWrap" style="margin-top:32px;">
      <h4 class="profile-sub-title">✉️ Contact Messages</h4>
      <p class="text-muted" id="adminMsgLoadingMsg">Loading messages…</p>
    </div>
    <div id="adminActivityWrap" style="margin-top:32px;">
      <h4 class="profile-sub-title">🕒 Recent Activity</h4>
      <p class="text-muted" id="adminActivityLoadingMsg">Loading activity…</p>
    </div>
  `;

  $("#logoutBtn")?.addEventListener("click", () => {
    clearAuth();
    window._srtHireRequests = [];
    updateAuthUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Load clients
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await safeJsonResponse(res);
    const clients = (data.users || []).filter((client) => client.role === "client");

    const clientsHtml = clients.length === 0
      ? `<p class="text-muted">No clients yet.</p>`
      : `<div class="table-wrap"><table class="requests-table">
          <thead><tr><th>Name</th><th>Email</th><th>Client ID</th><th>Joined</th><th>Requests</th></tr></thead>
          <tbody>${clients.map(c => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td><a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></td>
              <td><span class="client-id-badge">${escapeHtml(c.clientId)}</span></td>
              <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
              <td>${(c.requests || []).length}</td>
            </tr>
          `).join("")}</tbody>
        </table></div>`;

    const wrap = $("#adminClientsWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">👥 All Clients (${clients.length})</h4>${clientsHtml}`;
  } catch (_) {
    const wrap = $("#adminClientsWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">👥 Clients</h4><p class="text-muted">Could not load clients.</p>`;
  }

  // Load all hire requests (for CEO)
  try {
    const res = await fetch(`${API_BASE}/api/admin/hire-requests`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await safeJsonResponse(res);
    const requests = data.hireRequests || [];

    const reqHtml = requests.length === 0
      ? `<p class="text-muted">No hire requests yet.</p>`
      : `<div class="table-wrap"><table class="requests-table">
          <thead><tr><th>Project</th><th>Client</th><th>Budget</th><th>Status</th><th>Change Status</th></tr></thead>
          <tbody>${requests.map(r => `
            <tr id="req-row-${r.id}">
              <td>${escapeHtml(r.projectTitle || "—")}</td>
              <td>${escapeHtml(r.guestName || r.client?.name || r.name || "Guest")}</td>
              <td>${escapeHtml(r.budgetLabel || r.budget || "—")}</td>
              <td id="req-status-${r.id}">${statusBadge(r.status)}</td>
              <td>
                <!-- Feature 6: CEO status dropdown -->
                <select class="status-select" data-id="${r.id}">
                  <option value="pending" ${r.status === "pending" ? "selected" : ""}>⏳ Pending</option>
                  <option value="accepted" ${r.status === "accepted" ? "selected" : ""}>Accepted</option>
                  <option value="rejected" ${r.status === "rejected" ? "selected" : ""}>Rejected</option>
                  <option value="cancelled" ${r.status === "cancelled" ? "selected" : ""}>Cancelled</option>
                </select>
              </td>
            </tr>
          `).join("")}</tbody>
        </table></div>`;

    const wrap = $("#adminRequestsWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">📋 All Hire Requests (${requests.length})</h4>${reqHtml}`;

    // Attach status change listeners
    $$(".status-select").forEach(select => {
      select.addEventListener("change", async (e) => {
        const requestId = select.dataset.id;
        const newStatus = select.value;
        select.disabled = true;
        const updated = await updateHireStatus(requestId, newStatus);
        select.disabled = false;
        if (updated) {
          const statusCell = $(`#req-status-${requestId}`);
          if (statusCell) statusCell.innerHTML = statusBadge(updated.status);
        }
      });
    });
  } catch (_) {
    const wrap = $("#adminRequestsWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">📋 Hire Requests</h4><p class="text-muted">Could not load requests.</p>`;
  }

  // Load contact-form messages (name, email, phone, subject, message — saved to MongoDB
  // and, when RESEND_API_KEY / EMAIL_FROM / OWNER_EMAIL are set, also emailed here)
  try {
    const res = await fetch(`${API_BASE}/api/admin/contact-messages`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await safeJsonResponse(res);
    const messages = data.messages || [];

    const msgHtml = messages.length === 0
      ? `<p class="text-muted">No messages yet.</p>`
      : `<div class="table-wrap"><table class="requests-table">
          <thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Received</th><th>Status</th></tr></thead>
          <tbody>${messages.map(m => `
            <tr id="msg-row-${m._id || m.id}">
              <td>
                <strong>${escapeHtml(m.name)}</strong><br/>
                <a href="mailto:${escapeHtml(m.email)}" style="color:var(--text-muted);font-size:.85rem;">${escapeHtml(m.email)}</a>
                ${m.phone ? `<br/><span style="color:var(--text-muted);font-size:.85rem;">${escapeHtml(m.phone)}</span>` : ""}
              </td>
              <td>${escapeHtml(m.subject || "—")}</td>
              <td style="max-width:280px;white-space:pre-wrap;">${escapeHtml(m.message)}</td>
              <td style="color:var(--text-muted);font-size:.8rem;">${m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}</td>
              <td id="msg-status-${m._id || m.id}">
                ${m.handled
                  ? `<span class="status-badge" style="background:#22c55e22;color:#22c55e;border:1px solid #22c55e44;">✅ Handled</span>`
                  : `<button class="btn btn-outline btn-sm mark-handled-btn" data-id="${m._id || m.id}">Mark handled</button>`
                }
              </td>
            </tr>
          `).join("")}</tbody>
        </table></div>`;

    const wrap = $("#adminMessagesWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">✉️ Contact Messages (${messages.length})</h4>${msgHtml}`;

    $$(".mark-handled-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        btn.disabled = true; btn.textContent = "Saving…";
        const ok = await markContactMessageHandled(id);
        if (ok) {
          const cell = $(`#msg-status-${id}`);
          if (cell) cell.innerHTML = `<span class="status-badge" style="background:#22c55e22;color:#22c55e;border:1px solid #22c55e44;">✅ Handled</span>`;
        } else {
          btn.disabled = false; btn.textContent = "Mark handled";
        }
      });
    });
  } catch (_) {
    const wrap = $("#adminMessagesWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">✉️ Contact Messages</h4><p class="text-muted">Could not load messages.</p>`;
  }

  // Load recent activity log
  try {
    const res = await fetch(`${API_BASE}/api/admin/activity?limit=40`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await safeJsonResponse(res);
    const entries = data.entries || [];

    const actionLabels = {
      'user.signup': '👤 signed up',
      'hire_request.created': '📥 submitted a hire request',
      'hire_request.accepted': '✅ accepted a hire request',
      'hire_request.rejected': '❌ rejected a hire request',
      'project.created': '🗂️ project created',
      'project.completed': '🏁 marked a project completed',
      'project.in_progress': '▶️ started a project',
      'payment.created': '💳 initiated a payment',
      'payment.confirmed': '✅ confirmed a payment',
      'designer.approved': '🎨 designer approved',
      'designer.rejected': '🚫 designer rejected',
    };

    const activityHtml = entries.length === 0
      ? `<p class="text-muted">No activity recorded yet.</p>`
      : `<div class="table-wrap"><table class="requests-table">
          <thead><tr><th>Who</th><th>Action</th><th>When</th></tr></thead>
          <tbody>${entries.map((e) => `
            <tr>
              <td>${escapeHtml((e.actor && e.actor.name) || (e.actorRole === 'system' ? 'System' : 'Unknown'))} <span class="text-muted" style="font-size:.78rem;">(${escapeHtml(e.actorRole)})</span></td>
              <td>${actionLabels[e.action] || escapeHtml(e.action)}</td>
              <td style="color:var(--text-muted);font-size:.8rem;">${new Date(e.createdAt).toLocaleString()}</td>
            </tr>
          `).join("")}</tbody>
        </table></div>`;

    const wrap = $("#adminActivityWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">🕒 Recent Activity</h4>${activityHtml}`;
  } catch (_) {
    const wrap = $("#adminActivityWrap");
    if (wrap) wrap.innerHTML = `<h4 class="profile-sub-title">🕒 Recent Activity</h4><p class="text-muted">Could not load activity.</p>`;
  }
}

/* ─── Admin: mark a contact-form message as handled ─── */
async function markContactMessageHandled(id) {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/admin/contact-messages/${id}/handled`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await safeJsonResponse(res);
    if (!res.ok) throw new Error(data.message || "Update failed");
    return true;
  } catch (err) {
    alert("Could not update message: " + err.message);
    return false;
  }
}

/* ─────────────────────────────────────────────
   AUTH UI — main toggle function
───────────────────────────────────────────── */
const navAuthLink    = $("#navAuthLink");
const navProfileLink = $("#navProfileLink");
const authSection    = $("#auth-section");
const profileSection = $("#profile-section");
const navNotifWrap    = $("#navNotifWrap");
const navNotifBtn     = $("#navNotifBtn");
const navNotifBadge   = $("#navNotifBadge");
const navNotifDropdown = $("#navNotifDropdown");
const navNotifList    = $("#navNotifList");
const navNotifMarkAll = $("#navNotifMarkAll");

async function loadNotifications() {
  const token = getToken();
  if (!token || !navNotifList) return;
  try {
    const res = await fetch(`${API_BASE}/api/notifications?limit=15`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await safeJsonResponse(res);
    const notifications = data.notifications || [];
    const unread = data.unread || 0;

    if (navNotifBadge) {
      navNotifBadge.textContent = unread > 9 ? "9+" : String(unread);
      navNotifBadge.classList.toggle("hidden", unread === 0);
    }

    navNotifList.innerHTML = notifications.length === 0
      ? `<p class="text-muted" style="padding:16px;text-align:center;">No notifications yet.</p>`
      : notifications.map((n) => `
          <button class="nav-notif-item ${n.isRead ? "" : "unread"}" data-id="${n._id || n.id}">
            ${escapeHtml(n.message)}
            <span class="notif-time">${new Date(n.createdAt).toLocaleString()}</span>
          </button>
        `).join("");

    $$(".nav-notif-item", navNotifList).forEach((item) => {
      item.addEventListener("click", async () => {
        const token2 = getToken();
        if (!token2) return;
        try {
          await fetch(`${API_BASE}/api/notifications/${item.dataset.id}/read`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token2}` },
          });
          item.classList.remove("unread");
          loadNotifications();
        } catch (_) {}
      });
    });
  } catch (_) {}
}

navNotifBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = !navNotifDropdown.classList.contains("hidden");
  navNotifDropdown.classList.toggle("hidden", isOpen);
  navNotifBtn.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) loadNotifications();
});
document.addEventListener("click", (e) => {
  if (navNotifDropdown && !navNotifDropdown.classList.contains("hidden") && !navNotifWrap?.contains(e.target)) {
    navNotifDropdown.classList.add("hidden");
    navNotifBtn?.setAttribute("aria-expanded", "false");
  }
});
navNotifMarkAll?.addEventListener("click", async () => {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/notifications/read-all`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    loadNotifications();
  } catch (_) {}
});

function updateAuthUI() {
  const user = getUser();
  const loggedIn = !!getToken() && !!user;

  navAuthLink?.classList.toggle("hidden", loggedIn);
  navProfileLink?.classList.toggle("hidden", !loggedIn);
  navNotifWrap?.classList.toggle("hidden", !loggedIn);
  authSection?.classList.toggle("hidden", loggedIn);
  profileSection?.classList.toggle("hidden", !loggedIn);

  if (loggedIn) loadNotifications();

  if (loggedIn && navProfileLink) {
    navProfileLink.href = portalUrlFor(user);
  }

  if (loggedIn) {
    if (user.role === "admin") {
      renderCEOProfile(user);
    } else if (user.role === "designer") {
      const hireRequests = window._srtHireRequests || [];
      const projects = window._srtProjects || [];
      const earnings = window._srtEarnings || { payments: [], totalEarned: 0 };
      renderDesignerProfile(user, hireRequests, projects, earnings);
    } else {
      const hireRequests = window._srtHireRequests || [];
      renderClientProfile(user, hireRequests);
    }
  }
}

/* ─── Load real testimonials on the homepage (no fake placeholder cards) ─── */
async function loadTestimonials() {
  const list = $("#testimonialsList");
  if (!list) return; // only present on index.html

  try {
    const res = await fetch(`${API_BASE}/api/reviews?limit=6`);
    const data = await safeJsonResponse(res);
    const reviews = data.reviews || [];

    if (reviews.length === 0) {
      list.innerHTML = `<p class="text-muted" style="grid-column:1/-1;text-align:center;">No reviews yet — be the first to share your experience below.</p>`;
      return;
    }

    list.innerHTML = reviews.map((r) => {
      const name = (r.client && r.client.name) || "Client";
      const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      return `
        <div class="testimonial-card reveal visible">
          <div class="tcard-top">
            <div class="tcard-stars">${stars}</div>
            <svg class="quote-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1-1s0-1-1-1c-1 0-3-.038-4-1H2c0 1-1 3-1 5s0 4 6 5 7-1 7-4V5c0-1.25-.757-2.017-2-2s-2.75-.75-4-1.972V11c0 1-1 2-2 2s-4.003-1-4.003-5.002S2 5 3 5"/></svg>
          </div>
          <p class="tcard-text">${escapeHtml(r.comment)}</p>
          <div class="tcard-author">
            <div class="tcard-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
            <div>
              <strong>${escapeHtml(name)}</strong>
              <span>Client</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  } catch (_) {
    list.innerHTML = `<p class="text-muted" style="grid-column:1/-1;text-align:center;">Could not load reviews right now.</p>`;
  }
}

/* ─── Auto-login on page load ─── */
(async () => {
  await loadMarketplaceOptions();
  await loadTestimonials();
  if (getToken()) {
    await loadFullProfile();
    updateAuthUI();
  }
})();

/* ─────────────────────────────────────────────
   STAR PICKER + REVIEW SUBMIT
───────────────────────────────────────────── */
const starPicker = $("#starPicker");
let selectedStars = 5;

if (starPicker) {
  const stars = $$(".rstar", starPicker);
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedStars = Number(star.dataset.v);
      stars.forEach((s) => {
        s.classList.toggle("active", Number(s.dataset.v) <= selectedStars);
      });
    });
    star.addEventListener("mouseenter", () => {
      const v = Number(star.dataset.v);
      stars.forEach((s) => s.classList.toggle("hover", Number(s.dataset.v) <= v));
    });
    star.addEventListener("mouseleave", () => {
      stars.forEach((s) => s.classList.remove("hover"));
    });
  });
}

$("#submitReviewBtn")?.addEventListener("click", async () => {
  const name    = $("#rName")?.value.trim();
  const role    = $("#rRole")?.value.trim();
  const text    = $("#rText")?.value.trim();
  const successEl = $("#reviewSuccess");
  hideMsg(successEl);

  if (!getToken()) {
    alert("Please sign in to review a completed project.");
    return;
  }
  const projectId = $("#reviewProject")?.value;
  if (!name || !text || !projectId) {
    alert("Please select a completed project and add your review.");
    return;
  }

  const btn = $("#submitReviewBtn");
  btn.disabled = true; const original = btn.textContent; btn.textContent = "Submitting…";

  try {
    const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ project: projectId, rating: selectedStars, comment: text }),
    });
    const data = await safeJsonResponse(res);
    if (!res.ok) throw new Error(data.message || "Could not submit review.");

    const list = $("#testimonialsList");
    if (list) {
      const card = document.createElement("div");
      card.className = "testimonial-card reveal visible";
      card.innerHTML = `
        <div class="tcard-top">
          <div class="tcard-stars">${"★".repeat(selectedStars)}${"☆".repeat(5 - selectedStars)}</div>
        </div>
        <p class="tcard-text">${escapeHtml(text)}</p>
        <div class="tcard-author">
          <div class="tcard-avatar">${name.charAt(0).toUpperCase()}</div>
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(role || "Client")}</span>
          </div>
        </div>
      `;
      list.prepend(card);
    }

    showMsg(successEl, "✅ Thank you for your review!");
    $("#rName").value = ""; $("#rRole").value = ""; $("#rText").value = "";
  } catch (err) {
    console.error(err);
    alert(`Could not submit review: ${err.message || "please try again."}`);
  } finally {
    btn.disabled = false; btn.textContent = original;
  }
});

/* ─────────────────────────────────────────────
   BACK TO TOP BUTTON
───────────────────────────────────────────── */
const backTop = document.createElement("button");
backTop.className = "back-top";
backTop.setAttribute("aria-label", "Back to top");
backTop.innerHTML = "↑";
document.body.appendChild(backTop);

window.addEventListener("scroll", () => {
  backTop.classList.toggle("show", window.scrollY > 500);
}, { passive: true });

backTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ─────────────────────────────────────────────
   ANIMATED BACKGROUND — royal clouds drift with scroll
───────────────────────────────────────────── */
(function () {
  const clouds = $$("[data-speed]");
  if (!clouds.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  let ticking = false;
  function applyParallax() {
    const y = window.scrollY;
    clouds.forEach((el) => {
      const speed = parseFloat(el.dataset.speed || "0.08");
      el.style.transform = `translate3d(0, ${(y * speed).toFixed(1)}px, 0)`;
    });
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });
  applyParallax();
})();

/* ─────────────────────────────────────────────
   PRELOADER FADE
───────────────────────────────────────────── */
window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

console.log("%cSRT ROYAL — Premium Frontend Experience", "color:#CFA85A;font-size:16px;font-weight:bold;");
console.log("%cDesigned & Developed by Sr. Tawsif", "color:#888;font-size:12px;");
