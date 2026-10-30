/**
 * TaskForge - Shared Status Control
 * One source of truth for status labels/icons/flow plus a reusable
 * status-picker menu (built on DropdownUI) used by Sprint Planning cards
 * and the Task Hierarchy view.
 */

const StatusControl = {
  ORDER: ['backlog', 'todo', 'inprogress', 'inreview', 'blocked', 'done', 'cancelled'],

  META: {
    backlog:    { label: 'Backlog',     icon: 'fa-solid fa-inbox',         color: '#64748B' },
    todo:       { label: 'To Do',       icon: 'fa-regular fa-circle',      color: '#2563EB' },
    inprogress: { label: 'In Progress', icon: 'fa-solid fa-spinner',       color: '#EA580C' },
    inreview:   { label: 'In Review',   icon: 'fa-solid fa-eye',           color: '#9333EA' },
    blocked:    { label: 'Blocked',     icon: 'fa-solid fa-ban',           color: '#EF4444' },
    done:       { label: 'Done',        icon: 'fa-solid fa-circle-check',  color: '#059669' },
    cancelled:  { label: 'Cancelled',   icon: 'fa-solid fa-circle-xmark',  color: '#6B7280' }
  },

  /** Natural "advance" flow for one-click progression */
  NEXT: {
    backlog: 'todo',
    todo: 'inprogress',
    inprogress: 'inreview',
    inreview: 'done',
    blocked: 'inprogress',
    done: 'done',
    cancelled: 'todo'
  },

  meta(status) {
    return this.META[status] || this.META.todo;
  },

  label(status) {
    return this.meta(status).label;
  },

  next(status) {
    return this.NEXT[status] || 'inprogress';
  },

  /**
   * Renders the status pill trigger. Clicking it (via delegation) should call openMenu().
   */
  pillHTML(task, extraClass = '') {
    const m = this.meta(task.status);
    return `
      <button type="button" class="status-pill status-pill-${Utils.escapeHTML(task.status)} ${extraClass}"
        data-status-action="menu" data-task-id="${Utils.escapeHTML(task.id)}"
        title="Change status (${m.label})" aria-haspopup="listbox">
        <i class="${m.icon}" aria-hidden="true"></i>
        <span>${m.label}</span>
        <i class="fa-solid fa-chevron-down status-pill-chevron" aria-hidden="true"></i>
      </button>
    `;
  },

  /**
   * Updates one task's status with friendly feedback.
   */
  setStatus(taskId, status) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task || !status || task.status === status) return;
    AppState.updateTask(taskId, { status });
    if (status === 'done') Toast.success(`${task.key} completed 🎉`);
    else Toast.info(`${task.key} → ${this.label(status)}`);
  },

  /** Advance to the next status in the flow */
  advance(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.setStatus(taskId, this.next(task.status));
  },

  /** Toggle done / reopen */
  toggleDone(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.setStatus(taskId, task.status === 'done' ? 'todo' : 'done');
  },

  /** Returns ids of every descendant (via parentId) of a task */
  descendantIds(taskId) {
    const out = [];
    const walk = (id) => {
      AppState.tasks.forEach(t => {
        if (t.parentId === id && !out.includes(t.id)) {
          out.push(t.id);
          walk(t.id);
        }
      });
    };
    walk(taskId);
    return out;
  },

  /**
   * Opens the floating status picker next to a trigger.
   * @param {HTMLElement} trigger
   * @param {string|string[]} taskIdOrIds single task or a set of tasks (branch updates)
   * @param {Object} [opts] { title, currentValue }
   */
  openMenu(trigger, taskIdOrIds, opts = {}) {
    if (typeof DropdownUI === 'undefined') return;
    const ids = Array.isArray(taskIdOrIds) ? taskIdOrIds : [taskIdOrIds];
    const first = AppState.tasks.find(t => t.id === ids[0]);

    if (DropdownUI.activeTrigger === trigger && DropdownUI.isOpen()) {
      DropdownUI.close();
      return;
    }

    DropdownUI.openMenu({
      trigger,
      title: opts.title || (ids.length > 1 ? `Set status for ${ids.length} tasks` : 'Change Status'),
      currentValue: opts.currentValue !== undefined ? opts.currentValue : (first ? first.status : ''),
      searchable: false,
      items: this.ORDER.map(value => ({
        value,
        label: this.META[value].label,
        icon: this.META[value].icon,
        iconColor: this.META[value].color
      })),
      onSelect: (value) => {
        if (!value) return;
        // Defer so the menu closes before the view re-renders (trigger gets replaced)
        setTimeout(() => {
          if (ids.length === 1) {
            this.setStatus(ids[0], value);
          } else {
            AppState.bulkUpdateTasks(ids, { status: value });
            Toast.success(`Set ${ids.length} tasks to ${this.label(value)}`);
          }
        }, 0);
      }
    });
  }
};
