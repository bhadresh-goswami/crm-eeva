'use strict';

(function () {
  const emailList = document.getElementById('emailList');
  const emailDetail = document.getElementById('emailDetail');
  const emailCompose = document.getElementById('emailCompose');
  const emailSidebar = document.getElementById('emailSidebar');
  const selectAllCheckbox = document.getElementById('selectAll');
  const searchInput = document.getElementById('emailSearch');

  let quillEditor = null;

  // ========================
  // View Management
  // ========================

  function showInbox() {
    emailList.classList.remove('d-none');
    emailDetail.classList.add('d-none');
    emailDetail.classList.remove('show');
    emailCompose.classList.add('d-none');
    emailCompose.classList.remove('show');
    // Deselect active email
    const activeItem = emailList.querySelector('.email-list-item.active');
    if (activeItem) activeItem.classList.remove('active');
  }

  function showDetail(emailId) {
    const item = emailList.querySelector('[data-email-id="' + emailId + '"]');
    if (!item) return;

    // Mark as read
    item.classList.remove('unread');

    // Set active state
    const allItems = emailList.querySelectorAll('.email-list-item');
    allItems.forEach(function (el) {
      el.classList.remove('active');
    });
    item.classList.add('active');

    // Populate detail view from clicked item
    const sender = item.querySelector('.email-sender').textContent;
    const subject = item.querySelector('.email-subject').textContent;
    const avatarEl = item.querySelector('.email-avatar');

    document.getElementById('detailSubject').textContent = subject;
    document.getElementById('detailSender').textContent = sender;
    document.getElementById('detailAvatar').textContent = avatarEl.textContent;
    document.getElementById('detailAvatar').style.background = avatarEl.style.background;

    // Show detail, hide others on mobile
    emailDetail.classList.remove('d-none');
    emailDetail.classList.add('show');
    emailCompose.classList.add('d-none');
    emailCompose.classList.remove('show');

    // On mobile, hide list
    if (window.innerWidth < 992) {
      emailList.classList.add('d-none');
    }
  }

  function showCompose(prefillSubject) {
    emailCompose.classList.remove('d-none');
    emailCompose.classList.add('show');
    emailDetail.classList.add('d-none');
    emailDetail.classList.remove('show');

    // On mobile, hide list
    if (window.innerWidth < 992) {
      emailList.classList.add('d-none');
    }

    // Pre-fill subject if provided (Reply/Forward)
    const subjectInput = document.getElementById('composeSubject');
    if (prefillSubject) {
      subjectInput.value = prefillSubject;
    } else {
      subjectInput.value = '';
    }

    // Clear other fields
    document.getElementById('composeTo').value = '';

    // Initialize Quill editor (lazy, once)
    initQuillEditor();
  }

  // ========================
  // Quill Editor (lazy init)
  // ========================

  function initQuillEditor() {
    if (quillEditor) return;
    const editorContainer = document.getElementById('composeEditor');
    if (!editorContainer) return;

    quillEditor = new Quill('#composeEditor', {
      theme: 'snow',
      placeholder: 'Write your message...',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'blockquote'],
          ['clean']
        ]
      }
    });
  }

  // ========================
  // Email Item Click
  // ========================

  function initEmailListClicks() {
    if (!emailList) return;

    emailList.addEventListener('click', function (e) {
      // Ignore clicks on checkboxes and stars
      if (e.target.closest('.form-check') || e.target.closest('.email-star')) return;

      const item = e.target.closest('.email-list-item');
      if (!item) return;

      const emailId = item.getAttribute('data-email-id');
      showDetail(emailId);
    });
  }

  // ========================
  // Star Toggle
  // ========================

  function initStarToggle() {
    if (!emailList) return;

    emailList.addEventListener('click', function (e) {
      const starEl = e.target.closest('.email-star');
      if (!starEl) return;

      e.stopPropagation();
      const item = starEl.closest('.email-list-item');
      if (!item) return;

      item.classList.toggle('starred');
      const icon = starEl.querySelector('i');
      if (item.classList.contains('starred')) {
        icon.className = 'ti ti-star-filled';
      } else {
        icon.className = 'ti ti-star';
      }
    });
  }

  // ========================
  // Select All
  // ========================

  function initSelectAll() {
    if (!selectAllCheckbox) return;

    selectAllCheckbox.addEventListener('change', function () {
      const checked = this.checked;
      const checkboxes = emailList.querySelectorAll('.email-list-item .form-check-input');
      checkboxes.forEach(function (cb) {
        cb.checked = checked;
      });
    });
  }

  // ========================
  // Folder Navigation
  // ========================

  function initFolderNav() {
    const folderItems = document.querySelectorAll('.email-folder-item');
    folderItems.forEach(function (item) {
      item.addEventListener('click', function () {
        folderItems.forEach(function (el) {
          el.classList.remove('active');
        });
        this.classList.add('active');

        // Close mobile sidebar
        emailSidebar.classList.remove('show');
      });
    });
  }

  // ========================
  // Back to Inbox
  // ========================

  function initBackButton() {
    const backBtn = document.getElementById('backToInbox');
    if (!backBtn) return;

    backBtn.addEventListener('click', function () {
      showInbox();
    });
  }

  // ========================
  // Compose Button
  // ========================

  function initComposeButton() {
    const composeBtn = document.getElementById('composeBtn');
    if (!composeBtn) return;

    composeBtn.addEventListener('click', function () {
      showCompose();
      // Close mobile sidebar
      emailSidebar.classList.remove('show');
    });
  }

  // ========================
  // Close Compose
  // ========================

  function initCloseCompose() {
    const closeBtn = document.getElementById('closeCompose');
    if (!closeBtn) return;

    closeBtn.addEventListener('click', function () {
      showInbox();
    });

    const discardBtn = document.getElementById('discardBtn');
    if (discardBtn) {
      discardBtn.addEventListener('click', function () {
        showInbox();
      });
    }
  }

  // ========================
  // Reply & Forward
  // ========================

  function initReplyForward() {
    const replyBtn = document.getElementById('replyBtn');
    if (replyBtn) {
      replyBtn.addEventListener('click', function () {
        const subject = document.getElementById('detailSubject').textContent;
        const reSubject = subject.startsWith('Re: ') ? subject : 'Re: ' + subject;
        showCompose(reSubject);
      });
    }

    const forwardBtn = document.getElementById('forwardBtn');
    if (forwardBtn) {
      forwardBtn.addEventListener('click', function () {
        const subject = document.getElementById('detailSubject').textContent;
        const fwdSubject = subject.startsWith('Fwd: ') ? subject : 'Fwd: ' + subject;
        showCompose(fwdSubject);
      });
    }
  }

  // ========================
  // Mobile Sidebar Toggle
  // ========================

  function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', function () {
      emailSidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', function (e) {
      if (
        emailSidebar.classList.contains('show') &&
        !emailSidebar.contains(e.target) &&
        !e.target.closest('#sidebarToggle')
      ) {
        emailSidebar.classList.remove('show');
      }
    });
  }

  // ========================
  // Search
  // ========================

  function initSearch() {
    if (!searchInput) return;

    searchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase().trim();
      const items = emailList.querySelectorAll('.email-list-item');

      items.forEach(function (item) {
        const sender = item.querySelector('.email-sender').textContent.toLowerCase();
        const subject = item.querySelector('.email-subject').textContent.toLowerCase();
        const matches = !query || sender.indexOf(query) !== -1 || subject.indexOf(query) !== -1;
        item.style.display = matches ? '' : 'none';
      });
    });
  }

  // ========================
  // CC/BCC Toggle
  // ========================

  function initCcBccToggle() {
    const showCc = document.getElementById('showCc');
    const showBcc = document.getElementById('showBcc');
    const ccField = document.getElementById('ccField');
    const bccField = document.getElementById('bccField');

    if (showCc && ccField) {
      showCc.addEventListener('click', function (e) {
        e.preventDefault();
        ccField.classList.toggle('d-none');
      });
    }

    if (showBcc && bccField) {
      showBcc.addEventListener('click', function (e) {
        e.preventDefault();
        bccField.classList.toggle('d-none');
      });
    }
  }

  // ========================
  // Initialize
  // ========================

  initEmailListClicks();
  initStarToggle();
  initSelectAll();
  initFolderNav();
  initBackButton();
  initComposeButton();
  initCloseCompose();
  initReplyForward();
  initSidebarToggle();
  initSearch();
  initCcBccToggle();
})();
