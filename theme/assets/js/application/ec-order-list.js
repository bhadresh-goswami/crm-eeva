(function () {
  'use strict';

  const table = document.getElementById('ec-order-table');
  const tabs = document.getElementById('ec-order-tabs');
  const searchInput = document.getElementById('ec-order-search');

  if (!table || !tabs) return;

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  let activeFilter = 'all';

  // ---- Tab Filtering ----

  function filterRows() {
    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';

    rows.forEach(function (row) {
      const status = row.dataset.status;
      const orderId = row.querySelector('td:first-child').textContent.toLowerCase();
      const customer = row.querySelector('td:nth-child(2)').textContent.toLowerCase();

      const matchStatus = activeFilter === 'all' || status === activeFilter;
      const matchSearch = !search || orderId.includes(search) || customer.includes(search);

      row.style.display = matchStatus && matchSearch ? '' : 'none';
    });
  }

  tabs.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;

    tabs.querySelectorAll('.nav-link').forEach(function (link) {
      link.classList.remove('active');
    });
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    filterRows();
  });

  // ---- Search ----

  if (searchInput) {
    searchInput.addEventListener('input', filterRows);
  }
})();
