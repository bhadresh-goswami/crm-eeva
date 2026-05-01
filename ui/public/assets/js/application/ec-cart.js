(function () {
  'use strict';

  const cartContainer = document.getElementById('ec-cart-items');
  const selectAllCheckbox = document.getElementById('ec-select-all');
  const cartCountEl = document.getElementById('ec-cart-count');
  const subtotalEl = document.getElementById('ec-summary-subtotal');
  const taxEl = document.getElementById('ec-summary-tax');
  const totalEl = document.getElementById('ec-summary-total');
  const discountEl = document.getElementById('ec-summary-discount');
  const discountRow = document.querySelector('.ec-summary-discount');
  const couponInput = document.getElementById('ec-coupon-input');
  const couponBtn = document.getElementById('ec-apply-coupon');

  if (!cartContainer) return;

  const TAX_RATE = 0.08;
  let couponApplied = false;
  const COUPON_DISCOUNT = 0.1;

  // ---- Helpers ----

  function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function getVisibleItems() {
    return Array.from(cartContainer.querySelectorAll('.ec-cart-item:not(.ec-removing)'));
  }

  // ---- Quantity ----

  function updateItemSubtotal(item) {
    const price = parseFloat(item.dataset.price);
    const qty = parseInt(item.querySelector('.ec-qty-input').value);
    const subtotal = price * qty;
    item.querySelector('.ec-item-subtotal').textContent = formatCurrency(subtotal);
  }

  function handleQuantityChange(e) {
    const btn = e.target.closest('.ec-qty-minus, .ec-qty-plus');
    if (!btn) return;

    const item = btn.closest('.ec-cart-item');
    const input = item.querySelector('.ec-qty-input');
    let qty = parseInt(input.value);

    if (btn.classList.contains('ec-qty-plus')) {
      qty += 1;
    } else if (btn.classList.contains('ec-qty-minus') && qty > 1) {
      qty -= 1;
    }

    input.value = qty;
    updateItemSubtotal(item);
    recalculateSummary();
  }

  // ---- Remove Item ----

  function handleRemoveItem(e) {
    const removeBtn = e.target.closest('.ec-remove-item');
    if (!removeBtn) return;

    e.preventDefault();
    const item = removeBtn.closest('.ec-cart-item');
    item.classList.add('ec-removing');
    item.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
    item.style.opacity = '0';
    item.style.maxHeight = item.offsetHeight + 'px';
    item.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      item.style.maxHeight = '0';
      item.style.paddingTop = '0';
      item.style.paddingBottom = '0';
    });

    setTimeout(function () {
      item.remove();
      updateCartCount();
      recalculateSummary();
      syncSelectAll();
    }, 300);
  }

  // ---- Select All ----

  function handleSelectAll() {
    const checked = selectAllCheckbox.checked;
    const checkboxes = cartContainer.querySelectorAll('.ec-item-check');
    checkboxes.forEach(function (cb) {
      cb.checked = checked;
    });
    recalculateSummary();
  }

  function syncSelectAll() {
    const items = getVisibleItems();
    const checkboxes = items.map(function (item) {
      return item.querySelector('.ec-item-check');
    });

    if (checkboxes.length === 0) {
      selectAllCheckbox.checked = false;
      return;
    }

    const allChecked = checkboxes.every(function (cb) {
      return cb.checked;
    });
    selectAllCheckbox.checked = allChecked;
  }

  function handleItemCheck() {
    syncSelectAll();
    recalculateSummary();
  }

  // ---- Order Summary ----

  function recalculateSummary() {
    const items = getVisibleItems();
    let subtotal = 0;

    items.forEach(function (item) {
      const cb = item.querySelector('.ec-item-check');
      if (!cb.checked) return;

      const price = parseFloat(item.dataset.price);
      const qty = parseInt(item.querySelector('.ec-qty-input').value);
      subtotal += price * qty;
    });

    let discount = 0;
    if (couponApplied) {
      discount = subtotal * COUPON_DISCOUNT;
    }

    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * TAX_RATE;
    const total = taxableAmount + tax;

    subtotalEl.textContent = formatCurrency(subtotal);
    taxEl.textContent = formatCurrency(tax);
    totalEl.textContent = formatCurrency(total);

    if (couponApplied) {
      discountRow.classList.remove('d-none');
      discountEl.textContent = '-' + formatCurrency(discount);
    }
  }

  function updateCartCount() {
    const count = getVisibleItems().length;
    cartCountEl.textContent = count;
  }

  // ---- Coupon ----

  function handleApplyCoupon() {
    const code = couponInput.value.trim();
    if (!code) return;

    // Mock: any non-empty code applies 10% off
    couponApplied = true;
    couponInput.disabled = true;
    couponBtn.textContent = 'Applied';
    couponBtn.disabled = true;
    couponBtn.classList.remove('btn-outline-secondary');
    couponBtn.classList.add('btn-success');

    recalculateSummary();
  }

  // ---- Event Listeners ----

  cartContainer.addEventListener('click', handleQuantityChange);
  cartContainer.addEventListener('click', handleRemoveItem);
  cartContainer.addEventListener('change', handleItemCheck);
  selectAllCheckbox.addEventListener('change', handleSelectAll);
  couponBtn.addEventListener('click', handleApplyCoupon);

  couponInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyCoupon();
    }
  });
})();
