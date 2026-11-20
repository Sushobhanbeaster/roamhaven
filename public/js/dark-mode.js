// Dark Mode Theme Controller
const THEME_KEY = "roamhaven_theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);

  const themeIcon = document.getElementById("themeIcon");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  if (themeIcon) {
    if (theme === "dark") {
      themeIcon.className = "fa-solid fa-sun text-warning";
      if (themeToggleBtn) {
        themeToggleBtn.setAttribute("title", "Switch to Light Mode");
      }
    } else {
      themeIcon.className = "fa-solid fa-moon text-secondary";
      if (themeToggleBtn) {
        themeToggleBtn.setAttribute("title", "Switch to Dark Mode");
      }
    }
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || 
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);
});
