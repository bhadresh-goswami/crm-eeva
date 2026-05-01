'use strict';

(function () {
  // DOM elements
  const fmContent = document.getElementById('fmContent');
  const fmGrid = document.getElementById('fmGrid');
  const fmList = document.getElementById('fmList');
  const btnGridView = document.getElementById('btnGridView');
  const btnListView = document.getElementById('btnListView');
  const fmSearch = document.getElementById('fmSearch');
  const fmSidebar = document.getElementById('fmSidebar');
  const fmSidebarToggle = document.getElementById('fmSidebarToggle');
  const fmFolderTree = document.getElementById('fmFolderTree');
  const fmBreadcrumb = document.getElementById('fmBreadcrumb');
  const fmSortMenu = document.getElementById('fmSortMenu');
  const fmSelectAll = document.getElementById('fmSelectAll');
  const btnNewFolder = document.getElementById('btnNewFolder');

  if (!fmContent) return;

  // -------------------------------------------------------
  // 1. View Toggle (Grid / List)
  // -------------------------------------------------------
  function initViewToggle() {
    if (!btnGridView || !btnListView) return;

    btnGridView.addEventListener('click', function () {
      fmContent.classList.remove('fm-view-list');
      btnGridView.classList.add('active');
      btnListView.classList.remove('active');
    });

    btnListView.addEventListener('click', function () {
      fmContent.classList.add('fm-view-list');
      btnListView.classList.add('active');
      btnGridView.classList.remove('active');
    });
  }

  // -------------------------------------------------------
  // 2. File Card Selection (click + Ctrl/Cmd multi-select)
  // -------------------------------------------------------
  function initFileSelection() {
    const gridCards = fmGrid ? fmGrid.querySelectorAll('.fm-file-card') : [];
    const listItems = fmList ? fmList.querySelectorAll('.fm-list-item[data-name]') : [];

    function handleSelect(e, items) {
      const item = e.currentTarget;
      if (e.ctrlKey || e.metaKey) {
        item.classList.toggle('selected');
      } else {
        items.forEach(function (el) {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
      }
    }

    gridCards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        handleSelect(e, gridCards);
      });
    });

    listItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.form-check') || e.target.closest('.fm-list-item-actions')) return;
        handleSelect(e, listItems);
      });
    });
  }

  // -------------------------------------------------------
  // 3. Folder Double-Click (update breadcrumb)
  // -------------------------------------------------------
  function initFolderNavigation() {
    const folderCards = fmGrid ? fmGrid.querySelectorAll('.fm-file-card[data-type="folder"]') : [];
    const folderListItems = fmList ? fmList.querySelectorAll('.fm-list-item[data-type="folder"]') : [];

    function openFolder(folderName) {
      if (!fmBreadcrumb) return;
      fmBreadcrumb.innerHTML =
        '<div class="fm-breadcrumb-item" data-folder="my-drive">' +
        '<i class="ti ti-home"></i><span>My Drive</span></div>' +
        '<span class="fm-breadcrumb-separator"><i class="ti ti-chevron-right"></i></span>' +
        '<div class="fm-breadcrumb-item active"><span>' + folderName + '</span></div>';
    }

    folderCards.forEach(function (card) {
      card.addEventListener('dblclick', function () {
        openFolder(card.getAttribute('data-name'));
      });
    });

    folderListItems.forEach(function (item) {
      item.addEventListener('dblclick', function () {
        openFolder(item.getAttribute('data-name'));
      });
    });
  }

  // -------------------------------------------------------
  // 4. Search (filter by data-name)
  // -------------------------------------------------------
  function initSearch() {
    if (!fmSearch) return;

    fmSearch.addEventListener('input', function () {
      const query = fmSearch.value.toLowerCase().trim();

      // Filter grid cards
      if (fmGrid) {
        const cards = fmGrid.querySelectorAll('.fm-file-card');
        cards.forEach(function (card) {
          const name = (card.getAttribute('data-name') || '').toLowerCase();
          card.style.display = name.includes(query) ? '' : 'none';
        });
      }

      // Filter list items (skip header row)
      if (fmList) {
        const items = fmList.querySelectorAll('.fm-list-item[data-name]');
        items.forEach(function (item) {
          const name = (item.getAttribute('data-name') || '').toLowerCase();
          item.style.display = name.includes(query) ? '' : 'none';
        });
      }
    });
  }

  // -------------------------------------------------------
  // 5. Sort Dropdown
  // -------------------------------------------------------
  function initSort() {
    if (!fmSortMenu) return;

    const sortLinks = fmSortMenu.querySelectorAll('[data-sort]');
    const sortBtn = fmSortMenu.closest('.dropdown').querySelector('.dropdown-toggle');

    sortLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const sortBy = link.getAttribute('data-sort');

        // Update active state
        sortLinks.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        if (sortBtn) {
          sortBtn.textContent = 'Sort: ' + link.textContent;
        }

        // Sort grid items
        sortItems(fmGrid, '.fm-file-card', sortBy);
        // Sort list items (skip header)
        sortItems(fmList, '.fm-list-item[data-name]', sortBy);
      });
    });
  }

  function sortItems(container, selector, sortBy) {
    if (!container) return;
    const items = Array.from(container.querySelectorAll(selector));
    if (items.length === 0) return;

    items.sort(function (a, b) {
      switch (sortBy) {
        case 'name':
          return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
        case 'size':
          return parseInt(a.getAttribute('data-size') || '0', 10) - parseInt(b.getAttribute('data-size') || '0', 10);
        case 'date':
          return (b.getAttribute('data-date') || '').localeCompare(a.getAttribute('data-date') || '');
        case 'type':
          return (a.getAttribute('data-type') || '').localeCompare(b.getAttribute('data-type') || '');
        default:
          return 0;
      }
    });

    items.forEach(function (item) {
      container.appendChild(item);
    });
  }

  // -------------------------------------------------------
  // 6. Mobile Sidebar Toggle
  // -------------------------------------------------------
  function initMobileSidebar() {
    if (!fmSidebarToggle || !fmSidebar) return;

    fmSidebarToggle.addEventListener('click', function () {
      fmSidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (e) {
      if (fmSidebar.classList.contains('show') && !fmSidebar.contains(e.target) && e.target !== fmSidebarToggle && !fmSidebarToggle.contains(e.target)) {
        fmSidebar.classList.remove('show');
      }
    });
  }

  // -------------------------------------------------------
  // 7. Folder Tree Navigation
  // -------------------------------------------------------
  function initFolderTree() {
    if (!fmFolderTree) return;

    const folderItems = fmFolderTree.querySelectorAll('.fm-folder-item');

    folderItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        // Handle expand/collapse toggle
        const expandIcon = item.querySelector('.fm-folder-expand');
        if (expandIcon && e.target.closest('.fm-folder-expand')) {
          expandIcon.classList.toggle('expanded');
          const subTree = item.parentElement.querySelector(':scope > .fm-folder-tree');
          if (subTree) {
            subTree.style.display = expandIcon.classList.contains('expanded') ? '' : 'none';
          }
          return;
        }

        // Set active folder
        folderItems.forEach(function (fi) { fi.classList.remove('active'); });
        item.classList.add('active');

        // Update breadcrumb
        const label = item.getAttribute('data-label') || item.querySelector('.fm-folder-name').textContent;
        if (fmBreadcrumb) {
          fmBreadcrumb.innerHTML =
            '<div class="fm-breadcrumb-item" data-folder="my-drive">' +
            '<i class="ti ti-home"></i><span>My Drive</span></div>' +
            '<span class="fm-breadcrumb-separator"><i class="ti ti-chevron-right"></i></span>' +
            '<div class="fm-breadcrumb-item active"><span>' + label + '</span></div>';
        }

        // Close mobile sidebar after selection
        if (fmSidebar && fmSidebar.classList.contains('show')) {
          fmSidebar.classList.remove('show');
        }
      });
    });
  }

  // -------------------------------------------------------
  // 8. Select All (List View)
  // -------------------------------------------------------
  function initSelectAll() {
    if (!fmSelectAll || !fmList) return;

    fmSelectAll.addEventListener('change', function () {
      const checked = fmSelectAll.checked;
      const items = fmList.querySelectorAll('.fm-list-item[data-name]');
      items.forEach(function (item) {
        const checkbox = item.querySelector('.form-check-input');
        if (checkbox) checkbox.checked = checked;
        if (checked) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
    });
  }

  // -------------------------------------------------------
  // 9. New Folder
  // -------------------------------------------------------
  function initNewFolder() {
    if (!btnNewFolder) return;

    btnNewFolder.addEventListener('click', function () {
      const name = prompt('Enter folder name:');
      if (!name || !name.trim()) return;

      const folderName = name.trim();

      // Add to grid
      if (fmGrid) {
        const card = document.createElement('div');
        card.className = 'fm-file-card';
        card.setAttribute('data-type', 'folder');
        card.setAttribute('data-name', folderName);
        card.setAttribute('data-date', new Date().toISOString().slice(0, 10));
        card.setAttribute('data-size', '0');
        card.innerHTML =
          '<div class="fm-file-card-thumb">' +
          '<div class="fm-file-icon fm-icon-folder"><i class="ti ti-folder-filled"></i></div>' +
          '</div>' +
          '<div class="fm-file-card-body">' +
          '<div class="fm-file-card-name" title="' + folderName + '">' + folderName + '</div>' +
          '<div class="fm-file-card-meta">0 files &middot; Just now</div>' +
          '</div>';
        fmGrid.insertBefore(card, fmGrid.firstChild);
      }

      // Add to list
      if (fmList) {
        const row = document.createElement('div');
        row.className = 'fm-list-item';
        row.setAttribute('data-type', 'folder');
        row.setAttribute('data-name', folderName);
        row.setAttribute('data-date', new Date().toISOString().slice(0, 10));
        row.setAttribute('data-size', '0');
        row.innerHTML =
          '<div class="form-check flex-shrink-0 mb-0"><input class="form-check-input" type="checkbox" /></div>' +
          '<div class="fm-file-icon fm-file-icon-sm fm-icon-folder"><i class="ti ti-folder-filled"></i></div>' +
          '<div class="fm-list-item-name">' + folderName + '</div>' +
          '<div class="fm-list-item-size">0 files</div>' +
          '<div class="fm-list-item-date">Just now</div>' +
          '<div class="fm-list-item-actions">' +
          '<button class="btn btn-sm btn-link text-muted"><i class="ti ti-download"></i></button>' +
          '<button class="btn btn-sm btn-link text-muted"><i class="ti ti-dots-vertical"></i></button>' +
          '</div>';
        // Insert after header row
        const header = fmList.querySelector('.fm-list-item:first-child');
        if (header && header.nextSibling) {
          fmList.insertBefore(row, header.nextSibling);
        } else {
          fmList.appendChild(row);
        }
      }
    });
  }

  // -------------------------------------------------------
  // Initialize all features
  // -------------------------------------------------------
  initViewToggle();
  initFileSelection();
  initFolderNavigation();
  initSearch();
  initSort();
  initMobileSidebar();
  initFolderTree();
  initSelectAll();
  initNewFolder();
})();
