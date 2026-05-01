(function () {
  'use strict';

  const stepsContainer = document.getElementById('ec-checkout-steps');
  const paymentMethods = document.getElementById('ec-payment-methods');
  const shippingMethods = document.getElementById('ec-shipping-methods');
  const placeOrderBtn = document.getElementById('ec-place-order');

  if (!stepsContainer) return;

  // ---- Helpers ----

  function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ---- Step Indicator ----

  function initSteps() {
    const steps = stepsContainer.querySelectorAll('.ec-step');
    steps.forEach(function (step) {
      step.style.cursor = 'pointer';
      step.addEventListener('click', function () {
        const clickedStep = parseInt(step.dataset.step);
        steps.forEach(function (s) {
          const sStep = parseInt(s.dataset.step);
          s.classList.remove('active', 'completed');
          if (sStep < clickedStep) {
            s.classList.add('completed');
            s.querySelector('.ec-step-icon').innerHTML = '<i class="ti ti-check"></i>';
          } else if (sStep === clickedStep) {
            s.classList.add('active');
            s.querySelector('.ec-step-icon').textContent = sStep;
          } else {
            s.querySelector('.ec-step-icon').textContent = sStep;
          }
        });
      });
    });
  }

  // ---- Payment Method Toggle ----

  function initPaymentToggle() {
    if (!paymentMethods) return;

    const radios = paymentMethods.querySelectorAll('input[name="payment-method"]');
    const details = document.querySelectorAll('.ec-payment-detail');

    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        details.forEach(function (detail) {
          detail.classList.add('d-none');
        });
        const targetId = 'ec-pay-' + radio.value;
        const target = document.getElementById(targetId);
        if (target) {
          target.classList.remove('d-none');
        }
      });
    });
  }

  // ---- Shipping Method ----

  function initShippingToggle() {
    if (!shippingMethods) return;

    const SUBTOTAL = 929.96;
    const COUPON = 98.99;
    const TAX_RATE = 0.08;

    const radios = shippingMethods.querySelectorAll('input[name="shipping-method"]');
    const shippingEl = document.getElementById('ec-summary-shipping');
    const taxEl = document.getElementById('ec-summary-tax');
    const totalEl = document.getElementById('ec-summary-total');

    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        const shippingCost = parseFloat(radio.value);

        if (shippingCost === 0) {
          shippingEl.innerHTML = '<span class="text-success fw-semibold">Free</span>';
        } else {
          shippingEl.textContent = formatCurrency(shippingCost);
        }

        const taxable = SUBTOTAL + shippingCost - COUPON;
        const tax = taxable * TAX_RATE;
        const total = taxable + tax;

        taxEl.textContent = formatCurrency(tax);
        totalEl.textContent = formatCurrency(total);
      });
    });
  }

  // ---- Place Order ----

  function initPlaceOrder() {
    if (!placeOrderBtn) return;

    placeOrderBtn.addEventListener('click', function () {
      const originalText = placeOrderBtn.innerHTML;
      placeOrderBtn.disabled = true;
      placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';

      setTimeout(function () {
        placeOrderBtn.classList.remove('btn-primary');
        placeOrderBtn.classList.add('btn-success');
        placeOrderBtn.innerHTML = '<i class="ti ti-check me-1"></i>Order Placed Successfully!';

        // Move steps to confirmation
        const steps = stepsContainer.querySelectorAll('.ec-step');
        steps.forEach(function (s) {
          s.classList.remove('active');
          s.classList.add('completed');
          s.querySelector('.ec-step-icon').innerHTML = '<i class="ti ti-check"></i>';
        });
        const lastStep = steps[steps.length - 1];
        lastStep.classList.remove('completed');
        lastStep.classList.add('active');
        lastStep.querySelector('.ec-step-icon').textContent = '4';
      }, 2000);
    });
  }

  // ---- Init ----

  initSteps();
  initPaymentToggle();
  initShippingToggle();
  initPlaceOrder();
})();
