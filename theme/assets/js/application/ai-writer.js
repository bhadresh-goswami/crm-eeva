(function () {
  'use strict';

  // Elements
  const generateBtn = document.getElementById('ai-generate-btn');
  const regenerateBtn = document.getElementById('ai-regenerate-btn');
  const copyBtn = document.getElementById('ai-copy-btn');
  const editToggle = document.getElementById('ai-edit-toggle');
  const preview = document.getElementById('ai-writer-preview');
  const sliderEl = document.getElementById('ai-word-count-slider');

  // Guard clause
  if (!generateBtn || !preview) return;

  // Initialize noUiSlider for word count
  if (sliderEl && typeof noUiSlider !== 'undefined') {
    noUiSlider.create(sliderEl, {
      start: [1000],
      step: 100,
      range: {
        min: 200,
        max: 3000
      },
      tooltips: [wNumb({ decimals: 0 })],
      format: wNumb({ decimals: 0 })
    });
  }

  // ApexCharts radialBar helper
  function createScoreChart(elementId, score, color) {
    const el = document.getElementById(elementId);
    if (!el || typeof ApexCharts === 'undefined') return null;

    const options = {
      chart: {
        type: 'radialBar',
        height: 120,
        sparkline: { enabled: true }
      },
      plotOptions: {
        radialBar: {
          hollow: { size: '50%' },
          track: { background: 'var(--bs-border-color)' },
          dataLabels: {
            name: { show: false },
            value: {
              show: true,
              fontSize: '14px',
              fontWeight: 600,
              offsetY: 5,
              formatter: function () {
                return score;
              }
            }
          }
        }
      },
      colors: [color],
      series: [score],
      stroke: { lineCap: 'round' }
    };

    const chart = new ApexCharts(el, options);
    chart.render();
    return chart;
  }

  // Initialize score charts
  createScoreChart('ai-seo-score-chart', 78, '#2ca87f');
  createScoreChart('ai-readability-chart', 85, '#4680ff');
  createScoreChart('ai-originality-chart', 92, '#7c5cfc');

  // Generate button loading state
  function triggerLoading(btn) {
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generating...';

    setTimeout(function () {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      updateStats();
    }, 2000);
  }

  generateBtn.addEventListener('click', function () {
    triggerLoading(this);
  });

  // Regenerate button
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', function () {
      triggerLoading(generateBtn);
    });
  }

  // Copy to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const text = preview.innerText;
      navigator.clipboard.writeText(text).then(function () {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="ti ti-check"></i> Copied!';
        setTimeout(function () {
          copyBtn.innerHTML = originalHTML;
        }, 2000);
      });
    });
  }

  // Edit toggle (contenteditable)
  if (editToggle) {
    editToggle.addEventListener('click', function () {
      const isEditable = preview.contentEditable === 'true';
      preview.contentEditable = isEditable ? 'false' : 'true';
      preview.focus();

      if (isEditable) {
        this.classList.remove('btn-primary');
        this.classList.add('btn-outline-secondary');
        this.innerHTML = '<i class="ti ti-edit"></i> Edit';
        updateStats();
      } else {
        this.classList.remove('btn-outline-secondary');
        this.classList.add('btn-primary');
        this.innerHTML = '<i class="ti ti-edit-off"></i> Editing';
      }
    });
  }

  // Download handlers
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const downloadTxt = document.getElementById('ai-download-txt');
  const downloadMd = document.getElementById('ai-download-md');
  const downloadHtml = document.getElementById('ai-download-html');

  if (downloadTxt) {
    downloadTxt.addEventListener('click', function (e) {
      e.preventDefault();
      downloadFile(preview.innerText, 'ai-content.txt', 'text/plain');
    });
  }

  if (downloadMd) {
    downloadMd.addEventListener('click', function (e) {
      e.preventDefault();
      // Simple HTML to Markdown-ish conversion
      const content = preview.innerHTML
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<ul>|<\/ul>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      downloadFile(content, 'ai-content.md', 'text/markdown');
    });
  }

  if (downloadHtml) {
    downloadHtml.addEventListener('click', function (e) {
      e.preventDefault();
      downloadFile(preview.innerHTML, 'ai-content.html', 'text/html');
    });
  }

  // Update word count stats
  function updateStats() {
    const text = preview.innerText || '';
    const words = text.split(/\s+/).filter(function (w) { return w.length > 0; });
    const wordCount = words.length;
    const charCount = text.length;
    const paragraphs = preview.querySelectorAll('p').length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 250));

    const statWords = document.getElementById('ai-stat-words');
    const statReading = document.getElementById('ai-stat-reading');
    const statChars = document.getElementById('ai-stat-chars');
    const statParagraphs = document.getElementById('ai-stat-paragraphs');

    if (statWords) statWords.textContent = wordCount.toLocaleString();
    if (statReading) statReading.textContent = readingTime + ' min';
    if (statChars) statChars.textContent = charCount.toLocaleString();
    if (statParagraphs) statParagraphs.textContent = paragraphs;
  }
})();
