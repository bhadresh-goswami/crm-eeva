'use strict';
(function () {
  // ============================================================
  // Website Visitors Sparkline (area)
  // ============================================================
  var visitorsEl = document.querySelector('#mkt-visitors-chart');
  if (visitorsEl) {
    var visitorsChart = new ApexCharts(visitorsEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#4680ff'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [62, 65, 68, 70, 72, 71, 74, 76, 78, 80, 82, 84] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Visitors (K):'; } } },
        marker: { show: false }
      }
    });
    visitorsChart.render();
  }

  // ============================================================
  // Leads Generated Sparkline (bar)
  // ============================================================
  var leadsEl = document.querySelector('#mkt-leads-chart');
  if (leadsEl) {
    var leadsChart = new ApexCharts(leadsEl, {
      chart: { type: 'bar', height: 40, sparkline: { enabled: true } },
      colors: ['#4caf50'],
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } },
      series: [{ data: [80, 95, 88, 102, 96, 110, 105, 115, 108, 120, 118, 125] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Leads:'; } } },
        marker: { show: false }
      }
    });
    leadsChart.render();
  }

  // ============================================================
  // Conversion Rate Sparkline (line)
  // ============================================================
  var conversionEl = document.querySelector('#mkt-conversion-chart');
  if (conversionEl) {
    var conversionChart = new ApexCharts(conversionEl, {
      chart: { type: 'line', height: 40, sparkline: { enabled: true } },
      colors: ['#ff9800'],
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [2.8, 2.9, 3.0, 3.1, 3.0, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Rate %:'; } } },
        marker: { show: false }
      }
    });
    conversionChart.render();
  }

  // ============================================================
  // Ad Spend ROI Sparkline (area)
  // ============================================================
  var roiEl = document.querySelector('#mkt-roi-chart');
  if (roiEl) {
    var roiChart = new ApexCharts(roiEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#00bcd4'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [2.8, 3.0, 3.2, 3.1, 3.4, 3.5, 3.6, 3.8, 3.9, 4.0, 4.1, 4.2] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'ROI:'; } } },
        marker: { show: false }
      }
    });
    roiChart.render();
  }

  // ============================================================
  // Campaign Performance Line Chart
  // ============================================================
  var campaignEl = document.querySelector('#mkt-campaign-chart');
  if (campaignEl) {
    var campaignChart = new ApexCharts(campaignEl, {
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: true }
      },
      colors: ['#4680ff', '#7c4dff', '#4caf50'],
      stroke: { width: 2, curve: 'smooth' },
      series: [
        { name: 'Email', data: [120, 135, 142, 158, 165, 178, 190, 210, 225, 240, 255, 270] },
        { name: 'Social', data: [80, 88, 95, 105, 115, 122, 130, 138, 148, 155, 162, 175] },
        { name: 'Paid Ads', data: [150, 160, 155, 170, 180, 195, 205, 215, 228, 235, 248, 260] }
      ],
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      },
      yaxis: {
        title: { text: 'Leads Generated' }
      },
      legend: { position: 'top' },
      grid: { borderColor: '#f1f1f1' }
    });
    campaignChart.render();
  }

  // ============================================================
  // Traffic Sources Donut Chart
  // ============================================================
  var trafficEl = document.querySelector('#mkt-traffic-chart');
  if (trafficEl) {
    var trafficChart = new ApexCharts(trafficEl, {
      chart: { type: 'donut', height: 350 },
      colors: ['#4680ff', '#4caf50', '#7c4dff', '#ff9800', '#00bcd4'],
      series: [38, 22, 20, 12, 8],
      labels: ['Organic Search', 'Direct', 'Social Media', 'Paid Ads', 'Referral'],
      legend: { position: 'bottom' },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: function () { return '100%'; }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false }
    });
    trafficChart.render();
  }

  // ============================================================
  // Social Media Horizontal Bar Chart
  // ============================================================
  var socialEl = document.querySelector('#mkt-social-chart');
  if (socialEl) {
    var socialChart = new ApexCharts(socialEl, {
      chart: { type: 'bar', height: 280 },
      colors: ['#E1306C', '#1DA1F2', '#0A66C2', '#1877F2', '#FF0000'],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '50%',
          borderRadius: 4,
          distributed: true
        }
      },
      series: [{ name: 'Followers', data: [12400, 8700, 15200, 6300, 4100] }],
      xaxis: {
        categories: ['Instagram', 'Twitter/X', 'LinkedIn', 'Facebook', 'YouTube'],
        labels: {
          formatter: function (val) {
            return (val / 1000).toFixed(1) + 'K';
          }
        }
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: function (val) {
          return (val / 1000).toFixed(1) + 'K';
        },
        style: { colors: ['#fff'] }
      },
      grid: { borderColor: '#f1f1f1' }
    });
    socialChart.render();
  }
})();
