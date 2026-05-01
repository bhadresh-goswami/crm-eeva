'use strict';

(function () {
  // ============================================================
  // Sparkline: Total API Calls
  // ============================================================
  const apiCallsEl = document.querySelector('#api-calls-chart');
  if (apiCallsEl) {
    new ApexCharts(apiCallsEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#4680FF'],
      series: [{ data: [25, 66, 41, 89, 63, 25, 44, 12, 36, 9, 54] }],
      stroke: { width: 1.5, curve: 'smooth' },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
      tooltip: { fixed: { enabled: false }, x: { show: false }, marker: { show: false } }
    }).render();
  }

  // ============================================================
  // Sparkline: Tokens Used
  // ============================================================
  const tokensEl = document.querySelector('#tokens-chart');
  if (tokensEl) {
    new ApexCharts(tokensEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#00C9DB'],
      series: [{ data: [12, 44, 55, 42, 70, 55, 30, 45, 65, 50, 48] }],
      stroke: { width: 1.5, curve: 'smooth' },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
      tooltip: { fixed: { enabled: false }, x: { show: false }, marker: { show: false } }
    }).render();
  }

  // ============================================================
  // Sparkline: Total Cost
  // ============================================================
  const costEl = document.querySelector('#cost-chart');
  if (costEl) {
    new ApexCharts(costEl, {
      chart: { type: 'line', height: 40, sparkline: { enabled: true } },
      colors: ['#2CA87F'],
      series: [{ data: [35, 30, 32, 28, 25, 30, 22, 28, 24, 20, 18] }],
      stroke: { width: 2, curve: 'smooth' },
      tooltip: { fixed: { enabled: false }, x: { show: false }, marker: { show: false } }
    }).render();
  }

  // ============================================================
  // Sparkline: Avg Response Time
  // ============================================================
  const latencyEl = document.querySelector('#latency-chart');
  if (latencyEl) {
    new ApexCharts(latencyEl, {
      chart: { type: 'bar', height: 40, sparkline: { enabled: true } },
      colors: ['#E58A00'],
      series: [{ data: [300, 280, 250, 310, 245, 220, 260, 230, 245, 210, 200] }],
      plotOptions: { bar: { columnWidth: '60%', borderRadius: 2 } },
      tooltip: { fixed: { enabled: false }, x: { show: false }, marker: { show: false } }
    }).render();
  }

  // ============================================================
  // Token Usage Over Time (Area Chart)
  // ============================================================
  const tokenUsageEl = document.querySelector('#token-usage-chart');
  if (tokenUsageEl) {
    const days = Array.from({ length: 30 }, function (_, i) { return 'Mar ' + (i + 1); });

    new ApexCharts(tokenUsageEl, {
      chart: { type: 'area', height: 350, toolbar: { show: true } },
      colors: ['#4680FF', '#00C9DB'],
      series: [
        {
          name: 'Input Tokens',
          data: [
            42000, 38000, 45000, 52000, 48000, 35000, 30000, 55000, 60000, 58000,
            62000, 54000, 49000, 47000, 51000, 63000, 70000, 65000, 58000, 72000,
            68000, 61000, 55000, 78000, 82000, 75000, 69000, 85000, 80000, 88000
          ]
        },
        {
          name: 'Output Tokens',
          data: [
            28000, 25000, 32000, 38000, 34000, 22000, 20000, 40000, 42000, 39000,
            44000, 37000, 33000, 31000, 36000, 45000, 50000, 46000, 41000, 52000,
            48000, 43000, 38000, 56000, 58000, 53000, 49000, 60000, 57000, 64000
          ]
        }
      ],
      stroke: { width: 2, curve: 'smooth' },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] }
      },
      xaxis: { categories: days, labels: { rotate: -45, style: { fontSize: '11px' } }, tickAmount: 10 },
      yaxis: {
        labels: {
          formatter: function (val) {
            return (val / 1000).toFixed(0) + 'K';
          }
        }
      },
      legend: { position: 'top' },
      tooltip: {
        y: {
          formatter: function (val) {
            return val.toLocaleString() + ' tokens';
          }
        }
      }
    }).render();
  }

  // ============================================================
  // Model Distribution (Donut Chart)
  // ============================================================
  const modelDistEl = document.querySelector('#model-distribution-chart');
  if (modelDistEl) {
    new ApexCharts(modelDistEl, {
      chart: { type: 'donut', height: 320 },
      colors: ['#4680FF', '#7C3AED', '#2CA87F', '#E58A00'],
      series: [45, 30, 15, 10],
      labels: ['GPT-4o', 'Claude Sonnet', 'Gemini Pro', 'GPT-4o Mini'],
      legend: { position: 'bottom' },
      dataLabels: { enabled: true, formatter: function (val) { return val.toFixed(1) + '%'; } },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: { show: true, label: 'Total', formatter: function () { return '125,430'; } }
            }
          }
        }
      }
    }).render();
  }

  // ============================================================
  // Cost by Model (Horizontal Bar Chart)
  // ============================================================
  const costModelEl = document.querySelector('#cost-by-model-chart');
  if (costModelEl) {
    new ApexCharts(costModelEl, {
      chart: { type: 'bar', height: 250 },
      colors: ['#4680FF'],
      series: [{ name: 'Cost', data: [142, 98, 52, 28, 22.5] }],
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '50%' } },
      xaxis: {
        categories: ['GPT-4o', 'Claude Sonnet', 'Gemini Pro', 'GPT-4o Mini', 'DALL-E 3'],
        labels: {
          formatter: function (val) {
            return '$' + val;
          }
        }
      },
      yaxis: { labels: { style: { fontSize: '12px' } } },
      dataLabels: {
        enabled: true,
        formatter: function (val) {
          return '$' + val;
        },
        style: { fontSize: '11px' }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return '$' + val.toFixed(2);
          }
        }
      }
    }).render();
  }
})();
