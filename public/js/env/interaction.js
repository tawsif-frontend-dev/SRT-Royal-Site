// public/js/env/interaction.js
// Mouse tracking with inertia, continuous scroll progress,
// and section mood transition controller

export function createInteractionController(deviceProfile, SECTION_MOODS, onMoodChange) {
  const mouseTarget = { x: 0, y: 0 };
  const mouseCurrent = { x: 0, y: 0 };

  let scrollProgress = 0;
  let activeSectionId = 'home';

  // Desktop mouse tracking with touch exclusion
  function onMouseMove(e) {
    if (deviceProfile.isMobile || deviceProfile.prefersReducedMotion) return;
    mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onMouseLeave() {
    mouseTarget.x = 0;
    mouseTarget.y = 0;
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave, { passive: true });

  // Scroll tracking and section observer
  const sectionIds = ['home', 'about', 'skills', 'portfolio', 'services', 'why-us', 'testimonials', 'contact'];

  function updateScroll() {
    const doc = document.documentElement;
    const scrollMax = doc.scrollHeight - doc.clientHeight;
    scrollProgress = scrollMax > 0 ? window.scrollY / scrollMax : 0;

    // Check if at footer
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 60) {
      if (activeSectionId !== 'footer') {
        activeSectionId = 'footer';
        if (SECTION_MOODS.footer && onMoodChange) onMoodChange(SECTION_MOODS.footer, 'footer');
      }
      return;
    }

    // Determine current active section
    let found = 'home';
    for (let i = sectionIds.length - 1; i >= 0; i--) {
      const id = sectionIds[i];
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Section is considered active when its top is within upper half of viewport
        if (rect.top <= window.innerHeight * 0.55) {
          found = id;
          break;
        }
      }
    }

    if (found !== activeSectionId) {
      activeSectionId = found;
      if (SECTION_MOODS[found] && onMoodChange) {
        onMoodChange(SECTION_MOODS[found], found);
      }
    }
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  // Initial scroll calculation
  updateScroll();

  function update() {
    // Easing inertia for mouse tracking
    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.04;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.04;
  }

  function dispose() {
    window.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('scroll', updateScroll);
  }

  return {
    mouseCurrent,
    mouseTarget,
    getScrollProgress: () => scrollProgress,
    getActiveSection: () => activeSectionId,
    update,
    dispose,
  };
}
