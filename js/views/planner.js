/**
 * TaskForge - Daily Planner View
 * Plan and track work for Today + the next 2 days.
 *
 * Data model: tasks carry an optional `plannedDate` (local "YYYY-MM-DD") that is
 * intentionally separate from `dueDate` — planning *when you'll work* on something
 * must never silently move its deadline.
 *
 * Features:
 * - Three day columns (Today / Tomorrow / Day after) with completion and time summaries
 * - Shared task creation and smart-add controls for all three days
 * - Drag & drop between days, plus carry-over handling
 * - One-click complete and status cycling
 * - Carry-over banner for unfinished tasks planned on past days
 */

const PlannerView = {
  dragTaskId: null,

  PRIORITY_WEIGHT: { critical: 0, highest: 1, high: 2, medium: 3, low: 4, lowest: 5 },
  PRIORITY_ICON: {
    critical: 'fa-solid fa-angles-up',
    highest: 'fa-solid fa-angles-up',
    high: 'fa-solid fa-angle-up',
    medium: 'fa-solid fa-equals',
    low: 'fa-solid fa-angle-down',
    lowest: 'fa-solid fa-angles-down'
  },
  STATUS_LABEL: {
    backlog: 'Backlog',
    todo: 'To Do',
    inprogress: 'In Progress',
    inreview: 'In Review',
    blocked: 'Blocked',
    done: 'Done',
    cancelled: 'Cancelled'
  },
  STATUS_NEXT: {
    backlog: 'inprogress',
    todo: 'inprogress',
    inprogress: 'done',
    inreview: 'done',
    blocked: 'inprogress',
    done: 'todo'
  },

  // -------------------------------------------------------------
  // DATE HELPERS
  // -------------------------------------------------------------

  /** Local-date key "YYYY-MM-DD" (avoids UTC shifting from toISOString) */
  toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getDays() {
    const now = new Date();
    return [0, 1, 2].map(offset => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        offset,
        key: this.toKey(date),
        date,
        label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : weekday,
        shortLabel: offset === 0 ? 'Today' : offset === 1 ? 'Tmrw' : date.toLocaleDateString('en-US', { weekday: 'short' }),
        sub: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      };
    });
  },

  /** Normalises a task's dueDate to a local "YYYY-MM-DD" key */
  dueKey(task) {
    if (!task.dueDate) return null;
    const s = String(task.dueDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Dates picked from <input type="date"> are stored as UTC midnight — keep the calendar day as chosen
    if (/T00:00:00(\.000)?Z$/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : this.toKey(d);
  },

  isOpen(task) {
    return task.status !== 'done' && task.status !== 'cancelled';
  },

  // -------------------------------------------------------------
  // DATA SELECTORS
  // -------------------------------------------------------------

  getScopedTasks() {
    return AppState.tasks.filter(t =>
      !t.archived && (!AppState.selectedProjectId || t.projectId === AppState.selectedProjectId)
    );
  },

  sortPlanned(a, b) {
    const aDone = a.status === 'done' ? 1 : 0;
    const bDone = b.status === 'done' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    // Surface the closest deadline first; tasks without a deadline follow dated work.
    const aDue = this.dueKey(a) || '9999-99-99';
    const bDue = this.dueKey(b) || '9999-99-99';
    if (aDue !== bDue) return aDue.localeCompare(bDue);

    const aActive = a.status === 'inprogress' ? 0 : 1;
    const bActive = b.status === 'inprogress' ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    const pw = (this.PRIORITY_WEIGHT[a.priority] ?? 3) - (this.PRIORITY_WEIGHT[b.priority] ?? 3);
    if (pw !== 0) return pw;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  },

  getAvailableTasks(tasks, days) {
    const lastKey = days[2].key;
    return tasks.filter(t =>
      this.isOpen(t) && (!t.plannedDate || t.plannedDate > lastKey)
    ).sort((a, b) => this.sortPlanned(a, b));
  },

  getProjectColor(task) {
    const p = AppState.projects.find(pr => pr.id === task.projectId);
    return (p && p.color) || '#579DFF';
  },

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  render(container) {
    if (!container) return;

    const days = this.getDays();
    const todayKey = days[0].key;
    const tasks = this.getScopedTasks();
    const availableTasks = this.getAvailableTasks(tasks, days);

    const byDay = {};
    days.forEach(d => {
      byDay[d.key] = tasks
        .filter(t => t.plannedDate === d.key && t.status !== 'cancelled')
        .sort((a, b) => this.sortPlanned(a, b));
    });

    const carryover = tasks
      .filter(t => t.plannedDate && t.plannedDate < todayKey && this.isOpen(t))
      .sort((a, b) => this.sortPlanned(a, b));

    const todayTasks = byDay[todayKey];
    const todayDone = todayTasks.filter(t => t.status === 'done').length;
    const todayPct = todayTasks.length ? Math.round((todayDone / todayTasks.length) * 100) : 0;
    const todayRemaining = todayTasks
      .filter(t => t.status !== 'done')
      .reduce((s, t) => s + Math.max(0, (Number(t.estimate) || 0) - (Number(t.trackedTime) || 0)), 0);
    const upcomingCount = byDay[days[1].key].filter(t => t.status !== 'done').length +
      byDay[days[2].key].filter(t => t.status !== 'done').length;
    const overdueUnplanned = tasks.filter(t => {
      const k = this.dueKey(t);
      return this.isOpen(t) && k && k < todayKey && (!t.plannedDate || t.plannedDate > days[2].key);
    }).length;
    const attention = carryover.length + overdueUnplanned;

    const ringC = 2 * Math.PI * 22;
    const ringOffset = ringC * (1 - todayPct / 100);
    const scopeProject = AppState.selectedProjectId
      ? AppState.projects.find(p => p.id === AppState.selectedProjectId)
      : null;

    container.innerHTML = `
      <div class="view-page planner-page" id="planner-page">
        <header class="view-header planner-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-calendar-day planner-title-icon"></i> Daily Planner</h1>
            <p>Plan today and the next 2 days, then track progress as you go${scopeProject ? ` · <strong>${Utils.escapeHTML(scopeProject.name)}</strong>` : ''}.</p>
          </div>
          <div class="view-actions">
            ${this.renderTaskMenus(availableTasks, days)}
          </div>
        </header>

        <!-- Summary KPIs -->
        <section class="planner-summary" aria-label="Planner summary">
          <div class="planner-kpi planner-kpi-progress">
            <svg class="planner-ring" viewBox="0 0 52 52" aria-hidden="true">
              <circle class="planner-ring-track" cx="26" cy="26" r="22"></circle>
              <circle class="planner-ring-fill" cx="26" cy="26" r="22"
                style="stroke-dasharray: ${ringC.toFixed(2)}; stroke-dashoffset: ${ringOffset.toFixed(2)};"></circle>
            </svg>
            <div class="planner-kpi-ring-label">${todayPct}%</div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Today's progress</span>
              <span class="planner-kpi-value">${todayDone} <small>of ${todayTasks.length} done</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-blue"><i class="fa-solid fa-hourglass-half"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Remaining today</span>
              <span class="planner-kpi-value">${Utils.formatMinutes(todayRemaining)}</span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-purple"><i class="fa-solid fa-forward"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Queued next 2 days</span>
              <span class="planner-kpi-value">${upcomingCount} <small>task${upcomingCount === 1 ? '' : 's'}</small></span>
            </div>
          </div>
          <div class="planner-kpi ${attention > 0 ? 'is-alert' : ''}">
            <div class="planner-kpi-icon ${attention > 0 ? 'kpi-red' : 'kpi-green'}"><i class="fa-solid ${attention > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Needs attention</span>
              <span class="planner-kpi-value">${attention} <small>${attention > 0 ? 'carry-over / overdue' : 'all clear'}</small></span>
            </div>
          </div>
        </section>

        ${carryover.length > 0 ? this.renderCarryover(carryover) : ''}

        <div class="planner-layout">
          <div class="planner-days">
            ${days.map(d => this.renderDay(d, byDay[d.key])).join('')}
          </div>
        </div>
      </div>
    `;

    this.attachListeners(container);

  },

  renderTaskMenus(availableTasks, days) {
    const dayOptions = days.map(day => `<option value="${day.offset}">${day.label} · ${day.sub}</option>`).join('');
    return `
      <div class="planner-task-menus">
        <details class="planner-task-menu" name="planner-task-menu">
          <summary class="btn btn-primary"><i class="fa-solid fa-plus"></i> Create task</summary>
          <form class="planner-action-popover planner-create-popover" data-create-task-form>
            <label class="planner-action-label" for="planner-create-title">Task name</label>
            <input class="planner-action-input" id="planner-create-title" type="text" data-create-title placeholder="What needs to get done?" maxlength="200" required>
            <label class="planner-action-label" for="planner-create-day">Add to</label>
            <select class="planner-action-input" id="planner-create-day" data-create-day>${dayOptions}</select>
            <button class="btn btn-primary planner-action-submit" type="submit"><i class="fa-solid fa-plus"></i> Create task</button>
          </form>
        </details>
        <details class="planner-task-menu" name="planner-task-menu">
          <summary class="btn btn-ghost"><i class="fa-solid fa-wand-magic-sparkles"></i> Add existing <span class="planner-menu-count">${availableTasks.length}</span></summary>
          <div class="planner-action-popover planner-existing-popover">
            <label class="planner-action-label" for="planner-smart-day">Add to</label>
            <select class="planner-action-input" id="planner-smart-day" data-smart-day>${dayOptions}</select>
            <label class="planner-smart-search">
              <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <input type="search" data-smart-search placeholder="Search all tasks…" autocomplete="off" aria-label="Search existing tasks">
            </label>
            <div class="planner-smart-list" data-smart-list>
              ${this.renderSmartSuggestions(availableTasks, days)}
            </div>
          </div>
        </details>
      </div>
    `;
  },

  renderCarryover(carryover) {
    return `
      <section class="planner-carryover" aria-label="Unfinished tasks from previous days">
        <div class="planner-carryover-head">
          <div class="planner-carryover-title">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span><strong>${carryover.length}</strong> unfinished task${carryover.length === 1 ? '' : 's'} from previous days</span>
          </div>
          <div class="planner-carryover-actions">
            <button type="button" class="btn btn-sm btn-ghost" id="planner-carryover-unplan" data-action="unplan-carryover">Unplan all</button>
            <button type="button" class="btn btn-sm btn-primary" id="planner-carryover-rollover" data-action="rollover-all">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Move all to Today
            </button>
          </div>
        </div>
        <div class="planner-carryover-list">
          ${carryover.map(t => `
            <div class="planner-carry-chip" data-task-id="${t.id}" draggable="true" title="Planned for ${Utils.formatDate(t.plannedDate + 'T00:00:00')}">
              <span class="planner-dot" style="background: ${this.getProjectColor(t)};"></span>
              <span class="planner-carry-key">${Utils.escapeHTML(t.key)}</span>
              <span class="planner-carry-title" data-action="open">${Utils.escapeHTML(t.title)}</span>
              <button type="button" class="planner-icon-btn" data-action="plan" data-plan-offset="0" title="Move to Today"><i class="fa-solid fa-arrow-right"></i></button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  renderDay(day, tasks) {
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const estimate = tasks.reduce((s, t) => s + (Number(t.estimate) || 0), 0);
    const tracked = tasks.reduce((s, t) => s + (Number(t.trackedTime) || 0), 0);
    const allDone = total > 0 && done === total;

    return `
      <section class="planner-day ${day.offset === 0 ? 'is-today' : ''} ${allDone ? 'is-complete' : ''}" id="planner-day-${day.offset}" aria-label="${day.label}">
        <header class="planner-day-header">
          <div class="planner-day-title">
            <div class="planner-day-label">
              ${day.label}
              ${day.offset === 0 ? '<span class="planner-now-pill"><span class="planner-now-dot"></span>Now</span>' : ''}
            </div>
            <div class="planner-day-date">${day.sub}</div>
          </div>
          <div class="planner-day-count" title="${done} of ${total} completed">
            ${allDone ? '<i class="fa-solid fa-trophy"></i>' : ''} ${done}/${total}
          </div>
        </header>

        <div class="planner-day-progress" title="${pct}% complete">
          <div class="planner-day-progress-fill" style="width: ${pct}%;"></div>
        </div>

        <div class="planner-day-load" title="Estimated ${Utils.formatMinutes(estimate)}; logged ${Utils.formatMinutes(tracked)}">
          <span><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(estimate)} estimated</span>
          <span class="planner-load-logged">Logged ${Utils.formatMinutes(tracked)}</span>
        </div>

        <div class="planner-day-list" data-drop-key="${day.key}">
          ${total === 0 ? `
            <div class="planner-empty">
              <i class="fa-regular fa-calendar-plus"></i>
              <span>Drag a task here, or use Create task / Add existing above</span>
            </div>
          ` : tasks.map(t => this.renderPlannedTask(t, day)).join('')}
        </div>

      </section>
    `;
  },

  renderSmartSuggestions(tasks, days, query = '') {
    const search = query.trim();
    const matches = search
      ? tasks.filter(t => Utils.fuzzyMatch(search, `${t.key} ${t.title} ${t.priority} ${t.status}`))
      : tasks.slice(0, 5);

    if (!matches.length) {
      return `<div class="planner-smart-empty">${search ? 'No matching tasks.' : 'No open tasks to add right now.'}</div>`;
    }

    const todayKey = days[0].key;
    return matches.map(t => {
      const due = this.dueKey(t);
      let timing = '';
      if (due && due < todayKey) timing = '<span class="planner-smart-tag is-overdue">Overdue</span>';
      else if (due && due <= days[2].key) timing = `<span class="planner-smart-tag">Due ${Utils.formatRelativeDate(due + 'T00:00:00')}</span>`;
      else if (t.plannedDate) timing = `<span class="planner-smart-tag">Scheduled ${Utils.formatRelativeDate(t.plannedDate + 'T00:00:00')}</span>`;

      return `
        <div class="planner-smart-item" data-task-id="${Utils.escapeHTML(t.id)}">
          <div class="planner-smart-copy" data-action="open" title="Open task details">
            <span class="planner-smart-key">${Utils.escapeHTML(t.key)}</span>
            <span class="planner-smart-title">${Utils.escapeHTML(t.title)}</span>
            <span class="planner-smart-meta">
              <span class="planner-prio prio-${Utils.escapeHTML(t.priority)}" title="${Utils.escapeHTML(t.priority)} priority"><i class="${this.PRIORITY_ICON[t.priority] || 'fa-solid fa-equals'}"></i></span>
              ${t.estimate ? `<span class="planner-est"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(t.estimate)}</span>` : ''}
              ${timing}
            </span>
          </div>
          <button type="button" class="planner-smart-add-btn" data-action="add-existing-task" title="Add to selected day" aria-label="Add ${Utils.escapeHTML(t.key)} to selected day">
            <i class="fa-solid fa-plus" aria-hidden="true"></i>
          </button>
        </div>
      `;
    }).join('');
  },

  renderPlannedTask(t, day) {
    const isDone = t.status === 'done';
    const dk = this.dueKey(t);
    let dueBadge = '';
    if (dk && !isDone) {
      if (dk < day.key) dueBadge = `<span class="planner-due is-overdue" title="Due ${Utils.formatDate(dk + 'T00:00:00')}"><i class="fa-solid fa-triangle-exclamation"></i> Past due</span>`;
      else if (dk === day.key) dueBadge = `<span class="planner-due is-today"><i class="fa-regular fa-calendar"></i> Due</span>`;
    }
    const est = Number(t.estimate) || 0;
    const tracked = Number(t.trackedTime) || 0;

    return `
      <div class="planner-task ${isDone ? 'is-done' : ''} status-${t.status}" data-task-id="${t.id}" draggable="true" style="--planner-project: ${this.getProjectColor(t)};">
        <button type="button" class="planner-check" data-action="toggle-done" title="${isDone ? 'Mark as not done' : 'Mark as done'}" aria-pressed="${isDone}">
          <i class="fa-solid fa-check"></i>
        </button>
        <div class="planner-task-body" data-action="open" title="${Utils.escapeHTML(t.title)}">
          <div class="planner-task-title">${Utils.escapeHTML(t.title)}</div>
          <div class="planner-task-meta">
            <span class="planner-task-key">${Utils.escapeHTML(t.key)}</span>
            <span class="planner-prio prio-${t.priority}" title="${t.priority} priority"><i class="${this.PRIORITY_ICON[t.priority] || 'fa-solid fa-equals'}"></i></span>
            <button type="button" class="planner-status status-${t.status}" data-action="cycle-status" title="Click to advance status">${this.STATUS_LABEL[t.status] || t.status}</button>
            ${est || tracked ? `<span class="planner-est" title="Logged / Estimate"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(tracked)}${est ? ` / ${Utils.formatMinutes(est)}` : ''}</span>` : ''}
            ${dueBadge}
          </div>
        </div>
        <div class="planner-task-actions">
          ${!isDone && day.offset < 2 ? `<button type="button" class="planner-icon-btn" data-action="move-next" title="Push to next day"><i class="fa-solid fa-arrow-right"></i></button>` : ''}
          <button type="button" class="planner-icon-btn" data-action="unplan" title="Remove from plan"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `;
  },

  // -------------------------------------------------------------
  // EVENTS
  // -------------------------------------------------------------

  attachListeners(container) {
    const root = container.querySelector('#planner-page');
    if (!root) return;
    const days = this.getDays();

    // Click delegation
    root.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl || !root.contains(actionEl)) return;
      const action = actionEl.dataset.action;
      const taskEl = actionEl.closest('[data-task-id]');
      const taskId = taskEl ? taskEl.dataset.taskId : null;
      const task = taskId ? AppState.tasks.find(t => t.id === taskId) : null;

      switch (action) {
        case 'open':
          if (task) TaskModal.openDetail(task.id);
          break;
        case 'toggle-done':
          if (task) {
            e.stopPropagation();
            const nextStatus = task.status === 'done' ? 'todo' : 'done';
            AppState.updateTask(task.id, { status: nextStatus });
            if (nextStatus === 'done') Toast.success(`${task.key} completed 🎉`);
          }
          break;
        case 'cycle-status':
          if (task) {
            e.stopPropagation();
            const next = this.STATUS_NEXT[task.status] || 'inprogress';
            AppState.updateTask(task.id, { status: next });
          }
          break;
        case 'plan': {
          if (!task) break;
          const offset = parseInt(actionEl.dataset.planOffset, 10) || 0;
          this.planTask(task, days[offset]);
          break;
        }
        case 'add-existing-task': {
          if (!task) break;
          const offset = parseInt(root.querySelector('[data-smart-day]')?.value, 10) || 0;
          this.planTask(task, days[offset]);
          break;
        }
        case 'move-next': {
          if (!task) break;
          const idx = days.findIndex(d => d.key === task.plannedDate);
          const target = days[Math.min(2, idx + 1)];
          if (target) this.planTask(task, target);
          break;
        }
        case 'unplan':
          if (task) {
            AppState.updateTask(task.id, { plannedDate: null });
            Toast.info(`${task.key} removed from the plan`);
          }
          break;
        case 'rollover-all': {
          const ids = this.getCarryoverIds(days[0].key);
          if (ids.length) {
            AppState.bulkUpdateTasks(ids, { plannedDate: days[0].key });
            Toast.success(`Moved ${ids.length} task${ids.length === 1 ? '' : 's'} to Today`);
          }
          break;
        }
        case 'unplan-carryover': {
          const ids = this.getCarryoverIds(days[0].key);
          if (ids.length) {
            AppState.bulkUpdateTasks(ids, { plannedDate: null });
            Toast.info(`Removed ${ids.length} task${ids.length === 1 ? '' : 's'} from the plan`);
          }
          break;
        }
      }
    });

    // Search existing tasks inline within the day picker.
    root.addEventListener('input', (e) => {
      const search = e.target.closest('[data-smart-search]');
      if (!search) return;
      const list = root.querySelector('[data-smart-list]');
      if (!list) return;
      const available = this.getAvailableTasks(this.getScopedTasks(), days);
      list.innerHTML = this.renderSmartSuggestions(available, days, search.value);
    });

    root.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-create-task-form]');
      if (!form) return;
      e.preventDefault();
      const title = form.querySelector('[data-create-title]')?.value.trim();
      if (!title) return;
      const projectId = AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : null);
      if (!projectId) {
        Toast.error ? Toast.error('Create a project first') : Toast.info('Create a project first');
        return;
      }
      const offset = parseInt(form.querySelector('[data-create-day]')?.value, 10) || 0;
      AppState.createTask({
        title,
        projectId,
        status: 'todo',
        plannedDate: days[offset].key
      });
    });

    this.attachDragAndDrop(root, days);
  },

  attachDragAndDrop(root, days) {
    root.addEventListener('dragstart', (e) => {
      const item = e.target.closest('[data-task-id][draggable="true"]');
      if (!item) return;
      this.dragTaskId = item.dataset.taskId;
      item.classList.add('is-dragging');
      root.classList.add('is-drag-active');
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dragTaskId);
      } catch (err) { /* ignore */ }
    });

    root.addEventListener('dragend', (e) => {
      const item = e.target.closest('[data-task-id]');
      if (item) item.classList.remove('is-dragging');
      root.classList.remove('is-drag-active');
      root.querySelectorAll('.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
      this.dragTaskId = null;
    });

    const getZone = (target) => target.closest('[data-drop-key]');

    root.addEventListener('dragover', (e) => {
      const zone = getZone(e.target);
      if (!zone || !this.dragTaskId) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (err) { /* ignore */ }
      if (!zone.classList.contains('is-drop-target')) {
        root.querySelectorAll('.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
        zone.classList.add('is-drop-target');
      }
    });

    root.addEventListener('dragleave', (e) => {
      const zone = getZone(e.target);
      if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('is-drop-target');
    });

    root.addEventListener('drop', (e) => {
      const zone = getZone(e.target);
      if (!zone) return;
      e.preventDefault();
      const taskId = this.dragTaskId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
      const task = AppState.tasks.find(t => t.id === taskId);
      zone.classList.remove('is-drop-target');
      root.classList.remove('is-drag-active');
      this.dragTaskId = null;
      if (!task) return;

      const day = days.find(d => d.key === zone.dataset.dropKey);
      if (day && task.plannedDate !== day.key) this.planTask(task, day);
    });
  },

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------

  planTask(task, day) {
    if (!task || !day) return;
    if (task.plannedDate === day.key) return;
    AppState.updateTask(task.id, { plannedDate: day.key });
    Toast.success(`${task.key} planned for ${day.label}`);
  },

  getCarryoverIds(todayKey) {
    return this.getScopedTasks()
      .filter(t => t.plannedDate && t.plannedDate < todayKey && this.isOpen(t))
      .map(t => t.id);
  },

};
