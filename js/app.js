/**
 * TaskForge - Application Bootstrap & Lifecycle Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize State and LocalStorage Seed Data
  AppState.init();

  // 2. Initialize UI Components
  Toast.init();
  Modal.init();
  Sidebar.init();
  Notifications.init();
  CommandPalette.init();
  ContextMenu.init();
  KeyboardManager.init();

  // 3. Bind Topbar Controls
  bindTopbarControls();

  // 4. Setup Reactive State Subscriptions for Auto-Re-rendering
  setupStateSubscriptions();

  // 5. Check for overdue tasks to alert user
  Automations.checkOverdueAndAlert();

  // 6. Initialize Router
  Router.init();

  console.log('%cTaskForge Initialized 🚀', 'color: #388bfd; font-size: 14px; font-weight: bold;');
});

function bindTopbarControls() {
  // Quick Create Button
  const createBtn = document.getElementById('topbar-create-task-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => TaskModal.openCreate());
  }

  // Bulk Create Button
  const bulkCreateBtn = document.getElementById('topbar-bulk-create-btn');
  if (bulkCreateBtn) {
    bulkCreateBtn.addEventListener('click', () => TaskModal.openBulkCreate());
  }

  // Theme Toggle Button
  const themeBtn = document.getElementById('topbar-theme-toggle');
  if (themeBtn) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    themeBtn.innerHTML = currentTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    themeBtn.title = currentTheme === 'dark' ? 'Switch to Light Mode (T)' : 'Switch to Dark Mode (T)';
    themeBtn.addEventListener('click', () => ThemeManager.toggle());
  }

  // Floating Scroll to Top button for #view-container
  const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
  const viewContainer = document.getElementById('view-container');
  if (scrollToTopBtn && viewContainer) {
    viewContainer.addEventListener('scroll', () => {
      scrollToTopBtn.classList.toggle('visible', viewContainer.scrollTop > 220);
    }, { passive: true });

    scrollToTopBtn.addEventListener('click', () => {
      viewContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Project Context Picker Popover
  const pickerTrigger = document.getElementById('topbar-project-picker');
  const pickerPopover = document.getElementById('project-picker-popover');
  if (pickerTrigger && pickerPopover) {
    pickerTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = pickerPopover.style.display === 'block';
      if (isOpen) {
        pickerPopover.style.display = 'none';
      } else {
        closeAllTopbarPopovers();
        renderProjectPickerPopover(pickerPopover);
        const rect = pickerTrigger.getBoundingClientRect();
        pickerPopover.style.top = `${rect.bottom + 6}px`;
        pickerPopover.style.left = `${Math.max(12, rect.left)}px`;
        pickerPopover.style.display = 'block';
      }
    });
  }

  // User Avatar Profile Popover
  const avatarBtn = document.getElementById('topbar-user-avatar-btn');
  const userProfilePopover = document.getElementById('user-profile-popover');
  if (avatarBtn && userProfilePopover) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userProfilePopover.style.display === 'block';
      if (isOpen) {
        userProfilePopover.style.display = 'none';
      } else {
        closeAllTopbarPopovers();
        const rect = avatarBtn.getBoundingClientRect();
        userProfilePopover.style.top = `${rect.bottom + 6}px`;
        const rightOffset = window.innerWidth - rect.right;
        userProfilePopover.style.right = `${Math.max(12, rightOffset - 10)}px`;
        userProfilePopover.style.left = 'auto';
        userProfilePopover.style.display = 'block';
      }
    });

    document.getElementById('user-menu-settings')?.addEventListener('click', () => {
      userProfilePopover.style.display = 'none';
      Router.navigate('#/settings');
    });
    document.getElementById('user-menu-shortcuts')?.addEventListener('click', () => {
      userProfilePopover.style.display = 'none';
      KeyboardManager.showShortcutCheatSheet();
    });
    document.getElementById('user-menu-docs')?.addEventListener('click', () => {
      userProfilePopover.style.display = 'none';
      Router.navigate('#/docs');
    });
    document.getElementById('user-menu-theme')?.addEventListener('click', () => {
      userProfilePopover.style.display = 'none';
      ThemeManager.toggle();
    });
  }

  // Global click outside listener to close all popovers
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#project-picker-popover') && !e.target.closest('#topbar-project-picker')) {
      if (pickerPopover) pickerPopover.style.display = 'none';
    }
    if (!e.target.closest('#user-profile-popover') && !e.target.closest('#topbar-user-avatar-btn')) {
      if (userProfilePopover) userProfilePopover.style.display = 'none';
    }
  });

  // Sidebar shortcut helper button
  const shortcutsBtn = document.getElementById('btn-shortcuts-helper');
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', () => KeyboardManager.showShortcutCheatSheet());
  }

  // Quick Undo & Redo in sidebar footer
  const undoBtn = document.getElementById('btn-quick-undo');
  const redoBtn = document.getElementById('btn-quick-redo');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => AppState.undo());
  }
  if (redoBtn) {
    redoBtn.addEventListener('click', () => AppState.redo());
  }
}

function closeAllTopbarPopovers() {
  const picker = document.getElementById('project-picker-popover');
  const notif = document.getElementById('notifications-popover');
  const user = document.getElementById('user-profile-popover');
  if (picker) picker.style.display = 'none';
  if (notif) notif.style.display = 'none';
  if (user) user.style.display = 'none';
}

function renderProjectPickerPopover(popover) {
  popover.className = 'topbar-dropdown-popover tf-dropdown-menu';
  popover.innerHTML = `
    <div class="tf-dropdown-header">Filter by Project</div>
    <div class="tf-dropdown-items" style="max-height: 280px;">
      <button type="button" class="tf-dropdown-item ${!AppState.selectedProjectId ? 'is-selected' : ''}" data-id="">
        <span class="tf-dropdown-item-left">
          <i class="fa-solid fa-layer-group tf-dropdown-item-icon" style="color: ${!AppState.selectedProjectId ? 'var(--accent-primary)' : 'var(--text-muted)'};"></i>
          <span class="tf-dropdown-item-label">All Projects</span>
        </span>
        ${!AppState.selectedProjectId ? '<i class="fa-solid fa-check tf-dropdown-item-check"></i>' : ''}
      </button>
      <div class="tf-dropdown-divider"></div>
      ${AppState.projects.map(p => {
        const isSelected = AppState.selectedProjectId === p.id;
        return `
          <button type="button" class="tf-dropdown-item ${isSelected ? 'is-selected' : ''}" data-id="${p.id}">
            <span class="tf-dropdown-item-left">
              <span class="tf-dropdown-color-dot" style="background: ${p.color || '#388bfd'};"></span>
              <span class="tf-dropdown-item-label">${Utils.escapeHTML(p.name)}</span>
            </span>
            ${isSelected ? '<i class="fa-solid fa-check tf-dropdown-item-check"></i>' : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;

  popover.querySelectorAll('.tf-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id || null;
      AppState.selectedProjectId = id;
      popover.style.display = 'none';
      Router.updateTopbarProjectPicker();
      Router.renderCurrentRoute();
    });
  });
}

function setupStateSubscriptions() {
  // When tasks, projects, or filters mutate, re-render current view if drawer/modals aren't blocking
  AppState.subscribe('tasks:changed', () => {
    Router.renderCurrentRoute();
    Sidebar.updateCounters();
  });

  AppState.subscribe('projects:changed', () => {
    Router.renderCurrentRoute();
    Sidebar.renderProjectShortcuts();
    Sidebar.updateCounters();
  });

  AppState.subscribe('filters:changed', () => {
    Router.renderCurrentRoute();
  });

  AppState.subscribe('sprints:changed', () => {
    if (AppState.currentView === 'backlog') {
      Router.renderCurrentRoute();
    }
  });

  AppState.subscribe('goals:changed', () => {
    if (AppState.currentView === 'goals') {
      Router.renderCurrentRoute();
    }
  });
}
