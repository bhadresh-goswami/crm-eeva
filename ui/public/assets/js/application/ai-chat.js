(function () {
  'use strict';

  // Elements
  const messagesContainer = document.getElementById('ai-messages');
  const inputField = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');
  const newChatBtn = document.getElementById('ai-new-chat');
  const sidebarToggle = document.getElementById('ai-sidebar-toggle');
  const sidebar = document.getElementById('ai-chat-sidebar');
  const modelName = document.getElementById('ai-model-name');
  const modelBadgeText = document.getElementById('ai-model-badge-text');
  const typingIndicator = document.getElementById('ai-typing');

  // Guard clause
  if (!messagesContainer || !inputField) return;

  // Highlight initial code blocks
  if (typeof Prism !== 'undefined') {
    Prism.highlightAll();
  }

  // Auto-resize textarea
  inputField.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Send on Enter (Shift+Enter for newline)
  inputField.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Send button click
  sendBtn.addEventListener('click', function () {
    sendMessage();
  });

  // Escape HTML for XSS prevention
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Send message
  function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-message ai-message-user';
    userMsg.innerHTML =
      '<div class="ai-message-avatar ai-avatar-user"><i class="ti ti-user f-16"></i></div>' +
      '<div class="ai-message-content"><p>' +
      escapeHtml(text) +
      '</p></div>';

    // Insert before typing indicator
    if (typingIndicator) {
      messagesContainer.insertBefore(userMsg, typingIndicator);
    } else {
      messagesContainer.appendChild(userMsg);
    }

    // Clear input and reset height
    inputField.value = '';
    inputField.style.height = 'auto';

    // Show typing indicator
    if (typingIndicator) {
      typingIndicator.style.display = 'flex';
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Simulate AI response after 1.5s
    setTimeout(function () {
      addAssistantMessage(
        '<p>That\'s a great question! Let me think about that and provide a detailed response.</p>' +
          '<p>Based on your input, here are some key points to consider:</p>' +
          '<ul><li>Make sure to validate all input data on the server side</li>' +
          '<li>Use middleware for consistent error handling</li>' +
          '<li>Consider using a validation library like Joi or express-validator</li></ul>' +
          '<p>Would you like me to elaborate on any of these points?</p>'
      );
    }, 1500);
  }

  // Add assistant message
  function addAssistantMessage(html) {
    // Hide typing indicator
    if (typingIndicator) {
      typingIndicator.style.display = 'none';
    }

    const assistantMsg = document.createElement('div');
    assistantMsg.className = 'ai-message ai-message-assistant';
    assistantMsg.innerHTML =
      '<div class="ai-message-avatar ai-avatar-bot"><i class="ti ti-robot f-16"></i></div>' +
      '<div class="ai-message-content">' +
      html +
      '</div>';

    if (typingIndicator) {
      messagesContainer.insertBefore(assistantMsg, typingIndicator);
    } else {
      messagesContainer.appendChild(assistantMsg);
    }

    // Highlight code blocks in new message
    if (typeof Prism !== 'undefined') {
      const codeBlocks = assistantMsg.querySelectorAll('pre code');
      codeBlocks.forEach(function (block) {
        Prism.highlightElement(block);
      });
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Mobile sidebar toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (e) {
      if (
        sidebar.classList.contains('show') &&
        !sidebar.contains(e.target) &&
        !sidebarToggle.contains(e.target)
      ) {
        sidebar.classList.remove('show');
      }
    });
  }

  // Model selector
  const modelItems = document.querySelectorAll('[data-model]');
  modelItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const model = this.getAttribute('data-model');
      if (modelName) modelName.textContent = model;
      if (modelBadgeText) modelBadgeText.textContent = model;
    });
  });

  // Conversation item click (active state toggle)
  const conversationItems = document.querySelectorAll('.ai-conversation-item');
  conversationItems.forEach(function (item) {
    item.addEventListener('click', function () {
      conversationItems.forEach(function (el) {
        el.classList.remove('active');
      });
      this.classList.add('active');
    });
  });

  // New chat button
  if (newChatBtn) {
    newChatBtn.addEventListener('click', function () {
      // Remove all messages except typing indicator
      const messages = messagesContainer.querySelectorAll('.ai-message:not(#ai-typing)');
      messages.forEach(function (msg) {
        msg.remove();
      });

      // Hide typing indicator
      if (typingIndicator) {
        typingIndicator.style.display = 'none';
      }

      // Remove active state from conversations
      conversationItems.forEach(function (el) {
        el.classList.remove('active');
      });

      // Focus input
      inputField.focus();
    });
  }
})();
