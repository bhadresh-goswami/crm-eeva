(function () {
  'use strict';

  const list = document.getElementById('nc-list');
  const tabs = document.querySelectorAll('.nc-tab');
  const markAllBtn = document.getElementById('nc-mark-all-read');
  const loadMoreBtn = document.getElementById('nc-load-more');
  const loadMoreWrapper = document.getElementById('nc-load-more-wrapper');
  const unreadBadge = document.getElementById('nc-unread-total');

  if (!list) return;

  // --- Tab filtering ---
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');
      const items = list.querySelectorAll('.nc-item');

      items.forEach(function (item) {
        if (item.classList.contains('d-none-dismissed')) return;
        if (filter === 'all') {
          // Respect load-more hidden state
          if (!item.classList.contains('d-none-loadmore')) {
            item.classList.remove('d-none');
          }
        } else {
          const cat = item.getAttribute('data-category');
          if (cat === filter) {
            if (!item.classList.contains('d-none-loadmore')) {
              item.classList.remove('d-none');
            }
          } else {
            item.classList.add('d-none');
          }
        }
      });
    });
  });

  // --- Mark single as read ---
  list.addEventListener('click', function (e) {
    const btn = e.target.closest('.nc-mark-read');
    if (!btn) return;
    const item = btn.closest('.nc-item');
    if (item) {
      item.classList.remove('nc-unread');
      updateCounts();
    }
  });

  // --- Dismiss ---
  list.addEventListener('click', function (e) {
    const btn = e.target.closest('.nc-dismiss');
    if (!btn) return;
    const item = btn.closest('.nc-item');
    if (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      item.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(function () {
        item.classList.add('d-none', 'd-none-dismissed');
        item.style.opacity = '';
        item.style.transform = '';
        updateCounts();
      }, 300);
    }
  });

  // --- Mark all as read ---
  if (markAllBtn) {
    markAllBtn.addEventListener('click', function () {
      const items = list.querySelectorAll('.nc-item.nc-unread');
      items.forEach(function (item) {
        if (!item.classList.contains('d-none') || getActiveFilter() === 'all') {
          item.classList.remove('nc-unread');
        }
      });
      updateCounts();
    });
  }

  // --- Load more ---
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      const hidden = list.querySelectorAll('.nc-item.d-none-loadmore');
      hidden.forEach(function (item) {
        item.classList.remove('d-none', 'd-none-loadmore');
      });
      loadMoreWrapper.classList.add('d-none');
      // Re-apply active filter
      const activeTab = document.querySelector('.nc-tab.active');
      if (activeTab) activeTab.click();
    });
  }

  // --- Initialize load-more state ---
  (function initLoadMore() {
    const items = list.querySelectorAll('.nc-item.d-none');
    items.forEach(function (item) {
      item.classList.add('d-none-loadmore');
    });
  })();

  // --- Helpers ---
  function getActiveFilter() {
    const active = document.querySelector('.nc-tab.active');
    return active ? active.getAttribute('data-filter') : 'all';
  }

  function updateCounts() {
    const allItems = list.querySelectorAll('.nc-item:not(.d-none-dismissed)');
    let totalUnread = 0;
    const counts = { alert: 0, message: 0, update: 0, system: 0 };

    allItems.forEach(function (item) {
      const cat = item.getAttribute('data-category');
      if (item.classList.contains('nc-unread')) {
        totalUnread++;
        if (counts[cat] !== undefined) counts[cat]++;
      }
    });

    // Update header badge
    if (unreadBadge) {
      unreadBadge.textContent = totalUnread + ' unread';
      if (totalUnread === 0) {
        unreadBadge.classList.add('d-none');
      } else {
        unreadBadge.classList.remove('d-none');
      }
    }

    // Update tab badges
    tabs.forEach(function (tab) {
      const filter = tab.getAttribute('data-filter');
      if (filter === 'all') return;
      const badge = tab.querySelector('.badge');
      if (badge) {
        const catItems = list.querySelectorAll('.nc-item[data-category="' + filter + '"]:not(.d-none-dismissed)');
        badge.textContent = catItems.length;
      }
    });
  }
})();
