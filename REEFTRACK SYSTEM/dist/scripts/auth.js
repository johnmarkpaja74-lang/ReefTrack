(() => {
  "use strict";

  const KEYS = {
    users: "reeftrack_users",
    session: "reeftrack_session",
    credentials: "reeftrack_latest_credentials",
    history: "reeftrack_login_history",
    remembered: "reeftrack_remembered_login",
    pending: "reeftrack_pending_login"
  };
  const root = new URL("../", document.currentScript?.src || document.baseURI);
  const page = (path) => new URL(path, root).href;
  const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

  function read(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function message(text, type = "error") {
    const element = document.querySelector(".message");
    if (!element) return;
    element.textContent = text;
    element.className = `message ${type}`;
  }

  function deviceName() {
    const ua = navigator.userAgent || "";
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
    const platform = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown device";
    return `${browser} · ${platform}`;
  }

  function recordAttempt(user, email, role, successful) {
    const history = read(KEYS.history, []);
    history.unshift({
      id: crypto.randomUUID?.() || `login-${Date.now()}`,
      user: user?.name || "Unknown user",
      email,
      role,
      timestamp: new Date().toISOString(),
      device: deviceName(),
      ipAddress: "Not available",
      status: successful ? "Successful" : "Failed"
    });
    localStorage.setItem(KEYS.history, JSON.stringify(history.slice(0, 100)));
  }

  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-field")?.querySelector("input") || button.previousElementSibling;
      if (!input) return;
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      button.querySelector("i")?.classList.toggle("ph-eye", !reveal);
      button.querySelector("i")?.classList.toggle("ph-eye-slash", reveal);
    });
  });

  const signupForm = document.querySelector("#signup-form");
  signupForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(signupForm);
    const users = read(KEYS.users, []);
    const email = normalizeEmail(form.get("email"));
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmPassword") || "");

    if (password.length < 8) return message("Use at least 8 characters for your password.");
    if (password !== confirmation) return message("The passwords do not match.");
    if (users.some((user) => normalizeEmail(user.email) === email)) return message("An account already uses this email address.");

    const user = {
      id: crypto.randomUUID?.() || `user-${Date.now()}`,
      name: String(form.get("name") || "").trim(),
      email,
      password,
      role: form.get("role"),
      organization: String(form.get("organization") || "").trim(),
      contact: String(form.get("contact") || "").trim(),
      status: "active",
      settings: {}
    };
    users.push(user);
    localStorage.setItem(KEYS.users, JSON.stringify(users));
    sessionStorage.setItem(KEYS.pending, JSON.stringify({ email, role: user.role }));
    message("Account created. Opening the login page…", "success");
    setTimeout(() => { location.href = page("LOGIN/login.html"); }, 500);
  });

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    const pending = (() => {
      try { return JSON.parse(sessionStorage.getItem(KEYS.pending)); } catch { return null; }
    })();
    const remembered = read(KEYS.remembered);
    const saved = pending || remembered;
    if (saved) {
      loginForm.elements.email.value = saved.email || "";
      loginForm.elements.role.value = saved.role || "";
      if (loginForm.elements.remember) loginForm.elements.remember.checked = Boolean(remembered && !pending);
    }
    const requestedRole = new URLSearchParams(location.search).get("role");
    if (["faculty", "technician", "official"].includes(requestedRole)) {
      loginForm.elements.role.value = requestedRole;
    }
    sessionStorage.removeItem(KEYS.pending);

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(loginForm);
      const email = normalizeEmail(form.get("email"));
      const password = String(form.get("password") || "");
      const role = String(form.get("role") || "");
      const users = read(KEYS.users, []);
      const latest = read(KEYS.credentials);
      let user = users.find((item) => normalizeEmail(item.email) === email && item.password === password);

      if (!user && latest && normalizeEmail(latest.email) === email && latest.password === password) {
        user = users.find((item) => item.id === latest.accountId) || { ...latest, id: latest.accountId || `user-${Date.now()}` };
        if (!users.some((item) => item.id === user.id)) users.push(user);
      }

      if (!user) {
        recordAttempt(users.find((item) => normalizeEmail(item.email) === email), email, role, false);
        return message("The email or password is incorrect.");
      }
      if (user.role !== role) {
        loginForm.elements.role.value = user.role;
        return message(`This account is registered as ${user.role}. Select the correct role and try again.`);
      }
      if (user.status === "inactive") {
        recordAttempt(user, email, role, false);
        return message("This account is inactive. Contact the Faculty administrator.");
      }

      user.lastLogin = new Date().toISOString();
      user.status = user.status || "active";
      localStorage.setItem(KEYS.users, JSON.stringify(users));
      localStorage.setItem(KEYS.credentials, JSON.stringify({ accountId: user.id, name: user.name, email: user.email, password: user.password, role: user.role, settings: user.settings || {} }));
      sessionStorage.setItem(KEYS.session, JSON.stringify({ accountId: user.id, name: user.name, email: user.email, role: user.role, settings: user.settings || {} }));
      if (form.get("remember")) localStorage.setItem(KEYS.remembered, JSON.stringify({ email, role }));
      else localStorage.removeItem(KEYS.remembered);
      recordAttempt(user, email, role, true);
      message(`Welcome, ${user.name}. Opening your workspace…`, "success");

      const destinations = {
        faculty: "USERS/FACULTY/faculty-dashboard.html",
        technician: "USERS/TECHNICIAN/technician-dashboard.html",
        official: "USERS/BFAR-LGU/official-dashboard.html"
      };
      setTimeout(() => { location.href = page(destinations[user.role] || "LANDINGPAGES/Index.html"); }, 450);
    });
  }

})();
