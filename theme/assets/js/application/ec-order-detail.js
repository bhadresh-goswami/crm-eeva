(function () {
  'use strict';

  // ---- Print Button ----

  const printBtn = document.getElementById('ec-order-print');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }

  // ---- Add Note ----

  const noteInput = document.getElementById('ec-note-input');
  const addNoteBtn = document.getElementById('ec-add-note');
  const notesList = document.getElementById('ec-notes-list');

  if (addNoteBtn && noteInput && notesList) {
    addNoteBtn.addEventListener('click', function () {
      const text = noteInput.value.trim();
      if (!text) return;

      const now = new Date();
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
      const timestamp = now.toLocaleDateString('en-US', options);

      const noteEl = document.createElement('div');
      noteEl.className = 'border rounded p-3 mb-2';
      noteEl.innerHTML =
        '<div class="d-flex justify-content-between mb-1">' +
        '<span class="fw-medium">Admin</span>' +
        '<small class="text-muted">' + timestamp + '</small>' +
        '</div>' +
        '<p class="mb-0 text-muted">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';

      notesList.insertBefore(noteEl, notesList.firstChild);
      noteInput.value = '';
    });
  }
})();
