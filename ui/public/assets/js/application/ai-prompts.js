'use strict';

(function () {
  const searchInput = document.getElementById('ai-prompt-search');
  const filterContainer = document.getElementById('ai-category-filters');
  const promptGrid = document.getElementById('ai-prompt-grid');
  const noResults = document.getElementById('ai-no-results');

  if (!promptGrid) return;

  const cards = promptGrid.querySelectorAll('[data-category]');
  let activeCategory = 'all';

  // Category filter
  if (filterContainer) {
    filterContainer.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;

      filterContainer.querySelectorAll('[data-filter]').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      activeCategory = btn.dataset.filter;
      filterCards();
    });
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      filterCards();
    });
  }

  function filterCards() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let visibleCount = 0;

    cards.forEach(function (card) {
      const category = card.dataset.category;
      const title = card.querySelector('h6');
      const text = card.querySelector('.ai-prompt-text');
      const titleStr = title ? title.textContent.toLowerCase() : '';
      const textStr = text ? text.textContent.toLowerCase() : '';

      const categoryMatch = activeCategory === 'all' || category === activeCategory;
      const searchMatch = !query || titleStr.includes(query) || textStr.includes(query);

      if (categoryMatch && searchMatch) {
        card.classList.remove('d-none');
        visibleCount++;
      } else {
        card.classList.add('d-none');
      }
    });

    if (noResults) {
      noResults.classList.toggle('d-none', visibleCount > 0);
    }
  }

  // Copy to clipboard
  promptGrid.addEventListener('click', function (e) {
    const copyBtn = e.target.closest('.ai-copy-btn');
    if (copyBtn) {
      const card = copyBtn.closest('.ai-prompt-card');
      const textEl = card.querySelector('.ai-prompt-text');
      if (!textEl) return;

      navigator.clipboard.writeText(textEl.textContent.trim()).then(function () {
        const icon = copyBtn.querySelector('i');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="ti ti-check me-1"></i> Copied!';
        copyBtn.classList.remove('btn-outline-primary');
        copyBtn.classList.add('btn-success');

        setTimeout(function () {
          copyBtn.innerHTML = originalHTML;
          copyBtn.classList.remove('btn-success');
          copyBtn.classList.add('btn-outline-primary');
        }, 2000);
      });

      return;
    }

    // Favorite toggle
    const favBtn = e.target.closest('.ai-favorite-btn');
    if (favBtn) {
      const icon = favBtn.querySelector('i');
      if (!icon) return;

      const isFavorited = icon.classList.contains('ti-heart-filled');
      if (isFavorited) {
        icon.classList.remove('ti-heart-filled');
        icon.classList.add('ti-heart');
        favBtn.classList.remove('text-danger');
        favBtn.classList.add('text-muted');
      } else {
        icon.classList.remove('ti-heart');
        icon.classList.add('ti-heart-filled');
        favBtn.classList.remove('text-muted');
        favBtn.classList.add('text-danger');
      }

      return;
    }

    // Use button
    const useBtn = e.target.closest('.ai-use-btn');
    if (useBtn) {
      const card = useBtn.closest('.ai-prompt-card');
      const textEl = card.querySelector('.ai-prompt-text');
      if (!textEl) return;

      // Copy text and navigate to AI Chat
      navigator.clipboard.writeText(textEl.textContent.trim()).then(function () {
        window.location.href = 'ai-chat.html';
      }).catch(function () {
        window.location.href = 'ai-chat.html';
      });

      return;
    }
  });

  // Create Prompt button
  const createBtn = document.getElementById('ai-create-prompt');
  if (createBtn) {
    createBtn.addEventListener('click', function () {
      alert('Create Prompt feature coming soon! This will open a form to add your own custom prompt templates.');
    });
  }
})();
