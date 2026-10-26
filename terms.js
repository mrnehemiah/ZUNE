
'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const cards = $$('.term-card');
  const tocLinks = $$('.toc-link');
  const searchInput = $('#termsSearch');
  const noResults = $('#noTermsResults');
  const resultCount = $('#termsResultCount');
  const expandAllButton = $('#expandAllTerms');
  const collapseAllButton = $('#collapseAllTerms');

  const getButton = (card) =>
    $('.term-toggle', card);

  const getContent = (card) =>
    $('.term-content', card);

  const setCardState = (card, expanded) => {
    const button = getButton(card);
    const content = getContent(card);

    if (!button || !content) return;

    button.setAttribute('aria-expanded', String(expanded));
    content.hidden = !expanded;
    card.classList.toggle('is-open', expanded);

    const icon = $('.term-chevron', button);

    if (icon) {
      icon.classList.toggle('fa-chevron-up', expanded);
      icon.classList.toggle('fa-chevron-down', !expanded);
    }
  };

  cards.forEach((card, index) => {
    const button = getButton(card);
    const content = getContent(card);

    if (!button || !content) return;

    if (!content.id) {
      content.id = `term-content-${index + 1}`;
    }

    button.type = 'button';
    button.setAttribute('aria-controls', content.id);

    setCardState(
      card,
      button.getAttribute('aria-expanded') === 'true'
    );

    button.addEventListener('click', () => {
      const expanded =
        button.getAttribute('aria-expanded') === 'true';

      setCardState(card, !expanded);
    });
  });

  const setAllCards = (expanded) => {
    cards.forEach((card) => {
      if (!card.hidden) setCardState(card, expanded);
    });
  };

  if (expandAllButton) {
    expandAllButton.addEventListener('click', () => {
      setAllCards(true);
    });
  }

  if (collapseAllButton) {
    collapseAllButton.addEventListener('click', () => {
      setAllCards(false);
    });
  }

  window.ZuneTerms = {
    openAll: () => setAllCards(true),
    closeAll: () => setAllCards(false),
    openSection: (id) => {
      const card = document.getElementById(id);

      if (!card || !card.classList.contains('term-card')) return;

      card.hidden = false;
      card.style.display = '';
      setCardState(card, true);

      card.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
})();

/* ZUNE TERMS JS — SEARCH */

(() => {
  const searchInput = document.querySelector('#termsSearch');
  const cards = Array.from(document.querySelectorAll('.term-card'));
  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  const noResults = document.querySelector('#noTermsResults');
  const resultCount = document.querySelector('#termsResultCount');

  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filterTerms = () => {
    if (!searchInput) return;

    const query = normalize(searchInput.value);
    let visibleCount = 0;

    cards.forEach((card) => {
      const searchable = normalize(
        `${card.textContent || ''} ${card.dataset.search || ''} ${card.id || ''}`
      );

      const matches = !query || searchable.includes(query);

      card.hidden = !matches;
      card.style.display = matches ? '' : 'none';

      if (matches) {
        visibleCount++;
      } else {
        const button = card.querySelector('.term-toggle');
        const content = card.querySelector('.term-content');

        if (button && content) {
          button.setAttribute('aria-expanded', 'false');
          content.hidden = true;
          card.classList.remove('is-open');

          const icon = button.querySelector('.term-chevron');

          if (icon) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
          }
        }
      }
    });

    tocLinks.forEach((link) => {
      const href = link.getAttribute('href');

      if (!href || !href.startsWith('#')) return;

      const target = document.getElementById(href.slice(1));

      if (!target) return;

      const visible = !query || !target.hidden;

      link.hidden = !visible;
      link.style.display = visible ? '' : 'none';
    });

    if (noResults) {
      noResults.hidden = visibleCount !== 0;
      noResults.style.display = visibleCount === 0 ? '' : 'none';
    }

    if (resultCount) {
      resultCount.textContent = query
        ? `Sehemu ${visibleCount} zimepatikana`
        : `Sehemu ${cards.length} za masharti`;
    }

    document.dispatchEvent(
      new CustomEvent('zune:terms-search', {
        detail: {
          query,
          visibleCount,
          totalCount: cards.length
        }
      })
    );
  };

  if (searchInput) {
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.setAttribute(
      'aria-label',
      'Tafuta ndani ya sheria na masharti ya ZUNE'
    );

    searchInput.addEventListener('input', filterTerms);

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchInput.value = '';
        filterTerms();
        searchInput.blur();
      }

      if (event.key === 'Enter') {
        const firstMatch = cards.find((card) => !card.hidden);

        if (firstMatch) {
          firstMatch.querySelector('.term-toggle')?.focus();
        }
      }
    });
  }

  window.ZuneTermsSearch = {
    search: (query) => {
      if (!searchInput) return;
      searchInput.value = String(query || '');
      filterTerms();
    },

    clear: () => {
      if (!searchInput) return;
      searchInput.value = '';
      filterTerms();
    }
  };
})();

