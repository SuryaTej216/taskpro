/**
 * TaskForge - Task Hierarchy View
 *
 * Visualises work as a tree:  Project → Epic → Task → Subtask (any depth via parentId)
 *
 * Features:
 * - Two layouts from the same markup: vertical "Tree" outline and top-down "Chart" (org chart)
 * - Cards coloured by task status (accent rail, tint, glow) with a live legend
 * - Full inline status control on every card: done check, status dropdown, one-click advance,
 *   branch-wide status update (task + all descendants / whole epic), right-click context menu
 * - Roll-up progress on parents (segmented status distribution + % done)
 * - Search + status filter chips (ancestors of matches stay visible as dimmed context)
 * - Expand / collapse per node, expand all / collapse all, chart zoom + drag-to-pan
 */

const HierarchyView = {
  layout: 'tree',          // 'tree' | 'chart'
  collapsed: new Set(),    // node keys collapsed by the user
  search: '',
  statusFilter: new Set(), // empty = all statuses
  zoom: 1,
  _hasCentered: false,
  _resizeObserver: null,
  _resizeHandler: null,

  TYPE_ICON: {
    bug: 'fa-circle-dot',
    story: 'fa-bookmark',
    epic: 'fa-bolt',
    subtask: 'fa-network-wired',
    improvement: 'fa-arrow-up-right-dots'
  },
  PRIORITY_ICON: {
    critical: 'fa-solid fa-angles-up',
    highest: 'fa-solid fa-angles-up',
    high: 'fa-solid fa-angle-up',
    medium: 'fa-solid fa-equals',
    low: 'fa-solid fa-angle-down',
    lowest: 'fa-solid fa-angles-down'
  },

  // -------------------------------------------------------------
  // DATA
  // -------------------------------------------------------------

  getScopedTasks() {
    return AppState.tasks.filter(t =>
      !t.archived && (!AppState.selectedProjectId || t.projectId === AppState.selectedProjectId)
    );
  },

  sortTasks(a, b) {
    const order = StatusControl.ORDER;
    const sa = order.indexOf(a.status), sb = order.indexOf(b.status);
    if (sa !== sb) return sa - sb;
    return (a.key || '').localeCompare(b.key || '', undefined, { numeric: true });
  },

  /** Builds the full (unfiltered) node tree */
  buildTree(tasks) {
    const byId = new Map(tasks.map(t => [t.id, t]));
    const childrenOf = new Map();
    const roots = [];

    tasks.forEach(t => {
      if (t.parentId && byId.has(t.parentId) && t.parentId !== t.id) {
        if (!childrenOf.has(t.parentId)) childrenOf.set(t.parentId, []);
        childrenOf.get(t.parentId).push(t);
      } else {
        roots.push(t);
      }
    });

    const visiting = new Set();
    const taskNode = (task) => {
      visiting.add(task.id);
      const kids = (childrenOf.get(task.id) || [])
        .filter(c => !visiting.has(c.id)) // guard against cycles
        .sort((a, b) => this.sortTasks(a, b))
        .map(taskNode);
      visiting.delete(task.id);
      return { kind: 'task', key: `t:${task.id}`, task, children: kids };
    };

    const projects = AppState.selectedProjectId
      ? AppState.projects.filter(p => p.id === AppState.selectedProjectId)
      : AppState.projects;

    return projects.map(project => {
      const projRoots = roots.filter(t => t.projectId === project.id).sort((a, b) => this.sortTasks(a, b));
      const epics = (AppState.epics || []).filter(e => e.projectId === project.id);
      const epicIds = new Set(epics.map(e => e.id));

      const epicNodes = epics.map(epic => ({
        kind: 'epic',
        key: `e:${epic.id}`,
        epic,
        project,
        children: projRoots.filter(t => t.epicId === epic.id).map(taskNode)
      })).filter(n => n.children.length > 0);

      const loose = projRoots.filter(t => !t.epicId || !epicIds.has(t.epicId)).map(taskNode);
      const children = [...epicNodes];
      if (loose.length) {
        if (epicNodes.length) {
          children.push({ kind: 'group', key: `g:${project.id}`, project, label: 'No epic', children: loose });
        } else {
          children.push(...loose);
        }
      }

      return { kind: 'project', key: `p:${project.id}`, project, children };
    });
  },

  /** All task objects within (and including) a node */
  collectTasks(node, out = []) {
    if (node.task) out.push(node.task);
    node.children.forEach(c => this.collectTasks(c, out));
    return out;
  },

  hasActiveFilters() {
    return !!(this.search.trim() || this.statusFilter.size);
  },

  taskMatches(task) {
    if (this.statusFilter.size && !this.statusFilter.has(task.status)) return false;
    const q = this.search.trim();
    if (q && !Utils.fuzzyMatch(q, `${task.key} ${task.title} ${(task.labels || []).join(' ')}`)) return false;
    return true;
  },

  /**
   * Returns a filtered copy of the tree; each node gets `match` (true when it matches itself)
   * Ancestors of matches are kept for context.
   */
  filterTree(nodes) {
    if (!this.hasActiveFilters()) {
      const mark = (n) => ({ ...n, match: true, children: n.children.map(mark) });
      return nodes.map(mark);
    }
    const walk = (n) => {
      const kids = n.children.map(walk).filter(Boolean);
      const selfMatch = n.kind === 'task' ? this.taskMatches(n.task) : false;
      if (!selfMatch && !kids.length) return null;
      return { ...n, match: selfMatch, children: kids };
    };
    return nodes.map(walk).filter(Boolean);
  },

  stats(tasks) {
    const counts = {};
    StatusControl.ORDER.forEach(s => { counts[s] = 0; });
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    const total = tasks.length;
    const done = counts.done || 0;
    const active = total - (counts.cancelled || 0);
    return { counts, total, done, pct: active ? Math.round((done / active) * 100) : 0 };
  },

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  render(container) {
    if (!container) return;
    const esc = Utils.escapeHTML;

    const tasks = this.getScopedTasks();
    const fullTree = this.buildTree(tasks);
    const tree = this.filterTree(fullTree);
    const st = this.stats(tasks);
    const scopeProject = AppState.selectedProjectId ? AppState.projects.find(p => p.id === AppState.selectedProjectId) : null;
    const parentsCount = tasks.filter(t => tasks.some(c => c.parentId === t.id)).length;
    const maxDepth = this.depthOf(fullTree);
    const visibleCount = tree.reduce((n, node) => n + this.collectTasks(node).filter(() => true).length, 0);

    const ringC = 2 * Math.PI * 22;
    const ringOffset = ringC * (1 - st.pct / 100);

    container.innerHTML = `
      <div class="view-page planner-page hier-page" id="hierarchy-page">
        <header class="view-header planner-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-sitemap planner-title-icon"></i> Task Hierarchy</h1>
            <p>See how work breaks down from projects and epics into tasks and subtasks, and update status anywhere in the tree${scopeProject ? ` · <strong>${esc(scopeProject.name)}</strong>` : ''}.</p>
          </div>
          <div class="view-actions">
            <div class="hier-segment" role="group" aria-label="Layout">
              <button type="button" id="hier-layout-tree" class="hier-segment-btn ${this.layout === 'tree' ? 'is-active' : ''}" data-hier-action="layout" data-layout="tree" title="Tree outline"><i class="fa-solid fa-list-ul"></i> Tree</button>
              <button type="button" id="hier-layout-chart" class="hier-segment-btn ${this.layout === 'chart' ? 'is-active' : ''}" data-hier-action="layout" data-layout="chart" title="Org chart"><i class="fa-solid fa-sitemap"></i> Chart</button>
            </div>
            <button type="button" id="hier-create-task" class="btn btn-primary" data-hier-action="create"><i class="fa-solid fa-plus"></i> New Issue</button>
          </div>
        </header>

        <section class="planner-summary" aria-label="Hierarchy summary">
          <div class="planner-kpi planner-kpi-progress">
            <svg class="planner-ring" viewBox="0 0 52 52" aria-hidden="true">
              <circle class="planner-ring-track" cx="26" cy="26" r="22"></circle>
              <circle class="planner-ring-fill" cx="26" cy="26" r="22" style="stroke-dasharray: ${ringC.toFixed(2)}; stroke-dashoffset: ${ringOffset.toFixed(2)};"></circle>
            </svg>
            <div class="planner-kpi-ring-label">${st.pct}%</div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Overall done</span>
              <span class="planner-kpi-value">${st.done} <small>of ${st.total} tasks</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-blue"><i class="fa-solid fa-diagram-project"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Parent tasks</span>
              <span class="planner-kpi-value">${parentsCount} <small>${maxDepth} level${maxDepth === 1 ? '' : 's'} deep</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-purple"><i class="fa-solid fa-spinner"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">In flight</span>
              <span class="planner-kpi-value">${st.counts.inprogress + st.counts.inreview} <small>progress / review</small></span>
            </div>
          </div>
          <div class="planner-kpi ${st.counts.blocked ? 'is-alert' : ''}">
            <div class="planner-kpi-icon ${st.counts.blocked ? 'kpi-red' : 'kpi-green'}"><i class="fa-solid ${st.counts.blocked ? 'fa-ban' : 'fa-circle-check'}"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Blocked</span>
              <span class="planner-kpi-value">${st.counts.blocked} <small>${st.counts.blocked ? 'need attention' : 'all clear'}</small></span>
            </div>
          </div>
        </section>

        <section class="hier-toolbar" aria-label="Hierarchy filters">
          <div class="hier-toolbar-row">
            <div class="hier-project-tabs" role="group" aria-label="Project Scope">
              <button type="button" class="hier-proj-pill ${!AppState.selectedProjectId ? 'is-active' : ''}" data-hier-action="select-project" data-project-id="" title="All Projects">
                <i class="fa-solid fa-diagram-project"></i> All Projects
              </button>
              ${AppState.projects.map(p => `
                <button type="button" class="hier-proj-pill ${AppState.selectedProjectId === p.id ? 'is-active' : ''}" data-hier-action="select-project" data-project-id="${esc(p.id)}" title="${esc(p.name)}">
                  <span class="hier-proj-dot" style="background: ${p.color || '#579DFF'};"></span>
                  <span>${esc(p.name)}</span>
                </button>
              `).join('')}
            </div>

            <label class="hier-search">
              <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <input type="search" id="hier-search-input" placeholder="Search key, title, label…" value="${esc(this.search)}" autocomplete="off" aria-label="Search tasks in hierarchy">
            </label>
          </div>

          <div class="hier-toolbar-row hier-toolbar-controls">
            <div class="hier-legend" role="group" aria-label="Filter by status">
              ${StatusControl.ORDER.map(s => `
                <button type="button" class="hier-legend-chip ${this.statusFilter.has(s) ? 'is-active' : ''} ${this.statusFilter.size && !this.statusFilter.has(s) ? 'is-muted' : ''}"
                  id="hier-filter-${s}" data-hier-action="filter-status" data-status="${s}" style="--chip-color: var(--status-${s});"
                  title="${this.statusFilter.has(s) ? 'Remove' : 'Show only'} ${StatusControl.label(s)}" aria-pressed="${this.statusFilter.has(s)}">
                  <span class="hier-legend-dot"></span>${StatusControl.label(s)}<span class="hier-legend-count">${st.counts[s] || 0}</span>
                </button>
              `).join('')}
            </div>
            <div class="hier-toolbar-actions">
              ${this.hasActiveFilters() ? `<button type="button" id="hier-clear-filters" class="btn btn-ghost btn-sm" data-hier-action="clear-filters"><i class="fa-solid fa-filter-circle-xmark"></i> Clear</button>` : ''}
              <button type="button" id="hier-expand-all" class="btn btn-ghost btn-sm" data-hier-action="expand-all" title="Expand all branches"><i class="fa-solid fa-angles-down"></i> Expand</button>
              <button type="button" id="hier-collapse-all" class="btn btn-ghost btn-sm" data-hier-action="collapse-all" title="Collapse all branches"><i class="fa-solid fa-angles-up"></i> Collapse</button>
              ${this.layout === 'chart' ? `
                <div class="hier-zoom" role="group" aria-label="Zoom">
                  <button type="button" id="hier-zoom-out" class="hier-zoom-btn" data-hier-action="zoom" data-delta="-0.1" title="Zoom out"><i class="fa-solid fa-minus"></i></button>
                  <button type="button" id="hier-zoom-reset" class="hier-zoom-btn hier-zoom-value" data-hier-action="zoom-reset" title="Reset zoom">${Math.round(this.zoom * 100)}%</button>
                  <button type="button" id="hier-zoom-in" class="hier-zoom-btn" data-hier-action="zoom" data-delta="0.1" title="Zoom in"><i class="fa-solid fa-plus"></i></button>
                </div>` : ''}
            </div>
          </div>
        </section>

        ${tree.length === 0 ? this.renderEmpty(tasks.length) : `
          <section class="hier-canvas ${this.layout === 'chart' ? 'is-chart' : 'is-tree'}" id="hier-canvas" aria-label="Task hierarchy">
            ${this.layout === 'chart' ? `
              <div class="hier-chart-viewport" id="hier-chart-viewport" style="${this.zoom !== 1 ? `transform: scale(${this.zoom}); transform-origin: top center;` : ''}">
                <svg class="hier-chart-svg" id="hier-chart-svg" aria-hidden="true"></svg>
                <div class="hier-chart-container" id="hier-chart-container">
                  ${tree.map(projectNode => `
                    <div class="hier-chart-project-tree" data-project-tree="${esc(projectNode.key)}">
                      <ul class="hier-tree hier-root" role="tree">
                        ${this.renderNode(projectNode, 0)}
                      </ul>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div class="hier-tree-viewport">
                <ul class="hier-tree hier-root" role="tree">
                  ${tree.map(n => this.renderNode(n, 0)).join('')}
                </ul>
              </div>
            `}
          </section>
          ${this.hasActiveFilters() ? `<p class="hier-filter-note"><i class="fa-solid fa-circle-info"></i> Showing ${visibleCount} matching item${visibleCount === 1 ? '' : 's'} with their parents for context. Dimmed cards don't match the filter.</p>` : ''}
        `}
      </div>
    `;

    this.attachListeners(container);

    if (this.layout === 'chart') {
      const needsCenter = !this._hasCentered;
      requestAnimationFrame(() => {
        this.updateChartSvg();
        if (needsCenter) {
          this.centerChart();
          this._hasCentered = true;
        }
      });
      setTimeout(() => {
        this.updateChartSvg();
        if (needsCenter) this.centerChart();
      }, 80);
    }
  },

  depthOf(nodes) {
    let max = 0;
    const walk = (n, d) => {
      if (n.kind === 'task') max = Math.max(max, d);
      n.children.forEach(c => walk(c, n.kind === 'task' ? d + 1 : d));
    };
    nodes.forEach(n => walk(n, 1));
    return max;
  },

  renderEmpty(totalTasks) {
    if (totalTasks && this.hasActiveFilters()) {
      return `
        <section class="planner-empty hier-empty">
          <i class="fa-solid fa-filter"></i>
          <strong>No tasks match these filters</strong>
          <span>Try a different search or status.</span>
          <button type="button" class="btn btn-secondary btn-sm" data-hier-action="clear-filters">Clear filters</button>
        </section>`;
    }
    return `
      <section class="planner-empty hier-empty">
        <i class="fa-solid fa-sitemap"></i>
        <strong>Nothing to map yet</strong>
        <span>Create tasks and break them into subtasks to see the hierarchy here.</span>
        <button type="button" class="btn btn-primary btn-sm" data-hier-action="create"><i class="fa-solid fa-plus"></i> Create a task</button>
      </section>`;
  },

  isCollapsed(node) {
    // While filtering, always expand so matches are visible
    if (this.hasActiveFilters()) return false;
    return this.collapsed.has(node.key);
  },

  renderNode(node, depth) {
    const hasKids = node.children.length > 0;
    const collapsed = hasKids && this.isCollapsed(node);
    let card = '';
    if (node.kind === 'project') card = this.renderProjectCard(node, collapsed);
    else if (node.kind === 'epic' || node.kind === 'group') card = this.renderEpicCard(node, collapsed);
    else card = this.renderTaskCard(node, collapsed);

    return `
      <li class="hier-node kind-${node.kind} ${collapsed ? 'is-collapsed' : ''} ${hasKids ? 'has-children' : ''}" role="treeitem" aria-expanded="${hasKids ? !collapsed : 'false'}" data-node-key="${Utils.escapeHTML(node.key)}">
        ${card}
        ${hasKids && !collapsed ? `
          <ul class="hier-tree hier-children" role="group">
            ${node.children.map(c => this.renderNode(c, depth + 1)).join('')}
          </ul>` : ''}
      </li>
    `;
  },

  renderToggle(node, collapsed) {
    if (!node.children.length) return '<span class="hier-toggle is-leaf" aria-hidden="true"></span>';
    const count = this.collectTasks(node).length - (node.task ? 1 : 0);
    return `
      <button type="button" class="hier-toggle" data-hier-action="toggle" title="${collapsed ? 'Expand' : 'Collapse'}" aria-label="${collapsed ? 'Expand' : 'Collapse'}">
        <i class="fa-solid fa-chevron-right"></i>
        ${collapsed ? `<span class="hier-toggle-count">${count}</span>` : ''}
      </button>
    `;
  },

  renderDistribution(tasks) {
    const st = this.stats(tasks);
    if (!st.total) return '';
    const segs = StatusControl.ORDER
      .filter(s => st.counts[s])
      .map(s => `<span class="hier-dist-seg" style="flex: ${st.counts[s]}; background: var(--status-${s});" title="${StatusControl.label(s)}: ${st.counts[s]}"></span>`)
      .join('');
    return `
      <div class="hier-rollup">
        <div class="hier-dist" role="img" aria-label="${st.done} of ${st.total} done">${segs}</div>
        <span class="hier-rollup-text">${st.done}/${st.total} · ${st.pct}%</span>
      </div>
    `;
  },

  renderProjectCard(node, collapsed) {
    const esc = Utils.escapeHTML;
    const p = node.project;
    const tasks = this.collectTasks(node);
    const hasKids = node.children.length > 0;
    return `
      <div class="hier-card hier-card-project" style="--hc-color: ${p.color || '#579DFF'};" data-project-id="${esc(p.id)}">
        <div class="hier-card-left">
          ${this.renderToggle(node, collapsed)}
          <span class="hier-project-icon"><i class="fa-solid ${esc(p.icon || 'fa-folder-tree')}"></i></span>
        </div>
        <div class="hier-card-body">
          <div class="hier-card-kicker">
            <span class="hier-badge-type project-badge"><i class="fa-solid fa-cube"></i> Project</span>
            <span class="hier-key">${esc(p.key || '')}</span>
            <span class="hier-count-pill">${tasks.length} task${tasks.length === 1 ? '' : 's'}</span>
          </div>
          <div class="hier-card-title">${esc(p.name)}</div>
          ${this.renderDistribution(tasks)}
        </div>
        <div class="hier-card-actions">
          ${tasks.length ? `<button type="button" class="hier-icon-btn" data-hier-action="branch-status" title="Set status for all ${tasks.length} tasks in ${esc(p.name)}"><i class="fa-solid fa-layer-group"></i></button>` : ''}
          <button type="button" class="hier-icon-btn" data-hier-action="add-task" title="Add task to ${esc(p.name)}"><i class="fa-solid fa-plus"></i></button>
        </div>
        ${hasKids ? `
          <button type="button" class="hier-chart-toggle-badge" data-hier-action="toggle" title="${collapsed ? 'Expand project branch' : 'Collapse project branch'}">
            <i class="fa-solid ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
            <span>${tasks.length}</span>
          </button>` : ''}
      </div>
    `;
  },

  renderEpicCard(node, collapsed) {
    const esc = Utils.escapeHTML;
    const tasks = this.collectTasks(node);
    const isGroup = node.kind === 'group';
    const color = isGroup ? 'var(--border-bold)' : (node.epic.color || 'var(--accent-purple)');
    const title = isGroup ? node.label : node.epic.title;
    const hasKids = node.children.length > 0;
    return `
      <div class="hier-card hier-card-epic ${isGroup ? 'is-group' : ''}" style="--hc-color: ${color};" data-project-id="${esc(node.project.id)}">
        <div class="hier-card-left">
          ${this.renderToggle(node, collapsed)}
          <span class="hier-epic-icon"><i class="fa-solid ${isGroup ? 'fa-inbox' : 'fa-bolt'}"></i></span>
        </div>
        <div class="hier-card-body">
          <div class="hier-card-kicker">
            <span class="hier-badge-type epic-badge"><i class="fa-solid ${isGroup ? 'fa-layer-group' : 'fa-bolt'}"></i> ${isGroup ? 'Ungrouped' : 'Epic'}</span>
            <span class="hier-count-pill">${tasks.length} task${tasks.length === 1 ? '' : 's'}</span>
          </div>
          <div class="hier-card-title">${esc(title)}</div>
          ${this.renderDistribution(tasks)}
        </div>
        <div class="hier-card-actions">
          <button type="button" class="hier-icon-btn" data-hier-action="branch-status" title="Set status for all ${tasks.length} tasks in this epic"><i class="fa-solid fa-layer-group"></i></button>
          <button type="button" class="hier-icon-btn" data-hier-action="add-task" title="Add task to this epic"><i class="fa-solid fa-plus"></i></button>
        </div>
        ${hasKids ? `
          <button type="button" class="hier-chart-toggle-badge" data-hier-action="toggle" title="${collapsed ? 'Expand epic branch' : 'Collapse epic branch'}">
            <i class="fa-solid ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
            <span>${tasks.length}</span>
          </button>` : ''}
      </div>
    `;
  },

  renderTaskCard(node, collapsed) {
    const esc = Utils.escapeHTML;
    const t = node.task;
    const isDone = t.status === 'done';
    const nextStatus = StatusControl.next(t.status);
    const descendants = this.collectTasks(node).slice(1);
    const hasKids = node.children.length > 0;
    const typeIcon = this.TYPE_ICON[t.type] || 'fa-square-check';

    let dueChip = '';
    if (t.dueDate) {
      const due = new Date(t.dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = !isDone && t.status !== 'cancelled' && due < today;
      dueChip = `<span class="hier-chip ${overdue ? 'is-overdue' : ''}" title="Due ${Utils.formatDate(t.dueDate)}"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(t.dueDate)}</span>`;
    }

    return `
      <div class="hier-card hier-card-task status-${esc(t.status)} ${isDone ? 'is-done' : ''} ${node.match === false ? 'is-context' : ''}"
        style="--hc-color: var(--status-${esc(t.status)});" data-task-id="${esc(t.id)}" tabindex="-1">
        <div class="hier-card-left">
          ${this.renderToggle(node, collapsed)}
          <button type="button" class="hier-check" data-hier-action="toggle-done" aria-pressed="${isDone}" title="${isDone ? 'Reopen task' : 'Mark as done'}">
            <i class="fa-solid fa-check"></i>
          </button>
        </div>
        <div class="hier-card-body">
          <div class="hier-card-kicker">
            <span class="type-icon type-${esc(t.type)}"><i class="fa-solid ${typeIcon}"></i></span>
            <span class="hier-key">${esc(t.key)}</span>
            <span class="planner-prio prio-${esc(t.priority)}" title="${esc(t.priority)} priority"><i class="${this.PRIORITY_ICON[t.priority] || 'fa-solid fa-equals'}"></i></span>
          </div>
          <div class="hier-card-title hier-task-title" data-hier-action="open" title="Click to view details: ${esc(t.title)}">${esc(t.title)}</div>
          <div class="hier-card-meta">
            ${StatusControl.pillHTML(t, 'hier-status-pill')}
            ${t.storyPoints > 0 ? `<span class="hier-chip" title="Story points"><i class="fa-solid fa-star"></i> ${t.storyPoints} pts</span>` : ''}
            ${dueChip}
          </div>
          ${descendants.length ? this.renderDistribution(descendants) : ''}
        </div>
        <div class="hier-card-actions">
          ${!isDone && t.status !== 'cancelled' ? `
            <button type="button" class="hier-advance-btn" data-hier-action="advance" title="Advance to ${StatusControl.label(nextStatus)}">
              <span>${StatusControl.label(nextStatus)}</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>` : ''}
          ${descendants.length ? `<button type="button" class="hier-icon-btn" data-hier-action="branch-status" title="Set status for ${t.key} + ${descendants.length} subtask${descendants.length === 1 ? '' : 's'}"><i class="fa-solid fa-layer-group"></i></button>` : ''}
          <button type="button" class="hier-icon-btn" data-hier-action="add-subtask" title="Add child subtask"><i class="fa-solid fa-plus"></i></button>
        </div>
        ${hasKids ? `
          <button type="button" class="hier-chart-toggle-badge" data-hier-action="toggle" title="${collapsed ? `Expand ${descendants.length} subtasks` : 'Collapse subtasks'}">
            <i class="fa-solid ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
            <span>${descendants.length}</span>
          </button>` : ''}
      </div>
    `;
  },

  // -------------------------------------------------------------
  // EVENTS
  // -------------------------------------------------------------

  findNode(key) {
    const tree = this.buildTree(this.getScopedTasks());
    let found = null;
    const walk = (n) => {
      if (found) return;
      if (n.key === key) { found = n; return; }
      n.children.forEach(walk);
    };
    tree.forEach(walk);
    return found;
  },

  rerender(preserveScroll = true) {
    const container = document.getElementById('view-container');
    const canvas = container && container.querySelector('#hier-canvas');
    const scroll = (preserveScroll && canvas) ? { left: canvas.scrollLeft, top: canvas.scrollTop } : null;
    this.render(container);
    const nextCanvas = container && container.querySelector('#hier-canvas');
    if (scroll && nextCanvas) {
      nextCanvas.scrollLeft = scroll.left;
      nextCanvas.scrollTop = scroll.top;
    }
  },

  attachListeners(container) {
    const root = container.querySelector('#hierarchy-page');
    if (!root) return;

    root.addEventListener('click', (e) => {
      // Status pill → dropdown
      const pill = e.target.closest('[data-status-action="menu"]');
      if (pill && root.contains(pill)) {
        e.stopPropagation();
        StatusControl.openMenu(pill, pill.dataset.taskId);
        return;
      }

      const actionEl = e.target.closest('[data-hier-action]');
      if (!actionEl || !root.contains(actionEl)) return;
      const action = actionEl.dataset.hierAction;
      const nodeEl = actionEl.closest('[data-node-key]');
      const nodeKey = nodeEl ? nodeEl.dataset.nodeKey : null;
      const taskId = nodeKey && nodeKey.startsWith('t:') ? nodeKey.slice(2) : null;

      switch (action) {
        case 'layout':
          this.layout = actionEl.dataset.layout === 'chart' ? 'chart' : 'tree';
          this._hasCentered = false;
          this.rerender(false);
          break;
        case 'select-project': {
          const pid = actionEl.dataset.projectId || null;
          AppState.selectedProjectId = pid;
          this._hasCentered = false;
          if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
            Router.updateTopbarProjectPicker();
          }
          this.rerender(false);
          break;
        }
        case 'create':
          TaskModal.openCreate();
          break;
        case 'toggle':
          if (!nodeKey) break;
          if (this.collapsed.has(nodeKey)) this.collapsed.delete(nodeKey);
          else this.collapsed.add(nodeKey);
          this.rerender();
          break;
        case 'expand-all':
          this.collapsed.clear();
          this.rerender();
          break;
        case 'collapse-all': {
          const tree = this.buildTree(this.getScopedTasks());
          const walk = (n) => {
            // keep projects open so the first level stays visible
            if (n.children.length && n.kind !== 'project') this.collapsed.add(n.key);
            n.children.forEach(walk);
          };
          tree.forEach(walk);
          this.rerender();
          break;
        }
        case 'filter-status': {
          const s = actionEl.dataset.status;
          if (this.statusFilter.has(s)) this.statusFilter.delete(s);
          else this.statusFilter.add(s);
          this.rerender();
          break;
        }
        case 'clear-filters':
          this.statusFilter.clear();
          this.search = '';
          this.rerender();
          break;
        case 'zoom':
          this.zoom = Math.min(1.5, Math.max(0.4, Math.round((this.zoom + parseFloat(actionEl.dataset.delta)) * 10) / 10));
          this.applyZoom();
          break;
        case 'zoom-reset':
          this.zoom = 1;
          this.applyZoom();
          break;
        case 'open':
          if (taskId) TaskModal.openDetail(taskId);
          break;
        case 'toggle-done':
          if (taskId) StatusControl.toggleDone(taskId);
          break;
        case 'advance':
          if (taskId) StatusControl.advance(taskId);
          break;
        case 'add-subtask': {
          const task = taskId && AppState.tasks.find(t => t.id === taskId);
          if (task) TaskModal.openCreate({ parentId: task.id, projectId: task.projectId });
          break;
        }
        case 'add-task': {
          const card = actionEl.closest('[data-project-id]');
          TaskModal.openCreate(card ? { projectId: card.dataset.projectId } : {});
          break;
        }
        case 'branch-status': {
          const node = nodeKey && this.findNode(nodeKey);
          if (!node) break;
          const ids = this.collectTasks(node).map(t => t.id);
          if (!ids.length) break;
          StatusControl.openMenu(actionEl, ids, {
            title: node.kind === 'task' ? `Set ${node.task.key} + subtasks` : `Set all ${ids.length} tasks`,
            currentValue: ''
          });
          break;
        }
      }
    });

    // Search (debounced, keeps focus/caret after re-render)
    const searchInput = root.querySelector('#hier-search-input');
    if (searchInput) {
      let timer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.search = searchInput.value;
          const caret = searchInput.selectionStart;
          this.rerender();
          const next = document.getElementById('hier-search-input');
          if (next) {
            next.focus();
            try { next.setSelectionRange(caret, caret); } catch (err) { /* ignore */ }
          }
        }, 180);
      });
    }

    // Right-click → full context menu
    root.addEventListener('contextmenu', (e) => {
      const card = e.target.closest('.hier-card-task');
      if (!card || typeof ContextMenu === 'undefined') return;
      const task = AppState.tasks.find(t => t.id === card.dataset.taskId);
      if (!task) return;
      e.preventDefault();
      ContextMenu.open(e.clientX, e.clientY, task);
    });

    // Keyboard: Enter opens, Space toggles collapse on focused card
    root.addEventListener('keydown', (e) => {
      const card = e.target.closest && e.target.closest('.hier-card-task');
      if (!card || e.target !== card) return;
      if (e.key === 'Enter') TaskModal.openDetail(card.dataset.taskId);
    });

    // Chart: drag-to-pan on empty canvas space
    const canvas = root.querySelector('#hier-canvas.is-chart');
    if (canvas) {
      let panning = false, sx = 0, sy = 0, sl = 0, stp = 0;
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.hier-card, button, input')) return;
        panning = true;
        sx = e.clientX; sy = e.clientY; sl = canvas.scrollLeft; stp = canvas.scrollTop;
        canvas.classList.add('is-panning');
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!panning) return;
        canvas.scrollLeft = sl - (e.clientX - sx);
        canvas.scrollTop = stp - (e.clientY - sy);
      });
      const end = () => { panning = false; canvas.classList.remove('is-panning'); };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
    }

    // Auto-update curves on window resize & viewport resize
    if (!this._resizeHandler) {
      this._resizeHandler = () => {
        if (this.layout === 'chart') this.updateChartSvg();
      };
      window.addEventListener('resize', this._resizeHandler);
    }
    const vp = root.querySelector('#hier-chart-viewport');
    if (vp && window.ResizeObserver) {
      if (!this._resizeObserver) {
        this._resizeObserver = new ResizeObserver(() => {
          if (this.layout === 'chart') this.updateChartSvg();
        });
      }
      this._resizeObserver.observe(vp);
    }
  },

  applyZoom() {
    const vp = document.getElementById('hier-chart-viewport');
    const lbl = document.getElementById('hier-zoom-reset');
    if (vp) {
      vp.style.transform = this.zoom !== 1 ? `scale(${this.zoom})` : '';
      vp.style.transformOrigin = 'top center';
    }
    if (lbl) lbl.textContent = `${Math.round(this.zoom * 100)}%`;
    this.updateChartSvg();
  },

  centerChart() {
    const canvas = document.getElementById('hier-canvas');
    const container = document.getElementById('hier-chart-container');
    if (!canvas || !container) return;
    requestAnimationFrame(() => {
      const rootCard = container.querySelector('.hier-card-project, .hier-card-epic');
      if (rootCard) {
        const cRect = canvas.getBoundingClientRect();
        const rRect = rootCard.getBoundingClientRect();
        canvas.scrollLeft += (rRect.left + rRect.width / 2) - (cRect.left + cRect.width / 2);
      } else if (container.scrollWidth > canvas.clientWidth) {
        canvas.scrollLeft = (container.scrollWidth - canvas.clientWidth) / 2;
      }
      canvas.scrollTop = 0;
    });
  },

  updateChartSvg() {
    if (this.layout !== 'chart') return;
    const canvas = document.getElementById('hier-canvas');
    const viewport = document.getElementById('hier-chart-viewport');
    const container = document.getElementById('hier-chart-container');
    const svg = document.getElementById('hier-chart-svg');
    if (!canvas || !viewport || !container || !svg) return;

    const vpRect = viewport.getBoundingClientRect();
    const scale = this.zoom || 1;

    const totalW = Math.max(viewport.scrollWidth, viewport.offsetWidth, container.offsetWidth);
    const totalH = Math.max(viewport.scrollHeight, viewport.offsetHeight, container.offsetHeight);

    svg.setAttribute('width', totalW);
    svg.setAttribute('height', totalH);
    svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);

    const parentNodes = container.querySelectorAll('.hier-node.has-children:not(.is-collapsed)');
    let paths = '';
    let dots = '';

    parentNodes.forEach(parentNode => {
      const parentCard = parentNode.querySelector(':scope > .hier-card');
      if (!parentCard) return;

      const childNodes = parentNode.querySelectorAll(':scope > .hier-children > .hier-node');
      if (!childNodes.length) return;

      const pRect = parentCard.getBoundingClientRect();
      const badge = parentCard.querySelector('.hier-chart-toggle-badge');
      const bRect = badge ? badge.getBoundingClientRect() : null;

      const x1 = ((pRect.left + pRect.right) / 2 - vpRect.left) / scale;
      const y1 = ((bRect ? bRect.bottom - 1 : pRect.bottom) - vpRect.top) / scale;

      childNodes.forEach(childNode => {
        const childCard = childNode.querySelector(':scope > .hier-card');
        if (!childCard) return;

        const cRect = childCard.getBoundingClientRect();
        const x2 = ((cRect.left + cRect.right) / 2 - vpRect.left) / scale;
        const y2 = (cRect.top - vpRect.top) / scale;

        const dy = y2 - y1;
        const childColor = childCard.style.getPropertyValue('--hc-color') || 'var(--border-bold)';

        // Smooth Cubic Bezier curve
        const cy1 = y1 + Math.max(18, dy * 0.48);
        const cy2 = y2 - Math.max(18, dy * 0.48);

        const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${cy1.toFixed(1)}, ${x2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;

        paths += `
          <path d="${d}" class="hier-edge-bg" stroke="rgba(0,0,0,0.4)" stroke-width="4.5" fill="none" stroke-linecap="round" />
          <path d="${d}" class="hier-edge-path" stroke="${childColor}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.85" />
        `;

        dots += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3.5" fill="${childColor}" stroke="var(--bg-surface)" stroke-width="1.5" />`;
      });

      dots += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="3.5" fill="var(--border-bold)" stroke="var(--bg-surface)" stroke-width="1.5" />`;
    });

    svg.innerHTML = `
      <g class="hier-edges-paths">${paths}</g>
      <g class="hier-edges-dots">${dots}</g>
    `;
  }
};
