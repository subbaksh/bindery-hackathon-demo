const slides = [...document.querySelectorAll(".slide")];
const previousButton = document.querySelector("#previous-slide");
const nextButton = document.querySelector("#next-slide");
const dotsContainer = document.querySelector("#slide-dots");
const currentSlideLabel = document.querySelector("#current-slide");
const totalSlidesLabel = document.querySelector("#total-slides");
const videos = [...document.querySelectorAll(".slide-video")];

let activeIndex = 0;
let touchStartX = 0;
let touchStartY = 0;

const clampIndex = (index) => Math.max(0, Math.min(slides.length - 1, index));
const slideHash = (index) => `#slide-${index + 1}`;

const dots = slides.map((slide, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "slide-dot";
  dot.setAttribute("aria-label", `Go to slide ${index + 1}: ${slide.getAttribute("aria-labelledby") ?? ""}`);
  dot.addEventListener("click", () => showSlide(index));
  dotsContainer.append(dot);
  return dot;
});

function showSlide(nextIndex, { updateHash = true } = {}) {
  const resolvedIndex = clampIndex(nextIndex);

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === resolvedIndex);
    slide.classList.toggle("is-before", index < resolvedIndex);
    slide.setAttribute("aria-hidden", index === resolvedIndex ? "false" : "true");
  });

  videos.forEach((video) => {
    if (!video.closest(".slide")?.classList.contains("is-active")) video.pause();
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === resolvedIndex);
    dot.setAttribute("aria-current", index === resolvedIndex ? "true" : "false");
  });

  activeIndex = resolvedIndex;
  currentSlideLabel.textContent = String(activeIndex + 1).padStart(2, "0");
  previousButton.disabled = activeIndex === 0;
  nextButton.disabled = activeIndex === slides.length - 1;
  document.body.dataset.currentSlide = String(activeIndex + 1);

  if (updateHash && window.location.hash !== slideHash(activeIndex)) {
    window.history.replaceState(null, "", slideHash(activeIndex));
  }
}

function indexFromHash() {
  const match = window.location.hash.match(/^#slide-(\d+)$/);
  return match ? clampIndex(Number(match[1]) - 1) : 0;
}

previousButton.addEventListener("click", () => showSlide(activeIndex - 1));
nextButton.addEventListener("click", () => showSlide(activeIndex + 1));

window.addEventListener("hashchange", () => showSlide(indexFromHash(), { updateHash: false }));

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const activeVideo = slides[activeIndex]?.querySelector(".slide-video");

  if (activeVideo && (event.key === " " || event.key.toLowerCase() === "p")) {
    event.preventDefault();
    if (activeVideo.paused) activeVideo.play().catch(() => undefined);
    else activeVideo.pause();
    return;
  }

  if (activeVideo && event.key.toLowerCase() === "r") {
    event.preventDefault();
    activeVideo.currentTime = 0;
    activeVideo.play().catch(() => undefined);
    return;
  }

  if (target instanceof HTMLVideoElement) return;

  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    showSlide(activeIndex + 1);
  }

  if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    showSlide(activeIndex - 1);
  }

  if (event.key === "Home") {
    event.preventDefault();
    showSlide(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    showSlide(slides.length - 1);
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
});

window.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

window.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY)) return;
  showSlide(activeIndex + (deltaX < 0 ? 1 : -1));
}, { passive: true });

totalSlidesLabel.textContent = String(slides.length).padStart(2, "0");
showSlide(indexFromHash(), { updateHash: false });
