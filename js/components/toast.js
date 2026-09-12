/**
 * TaskForge - Non-blocking Toast Notification Controller
 */

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(type, title, message = '', duration = 3500) {
    if (!this.container) this.init();
    if (!this.container) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-check';
    if (type === 'info') iconClass = 'fa-circle-info';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    if (type === 'error') iconClass = 'fa-circle-xmark';

    toastEl.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${Utils.escapeHTML(title)}</div>
        ${message ? `<div class="toast-message">${Utils.escapeHTML(message)}</div>` : ''}
      </div>
      <button class="toast-close" title="Dismiss">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const closeBtn = toastEl.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(toastEl));

    this.container.appendChild(toastEl);

    // Trigger animation
    requestAnimationFrame(() => {
      toastEl.classList.add('show');
    });

    if (duration > 0) {
      setTimeout(() => this.dismiss(toastEl), duration);
    }
  },

  dismiss(toastEl) {
    if (!toastEl || !toastEl.parentNode) return;
    toastEl.classList.remove('show');
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 250);
  },

  success(title, message) { this.show('success', title, message); },
  info(title, message) { this.show('info', title, message); },
  warning(title, message) { this.show('warning', title, message); },
  error(title, message) { this.show('error', title, message, 5000); }
};
