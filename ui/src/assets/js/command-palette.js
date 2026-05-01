(function () {
  'use strict';

  const STORAGE_KEY = 'cp_recent';
  const MAX_RECENT = 5;

  let pageIndex = [];
  let activeIndex = -1;
  let modal = null;
  let bsModal = null;
  let input = null;
  let resultsContainer = null;

  function init() {
    modal = document.getElementById('commandPalette');
    input = document.getElementById('commandPaletteInput');
    resultsContainer = document.getElementById('commandPaletteResults');

    if (!modal || !input || !resultsContainer) return;

    bsModal = new bootstrap.Modal(modal);

    // Build index from sidebar
    pageIndex = buildIndex();

    // Keyboard shortcut: Cmd+K / Ctrl+K
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
    });

    // Search on input
    input.addEventListener('input', function () {
      const query = input.value.trim();
      if (query.length === 0) {
        renderRecent();
      } else {
        renderSearch(query);
      }
    });

    // Keyboard navigation inside modal
    input.addEventListener('keydown', function (e) {
      const items = resultsContainer.querySelectorAll('.command-palette-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          const href = items[activeIndex].getAttribute('href');
          if (href) {
            trackRecent(items[activeIndex]);
            window.location.href = href;
          }
        }
      }
    });

    // Focus input on modal open, clear input
    modal.addEventListener('shown.bs.modal', function () {
      input.value = '';
      activeIndex = -1;
      renderRecent();
      input.focus();
    });

    // Click handler for result items
    resultsContainer.addEventListener('click', function (e) {
      const item = e.target.closest('.command-palette-item');
      if (item) {
        trackRecent(item);
      }
    });
  }

  function buildIndex() {
    const index = [];
    let currentSection = 'Pages';
    document.querySelectorAll('.pc-navbar > li').forEach(function (li) {
      const caption = li.querySelector('label[data-i18n]');
      if (caption && li.classList.contains('pc-caption')) {
        currentSection = caption.textContent.trim();
        return;
      }
      li.querySelectorAll('a.pc-link[href]').forEach(function (link) {
        const href = link.getAttribute('href');
        if (!href || href === '#!' || href.startsWith('javascript:')) return;
        const iconEl = link.querySelector('.pc-micon i');
        const titleEl = link.querySelector('.pc-mtext') || link;
        const title = titleEl.textContent.trim();
        if (title) {
          index.push({
            title: title,
            href: href,
            section: currentSection,
            icon: iconEl ? iconEl.className : 'ti ti-file'
          });
        }
      });
    });
    return index;
  }

  function openPalette() {
    if (bsModal) {
      bsModal.show();
    }
  }

  function renderSearch(query) {
    const lower = query.toLowerCase();
    const matches = pageIndex.filter(function (item) {
      return (
        item.title.toLowerCase().includes(lower) ||
        item.href.toLowerCase().includes(lower) ||
        item.section.toLowerCase().includes(lower)
      );
    });

    activeIndex = -1;

    if (matches.length === 0) {
      resultsContainer.innerHTML =
        '<div class="command-palette-empty">' +
        '<i class="ti ti-search-off d-block"></i>' +
        '<p class="mb-0">No results found</p>' +
        '</div>';
      return;
    }

    let html = '';
    matches.forEach(function (item) {
      html += renderItem(item);
    });
    resultsContainer.innerHTML = html;
  }

  function renderRecent() {
    const recent = getRecent();
    activeIndex = -1;

    if (recent.length === 0) {
      // Show all pages grouped by section
      renderGrouped();
      return;
    }

    let html = '<div class="command-palette-section-label">Recent</div>';
    recent.forEach(function (item) {
      html += renderItem(item);
    });
    resultsContainer.innerHTML = html;
  }

  function renderGrouped() {
    const groups = {};
    pageIndex.forEach(function (item) {
      if (!groups[item.section]) {
        groups[item.section] = [];
      }
      groups[item.section].push(item);
    });

    let html = '';
    Object.keys(groups).forEach(function (section) {
      html += '<div class="command-palette-section-label">' + escapeHtml(section) + '</div>';
      groups[section].forEach(function (item) {
        html += renderItem(item);
      });
    });
    resultsContainer.innerHTML = html;
  }

  function renderItem(item) {
    return (
      '<a href="' + escapeHtml(item.href) + '" class="command-palette-item">' +
      '<div class="command-palette-item-icon"><i class="' + escapeHtml(item.icon) + '"></i></div>' +
      '<div class="command-palette-item-text">' +
      '<div class="command-palette-item-title">' + escapeHtml(item.title) + '</div>' +
      '<div class="command-palette-item-path">' + escapeHtml(item.section) + '</div>' +
      '</div>' +
      '</a>'
    );
  }

  function updateActive(items) {
    items.forEach(function (el, i) {
      if (i === activeIndex) {
        el.classList.add('active');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    });
  }

  function trackRecent(itemEl) {
    const href = itemEl.getAttribute('href');
    const titleEl = itemEl.querySelector('.command-palette-item-title');
    const pathEl = itemEl.querySelector('.command-palette-item-path');
    const iconEl = itemEl.querySelector('.command-palette-item-icon i');

    if (!href || !titleEl) return;

    const entry = {
      title: titleEl.textContent.trim(),
      href: href,
      section: pathEl ? pathEl.textContent.trim() : '',
      icon: iconEl ? iconEl.className : 'ti ti-file'
    };

    let recent = getRecent();
    // Remove duplicate
    recent = recent.filter(function (r) {
      return r.href !== entry.href;
    });
    // Add to front
    recent.unshift(entry);
    // Keep max
    if (recent.length > MAX_RECENT) {
      recent = recent.slice(0, MAX_RECENT);
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (e) {
      // sessionStorage not available
    }
  }

  function getRecent() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      // sessionStorage not available
    }
    return [];
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
