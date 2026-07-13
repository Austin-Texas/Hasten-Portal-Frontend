/* ============================================================
   HASTEN UI PERSISTENCE SYSTEM
   Manages theme/density/glass/font/layout classes on <body> and
   <html> via localStorage. Exposes window.HASTEN_UI for controls.
   ============================================================ */

const STORAGE_KEY = "hasten-ui-settings";

const defaults = {
  theme: "theme-dark",
  density: "h-density-compact",
  glass: "glass-low",
  font: "font-default",
  layout: "layout-enterprise"
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaults, ...saved } : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore browser storage quota/privacy errors.
  }
}

function resolveTheme(theme) {
  if (theme !== "theme-system") return theme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "theme-dark"
    : "theme-light";
}

function applySettings(settings) {
  const body = document.body;
  const root = document.documentElement;
  if (!body || !root) return;

  const resolvedTheme = resolveTheme(settings.theme);

  body.classList.remove(
    "theme-dark", "theme-light", "theme-high-contrast", "theme-system",
    "h-density-comfortable", "h-density-compact", "h-density-ultra",
    "glass-low", "glass-medium", "glass-high",
    "font-small", "font-default", "font-large",
    "layout-enterprise", "layout-premium"
  );

  root.classList.remove(
    "dark", "light", "high-contrast",
    "density-comfortable", "density-compact", "density-ultra-compact",
    "font-size-small", "font-size-default", "font-size-large"
  );

  body.classList.add(
    resolvedTheme,
    settings.density,
    settings.glass,
    settings.font,
    settings.layout
  );

  if (resolvedTheme === "theme-light") root.classList.add("light");
  else if (resolvedTheme === "theme-high-contrast") root.classList.add("high-contrast");
  else root.classList.add("dark");

  const densityMap = {
    "h-density-comfortable": "density-comfortable",
    "h-density-compact": "density-compact",
    "h-density-ultra": "density-ultra-compact"
  };
  const fontMap = {
    "font-small": "font-size-small",
    "font-default": "font-size-default",
    "font-large": "font-size-large"
  };

  if (densityMap[settings.density]) root.classList.add(densityMap[settings.density]);
  if (fontMap[settings.font]) root.classList.add(fontMap[settings.font]);
}

let settings = loadSettings();

function applyWhenReady() {
  if (document.body) applySettings(settings);
  else document.addEventListener("DOMContentLoaded", () => applySettings(settings), { once: true });
}

applyWhenReady();

const HASTEN_UI = {
  getSettings() {
    return { ...settings };
  },
  setTheme(theme) {
    settings.theme = theme;
    saveSettings(settings);
    applySettings(settings);
  },
  setDensity(density) {
    settings.density = density;
    saveSettings(settings);
    applySettings(settings);
  },
  setGlass(level) {
    settings.glass = level;
    saveSettings(settings);
    applySettings(settings);
  },
  setFont(size) {
    settings.font = size;
    saveSettings(settings);
    applySettings(settings);
  },
  setLayout(layout) {
    settings.layout = layout;
    saveSettings(settings);
    applySettings(settings);
  },
  applyRoleDefaults(role) {
    if (!role) return;
    const normalizedRole = role.toLowerCase();
    if (["admin", "dispatcher", "superadmin", "super_admin"].includes(normalizedRole)) {
      settings.density = "h-density-compact";
      settings.layout = "layout-enterprise";
    }
    if (["driver", "customer", "client"].includes(normalizedRole)) {
      settings.density = "h-density-comfortable";
      settings.layout = "layout-premium";
    }
    saveSettings(settings);
    applySettings(settings);
  }
};

if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (settings.theme === "theme-system") applySettings(settings);
  });
}

window.HASTEN_UI = HASTEN_UI;

export { HASTEN_UI };