(() => {
  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  const cards = Array.from(document.querySelectorAll('.term-card[id]'));
  const progressBar = document.querySelector('#readingProgress');
  const progressInner = document.querySelector('#readingProgressInner');
  const progressText = document.querySelector('#progressText');
  const backToTop = document.querySelector('#backToTop');
  const sidebar = document.querySelector('#termsSidebar');

  const updateProgress = () => {
    const root = document.documentElement;
    const maxScroll = root.scrollHeight - window.innerHeight;
    const scrollTop = window.scrollY || root.scrollTop || 0;

    const percentage = maxScroll > 0
      ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100))
      : 0;

    const value = `${Math.round(percentage)}%`;

    if (progressBar) {
      progressBar.style.width = value;
    }

    if (progressInner) {
      progressInner.style.width = value;
    }

    if (progressText) {
      progressText.textContent = value;
    }

    if (backToTop) {
      const visible = scrollTop > 350;

      backToTop.classList.toggle('is-visible', visible);
      backToTop.setAttribute('aria-hidden', String(!visible));
    }
  };

  const setActiveLink = (id) => {
    tocLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${id}`;

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

      if (!target || !target.classList.contains('term-card')) return;

      event.preventDefault();

      target.hidden = false;
      target.style.display = '';

      const button = target.querySelector('.term-toggle');
      const content = target.querySelector('.term-content');
      const icon = button?.querySelector('.term-chevron');

      if (button && content) {
        button.setAttribute('aria-expanded', 'true');
        content.hidden = false;
        target.classList.add('is-open');

        if (icon) {
          icon.classList.remove('fa-chevron-down');
          icon.classList.add('fa-chevron-up');
        }
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      setActiveLink(target.id);

      if (history.replaceState) {
        history.replaceState(null, '', href);
      }

      if (sidebar) {
        sidebar.classList.remove('is-open', 'mobile-open');
      }
    });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          );

        if (visible.length) {
          setActiveLink(visible[0].target.id);
        }
      },
      {
        rootMargin: '-15% 0px -70% 0px',
        threshold: 0
      }
    );

    cards.forEach((card) => observer.observe(card));
  }

  if (backToTop) {
    backToTop.addEventListener('click', (event) => {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  let scheduled = false;

  window.addEventListener('scroll', () => {
    if (scheduled) return;

    scheduled = true;

    window.requestAnimationFrame(() => {
      updateProgress();
      scheduled = false;
    });
  }, { passive: true });

  window.addEventListener('resize', updateProgress);

  updateProgress();

  window.ZuneTermsNavigation = {
    setActive: setActiveLink,

    goToSection: (id) => {
      const target = document.getElementById(id);

      if (!target) return;

      target.hidden = false;
      target.style.display = '';

      const button = target.querySelector('.term-toggle');
      const content = target.querySelector('.term-content');

      if (button && content) {
        button.setAttribute('aria-expanded', 'true');
        content.hidden = false;
        target.classList.add('is-open');
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      setActiveLink(id);
    },

    updateProgress
  };
})();

(() => {
  const currentYear = document.querySelector('#currentYear');
  const backToTop = document.querySelector('#backToTop');
  const searchInput = document.querySelector('#termsSearch');
  const sidebar = document.querySelector('#termsSidebar');
  const cards = Array.from(document.querySelectorAll('.term-card'));

  const updateYear = () => {
    if (currentYear) {
      currentYear.textContent = String(new Date().getFullYear());
    }
  };

  updateYear();

  document.addEventListener('DOMContentLoaded', updateYear);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (searchInput && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.blur();
      }

      if (sidebar) {
        sidebar.classList.remove('is-open', 'mobile-open');
      }
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'f' &&
      searchInput
    ) {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  cards.forEach((card) => {
    const button = card.querySelector('.term-toggle');
    const content = card.querySelector('.term-content');

    if (!button || !content) return;

    button.setAttribute('aria-controls', content.id);

    if (!button.hasAttribute('aria-expanded')) {
      button.setAttribute('aria-expanded', String(!content.hidden));
    }

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Home') {
        event.preventDefault();
        cards[0]?.querySelector('.term-toggle')?.focus();
      }

      if (event.key === 'End') {
        event.preventDefault();
        cards[cards.length - 1]
          ?.querySelector('.term-toggle')
          ?.focus();
      }
    });
  });

  if (backToTop) {
    backToTop.setAttribute('aria-label', 'Rudi juu ya ukurasa');
    backToTop.setAttribute('title', 'Rudi juu');
  }

  document.documentElement.classList.add('zune-terms-ready');

  window.ZuneTermsReady = true;
})();
