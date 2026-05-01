'use strict';

// ==============================
// ApexCharts Sparkline Demo Charts
// ==============================

(function () {
  // --- Helper ---
  function renderSparkline(selector, options) {
    var el = document.querySelector(selector);
    if (!el) return;
    new ApexCharts(el, options).render();
  }

  // ==============================
  // Sparkline Line Charts
  // ==============================
  renderSparkline('#sparkline-line-1', {
    chart: { type: 'line', height: 40, sparkline: { enabled: true } },
    series: [{ data: [25, 66, 41, 89, 63, 25, 44, 12, 36, 9, 54] }],
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#4680ff'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-line-2', {
    chart: { type: 'line', height: 40, sparkline: { enabled: true } },
    series: [{ data: [15, 42, 30, 55, 20, 45, 35, 50, 25, 60] }],
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#1de9b6'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-line-3', {
    chart: { type: 'line', height: 40, sparkline: { enabled: true } },
    series: [{ data: [40, 20, 55, 35, 60, 30, 15, 45, 25, 50] }],
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#f44236'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  // ==============================
  // Sparkline Bar Charts
  // ==============================
  renderSparkline('#sparkline-bar-1', {
    chart: { type: 'bar', height: 40, sparkline: { enabled: true } },
    series: [{ data: [5, 3, 9, 6, 5, 9, 7, 3, 5, 2] }],
    plotOptions: { bar: { columnWidth: '60%' } },
    colors: ['#04a9f5'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-bar-2', {
    chart: { type: 'bar', height: 40, sparkline: { enabled: true } },
    series: [{ data: [5, 3, 2, -1, -3, -2, 2, 3, 5, 2] }],
    plotOptions: { bar: { columnWidth: '60%' } },
    colors: ['#1de9b6'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-bar-3', {
    chart: { type: 'bar', height: 40, sparkline: { enabled: true } },
    series: [{ data: [0, -3, -6, -4, -5, -4, -7, -3, -5, -2] }],
    plotOptions: { bar: { columnWidth: '60%' } },
    colors: ['#f44236'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  // ==============================
  // Sparkline Area Charts
  // ==============================
  renderSparkline('#sparkline-area-1', {
    chart: { type: 'area', height: 40, sparkline: { enabled: true } },
    series: [{ data: [25, 66, 41, 89, 63, 25, 44, 12, 36, 9, 54] }],
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.3 },
    colors: ['#4680ff'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-area-2', {
    chart: { type: 'area', height: 40, sparkline: { enabled: true } },
    series: [{ data: [15, 42, 30, 55, 20, 45, 35, 50, 25, 60] }],
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.3 },
    colors: ['#ffa21d'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-area-3', {
    chart: { type: 'area', height: 40, sparkline: { enabled: true } },
    series: [{ data: [40, 20, 55, 35, 60, 30, 15, 45, 25, 50] }],
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.3 },
    colors: ['#1de9b6'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  // ==============================
  // Sparkline Pie Charts
  // ==============================
  renderSparkline('#sparkline-pie-1', {
    chart: { type: 'pie', height: 60, width: 60, sparkline: { enabled: true } },
    series: [20, 80],
    colors: ['#58508d', '#eeeeee'],
    stroke: { width: 0 },
    tooltip: { enabled: false }
  });

  renderSparkline('#sparkline-pie-2', {
    chart: { type: 'pie', height: 60, width: 60, sparkline: { enabled: true } },
    series: [63, 37],
    colors: ['#ffa600', '#eeeeee'],
    stroke: { width: 0 },
    tooltip: { enabled: false }
  });

  renderSparkline('#sparkline-pie-3', {
    chart: { type: 'pie', height: 60, width: 60, sparkline: { enabled: true } },
    series: [33, 67],
    colors: ['#ff6361', '#eeeeee'],
    stroke: { width: 0 },
    tooltip: { enabled: false }
  });

  renderSparkline('#sparkline-pie-4', {
    chart: { type: 'pie', height: 60, width: 60, sparkline: { enabled: true } },
    series: [10, 20, 30, 20, 20],
    colors: ['#4680ff', '#1de9b6', '#ffa21d', '#f44236', '#58508d'],
    stroke: { width: 0 },
    tooltip: { enabled: false }
  });

  // ==============================
  // Sparkline Donut Charts
  // ==============================
  renderSparkline('#sparkline-donut-1', {
    chart: { type: 'donut', height: 60, width: 60, sparkline: { enabled: true } },
    series: [20, 80],
    colors: ['#ff9900', '#fff4dd'],
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: '60%' } } },
    tooltip: { enabled: false }
  });

  renderSparkline('#sparkline-donut-2', {
    chart: { type: 'donut', height: 60, width: 60, sparkline: { enabled: true } },
    series: [63, 37],
    colors: ['#04a9f5', '#e0f5fe'],
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: '60%' } } },
    tooltip: { enabled: false }
  });

  renderSparkline('#sparkline-donut-3', {
    chart: { type: 'donut', height: 60, width: 60, sparkline: { enabled: true } },
    series: [33, 67],
    colors: ['#1de9b6', '#e0f5fe'],
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: '60%' } } },
    tooltip: { enabled: false }
  });

  renderSparkline('#sparkline-donut-4', {
    chart: { type: 'donut', height: 60, width: 60, sparkline: { enabled: true } },
    series: [10, 20, 30, 20, 20],
    colors: ['#4680ff', '#1de9b6', '#ffa21d', '#f44236', '#58508d'],
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: '60%' } } },
    tooltip: { enabled: false }
  });

  // ==============================
  // Sparkline Radial Bar Charts
  // ==============================
  renderSparkline('#sparkline-radial-1', {
    chart: { type: 'radialBar', height: 60, width: 60, sparkline: { enabled: true } },
    series: [20],
    colors: ['#ff6361'],
    plotOptions: { radialBar: { hollow: { size: '40%' }, dataLabels: { show: false } } }
  });

  renderSparkline('#sparkline-radial-2', {
    chart: { type: 'radialBar', height: 60, width: 60, sparkline: { enabled: true } },
    series: [45],
    colors: ['#ffa600'],
    plotOptions: { radialBar: { hollow: { size: '40%' }, dataLabels: { show: false } } }
  });

  renderSparkline('#sparkline-radial-3', {
    chart: { type: 'radialBar', height: 60, width: 60, sparkline: { enabled: true } },
    series: [72],
    colors: ['#04a9f5'],
    plotOptions: { radialBar: { hollow: { size: '40%' }, dataLabels: { show: false } } }
  });

  renderSparkline('#sparkline-radial-4', {
    chart: { type: 'radialBar', height: 60, width: 60, sparkline: { enabled: true } },
    series: [95],
    colors: ['#1de9b6'],
    plotOptions: { radialBar: { hollow: { size: '40%' }, dataLabels: { show: false } } }
  });

  // ==============================
  // Full Width Sparkline Charts
  // ==============================
  renderSparkline('#sparkline-full-line', {
    chart: { type: 'line', height: 125, sparkline: { enabled: true } },
    series: [{ data: [5, 3, 9, 6, 5, 9, 7, 3, 5, 2, 3, 5, 5, 1, 8, 4, 7, 2, 6, 9] }],
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#04a9f5'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-full-bar', {
    chart: { type: 'bar', height: 125, sparkline: { enabled: true } },
    series: [{ data: [5, 3, 9, 6, 5, 9, 7, 3, 5, 2] }],
    plotOptions: { bar: { columnWidth: '60%' } },
    colors: ['#04a9f5'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });

  renderSparkline('#sparkline-full-area', {
    chart: { type: 'area', height: 125, sparkline: { enabled: true } },
    series: [{ data: [5, 3, 9, 6, 5, 9, 7, 3, 5, 2, 5, 3, 9, 6, 5, 9, 7, 3, 5, 2] }],
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.3 },
    colors: ['#04a9f5'],
    tooltip: { fixed: { enabled: false }, x: { show: false } }
  });
})();
