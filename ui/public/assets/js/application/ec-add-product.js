(function () {
  'use strict';

  // ---- Quill Editor ----

  function initQuillEditor() {
    const editorEl = document.getElementById('ec-product-description');
    if (!editorEl) return;

    new Quill('#ec-product-description', {
      theme: 'snow',
      placeholder: 'Enter product description...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'link'],
          ['clean']
        ]
      }
    });
  }

  // ---- Dropzone Upload ----

  function initDropzone() {
    const dropzone = document.getElementById('ec-dropzone');
    if (!dropzone) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    dropzone.appendChild(fileInput);

    dropzone.addEventListener('click', function () {
      fileInput.click();
    });

    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('active');
    });

    dropzone.addEventListener('dragleave', function () {
      dropzone.classList.remove('active');
    });

    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('active');
      // Files would be handled here in a real implementation
    });

    fileInput.addEventListener('change', function () {
      // Files would be handled here in a real implementation
      fileInput.value = '';
    });
  }

  // ---- Image Preview Remove ----

  function initImagePreview() {
    const preview = document.getElementById('ec-image-preview');
    if (!preview) return;

    preview.addEventListener('click', function (e) {
      const removeBtn = e.target.closest('.ec-preview-remove');
      if (!removeBtn) return;

      const item = removeBtn.closest('.ec-preview-item');
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.8)';
        setTimeout(function () {
          item.remove();
        }, 200);
      }
    });
  }

  // ---- Tags Input ----

  function initTags() {
    const input = document.getElementById('ec-product-tags');
    const list = document.getElementById('ec-tags-list');
    if (!input || !list) return;

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      const value = input.value.trim();
      if (!value) return;

      const badge = document.createElement('span');
      badge.className = 'badge bg-primary me-1 mb-1';
      badge.innerHTML = value + ' <i class="ti ti-x ms-1" style="cursor:pointer"></i>';

      badge.querySelector('.ti-x').addEventListener('click', function () {
        badge.remove();
      });

      list.appendChild(badge);
      input.value = '';
    });
  }

  // ---- Action Buttons ----

  function initActions() {
    const saveDraft = document.getElementById('ec-save-draft');
    const preview = document.getElementById('ec-preview');
    const publish = document.getElementById('ec-publish');

    function handleAction(btn, message) {
      if (!btn) return;
      btn.addEventListener('click', function () {
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';

        setTimeout(function () {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
          alert(message);
        }, 1000);
      });
    }

    handleAction(saveDraft, 'Product saved as draft successfully!');
    handleAction(preview, 'Opening product preview...');
    handleAction(publish, 'Product published successfully!');
  }

  // ---- Init ----

  initQuillEditor();
  initDropzone();
  initImagePreview();
  initTags();
  initActions();
})();
