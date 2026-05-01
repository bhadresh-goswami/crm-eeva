'use strict';
(function () {
  // ============================================================
  // Total Employees Sparkline
  // ============================================================
  var employeesEl = document.querySelector('#hr-employees-chart');
  if (employeesEl) {
    var employeesChart = new ApexCharts(employeesEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#4680ff'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [210, 215, 218, 222, 225, 228, 230, 234, 237, 240, 244, 248] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Employees:'; } } },
        marker: { show: false }
      }
    });
    employeesChart.render();
  }

  // ============================================================
  // Open Positions Sparkline
  // ============================================================
  var positionsEl = document.querySelector('#hr-positions-chart');
  if (positionsEl) {
    var positionsChart = new ApexCharts(positionsEl, {
      chart: { type: 'bar', height: 40, sparkline: { enabled: true } },
      colors: ['#00bcd4'],
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } },
      series: [{ data: [8, 12, 10, 14, 11, 18, 15, 13, 17, 14, 12, 16] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Positions:'; } } },
        marker: { show: false }
      }
    });
    positionsChart.render();
  }

  // ============================================================
  // Attendance Rate Sparkline
  // ============================================================
  var attendanceEl = document.querySelector('#hr-attendance-chart');
  if (attendanceEl) {
    var attendanceChart = new ApexCharts(attendanceEl, {
      chart: { type: 'line', height: 40, sparkline: { enabled: true } },
      colors: ['#4caf50'],
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [91.5, 92.0, 91.8, 92.5, 93.0, 92.8, 93.2, 93.5, 93.8, 94.0, 93.9, 94.2] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Attendance %:'; } } },
        marker: { show: false }
      }
    });
    attendanceChart.render();
  }

  // ============================================================
  // Avg Tenure Sparkline
  // ============================================================
  var tenureEl = document.querySelector('#hr-tenure-chart');
  if (tenureEl) {
    var tenureChart = new ApexCharts(tenureEl, {
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      colors: ['#ff9800'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
      stroke: { width: 2, curve: 'smooth' },
      series: [{ data: [2.6, 2.7, 2.7, 2.8, 2.8, 2.9, 2.9, 3.0, 3.0, 3.1, 3.1, 3.2] }],
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: { title: { formatter: function () { return 'Years:'; } } },
        marker: { show: false }
      }
    });
    tenureChart.render();
  }

  // ============================================================
  // Headcount Trend Area Chart
  // ============================================================
  var headcountEl = document.querySelector('#hr-headcount-trend');
  if (headcountEl) {
    var headcountChart = new ApexCharts(headcountEl, {
      chart: {
        type: 'area',
        height: 300,
        toolbar: { show: true },
        zoom: { enabled: false }
      },
      colors: ['#4680ff'],
      dataLabels: { enabled: false },
      stroke: { width: 2, curve: 'smooth' },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] }
      },
      series: [
        {
          name: 'Employees',
          data: [210, 215, 218, 222, 225, 228, 230, 234, 237, 240, 244, 248]
        }
      ],
      xaxis: {
        categories: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
      },
      yaxis: {
        min: 200,
        labels: {
          formatter: function (val) {
            return val.toFixed(0);
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val + ' employees';
          }
        }
      }
    });
    headcountChart.render();
  }

  // ============================================================
  // Department Breakdown Donut Chart
  // ============================================================
  var deptEl = document.querySelector('#hr-department-breakdown');
  if (deptEl) {
    var deptChart = new ApexCharts(deptEl, {
      chart: { type: 'donut', height: 300 },
      colors: ['#4680ff', '#7c4dff', '#4caf50', '#ff9800', '#00bcd4', '#f44336'],
      series: [35, 18, 22, 10, 8, 7],
      labels: ['Engineering', 'Marketing', 'Sales', 'Design', 'Operations', 'HR'],
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: function () { return '248'; }
              }
            }
          }
        }
      },
      legend: { position: 'bottom' }
    });
    deptChart.render();
  }

  // ============================================================
  // Gender Distribution RadialBar Chart
  // ============================================================
  var genderEl = document.querySelector('#hr-gender-distribution');
  if (genderEl) {
    var genderChart = new ApexCharts(genderEl, {
      chart: { type: 'radialBar', height: 280 },
      colors: ['#4680ff', '#ff9800', '#7c4dff'],
      series: [54, 42, 4],
      labels: ['Male', 'Female', 'Non-binary'],
      plotOptions: {
        radialBar: {
          dataLabels: {
            name: { fontSize: '14px' },
            value: {
              fontSize: '16px',
              formatter: function (val) { return val + '%'; }
            },
            total: {
              show: true,
              label: 'Total',
              formatter: function () { return '248'; }
            }
          }
        }
      }
    });
    genderChart.render();
  }

  // ============================================================
  // Attendance This Week Stacked Column Chart
  // ============================================================
  var weekEl = document.querySelector('#hr-attendance-week');
  if (weekEl) {
    var weekChart = new ApexCharts(weekEl, {
      chart: { type: 'bar', height: 280, stacked: true },
      colors: ['#4caf50', '#4680ff', '#f44336'],
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 3 } },
      dataLabels: { enabled: false },
      series: [
        { name: 'Present', data: [215, 220, 210, 225, 218] },
        { name: 'Remote', data: [18, 15, 20, 12, 16] },
        { name: 'Absent', data: [15, 13, 18, 11, 14] }
      ],
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return val.toFixed(0);
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val + ' employees';
          }
        }
      },
      legend: { position: 'top' }
    });
    weekChart.render();
  }
})();
