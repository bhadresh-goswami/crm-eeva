'use strict';
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    // [ Basic Slider ]
    if (document.querySelector('#basic-slider')) {
      new Swiper('#basic-slider', {
        loop: true,
        pagination: {
          el: '#basic-slider .swiper-pagination',
          clickable: true
        }
      });
    }

    // [ Navigation Arrows Slider ]
    if (document.querySelector('#nav-slider')) {
      new Swiper('#nav-slider', {
        loop: true,
        navigation: {
          nextEl: '#nav-slider .swiper-button-next',
          prevEl: '#nav-slider .swiper-button-prev'
        }
      });
    }

    // [ Vertical Slider ]
    if (document.querySelector('#vertical-slider')) {
      new Swiper('#vertical-slider', {
        direction: 'vertical',
        loop: true,
        autoHeight: true,
        pagination: {
          el: '#vertical-slider .swiper-pagination',
          clickable: true
        }
      });
    }

    // [ Autoplay with Fade Effect ]
    if (document.querySelector('#fade-slider')) {
      new Swiper('#fade-slider', {
        loop: true,
        effect: 'fade',
        fadeEffect: {
          crossFade: true
        },
        autoplay: {
          delay: 2500,
          disableOnInteraction: false
        },
        pagination: {
          el: '#fade-slider .swiper-pagination',
          clickable: true
        }
      });
    }

    // [ Multiple Slides Per View ]
    if (document.querySelector('#multi-slider')) {
      new Swiper('#multi-slider', {
        loop: true,
        slidesPerView: 3,
        spaceBetween: 16,
        navigation: {
          nextEl: '#multi-slider .swiper-button-next',
          prevEl: '#multi-slider .swiper-button-prev'
        },
        pagination: {
          el: '#multi-slider .swiper-pagination',
          clickable: true
        },
        breakpoints: {
          0: { slidesPerView: 1 },
          576: { slidesPerView: 2 },
          992: { slidesPerView: 3 }
        }
      });
    }
  });
})();
