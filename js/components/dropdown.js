/**
 * TaskForge - Universal Single Dropdown UI/UX Engine
 * 
 * Provides a single, unified, premium dropdown interaction model throughout the entire app:
 * - High-clarity frosted glass popovers with smooth enter animations
 * - Rich semantic indicators: Status icons & colored badges, Priority severity arrows,
 *   Project color dots, Sprint runner badges, and Issue Type glyphs
 * - Crisp active checkmark for selected state
 * - Viewport-aware smart auto-positioning & flipping (never overflows screen)
 * - Full keyboard navigation (Arrow Up/Down, Enter, Esc, Type-ahead search)
 * - Seamless bi-directional synchronization with underlying HTMLSelectElement
 * - Micro-search filtering for long lists
 */

const DropdownUI = {
  menuEl: null,
  activeTrigger: null,
  activeSelect: null,
  activeItems: [],
  focusedIndex: -1,
  onSelectCallback: null,
  isInitialized: false,
  observer: null,

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Create single global floating dropdown menu portal
    this.menuEl = document.createElement('div');
    this.menuEl.id = 'tf-dropdown-floating-menu';
    this.menuEl.className = 'tf-dropdown-menu';
    this.menuEl.setAttribute('role', 'listbox');
    this.menuEl.setAttribute('aria-orientation', 'vertical');
    document.body.appendChild(this.menuEl);

    // Global outside click handler
    document.addEventListener('click', (e) => {
      if (!this.isOpen()) return;
      if (this.menuEl.contains(e.target)) return;
      if (this.activeTrigger && this.activeTrigger.contains(e.target)) return;
      this.close();
    }, true);

    // Global keyboard handler
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      this.handleKeyDown(e);
    });

    // Window scroll handler (auto-close on page scroll)
    window.addEventListener('scroll', (e) => {
      if (!this.isOpen()) return;
      // If scrolling inside the dropdown itself, don't close
      if (e.target && this.menuEl.contains(e.target)) return;
      this.close();
    }, true);

    // Window resize handler
    window.addEventListener('resize', () => {
      if (this.isOpen()) this.close();
    });

    // Setup MutationObserver to automatically enhance dynamically created selects
    this.setupMutationObserver();

    // Initial pass on existing DOM
    this.initAll(document);
  },

  setupMutationObserver() {
    if (this.observer || typeof MutationObserver === 'undefined') return;
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'SELECT' || node.querySelector('select')) {
                shouldScan = true;
                break;
              }
            }
          }
        }
        if (shouldScan) break;
      }
      if (shouldScan) {
        this.initAll(document);
      }
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  },

  isOpen() {
    return this.menuEl && this.menuEl.classList.contains('is-open');
  },

  /**
   * Resolves semantic icon, color, and badge for option items
   */
  resolveOptionMeta(value, text, selectEl) {
    const val = String(value || '').toLowerCase().trim();
    const rawText = String(text || '').trim();
    const cleanLabel = rawText.replace(/^[⚡\s]+/, '').replace(/\s*\[.*?\]$/, '').trim() || rawText;

    const selectId = (selectEl?.id || '').toLowerCase();
    const isStatus = selectId.includes('status') || ['backlog', 'todo', 'inprogress', 'inreview', 'done', 'blocked', 'cancelled'].includes(val);
    const isPriority = selectId.includes('prio') || ['critical', 'highest', 'high', 'medium', 'low', 'lowest'].includes(val);
    const isType = selectId.includes('type') || ['task', 'subtask', 'story', 'bug', 'epic', 'improvement'].includes(val);
    const isSprint = selectId.includes('sprint');
    const isProject = selectId.includes('project') || selectId.includes('proj');
    const isEpic = selectId.includes('epic');
    const isRecurring = selectId.includes('recurring');

    // 1. Statuses
    if (isStatus || ['backlog', 'todo', 'inprogress', 'inreview', 'done', 'blocked', 'cancelled'].includes(val)) {
      const statusMap = {
        backlog: { icon: 'fa-solid fa-inbox', color: '#64748B', label: 'Backlog' },
        todo: { icon: 'fa-regular fa-circle', color: '#2563EB', label: 'To Do' },
        inprogress: { icon: 'fa-solid fa-spinner', color: '#EA580C', label: 'In Progress' },
        inreview: { icon: 'fa-solid fa-eye', color: '#9333EA', label: 'In Review' },
        done: { icon: 'fa-solid fa-circle-check', color: '#059669', label: 'Done' },
        blocked: { icon: 'fa-solid fa-ban', color: '#DC2626', label: 'Blocked' },
        cancelled: { icon: 'fa-solid fa-xmark', color: '#94A3B8', label: 'Cancelled' },
        active: { icon: 'fa-solid fa-bolt', color: '#2563EB', label: 'Active (Incomplete)' },
        all: { icon: 'fa-solid fa-list-check', color: 'var(--text-muted)', label: 'All Statuses' }
      };
      if (statusMap[val]) {
        return {
          icon: statusMap[val].icon,
          iconColor: statusMap[val].color,
          label: cleanLabel || statusMap[val].label
        };
      }
    }

    // 2. Priorities
    if (isPriority || ['critical', 'highest', 'high', 'medium', 'low', 'lowest'].includes(val)) {
      const prioMap = {
        critical: { icon: 'fa-solid fa-angles-up', color: '#DC2626', label: 'Critical' },
        highest: { icon: 'fa-solid fa-angle-up', color: '#EA580C', label: 'Highest' },
        high: { icon: 'fa-solid fa-angle-up', color: '#D97706', label: 'High' },
        medium: { icon: 'fa-solid fa-minus', color: '#EAB308', label: 'Medium' },
        low: { icon: 'fa-solid fa-angle-down', color: '#3B82F6', label: 'Low' },
        lowest: { icon: 'fa-solid fa-angles-down', color: '#94A3B8', label: 'Lowest' },
        all: { icon: 'fa-solid fa-layer-group', color: 'var(--text-muted)', label: 'All Priorities' }
      };
      if (prioMap[val] || val === '') {
        const item = prioMap[val] || { icon: 'fa-solid fa-layer-group', color: 'var(--text-muted)', label: 'All Priorities' };
        return {
          icon: item.icon,
          iconColor: item.color,
          label: cleanLabel || item.label
        };
      }
    }

    // 3. Issue Types
    if (isType || ['task', 'subtask', 'story', 'bug', 'epic', 'improvement'].includes(val)) {
      const typeMap = {
        task: { icon: 'fa-solid fa-square-check', color: '#3B82F6', label: 'Task' },
        subtask: { icon: 'fa-solid fa-diagram-next', color: '#8B5CF6', label: 'Subtask' },
        story: { icon: 'fa-solid fa-bookmark', color: '#10B981', label: 'Story' },
        bug: { icon: 'fa-solid fa-circle-dot', color: '#EF4444', label: 'Bug' },
        epic: { icon: 'fa-solid fa-bolt', color: '#A855F7', label: 'Epic' },
        improvement: { icon: 'fa-solid fa-arrow-trend-up', color: '#06B6D4', label: 'Improvement' }
      };
      if (typeMap[val]) {
        return {
          icon: typeMap[val].icon,
          iconColor: typeMap[val].color,
          label: cleanLabel || typeMap[val].label
        };
      }
    }

    // 4. Projects
    if (isProject || (typeof AppState !== 'undefined' && AppState.projects && AppState.projects.some(p => p.id === value))) {
      if (val === 'all' || val === '') {
        return {
          icon: 'fa-solid fa-folder-tree',
          iconColor: 'var(--text-muted)',
          label: cleanLabel || 'All Projects'
        };
      }
      const project = typeof AppState !== 'undefined' ? AppState.projects.find(p => p.id === value) : null;
      if (project) {
        return {
          colorDot: project.color || '#388bfd',
          label: cleanLabel || `${project.name} (${project.key})`,
          subLabel: project.key
        };
      }
    }

    // 5. Sprints
    if (isSprint || (typeof AppState !== 'undefined' && AppState.sprints && AppState.sprints.some(s => s.id === value))) {
      if (val === '__backlog__' || val === '') {
        return {
          icon: 'fa-solid fa-box-archive',
          iconColor: 'var(--text-muted)',
          label: cleanLabel || 'None (Backlog Pool)'
        };
      }
      if (val === 'all') {
        return {
          icon: 'fa-solid fa-person-running',
          iconColor: 'var(--text-muted)',
          label: 'All Sprints'
        };
      }
      const sprint = typeof AppState !== 'undefined' ? AppState.sprints.find(s => s.id === value) : null;
      if (sprint) {
        const isActive = sprint.status === 'active';
        return {
          icon: 'fa-solid fa-person-running',
          iconColor: isActive ? '#F59E0B' : 'var(--text-muted)',
          badge: sprint.status.toUpperCase(),
          badgeClass: isActive ? 'tf-badge-active' : 'tf-badge-subtle',
          label: sprint.name
        };
      }
    }

    // 6. Epics
    if (isEpic || (typeof AppState !== 'undefined' && AppState.epics && AppState.epics.some(e => e.id === value))) {
      if (val === '') {
        return {
          icon: 'fa-solid fa-ban',
          iconColor: 'var(--text-muted)',
          label: 'None'
        };
      }
      const epic = typeof AppState !== 'undefined' ? AppState.epics.find(e => e.id === value) : null;
      if (epic) {
        return {
          icon: 'fa-solid fa-bolt',
          iconColor: '#A855F7',
          label: epic.title
        };
      }
    }

    // 7. Recurring Frequencies
    if (isRecurring || ['daily', 'weekly', 'monthly'].includes(val)) {
      const recMap = {
        daily: { icon: 'fa-solid fa-rotate-right', color: '#3B82F6', label: 'Daily' },
        weekly: { icon: 'fa-solid fa-calendar-week', color: '#10B981', label: 'Weekly' },
        monthly: { icon: 'fa-solid fa-calendar', color: '#8B5CF6', label: 'Monthly' },
        '': { icon: 'fa-solid fa-ban', color: 'var(--text-muted)', label: 'None' }
      };
      if (recMap[val]) {
        return {
          icon: recMap[val].icon,
          iconColor: recMap[val].color,
          label: cleanLabel || recMap[val].label
        };
      }
    }

    // 8. Projects View Status
    if (val === 'planning') return { icon: 'fa-solid fa-compass', iconColor: '#8B5CF6', label: 'Planning' };
    if (val === 'on-hold') return { icon: 'fa-solid fa-pause', iconColor: '#F59E0B', label: 'On Hold' };
    if (val === 'completed') return { icon: 'fa-solid fa-circle-check', iconColor: '#059669', label: 'Completed' };
    if (val === 'archived') return { icon: 'fa-solid fa-box-archive', iconColor: '#64748B', label: 'Archived' };

    // 9. Focus view task list (key detection)
    const keyMatch = cleanLabel.match(/^([A-Z0-9]+-[0-9]+):\s*(.*)$/);
    if (keyMatch) {
      return {
        taskKey: keyMatch[1],
        label: keyMatch[2] || keyMatch[1]
      };
    }

    // Generic fallback
    return {
      label: cleanLabel || rawText || '(None)'
    };
  },

  /**
   * Enhances a single native select element with a custom trigger & unified popover
   */
  enhance(selectEl) {
    if (!selectEl || selectEl._tfEnhanced) {
      if (selectEl?._tfEnhanced) this.sync(selectEl);
      return selectEl?._tfTrigger;
    }

    if (selectEl.dataset.noCustom === 'true') return null;

    selectEl._tfEnhanced = true;

    // Hide original select visually while keeping it in DOM for form validation & value queries
    selectEl.classList.add('tf-select-hidden');
    selectEl.tabIndex = -1;

    // Create trigger button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tf-dropdown-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    // Inherit contextual style classes
    if (selectEl.classList.contains('form-select')) trigger.classList.add('tf-trigger-form');
    if (selectEl.classList.contains('bulk-select')) trigger.classList.add('tf-trigger-bulk');
    if (selectEl.classList.contains('timeline-filter-select')) trigger.classList.add('tf-trigger-filter');
    if (selectEl.id && selectEl.id.includes('filter')) trigger.classList.add('tf-trigger-filter');

    // Copy inline width or constraints if present
    if (selectEl.style.width) trigger.style.width = selectEl.style.width;
    if (selectEl.style.maxWidth) trigger.style.maxWidth = selectEl.style.maxWidth;
    if (selectEl.style.minWidth) trigger.style.minWidth = selectEl.style.minWidth;
    if (selectEl.title) trigger.title = selectEl.title;

    // Cross-reference instances
    trigger._tfSelect = selectEl;
    selectEl._tfTrigger = trigger;

    // Insert trigger right next to the select
    if (selectEl.nextSibling) {
      selectEl.parentNode.insertBefore(trigger, selectEl.nextSibling);
    } else {
      selectEl.parentNode.appendChild(trigger);
    }

    // Intercept .value setter on this select element instance so programmatic changes sync trigger
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (originalDescriptor) {
      Object.defineProperty(selectEl, 'value', {
        get() {
          return originalDescriptor.get.call(this);
        },
        set(v) {
          originalDescriptor.set.call(this, v);
          DropdownUI.sync(this);
        },
        configurable: true
      });
    }

    // Event listeners
    selectEl.addEventListener('change', () => this.sync(selectEl));

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleForSelect(selectEl, trigger);
    });

    trigger.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        this.openForSelect(selectEl, trigger);
      }
    });

    // Initial sync
    this.sync(selectEl);
    return trigger;
  },

  /**
   * Syncs the trigger's displayed label, icon, and disabled state with its native select
   */
  sync(selectEl) {
    if (!selectEl || !selectEl._tfTrigger) return;
    const trigger = selectEl._tfTrigger;
    trigger.disabled = !!selectEl.disabled;

    const selectedOption = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
    const val = selectedOption ? selectedOption.value : selectEl.value;
    const text = selectedOption ? selectedOption.textContent : '';

    const meta = this.resolveOptionMeta(val, text, selectEl);

    let visualPrefix = '';
    if (meta.colorDot) {
      visualPrefix = `<span class="tf-dropdown-color-dot" style="background: ${meta.colorDot};"></span>`;
    } else if (meta.taskKey) {
      visualPrefix = `<span class="tf-dropdown-task-key">${meta.taskKey}</span>`;
    } else if (meta.icon) {
      visualPrefix = `<i class="${meta.icon} tf-dropdown-trigger-icon" style="${meta.iconColor ? `color: ${meta.iconColor};` : ''}"></i>`;
    }

    trigger.innerHTML = `
      <span class="tf-dropdown-trigger-content">
        ${visualPrefix}
        <span class="tf-dropdown-trigger-label">${Utils.escapeHTML(meta.label || text || 'Select...')}</span>
      </span>
      <i class="fa-solid fa-chevron-down tf-dropdown-trigger-chevron"></i>
    `;
  },

  /**
   * Toggles dropdown menu for a select trigger
   */
  toggleForSelect(selectEl, trigger) {
    if (this.activeTrigger === trigger && this.isOpen()) {
      this.close();
      return;
    }
    this.openForSelect(selectEl, trigger);
  },

  /**
   * Opens dropdown menu for a select trigger
   */
  openForSelect(selectEl, trigger) {
    const rawOptions = Array.from(selectEl.options);
    const items = rawOptions.map(opt => {
      const meta = this.resolveOptionMeta(opt.value, opt.textContent, selectEl);
      return {
        value: opt.value,
        label: meta.label,
        icon: meta.icon,
        iconColor: meta.iconColor,
        colorDot: meta.colorDot,
        taskKey: meta.taskKey,
        badge: meta.badge,
        badgeClass: meta.badgeClass,
        isSelected: opt.value === selectEl.value
      };
    });

    let title = '';
    if (selectEl.title) title = selectEl.title;
    else if (selectEl.getAttribute('aria-label')) title = selectEl.getAttribute('aria-label');
    else if (selectEl.previousElementSibling && selectEl.previousElementSibling.classList.contains('form-label')) {
      title = selectEl.previousElementSibling.textContent.replace('*', '').trim();
    }

    this.openMenu({
      trigger,
      selectEl,
      title,
      items,
      currentValue: selectEl.value,
      onSelect: (selectedVal) => {
        if (selectEl.value !== selectedVal) {
          selectEl.value = selectedVal;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        this.sync(selectEl);
      }
    });
  },

  /**
   * Universal floating dropdown menu opener
   */
  openMenu({ trigger, selectEl = null, title = '', items = [], currentValue = '', onSelect = null, minWidth = 0, searchable = undefined }) {
    this.init();
    this.close();

    this.activeTrigger = trigger;
    this.activeSelect = selectEl;
    this.activeItems = items;
    this.onSelectCallback = onSelect;
    this.focusedIndex = -1;

    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');

    // Auto-enable search filter if more than 6 items and not explicitly disabled
    const isSearchable = searchable !== undefined ? searchable : (items.length > 6);

    let html = '';

    // Search header if applicable
    if (isSearchable) {
      html += `
        <div class="tf-dropdown-search-wrap">
          <i class="fa-solid fa-magnifying-glass tf-dropdown-search-icon"></i>
          <input type="text" class="tf-dropdown-search-input" placeholder="Filter options..." autocomplete="off" spellcheck="false">
        </div>
      `;
    }

    // Optional category header
    if (title) {
      html += `<div class="tf-dropdown-header">${Utils.escapeHTML(title)}</div>`;
    }

    // Items list
    html += `<div class="tf-dropdown-items" role="group">`;
    items.forEach((item, idx) => {
      const isSelected = item.value === currentValue || item.isSelected;
      
      let prefixHTML = '';
      if (item.colorDot) {
        prefixHTML = `<span class="tf-dropdown-color-dot" style="background: ${item.colorDot};"></span>`;
      } else if (item.taskKey) {
        prefixHTML = `<span class="tf-dropdown-task-key">${item.taskKey}</span>`;
      } else if (item.icon) {
        prefixHTML = `<i class="${item.icon} tf-dropdown-item-icon" style="${item.iconColor ? `color: ${item.iconColor};` : ''}"></i>`;
      }

      html += `
        <button type="button" 
                class="tf-dropdown-item ${isSelected ? 'is-selected' : ''} ${item.isDanger ? 'is-danger' : ''}" 
                data-index="${idx}" 
                data-value="${Utils.escapeHTML(String(item.value))}"
                role="option"
                aria-selected="${isSelected ? 'true' : 'false'}">
          <span class="tf-dropdown-item-left">
            ${prefixHTML}
            <span class="tf-dropdown-item-label">${Utils.escapeHTML(item.label)}</span>
            ${item.badge ? `<span class="tf-dropdown-item-badge ${item.badgeClass || ''}">${Utils.escapeHTML(item.badge)}</span>` : ''}
          </span>
          ${isSelected ? '<i class="fa-solid fa-check tf-dropdown-item-check"></i>' : ''}
        </button>
      `;
    });
    html += `</div>`;

    this.menuEl.innerHTML = html;

    // Attach item click handlers
    this.menuEl.querySelectorAll('.tf-dropdown-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = btn.dataset.value;
        if (this.onSelectCallback) {
          this.onSelectCallback(val);
        }
        this.close();
        if (this.activeTrigger) {
          this.activeTrigger.focus();
        }
      });
    });

    // Attach search filter handler
    const searchInput = this.menuEl.querySelector('.tf-dropdown-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const itemButtons = this.menuEl.querySelectorAll('.tf-dropdown-item');
        let visibleCount = 0;

        itemButtons.forEach(btn => {
          const idx = parseInt(btn.dataset.index, 10);
          const item = this.activeItems[idx];
          const matches = !query || 
            item.label.toLowerCase().includes(query) || 
            String(item.value).toLowerCase().includes(query) ||
            (item.taskKey && item.taskKey.toLowerCase().includes(query));

          btn.style.display = matches ? 'flex' : 'none';
          if (matches) visibleCount++;
        });

        let emptyEl = this.menuEl.querySelector('.tf-dropdown-empty');
        if (visibleCount === 0) {
          if (!emptyEl) {
            emptyEl = document.createElement('div');
            emptyEl.className = 'tf-dropdown-empty';
            emptyEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> No matches found';
            this.menuEl.querySelector('.tf-dropdown-items').appendChild(emptyEl);
          }
        } else if (emptyEl) {
          emptyEl.remove();
        }
      });
    }

    // Position menu in viewport
    this.positionMenu(trigger, minWidth);
    this.menuEl.classList.add('is-open');

    // Auto focus search input or active item
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 30);
    } else {
      const activeBtn = this.menuEl.querySelector('.tf-dropdown-item.is-selected');
      if (activeBtn) activeBtn.classList.add('is-focused');
    }
  },

  /**
   * Smart viewport positioning with collision avoidance and auto-flip
   */
  positionMenu(trigger, customMinWidth) {
    const rect = trigger.getBoundingClientRect();

    // Temporarily make visible to accurately measure height & width
    this.menuEl.style.visibility = 'hidden';
    this.menuEl.style.display = 'block';

    const menuRect = this.menuEl.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, customMinWidth || 160, menuRect.width || 160);
    const menuHeight = menuRect.height || 220;

    this.menuEl.style.visibility = '';
    this.menuEl.style.display = '';

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;

    let top = rect.bottom + 4;
    // Auto-flip above trigger if insufficient space below
    if (menuHeight > spaceBelow && spaceAbove > spaceBelow) {
      top = Math.max(10, rect.top - menuHeight - 4);
    }

    let left = rect.left;
    // Auto-align within horizontal viewport edges
    if (left + menuWidth > viewportWidth - 10) {
      left = Math.max(10, viewportWidth - menuWidth - 10);
    }

    this.menuEl.style.top = `${Math.round(top)}px`;
    this.menuEl.style.left = `${Math.round(left)}px`;
    this.menuEl.style.minWidth = `${Math.round(Math.min(menuWidth, viewportWidth - 20))}px`;
  },

  /**
   * Closes the dropdown popover
   */
  close() {
    if (this.activeTrigger) {
      this.activeTrigger.classList.remove('is-open');
      this.activeTrigger.setAttribute('aria-expanded', 'false');
      this.activeTrigger = null;
    }
    this.activeSelect = null;
    this.activeItems = [];
    this.focusedIndex = -1;
    this.onSelectCallback = null;

    if (this.menuEl) {
      this.menuEl.classList.remove('is-open');
    }
  },

  /**
   * Keyboard accessibility navigation
   */
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      const trigger = this.activeTrigger;
      this.close();
      if (trigger) trigger.focus();
      return;
    }

    const visibleItems = Array.from(this.menuEl.querySelectorAll('.tf-dropdown-item:not([style*="display: none"])'));
    if (visibleItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusedIndex = (this.focusedIndex + 1) % visibleItems.length;
      this.updateKeyboardFocus(visibleItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusedIndex = (this.focusedIndex - 1 + visibleItems.length) % visibleItems.length;
      this.updateKeyboardFocus(visibleItems);
    } else if (e.key === 'Enter') {
      if (this.focusedIndex >= 0 && this.focusedIndex < visibleItems.length) {
        e.preventDefault();
        visibleItems[this.focusedIndex].click();
      }
    }
  },

  updateKeyboardFocus(items) {
    items.forEach((item, idx) => {
      item.classList.toggle('is-focused', idx === this.focusedIndex);
      if (idx === this.focusedIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  },

  /**
   * Discovers and enhances all <select> elements inside container
   */
  initAll(root = document) {
    if (!root) return;
    const selects = root.querySelectorAll('select.form-select, select.bulk-select, select.timeline-filter-select, select[data-custom-select]');
    selects.forEach(s => {
      this.enhance(s);
    });
  }
};

// Global bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DropdownUI.init());
} else {
  DropdownUI.init();
}
