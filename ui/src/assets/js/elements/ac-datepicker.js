'use strict';

(function () {
  // Weekends disabled
  if (document.querySelector('#d_week')) {
    flatpickr('#d_week', {
      dateFormat: 'Y-m-d',
      disable: [
        function (date) {
          return date.getDay() === 0 || date.getDay() === 6;
        }
      ]
    });
  }

  // Default date
  if (document.querySelector('#d_highlight')) {
    flatpickr('#d_highlight', {
      dateFormat: 'Y-m-d',
      defaultDate: 'today'
    });
  }

  // Close on select (default behavior)
  if (document.querySelector('#d_auto')) {
    flatpickr('#d_auto', {
      dateFormat: 'Y-m-d'
    });
  }

  // Specific dates disabled
  if (document.querySelector('#d_disable')) {
    flatpickr('#d_disable', {
      dateFormat: 'Y-m-d',
      disable: ['2026-02-18', '2026-02-22']
    });
  }

  // Min / Max date (today to +30 days)
  if (document.querySelector('#d_today')) {
    flatpickr('#d_today', {
      dateFormat: 'Y-m-d',
      minDate: 'today',
      maxDate: new Date().fp_incr(30)
    });
  }

  // Week numbers
  if (document.querySelector('#disp_week')) {
    flatpickr('#disp_week', {
      dateFormat: 'Y-m-d',
      weekNumbers: true
    });
  }

  // Range picker
  if (document.querySelector('#datepicker_range')) {
    flatpickr('#datepicker_range', {
      mode: 'range',
      dateFormat: 'Y-m-d'
    });
  }
})();
