/**
 * TaskForge - Daily Planner View
 * Plan and track work for Today + the next 2 days.
 *
 * Data model: tasks carry an optional `plannedDate` (local "YYYY-MM-DD") that is
 * intentionally separate from `dueDate` — planning *when you'll work* on something
 * must never silently move its deadline.
 *
 * Features:
 * - Three day columns (Today / Tomorrow / Day after) with progress + workload meters
 * - Unplanned task pool with search, smart filters and one-click "plan for day" buttons
 * - Drag & drop between pool and days (and between days)
 * - Inline quick-add per day, one-click complete, status cycling
 * - Carry-over banner for unfinished tasks planned on past days
 */

const PlannerView = {
  poolSearch: '',
  poolFilter: 'suggested', // 'suggested' | 'due' | 'high' | 'all'
  refocusKey: null,
  dragTaskId: null,
  capacityMinutes: (() => {
    try {
      const v = parseInt(localStorage.getItem('taskforge_planner_capacity'), 10);
      return v > 0 ? v : 480;
    } catch (e) {
      return 480;
    }
  })(),

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
    const aActive = a.status === 'inprogress' ? 0 : 1;
    const bActive = b.status === 'inprogress' ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    const pw = (this.PRIORITY_WEIGHT[a.priority] ?? 3) - (this.PRIORITY_WEIGHT[b.priority] ?? 3);
    if (pw !== 0) return pw;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  },

  getPoolTasks(tasks, days) {
    const lastKey = days[2].key;
    const todayKey = days[0].key;
    const q = this.poolSearch.trim();

    let pool = tasks.filter(t =>
      this.isOpen(t) && (!t.plannedDate || t.plannedDate > lastKey)
    );

    if (q) {
      pool = pool.filter(t => Utils.fuzzyMatch(q, `${t.key} ${t.title}`));
    }

    if (this.poolFilter === 'due') {
      pool = pool.filter(t => { const k = this.dueKey(t); return k && k <= lastKey; });
    } else if (this.poolFilter === 'high') {
      pool = pool.filter(t => ['critical', 'highest', 'high'].includes(t.priority));
    } else if (this.poolFilter === 'suggested') {
      // Suggested = overdue, due within window, high priority, or already in progress
      pool = pool.filter(t => {
        const k = this.dueKey(t);
        return (k && k <= lastKey) ||
          ['critical', 'highest', 'high'].includes(t.priority) ||
          t.status === 'inprogress' || t.status === 'inreview';
      });
    }

    return pool.sort((a, b) => {
      const ak = this.dueKey(a) || '9999-99-99';
      const bk = this.dueKey(b) || '9999-99-99';
      const aUrgent = ak <= lastKey ? 0 : 1;
      const bUrgent = bk <= lastKey ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      if (aUrgent === 0 && ak !== bk) return ak.localeCompare(bk);
      const pw = (this.PRIORITY_WEIGHT[a.priority] ?? 3) - (this.PRIORITY_WEIGHT[b.priority] ?? 3);
      if (pw !== 0) return pw;
      return todayKey ? (a.createdAt || '').localeCompare(b.createdAt || '') : 0;
    });
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
            <div class="planner-capacity" title="Daily focus capacity used for workload meters">
              <span class="planner-capacity-label"><i class="fa-regular fa-clock"></i> Capacity</span>
              <button type="button" class="planner-capacity-btn" id="planner-capacity-dec" data-action="capacity" data-delta="-60" aria-label="Decrease capacity">−</button>
              <span class="planner-capacity-value" id="planner-capacity-value">${Utils.formatMinutes(this.capacityMinutes)}</span>
              <button type="button" class="planner-capacity-btn" id="planner-capacity-inc" data-action="capacity" data-delta="60" aria-label="Increase capacity">+</button>
            </div>
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
              <span class="planner-kpi-value">${Utils.formatMinutes(todayRemaining)} <small>of ${Utils.formatMinutes(this.capacityMinutes)}</small></span>
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
          ${this.renderPool(tasks, days)}
          <div class="planner-days">
            ${days.map(d => this.renderDay(d, byDay[d.key])).join('')}
          </div>
        </div>
      </div>
    `;

    this.attachListeners(container);

    if (this.refocusKey) {
      const input = container.querySelector(`[data-quickadd-key="${this.refocusKey}"]`);
      if (input) input.focus();
      this.refocusKey = null;
    }
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
            <button type="button" class="btn btn-sm btn-ghost" id="planner-carryover-unplan" data-action="unplan-carryover">Send back to pool</button>
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

  renderPool(tasks, days) {
    const filters = [
      { id: 'suggested', label: 'Suggested', icon: 'fa-wand-magic-sparkles' },
      { id: 'due', label: 'Due soon', icon: 'fa-calendar-exclamation' },
      { id: 'high', label: 'High priority', icon: 'fa-fire' },
      { id: 'all', label: 'All', icon: 'fa-layer-group' }
    ];
    return `
      <aside class="planner-pool" aria-label="Unplanned tasks">
        <div class="planner-pool-head">
          <div class="planner-pool-title">
            <i class="fa-solid fa-inbox"></i> Unplanned
            <span class="planner-count-pill" id="planner-pool-count">0</span>
          </div>
          <div class="planner-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="planner-pool-search" placeholder="Search tasks…" value="${Utils.escapeHTML(this.poolSearch)}" autocomplete="off">
          </div>
          <div class="planner-filter-row" role="tablist">
            ${filters.map(f => `
              <button type="button" class="planner-filter-chip ${this.poolFilter === f.id ? 'active' : ''}" id="planner-filter-${f.id}" data-action="pool-filter" data-filter="${f.id}">
                ${f.label}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="planner-pool-list" id="planner-pool-list" data-drop-pool="true">
          ${this.renderPoolItems(tasks, days)}
        </div>
      </aside>
    `;
  },

  renderPoolItems(tasks, days) {
    const pool = this.getPoolTasks(tasks, days);
    // Count is updated after insertion (see updatePoolCount)
    this._lastPoolCount = pool.length;

    if (pool.length === 0) {
      return `
        <div class="planner-empty planner-pool-empty">
          <i class="fa-solid fa-mug-hot"></i>
          <span>${this.poolSearch ? 'No tasks match your search.' : this.poolFilter === 'all' ? 'Everything open is already planned.' : 'Nothing urgent here. Try "All".'}</span>
        </div>
      `;
    }

    const todayKey = days[0].key;
    return pool.map(t => {
      const dk = this.dueKey(t);
      let dueBadge = '';
      if (dk) {
        if (dk < todayKey) dueBadge = `<span class="planner-due is-overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>`;
        else if (dk === todayKey) dueBadge = `<span class="planner-due is-today"><i class="fa-regular fa-calendar"></i> Due today</span>`;
        else if (dk <= days[2].key) dueBadge = `<span class="planner-due is-soon"><i class="fa-regular fa-calendar"></i> ${Utils.formatRelativeDate(dk + 'T00:00:00')}</span>`;
      }
      const futurePlan = t.plannedDate
        ? `<span class="planner-due"><i class="fa-regular fa-calendar-check"></i> Planned ${Utils.formatRelativeDate(t.plannedDate + 'T00:00:00')}</span>`
        : '';
      return `
        <div class="planner-pool-item" data-task-id="${t.id}" draggable="true">
          <span class="planner-dot" style="background: ${this.getProjectColor(t)};"></span>
          <div class="planner-pool-body" data-action="open" title="Open details">
            <div class="planner-pool-name">${Utils.escapeHTML(t.title)}</div>
            <div class="planner-task-meta">
              <span class="planner-task-key">${Utils.escapeHTML(t.key)}</span>
              <span class="planner-prio prio-${t.priority}" title="${t.priority} priority"><i class="${this.PRIORITY_ICON[t.priority] || 'fa-solid fa-equals'}"></i></span>
              ${t.estimate ? `<span class="planner-est"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(t.estimate)}</span>` : ''}
              ${dueBadge}${futurePlan}
            </div>
          </div>
          <div class="planner-pool-assign">
            ${days.map(d => `
              <button type="button" class="planner-assign-btn ${d.offset === 0 ? 'is-today' : ''}" data-action="plan" data-plan-offset="${d.offset}" title="Plan for ${d.label} (${d.sub})">${d.shortLabel}</button>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  renderDay(day, tasks) {
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const estimate = tasks.reduce((s, t) => s + (Number(t.estimate) || 0), 0);
    const tracked = tasks.reduce((s, t) => s + (Number(t.trackedTime) || 0), 0);
    const loadPct = Math.min(100, Math.round((estimate / this.capacityMinutes) * 100));
    const loadState = estimate > this.capacityMinutes ? 'is-over' : estimate > this.capacityMinutes * 0.8 ? 'is-high' : '';
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

        <div class="planner-day-load ${loadState}" title="Estimated ${Utils.formatMinutes(estimate)} vs ${Utils.formatMinutes(this.capacityMinutes)} capacity">
          <div class="planner-load-text">
            <span><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(estimate)} / ${Utils.formatMinutes(this.capacityMinutes)}</span>
            <span class="planner-load-logged">Logged ${Utils.formatMinutes(tracked)}</span>
          </div>
          <div class="planner-load-bar"><div class="planner-load-fill" style="width: ${loadPct}%;"></div></div>
        </div>

        <div class="planner-day-list" data-drop-key="${day.key}">
          ${total === 0 ? `
            <div class="planner-empty">
              <i class="fa-regular fa-calendar-plus"></i>
              <span>Drag tasks here or add one below</span>
            </div>
          ` : tasks.map(t => this.renderPlannedTask(t, day)).join('')}
        </div>

        <div class="planner-quickadd">
          <i class="fa-solid fa-plus"></i>
          <input type="text" id="planner-quickadd-${day.offset}" data-quickadd-key="${day.key}" placeholder="Add a task for ${day.offset === 0 ? 'today' : day.offset === 1 ? 'tomorrow' : day.label}…" autocomplete="off" maxlength="200">
          <kbd>Enter</kbd>
        </div>
      </section>
    `;
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
        <div class="planner-task-body" data-action="open" title="Open details">
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

    this.updatePoolCount(root);

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
            Toast.info(`${task.key} moved back to Unplanned`);
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
            Toast.info(`Returned ${ids.length} task${ids.length === 1 ? '' : 's'} to Unplanned`);
          }
          break;
        }
        case 'pool-filter':
          this.poolFilter = actionEl.dataset.filter || 'suggested';
          root.querySelectorAll('.planner-filter-chip').forEach(c => c.classList.toggle('active', c === actionEl));
          this.refreshPool(root);
          break;
        case 'capacity': {
          const delta = parseInt(actionEl.dataset.delta, 10) || 0;
          this.capacityMinutes = Math.min(16 * 60, Math.max(60, this.capacityMinutes + delta));
          try { localStorage.setItem('taskforge_planner_capacity', String(this.capacityMinutes)); } catch (err) { /* ignore */ }
          this.render(container);
          break;
        }
      }
    });

    // Pool search (partial refresh keeps input focus)
    const search = root.querySelector('#planner-pool-search');
    if (search) {
      search.addEventListener('input', Utils.debounce(() => {
        this.poolSearch = search.value;
        this.refreshPool(root);
      }, 120));
    }

    // Quick-add inputs
    root.querySelectorAll('[data-quickadd-key]').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          input.value = '';
          input.blur();
          return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const title = input.value.trim();
        if (!title) return;
        const projectId = AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : null);
        if (!projectId) {
          Toast.error ? Toast.error('Create a project first') : Toast.info('Create a project first');
          return;
        }
        this.refocusKey = input.dataset.quickaddKey;
        AppState.createTask({
          title,
          projectId,
          status: 'todo',
          plannedDate: input.dataset.quickaddKey
        });
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

    const getZone = (target) => target.closest('[data-drop-key], [data-drop-pool]');

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

      if (zone.dataset.dropPool) {
        if (task.plannedDate) {
          AppState.updateTask(task.id, { plannedDate: null });
          Toast.info(`${task.key} moved back to Unplanned`);
        }
        return;
      }
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

  refreshPool(root) {
    const list = root.querySelector('#planner-pool-list');
    if (!list) return;
    list.innerHTML = this.renderPoolItems(this.getScopedTasks(), this.getDays());
    this.updatePoolCount(root);
  },

  updatePoolCount(root) {
    const el = root.querySelector('#planner-pool-count');
    if (el) el.textContent = this._lastPoolCount || 0;
  }
};
