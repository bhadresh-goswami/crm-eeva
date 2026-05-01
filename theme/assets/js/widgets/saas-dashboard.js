'use strict';
(function () {
  // ============================================================
  // MRR Sparkline
  // ============================================================
  var mrrEl = document.querySelector('#saas-mrr-chart');
  if (mrrEl) {
    var mrrChart = new ApexCharts(mrrEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#4680ff'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [35, 38, 40, 42, 41, 44, 43, 46, 45, 47, 48, 48] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'MRR ($K):'; } } },
        marker: { show: false }
      }
    });
    mrrChart.render();
  }

  // ============================================================
  // ARR Sparkline
  // ============================================================
  var arrEl = document.querySelector('#saas-arr-chart');
  if (arrEl) {
    var arrChart = new ApexCharts(arrEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#00bcd4'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [420, 435, 450, 468, 480, 495, 510, 525, 540, 555, 565, 579] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'ARR ($K):'; } } },
        marker: { show: false }
      }
    });
    arrChart.render();
  }

  // ============================================================
  // Churn Rate Sparkline
  // ============================================================
  var churnEl = document.querySelector('#saas-churn-chart');
  if (churnEl) {
    var churnChart = new ApexCharts(churnEl, {
      chart: { type: 'line', height: 40, sparkline: { enabled: true } },
      colors: ['#4caf50'],
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [3.8, 3.5, 3.2, 3.0, 2.9, 2.8, 2.7, 2.6, 2.5, 2.5, 2.4, 2.4] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Churn %:'; } } },
        marker: { show: false }
      }
    });
    churnChart.render();
  }

  // ============================================================
  // LTV Sparkline
  // ============================================================
  var ltvEl = document.querySelector('#saas-ltv-chart');
  if (ltvEl) {
    var ltvChart = new ApexCharts(ltvEl, {
      chart: { type: 'bar', height: 40, sparkline: { enabled: true } },
      colors: ['#ff9800'],
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } },
      series: [{ data: [980, 1010, 1040, 1065, 1090, 1100, 1120, 1145, 1170, 1195, 1215, 1240] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'LTV:'; } } },
        marker: { show: false }
      }
    });
    ltvChart.render();
  }

  // ============================================================
  // Revenue Growth Area Chart
  // ============================================================
  var revenueEl = document.querySelector('#saas-revenue-growth');
  if (revenueEl) {
    var revenueChart = new ApexCharts(revenueEl, {
      chart: {
        type: 'area',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: false }
      },
      colors: ['#4680ff', '#00bcd4'],
      dataLabels: { enabled: false },
      stroke: { width: 2, curve: 'smooth' },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] }
      },
      series: [
        {
          name: 'MRR',
          data: [35200, 37800, 39500, 41200, 40800, 43500, 42900, 45600, 44800, 46900, 47500, 48250]
        },
        {
          name: 'ARR/12',
          data: [35000, 36250, 37500, 39000, 40000, 41250, 42500, 43750, 45000, 46250, 47083, 48250]
        }
      ],
      xaxis: {
        categories: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return '$' + (val / 1000).toFixed(0) + 'K';
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return '$' + val.toLocaleString();
          }
        }
      },
      legend: { position: 'top' }
    });
    revenueChart.render();
  }

  // ============================================================
  // Revenue by Plan Donut Chart
  // ============================================================
  var planEl = document.querySelector('#saas-revenue-plan');
  if (planEl) {
    var planChart = new ApexCharts(planEl, {
      chart: { type: 'donut', height: 350 },
      colors: ['#4680ff', '#7c4dff', '#4caf50', '#ff9800'],
      series: [40, 35, 18, 7],
      labels: ['Enterprise', 'Professional', 'Starter', 'Free Trial'],
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Revenue',
                formatter: function () { return '$48,250'; }
              }
            }
          }
        }
      },
      legend: { position: 'bottom' }
    });
    planChart.render();
  }

  // ============================================================
  // Customer Growth Bar Chart
  // ============================================================
  var growthEl = document.querySelector('#saas-customer-growth');
  if (growthEl) {
    var growthChart = new ApexCharts(growthEl, {
      chart: { type: 'bar', height: 280, stacked: false },
      colors: ['#4caf50', '#f44336'],
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 3 } },
      dataLabels: { enabled: false },
      series: [
        { name: 'New Customers', data: [42, 38, 55, 47, 62, 58] },
        { name: 'Churned', data: [-8, -12, -10, -7, -14, -11] }
      ],
      xaxis: {
        categories: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return Math.abs(val);
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return Math.abs(val) + ' customers';
          }
        }
      },
      legend: { position: 'top' }
    });
    growthChart.render();
  }
})();
