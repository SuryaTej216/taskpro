/**
 * TaskForge - Command Palette (Ctrl+K)
 */

const CommandPalette = {
  isOpen: false,
  modalEl: null,
  inputEl: null,
  resultsEl: null,
  selectedIndex: 0,
  currentItems: [],

  init() {
    this.modalEl = document.getElementById('command-palette-modal');
    this.inputEl = document.getElementById('command-palette-input');
    this.resultsEl = document.getElementById('command-palette-results');

    // Open trigger on topbar
    const searchTrigger = document.getElementById('topbar-search-trigger');
    if (searchTrigger) {
      searchTrigger.addEventListener('click', () => this.open());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }

    if (this.inputEl) {
      this.inputEl.addEventListener('input', () => this.handleInput());
      this.inputEl.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
  },

  open() {
    if (!this.modalEl) this.init();
    this.modalEl.classList.add('active');
    this.isOpen = true;
    this.inputEl.value = '';
    this.selectedIndex = 0;
    this.handleInput();
    setTimeout(() => this.inputEl.focus(), 50);
  },

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('active');
    this.isOpen = false;
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  /**
   * Generates default command list + real-time search results
   */
  handleInput() {
    const query = this.inputEl.value.trim().toLowerCase();
    const items = [];

    // 1. Navigation Commands
    const navCommands = [
      { id: 'nav_dash', title: 'Go to Dashboard', icon: 'fa-chart-pie', category: 'Navigation', action: () => Router.navigate('dashboard') },
      { id: 'nav_mywork', title: 'Go to My Work', icon: 'fa-briefcase', category: 'Navigation', action: () => Router.navigate('my-work') },
      { id: 'nav_board', title: 'Go to Kanban Board', icon: 'fa-table-columns', category: 'Navigation', action: () => Router.navigate('board') },
      { id: 'nav_backlog', title: 'Go to Backlog & Sprints', icon: 'fa-layer-group', category: 'Navigation', action: () => Router.navigate('backlog') },
      { id: 'nav_projects', title: 'Go to Projects', icon: 'fa-folder-tree', category: 'Navigation', action: () => Router.navigate('projects') },
      { id: 'nav_timeline', title: 'Go to Timeline / Gantt', icon: 'fa-chart-gantt', category: 'Navigation', action: () => Router.navigate('timeline') },
      { id: 'nav_cal', title: 'Go to Calendar', icon: 'fa-calendar-days', category: 'Navigation', action: () => Router.navigate('calendar') },
      { id: 'nav_list', title: 'Go to List View', icon: 'fa-list-check', category: 'Navigation', action: () => Router.navigate('list') },
      { id: 'nav_rep', title: 'Go to Reports & Analytics', icon: 'fa-chart-line', category: 'Navigation', action: () => Router.navigate('reports') },
      { id: 'nav_goals', title: 'Go to Goals', icon: 'fa-flag-checkered', category: 'Navigation', action: () => Router.navigate('goals') },
      { id: 'nav_focus', title: 'Go to Focus Mode (Pomodoro)', icon: 'fa-bullseye', category: 'Navigation', action: () => Router.navigate('focus') },
      { id: 'nav_settings', title: 'Go to Settings', icon: 'fa-gear', category: 'Navigation', action: () => Router.navigate('settings') },
      { id: 'nav_docs', title: 'Go to Documentation & Guide', icon: 'fa-book-open', category: 'Navigation', action: () => Router.navigate('docs') }
    ];

    // 2. Action Commands
    const actionCommands = [
      { id: 'act_new_task', title: 'Create New Task', icon: 'fa-plus', kbd: 'C', category: 'Actions', action: () => TaskModal.openCreate() },
      { id: 'act_theme', title: 'Toggle Dark / Light Theme', icon: 'fa-circle-half-stroke', kbd: 'T', category: 'Actions', action: () => ThemeManager.toggle() },
      { id: 'act_export_json', title: 'Export Full Backup (JSON)', icon: 'fa-download', category: 'Actions', action: () => SettingsView.downloadBackup() },
      { id: 'act_export_csv', title: 'Export Tasks to CSV', icon: 'fa-file-csv', category: 'Actions', action: () => SettingsView.downloadCSV() },
      { id: 'act_shortcuts', title: 'Show Keyboard Shortcuts', icon: 'fa-keyboard', kbd: '?', category: 'Actions', action: () => KeyboardManager.showShortcutCheatSheet() },
      { id: 'act_docs', title: 'View Full Documentation & Architecture', icon: 'fa-book-open', category: 'Actions', action: () => Router.navigate('docs') }
    ];

    // Filter commands by query
    navCommands.forEach(c => {
      if (!query || c.title.toLowerCase().includes(query)) items.push(c);
    });
    actionCommands.forEach(c => {
      if (!query || c.title.toLowerCase().includes(query)) items.push(c);
    });

    // 3. Search matched Tasks
    if (query) {
      const matchedTasks = SearchEngine.search(query).filter(r => r.type === 'task').slice(0, 8);
      matchedTasks.forEach(r => {
        items.push({
          id: `task_${r.item.id}`,
          title: `${r.item.key}: ${r.item.title}`,
          icon: 'fa-file-lines',
          category: 'Tasks',
          action: () => TaskModal.openDetail(r.item.id)
        });
      });
    }

    this.currentItems = items;
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, items.length - 1));
    this.render();
  },

  render() {
    if (!this.resultsEl) return;

    if (this.currentItems.length === 0) {
      this.resultsEl.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          No matching commands or tasks found.
        </div>
      `;
      return;
    }

    // Group by category
    let html = '';
    let currentCategory = '';

    this.currentItems.forEach((item, index) => {
      if (item.category !== currentCategory) {
        currentCategory = item.category;
        html += `<div class="command-group-label">${currentCategory}</div>`;
      }

      const isSelected = index === this.selectedIndex;
      html += `
        <div class="command-item ${isSelected ? 'selected' : ''}" data-index="${index}">
          <i class="fa-solid ${item.icon}"></i>
          <span>${Utils.escapeHTML(item.title)}</span>
          ${item.kbd ? `<kbd class="command-item-kbd">${item.kbd}</kbd>` : ''}
        </div>
      `;
    });

    this.resultsEl.innerHTML = html;

    // Attach click events
    this.resultsEl.querySelectorAll('.command-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index, 10);
        this.executeItem(idx);
      });
    });

    // Scroll selected item into view
    const selectedEl = this.resultsEl.querySelector('.command-item.selected');
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  },

  handleKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.currentItems.length;
      this.render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.currentItems.length) % this.currentItems.length;
      this.render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.executeItem(this.selectedIndex);
    }
  },

  executeItem(index) {
    const item = this.currentItems[index];
    if (item && item.action) {
      this.close();
      item.action();
    }
  }
};
