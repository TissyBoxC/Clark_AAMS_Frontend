(() => {
  const headerOffset = 118;
  const guideSearch = document.querySelector(".guide-search");
  const guideSidebar = document.querySelector(".guide-sidebar");
  const guideLinks = Array.from(document.querySelectorAll(".guide-nav a"));
  const guideCollections = Array.from(document.querySelectorAll(".guide-nav-collection"));
  const guideSections = Array.from(document.querySelectorAll(".guide-article [id]"));
  let scrollTicking = false;

  function currentFileName() {
    return window.location.pathname.split("/").pop();
  }

  function linkFor(hash) {
    const currentFile = currentFileName();
    return guideLinks.find((link) => {
      const url = new URL(link.href, window.location.origin);
      return url.pathname.endsWith(`/${currentFile}`) && decodeURIComponent(url.hash) === hash;
    });
  }

  function collectionFor(hash, activeLink) {
    return guideCollections.find((collection) => {
      if (collection.dataset.guideHash === hash) {
        return true;
      }
      return Boolean(activeLink && collection.contains(activeLink));
    });
  }

  function pageLink() {
    const currentFile = currentFileName();
    return guideLinks.find((link) => {
      const url = new URL(link.href, window.location.origin);
      return url.pathname.endsWith(`/${currentFile}`) && !url.hash;
    });
  }

  function revealInSidebar(element) {
    if (!guideSidebar || !element) {
      return;
    }

    const sidebarRect = guideSidebar.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    if (elementRect.top < sidebarRect.top + 12) {
      guideSidebar.scrollTop -= sidebarRect.top + 12 - elementRect.top;
    } else if (elementRect.bottom > sidebarRect.bottom - 12) {
      guideSidebar.scrollTop += elementRect.bottom - sidebarRect.bottom + 12;
    }
  }

  function setCollectionOpen(collection, open) {
    if (!collection) {
      return;
    }

    collection.classList.toggle("open", open);
    const toggle = collection.querySelector(".guide-nav-collection-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
    }
  }

  function setActiveGuideLink(activeLink, activeCollection = null, reveal = false) {
    guideLinks.forEach((link) => link.classList.toggle("active", link === activeLink));
    guideCollections.forEach((collection) => {
      const containsActiveLink = Boolean(activeLink && collection.contains(activeLink));
      const isActiveCollection = collection === activeCollection;
      const shouldOpen = containsActiveLink || isActiveCollection || collection.classList.contains("user-open");
      setCollectionOpen(collection, shouldOpen);

      const toggle = collection.querySelector(".guide-nav-collection-toggle");
      if (toggle) {
        toggle.classList.toggle("active", containsActiveLink || isActiveCollection);
      }
    });

    if (reveal) {
      revealInSidebar(activeLink || activeCollection?.querySelector(".guide-nav-collection-toggle"));
    }
  }

  function updateActiveGuideLink(reveal = true) {
    const hash = decodeURIComponent(window.location.hash);
    const activeLink = linkFor(hash) || pageLink();
    setActiveGuideLink(activeLink, collectionFor(hash, activeLink), reveal);
  }

  function updateActiveGuideLinkByScroll() {
    if (!guideSections.length) {
      setActiveGuideLink(pageLink());
      return;
    }

    let currentSection = null;
    for (const section of guideSections) {
      if (section.getBoundingClientRect().top <= 132) {
        currentSection = section;
      }
    }

    if (!currentSection) {
      setActiveGuideLink(pageLink());
      return;
    }

    const hash = `#${currentSection.id}`;
    const activeLink = linkFor(hash);
    setActiveGuideLink(activeLink, collectionFor(hash, activeLink));
  }

  function flashTarget(target) {
    if (!target) {
      return;
    }

    target.classList.remove("guide-section-spotlight");
    void target.offsetWidth;
    target.classList.add("guide-section-spotlight");
    window.setTimeout(() => {
      target.classList.remove("guide-section-spotlight");
    }, 900);
  }

  function scrollToTarget(target) {
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: "smooth"
    });
  }

  function targetForUrl(url) {
    if (!url.hash) {
      return null;
    }
    return document.getElementById(decodeURIComponent(url.hash.slice(1)));
  }

  guideCollections.forEach((collection) => {
    const toggle = collection.querySelector(".guide-nav-collection-toggle");
    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", () => {
      const shouldOpen = !collection.classList.contains("open");
      collection.classList.toggle("user-open", shouldOpen);
      setCollectionOpen(collection, shouldOpen);
    });
  });

  guideLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const url = new URL(link.href, window.location.origin);
      if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
        return;
      }

      if (!url.hash) {
        event.preventDefault();
        history.pushState(null, "", url.pathname);
        window.scrollTo({top: 0, behavior: "smooth"});
        updateActiveGuideLink(true);
        return;
      }

      const target = targetForUrl(url);
      if (!target) {
        return;
      }

      event.preventDefault();
      history.pushState(null, "", url.hash);
      updateActiveGuideLink(true);
      flashTarget(target);
      scrollToTarget(target);
    });
  });

  guideSearch?.addEventListener("input", () => {
    const keyword = guideSearch.value.trim().toLowerCase();
    guideLinks.forEach((link) => {
      link.hidden = keyword !== "" && !link.textContent.trim().toLowerCase().includes(keyword);
    });

    guideCollections.forEach((collection) => {
      const text = collection.textContent.trim().toLowerCase();
      const matched = keyword === "" || text.includes(keyword);
      collection.hidden = !matched;
      if (keyword !== "" && matched) {
        setCollectionOpen(collection, true);
        collection.querySelectorAll("a").forEach((link) => {
          link.hidden = false;
        });
      }
    });
  });

  window.addEventListener("hashchange", () => {
    updateActiveGuideLink(true);
    flashTarget(targetForUrl(new URL(window.location.href)));
  });

  window.addEventListener("scroll", () => {
    if (scrollTicking) {
      return;
    }
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      updateActiveGuideLinkByScroll();
      scrollTicking = false;
    });
  }, {passive: true});

  updateActiveGuideLink(window.location.hash !== "");
})();
