(() => {
  "use strict";

  window.ReefTrackAuth = {
    clearHostedSession() {
      Object.keys(localStorage)
        .filter((key) => /^firebase:authUser:/.test(key) || /^sb-.*-auth-token$/.test(key))
        .forEach((key) => localStorage.removeItem(key));
    }
  };

  const sidebar = document.querySelector("#sidebar");
  const content = document.querySelector(".content") ||
    document.querySelector(".shell > main") ||
    document.querySelector("main.shell");
  if (!sidebar || !content) return;

  const role = document.body.dataset.role ||
    (document.body.classList.contains("role-faculty") ? "faculty" :
      document.body.classList.contains("role-technician") ? "technician" : "official");

  const roleLabels = {
    faculty: "Research workspace",
    technician: "Production workspace",
    official: "Regulatory workspace"
  };

  const context = document.createElement("nav");
  context.className = "workspace-context";
  context.setAttribute("aria-label", "Current workspace");
  context.innerHTML = `
    <div><span>${roleLabels[role]}</span><span aria-hidden="true">/</span><strong aria-current="page">Dashboard</strong></div>
    <time datetime="${new Date().toISOString()}">${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date())}</time>`;
  content.prepend(context);

  const currentLabel = context.querySelector("strong");
  const menuButton = document.querySelector("#menu-toggle, #menu");

  function activeButton() {
    return sidebar.querySelector("[data-view].active");
  }

  function syncNavigation() {
    const active = activeButton();
    currentLabel.textContent = active?.querySelector(".rt-nav-label")?.textContent.trim() ||
      active?.textContent.trim() || "Dashboard";
    sidebar.querySelectorAll("[data-view]").forEach((button) => {
      if (button === active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    document.querySelectorAll(".sidebar-backdrop, .backdrop").forEach((element) => element.remove());
    menuButton?.setAttribute("aria-expanded", "false");
  }

  function syncSidebarState() {
    const open = sidebar.classList.contains("open") && window.matchMedia("(max-width: 900px)").matches;
    document.body.classList.toggle("sidebar-open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
  }

  const workspaceBrand = sidebar.querySelector(".workspace-brand");
  workspaceBrand?.addEventListener("click", (event) => {
    event.preventDefault();
    sidebar.querySelector('[data-view="dashboard"]')?.click();
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  menuButton?.setAttribute("aria-controls", "sidebar");
  menuButton?.setAttribute("aria-expanded", "false");
  new MutationObserver(syncSidebarState).observe(sidebar, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeSidebar();
    syncSidebarState();
  });
  window.addEventListener("orientationchange", () => window.setTimeout(() => window.dispatchEvent(new Event("resize")), 160));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !sidebar.classList.contains("open")) return;
    closeSidebar();
    menuButton?.focus();
  });

  sidebar.querySelectorAll("[data-view]").forEach((button) => {
    new MutationObserver(syncNavigation).observe(button, { attributes: true, attributeFilter: ["class"] });
    button.addEventListener("click", () => setTimeout(syncNavigation));
  });

  syncNavigation();
  syncSidebarState();
})();
