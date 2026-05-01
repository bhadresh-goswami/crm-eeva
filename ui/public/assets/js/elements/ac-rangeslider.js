'use strict';

(function () {
  // [ Basic Slider ]
  var basicSlider = document.getElementById('slider-basic');
  if (basicSlider) {
    noUiSlider.create(basicSlider, {
      start: [14],
      range: { min: 0, max: 20 },
      step: 1,
      format: wNumb({ decimals: 0 })
    });
    basicSlider.noUiSlider.on('update', function (values, handle) {
      document.getElementById('slider-basic-value').textContent = values[handle];
    });
  }

  // [ Range Slider ]
  var rangeSlider = document.getElementById('slider-range');
  if (rangeSlider) {
    noUiSlider.create(rangeSlider, {
      start: [250, 450],
      connect: true,
      step: 5,
      range: { min: 10, max: 1000 },
      format: wNumb({ decimals: 0, prefix: '\u20AC ' })
    });
    rangeSlider.noUiSlider.on('update', function (values, handle) {
      if (handle === 0) {
        document.getElementById('range-low').textContent = values[0];
      } else {
        document.getElementById('range-high').textContent = values[1];
      }
    });
  }

  // [ Disabled Slider ]
  var disabledSlider = document.getElementById('slider-disabled');
  if (disabledSlider) {
    noUiSlider.create(disabledSlider, {
      start: [5],
      range: { min: 0, max: 20 },
      step: 1,
      format: wNumb({ decimals: 0 })
    });
    disabledSlider.setAttribute('disabled', true);

    var toggle = document.getElementById('slider-disabled-toggle');
    if (toggle) {
      toggle.addEventListener('change', function () {
        if (this.checked) {
          disabledSlider.removeAttribute('disabled');
        } else {
          disabledSlider.setAttribute('disabled', true);
        }
      });
    }
  }

  // [ RGB Color Sliders ]
  var rgbBox = document.getElementById('RGB');
  var sliderRed = document.getElementById('slider-red');
  var sliderGreen = document.getElementById('slider-green');
  var sliderBlue = document.getElementById('slider-blue');

  if (sliderRed && sliderGreen && sliderBlue && rgbBox) {
    var rgbUpdate = function () {
      var r = sliderRed.noUiSlider.get();
      var g = sliderGreen.noUiSlider.get();
      var b = sliderBlue.noUiSlider.get();
      rgbBox.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
    };

    var rgbOptions = {
      start: [128],
      range: { min: 0, max: 255 },
      step: 1,
      format: wNumb({ decimals: 0 })
    };

    noUiSlider.create(sliderRed, rgbOptions);
    noUiSlider.create(sliderGreen, rgbOptions);
    noUiSlider.create(sliderBlue, rgbOptions);

    sliderRed.noUiSlider.on('update', rgbUpdate);
    sliderGreen.noUiSlider.on('update', rgbUpdate);
    sliderBlue.noUiSlider.on('update', rgbUpdate);
  }

  // [ Vertical Slider ]
  var verticalSlider = document.getElementById('slider-vertical');
  if (verticalSlider) {
    noUiSlider.create(verticalSlider, {
      start: [10],
      orientation: 'vertical',
      range: { min: -5, max: 20 },
      step: 1,
      format: wNumb({ decimals: 0 })
    });
    verticalSlider.noUiSlider.on('update', function (values, handle) {
      document.getElementById('slider-vertical-value').textContent = values[handle];
    });
  }

  // [ Tooltip Slider ]
  var tooltipSlider = document.getElementById('slider-tooltip');
  if (tooltipSlider) {
    noUiSlider.create(tooltipSlider, {
      start: [20, 80],
      connect: true,
      tooltips: [wNumb({ decimals: 0 }), wNumb({ decimals: 0 })],
      range: { min: 0, max: 100 },
      format: wNumb({ decimals: 0 })
    });
  }

  // [ Step Slider ]
  var stepSlider = document.getElementById('slider-step');
  if (stepSlider) {
    noUiSlider.create(stepSlider, {
      start: [50],
      step: 10,
      range: { min: 0, max: 100 },
      format: wNumb({ decimals: 0 })
    });
    stepSlider.noUiSlider.on('update', function (values, handle) {
      document.getElementById('slider-step-value').textContent = values[handle];
    });
  }

  // [ Live Value Slider ]
  var liveSlider = document.getElementById('slider-live');
  if (liveSlider) {
    noUiSlider.create(liveSlider, {
      start: [3],
      range: { min: -5, max: 20 },
      step: 1,
      format: wNumb({ decimals: 0 })
    });
    liveSlider.noUiSlider.on('slide', function (values, handle) {
      document.getElementById('slider-live-value').textContent = values[handle];
    });
  }

  // [ Pips Slider ]
  var pipsSlider = document.getElementById('slider-pips');
  if (pipsSlider) {
    noUiSlider.create(pipsSlider, {
      start: [50],
      range: { min: 0, max: 100 },
      pips: {
        mode: 'count',
        values: 5
      }
    });
    var pips = pipsSlider.querySelectorAll('.noUi-value');
    for (var i = 0; i < pips.length; i++) {
      pips[i].style.cursor = 'pointer';
      pips[i].addEventListener('click', function () {
        var value = Number(this.getAttribute('data-value'));
        pipsSlider.noUiSlider.set(value);
      });
    }
  }

  // [ Non-linear Slider ]
  var nonlinearSlider = document.getElementById('slider-nonlinear');
  if (nonlinearSlider) {
    noUiSlider.create(nonlinearSlider, {
      start: [500],
      range: {
        min: [0],
        '10%': [500, 500],
        '50%': [4000, 1000],
        max: [10000]
      },
      format: wNumb({ decimals: 0 })
    });
    nonlinearSlider.noUiSlider.on('update', function (values, handle) {
      document.getElementById('slider-nonlinear-value').textContent = values[handle];
    });
  }

  // [ Colored Connect Slider ]
  var connectSlider = document.getElementById('slider-connect');
  if (connectSlider) {
    noUiSlider.create(connectSlider, {
      start: [30, 70],
      connect: true,
      range: { min: 0, max: 100 },
      format: wNumb({ decimals: 0 })
    });
    connectSlider.noUiSlider.on('update', function (values, handle) {
      if (handle === 0) {
        document.getElementById('slider-connect-low').textContent = values[0];
      } else {
        document.getElementById('slider-connect-high').textContent = values[1];
      }
    });
  }

  // [ Soft Limits Slider ]
  var softSlider = document.getElementById('slider-soft-limits');
  if (softSlider) {
    noUiSlider.create(softSlider, {
      start: [50],
      range: { min: 0, max: 100 },
      pips: {
        mode: 'values',
        values: [20, 80],
        density: 4
      },
      format: wNumb({ decimals: 0 })
    });
    softSlider.noUiSlider.on('update', function (values, handle) {
      document.getElementById('slider-soft-value').textContent = values[handle];
    });
    softSlider.noUiSlider.on('change', function (values, handle) {
      if (values[handle] < 20) {
        softSlider.noUiSlider.set(20);
      } else if (values[handle] > 80) {
        softSlider.noUiSlider.set(80);
      }
    });
  }
})();
