/* ─────────────────────────────────────────────
   SRT ROYAL — CINEMATIC SCROLL STORYTELLING
   GSAP + ScrollTrigger layer, loaded after app.js.

   What this does:
   1) Every <section class="section"> fades/drifts in as a
      "scene" — smoothly SCRUBBED to scroll position, so it
      feels like a continuous video layer rather than a jump-cut.
   2) Inside each section, any grid container (matched generically
      by class name containing "-grid" — .skills-grid,
      .portfolio-grid, .services-grid, .why-grid,
      .testimonials-grid, and any future ones you add) gets its
      direct-child cards staggered in with a drift-up + scale-in,
      power3.out easing.
   3) Everything reverses cleanly if the user scrolls back up,
      and replays if they scroll back down — no permanent
      "already seen" state, no flicker.
   4) Optional per-section pin: add data-pin="true" in the HTML
      to a <section> to pin it full-viewport while its scene
      plays (see style.css for the accompanying rule). Off by
      default — pinning every section makes a content-heavy
      business site feel slow, not premium.

   Safe by design:
   - If GSAP/ScrollTrigger fail to load (CDN down), this file
     exits immediately and the site falls back to the existing
     CSS-transition reveal system in app.js — content is never
     left permanently hidden.
   - Respects prefers-reduced-motion.
   - Only "promotes" grid-card elements away from the legacy
     .reveal system (adds .gsap-managed, strips .reveal*)
     so section headers, the review form, the profile card, etc.
     keep working exactly as they already do — this file only
     takes over what it explicitly animates.
───────────────────────────────────────────── */
(function () {
  "use strict";

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("[scrollCinema] GSAP/ScrollTrigger didn't load — skipping cinematic layer, falling back to standard reveal.");
    return;
  }

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    console.info("[scrollCinema] Reduced motion requested — cinematic scroll layer disabled.");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var EASE = "power3.out";
  var sections = gsap.utils.toArray(".section");

  sections.forEach(function (section) {
    /* ── SCENE ENTRANCE ─────────────────────────────
       Whole section drifts up + fades in, tied directly
       to scroll position (scrub) for that "video layer" feel. */
    gsap.set(section, { opacity: 0, y: 70 });

    var sceneTween = gsap.to(section, {
      opacity: 1,
      y: 0,
      ease: "none", // scrub drives the easing itself
      scrollTrigger: {
        trigger: section,
        start: "top 85%",
        end: "top 45%",
        scrub: 1, // 1s of "catch-up" smoothing — feels fluid, not laggy
        onToggle: function (self) {
          section.classList.toggle("cine-animating", self.isActive);
        },
      },
    });

    /* ── OPTIONAL PIN ────────────────────────────────
       Opt-in per section via data-pin="true" in the HTML. */
    if (section.dataset.pin === "true") {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=60%",
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
      });
    }

    /* ── GRID CARD STAGGER ───────────────────────────
       Generic match: any element whose class contains "-grid"
       (.skills-grid, .portfolio-grid, .services-grid, .why-grid,
       .testimonials-grid, ...future ones) — no hardcoded card
       class names, so new grids you add later work automatically. */
    var grids = section.querySelectorAll('[class*="-grid"]');

    grids.forEach(function (grid) {
      var cards = Array.prototype.slice.call(grid.children);
      if (!cards.length) return;

      // Hand these specific elements off from the legacy
      // CSS-transition reveal system to GSAP, so only one
      // engine ever animates their opacity/transform.
      cards.forEach(function (card) {
        card.classList.remove("reveal", "reveal-left", "reveal-right");
        card.classList.add("gsap-managed");
      });

      gsap.set(cards, { opacity: 0, y: 55, scale: 0.94 });

      gsap.to(cards, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: EASE,
        stagger: 0.15,
        scrollTrigger: {
          trigger: grid,
          start: "top 88%",
          // Standard "reveal on the way down, un-reveal only if
          // you scroll back above the trigger" pattern — cards
          // don't re-hide just because you kept scrolling down.
          toggleActions: "play none none reverse",
        },
      });
    });
  });

  // Recalculate trigger positions once everything (fonts, images,
  // the royalEnv canvas) has actually finished loading, so start/end
  // points aren't measured against a layout that's still shifting.
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
})();
