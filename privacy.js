
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const policySections = $('#policySections');
  const searchInput = $('#policySearch');
  const progressBar = $('#readingProgress');
  const progressText = $('#progressText');
  const backToTop = $('#backToTop');
  const tocLinks = $$('.toc-link');
  const policyCards = $$('.policy-card');

  const setExpanded = (button, expanded) => {
    button.setAttribute('aria-expanded', String(expanded));

    const card = button.closest('.policy-card');
    if (!card) return;

    card.classList.toggle('is-open', expanded);

    const content = card.querySelector('.policy-content, .accordion-content');
    if (content) {
      content.hidden = !expanded;
      content.style.display = expanded ? '' : 'none';
    }

    const icon = button.querySelector('.toggle-icon, .accordion-icon, i');
    if (icon) {
      icon.classList.toggle('fa-plus', !expanded);
      icon.classList.toggle('fa-minus', expanded);
      icon.classList.toggle('fa-chevron-down', !expanded);
      icon.classList.toggle('fa-chevron-up', expanded);
      icon.setAttribute('aria-hidden', 'true');
    }
  };

  const getToggleButton = (card) =>
    card.querySelector(
      '.policy-toggle, .accordion-trigger, .policy-heading button, button[aria-controls]'
    );

  const getContent = (card) =>
    card.querySelector('.policy-content, .accordion-content');

  policyCards.forEach((card, index) => {
    const button = getToggleButton(card);
    const content = getContent(card);

    if (!button || !content) return;

    if (!content.id) {
      content.id = `zune-policy-content-${index + 1}`;
    }

    button.setAttribute('aria-controls', content.id);
    button.setAttribute('type', 'button');

    const expanded =
      button.getAttribute('aria-expanded') === 'true' ||
      card.classList.contains('is-open');

    setExpanded(button, expanded);

    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      setExpanded(button, !isExpanded);
    });

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });
  });

  const openCard = (card) => {
    const button = getToggleButton(card);
    if (button) setExpanded(button, true);
  };

  const closeCard = (card) => {
    const button = getToggleButton(card);
    if (button) setExpanded(button, false);
  };

  const setAllCards = (expanded) => {
    policyCards.forEach((card) => {
      if (card.hidden) return;
      expanded ? openCard(card) : closeCard(card);
    });
  };

  const addGlobalToggleButtons = () => {
    const container = $('.policy-actions, .policy-toolbar, .policy-intro-actions');
    if (!container || container.querySelector('[data-policy-action]')) return;

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'policy-action-btn';
    openButton.dataset.policyAction = 'open';
    openButton.textContent = 'Fungua sehemu zote';
    openButton.addEventListener('click', () => setAllCards(true));

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'policy-action-btn';
    closeButton.dataset.policyAction = 'close';
    closeButton.textContent = 'Funga sehemu zote';
    closeButton.addEventListener('click', () => setAllCards(false));

    container.append(openButton, closeButton);
  };

  addGlobalToggleButtons();

  if (policySections) {
    policySections.setAttribute('aria-label', 'Sera ya Faragha ya ZUNE');
  }

  window.ZunePrivacy = {
    openAll: () => setAllCards(true),
    closeAll: () => setAllCards(false),
    openSection: (id) => {
      const card = document.getElementById(id);
      if (card && card.classList.contains('policy-card')) {
        openCard(card);
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
})();
(() => {
  'use strict';

  const searchInput = document.querySelector('#policySearch');
  const policyCards = Array.from(document.querySelectorAll('.policy-card'));
  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  const noResults = document.querySelector('#noSearchResults');

  const normalizeText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const updateSearch = () => {
    if (!searchInput) return;

    const query = normalizeText(searchInput.value);
    let visibleCount = 0;

    policyCards.forEach((card) => {
      const searchableText = normalizeText(
        `${card.textContent || ''} ${card.dataset.search || ''} ${card.id || ''}`
      );

      const matches = !query || searchableText.includes(query);

      card.hidden = !matches;
      card.style.display = matches ? '' : 'none';

      if (matches) {
        visibleCount += 1;
      } else {
        const button = card.querySelector(
          '.policy-toggle, .accordion-trigger, .policy-heading button, button[aria-controls]'
        );

        if (button && button.getAttribute('aria-expanded') === 'true') {
          button.setAttribute('aria-expanded', 'false');

          const contentId = button.getAttribute('aria-controls');
          const content = contentId
            ? document.getElementById(contentId)
            : card.querySelector('.policy-content, .accordion-content');

          if (content) {
            content.hidden = true;
            content.style.display = 'none';
          }

          card.classList.remove('is-open');
        }
      }
    });

    tocLinks.forEach((link) => {
      const href = link.getAttribute('href');

      if (!href || !href.startsWith('#')) return;

      const target = document.getElementById(href.slice(1));

      if (!target) return;

      const matches = !query || !target.hidden;

      link.hidden = !matches;
      link.style.display = matches ? '' : 'none';
    });

    if (noResults) {
      noResults.hidden = visibleCount !== 0;
      noResults.style.display = visibleCount === 0 ? '' : 'none';
    }

    const resultCount = document.querySelector('#searchResultCount');

    if (resultCount) {
      resultCount.textContent = query
        ? `${visibleCount} sehemu zimepatikana`
        : '';
    }

    document.dispatchEvent(
      new CustomEvent('zune:privacy-search', {
        detail: {
          query,
          visibleCount,
          totalCount: policyCards.length
        }
      })
    );
  };

  if (searchInput) {
    searchInput.setAttribute('type', 'search');
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.setAttribute(
      'aria-label',
      'Tafuta ndani ya Sera ya Faragha'
    );

    searchInput.addEventListener('input', updateSearch);

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchInput.value = '';
        updateSearch();
        searchInput.blur();
      }

      if (event.key === 'Enter') {
        const firstVisibleCard = policyCards.find(
          (card) => !card.hidden
        );

        if (firstVisibleCard) {
          const button = firstVisibleCard.querySelector(
            '.policy-toggle, .accordion-trigger, .policy-heading button, button[aria-controls]'
          );

          if (button) {
            button.focus();
          }
        }
      }
    });
  }

  const clearSearchButton = document.querySelector('#clearPolicySearch');

  if (clearSearchButton) {
    clearSearchButton.addEventListener('click', () => {
      if (!searchInput) return;

      searchInput.value = '';
      updateSearch();
      searchInput.focus();
    });
  }

  window.ZunePrivacySearch = {
    search: (query) => {
      if (!searchInput) return;
      searchInput.value = String(query || '');
      updateSearch();
    },
    clear: () => {
      if (!searchInput) return;
      searchInput.value = '';
      updateSearch();
    }
  };
})();

