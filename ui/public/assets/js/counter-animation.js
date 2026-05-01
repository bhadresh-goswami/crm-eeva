'use strict';
(function () {
  function animateCounter(el) {
    const target = parseFloat(el.getAttribute('data-counter') || el.textContent);
    const duration = parseInt(el.getAttribute('data-counter-duration') || '1500', 10);
    const prefix = el.getAttribute('data-counter-prefix') || '';
    const suffix = el.getAttribute('data-counter-suffix') || '';
    const decimals = (target % 1 !== 0) ? (target.toString().split('.')[1] || '').length : 0;

    let start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      el.textContent = prefix + current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !entry.target.classList.contains('counter-animated')) {
            entry.target.classList.add('counter-animated');
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      counters.forEach(function (el) { observer.observe(el); });
    } else {
      // Fallback: animate immediately
      counters.forEach(animateCounter);
    }
  });
})();
