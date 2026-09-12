/**
 * TaskForge - Reusable Universal Modal Controller
 */

const Modal = {
  isOpen: false,
  overlay: null,
  container: null,
  titleEl: null,
  bodyEl: null,
  footerEl: null,
  closeBtn: null,

  init() {
    this.overlay = document.getElementById('global-modal-overlay');
    this.container = document.getElementById('global-modal-container');
    this.titleEl = document.getElementById('global-modal-title');
    this.bodyEl = document.getElementById('global-modal-body');
    this.footerEl = document.getElementById('global-modal-footer');
    this.closeBtn = document.getElementById('global-modal-close-btn');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }
  },

  /**
   * Opens the universal modal
   * @param {Object} options 
   */
  open({ title, body, footerButtons = [], size = 'md' }) {
    if (!this.overlay) this.init();

    this.titleEl.innerHTML = title || '';
    if (typeof body === 'string') {
      this.bodyEl.innerHTML = body;
    } else if (body instanceof HTMLElement) {
      this.bodyEl.innerHTML = '';
      this.bodyEl.appendChild(body);
    }

    // Set modal size class
    this.container.className = 'modal-container';
    if (size === 'lg') this.container.classList.add('modal-lg');
    if (size === 'xl') this.container.classList.add('modal-xl');

    // Build footer buttons
    this.footerEl.innerHTML = '';
    footerButtons.forEach(btn => {
      const buttonEl = document.createElement('button');
      buttonEl.className = `btn ${btn.class || 'btn-secondary'}`;
      buttonEl.innerHTML = btn.text;
      buttonEl.addEventListener('click', (e) => {
        if (btn.onClick) btn.onClick(e);
      });
      this.footerEl.appendChild(buttonEl);
    });

    this.overlay.classList.add('active');
    this.isOpen = true;
  },

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('active');
    this.isOpen = false;
  },

  /**
   * Standard confirmation dialog for destructive actions
   * @param {string} title 
   * @param {string} message 
   * @param {Function} onConfirm 
   */
  confirm(title, message, onConfirm) {
    this.open({
      title: `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-danger);"></i> ${Utils.escapeHTML(title)}`,
      body: `<p style="font-size: 14px; color: var(--text-primary); line-height: 1.5;">${message}</p>`,
      size: 'md',
      footerButtons: [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          onClick: () => this.close()
        },
        {
          text: 'Confirm',
          class: 'btn-danger',
          onClick: () => {
            this.close();
            if (onConfirm) onConfirm();
          }
        }
      ]
    });
  }
};
