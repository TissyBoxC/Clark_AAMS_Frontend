(() => {
  const pageTransitionKey = "clarkAamsPageTransition";

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function canTransitionLink(link) {
    if (!link || link.target && link.target !== "_self") {
      return false;
    }
    if (link.hasAttribute("download") || link.dataset.noTransition !== undefined) {
      return false;
    }

    const rawHref = link.getAttribute("href") || "";
    if (!rawHref || rawHref.startsWith("#")) {
      return false;
    }
    if (rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      return false;
    }

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return false;
    }
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return false;
    }
    return true;
  }

  function markPageEntering() {
    const body = document.body;
    if (!body) {
      return;
    }

    body.classList.add("page-motion-ready");
    if (prefersReducedMotion()) {
      sessionStorage.removeItem(pageTransitionKey);
      return;
    }

    if (sessionStorage.getItem(pageTransitionKey) !== "1") {
      return;
    }

    sessionStorage.removeItem(pageTransitionKey);
    body.classList.add("page-entering");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        body.classList.remove("page-entering");
      });
    });
  }

  function leaveFor(url) {
    const body = document.body;
    if (!body || prefersReducedMotion()) {
      window.location.assign(url);
      return;
    }

    sessionStorage.setItem(pageTransitionKey, "1");
    body.classList.add("page-motion-ready", "page-leaving");
    window.setTimeout(() => {
      window.location.assign(url);
    }, 190);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markPageEntering, {once: true});
  } else {
    markPageEntering();
  }

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!canTransitionLink(link)) {
      return;
    }

    event.preventDefault();
    leaveFor(link.href);
  });

  window.addEventListener("pageshow", () => {
    document.body?.classList.remove("page-leaving");
  });
})();
