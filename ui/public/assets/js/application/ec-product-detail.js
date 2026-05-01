(function () {
  'use strict';

  // ---- Gallery Thumbnails ----

  const mainImg = document.getElementById('ec-main-img');
  const thumbsContainer = document.getElementById('ec-gallery-thumbs');

  if (mainImg && thumbsContainer) {
    thumbsContainer.addEventListener('click', function (e) {
      const thumb = e.target.closest('.ec-gallery-thumb');
      if (!thumb) return;

      const src = thumb.dataset.img;
      if (!src) return;

      mainImg.src = src;
      thumbsContainer.querySelectorAll('.ec-gallery-thumb').forEach(function (t) {
        t.classList.remove('active');
      });
      thumb.classList.add('active');
    });
  }

  // ---- Quantity Controls ----

  const qtyInput = document.getElementById('ec-qty-input');
  const qtyMinus = document.getElementById('ec-qty-minus');
  const qtyPlus = document.getElementById('ec-qty-plus');

  if (qtyInput && qtyMinus && qtyPlus) {
    qtyMinus.addEventListener('click', function () {
      const current = parseInt(qtyInput.value, 10) || 1;
      if (current > 1) {
        qtyInput.value = current - 1;
      }
    });

    qtyPlus.addEventListener('click', function () {
      const current = parseInt(qtyInput.value, 10) || 1;
      if (current < 10) {
        qtyInput.value = current + 1;
      }
    });
  }

  // ---- Add to Cart ----

  const addToCartBtn = document.getElementById('ec-add-to-cart');

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function () {
      const qty = qtyInput ? qtyInput.value : 1;
      const color = document.querySelector('input[name="ec-color"]:checked');
      const size = document.querySelector('input[name="ec-size"]:checked');
      const colorName = color ? color.parentElement.title : 'Black';
      const sizeName = size ? size.value : 'Standard';

      // Show toast if Bootstrap toast is available, otherwise use alert
      const toastHTML =
        '<div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:1090">' +
        '<div class="toast show align-items-center text-bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">' +
        '<div class="d-flex">' +
        '<div class="toast-body">' +
        '<i class="ti ti-check me-1"></i> Added ' + qty + ' item(s) to cart — ' + colorName + ', ' + sizeName +
        '</div>' +
        '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>' +
        '</div></div></div>';

      const wrapper = document.createElement('div');
      wrapper.innerHTML = toastHTML;
      document.body.appendChild(wrapper);

      // Auto-dismiss after 3 seconds
      setTimeout(function () {
        wrapper.remove();
      }, 3000);
    });
  }

  // ---- Wishlist Toggle ----

  const wishlistBtn = document.getElementById('ec-wishlist');

  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', function () {
      const icon = wishlistBtn.querySelector('i');
      if (icon.classList.contains('ti-heart')) {
        icon.classList.remove('ti-heart');
        icon.classList.add('ti-heart-filled');
        wishlistBtn.classList.remove('btn-outline-danger');
        wishlistBtn.classList.add('btn-danger');
        wishlistBtn.title = 'Remove from Wishlist';
      } else {
        icon.classList.remove('ti-heart-filled');
        icon.classList.add('ti-heart');
        wishlistBtn.classList.remove('btn-danger');
        wishlistBtn.classList.add('btn-outline-danger');
        wishlistBtn.title = 'Add to Wishlist';
      }
    });
  }
})();
