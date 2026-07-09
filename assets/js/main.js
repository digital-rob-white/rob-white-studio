const header = document.querySelector("[data-site-header]");
const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");

if (header && toggle) {
  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (!header || !toggle) return;
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  });
});
