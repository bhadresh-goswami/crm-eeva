'use strict';
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const bars = document.querySelectorAll('[data-progress-animate]');
    if (!bars.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !entry.target.classList.contains('progress-animated')) {
            entry.target.classList.add('progress-animated');
            const bar = entry.target.querySelector('.progress-bar');
            if (bar) {
              const target = bar.getAttribute('aria-valuenow') || bar.style.width;
              bar.style.width = '0%';
              bar.style.transition = 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
              requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                  bar.style.width = target + '%';
                });
              });
            }
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      bars.forEach(function (el) { observer.observe(el); });
    }
  });
})();
