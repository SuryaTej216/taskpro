/**
 * TaskForge - Productivity Command Center (Dashboard)
 *
 * An action-first home screen. Everything here is one click (or one key) away:
 * - Quick capture with inline syntax (!high ~30m tomorrow #bug)
 * - "Do this next": a single ranked recommendation (deadline + priority + plan + momentum)
 * - Today's plan with complete / push / unplan actions and an auto-planner
 * - Triage of overdue, blocked and carried-over work
 * - Built-in focus timer that logs tracked time to the task
 * - Work-in-progress, smart "Up next" suggestions, deadlines and sprint pulse
 *
 * Dashboard shortcuts: Q = capture · F = start/pause focus · N = next suggestion
 */

const DashboardView = {
  skipIds: new Set(),
  refocusCapture: false,
  keyboardBound: false,
  timer: null,
  tickHandle: null,
  baseTitle: document.title || 'TaskForge',

  RING_C: 2 * Math.PI * 52,
  PRIORITY_SCORE: { critical: 100, highest: 80, high: 60, medium: 35, low: 15, lowest: 5 },
  PRIORITY_ICON: {
    critical: 'fa-angles-up', highest: 'fa-angles-up', high: 'fa-angle-up',
    medium: 'fa-equals', low: 'fa-angle-down', lowest: 'fa-angles-down'
  },
  PRESETS: [
    { work: 25, brk: 5, label: '25 / 5' },
    { work: 50, brk: 10, label: '50 / 10' },
    { work: 15, brk: 3, label: '15 / 3' }
  ],
  CAPACITY_STEPS: [4, 5, 6, 7, 8],
  SESSION_GOAL: 4,
  STORAGE: { timer: 'tf_dash_timer', focusLog: 'tf_dash_focus_log', capacity: 'tf_dash_capacity' },

  // -------------------------------------------------------------
  // SMALL HELPERS
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
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* storage full / blocked */ }
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
    return /^#[0-9a-f]{3,8}$/i.test(color || '') ? color : '#579DFF';
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

  /** Ranking used by "Do this next" and suggestions. Higher = do sooner. */
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

  reasonsFor(task, today) {
    const reasons = [];
    const due = PlannerView.dueKey(task);
    if (due) {
      const diff = this.dayDiff(today, due);
      if (diff < 0) reasons.push({ tone: 'danger', icon: 'fa-triangle-exclamation', label: `Overdue ${-diff}d` });
      else if (diff === 0) reasons.push({ tone: 'danger', icon: 'fa-calendar-day', label: 'Due today' });
      else if (diff === 1) reasons.push({ tone: 'warning', icon: 'fa-calendar', label: 'Due tomorrow' });
      else if (diff <= 7) reasons.push({ tone: 'warning', icon: 'fa-calendar', label: `Due in ${diff}d` });
    }
    if (task.plannedDate === today) reasons.push({ tone: 'brand', icon: 'fa-calendar-check', label: 'Planned today' });
    else if (task.plannedDate && task.plannedDate < today) reasons.push({ tone: 'warning', icon: 'fa-clock-rotate-left', label: 'Carried over' });
    if (task.status === 'inprogress') reasons.push({ tone: 'brand', icon: 'fa-bolt', label: 'Already started' });
    if (task.status === 'inreview') reasons.push({ tone: 'violet', icon: 'fa-eye', label: 'In review' });
    if (['critical', 'highest', 'high'].includes(task.priority)) {
      reasons.push({ tone: task.priority === 'high' ? 'warning' : 'danger', icon: this.PRIORITY_ICON[task.priority], label: `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority` });
    }
    const est = Number(task.estimate) || 0;
    if (est > 0 && est <= 30) reasons.push({ tone: 'success', icon: 'fa-feather', label: 'Quick win' });
    return reasons;
  },

  // -------------------------------------------------------------
  // DATA
  // -------------------------------------------------------------

  getContext() {
    const today = this.todayKey();
    const tomorrow = this.addDays(today, 1);
    const weekEnd = this.addDays(today, 7);
    const timer = this.loadTimer();

    const all = AppState.tasks.filter(t => !t.archived);
    const scoped = all.filter(t => !AppState.selectedProjectId || t.projectId === AppState.selectedProjectId);
    const byScore = (a, b) => this.score(b, today) - this.score(a, today);

    // Parents whose subtasks are still open are tracked via those subtasks instead.
    const parentsWithOpenKids = new Set(scoped.filter(t => t.parentId && this.isOpen(t)).map(t => t.parentId));

    const plannedToday = scoped.filter(t => t.plannedDate === today && t.status !== 'cancelled');
    const todayOpen = plannedToday.filter(t => this.isOpen(t)).sort((a, b) => PlannerView.sortPlanned(a, b));
    const completedToday = new Map();
    scoped.forEach(t => {
      if (t.status !== 'done') return;
      if (this.dateKeyOf(t.completedAt) === today || t.plannedDate === today) completedToday.set(t.id, t);
    });
    const doneToday = [...completedToday.values()]
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

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
    const attention = [...attentionMap.values()].sort((a, b) => a.rank - b.rank || byScore(a.task, b.task));

    const ranked = scoped
      .filter(t => this.isOpen(t) && t.status !== 'blocked' && t.type !== 'epic' && !parentsWithOpenKids.has(t.id))
      .sort(byScore);

    // "Do this next": the task currently being focused on wins, otherwise the top-ranked one.
    const timerTask = timer.taskId ? AppState.tasks.find(t => t.id === timer.taskId && this.isOpen(t)) : null;
    let candidates = ranked.filter(t => !this.skipIds.has(t.id));
    if (!candidates.length && ranked.length) {
      this.skipIds.clear();
      candidates = ranked;
    }
    const focusTask = (timerTask && timer.state !== 'idle' && timer.mode === 'focus') ? timerTask : (candidates[0] || null);

    const suggestions = ranked
      .filter(t => t.plannedDate !== today && !attentionMap.has(t.id) && (!focusTask || t.id !== focusTask.id))
      .slice(0, 5);

    const wip = scoped.filter(t => t.status === 'inprogress' || t.status === 'inreview').sort(byScore);

    const deadlines = scoped
      .filter(t => {
        const due = PlannerView.dueKey(t);
        return this.isOpen(t) && due && due >= today && due <= weekEnd;
      })
      .sort((a, b) => PlannerView.dueKey(a).localeCompare(PlannerView.dueKey(b)) ||
        (PlannerView.PRIORITY_WEIGHT[a.priority] ?? 3) - (PlannerView.PRIORITY_WEIGHT[b.priority] ?? 3))
      .slice(0, 6);

    const remainingMinutes = todayOpen.reduce((sum, t) =>
      sum + Math.max(0, (Number(t.estimate) || 0) - (Number(t.trackedTime) || 0)), 0);
    const unestimated = todayOpen.filter(t => !(Number(t.estimate) > 0)).length;

    // Completion history (all projects): streak + last 7 days
    const doneByDay = {};
    all.forEach(t => {
      if (t.status !== 'done') return;
      const key = this.dateKeyOf(t.completedAt);
      if (key) doneByDay[key] = (doneByDay[key] || 0) + 1;
    });
    let streak = 0;
    let cursor = doneByDay[today] ? today : this.addDays(today, -1);
    while (doneByDay[cursor]) {
      streak++;
      cursor = this.addDays(cursor, -1);
    }
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const key = this.addDays(today, -i);
      const date = new Date(`${key}T00:00:00`);
      week.push({ key, count: doneByDay[key] || 0, label: date.toLocaleDateString('en-US', { weekday: 'narrow' }) });
    }

    // Timer task options: today first, then WIP, then the best of the rest.
    const optionIds = new Set();
    const timerOptions = [];
    [...(timerTask ? [timerTask] : []), ...todayOpen, ...wip, ...ranked.slice(0, 10)].forEach(t => {
      if (!optionIds.has(t.id) && this.isOpen(t) && timerOptions.length < 18) {
        optionIds.add(t.id);
        timerOptions.push(t);
      }
    });

    const activeSprint = AppState.sprints.find(s =>
      s.status === 'active' && (!AppState.selectedProjectId || !s.projectId || s.projectId === AppState.selectedProjectId));
    let sprint = null;
    if (activeSprint) {
      const sprintTasks = scoped.filter(t => t.sprintId === activeSprint.id);
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
        sprint: activeSprint, done, total: sprintTasks.length,
        percent: sprintTasks.length ? Math.round(done / sprintTasks.length * 100) : 0,
        points, donePoints, daysLeft, elapsedPct
      };
    }

    const completedCount = doneToday.length;
    const todayTotal = completedCount + todayOpen.length;

    return {
      today, tomorrow, timer, scoped, todayOpen, doneToday, completedCount, todayTotal,
      todayPct: todayTotal ? Math.round(completedCount / todayTotal * 100) : 0,
      attention, ranked, focusTask, suggestions, wip, deadlines, remainingMinutes, unestimated,
      capacityHours: this.getCapacityHours(), streak, week, focus: this.getFocusToday(),
      timerOptions, sprint,
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
        ${this.renderHeader(ctx)}
        ${this.renderCapture(ctx)}
        ${this.renderKpis(ctx)}
        <div class="dash-grid">
          <div class="dash-col dash-col-main">
            ${this.renderFocusNow(ctx)}
            ${this.renderToday(ctx)}
            ${this.renderAttention(ctx)}
          </div>
          <aside class="dash-col dash-col-side" aria-label="Focus and planning tools">
            ${this.renderTimer(ctx)}
            ${this.renderWip(ctx)}
            ${this.renderUpNext(ctx)}
            ${this.renderDeadlines(ctx)}
            ${this.renderSprint(ctx)}
          </aside>
        </div>
        <footer class="dash-shortcuts" aria-label="Dashboard keyboard shortcuts">
          <span><kbd>Q</kbd> Quick capture</span>
          <span><kbd>F</kbd> Start / pause focus</span>
          <span><kbd>N</kbd> Next suggestion</span>
          <span><kbd>C</kbd> Full task form</span>
          <span><kbd>Ctrl</kbd><kbd>K</kbd> Command palette</span>
        </footer>
      </div>
    `;

    this.attachListeners(container);
    if (this.timer && this.timer.state === 'running') this.ensureTicking();

    if (this.refocusCapture) {
      this.refocusCapture = false;
      const input = container.querySelector('#dash-capture-input');
      if (input) input.focus();
    }
  },

  renderHeader(ctx) {
    const hour = new Date().getHours();
    const greeting = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = (AppState.settings && AppState.settings.userName) || 'Surya';
    const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const scope = ctx.project ? this.esc(ctx.project.name) : 'All projects';

    let summary;
    if (ctx.todayTotal === 0) {
      summary = 'Nothing planned yet — capture something or pull suggested work into today.';
    } else if (ctx.todayOpen.length === 0) {
      summary = `Today's plan is complete — <strong>${ctx.completedCount}</strong> task${ctx.completedCount === 1 ? '' : 's'} shipped. 🎉`;
    } else {
      summary = `<strong>${ctx.todayOpen.length}</strong> task${ctx.todayOpen.length === 1 ? '' : 's'} left today` +
        (ctx.remainingMinutes ? ` · ~${Utils.formatMinutes(ctx.remainingMinutes)} of work` : '');
    }
    if (ctx.attention.length) {
      summary += ` · <a href="#" class="dash-inline-link" data-dash="scroll-attention">${ctx.attention.length} need${ctx.attention.length === 1 ? 's' : ''} attention</a>`;
    }

    return `
      <header class="dash-header">
        <div class="dash-greeting">
          <span class="dash-eyebrow"><i class="fa-regular fa-calendar"></i> ${dateLabel} <span class="dash-sep">·</span> ${scope}</span>
          <h1>${greeting}, ${this.esc(name)}</h1>
          <p>${summary}</p>
        </div>
        <div class="dash-header-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-dash="go" data-view="planner" id="dash-open-planner">
            <i class="fa-solid fa-calendar-day"></i> Planner
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-dash="go" data-view="tasks" id="dash-open-board">
            <i class="fa-solid fa-table-columns"></i> Board
          </button>
          <button type="button" class="btn btn-primary btn-sm" data-dash="create" id="dash-create-task">
            <i class="fa-solid fa-plus"></i> New task
          </button>
        </div>
      </header>
    `;
  },

  renderCapture(ctx) {
    const hasProject = AppState.projects.length > 0;
    return `
      <section class="dash-capture-wrap" aria-label="Quick capture">
        <form class="dash-capture" data-dash-capture autocomplete="off">
          <span class="dash-capture-icon"><i class="fa-solid fa-bolt"></i></span>
          <input id="dash-capture-input" type="text" maxlength="240" ${hasProject ? '' : 'disabled'}
            placeholder="${hasProject ? 'Capture a task and hit Enter — e.g. “Write release notes !high ~30m tomorrow”' : 'Create a project first to capture tasks'}"
            aria-label="Quick capture a task">
          <div class="dash-capture-preview" data-dash-preview>${this.renderCapturePreview(this.parseCapture(''), ctx)}</div>
          <kbd class="dash-kbd" title="Press Q to focus">Q</kbd>
          <button type="submit" class="btn btn-primary btn-sm dash-capture-submit" ${hasProject ? '' : 'disabled'} id="dash-capture-submit">
            <i class="fa-solid fa-arrow-turn-down fa-rotate-90"></i> Add
          </button>
        </form>
        <div class="dash-capture-hints">
          <span><code>!high</code> <code>!critical</code> priority</span>
          <span><code>~30m</code> <code>~2h</code> estimate</span>
          <span><code>tomorrow</code> <code>@someday</code> plan</span>
          <span><code>#bug</code> <code>#story</code> type</span>
        </div>
      </section>
    `;
  },

  parseCapture(raw) {
    const today = this.todayKey();
    const result = { title: '', priority: 'medium', estimate: 0, plannedDate: today, dateLabel: 'Today', type: 'task' };
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

    // Date words: anywhere with "@", or as the final bare word.
    const dateRe = /\s@(today|tomorrow|tmr|someday|later)(?=\s)|\s(today|tomorrow|tmr|someday|later)\s*$/i;
    const date = text.match(dateRe);
    if (date) {
      const word = (date[1] || date[2]).toLowerCase();
      if (word === 'tomorrow' || word === 'tmr') { result.plannedDate = this.addDays(today, 1); result.dateLabel = 'Tomorrow'; }
      else if (word === 'someday' || word === 'later') { result.plannedDate = null; result.dateLabel = 'Unplanned'; }
      text = text.replace(date[0], ' ');
    }

    result.title = text.replace(/\s+/g, ' ').trim();
    return result;
  },

  renderCapturePreview(parsed) {
    const chip = (icon, label, tone = '') => `<span class="dash-chip ${tone}"><i class="fa-solid ${icon}"></i>${label}</span>`;
    const parts = [chip(parsed.plannedDate ? 'fa-calendar-check' : 'fa-inbox', parsed.dateLabel, 'tone-brand')];
    if (parsed.priority !== 'medium') parts.push(chip(this.PRIORITY_ICON[parsed.priority], parsed.priority, `prio-${parsed.priority}`));
    if (parsed.estimate) parts.push(chip('fa-clock', Utils.formatMinutes(parsed.estimate)));
    if (parsed.type !== 'task') parts.push(chip('fa-tag', parsed.type));
    return parts.join('');
  },

  renderKpis(ctx) {
    const ringC = 2 * Math.PI * 18;
    const ringOffset = ringC * (1 - ctx.todayPct / 100);
    const capacityMin = ctx.capacityHours * 60;
    const loadPct = capacityMin ? Math.round(ctx.remainingMinutes / capacityMin * 100) : 0;
    const loadTone = loadPct > 100 ? 'danger' : loadPct > 85 ? 'warning' : 'success';
    const maxWeek = Math.max(1, ...ctx.week.map(d => d.count));

    return `
      <section class="dash-kpis" aria-label="Today at a glance">
        <div class="dash-kpi">
          <div class="dash-kpi-ring">
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle class="dash-kpi-ring-track" cx="22" cy="22" r="18"></circle>
              <circle class="dash-kpi-ring-fill" cx="22" cy="22" r="18" style="stroke-dasharray:${ringC.toFixed(2)};stroke-dashoffset:${ringOffset.toFixed(2)}"></circle>
            </svg>
            <span>${ctx.todayPct}%</span>
          </div>
          <div class="dash-kpi-copy">
            <span class="dash-kpi-label">Today's progress</span>
            <strong>${ctx.completedCount}<small> / ${ctx.todayTotal} done</small></strong>
          </div>
        </div>

        <button type="button" class="dash-kpi dash-kpi-button tone-${loadTone}" data-dash="capacity" title="Click to change daily focus capacity">
          <span class="dash-kpi-icon"><i class="fa-solid fa-hourglass-half"></i></span>
          <div class="dash-kpi-copy">
            <span class="dash-kpi-label">Work left today</span>
            <strong>${Utils.formatMinutes(ctx.remainingMinutes)}<small> / ${ctx.capacityHours}h capacity</small></strong>
            <span class="dash-mini-bar"><i style="width:${Math.min(100, loadPct)}%"></i></span>
            ${ctx.unestimated ? `<em class="dash-kpi-note">${ctx.unestimated} unestimated</em>` : ''}
          </div>
        </button>

        <div class="dash-kpi">
          <span class="dash-kpi-icon tone-success"><i class="fa-solid fa-fire-flame-curved"></i></span>
          <div class="dash-kpi-copy">
            <span class="dash-kpi-label">Streak</span>
            <strong>${ctx.streak}<small> day${ctx.streak === 1 ? '' : 's'}</small></strong>
          </div>
          <div class="dash-spark" title="Tasks completed over the last 7 days">
            ${ctx.week.map(d => `<span class="${d.key === ctx.today ? 'is-today' : ''}" title="${d.count} done"><i style="height:${Math.max(8, Math.round(d.count / maxWeek * 100))}%" class="${d.count ? '' : 'is-zero'}"></i><b>${d.label}</b></span>`).join('')}
          </div>
        </div>

        <div class="dash-kpi">
          <span class="dash-kpi-icon tone-violet"><i class="fa-solid fa-brain"></i></span>
          <div class="dash-kpi-copy">
            <span class="dash-kpi-label">Focus time today</span>
            <strong>${Utils.formatMinutes(ctx.focus.minutes)}<small> · ${ctx.focus.sessions} session${ctx.focus.sessions === 1 ? '' : 's'}</small></strong>
          </div>
        </div>

        <button type="button" class="dash-kpi dash-kpi-button ${ctx.attention.length ? 'tone-danger is-alert' : 'tone-success'}" data-dash="scroll-attention" ${ctx.attention.length ? '' : 'disabled'}>
          <span class="dash-kpi-icon"><i class="fa-solid ${ctx.attention.length ? 'fa-triangle-exclamation' : 'fa-shield-heart'}"></i></span>
          <div class="dash-kpi-copy">
            <span class="dash-kpi-label">Needs attention</span>
            <strong>${ctx.attention.length}<small> ${ctx.attention.length ? 'to triage' : 'all clear'}</small></strong>
          </div>
        </button>
      </section>
    `;
  },

  renderFocusNow(ctx) {
    const t = ctx.focusTask;
    if (!t) {
      return `
        <section class="dash-card dash-focus-now is-empty">
          <div class="dash-empty-hero">
            <span class="dash-empty-icon"><i class="fa-solid fa-mug-hot"></i></span>
            <h2>You're all caught up</h2>
            <p>No actionable tasks in this scope. Capture what's next or review the backlog.</p>
            <div class="dash-empty-actions">
              <button type="button" class="btn btn-primary btn-sm" data-dash="focus-capture"><i class="fa-solid fa-bolt"></i> Capture a task</button>
              <button type="button" class="btn btn-ghost btn-sm" data-dash="go" data-view="backlog"><i class="fa-solid fa-layer-group"></i> Open backlog</button>
            </div>
          </div>
        </section>
      `;
    }

    const today = ctx.today;
    const project = AppState.projects.find(p => p.id === t.projectId);
    const est = Number(t.estimate) || 0;
    const tracked = Number(t.trackedTime) || 0;
    const pct = est ? Math.min(100, Math.round(tracked / est * 100)) : 0;
    const timerOn = ctx.timer.taskId === t.id && ctx.timer.state === 'running' && ctx.timer.mode === 'focus';
    const reasons = this.reasonsFor(t, today);
    const status = PlannerView.STATUS_LABEL[t.status] || t.status;

    return `
      <section class="dash-card dash-focus-now ${timerOn ? 'is-focusing' : ''}" data-task-id="${this.esc(t.id)}" style="--row-project:${this.projectColor(t)}">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-brand"><i class="fa-solid fa-crosshairs"></i></span>
          <div class="dash-card-titles">
            <h2>Do this next</h2>
            <p>${timerOn ? 'Focus session in progress' : `Top pick of ${ctx.ranked.length} actionable task${ctx.ranked.length === 1 ? '' : 's'}`}</p>
          </div>
          ${ctx.ranked.length > 1 && !timerOn ? `<button type="button" class="dash-icon-btn" data-dash="skip" title="Suggest another task (N)" id="dash-skip-suggestion"><i class="fa-solid fa-shuffle"></i></button>` : ''}
        </div>
        <div class="dash-focus-body">
          <div class="dash-focus-project">
            <i class="dash-dot"></i>
            <span>${project ? this.esc(project.name) : 'No project'}</span>
            <span class="dash-key">${this.esc(t.key)}</span>
            <button type="button" class="dash-status status-${this.esc(t.status)}" data-dash="cycle" title="Advance status">${this.esc(status)}</button>
          </div>
          <h3 class="dash-focus-title" data-dash="open" title="Open task details">${this.esc(t.title)}</h3>
          ${reasons.length ? `<div class="dash-reasons">${reasons.map(r => `<span class="dash-reason tone-${r.tone}"><i class="fa-solid ${r.icon}"></i>${this.esc(r.label)}</span>`).join('')}</div>` : ''}
          ${est ? `
            <div class="dash-focus-progress">
              <span class="dash-bar"><i style="width:${pct}%"></i></span>
              <span>${Utils.formatMinutes(tracked)} of ${Utils.formatMinutes(est)} logged</span>
            </div>` : ''}
        </div>
        <div class="dash-focus-actions">
          <button type="button" class="btn btn-primary" data-dash="focus" id="dash-focus-start">
            ${timerOn ? '<i class="fa-solid fa-pause"></i> Pause focus' : '<i class="fa-solid fa-play"></i> Start focus'}
          </button>
          <button type="button" class="btn btn-secondary" data-dash="toggle-done" id="dash-focus-done"><i class="fa-solid fa-check"></i> Mark done</button>
          ${t.plannedDate !== today ? `<button type="button" class="btn btn-ghost" data-dash="plan-today"><i class="fa-solid fa-calendar-plus"></i> Plan today</button>` : ''}
          ${t.plannedDate !== ctx.tomorrow ? `<button type="button" class="btn btn-ghost" data-dash="plan-tomorrow"><i class="fa-solid fa-forward"></i> Tomorrow</button>` : ''}
        </div>
      </section>
    `;
  },

  renderRow(t, ctx, opts = {}) {
    const isDone = t.status === 'done';
    const due = PlannerView.dueKey(t);
    let dueBadge = '';
    if (due && !isDone) {
      const diff = this.dayDiff(ctx.today, due);
      if (diff < 0) dueBadge = `<span class="dash-due is-overdue"><i class="fa-solid fa-triangle-exclamation"></i>${-diff}d late</span>`;
      else if (diff === 0) dueBadge = '<span class="dash-due is-today"><i class="fa-regular fa-calendar"></i>Due today</span>';
      else if (diff <= 7) dueBadge = `<span class="dash-due"><i class="fa-regular fa-calendar"></i>${Utils.formatRelativeDate(`${due}T00:00:00`)}</span>`;
    }
    const est = Number(t.estimate) || 0;
    const tracked = Number(t.trackedTime) || 0;
    const focusing = ctx.timer.taskId === t.id && ctx.timer.state === 'running' && ctx.timer.mode === 'focus';

    const actionButtons = {
      focus: `<button type="button" class="dash-row-btn ${focusing ? 'is-active' : ''}" data-dash="focus" title="${focusing ? 'Pause focus' : 'Start focus timer'}"><i class="fa-solid ${focusing ? 'fa-pause' : 'fa-play'}"></i></button>`,
      today: '<button type="button" class="dash-row-btn is-label" data-dash="plan-today" title="Plan for today"><i class="fa-solid fa-plus"></i>Today</button>',
      tomorrow: '<button type="button" class="dash-row-btn" data-dash="plan-tomorrow" title="Push to tomorrow"><i class="fa-solid fa-arrow-right"></i></button>',
      unplan: '<button type="button" class="dash-row-btn" data-dash="unplan" title="Remove from today"><i class="fa-solid fa-xmark"></i></button>',
      unblock: '<button type="button" class="dash-row-btn is-label" data-dash="status" data-status="inprogress" title="Mark as in progress"><i class="fa-solid fa-lock-open"></i>Unblock</button>',
      review: '<button type="button" class="dash-row-btn" data-dash="status" data-status="inreview" title="Send to review"><i class="fa-solid fa-eye"></i></button>',
      reopen: '<button type="button" class="dash-row-btn" data-dash="toggle-done" title="Reopen"><i class="fa-solid fa-rotate-left"></i></button>'
    };
    const actions = (opts.actions || []).map(a => actionButtons[a] || '').join('');

    return `
      <div class="dash-row ${isDone ? 'is-done' : ''} ${focusing ? 'is-focusing' : ''}" data-task-id="${this.esc(t.id)}" style="--row-project:${this.projectColor(t)}">
        ${opts.noCheck ? '<span class="dash-row-dot"></span>' : `<button type="button" class="dash-check" data-dash="toggle-done" aria-pressed="${isDone}" title="${isDone ? 'Mark as not done' : 'Mark as done'}"><i class="fa-solid fa-check"></i></button>`}
        <div class="dash-row-main" data-dash="open" title="Open ${this.esc(t.key)}">
          <span class="dash-row-title">${this.esc(t.title)}</span>
          <span class="dash-row-meta">
            <span class="dash-key">${this.esc(t.key)}</span>
            <span class="dash-prio prio-${this.esc(t.priority)}" title="${this.esc(t.priority)} priority"><i class="fa-solid ${this.PRIORITY_ICON[t.priority] || 'fa-equals'}"></i></span>
            ${opts.reason || ''}
            ${opts.hideStatus || isDone ? '' : `<button type="button" class="dash-status status-${this.esc(t.status)}" data-dash="cycle" title="Advance status">${this.esc(PlannerView.STATUS_LABEL[t.status] || t.status)}</button>`}
            ${est || tracked ? `<span class="dash-est" title="Logged / estimate"><i class="fa-regular fa-clock"></i>${Utils.formatMinutes(tracked)}${est ? ` / ${Utils.formatMinutes(est)}` : ''}</span>` : ''}
            ${dueBadge}
          </span>
        </div>
        ${actions ? `<div class="dash-row-actions">${actions}</div>` : ''}
      </div>
    `;
  },

  renderToday(ctx) {
    const canAutoPlan = ctx.suggestions.length > 0;
    return `
      <section class="dash-card" id="dash-today" aria-label="Today's plan">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-success"><i class="fa-solid fa-list-check"></i></span>
          <div class="dash-card-titles">
            <h2>Today's plan <span class="dash-count">${ctx.todayOpen.length}</span></h2>
            <p>${ctx.todayOpen.length ? 'Sorted by deadline, momentum and priority' : 'Plan a few high-impact tasks to stay on track'}</p>
          </div>
          <div class="dash-card-tools">
            ${canAutoPlan ? `<button type="button" class="btn btn-ghost btn-sm" data-dash="autoplan" id="dash-autoplan" title="Add the top ${Math.min(3, ctx.suggestions.length)} suggested tasks to today"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-plan</button>` : ''}
          </div>
        </div>
        <div class="dash-list">
          ${ctx.todayOpen.length ? ctx.todayOpen.map(t => this.renderRow(t, ctx, { actions: ['focus', 'tomorrow', 'unplan'] })).join('') : `
            <div class="dash-empty">
              <i class="fa-regular fa-calendar-plus"></i>
              <span>${ctx.completedCount ? 'All planned work is done. Pull in something from <b>Up next</b> or call it a day.' : 'Nothing planned for today yet.'}</span>
              ${canAutoPlan ? '<button type="button" class="btn btn-primary btn-sm" data-dash="autoplan"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto-plan my day</button>' : ''}
            </div>`}
        </div>
        ${ctx.doneToday.length ? `
          <details class="dash-done-group">
            <summary><i class="fa-solid fa-trophy"></i> Completed today <span class="dash-count tone-success">${ctx.doneToday.length}</span><i class="fa-solid fa-chevron-down dash-chevron"></i></summary>
            <div class="dash-list">${ctx.doneToday.map(t => this.renderRow(t, ctx, { actions: [] })).join('')}</div>
          </details>` : ''}
      </section>
    `;
  },

  renderAttention(ctx) {
    if (!ctx.attention.length) return '';
    const movable = ctx.attention.filter(a => a.reason !== 'blocked' && a.task.plannedDate !== ctx.today).length;
    const badge = {
      blocked: '<span class="dash-reason-badge tone-danger"><i class="fa-solid fa-ban"></i>Blocked</span>',
      overdue: '<span class="dash-reason-badge tone-danger"><i class="fa-solid fa-fire"></i>Overdue</span>',
      carryover: '<span class="dash-reason-badge tone-warning"><i class="fa-solid fa-clock-rotate-left"></i>Carried over</span>'
    };
    const shown = ctx.attention.slice(0, 8);

    return `
      <section class="dash-card dash-attention" id="dash-attention" aria-label="Needs attention">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-danger"><i class="fa-solid fa-triangle-exclamation"></i></span>
          <div class="dash-card-titles">
            <h2>Needs attention <span class="dash-count tone-danger">${ctx.attention.length}</span></h2>
            <p>Unblock, reschedule, or finish these first</p>
          </div>
          <div class="dash-card-tools">
            ${movable ? `<button type="button" class="btn btn-secondary btn-sm" data-dash="triage-all" id="dash-triage-all"><i class="fa-solid fa-arrow-right-to-bracket"></i> Move ${movable} to today</button>` : ''}
          </div>
        </div>
        <div class="dash-list">
          ${shown.map(({ task, reason }) => {
            const actions = reason === 'blocked' ? ['unblock'] : (task.plannedDate === ctx.today ? ['focus'] : ['today', 'focus']);
            return this.renderRow(task, ctx, { actions, reason: badge[reason], hideStatus: reason === 'blocked' });
          }).join('')}
        </div>
        ${ctx.attention.length > shown.length ? `<button type="button" class="dash-more" data-dash="go" data-view="planner">+${ctx.attention.length - shown.length} more in the planner <i class="fa-solid fa-arrow-right"></i></button>` : ''}
      </section>
    `;
  },

  renderTimer(ctx) {
    const t = ctx.timer;
    const remaining = this.timerRemaining();
    const total = this.timerTotal();
    const offset = this.RING_C * (1 - (total - remaining) / total);
    const running = t.state === 'running';
    const stateLabel = running ? (t.mode === 'break' ? 'Break' : 'Focusing') : t.state === 'paused' ? 'Paused' : 'Ready';
    const sessions = ctx.focus.sessions;
    const dots = Math.max(this.SESSION_GOAL, sessions);

    return `
      <section class="dash-card dash-timer mode-${t.mode} state-${t.state}" id="dash-timer" aria-label="Focus timer">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-violet"><i class="fa-solid fa-stopwatch"></i></span>
          <div class="dash-card-titles">
            <h2>Focus timer</h2>
            <p>Time is logged to the selected task</p>
          </div>
          <span class="dash-timer-pill">${running ? '<span class="dash-live-dot"></span>' : ''}${stateLabel}</span>
        </div>
        <div class="dash-timer-dial">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="dash-timer-track" cx="60" cy="60" r="52"></circle>
            <circle class="dash-timer-fill" id="dash-timer-ring" cx="60" cy="60" r="52" style="stroke-dasharray:${this.RING_C.toFixed(2)};stroke-dashoffset:${offset.toFixed(2)}"></circle>
          </svg>
          <div class="dash-timer-center">
            <strong id="dash-timer-time">${this.fmtClock(remaining)}</strong>
            <span>${t.mode === 'break' ? `${t.brk}m break` : `${t.work}m focus`}</span>
          </div>
        </div>
        <label class="dash-timer-task" for="dash-timer-task">
          <span>Working on</span>
          <select id="dash-timer-task" data-dash-timer-task>
            <option value="">No specific task</option>
            ${ctx.timerOptions.map(o => `<option value="${this.esc(o.id)}" ${o.id === t.taskId ? 'selected' : ''}>${this.esc(o.key)} · ${this.esc(o.title)}</option>`).join('')}
          </select>
        </label>
        <div class="dash-timer-controls">
          <button type="button" class="btn btn-primary" data-dash="timer-toggle" id="dash-timer-toggle">
            <i class="fa-solid ${running ? 'fa-pause' : 'fa-play'}"></i> ${running ? 'Pause' : t.state === 'paused' ? 'Resume' : t.mode === 'break' ? 'Start break' : 'Start'} <kbd>F</kbd>
          </button>
          <button type="button" class="btn btn-ghost" data-dash="timer-stop" id="dash-timer-stop" ${t.state === 'idle' && t.mode === 'focus' ? 'disabled' : ''}
            title="${t.mode === 'break' ? 'Skip the break' : 'Stop and log the elapsed time'}">
            <i class="fa-solid ${t.mode === 'break' ? 'fa-forward' : 'fa-stop'}"></i> ${t.mode === 'break' ? 'Skip' : 'Stop & log'}
          </button>
        </div>
        <div class="dash-timer-presets" role="group" aria-label="Timer presets">
          ${this.PRESETS.map(p => `<button type="button" class="${p.work === t.work ? 'is-active' : ''}" data-dash="timer-preset" data-work="${p.work}" data-brk="${p.brk}">${p.label}</button>`).join('')}
        </div>
        <div class="dash-sessions" title="${sessions} of ${this.SESSION_GOAL} focus sessions today">
          <span>Sessions</span>
          <span class="dash-session-dots">${Array.from({ length: dots }, (_, i) => `<i class="${i < sessions ? 'is-done' : ''}"></i>`).join('')}</span>
          <strong>${sessions}/${this.SESSION_GOAL}</strong>
        </div>
      </section>
    `;
  },

  renderWip(ctx) {
    const limit = 3;
    const over = ctx.wip.length > limit;
    return `
      <section class="dash-card dash-compact" aria-label="Work in progress">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-brand"><i class="fa-solid fa-bolt"></i></span>
          <div class="dash-card-titles">
            <h2>In progress <span class="dash-count ${over ? 'tone-warning' : ''}">${ctx.wip.length}</span></h2>
            <p>${over ? `Over WIP limit of ${limit} — finish before starting more` : 'Finish what you started'}</p>
          </div>
        </div>
        <div class="dash-list">
          ${ctx.wip.length ? ctx.wip.slice(0, 5).map(t => this.renderRow(t, ctx, { actions: t.status === 'inprogress' ? ['review'] : [] })).join('') :
            '<div class="dash-empty is-compact"><i class="fa-solid fa-circle-play"></i><span>Nothing in flight. Start the top pick.</span></div>'}
        </div>
        ${ctx.wip.length > 5 ? `<button type="button" class="dash-more" data-dash="go" data-view="tasks">+${ctx.wip.length - 5} more on the board <i class="fa-solid fa-arrow-right"></i></button>` : ''}
      </section>
    `;
  },

  renderUpNext(ctx) {
    return `
      <section class="dash-card dash-compact" aria-label="Suggested next tasks">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-amber"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
          <div class="dash-card-titles">
            <h2>Up next</h2>
            <p>Best candidates not yet planned for today</p>
          </div>
        </div>
        <div class="dash-list">
          ${ctx.suggestions.length ? ctx.suggestions.map(t => this.renderRow(t, ctx, { actions: ['today'], noCheck: true, hideStatus: true })).join('') :
            '<div class="dash-empty is-compact"><i class="fa-solid fa-check-double"></i><span>No more suggestions — your queue is clear.</span></div>'}
        </div>
      </section>
    `;
  },

  renderDeadlines(ctx) {
    if (!ctx.deadlines.length) return '';
    return `
      <section class="dash-card dash-compact" aria-label="Upcoming deadlines">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-danger"><i class="fa-regular fa-calendar"></i></span>
          <div class="dash-card-titles">
            <h2>Deadlines this week</h2>
            <p>Due in the next 7 days</p>
          </div>
        </div>
        <div class="dash-deadlines">
          ${ctx.deadlines.map(t => {
            const due = PlannerView.dueKey(t);
            const diff = this.dayDiff(ctx.today, due);
            const date = new Date(`${due}T00:00:00`);
            return `
              <button type="button" class="dash-deadline ${diff === 0 ? 'is-today' : diff === 1 ? 'is-soon' : ''}" data-task-id="${this.esc(t.id)}" data-dash="open" style="--row-project:${this.projectColor(t)}">
                <span class="dash-deadline-date">
                  <b>${diff === 0 ? 'Today' : diff === 1 ? 'Tmrw' : date.toLocaleDateString('en-US', { weekday: 'short' })}</b>
                  <small>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small>
                </span>
                <span class="dash-deadline-copy">
                  <span>${this.esc(t.title)}</span>
                  <small><span class="dash-key">${this.esc(t.key)}</span> ${this.esc(PlannerView.STATUS_LABEL[t.status] || t.status)}</small>
                </span>
                <span class="dash-prio prio-${this.esc(t.priority)}"><i class="fa-solid ${this.PRIORITY_ICON[t.priority] || 'fa-equals'}"></i></span>
              </button>`;
          }).join('')}
        </div>
      </section>
    `;
  },

  renderSprint(ctx) {
    const s = ctx.sprint;
    if (!s) return '';
    const onTrack = s.elapsedPct === null || s.percent >= s.elapsedPct - 10;
    const schedule = s.daysLeft === null ? 'Active' : s.daysLeft > 0 ? `${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left` : s.daysLeft === 0 ? 'Ends today' : `${-s.daysLeft}d overdue`;
    return `
      <section class="dash-card dash-compact dash-sprint" aria-label="Active sprint">
        <div class="dash-card-head">
          <span class="dash-card-icon tone-success"><i class="fa-solid fa-flag-checkered"></i></span>
          <div class="dash-card-titles">
            <h2>${this.esc(s.sprint.name)}</h2>
            <p>${this.esc(schedule)} · ${s.done}/${s.total} tasks · ${s.donePoints}/${s.points} pts</p>
          </div>
          <span class="dash-reason-badge ${onTrack ? 'tone-success' : 'tone-warning'}">${onTrack ? 'On track' : 'Behind'}</span>
        </div>
        <div class="dash-sprint-bar" title="${s.percent}% complete${s.elapsedPct !== null ? ` · ${s.elapsedPct}% of time elapsed` : ''}">
          <i style="width:${s.percent}%"></i>
          ${s.elapsedPct !== null ? `<b style="left:${s.elapsedPct}%"></b>` : ''}
        </div>
        <div class="dash-sprint-foot"><span>${s.percent}% complete</span>${s.elapsedPct !== null ? `<span>${s.elapsedPct}% of time used</span>` : ''}</div>
        ${s.sprint.goal ? `<p class="dash-sprint-goal"><i class="fa-solid fa-bullseye"></i>${this.esc(s.sprint.goal)}</p>` : ''}
      </section>
    `;
  },

  // -------------------------------------------------------------
  // EVENTS
  // -------------------------------------------------------------

  attachListeners(container) {
    const root = container.querySelector('#dashboard-page');
    if (!root) return;

    root.addEventListener('click', (e) => {
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
          TaskModal.openCreate();
          break;
        case 'go':
          e.preventDefault();
          Router.navigate(el.dataset.view);
          break;
        case 'focus-capture':
          root.querySelector('#dash-capture-input')?.focus();
          break;
        case 'scroll-attention':
          e.preventDefault();
          root.querySelector('#dash-attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'toggle-done':
          if (!task) break;
          e.stopPropagation();
          this.toggleDone(task);
          break;
        case 'cycle': {
          if (!task) break;
          e.stopPropagation();
          AppState.updateTask(task.id, { status: PlannerView.STATUS_NEXT[task.status] || 'inprogress' });
          break;
        }
        case 'status':
          if (!task) break;
          e.stopPropagation();
          AppState.updateTask(task.id, { status: el.dataset.status });
          Toast.success(`${task.key} → ${PlannerView.STATUS_LABEL[el.dataset.status] || el.dataset.status}`);
          break;
        case 'plan-today':
          if (task) { AppState.updateTask(task.id, { plannedDate: ctxToday }); Toast.success(`${task.key} added to today`); }
          break;
        case 'plan-tomorrow':
          if (task) {
            this.skipIds.delete(task.id);
            AppState.updateTask(task.id, { plannedDate: this.addDays(ctxToday, 1) });
            Toast.info(`${task.key} pushed to tomorrow`);
          }
          break;
        case 'unplan':
          if (task) { AppState.updateTask(task.id, { plannedDate: null }); Toast.info(`${task.key} removed from today`); }
          break;
        case 'skip': {
          const current = root.querySelector('.dash-focus-now[data-task-id]');
          if (current) this.skipIds.add(current.dataset.taskId);
          Router.renderCurrentRoute();
          break;
        }
        case 'autoplan':
          this.autoPlan();
          break;
        case 'triage-all':
          this.triageAll();
          break;
        case 'capacity': {
          const steps = this.CAPACITY_STEPS;
          const next = steps[(steps.indexOf(this.getCapacityHours()) + 1) % steps.length];
          this.writeJSON(this.STORAGE.capacity, next);
          Toast.info(`Daily focus capacity set to ${next}h`);
          Router.renderCurrentRoute();
          break;
        }
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

    root.addEventListener('change', (e) => {
      const select = e.target.closest('[data-dash-timer-task]');
      if (select) this.switchTimerTask(select.value || null);
    });

    const form = root.querySelector('[data-dash-capture]');
    const input = root.querySelector('#dash-capture-input');
    const preview = root.querySelector('[data-dash-preview]');
    if (form && input) {
      input.addEventListener('input', () => {
        if (preview) preview.innerHTML = this.renderCapturePreview(this.parseCapture(input.value));
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { input.value = ''; input.blur(); }
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.capture(input.value);
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
      } else if (key === 'n') {
        const btn = document.getElementById('dash-skip-suggestion');
        if (btn) { e.preventDefault(); btn.click(); }
      }
    });
  },

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------

  capture(raw) {
    const parsed = this.parseCapture(raw);
    if (!parsed.title) {
      Toast.warning('Type a task title first');
      return;
    }
    const projectId = AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : null);
    if (!projectId) {
      Toast.error('Create a project first');
      return;
    }
    this.refocusCapture = true;
    const task = AppState.createTask({
      title: parsed.title,
      projectId,
      status: 'todo',
      priority: parsed.priority,
      type: parsed.type,
      estimate: parsed.estimate,
      plannedDate: parsed.plannedDate
    });
    if (task) Toast.success(`Captured ${task.key}${parsed.plannedDate ? ` for ${parsed.dateLabel.toLowerCase()}` : ''}`);
  },

  toggleDone(task) {
    const next = task.status === 'done' ? 'todo' : 'done';
    if (next === 'done' && this.timer && this.timer.taskId === task.id && this.timer.mode === 'focus' && this.timer.state !== 'idle') {
      this.stopTimer(true);
    }
    this.skipIds.delete(task.id);
    AppState.updateTask(task.id, { status: next });
    if (next === 'done') Toast.success(`${task.key} completed 🎉`);
  },

  autoPlan() {
    const ctx = this.getContext();
    const picks = ctx.suggestions.slice(0, 3);
    if (!picks.length) return;
    AppState.bulkUpdateTasks(picks.map(t => t.id), { plannedDate: ctx.today });
    Toast.success(`Planned ${picks.length} task${picks.length === 1 ? '' : 's'} for today`);
  },

  triageAll() {
    const ctx = this.getContext();
    const ids = ctx.attention
      .filter(a => a.reason !== 'blocked' && a.task.plannedDate !== ctx.today)
      .map(a => a.task.id);
    if (!ids.length) return;
    AppState.bulkUpdateTasks(ids, { plannedDate: ctx.today });
    Toast.success(`Moved ${ids.length} task${ids.length === 1 ? '' : 's'} to today`);
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
        Toast.info(t.taskId ? 'Focus session started — one task, no distractions.' : 'Focus session started.');
      }
      this.startTimer();
    }
    this.rerenderIfVisible();
  },

  /** Start/pause the timer for a specific task (used by "Start focus" buttons). */
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
      // Starting focus implies the task is in progress; planning it for today keeps the plan honest.
      this.startTimer();
      AppState.updateTask(taskId, { status: 'inprogress', plannedDate: task.plannedDate || this.todayKey() });
      Toast.info(`Focusing on ${task.key}`);
      return;
    }
    this.startTimer();
    if (task) Toast.info(`Focusing on ${task.key}`);
    this.rerenderIfVisible();
  },

  /** Elapsed focus seconds in the current session that haven't been logged yet. */
  unloggedSeconds() {
    const t = this.loadTimer();
    if (t.mode !== 'focus') return 0;
    return Math.max(0, this.timerTotal() - this.timerRemaining() - (t.credited || 0));
  },

  switchTimerTask(taskId, rerender = true) {
    const t = this.loadTimer();
    if (t.taskId === taskId) return;
    // Credit time already spent to the previous task before switching.
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
      if (!silent) Toast.info('Break skipped — ready when you are.');
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
      // Auto-start the break.
      t.mode = 'break';
      t.credited = 0;
      t.state = 'running';
      t.endAt = Date.now() + t.brk * 60 * 1000;
      t.remaining = t.brk * 60;
      this.saveTimer();
      Toast.success(`${work}-minute session complete! Take a ${t.brk}-minute break.`);
      this.logMinutes(taskId, minutes, true);
    } else {
      this.resetTimer('focus');
      this.saveTimer();
      this.stopTicking();
      Toast.info('Break over — ready for the next session?');
      this.rerenderIfVisible();
    }
  },

  /** Records focus minutes in today's log and adds them to the task's tracked time. */
  logMinutes(taskId, minutes, countSession, rerender = true) {
    const today = this.todayKey();
    const log = this.getFocusLog();
    const entry = log[today] || { minutes: 0, sessions: 0 };
    entry.minutes += Math.max(0, minutes);
    if (countSession) entry.sessions += 1;
    log[today] = entry;
    // Keep only the last 60 days.
    Object.keys(log).sort().slice(0, -60).forEach(key => delete log[key]);
    this.writeJSON(this.STORAGE.focusLog, log);

    const task = taskId ? AppState.tasks.find(x => x.id === taskId) : null;
    if (task && minutes > 0) {
      AppState.updateTask(task.id, { trackedTime: (Number(task.trackedTime) || 0) + minutes }); // triggers re-render
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
    const ring = document.getElementById('dash-timer-ring');
    if (ring) {
      const total = this.timerTotal();
      ring.style.strokeDashoffset = (this.RING_C * (1 - (total - remaining) / total)).toFixed(2);
    }
  },

  rerenderIfVisible() {
    if (AppState.currentView === 'dashboard') Router.renderCurrentRoute();
  }
};
