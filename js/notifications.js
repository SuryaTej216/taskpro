/**
 * TaskForge - In-App Notification Center
 */

const Notifications = {
  init() {
    this.updateBadge();
    this.setupListeners();
  },

  setupListeners() {
    const bellBtn = document.getElementById('topbar-notifications-btn');
    const popover = document.getElementById('notifications-popover');
    const markAllBtn = document.getElementById('btn-mark-all-read');
    const clearBtn = document.getElementById('btn-clear-notifications');

    if (bellBtn && popover) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = popover.style.display === 'flex';
        popover.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen) this.render();
      });

      document.addEventListener('click', (e) => {
        if (!popover.contains(e.target) && e.target !== bellBtn) {
          popover.style.display = 'none';
        }
      });
    }

    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllAsRead());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAll());
    }
  },

  updateBadge() {
    const badge = document.getElementById('notification-unread-dot');
    const unreadCount = AppState.notifications.filter(n => !n.read).length;
    if (badge) {
      badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
  },

  render() {
    const listEl = document.getElementById('notifications-list');
    if (!listEl) return;

    if (AppState.notifications.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          <i class="fa-regular fa-bell-slash" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
          No notifications
        </div>
      `;
      return;
    }

    listEl.innerHTML = AppState.notifications.map(n => `
      <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}" data-task-id="${n.taskId || ''}" style="padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 4px; background: ${n.read ? 'transparent' : 'var(--accent-primary-subtle)'}; cursor: pointer; display: flex; gap: 10px; align-items: flex-start; transition: background var(--transition-fast);">
        <i class="fa-solid ${n.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'}" style="color: ${n.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-primary)'}; margin-top: 2px;"></i>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 12px; color: var(--text-primary);">${Utils.escapeHTML(n.title)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${Utils.escapeHTML(n.message)}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">${Utils.formatRelativeDate(n.timestamp)}</div>
        </div>
        ${!n.read ? `<span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-primary); margin-top: 6px;"></span>` : ''}
      </div>
    `).join('');

    // Attach click listeners to open related tasks
    listEl.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const taskId = item.dataset.taskId;
        this.markAsRead(id);
        if (taskId) {
          TaskModal.openDetail(taskId);
          document.getElementById('notifications-popover').style.display = 'none';
        }
      });
    });
  },

  addNotification({ title, message, type = 'info', taskId = null }) {
    const notif = {
      id: Utils.generateId('notif_'),
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      taskId
    };

    AppState.notifications.unshift(notif);
    if (AppState.notifications.length > 50) AppState.notifications.pop();
    StorageService.set(StorageService.KEYS.NOTIFICATIONS, AppState.notifications);
    this.updateBadge();
    Toast[type === 'warning' ? 'warning' : 'info'](title, message);
  },

  markAsRead(id) {
    const notif = AppState.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      StorageService.set(StorageService.KEYS.NOTIFICATIONS, AppState.notifications);
      this.updateBadge();
      this.render();
    }
  },

  markAllAsRead() {
    AppState.notifications.forEach(n => n.read = true);
    StorageService.set(StorageService.KEYS.NOTIFICATIONS, AppState.notifications);
    this.updateBadge();
    this.render();
  },

  clearAll() {
    AppState.notifications = [];
    StorageService.set(StorageService.KEYS.NOTIFICATIONS, AppState.notifications);
    this.updateBadge();
    this.render();
  }
};
