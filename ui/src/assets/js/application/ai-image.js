(function () {
  'use strict';

  // Elements
  const generateBtn = document.getElementById('ai-generate-btn');
  const promptInput = document.getElementById('ai-image-prompt');
  const styleSelect = document.getElementById('ai-image-style');
  const negativeToggle = document.getElementById('ai-negative-prompt-toggle');
  const negativeWrapper = document.getElementById('ai-negative-prompt-wrapper');
  const gridViewBtn = document.getElementById('ai-view-grid');
  const listViewBtn = document.getElementById('ai-view-list');
  const imageGrid = document.getElementById('ai-image-grid');

  // Guard clause
  if (!generateBtn || !promptInput) return;

  // Generate button with loading state
  generateBtn.addEventListener('click', function () {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      promptInput.focus();
      return;
    }

    const btn = this;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generating...';

    setTimeout(function () {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }, 2000);
  });

  // Negative prompt toggle
  if (negativeToggle && negativeWrapper) {
    negativeToggle.addEventListener('click', function () {
      negativeWrapper.classList.toggle('d-none');
    });
  }

  // Favorite toggle
  document.querySelectorAll('.ai-img-favorite').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const icon = this.querySelector('i');
      if (icon.classList.contains('ti-heart-filled')) {
        icon.classList.remove('ti-heart-filled');
        icon.classList.add('ti-heart');
        this.classList.remove('btn-danger');
        this.classList.add('btn-light');
      } else {
        icon.classList.remove('ti-heart');
        icon.classList.add('ti-heart-filled');
        this.classList.remove('btn-light');
        this.classList.add('btn-danger');
      }
    });
  });

  // Re-run prompt from recent list
  document.querySelectorAll('.ai-rerun-prompt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const prompt = this.getAttribute('data-prompt');
      const style = this.getAttribute('data-style');
      if (prompt && promptInput) {
        promptInput.value = prompt;
      }
      if (style && styleSelect) {
        styleSelect.value = style;
      }
      promptInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // View toggle (grid size)
  if (gridViewBtn && listViewBtn && imageGrid) {
    gridViewBtn.addEventListener('click', function () {
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      imageGrid.style.gridTemplateColumns = '';
    });

    listViewBtn.addEventListener('click', function () {
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      imageGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(360px, 1fr))';
    });
  }

  // Download button handler
  document.querySelectorAll('.ai-img-download').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const card = this.closest('.ai-image-card');
      const img = card ? card.querySelector('img') : null;
      if (img) {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'ai-generated-image.jpg';
        link.click();
      }
    });
  });

  // Enlarge button handler
  document.querySelectorAll('.ai-img-enlarge').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const card = this.closest('.ai-image-card');
      const img = card ? card.querySelector('img') : null;
      if (img) {
        window.open(img.src, '_blank');
      }
    });
  });
})();
