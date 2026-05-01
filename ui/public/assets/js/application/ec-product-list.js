(function () {
  'use strict';

  const grid = document.getElementById('ec-product-grid');
  const filterCategory = document.getElementById('ec-filter-category');
  const filterPriceMin = document.getElementById('ec-filter-price-min');
  const filterPriceMax = document.getElementById('ec-filter-price-max');
  const filterSort = document.getElementById('ec-filter-sort');
  const filterSearch = document.getElementById('ec-filter-search');
  const viewGridBtn = document.getElementById('ec-view-grid');
  const viewListBtn = document.getElementById('ec-view-list');
  const resultCount = document.getElementById('ec-result-count');

  if (!grid) return;

  const allCards = Array.from(grid.querySelectorAll('.ec-product-card'));
  const totalProducts = 64; // total catalog size for display

  // ---- Filtering ----

  function getVisibleCards() {
    const category = filterCategory.value;
    const priceMin = parseFloat(filterPriceMin.value) || 0;
    const priceMax = parseFloat(filterPriceMax.value) || Infinity;
    const search = filterSearch.value.trim().toLowerCase();

    allCards.forEach(function (card) {
      const cardCategory = card.dataset.category;
      const cardPrice = parseFloat(card.dataset.price);
      const cardName = card.dataset.name.toLowerCase();

      const matchCategory = category === 'all' || cardCategory === category;
      const matchPrice = cardPrice >= priceMin && cardPrice <= priceMax;
      const matchSearch = !search || cardName.includes(search);

      card.style.display = matchCategory && matchPrice && matchSearch ? '' : 'none';
    });

    updateResultCount();
  }

  function updateResultCount() {
    const visible = allCards.filter(function (c) {
      return c.style.display !== 'none';
    }).length;
    resultCount.textContent = 'Showing ' + visible + ' of ' + totalProducts + ' products';
  }

  // ---- Sorting ----

  function sortProducts() {
    const sortBy = filterSort.value;
    const cards = allCards.filter(function (c) {
      return c.style.display !== 'none';
    });

    cards.sort(function (a, b) {
      switch (sortBy) {
        case 'price-low':
          return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
        case 'price-high':
          return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
        case 'rating':
          return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
        case 'newest':
          return parseInt(b.dataset.reviews) - parseInt(a.dataset.reviews);
        case 'popular':
        default:
          return parseInt(b.dataset.reviews) - parseInt(a.dataset.reviews);
      }
    });

    // Re-append all cards (hidden ones go to end)
    const hidden = allCards.filter(function (c) {
      return c.style.display === 'none';
    });
    cards.concat(hidden).forEach(function (card) {
      grid.appendChild(card);
    });
  }

  // ---- View Toggle ----

  function setGridView() {
    grid.classList.remove('ec-product-list-view');
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
  }

  function setListView() {
    grid.classList.add('ec-product-list-view');
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
  }

  // ---- Wishlist Toggle ----

  function initWishlist() {
    grid.addEventListener('click', function (e) {
      const btn = e.target.closest('.ec-wishlist-btn');
      if (!btn) return;

      e.preventDefault();
      const icon = btn.querySelector('i');
      if (icon.classList.contains('ti-heart')) {
        icon.classList.remove('ti-heart');
        icon.classList.add('ti-heart-filled');
        btn.classList.add('text-danger');
        btn.title = 'Remove from wishlist';
      } else {
        icon.classList.remove('ti-heart-filled');
        icon.classList.add('ti-heart');
        btn.classList.remove('text-danger');
        btn.title = 'Add to wishlist';
      }
    });
  }

  // ---- Event Listeners ----

  filterCategory.addEventListener('change', function () {
    getVisibleCards();
    sortProducts();
  });

  filterPriceMin.addEventListener('input', function () {
    getVisibleCards();
    sortProducts();
  });

  filterPriceMax.addEventListener('input', function () {
    getVisibleCards();
    sortProducts();
  });

  filterSort.addEventListener('change', function () {
    sortProducts();
  });

  filterSearch.addEventListener('input', function () {
    getVisibleCards();
    sortProducts();
  });

  viewGridBtn.addEventListener('click', setGridView);
  viewListBtn.addEventListener('click', setListView);

  // ---- Init ----

  initWishlist();
  updateResultCount();
})();