/* ZUNE PRIVACY JS */

(() => {
  'use strict';

  const progressBar = document.querySelector(
    '#readingProgress, #progressBar, .reading-progress-bar'
  );

  const progressText = document.querySelector(
    '#progressText, #readingProgressText, .progress-percentage'
  );

  const backToTop = document.querySelector('#backToTop');

  const updateReadingProgress = () => {
    const documentElement = document.documentElement;

    const scrollTop =
      window.scrollY ||
      documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const scrollHeight =
      documentElement.scrollHeight - window.innerHeight;

    const progress =
      scrollHeight > 0
        ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100))
        : 0;

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');
      progressBar.setAttribute(
        'aria-valuenow',
        String(Math.round(progress))
      );
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }

    if (backToTop) {
      const visible = scrollTop > 350;

      backToTop.classList.toggle('is-visible', visible);
      backToTop.classList.toggle('show', visible);
      backToTop.setAttribute('aria-hidden', String(!visible));

      if ('disabled' in backToTop) {
        backToTop.disabled = false;
      }
    }
  };

  if (backToTop) {
    backToTop.addEventListener('click', (event) => {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  let scrollScheduled = false;

  const handleScroll = () => {
    if (scrollScheduled) return;

    scrollScheduled = true;

    window.requestAnimationFrame(() => {
      updateReadingProgress();
      scrollScheduled = false;
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', updateReadingProgress);

  updateReadingProgress();

  window.ZunePrivacyProgress = {
    update: updateReadingProgress,
    scrollToTop: () =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
  };
})();

(() => {
  'use strict';

  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  const sections = Array.from(
    document.querySelectorAll('.policy-card[id]')
  );

  const footerYear = document.querySelector(
    '#currentYear, #footerYear, [data-current-year]'
  );

  const effectiveDate = document.querySelector(
    '#effectiveDate, [data-effective-date]'
  );

  const navToggle = document.querySelector(
    '#mobileMenuToggle, #tocToggle'
  );

  const tocSidebar = document.querySelector(
    '#policySidebar, .policy-sidebar'
  );

  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }

  if (effectiveDate && !effectiveDate.textContent.trim()) {
    effectiveDate.textContent = 'Tarehe ya kuanza: itawekwa';
  }

  const setActiveLink = (sectionId) => {
    tocLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const active = href === `#${sectionId}`;

      link.classList.toggle('active', active);

      if (active) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  tocLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');

      if (!href || !href.startsWith('#')) return;

      const target = document.getElementById(href.slice(1));

      if (!target) return;

      event.preventDefault();

      target.hidden = false;
      target.style.display = '';

      const headingButton = target.querySelector(
        '.policy-toggle, .accordion-trigger, .policy-heading button, button[aria-controls]'
      );

      if (headingButton) {
        headingButton.setAttribute('aria-expanded', 'true');

        const contentId = headingButton.getAttribute('aria-controls');
        const content = contentId
          ? document.getElementById(contentId)
          : target.querySelector('.policy-content, .accordion-content');

        if (content) {
          content.hidden = false;
          content.style.display = '';
        }

        target.classList.add('is-open');
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      if (history.replaceState) {
        history.replaceState(null, '', href);
      }

      setActiveLink(target.id);

      if (tocSidebar) {
        tocSidebar.classList.remove('is-open');
        tocSidebar.classList.remove('mobile-open');
      }
    });
  });

  if (navToggle && tocSidebar) {
    navToggle.setAttribute('type', 'button');
    navToggle.setAttribute('aria-expanded', 'false');

    navToggle.addEventListener('click', () => {
      const isOpen = tocSidebar.classList.toggle('is-open');

      tocSidebar.classList.toggle('mobile-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          );

        if (visibleEntries.length) {
          setActiveLink(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: '-15% 0px -70% 0px',
        threshold: 0
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (tocSidebar) {
      tocSidebar.classList.remove('is-open');
      tocSidebar.classList.remove('mobile-open');
    }

    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const yearElements = document.querySelectorAll(
      '#currentYear, #footerYear, [data-current-year]'
    );

    yearElements.forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  });

  window.ZunePrivacyNavigation = {
    setActive: setActiveLink,
    goToSection: (id) => {
      const target = document.getElementById(id);
      if (!target) return;

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      setActiveLink(id);
    }
  };
})();

