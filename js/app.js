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
    themeBtn.addEventListener('click', () => ThemeManager.toggle());
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
        renderProjectPickerPopover(pickerPopover);
        pickerPopover.style.display = 'block';
      }
    });

    document.addEventListener('click', (e) => {
      if (!pickerPopover.contains(e.target) && e.target !== pickerTrigger) {
        pickerPopover.style.display = 'none';
      }
    });
  }

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

function renderProjectPickerPopover(popover) {
  popover.innerHTML = `
    <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--text-muted); padding: 4px 8px;">
      Filter by Project
    </div>
    <div class="nav-item ${!AppState.selectedProjectId ? 'active' : ''}" data-id="" style="padding: 6px 10px; font-size: 12px; cursor: pointer;">
      <i class="fa-solid fa-asterisk"></i>
      <span>All Projects</span>
    </div>
    ${AppState.projects.map(p => `
      <div class="nav-item ${AppState.selectedProjectId === p.id ? 'active' : ''}" data-id="${p.id}" style="padding: 6px 10px; font-size: 12px; cursor: pointer;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p.color || '#388bfd'};"></span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${Utils.escapeHTML(p.name)}</span>
      </div>
    `).join('')}
  `;

  popover.querySelectorAll('.nav-item').forEach(item => {
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
