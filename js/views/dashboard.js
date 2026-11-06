/**
 * TaskForge - Modern Executive Command Center (Dashboard)
 *
 * High-density, zero-fluff workspace providing complete control over the entire app:
 * - Global Project Scope Switcher & Workspace Launchers
 * - Compact Inline Focus Timer (persists across views & logs tracked time)
 * - Smart Quick-Capture Bar with inline Project, Priority & Target selectors + syntax parsing
 * - 4-Card Interactive Operational Pulse Strip (Today, WIP, Triage, Active Sprint)
 * - Unified Execution Workbench with tabs (Today, Triage, In Progress, Sprint, Backlog, Done),
 *   segregated by project & naturally sorted by item IDs, with inline StatusControl & quick actions
 * - App Control Center: Projects Matrix, Sprint Lifecycle Controller & 7-Day Deadline Radar
 */

const DashboardView = {
  activeTab: 'today',
  groupByProject: true,
  workbenchQuery: '',
  refocusCapture: false,
  keyboardBound: false,
  timer: null,
  tickHandle: null,
  baseTitle: document.title || 'TaskForge',

  PRIORITY_SCORE: { critical: 100, highest: 80, high: 60, medium: 35, low: 15, lowest: 5 },
  PRIORITY_ICON: {
    critical: 'fa-angles-up', highest: 'fa-angles-up', high: 'fa-angle-up',
    medium: 'fa-equals', low: 'fa-angle-down', lowest: 'fa-angles-down'
  },
  TYPE_ICON: {
    bug: 'fa-circle-dot',
    story: 'fa-bookmark',
    epic: 'fa-bolt',
    subtask: 'fa-network-wired',
    task: 'fa-square-check'
  },
  PRESETS: [
    { work: 25, brk: 5, label: '25m' },
    { work: 50, brk: 10, label: '50m' },
    { work: 15, brk: 3, label: '15m' }
  ],
  CAPACITY_STEPS: [4, 5, 6, 7, 8],
  STORAGE: { timer: 'tf_dash_timer', focusLog: 'tf_dash_focus_log', capacity: 'tf_dash_capacity' },

  // -------------------------------------------------------------
  // CORE UTILITIES & SORTING
  // -------------------------------------------------------------

  readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  },

  writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* ignore */ }
  },

  todayKey() { return PlannerView.toKey(new Date()); },

  addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return PlannerView.toKey(new Date(y, m - 1, d + n));
  },

  dayDiff(fromKey, toKey) {
    const a = new Date(`${fromKey}T00:00:00`);
    const b = new Date(`${toKey}T00:00:00`);
    return Math.round((b - a) / 86400000);
  },

  dateKeyOf(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : PlannerView.toKey(d);
  },

  isOpen(task) { return task.status !== 'done' && task.status !== 'cancelled'; },

  esc(value) { return Utils.escapeHTML(value); },

  projectColor(task) {
    const color = PlannerView.getProjectColor(task);
    return /^#[0-9a-f]{3,8}$/i.test(color || '') ? color : '#388bfd';
  },

  fmtClock(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },

  getCapacityHours() {
    const value = Number(this.readJSON(this.STORAGE.capacity, 6));
    return this.CAPACITY_STEPS.includes(value) ? value : 6;
  },

  getFocusLog() { return this.readJSON(this.STORAGE.focusLog, {}); },

  getFocusToday() {
    const entry = this.getFocusLog()[this.todayKey()];
    return { minutes: entry ? entry.minutes || 0 : 0, sessions: entry ? entry.sessions || 0 : 0 };
  },

  /** Natural alphanumeric sort by item key/ID (e.g., WEB-1, WEB-2, WEB-10) */
  sortByItemId(a, b) {
    const keyA = a.key || a.id || '';
    const keyB = b.key || b.id || '';
    const cmp = keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
  },

  /** Segregates a list of tasks by project and sorts items within each project by item ID */
  groupTasksByProject(tasks) {
    const groups = [];
    const projectMap = new Map();

    (AppState.projects || []).forEach(p => {
      projectMap.set(p.id, { project: p, tasks: [] });
    });

    const noProjectGroup = {
      project: { id: null, name: 'No Project', key: '', color: '#6B6E76' },
      tasks: []
    };

    tasks.forEach(t => {
      if (t.projectId && projectMap.has(t.projectId)) {
        projectMap.get(t.projectId).tasks.push(t);
      } else {
        noProjectGroup.tasks.push(t);
      }
    });

    projectMap.forEach(group => {
      if (group.tasks.length > 0) {
        group.tasks.sort((a, b) => this.sortByItemId(a, b));
        groups.push(group);
      }
    });

    if (noProjectGroup.tasks.length > 0) {
      noProjectGroup.tasks.sort((a, b) => this.sortByItemId(a, b));
      groups.push(noProjectGroup);
    }

    return groups;
  },

  score(task, today) {
    let s = this.PRIORITY_SCORE[task.priority] ?? 35;
    const due = PlannerView.dueKey(task);
    if (due) {
      const diff = this.dayDiff(today, due);
      if (diff < 0) s += 90 + Math.min(30, -diff * 5);
      else if (diff === 0) s += 70;
      else if (diff === 1) s += 45;
      else if (diff <= 3) s += 25;
      else if (diff <= 7) s += 10;
    }
    if (task.plannedDate === today) s += 50;
    else if (task.plannedDate && task.plannedDate < today) s += 40;
    if (task.status === 'inprogress') s += 30;
    else if (task.status === 'inreview') s += 10;
    else if (task.status === 'backlog') s -= 10;
    const est = Number(task.estimate) || 0;
    if (est > 0 && est <= 30) s += 8;
    if (task.status === 'blocked') s -= 200;
    return s;
  },

  // -------------------------------------------------------------
  // CONTEXT & STATE AGGREGATION
  // -------------------------------------------------------------

  getContext() {
    const today = this.todayKey();
    const tomorrow = this.addDays(today, 1);
    const weekEnd = this.addDays(today, 7);
    const timer = this.loadTimer();

    const all = AppState.tasks.filter(t => !t.archived);
    const scoped = all.filter(t => !AppState.selectedProjectId || t.projectId === AppState.selectedProjectId);
    const byScore = (a, b) => this.score(b, today) - this.score(a, today);

    const plannedToday = scoped.filter(t => t.plannedDate === today && t.status !== 'cancelled');
    const todayOpen = plannedToday.filter(t => this.isOpen(t)).sort((a, b) => this.sortByItemId(a, b));

    const completedToday = new Map();
    scoped.forEach(t => {
      if (t.status !== 'done') return;
      if (this.dateKeyOf(t.completedAt) === today || t.plannedDate === today) completedToday.set(t.id, t);
    });
    const doneToday = [...completedToday.values()].sort((a, b) => this.sortByItemId(a, b));

    // Triage: blocked > overdue > carried over
    const attentionMap = new Map();
    scoped.filter(t => t.status === 'blocked').forEach(t => attentionMap.set(t.id, { task: t, reason: 'blocked', rank: 0 }));
    scoped.forEach(t => {
      if (!this.isOpen(t) || attentionMap.has(t.id)) return;
      const due = PlannerView.dueKey(t);
      if (due && due < today) attentionMap.set(t.id, { task: t, reason: 'overdue', rank: 1 });
    });
    scoped.forEach(t => {
      if (!this.isOpen(t) || attentionMap.has(t.id)) return;
      if (t.plannedDate && t.plannedDate < today) attentionMap.set(t.id, { task: t, reason: 'carryover', rank: 2 });
    });
    const attention = [...attentionMap.values()].sort((a, b) => a.rank - b.rank || this.sortByItemId(a.task, b.task));

    const wip = scoped.filter(t => t.status === 'inprogress' || t.status === 'inreview').sort((a, b) => this.sortByItemId(a, b));

    const ranked = scoped
      .filter(t => this.isOpen(t) && t.status !== 'blocked' && t.type !== 'epic')
      .sort(byScore);

    const backlogOpen = scoped
      .filter(t => this.isOpen(t) && t.plannedDate !== today)
      .sort((a, b) => this.sortByItemId(a, b));

    const suggestions = ranked
      .filter(t => t.plannedDate !== today && !attentionMap.has(t.id))
      .slice(0, 5);

    const availableForToday = scoped
      .filter(t => this.isOpen(t) && t.plannedDate !== today)
      .sort((a, b) => this.sortByItemId(a, b));

    const deadlines = scoped
      .filter(t => {
        const due = PlannerView.dueKey(t);
        return this.isOpen(t) && due && due <= weekEnd;
      })
      .sort((a, b) => PlannerView.dueKey(a).localeCompare(PlannerView.dueKey(b)) || this.sortByItemId(a, b))
      .slice(0, 8);

    const remainingMinutes = todayOpen.reduce((sum, t) =>
      sum + Math.max(0, (Number(t.estimate) || 0) - (Number(t.trackedTime) || 0)), 0);

    // Active / Planned Sprints
    const activeSprint = AppState.sprints.find(s =>
      s.status === 'active' && (!AppState.selectedProjectId || !s.projectId || s.projectId === AppState.selectedProjectId)
    ) || AppState.sprints.find(s => s.status === 'active');

    const plannedSprints = AppState.sprints.filter(s =>
      s.status === 'planned' && (!AppState.selectedProjectId || !s.projectId || s.projectId === AppState.selectedProjectId)
    );

    let sprint = null;
    if (activeSprint) {
      const sprintTasks = all.filter(t => t.sprintId === activeSprint.id && (!AppState.selectedProjectId || t.projectId === AppState.selectedProjectId));
      const openSprintTasks = sprintTasks.filter(t => this.isOpen(t)).sort((a, b) => this.sortByItemId(a, b));
      const done = sprintTasks.filter(t => t.status === 'done').length;
      const points = sprintTasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      const donePoints = sprintTasks.filter(t => t.status === 'done').reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      let daysLeft = null;
      let elapsedPct = null;
      if (activeSprint.endDate) {
        daysLeft = Math.ceil((new Date(activeSprint.endDate) - new Date()) / 86400000);
        if (activeSprint.startDate) {
          const start = new Date(activeSprint.startDate).getTime();
          const end = new Date(activeSprint.endDate).getTime();
          if (end > start) elapsedPct = Math.min(100, Math.max(0, Math.round((Date.now() - start) / (end - start) * 100)));
        }
      }
      sprint = {
        sprint: activeSprint,
        tasks: sprintTasks.sort((a, b) => this.sortByItemId(a, b)),
        openTasks: openSprintTasks,
        done,
        total: sprintTasks.length,
        percent: sprintTasks.length ? Math.round(done / sprintTasks.length * 100) : 0,
        points,
        donePoints,
        daysLeft,
        elapsedPct,
        todoCount: sprintTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length,
        wipCount: sprintTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length
      };
    }

    // Timer options
    const timerTask = timer.taskId ? AppState.tasks.find(t => t.id === timer.taskId && this.isOpen(t)) : null;
    const optionIds = new Set();
    const timerOptions = [];
    [...(timerTask ? [timerTask] : []), ...todayOpen, ...wip, ...ranked.slice(0, 12)].forEach(t => {
      if (!optionIds.has(t.id) && this.isOpen(t) && timerOptions.length < 20) {
        optionIds.add(t.id);
        timerOptions.push(t);
      }
    });

    const completedCount = doneToday.length;
    const todayTotal = completedCount + todayOpen.length;

    // Project stats
    const projectStats = AppState.projects.map(p => {
      const pTasks = all.filter(t => t.projectId === p.id);
      const pOpen = pTasks.filter(t => this.isOpen(t));
      const pDone = pTasks.filter(t => t.status === 'done');
      const pOverdue = pOpen.filter(t => {
        const d = PlannerView.dueKey(t);
        return d && d < today;
      });
      const pct = pTasks.length ? Math.round((pDone.length / pTasks.length) * 100) : 0;
      return {
        project: p,
        total: pTasks.length,
        open: pOpen.length,
        done: pDone.length,
        overdue: pOverdue.length,
        pct
      };
    });

    return {
      today, tomorrow, timer, all, scoped,
      todayOpen, doneToday, completedCount, todayTotal,
      todayPct: todayTotal ? Math.round(completedCount / todayTotal * 100) : 0,
      attention, attentionMap, ranked, suggestions, wip, backlogOpen, availableForToday,
      deadlines, remainingMinutes,
      capacityHours: this.getCapacityHours(),
      focus: this.getFocusToday(),
      timerOptions, sprint, plannedSprints, projectStats,
      project: AppState.projects.find(p => p.id === AppState.selectedProjectId) || null
    };
  },

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  render(container) {
    if (!container) return;
    this.bindKeyboard();
    const ctx = this.getContext();

    container.innerHTML = `
      <div class="view-page dash-page" id="dashboard-page">
        ${this.renderCommandBar(ctx)}
        ${this.renderQuickCapture(ctx)}
        ${this.renderPulseStrip(ctx)}
        <div class="dash-workspace">
          <div class="dash-workbench-col">
            ${this.renderWorkbench(ctx)}
          </div>
          <aside class="dash-control-col" aria-label="Application control center">
            ${this.renderProjectsControl(ctx)}
            ${this.renderSprintControl(ctx)}
            ${this.renderDeadlinesControl(ctx)}
          </aside>
        </div>
      </div>
    `;

    this.attachListeners(container, ctx);
    if (this.timer && this.timer.state === 'running') this.ensureTicking();

    if (this.refocusCapture) {
      this.refocusCapture = false;
      const input = container.querySelector('#dash-capture-input');
      if (input) input.focus();
    }
  },

  // 1. TOP COMMAND BAR & PROJECT SCOPE SWITCHER + INLINE FOCUS TIMER
  renderCommandBar(ctx) {
    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const allOpenCount = ctx.all.filter(t => this.isOpen(t)).length;

    const t = ctx.timer;
    const remaining = this.timerRemaining();
    const running = t.state === 'running';
    const activeTimerTask = t.taskId ? AppState.tasks.find(x => x.id === t.taskId) : null;

    return `
      <header class="dash-cmd-bar">
        <div class="dash-cmd-left">
          <div class="dash-cmd-title-row">
            <div class="dash-cmd-brand">
              <span class="dash-cmd-badge"><i class="fa-solid fa-terminal"></i></span>
              <div>
                <div class="dash-cmd-eyebrow">
                  <span>${dateLabel}</span>
                  <span class="dash-sep">·</span>
                  <span>${ctx.scoped.filter(x => this.isOpen(x)).length} open</span>
                  ${ctx.focus.minutes > 0 ? `<span class="dash-sep">·</span><span class="tone-violet"><i class="fa-solid fa-stopwatch"></i> ${Utils.formatMinutes(ctx.focus.minutes)} focused</span>` : ''}
                </div>
                <h1>Command Center</h1>
              </div>
            </div>
          </div>

          <!-- Global Project Scope Pills -->
          <div class="dash-scope-bar" role="tablist" aria-label="Project scope filter">
            <button type="button" class="dash-scope-pill ${!AppState.selectedProjectId ? 'is-active' : ''}" data-dash="scope-project" data-project-id="">
              <i class="fa-solid fa-layer-group"></i>
              <span>All Projects</span>
              <span class="dash-scope-count">${allOpenCount}</span>
            </button>
            ${ctx.projectStats.map(ps => `
              <button type="button" class="dash-scope-pill ${AppState.selectedProjectId === ps.project.id ? 'is-active' : ''}"
                data-dash="scope-project" data-project-id="${this.esc(ps.project.id)}" title="${this.esc(ps.project.name)}">
                <span class="dash-scope-dot" style="background:${ps.project.color || '#388bfd'}"></span>
                <span>${this.esc(ps.project.name)}</span>
                <span class="dash-scope-count">${ps.open}</span>
              </button>
            `).join('')}
            <button type="button" class="dash-scope-pill dash-scope-add" data-dash="new-project" title="Create New Project">
              <i class="fa-solid fa-plus"></i> Project
            </button>
          </div>
        </div>

        <div class="dash-cmd-right">
          <!-- Compact Inline Focus Timer -->
          <div class="dash-inline-timer ${running ? 'is-running' : ''} mode-${t.mode}" id="dash-timer">
            <button type="button" class="dash-timer-play" data-dash="timer-toggle" id="dash-timer-toggle" title="${running ? 'Pause focus timer (F)' : 'Start focus timer (F)'}">
              <i class="fa-solid ${running ? 'fa-pause' : 'fa-play'}"></i>
            </button>
            <div class="dash-timer-readout">
              <strong id="dash-timer-time">${this.fmtClock(remaining)}</strong>
              <select id="dash-timer-task" data-dash-timer-task title="Select task to log time to">
                <option value="">${t.mode === 'break' ? 'Break' : 'Focus task…'}</option>
                ${ctx.timerOptions.map(o => `<option value="${this.esc(o.id)}" ${o.id === t.taskId ? 'selected' : ''}>${this.esc(o.key)} · ${this.esc(o.title.slice(0, 26))}</option>`).join('')}
              </select>
            </div>
            <div class="dash-timer-mini-actions">
              ${this.PRESETS.map(p => `
                <button type="button" class="dash-preset-chip ${p.work === t.work ? 'is-active' : ''}" data-dash="timer-preset" data-work="${p.work}" data-brk="${p.brk}" title="${p.work}m focus / ${p.brk}m break">${p.label}</button>
              `).join('')}
              ${t.state !== 'idle' || t.mode === 'break' ? `
                <button type="button" class="dash-timer-stop-btn" data-dash="timer-stop" id="dash-timer-stop" title="Stop & log elapsed time">
                  <i class="fa-solid fa-stop"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Global App Creation & Control Actions -->
          <div class="dash-cmd-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-dash="bulk-create" title="Bulk Create Tasks">
              <i class="fa-solid fa-layer-group"></i> Bulk
            </button>
            <button type="button" class="btn btn-secondary btn-sm" data-dash="new-sprint" title="Create Sprint">
              <i class="fa-solid fa-repeat"></i> + Sprint
            </button>
            <button type="button" class="btn btn-primary btn-sm" data-dash="create" id="dash-create-task" title="Create Task (C)">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>
      </header>
    `;
  },

  // 2. SMART QUICK-CAPTURE BAR WITH INLINE SELECTORS
  renderQuickCapture(ctx) {
    const hasProject = AppState.projects.length > 0;
    const defaultProjId = AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : '');

    return `
      <section class="dash-capture-wrap" aria-label="Quick task capture">
        <form class="dash-capture" data-dash-capture autocomplete="off">
          <span class="dash-capture-icon"><i class="fa-solid fa-bolt"></i></span>
          <input id="dash-capture-input" type="text" maxlength="240" ${hasProject ? '' : 'disabled'}
            placeholder="${hasProject ? 'Quick capture task… (supports !high ~30m #bug or use controls →)' : 'Create a project first to capture tasks'}"
            aria-label="Quick capture a task">
          <div class="dash-capture-preview" data-dash-preview></div>

          <div class="dash-capture-controls">
            <select class="dash-capture-select" data-capture-project title="Target Project" ${hasProject ? '' : 'disabled'}>
              ${AppState.projects.map(p => `<option value="${this.esc(p.id)}" ${p.id === defaultProjId ? 'selected' : ''}>${this.esc(p.key)} · ${this.esc(p.name)}</option>`).join('')}
            </select>
            <select class="dash-capture-select" data-capture-priority title="Priority" ${hasProject ? '' : 'disabled'}>
              <option value="critical">! Critical</option>
              <option value="high">! High</option>
              <option value="medium" selected>= Medium</option>
              <option value="low">↓ Low</option>
            </select>
            <select class="dash-capture-select" data-capture-target title="Schedule / Target" ${hasProject ? '' : 'disabled'}>
              <option value="today" selected>📅 Today</option>
              <option value="tomorrow">🌅 Tomorrow</option>
              ${ctx.sprint ? `<option value="sprint">⚡ ${this.esc(ctx.sprint.sprint.name)}</option>` : ''}
              <option value="backlog">📥 Backlog</option>
            </select>
          </div>

          <button type="submit" class="btn btn-primary btn-sm dash-capture-submit" ${hasProject ? '' : 'disabled'} id="dash-capture-submit">
            <i class="fa-solid fa-plus"></i> Add <kbd>↵</kbd>
          </button>
        </form>
      </section>
    `;
  },

  parseCapture(raw) {
    const today = this.todayKey();
    const result = { title: '', priority: null, estimate: 0, plannedDate: undefined, dateLabel: null, type: 'task' };
    let text = ` ${raw || ''} `;

    const prio = text.match(/\s!(critical|highest|high|medium|low|lowest)(?=\s)/i);
    if (prio) { result.priority = prio[1].toLowerCase(); text = text.replace(prio[0], ' '); }

    const est = text.match(/\s~(\d+(?:\.\d+)?)\s?(m|min|h|hr)(?=\s)/i);
    if (est) {
      const value = parseFloat(est[1]);
      result.estimate = Math.round(/^h/i.test(est[2]) ? value * 60 : value);
      text = text.replace(est[0], ' ');
    }

    const type = text.match(/\s#(bug|story|improvement|task)(?=\s)/i);
    if (type) { result.type = type[1].toLowerCase(); text = text.replace(type[0], ' '); }

    const dateRe = /\s@(today|tomorrow|tmr|someday|later)(?=\s)|\s(today|tomorrow|tmr|someday|later)\s*$/i;
    const date = text.match(dateRe);
    if (date) {
      const word = (date[1] || date[2]).toLowerCase();
      if (word === 'today') { result.plannedDate = today; result.dateLabel = 'Today'; }
      else if (word === 'tomorrow' || word === 'tmr') { result.plannedDate = this.addDays(today, 1); result.dateLabel = 'Tomorrow'; }
      else if (word === 'someday' || word === 'later') { result.plannedDate = null; result.dateLabel = 'Backlog'; }
      text = text.replace(date[0], ' ');
    }

    result.title = text.replace(/\s+/g, ' ').trim();
    return result;
  },

  renderCapturePreview(parsed) {
    const chip = (icon, label, tone = '') => `<span class="dash-chip ${tone}"><i class="fa-solid ${icon}"></i>${label}</span>`;
    const parts = [];
    if (parsed.dateLabel) parts.push(chip('fa-calendar-check', parsed.dateLabel, 'tone-brand'));
    if (parsed.priority) parts.push(chip(this.PRIORITY_ICON[parsed.priority], parsed.priority, `prio-${parsed.priority}`));
    if (parsed.estimate) parts.push(chip('fa-clock', Utils.formatMinutes(parsed.estimate)));
    if (parsed.type !== 'task') parts.push(chip('fa-tag', parsed.type));
    return parts.join('');
  },

  // 3. 4-CARD INTERACTIVE OPERATIONAL PULSE STRIP
  renderPulseStrip(ctx) {
    const ringC = 2 * Math.PI * 16;
    const ringOffset = ringC * (1 - ctx.todayPct / 100);
    const s = ctx.sprint;

    return `
      <section class="dash-pulse-strip" aria-label="Operational metrics and quick tab filters">
        <!-- 1. Today's Execution -->
        <button type="button" class="dash-pulse-card ${this.activeTab === 'today' ? 'is-selected' : ''}" data-dash="switch-tab" data-tab="today">
          <div class="dash-kpi-ring">
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <circle class="dash-kpi-ring-track" cx="20" cy="20" r="16"></circle>
              <circle class="dash-kpi-ring-fill" cx="20" cy="20" r="16" style="stroke-dasharray:${ringC.toFixed(2)};stroke-dashoffset:${ringOffset.toFixed(2)}"></circle>
            </svg>
            <span>${ctx.todayPct}%</span>
          </div>
          <div class="dash-pulse-copy">
            <span class="dash-pulse-label">Today's Plan</span>
            <strong>${ctx.completedCount}/${ctx.todayTotal} <small>done · ${Utils.formatMinutes(ctx.remainingMinutes)} left</small></strong>
          </div>
        </button>

        <!-- 2. In Flight (WIP) -->
        <button type="button" class="dash-pulse-card ${this.activeTab === 'wip' ? 'is-selected' : ''}" data-dash="switch-tab" data-tab="wip">
          <span class="dash-kpi-icon tone-brand"><i class="fa-solid fa-bolt"></i></span>
          <div class="dash-pulse-copy">
            <span class="dash-pulse-label">In Progress (WIP)</span>
            <strong>${ctx.wip.length} <small>active · ${ctx.wip.filter(t => t.status === 'inreview').length} in review</small></strong>
          </div>
        </button>

        <!-- 3. Triage & Blockers -->
        <button type="button" class="dash-pulse-card ${ctx.attention.length ? 'is-alert' : ''} ${this.activeTab === 'triage' ? 'is-selected' : ''}" data-dash="switch-tab" data-tab="triage">
          <span class="dash-kpi-icon ${ctx.attention.length ? 'tone-danger' : 'tone-success'}">
            <i class="fa-solid ${ctx.attention.length ? 'fa-triangle-exclamation' : 'fa-check-double'}"></i>
          </span>
          <div class="dash-pulse-copy">
            <span class="dash-pulse-label">Needs Triage</span>
            <strong>${ctx.attention.length} <small>${ctx.attention.length ? 'overdue / blocked' : 'all clear'}</small></strong>
          </div>
        </button>

        <!-- 4. Active Sprint Pulse -->
        <button type="button" class="dash-pulse-card ${this.activeTab === 'sprint' ? 'is-selected' : ''}" data-dash="switch-tab" data-tab="sprint">
          <span class="dash-kpi-icon tone-violet"><i class="fa-solid fa-flag-checkered"></i></span>
          <div class="dash-pulse-copy">
            <span class="dash-pulse-label">${s ? this.esc(s.sprint.name) : 'Active Sprint'}</span>
            <strong>${s ? `${s.done}/${s.total} <small>tasks · ${s.percent}%</small>` : '<small>No active sprint</small>'}</strong>
          </div>
        </button>
      </section>
    `;
  },

  // 4. UNIFIED EXECUTION WORKBENCH
  renderWorkbench(ctx) {
    const tabs = [
      { id: 'today', label: "Today's Plan", icon: 'fa-calendar-day', count: ctx.todayOpen.length },
      { id: 'triage', label: 'Needs Triage', icon: 'fa-triangle-exclamation', count: ctx.attention.length, alert: ctx.attention.length > 0 },
      { id: 'wip', label: 'In Progress', icon: 'fa-bolt', count: ctx.wip.length },
      { id: 'sprint', label: 'Active Sprint', icon: 'fa-flag-checkered', count: ctx.sprint ? ctx.sprint.openTasks.length : 0 },
      { id: 'backlog', label: 'Backlog / All Open', icon: 'fa-inbox', count: ctx.backlogOpen.length },
      { id: 'done', label: 'Done Today', icon: 'fa-circle-check', count: ctx.doneToday.length }
    ];

    let activeTasks = [];
    let emptyIcon = 'fa-calendar-check';
    let emptyText = 'No tasks in this view.';
    let emptyAction = '';

    switch (this.activeTab) {
      case 'today':
        activeTasks = ctx.todayOpen;
        emptyIcon = 'fa-calendar-plus';
        emptyText = ctx.completedCount
          ? `All ${ctx.completedCount} planned task(s) for today are complete! Pull more from Add Existing or Auto-plan.`
          : 'Nothing planned for today yet. Use Add Existing or Auto-plan to build your schedule.';
        if (ctx.suggestions.length) {
          emptyAction = `<button type="button" class="btn btn-primary btn-sm" data-dash="autoplan"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-plan top ${Math.min(3, ctx.suggestions.length)} tasks</button>`;
        }
        break;
      case 'triage':
        activeTasks = ctx.attention.map(a => a.task);
        emptyIcon = 'fa-shield-heart';
        emptyText = 'Zero overdue, blocked, or carried-over tasks. Everything is clean!';
        break;
      case 'wip':
        activeTasks = ctx.wip;
        emptyIcon = 'fa-bolt';
        emptyText = 'No tasks currently in progress or review.';
        break;
      case 'sprint':
        activeTasks = ctx.sprint ? ctx.sprint.openTasks : [];
        emptyIcon = 'fa-flag-checkered';
        emptyText = ctx.sprint ? 'All tasks in this sprint are completed!' : 'No active sprint running right now.';
        if (!ctx.sprint) {
          emptyAction = `<button type="button" class="btn btn-primary btn-sm" data-dash="new-sprint"><i class="fa-solid fa-plus"></i> Create Sprint</button>`;
        } else {
          emptyAction = `<button type="button" class="btn btn-secondary btn-sm" data-dash="sprint-add-existing" data-sprint-id="${this.esc(ctx.sprint.sprint.id)}"><i class="fa-solid fa-link"></i> Add Existing Tasks</button>`;
        }
        break;
      case 'backlog':
        activeTasks = ctx.backlogOpen;
        emptyIcon = 'fa-inbox';
        emptyText = 'No open backlog tasks found.';
        break;
      case 'done':
        activeTasks = ctx.doneToday;
        emptyIcon = 'fa-trophy';
        emptyText = 'No tasks completed today yet. Check off a task to build momentum!';
        break;
    }

    const q = this.workbenchQuery.trim().toLowerCase();
    if (q) {
      activeTasks = activeTasks.filter(t =>
        (t.key && t.key.toLowerCase().includes(q)) ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.status && t.status.toLowerCase().includes(q)) ||
        (t.priority && t.priority.toLowerCase().includes(q))
      );
    }

    const movableTriageCount = ctx.attention.filter(a => a.reason !== 'blocked' && a.task.plannedDate !== ctx.today).length;

    return `
      <section class="dash-card dash-workbench" aria-label="Execution Workbench">
        <!-- Workbench Tabs Header -->
        <div class="dash-wb-header">
          <div class="dash-wb-tabs" role="tablist">
            ${tabs.map(tab => `
              <button type="button" role="tab" aria-selected="${this.activeTab === tab.id}"
                class="dash-wb-tab ${this.activeTab === tab.id ? 'is-active' : ''} ${tab.alert ? 'has-alert' : ''}"
                data-dash="switch-tab" data-tab="${tab.id}">
                <i class="fa-solid ${tab.icon}"></i>
                <span>${tab.label}</span>
                <span class="dash-wb-tab-count">${tab.count}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Workbench Controls & Context Actions Bar -->
        <div class="dash-wb-toolbar">
          <div class="dash-wb-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="search" id="dash-wb-search-input" value="${this.esc(this.workbenchQuery)}"
              placeholder="Filter ${tabs.find(t => t.id === this.activeTab)?.label || 'tasks'} by ID or title…" autocomplete="off">
          </div>

          <div class="dash-wb-tools">
            <button type="button" class="btn btn-ghost btn-sm ${this.groupByProject ? 'is-active-toggle' : ''}" data-dash="toggle-group-project" title="Segregate tasks by project and sort by item ID">
              <i class="fa-solid fa-folder-tree"></i> By Project
            </button>

            ${this.activeTab === 'today' ? `
              <details class="planner-task-menu dash-add-existing-menu">
                <summary class="btn btn-secondary btn-sm">
                  <i class="fa-solid fa-link"></i> Add Existing <span class="planner-menu-count">${ctx.availableForToday.length}</span>
                </summary>
                <div class="planner-action-popover planner-existing-popover dash-existing-popover">
                  <div class="dash-popover-head">
                    <span>Add existing task to Today</span>
                    <small>Segregated by project · Sorted by ID</small>
                  </div>
                  <label class="planner-smart-search">
                    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    <input type="search" data-dash-existing-search placeholder="Search open tasks by key or title…" autocomplete="off">
                  </label>
                  <div class="planner-smart-list" data-dash-existing-list>
                    ${this.renderAddExistingList(ctx.availableForToday, ctx)}
                  </div>
                </div>
              </details>
              ${ctx.suggestions.length ? `
                <button type="button" class="btn btn-ghost btn-sm" data-dash="autoplan" id="dash-autoplan" title="Auto-plan top ${Math.min(3, ctx.suggestions.length)} tasks for today">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-plan
                </button>
              ` : ''}
            ` : ''}

            ${this.activeTab === 'triage' && movableTriageCount > 0 ? `
              <button type="button" class="btn btn-primary btn-sm" data-dash="triage-all" id="dash-triage-all">
                <i class="fa-solid fa-arrow-right-to-bracket"></i> Move ${movableTriageCount} to Today
              </button>
            ` : ''}

            ${this.activeTab === 'sprint' && ctx.sprint ? `
              <button type="button" class="btn btn-secondary btn-sm" data-dash="sprint-add-existing" data-sprint-id="${this.esc(ctx.sprint.sprint.id)}">
                <i class="fa-solid fa-link"></i> Add Existing
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Workbench Task List (Segregated by Project & Sorted by Item ID) -->
        <div class="dash-wb-body" id="dash-wb-list">
          ${this.renderWorkbenchList(activeTasks, ctx, emptyIcon, emptyText, emptyAction)}
        </div>
      </section>
    `;
  },

  renderWorkbenchList(tasks, ctx, emptyIcon, emptyText, emptyAction) {
    if (!tasks.length) {
      return `
        <div class="dash-empty">
          <i class="fa-solid ${emptyIcon}"></i>
          <span>${emptyText}</span>
          ${emptyAction || ''}
        </div>
      `;
    }

    if (!this.groupByProject) {
      const sorted = [...tasks].sort((a, b) => this.sortByItemId(a, b));
      return `<div class="dash-list">${sorted.map(t => this.renderTaskRow(t, ctx)).join('')}</div>`;
    }

    const groups = this.groupTasksByProject(tasks);
    return `
      <div class="dash-project-groups">
        ${groups.map(g => {
          const p = g.project;
          const pColor = p.color || '#388bfd';
          return `
            <div class="dash-proj-group">
              <div class="dash-proj-group-header" style="--project-color: ${pColor};">
                <span class="dash-proj-group-dot" style="background: ${pColor};"></span>
                <span class="dash-proj-group-name">${this.esc(p.name)}</span>
                ${p.key ? `<span class="dash-proj-group-key">${this.esc(p.key)}</span>` : ''}
                <span class="dash-proj-group-count">${g.tasks.length}</span>
                ${p.id ? `
                  <button type="button" class="dash-proj-group-add" data-dash="create-in-project" data-project-id="${this.esc(p.id)}" title="New task in ${this.esc(p.name)}">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                ` : ''}
              </div>
              <div class="dash-list">
                ${g.tasks.map(t => this.renderTaskRow(t, ctx)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderAddExistingList(tasks, ctx, query = '') {
    const search = query.trim();
    const matches = search
      ? tasks.filter(t => Utils.fuzzyMatch(search, `${t.key} ${t.title} ${t.priority} ${t.status}`))
      : tasks;

    if (!matches.length) {
      return `<div class="planner-smart-empty">${search ? 'No matching tasks.' : 'All open tasks are already planned for today.'}</div>`;
    }

    const groups = this.groupTasksByProject(matches);
    return groups.map(group => {
      const p = group.project;
      const pColor = p.color || '#388bfd';
      return `
        <div class="planner-smart-group">
          <div class="planner-smart-group-header" style="--project-color: ${pColor};">
            <span class="planner-smart-group-dot" style="background: ${pColor};"></span>
            <span class="planner-smart-group-name" title="${this.esc(p.name)}">${this.esc(p.name)}</span>
            ${p.key ? `<span class="planner-smart-group-key">${this.esc(p.key)}</span>` : ''}
            <span class="planner-smart-group-count">${group.tasks.length}</span>
          </div>
          <div class="planner-smart-group-items">
            ${group.tasks.map(t => `
              <div class="planner-smart-item" data-task-id="${this.esc(t.id)}">
                <div class="planner-smart-copy" data-dash="open" title="Open task details">
                  <span class="planner-smart-key">${this.esc(t.key)}</span>
                  <span class="planner-smart-title">${this.esc(t.title)}</span>
                </div>
                <button type="button" class="planner-smart-add-btn" data-dash="plan-today" title="Add ${this.esc(t.key)} to Today">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  renderTaskRow(t, ctx) {
    const isDone = t.status === 'done';
    const due = PlannerView.dueKey(t);
    let dueBadge = '';
    if (due && !isDone) {
      const diff = this.dayDiff(ctx.today, due);
      if (diff < 0) dueBadge = `<span class="dash-due is-overdue" title="Due ${due}"><i class="fa-solid fa-triangle-exclamation"></i>${-diff}d overdue</span>`;
      else if (diff === 0) dueBadge = '<span class="dash-due is-today"><i class="fa-regular fa-calendar"></i>Due today</span>';
      else if (diff === 1) dueBadge = '<span class="dash-due"><i class="fa-regular fa-calendar"></i>Tomorrow</span>';
      else if (diff <= 7) dueBadge = `<span class="dash-due"><i class="fa-regular fa-calendar"></i>${diff}d</span>`;
    }

    const attentionEntry = ctx.attentionMap.get(t.id);
    let triageBadge = '';
    if (attentionEntry && !isDone) {
      if (attentionEntry.reason === 'blocked') {
        triageBadge = '<span class="dash-reason-badge tone-danger"><i class="fa-solid fa-ban"></i>Blocked</span>';
      } else if (attentionEntry.reason === 'carryover') {
        triageBadge = '<span class="dash-reason-badge tone-warning"><i class="fa-solid fa-clock-rotate-left"></i>Carryover</span>';
      }
    }

    const est = Number(t.estimate) || 0;
    const tracked = Number(t.trackedTime) || 0;
    const focusing = ctx.timer.taskId === t.id && ctx.timer.state === 'running' && ctx.timer.mode === 'focus';
    const typeIcon = this.TYPE_ICON[t.type] || 'fa-square-check';
    const inToday = t.plannedDate === ctx.today;
    const activeSprintId = ctx.sprint ? ctx.sprint.sprint.id : null;
    const inActiveSprint = activeSprintId && t.sprintId === activeSprintId;

    return `
      <div class="dash-row ${isDone ? 'is-done' : ''} ${focusing ? 'is-focusing' : ''}"
        data-task-id="${this.esc(t.id)}" style="--row-project:${this.projectColor(t)}">
        <button type="button" class="dash-check" data-dash="toggle-done" aria-pressed="${isDone}" title="${isDone ? 'Reopen task' : 'Mark as done'}">
          <i class="fa-solid fa-check"></i>
        </button>

        <div class="dash-row-main" data-dash="open" title="Click to open ${this.esc(t.key)} · Right-click for context menu">
          <div class="dash-row-topline">
            <span class="type-icon type-${this.esc(t.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
            <span class="dash-key">${this.esc(t.key)}</span>
            <span class="dash-prio prio-${this.esc(t.priority)}" title="${this.esc(t.priority)} priority">
              <i class="fa-solid ${this.PRIORITY_ICON[t.priority] || 'fa-equals'}"></i>
            </span>
            <span class="dash-row-title">${this.esc(t.title)}</span>
          </div>
          <div class="dash-row-meta">
            ${triageBadge}
            ${dueBadge}
            ${est || tracked ? `<span class="dash-est" title="Logged / Estimate"><i class="fa-regular fa-clock"></i>${Utils.formatMinutes(tracked)}${est ? `/${Utils.formatMinutes(est)}` : ''}</span>` : ''}
            ${t.storyPoints > 0 ? `<span class="dash-pts" title="Story points">${t.storyPoints}pt</span>` : ''}
            ${inToday ? '<span class="dash-plan-tag is-today"><i class="fa-solid fa-calendar-day"></i>Today</span>' : ''}
          </div>
        </div>

        <div class="dash-row-controls">
          ${typeof StatusControl !== 'undefined' ? StatusControl.pillHTML(t, 'dash-status-pill') : ''}
          <div class="dash-row-actions">
            ${!isDone ? `
              <button type="button" class="dash-row-btn ${focusing ? 'is-active' : ''}" data-dash="focus" title="${focusing ? 'Pause focus timer' : 'Start focus timer on this task'}">
                <i class="fa-solid ${focusing ? 'fa-pause' : 'fa-play'}"></i>
              </button>
              ${inToday
                ? `<button type="button" class="dash-row-btn" data-dash="plan-tomorrow" title="Push to Tomorrow"><i class="fa-solid fa-arrow-right"></i></button>
                   <button type="button" class="dash-row-btn" data-dash="unplan" title="Remove from Today"><i class="fa-solid fa-calendar-xmark"></i></button>`
                : `<button type="button" class="dash-row-btn is-label" data-dash="plan-today" title="Schedule for Today"><i class="fa-solid fa-plus"></i>Today</button>`
              }
              ${activeSprintId ? `
                <button type="button" class="dash-row-btn ${inActiveSprint ? 'is-active' : ''}" data-dash="toggle-sprint" data-sprint-id="${this.esc(activeSprintId)}"
                  title="${inActiveSprint ? 'Remove from active sprint' : 'Add to active sprint'}">
                  <i class="fa-solid fa-bolt"></i>
                </button>
              ` : ''}
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  // 5. RIGHT COLUMN: APP CONTROL CENTER
  renderProjectsControl(ctx) {
    return `
      <section class="dash-card dash-control-card" aria-label="Projects Control Matrix">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-brand"><i class="fa-solid fa-folder-tree"></i></span>
          <div class="dash-card-titles">
            <h2>Projects Control <span class="dash-count">${ctx.projectStats.length}</span></h2>
            <p>Scope, progress & direct view launchers</p>
          </div>
          <div class="dash-card-tools">
            <button type="button" class="btn btn-ghost btn-sm" data-dash="new-project" title="Create Project"><i class="fa-solid fa-plus"></i></button>
            <button type="button" class="btn btn-ghost btn-sm" data-dash="go" data-view="projects" title="Open Projects View"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
          </div>
        </div>

        <div class="dash-proj-matrix">
          ${ctx.projectStats.length ? ctx.projectStats.map(ps => {
            const p = ps.project;
            const isScoped = AppState.selectedProjectId === p.id;
            return `
              <div class="dash-proj-row ${isScoped ? 'is-scoped' : ''}" style="--proj-color:${p.color || '#388bfd'}">
                <div class="dash-proj-row-top">
                  <button type="button" class="dash-proj-select" data-dash="scope-project" data-project-id="${this.esc(isScoped ? '' : p.id)}" title="${isScoped ? 'Click to show All Projects' : `Filter dashboard by ${this.esc(p.name)}`}">
                    <span class="dash-proj-dot" style="background:${p.color || '#388bfd'}"></span>
                    <span class="dash-proj-name">${this.esc(p.name)}</span>
                    <span class="dash-proj-key">${this.esc(p.key)}</span>
                  </button>
                  <div class="dash-proj-stats">
                    ${ps.overdue ? `<span class="dash-proj-overdue" title="${ps.overdue} overdue"><i class="fa-solid fa-triangle-exclamation"></i>${ps.overdue}</span>` : ''}
                    <span class="dash-proj-pct">${ps.done}/${ps.total} · ${ps.pct}%</span>
                  </div>
                </div>

                <div class="dash-proj-bar"><i style="width:${ps.pct}%;background:${p.color || '#388bfd'}"></i></div>

                <div class="dash-proj-actions">
                  <a href="#/tasks?project=${encodeURIComponent(p.id)}&mode=board" class="dash-mini-link" title="Open Kanban Board">
                    <i class="fa-solid fa-table-columns"></i> Board
                  </a>
                  <a href="#/tasks?project=${encodeURIComponent(p.id)}&mode=list" class="dash-mini-link" title="Open List Grid">
                    <i class="fa-solid fa-list"></i> List
                  </a>
                  <a href="#/hierarchy?project=${encodeURIComponent(p.id)}" class="dash-mini-link" title="Open Hierarchy Tree">
                    <i class="fa-solid fa-sitemap"></i> Tree
                  </a>
                  <button type="button" class="dash-mini-link" data-dash="create-in-project" data-project-id="${this.esc(p.id)}" title="Create task in ${this.esc(p.name)}">
                    <i class="fa-solid fa-plus"></i> Task
                  </button>
                  <button type="button" class="dash-mini-link" data-dash="edit-project" data-project-id="${this.esc(p.id)}" title="Edit Project">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="dash-empty is-compact">
              <span>No projects yet.</span>
              <button type="button" class="btn btn-primary btn-sm" data-dash="new-project"><i class="fa-solid fa-plus"></i> Create Project</button>
            </div>
          `}
        </div>
      </section>
    `;
  },

  renderSprintControl(ctx) {
    const s = ctx.sprint;
    if (!s) {
      const nextPlanned = ctx.plannedSprints[0] || null;
      return `
        <section class="dash-card dash-control-card" aria-label="Sprint Lifecycle Control">
          <div class="dash-card-head">
            <span class="dash-card-icon tone-violet"><i class="fa-solid fa-flag-checkered"></i></span>
            <div class="dash-card-titles">
              <h2>Sprint Control</h2>
              <p>${nextPlanned ? `Planned: ${this.esc(nextPlanned.name)}` : 'No active cycle'}</p>
            </div>
            <div class="dash-card-tools">
              <button type="button" class="btn btn-ghost btn-sm" data-dash="go" data-view="backlog" title="Open Sprint Planning"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
            </div>
          </div>
          <div class="dash-sprint-empty-ctrl">
            ${nextPlanned ? `
              <button type="button" class="btn btn-primary btn-sm" data-dash="start-sprint" data-sprint-id="${this.esc(nextPlanned.id)}">
                <i class="fa-solid fa-play"></i> Start ${this.esc(nextPlanned.name)}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" data-dash="sprint-add-existing" data-sprint-id="${this.esc(nextPlanned.id)}">
                <i class="fa-solid fa-link"></i> Add Existing
              </button>
            ` : `
              <button type="button" class="btn btn-primary btn-sm" data-dash="new-sprint">
                <i class="fa-solid fa-plus"></i> Create Sprint
              </button>
            `}
          </div>
        </section>
      `;
    }

    const schedule = s.daysLeft === null ? 'Active' : s.daysLeft > 0 ? `${s.daysLeft}d left` : s.daysLeft === 0 ? 'Ends today' : `${-s.daysLeft}d overdue`;

    return `
      <section class="dash-card dash-control-card dash-sprint" aria-label="Active Sprint Control">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-violet"><i class="fa-solid fa-flag-checkered"></i></span>
          <div class="dash-card-titles">
            <h2>${this.esc(s.sprint.name)}</h2>
            <p>${this.esc(schedule)} · ${s.done}/${s.total} tasks · ${s.donePoints}/${s.points} pts</p>
          </div>
          <div class="dash-card-tools">
            <button type="button" class="btn btn-ghost btn-sm" data-dash="go" data-view="backlog" title="Open Sprint Planning"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
          </div>
        </div>

        <div class="dash-sprint-bar" title="${s.percent}% complete">
          <i style="width:${s.percent}%"></i>
          ${s.elapsedPct !== null ? `<b style="left:${s.elapsedPct}%" title="${s.elapsedPct}% time elapsed"></b>` : ''}
        </div>

        <div class="dash-sprint-breakdown">
          <span><b>${s.todoCount}</b> To Do</span>
          <span><b>${s.wipCount}</b> In Flight</span>
          <span><b>${s.done}</b> Done (${s.percent}%)</span>
        </div>

        <div class="dash-sprint-ctrl-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-dash="sprint-add-existing" data-sprint-id="${this.esc(s.sprint.id)}">
            <i class="fa-solid fa-link"></i> Add Existing
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-dash="create-in-sprint" data-sprint-id="${this.esc(s.sprint.id)}" data-project-id="${this.esc(s.sprint.projectId || '')}">
            <i class="fa-solid fa-plus"></i> Issue
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-dash="complete-sprint" data-sprint-id="${this.esc(s.sprint.id)}" title="Complete Sprint">
            <i class="fa-solid fa-flag-checkered"></i> Complete
          </button>
        </div>
      </section>
    `;
  },

  renderDeadlinesControl(ctx) {
    return `
      <section class="dash-card dash-control-card" aria-label="Upcoming Deadlines & Schedule">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-danger"><i class="fa-regular fa-calendar"></i></span>
          <div class="dash-card-titles">
            <h2>Deadlines Radar <span class="dash-count">${ctx.deadlines.length}</span></h2>
            <p>Due within the next 7 days</p>
          </div>
          <div class="dash-card-tools">
            <button type="button" class="btn btn-ghost btn-sm" data-dash="go" data-view="planner" title="Open 3-Day Planner">
              <i class="fa-solid fa-calendar-day"></i> Planner
            </button>
          </div>
        </div>

        <div class="dash-deadlines">
          ${ctx.deadlines.length ? ctx.deadlines.map(t => {
            const due = PlannerView.dueKey(t);
            const diff = this.dayDiff(ctx.today, due);
            const date = new Date(`${due}T00:00:00`);
            const badgeLabel = diff < 0 ? `${-diff}d late` : diff === 0 ? 'Today' : diff === 1 ? 'Tmrw' : date.toLocaleDateString('en-US', { weekday: 'short' });
            const toneClass = diff <= 0 ? 'is-today' : diff === 1 ? 'is-soon' : '';
            const inToday = t.plannedDate === ctx.today;
            return `
              <div class="dash-deadline ${toneClass}" data-task-id="${this.esc(t.id)}" style="--row-project:${this.projectColor(t)}">
                <span class="dash-deadline-date">
                  <b>${badgeLabel}</b>
                  <small>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
                </span>
                <div class="dash-deadline-copy" data-dash="open" title="Open ${this.esc(t.key)}">
                  <span>${this.esc(t.title)}</span>
                  <small><span class="dash-key">${this.esc(t.key)}</span> · ${this.esc(StatusControl.label(t.status))}</small>
                </div>
                ${!inToday ? `
                  <button type="button" class="dash-row-btn is-label" data-dash="plan-today" title="Plan for Today">
                    <i class="fa-solid fa-plus"></i>Today
                  </button>
                ` : '<span class="dash-plan-tag is-today">Today</span>'}
              </div>
            `;
          }).join('') : `
            <div class="dash-empty is-compact">
              <i class="fa-regular fa-calendar-check"></i>
              <span>No upcoming deadlines in the next 7 days.</span>
            </div>
          `}
        </div>
      </section>
    `;
  },

  // -------------------------------------------------------------
  // EVENTS & INTERACTIVITY
  // -------------------------------------------------------------

  attachListeners(container, ctx) {
    const root = container.querySelector('#dashboard-page');
    if (!root) return;

    root.addEventListener('click', (e) => {
      // 1. Shared StatusControl pill menu trigger
      const statusBtn = e.target.closest('[data-status-action="menu"]');
      if (statusBtn && root.contains(statusBtn)) {
        e.stopPropagation();
        StatusControl.openMenu(statusBtn, statusBtn.dataset.taskId);
        return;
      }

      // 2. Dashboard action triggers
      const el = e.target.closest('[data-dash]');
      if (!el || !root.contains(el)) return;
      const action = el.dataset.dash;
      const holder = el.closest('[data-task-id]');
      const task = holder ? AppState.tasks.find(t => t.id === holder.dataset.taskId) : null;
      const ctxToday = this.todayKey();

      switch (action) {
        case 'open':
          if (task) TaskModal.openDetail(task.id);
          break;
        case 'create':
          TaskModal.openCreate({ projectId: AppState.selectedProjectId || undefined });
          break;
        case 'create-in-project':
          TaskModal.openCreate({ projectId: el.dataset.projectId });
          break;
        case 'create-in-sprint':
          TaskModal.openCreate({ sprintId: el.dataset.sprintId, projectId: el.dataset.projectId || undefined });
          break;
        case 'bulk-create':
          if (typeof TaskModal.openBulkCreate === 'function') {
            TaskModal.openBulkCreate({ projectId: AppState.selectedProjectId || undefined });
          }
          break;
        case 'new-project':
          if (typeof ProjectsView !== 'undefined') ProjectsView.openCreateModal();
          break;
        case 'edit-project':
          if (typeof ProjectsView !== 'undefined') ProjectsView.openEditModal(el.dataset.projectId);
          break;
        case 'new-sprint':
          if (typeof BacklogView !== 'undefined') BacklogView.openCreateSprintModal();
          break;
        case 'sprint-add-existing':
          if (typeof BacklogView !== 'undefined') BacklogView.openAddExistingTasksModal(el.dataset.sprintId);
          break;
        case 'start-sprint':
          if (typeof BacklogView !== 'undefined') BacklogView.startSprint(el.dataset.sprintId);
          break;
        case 'complete-sprint':
          if (typeof BacklogView !== 'undefined') BacklogView.completeSprint(el.dataset.sprintId);
          break;
        case 'scope-project': {
          const nextProjId = el.dataset.projectId || null;
          AppState.selectedProjectId = nextProjId;
          Router.updateTopbarProjectPicker();
          if (typeof Sidebar !== 'undefined' && Sidebar.renderProjectShortcuts) Sidebar.renderProjectShortcuts();
          Router.renderCurrentRoute();
          break;
        }
        case 'switch-tab':
          this.activeTab = el.dataset.tab || 'today';
          Router.renderCurrentRoute();
          break;
        case 'toggle-group-project':
          this.groupByProject = !this.groupByProject;
          Router.renderCurrentRoute();
          break;
        case 'go':
          e.preventDefault();
          Router.navigate(el.dataset.view);
          break;
        case 'toggle-done':
          if (!task) break;
          e.stopPropagation();
          this.toggleDone(task);
          break;
        case 'plan-today':
          if (task) {
            AppState.updateTask(task.id, { plannedDate: ctxToday });
            Toast.success(`${task.key} planned for Today`);
          }
          break;
        case 'plan-tomorrow':
          if (task) {
            AppState.updateTask(task.id, { plannedDate: this.addDays(ctxToday, 1) });
            Toast.info(`${task.key} pushed to Tomorrow`);
          }
          break;
        case 'unplan':
          if (task) {
            AppState.updateTask(task.id, { plannedDate: null });
            Toast.info(`${task.key} removed from Today`);
          }
          break;
        case 'toggle-sprint': {
          if (!task) break;
          const targetSprintId = el.dataset.sprintId;
          const nextSprintId = task.sprintId === targetSprintId ? null : targetSprintId;
          AppState.updateTask(task.id, { sprintId: nextSprintId });
          Toast.info(nextSprintId ? `${task.key} added to sprint` : `${task.key} removed from sprint`);
          break;
        }
        case 'autoplan':
          this.autoPlan();
          break;
        case 'triage-all':
          this.triageAll();
          break;
        case 'focus':
          if (task) this.focusOn(task.id);
          break;
        case 'timer-toggle':
          this.toggleTimer();
          break;
        case 'timer-stop':
          this.stopTimer();
          break;
        case 'timer-preset':
          this.setPreset(Number(el.dataset.work), Number(el.dataset.brk));
          break;
      }
    });

    // Right-click on any task row opens full ContextMenu
    root.addEventListener('contextmenu', (e) => {
      const row = e.target.closest('.dash-row[data-task-id]');
      if (!row || typeof ContextMenu === 'undefined') return;
      const task = AppState.tasks.find(t => t.id === row.dataset.taskId);
      if (!task) return;
      e.preventDefault();
      ContextMenu.open(e.clientX, e.clientY, task);
    });

    // Timer task selector
    root.addEventListener('change', (e) => {
      const select = e.target.closest('[data-dash-timer-task]');
      if (select) this.switchTimerTask(select.value || null);
    });

    // Workbench search input + Add Existing inline search
    root.addEventListener('input', (e) => {
      const wbSearch = e.target.closest('#dash-wb-search-input');
      if (wbSearch) {
        this.workbenchQuery = wbSearch.value;
        const pos = wbSearch.selectionStart;
        Router.renderCurrentRoute();
        const nextInput = container.querySelector('#dash-wb-search-input');
        if (nextInput) {
          nextInput.focus();
          try { nextInput.setSelectionRange(pos, pos); } catch (err) { /* ignore */ }
        }
        return;
      }

      const existingSearch = e.target.closest('[data-dash-existing-search]');
      if (existingSearch) {
        const listEl = root.querySelector('[data-dash-existing-list]');
        if (listEl) {
          const latestCtx = this.getContext();
          listEl.innerHTML = this.renderAddExistingList(latestCtx.availableForToday, latestCtx, existingSearch.value);
        }
      }
    });

    // Quick capture form
    const form = root.querySelector('[data-dash-capture]');
    const input = root.querySelector('#dash-capture-input');
    const preview = root.querySelector('[data-dash-preview]');
    if (form && input) {
      input.addEventListener('input', () => {
        if (preview) preview.innerHTML = this.renderCapturePreview(this.parseCapture(input.value));
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { input.value = ''; if (preview) preview.innerHTML = ''; input.blur(); }
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const projSelect = form.querySelector('[data-capture-project]');
        const prioSelect = form.querySelector('[data-capture-priority]');
        const targetSelect = form.querySelector('[data-capture-target]');
        this.capture(input.value, {
          projectId: projSelect ? projSelect.value : null,
          priority: prioSelect ? prioSelect.value : 'medium',
          target: targetSelect ? targetSelect.value : 'today'
        }, ctx);
      });
    }
  },

  bindKeyboard() {
    if (this.keyboardBound) return;
    this.keyboardBound = true;
    window.addEventListener('keydown', (e) => {
      if (AppState.currentView !== 'dashboard' || e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) return;
      if ((typeof TaskModal !== 'undefined' && TaskModal.isOpen) ||
        (typeof Modal !== 'undefined' && Modal.isOpen) ||
        (typeof CommandPalette !== 'undefined' && CommandPalette.isOpen)) return;

      const key = e.key.toLowerCase();
      if (key === 'q') {
        e.preventDefault();
        document.getElementById('dash-capture-input')?.focus();
      } else if (key === 'f') {
        e.preventDefault();
        this.toggleTimer();
      }
    });
  },

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------

  capture(raw, overrides = {}, ctx) {
    const parsed = this.parseCapture(raw);
    if (!parsed.title) {
      Toast.warning('Type a task title first');
      return;
    }
    const projectId = overrides.projectId || AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : null);
    if (!projectId) {
      Toast.error('Create a project first');
      return;
    }

    const today = this.todayKey();
    let plannedDate = parsed.plannedDate;
    let sprintId = null;

    if (plannedDate === undefined) {
      if (overrides.target === 'today') plannedDate = today;
      else if (overrides.target === 'tomorrow') plannedDate = this.addDays(today, 1);
      else if (overrides.target === 'sprint' && ctx && ctx.sprint) {
        sprintId = ctx.sprint.sprint.id;
        plannedDate = today;
      } else {
        plannedDate = null;
      }
    }

    this.refocusCapture = true;
    const task = AppState.createTask({
      title: parsed.title,
      projectId,
      status: 'todo',
      priority: parsed.priority || overrides.priority || 'medium',
      type: parsed.type || 'task',
      estimate: parsed.estimate || 0,
      plannedDate,
      sprintId
    });
    if (task) Toast.success(`Created ${task.key}`);
  },

  toggleDone(task) {
    const next = task.status === 'done' ? 'todo' : 'done';
    if (next === 'done' && this.timer && this.timer.taskId === task.id && this.timer.mode === 'focus' && this.timer.state !== 'idle') {
      this.stopTimer(true);
    }
    AppState.updateTask(task.id, { status: next });
    if (next === 'done') Toast.success(`${task.key} completed 🎉`);
  },

  autoPlan() {
    const ctx = this.getContext();
    const picks = ctx.suggestions.slice(0, 3);
    if (!picks.length) return;
    AppState.bulkUpdateTasks(picks.map(t => t.id), { plannedDate: ctx.today });
    Toast.success(`Planned ${picks.length} task${picks.length === 1 ? '' : 's'} for Today`);
  },

  triageAll() {
    const ctx = this.getContext();
    const ids = ctx.attention
      .filter(a => a.reason !== 'blocked' && a.task.plannedDate !== ctx.today)
      .map(a => a.task.id);
    if (!ids.length) return;
    AppState.bulkUpdateTasks(ids, { plannedDate: ctx.today });
    Toast.success(`Moved ${ids.length} task${ids.length === 1 ? '' : 's'} to Today`);
  },

  // -------------------------------------------------------------
  // FOCUS TIMER (persists across views and reloads)
  // -------------------------------------------------------------

  loadTimer() {
    if (this.timer) return this.timer;
    const defaults = { state: 'idle', mode: 'focus', work: 25, brk: 5, remaining: 25 * 60, endAt: null, taskId: null, credited: 0 };
    this.timer = Object.assign(defaults, this.readJSON(this.STORAGE.timer, {}) || {});
    if (this.timer.state === 'running') setTimeout(() => this.ensureTicking(), 0);
    return this.timer;
  },

  saveTimer() { this.writeJSON(this.STORAGE.timer, this.timer); },

  timerTotal() {
    const t = this.loadTimer();
    return (t.mode === 'break' ? t.brk : t.work) * 60;
  },

  timerRemaining() {
    const t = this.loadTimer();
    if (t.state === 'running' && t.endAt) return Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
    return Math.max(0, Math.min(t.remaining, this.timerTotal()));
  },

  resetTimer(mode = 'focus') {
    const t = this.loadTimer();
    t.mode = mode;
    t.state = 'idle';
    t.endAt = null;
    t.credited = 0;
    t.remaining = this.timerTotal();
  },

  startTimer() {
    const t = this.loadTimer();
    const remaining = this.timerRemaining() || this.timerTotal();
    t.state = 'running';
    t.endAt = Date.now() + remaining * 1000;
    this.saveTimer();
    this.ensureTicking();
  },

  pauseTimer() {
    const t = this.loadTimer();
    t.remaining = this.timerRemaining();
    t.state = 'paused';
    t.endAt = null;
    this.saveTimer();
    this.stopTicking();
  },

  toggleTimer() {
    const t = this.loadTimer();
    if (t.state === 'running') {
      this.pauseTimer();
    } else {
      if (t.mode === 'focus' && t.state === 'idle') {
        Toast.info(t.taskId ? 'Focus session started.' : 'Focus timer started.');
      }
      this.startTimer();
    }
    this.rerenderIfVisible();
  },

  focusOn(taskId) {
    const t = this.loadTimer();
    if (t.taskId === taskId && t.mode === 'focus' && t.state === 'running') {
      this.pauseTimer();
      this.rerenderIfVisible();
      return;
    }
    if (t.mode === 'break') this.resetTimer('focus');
    this.switchTimerTask(taskId, false);
    const task = AppState.tasks.find(x => x.id === taskId);
    if (task && task.status !== 'inprogress' && task.status !== 'inreview') {
      this.startTimer();
      AppState.updateTask(taskId, { status: 'inprogress', plannedDate: task.plannedDate || this.todayKey() });
      Toast.info(`Focusing on ${task.key}`);
      return;
    }
    this.startTimer();
    if (task) Toast.info(`Focusing on ${task.key}`);
    this.rerenderIfVisible();
  },

  unloggedSeconds() {
    const t = this.loadTimer();
    if (t.mode !== 'focus') return 0;
    return Math.max(0, this.timerTotal() - this.timerRemaining() - (t.credited || 0));
  },

  switchTimerTask(taskId, rerender = true) {
    const t = this.loadTimer();
    if (t.taskId === taskId) return;
    const minutes = Math.floor(this.unloggedSeconds() / 60);
    const previous = t.taskId;
    t.taskId = taskId;
    if (minutes >= 1) {
      t.credited = (t.credited || 0) + minutes * 60;
      this.saveTimer();
      this.logMinutes(previous, minutes, false);
    } else {
      this.saveTimer();
      if (rerender) this.rerenderIfVisible();
    }
  },

  stopTimer(silent = false) {
    const t = this.loadTimer();
    if (t.mode === 'break') {
      this.resetTimer('focus');
      this.saveTimer();
      this.stopTicking();
      if (!silent) Toast.info('Break skipped.');
      this.rerenderIfVisible();
      return;
    }
    const minutes = Math.floor(this.unloggedSeconds() / 60);
    const taskId = t.taskId;
    this.resetTimer('focus');
    this.saveTimer();
    this.stopTicking();
    if (minutes >= 1) {
      if (!silent) Toast.success(`Logged ${Utils.formatMinutes(minutes)} of focus`);
      this.logMinutes(taskId, minutes, false);
    } else {
      this.rerenderIfVisible();
    }
  },

  setPreset(work, brk) {
    const t = this.loadTimer();
    if (!work || !brk) return;
    if (t.mode === 'focus' && t.state !== 'idle') {
      const minutes = Math.floor(this.unloggedSeconds() / 60);
      if (minutes >= 1) this.logMinutes(t.taskId, minutes, false, false);
    }
    t.work = work;
    t.brk = brk;
    this.resetTimer('focus');
    this.saveTimer();
    this.stopTicking();
    this.rerenderIfVisible();
  },

  completePhase() {
    const t = this.loadTimer();
    Utils.playSound('timer');
    if (t.mode === 'focus') {
      const minutes = Math.round((this.timerTotal() - (t.credited || 0)) / 60);
      const taskId = t.taskId;
      const work = t.work;
      t.mode = 'break';
      t.credited = 0;
      t.state = 'running';
      t.endAt = Date.now() + t.brk * 60 * 1000;
      t.remaining = t.brk * 60;
      this.saveTimer();
      Toast.success(`${work}m session complete! Taking ${t.brk}m break.`);
      this.logMinutes(taskId, minutes, true);
    } else {
      this.resetTimer('focus');
      this.saveTimer();
      this.stopTicking();
      Toast.info('Break over — ready for next session.');
      this.rerenderIfVisible();
    }
  },

  logMinutes(taskId, minutes, countSession, rerender = true) {
    const today = this.todayKey();
    const log = this.getFocusLog();
    const entry = log[today] || { minutes: 0, sessions: 0 };
    entry.minutes += Math.max(0, minutes);
    if (countSession) entry.sessions += 1;
    log[today] = entry;
    Object.keys(log).sort().slice(0, -60).forEach(key => delete log[key]);
    this.writeJSON(this.STORAGE.focusLog, log);

    const task = taskId ? AppState.tasks.find(x => x.id === taskId) : null;
    if (task && minutes > 0) {
      AppState.updateTask(task.id, { trackedTime: (Number(task.trackedTime) || 0) + minutes });
    } else if (rerender) {
      this.rerenderIfVisible();
    }
  },

  ensureTicking() {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => this.tick(), 1000);
    this.tick();
  },

  stopTicking() {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = null;
    document.title = this.baseTitle;
  },

  tick() {
    const t = this.loadTimer();
    if (t.state !== 'running') {
      this.stopTicking();
      return;
    }
    const remaining = this.timerRemaining();
    if (remaining <= 0) {
      this.completePhase();
      return;
    }
    const clock = this.fmtClock(remaining);
    document.title = `${t.mode === 'break' ? '☕' : '⏱'} ${clock} · TaskForge`;
    const time = document.getElementById('dash-timer-time');
    if (time) time.textContent = clock;
  },

  rerenderIfVisible() {
    if (AppState.currentView === 'dashboard') Router.renderCurrentRoute();
  }
};
