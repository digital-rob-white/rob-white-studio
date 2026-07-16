const header = document.querySelector("[data-site-header]");
const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const journalButtons = document.querySelectorAll("[data-journal-filter]");
const journalEntries = document.querySelectorAll("[data-visibility]");
const previewInput = document.querySelector("[data-image-preview]");
const previewFrame = document.querySelector("[data-preview-frame]");
const artworkImages = document.querySelectorAll(".work-image img");

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

artworkImages.forEach((image) => {
  const frame = image.closest(".work-image");
  if (!frame) return;

  image.addEventListener("load", () => {
    frame.classList.add("is-loaded");
    frame.classList.remove("is-missing");
  });

  image.addEventListener("error", () => {
    frame.classList.add("is-missing");
    frame.classList.remove("is-loaded");
  });

  if (image.complete) {
    frame.classList.toggle("is-loaded", image.naturalWidth > 0);
    frame.classList.toggle("is-missing", image.naturalWidth === 0);
  }
});

journalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.journalFilter || "all";

    journalButtons.forEach((item) => item.classList.toggle("is-active", item === button));

    journalEntries.forEach((entry) => {
      const shouldShow = filter === "all" || entry.dataset.visibility === filter;
      entry.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

if (previewInput && previewFrame) {
  previewInput.addEventListener("change", () => {
    const file = previewInput.files && previewInput.files[0];
    if (!file) return;

    const image = document.createElement("img");
    image.alt = `Preview of ${file.name}`;
    image.src = URL.createObjectURL(file);
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });

    previewFrame.replaceChildren(image);
  });
}
