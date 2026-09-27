/**
 * TaskForge - High-Performance Enterprise Kanban Board View
 * 
 * Features:
 * - Cards colored strictly by Type of Work (Bug, Story, Task, Improvement, Epic, Subtask)
 * - Exact same work type badges as in List View
 * - Executive command header with KPI micro-metrics, active sprint capsule, and density controls
 * - Streamlined high-visibility filter console: Live search, Project, Sprint, Work Type, Priority & Quick Chips
 * - Dual-tone luxury progress bars for checklists, subtasks, and merged items (visible at 0%, glowing at 100%)
 * - Fix for card compression: tasks maintain full height and column body scrolls smoothly vertically
 * - Smart mouse wheel navigation: natural vertical scrolling inside columns, horizontal on canvas
 * - Smooth Drag & Drop with animated drop insertion indicators
 * - 1-Click Status Advance and inline action drawer triggers
 * - Collapsible Kanban columns and Density Switcher (Comfortable vs Compact)
 */

const BoardView = {
  columns: [
    { id: 'backlog', title: 'Backlog', icon: 'fa-solid fa-box-archive', color: '#64748B', statusVar: 'var(--status-backlog, #64748B)' },
    { id: 'todo', title: 'To Do', icon: 'fa-regular fa-circle-dot', color: '#1868DB', statusVar: 'var(--status-todo, #1868DB)' },
    { id: 'inprogress', title: 'In Progress', icon: 'fa-solid fa-bolt-lightning', color: '#E06C00', statusVar: 'var(--status-inprogress, #E06C00)' },
    { id: 'inreview', title: 'In Review', icon: 'fa-solid fa-eye', color: '#AF59E1', statusVar: 'var(--status-inreview, #AF59E1)' },
    { id: 'done', title: 'Done', icon: 'fa-solid fa-circle-check', color: '#0BDA51', statusVar: 'var(--status-done, #0BDA51)' }
  ],

  // Internal view state
  filtersMinimized: true, // Minimized by default for maximum card vertical space
  searchQuery: '',
  selectedType: '', // '' | 'bug' | 'story' | 'task' | 'improvement' | 'epic' | 'subtask'
  selectedPriority: '', // '' | 'critical' | 'highest' | 'high' | 'medium' | 'low' | 'lowest'
  activeQuickFilter: 'all', // 'all', 'inprogress', 'critical', 'bugs', 'improvements', 'overdue', 'today', or stage id ('backlog', 'todo', etc.)
  cardDensity: 'comfortable', // 'comfortable' | 'compact'
  collapsedColumns: new Set(), // Set of col IDs: e.g. 'backlog', 'done'

  hasAnyActiveFilters() {
    return !!(
      this.searchQuery.trim() ||
      this.selectedType ||
      this.selectedPriority ||
      (AppState.activeFilters.type && AppState.activeFilters.type.length > 0) ||
      (AppState.activeFilters.priority && AppState.activeFilters.priority.length > 0) ||
      AppState.activeFilters.sprintId ||
      AppState.selectedProjectId ||
      (this.activeQuickFilter && this.activeQuickFilter !== 'all')
    );
  },

  getActiveFilterCount() {
    let count = 0;
    if (this.activeQuickFilter && this.activeQuickFilter !== 'all') count++;
    if (this.searchQuery.trim()) count++;
    if (this.selectedType || (AppState.activeFilters.type && AppState.activeFilters.type.length > 0)) count++;
    if (this.selectedPriority || (AppState.activeFilters.priority && AppState.activeFilters.priority.length > 0)) count++;
    if (AppState.activeFilters.sprintId) count++;
    if (AppState.selectedProjectId) count++;
    return count;
  },

  render(container) {
    // 1. Base tasks pool (exclude cancelled)
    let activeTasks = AppState.tasks.filter(t => t.status !== 'cancelled');

    // 2. Project filter (sync with AppState.selectedProjectId)
    if (AppState.selectedProjectId) {
      activeTasks = activeTasks.filter(t => t.projectId === AppState.selectedProjectId);
    }

    // 3. Sprint filter (sync with AppState.activeFilters.sprintId)
    if (AppState.activeFilters.sprintId) {
      activeTasks = activeTasks.filter(t => t.sprintId === AppState.activeFilters.sprintId);
    }

    // 4. Issue Type filter (sync with this.selectedType or AppState.activeFilters.type)
    const activeType = this.selectedType || (AppState.activeFilters.type && AppState.activeFilters.type[0]) || '';
    if (activeType) {
      activeTasks = activeTasks.filter(t => t.type === activeType);
    }

    // 5. Priority filter (sync with this.selectedPriority or AppState.activeFilters.priority)
    const activePriority = this.selectedPriority || (AppState.activeFilters.priority && AppState.activeFilters.priority[0]) || '';
    if (activePriority) {
      activeTasks = activeTasks.filter(t => t.priority === activePriority);
    }

    // 6. Quick filter chips & stage segment filters
    if (this.activeQuickFilter === 'inprogress') {
      activeTasks = activeTasks.filter(t => t.status === 'inprogress');
    } else if (this.activeQuickFilter === 'backlog') {
      activeTasks = activeTasks.filter(t => t.status === 'backlog');
    } else if (this.activeQuickFilter === 'todo') {
      activeTasks = activeTasks.filter(t => t.status === 'todo');
    } else if (this.activeQuickFilter === 'inreview') {
      activeTasks = activeTasks.filter(t => t.status === 'inreview');
    } else if (this.activeQuickFilter === 'done') {
      activeTasks = activeTasks.filter(t => t.status === 'done');
    } else if (this.activeQuickFilter === 'critical') {
      activeTasks = activeTasks.filter(t => t.priority === 'critical' || t.priority === 'highest');
    } else if (this.activeQuickFilter === 'bugs') {
      activeTasks = activeTasks.filter(t => t.type === 'bug');
    } else if (this.activeQuickFilter === 'improvements') {
      activeTasks = activeTasks.filter(t => t.type === 'improvement');
    } else if (this.activeQuickFilter === 'overdue') {
      activeTasks = activeTasks.filter(t => Utils.isOverdue(t.dueDate, t.status));
    } else if (this.activeQuickFilter === 'today') {
      activeTasks = activeTasks.filter(t => Utils.isDueToday(t.dueDate));
    }

    // 7. Live search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      activeTasks = activeTasks.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.key && t.key.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q)) ||
        (t.labels && t.labels.some(l => l.toLowerCase().includes(q)))
      );
    }

    const selectedProject = AppState.projects.find(p => p.id === AppState.selectedProjectId);
    const activeSprint = AppState.sprints.find(s => s.id === AppState.activeFilters.sprintId);

    // 8. Board Metrics Calculations
    const totalCount = activeTasks.length;
    const totalPoints = activeTasks.reduce((acc, t) => acc + (Number(t.storyPoints) || 0), 0);
    const doneTasks = activeTasks.filter(t => t.status === 'done');
    const inProgressCount = activeTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;
    const overdueCount = activeTasks.filter(t => Utils.isOverdue(t.dueDate, t.status)).length;
    const completionPct = totalCount > 0 ? Math.round((doneTasks.length / totalCount) * 100) : 0;

    // Progression bar segment counts
    const statusCounts = {
      backlog: activeTasks.filter(t => t.status === 'backlog').length,
      todo: activeTasks.filter(t => t.status === 'todo').length,
      inprogress: activeTasks.filter(t => t.status === 'inprogress').length,
      inreview: activeTasks.filter(t => t.status === 'inreview').length,
      done: doneTasks.length
    };

    const hasFilters = this.hasAnyActiveFilters();
    const activeFilterCount = this.getActiveFilterCount();

    container.innerHTML = `
      <div class="view-page board-view-page" style="display: flex; flex-direction: column; height: 100%;">
        
        <!-- Standard TaskForge Page Header (Matching other tabs) -->
        <div class="view-header" style="margin-bottom: 12px;">
          <div class="view-title-group">
            <h1>
              <i class="fa-solid fa-table-columns" style="color: var(--accent-primary);"></i>
              <span>${selectedProject ? Utils.escapeHTML(selectedProject.name) : 'All Projects'} Board</span>
              ${activeSprint ? `
                <span class="board-sprint-badge" title="Active Sprint: ${Utils.escapeHTML(activeSprint.name)}">
                  <i class="fa-solid fa-person-running"></i>
                  <span>${Utils.escapeHTML(activeSprint.name)}</span>
                </span>
              ` : ''}
            </h1>
            <p>Drag and drop cards across lifecycle states to update workflow progress.</p>
          </div>

          <div class="view-actions">
            <!-- Compact Search -->
            <div class="board-search-field-compact">
              <i class="fa-solid fa-magnifying-glass search-field-icon"></i>
              <input type="text" id="board-search-input" placeholder="Search... (/)" value="${Utils.escapeHTML(this.searchQuery)}" autocomplete="off">
              <span class="search-kbd-pill" title="Press '/' to search">/</span>
              ${this.searchQuery ? `<button type="button" id="board-search-clear" class="search-field-clear" title="Clear search"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>

            <!-- Filters Toggle Button -->
            <button type="button" id="board-btn-toggle-filters" class="board-filters-toggle-btn ${!this.filtersMinimized ? 'is-open' : ''} ${hasFilters ? 'has-active-filters' : ''}" title="${this.filtersMinimized ? 'Show Filters' : 'Minimize Filters'}">
              <i class="fa-solid fa-sliders"></i>
              <span>Filters</span>
              ${activeFilterCount > 0 ? `<span class="filters-count-badge">${activeFilterCount}</span>` : ''}
              <i class="fa-solid ${this.filtersMinimized ? 'fa-chevron-down' : 'fa-chevron-up'} toggle-chevron"></i>
            </button>

            <!-- Density & Outer Column Toggles -->
            <div class="board-view-toggles-group">
              <button type="button" id="board-btn-density" class="btn btn-ghost btn-sm btn-icon" title="Density: ${this.cardDensity === 'comfortable' ? 'Comfortable' : 'Compact'}">
                <i class="fa-solid ${this.cardDensity === 'comfortable' ? 'fa-bars' : 'fa-bars-staggered'}"></i>
              </button>
              <button type="button" id="board-btn-toggle-cols" class="btn btn-ghost btn-sm btn-icon" title="${this.collapsedColumns.size > 0 ? 'Expand all columns' : 'Compact outer columns (Backlog & Done)'}">
                <i class="fa-solid ${this.collapsedColumns.size > 0 ? 'fa-arrows-left-right-to-line' : 'fa-arrows-split-up-and-left'}"></i>
              </button>
            </div>

            <!-- New Task Primary Action -->
            <button type="button" id="board-btn-create" class="btn btn-primary btn-sm btn-create-task" title="Create New Task (C)">
              <i class="fa-solid fa-plus"></i>
              <span>New Task</span>
              <kbd class="board-kbd-hint">C</kbd>
            </button>
          </div>
        </div>

        <!-- ROW 2: Executive Overall Status Progression & Health Center -->
        <div class="board-executive-statusbar">
          <div class="statusbar-center-group">
            <div class="board-stage-distribution-bar" title="Interactive Workflow Distribution">
              ${totalCount > 0 ? `
                <div class="stage-seg seg-backlog ${this.activeQuickFilter === 'backlog' ? 'is-selected' : ''}" data-status="backlog" style="width: ${(statusCounts.backlog / totalCount) * 100}%;" title="Backlog: ${statusCounts.backlog} (${Math.round((statusCounts.backlog / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-todo ${this.activeQuickFilter === 'todo' ? 'is-selected' : ''}" data-status="todo" style="width: ${(statusCounts.todo / totalCount) * 100}%;" title="To Do: ${statusCounts.todo} (${Math.round((statusCounts.todo / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-inprogress ${this.activeQuickFilter === 'inprogress' ? 'is-selected' : ''}" data-status="inprogress" style="width: ${(statusCounts.inprogress / totalCount) * 100}%;" title="In Progress: ${statusCounts.inprogress} (${Math.round((statusCounts.inprogress / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-inreview ${this.activeQuickFilter === 'inreview' ? 'is-selected' : ''}" data-status="inreview" style="width: ${(statusCounts.inreview / totalCount) * 100}%;" title="In Review: ${statusCounts.inreview} (${Math.round((statusCounts.inreview / totalCount) * 100)}%) - Click to filter"></div>
                <div class="stage-seg seg-done ${this.activeQuickFilter === 'done' ? 'is-selected' : ''}" data-status="done" style="width: ${(statusCounts.done / totalCount) * 100}%;" title="Done: ${statusCounts.done} (${Math.round((statusCounts.done / totalCount) * 100)}%) - Click to filter"></div>
              ` : `
                <div class="stage-seg is-empty" style="width: 100%;"></div>
              `}
            </div>

            <div class="board-status-metrics-strip">
              <span class="status-metric-pill stat-total" title="Total Filtered Tasks">
                <i class="fa-solid fa-layer-group"></i> <span><strong>${totalCount}</strong> Tasks</span>
              </span>
              <span class="status-metric-pill stat-points" title="Total Story Points">
                <i class="fa-solid fa-diamond"></i> <span><strong>${totalPoints}</strong> pts</span>
              </span>
              <span class="status-metric-pill stat-active" title="Tasks In Progress or In Review">
                <i class="fa-solid fa-bolt-lightning"></i> <span><strong>${inProgressCount}</strong> active</span>
              </span>
              <span class="status-metric-pill stat-completion ${completionPct === 100 ? 'is-complete' : ''}" title="${doneTasks.length} of ${totalCount} tasks completed (${completionPct}%)">
                <i class="fa-solid fa-circle-check"></i> <span><strong>${completionPct}%</strong> done</span>
              </span>
              ${overdueCount > 0 ? `
                <button type="button" class="status-metric-pill stat-overdue ${this.activeQuickFilter === 'overdue' ? 'active' : ''}" id="board-metric-overdue" title="Click to filter overdue tasks">
                  <i class="fa-solid fa-triangle-exclamation"></i> <span><strong>${overdueCount}</strong> overdue</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- COLLAPSIBLE FILTER CONSOLE (Shown when !this.filtersMinimized) -->
        ${!this.filtersMinimized ? `
          <div class="board-collapsible-filter-panel">
            <div class="filter-panel-inner">
              
              <!-- Selectors Group -->
              <div class="filter-panel-selectors">
                <!-- Project Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-folder-tree select-leading-icon" style="color: #388BFD;"></i>
                  <select id="board-project-filter" class="board-select-control" title="Filter by Project">
                    <option value="">All Projects</option>
                    ${AppState.projects.map(p => `
                      <option value="${p.id}" ${p.id === AppState.selectedProjectId ? 'selected' : ''}>
                        ${Utils.escapeHTML(p.name)}
                      </option>
                    `).join('')}
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>

                <!-- Sprint Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-person-running select-leading-icon" style="color: #E06C00;"></i>
                  <select id="board-sprint-filter" class="board-select-control" title="Filter by Sprint">
                    <option value="">All Sprints</option>
                    ${AppState.sprints.map(s => `
                      <option value="${s.id}" ${AppState.activeFilters.sprintId === s.id ? 'selected' : ''}>
                        ${s.status === 'active' ? '⚡ ' : ''}${Utils.escapeHTML(s.name)}
                      </option>
                    `).join('')}
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>

                <!-- Work Type Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-shapes select-leading-icon" style="color: #AF59E1;"></i>
                  <select id="board-type-filter" class="board-select-control" title="Filter by Type of Work">
                    <option value="">All Types</option>
                    <option value="bug" ${activeType === 'bug' ? 'selected' : ''}>Bug</option>
                    <option value="story" ${activeType === 'story' ? 'selected' : ''}>Story</option>
                    <option value="task" ${activeType === 'task' ? 'selected' : ''}>Task</option>
                    <option value="improvement" ${activeType === 'improvement' ? 'selected' : ''}>Improvement</option>
                    <option value="epic" ${activeType === 'epic' ? 'selected' : ''}>Epic</option>
                    <option value="subtask" ${activeType === 'subtask' ? 'selected' : ''}>Subtask</option>
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>

                <!-- Priority Filter -->
                <div class="board-filter-select-wrapper">
                  <i class="fa-solid fa-arrow-up-wide-short select-leading-icon" style="color: #E2483D;"></i>
                  <select id="board-priority-filter" class="board-select-control" title="Filter by Priority">
                    <option value="">All Priorities</option>
                    <option value="critical" ${activePriority === 'critical' ? 'selected' : ''}>Critical</option>
                    <option value="highest" ${activePriority === 'highest' ? 'selected' : ''}>Highest</option>
                    <option value="high" ${activePriority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${activePriority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${activePriority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="lowest" ${activePriority === 'lowest' ? 'selected' : ''}>Lowest</option>
                  </select>
                  <i class="fa-solid fa-chevron-down select-trailing-chevron"></i>
                </div>
              </div>

              <!-- Quick Chips Group -->
              <div class="filter-panel-chips">
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'all' && !hasFilters ? 'active' : ''}" data-filter="all">
                  <span>All</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'inprogress' ? 'active' : ''}" data-filter="inprogress">
                  <i class="fa-solid fa-bolt" style="color: #E06C00;"></i>
                  <span>In Progress</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'critical' ? 'active' : ''}" data-filter="critical">
                  <i class="fa-solid fa-fire" style="color: #EF4444;"></i>
                  <span>Critical</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'bugs' ? 'active' : ''}" data-filter="bugs">
                  <i class="fa-solid fa-bug" style="color: #EF4444;"></i>
                  <span>Bugs</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'improvements' ? 'active' : ''}" data-filter="improvements">
                  <i class="fa-solid fa-arrow-up-right-dots" style="color: #00A3BF;"></i>
                  <span>Improvements</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'overdue' ? 'active' : ''}" data-filter="overdue">
                  <i class="fa-solid fa-triangle-exclamation" style="color: #E06C00;"></i>
                  <span>Overdue</span>
                </button>
                <button type="button" class="board-filter-chip ${this.activeQuickFilter === 'today' ? 'active' : ''}" data-filter="today">
                  <i class="fa-solid fa-calendar-day" style="color: #3B82F6;"></i>
                  <span>Due Today</span>
                </button>
              </div>

              <!-- Actions: Clear & Minimize -->
              <div class="filter-panel-actions">
                ${hasFilters ? `
                  <button type="button" id="board-btn-reset-filters" class="board-filter-clear-all" title="Clear all filters">
                    <i class="fa-solid fa-xmark"></i>
                    <span>Clear (${activeFilterCount})</span>
                  </button>
                ` : ''}
                <button type="button" id="board-btn-minimize-filters" class="btn-minimize-panel" title="Minimize filters to single status bar">
                  <i class="fa-solid fa-chevron-up"></i>
                  <span>Minimize</span>
                </button>
              </div>

            </div>
          </div>
        ` : ''}

        <!-- ACTIVE FILTERS SUMMARY STRIP (Shown when minimized AND filters are active) -->
        ${this.filtersMinimized && hasFilters ? `
          <div class="board-minimized-active-strip">
            <span class="active-strip-label"><i class="fa-solid fa-filter"></i> Filters:</span>
            <div class="active-strip-chips">
              ${this.searchQuery ? `
                <button type="button" class="min-filter-chip" data-clear="search" title="Remove search filter">
                  <span>"${Utils.escapeHTML(this.searchQuery)}"</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${selectedProject ? `
                <button type="button" class="min-filter-chip" data-clear="project" title="Remove project filter">
                  <i class="fa-solid fa-folder-tree" style="color: #388BFD;"></i> <span>${Utils.escapeHTML(selectedProject.name)}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${activeSprint ? `
                <button type="button" class="min-filter-chip" data-clear="sprint" title="Remove sprint filter">
                  <i class="fa-solid fa-person-running" style="color: #E06C00;"></i> <span>${Utils.escapeHTML(activeSprint.name)}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${activeType ? `
                <button type="button" class="min-filter-chip" data-clear="type" title="Remove type filter">
                  <i class="fa-solid fa-shapes" style="color: #AF59E1;"></i> <span>${activeType}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${activePriority ? `
                <button type="button" class="min-filter-chip" data-clear="priority" title="Remove priority filter">
                  <i class="fa-solid fa-arrow-up-wide-short" style="color: #E2483D;"></i> <span>${activePriority}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
              ${this.activeQuickFilter !== 'all' ? `
                <button type="button" class="min-filter-chip" data-clear="quick" title="Remove quick filter">
                  <i class="fa-solid fa-bolt"></i> <span>${this.activeQuickFilter}</span> <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
            </div>
            <button type="button" id="board-btn-reset-filters-min" class="btn-clear-active-min" title="Clear all active filters">
              <i class="fa-solid fa-xmark"></i> Clear All
            </button>
          </div>
        ` : ''}

        <!-- Board Wrapper with Smooth Horizontal Drag-to-Pan and Chevrons -->
        <div class="board-wrapper">
          
          <!-- Floating Scroll Navigation Chevrons -->
          <button type="button" class="board-scroll-arrow left" id="board-scroll-left" title="Scroll board left" aria-label="Scroll left">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <button type="button" class="board-scroll-arrow right" id="board-scroll-right" title="Scroll board right" aria-label="Scroll right">
            <i class="fa-solid fa-chevron-right"></i>
          </button>

          <!-- Kanban Columns Canvas -->
          <div class="board-container" id="kanban-columns-container">
            ${this.columns.map(col => {
              const colTasks = activeTasks.filter(t => t.status === col.id);
              const colPoints = colTasks.reduce((acc, t) => acc + (Number(t.storyPoints) || 0), 0);
              const isCollapsed = this.collapsedColumns.has(col.id);

              return `
                <div class="board-column ${isCollapsed ? 'is-collapsed' : ''}" data-status="${col.id}" style="--col-accent: ${col.color};">
                  
                  <!-- Expanded Column Layout -->
                  <div class="board-column-expanded-view">
                    
                    <!-- Top Colored Stage Indicator Line -->
                    <div class="board-column-top-accent"></div>

                    <!-- Column Header -->
                    <div class="board-column-header">
                      <div class="board-column-title-wrap">
                        <span class="board-stage-badge" style="background: ${col.color}15; color: ${col.color};">
                          <i class="${col.icon}"></i>
                        </span>
                        <span class="board-column-title">${col.title}</span>
                        <span class="column-task-count" title="${colTasks.length} tasks">${colTasks.length}</span>
                      </div>

                      <div class="board-column-header-actions">
                        ${colPoints > 0 ? `
                          <span class="board-col-points-badge" title="${colPoints} Story Points in ${col.title}">
                            ${colPoints} pts
                          </span>
                        ` : ''}
                        
                        <!-- Quick Add Button -->
                        <button type="button" class="btn-col-action col-quick-add" data-status="${col.id}" title="Add task to ${col.title}">
                          <i class="fa-solid fa-plus"></i>
                        </button>

                        <!-- Collapse Column Button -->
                        <button type="button" class="btn-col-action col-toggle-collapse" data-status="${col.id}" title="Collapse column">
                          <i class="fa-solid fa-angles-left"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Column Task Cards Body (Scrollable Droppable Area) -->
                    <div class="board-column-body" data-status="${col.id}">
                      <!-- Cards populated dynamically -->
                    </div>

                  </div>

                  <!-- Collapsed Column Strip (when collapsed) -->
                  <div class="board-column-collapsed-strip" data-status="${col.id}" title="Click to expand ${col.title}">
                    <div class="collapsed-accent-bar"></div>
                    <div class="collapsed-content">
                      <span class="collapsed-expand-btn">
                        <i class="fa-solid fa-angles-right"></i>
                      </span>
                      <span class="collapsed-icon" style="color: ${col.color};">
                        <i class="${col.icon}"></i>
                      </span>
                      <span class="collapsed-title">${col.title}</span>
                      <span class="collapsed-count">${colTasks.length}</span>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>

        </div>

      </div>
    `;

    this.attachListeners(container, activeTasks);
  },

  attachListeners(container, activeTasks) {
    const isCompact = this.cardDensity === 'compact';

    // 1. Populate cards into expanded column bodies
    this.columns.forEach(col => {
      const body = container.querySelector(`.board-column-body[data-status="${col.id}"]`);
      if (!body) return;

      const colTasks = activeTasks.filter(t => t.status === col.id);

      if (colTasks.length === 0) {
        body.innerHTML = `
          <div class="board-column-empty">
            <div class="empty-icon-wrap" style="color: ${col.color};">
              <i class="${col.icon}"></i>
            </div>
            <div class="empty-title">No tasks in ${col.title}</div>
            <div class="empty-desc">Drop cards here or create a new issue to track workflow.</div>
            <button type="button" class="btn btn-ghost btn-sm empty-add-btn col-quick-add" data-status="${col.id}">
              <i class="fa-solid fa-plus"></i> Create Issue
            </button>
          </div>
        `;
      } else {
        colTasks.forEach(task => {
          const cardEl = TaskCard.render(task, { isCompact });
          body.appendChild(cardEl);
        });
      }

      // 2. Drag over / drop listeners on column bodies
      body.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        body.classList.add('drag-over');

        const afterElement = this.getDragAfterElement(body, e.clientY);
        let indicator = body.querySelector('.board-drop-indicator');
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.className = 'board-drop-indicator';
        }

        if (afterElement == null) {
          body.appendChild(indicator);
        } else {
          body.insertBefore(indicator, afterElement);
        }
      });

      body.addEventListener('dragleave', (e) => {
        if (!body.contains(e.relatedTarget)) {
          body.classList.remove('drag-over');
          const indicator = body.querySelector('.board-drop-indicator');
          if (indicator) indicator.remove();
        }
      });

      body.addEventListener('drop', (e) => {
        e.preventDefault();
        body.classList.remove('drag-over');
        const indicator = body.querySelector('.board-drop-indicator');
        if (indicator) indicator.remove();

        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          const task = AppState.tasks.find(t => t.id === taskId);
          if (task && task.status !== col.id) {
            const res = AppState.updateTask(taskId, { status: col.id });
            if (res) {
              Toast.success(`Moved ${task.key} to ${col.title}`);
            } else {
              this.render(container);
            }
          }
        }
      });
    });

    // Drop positioning calculation helper
    this.getDragAfterElement = (containerEl, y) => {
      const draggableElements = [...containerEl.querySelectorAll('.task-card:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    // 3. Quick create buttons (+ in column headers & empty states)
    container.querySelectorAll('.col-quick-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const status = btn.dataset.status;
        TaskModal.openCreate({ status });
      });
    });

    // 4. Column Collapse / Expand listeners
    container.querySelectorAll('.col-toggle-collapse').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const status = btn.dataset.status;
        this.collapsedColumns.add(status);
        this.render(container);
      });
    });

    container.querySelectorAll('.board-column-collapsed-strip').forEach(strip => {
      strip.addEventListener('click', () => {
        const status = strip.dataset.status;
        this.collapsedColumns.delete(status);
        this.render(container);
      });
    });

    // 5. Expand All / Collapse Outer toggle
    const toggleColsBtn = container.querySelector('#board-btn-toggle-cols');
    if (toggleColsBtn) {
      toggleColsBtn.addEventListener('click', () => {
        if (this.collapsedColumns.size > 0) {
          this.collapsedColumns.clear();
        } else {
          this.collapsedColumns.add('backlog');
          this.collapsedColumns.add('done');
        }
        this.render(container);
      });
    }

    // 6. Density Toggle
    const densityBtn = container.querySelector('#board-btn-density');
    if (densityBtn) {
      densityBtn.addEventListener('click', () => {
        this.cardDensity = this.cardDensity === 'comfortable' ? 'compact' : 'comfortable';
        this.render(container);
      });
    }

    // 7. Header Create button
    const createBtn = container.querySelector('#board-btn-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => TaskModal.openCreate());
    }

    // 8. Live Search Input
    const searchInput = container.querySelector('#board-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render(container);
        const newSearchInput = container.querySelector('#board-search-input');
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.selectionStart = newSearchInput.selectionEnd = newSearchInput.value.length;
        }
      });
    }

    const searchClearBtn = container.querySelector('#board-search-clear');
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render(container);
      });
    }

    // Keyboard shortcut '/' for search
    const handleSearchHotkey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        const input = container.querySelector('#board-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleSearchHotkey, { once: true });

    // 8b. Toggle and Minimize Filter Panel
    const toggleFiltersBtn = container.querySelector('#board-btn-toggle-filters');
    if (toggleFiltersBtn) {
      toggleFiltersBtn.addEventListener('click', () => {
        this.filtersMinimized = !this.filtersMinimized;
        this.render(container);
      });
    }

    const minimizeBtn = container.querySelector('#board-btn-minimize-filters');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        this.filtersMinimized = true;
        this.render(container);
      });
    }

    // 8c. Interactive Stage Progress Segments Click (quick stage filter)
    container.querySelectorAll('.board-stage-distribution-bar .stage-seg[data-status]').forEach(seg => {
      seg.addEventListener('click', () => {
        const status = seg.dataset.status;
        this.activeQuickFilter = this.activeQuickFilter === status ? 'all' : status;
        this.render(container);
      });
    });

    // 8d. Minimized Active Filter Strip Removals
    const resetMinBtn = container.querySelector('#board-btn-reset-filters-min');
    if (resetMinBtn) {
      resetMinBtn.addEventListener('click', () => {
        this.clearAllFilters(container);
      });
    }

    container.querySelectorAll('.min-filter-chip[data-clear]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = chip.dataset.clear;
        if (target === 'search') {
          this.searchQuery = '';
        } else if (target === 'project') {
          AppState.selectedProjectId = null;
          if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
            Router.updateTopbarProjectPicker();
          }
        } else if (target === 'sprint') {
          AppState.activeFilters.sprintId = null;
        } else if (target === 'type') {
          this.selectedType = '';
          AppState.activeFilters.type = [];
        } else if (target === 'priority') {
          this.selectedPriority = '';
          AppState.activeFilters.priority = [];
        } else if (target === 'quick') {
          this.activeQuickFilter = 'all';
        }
        this.render(container);
      });
    });

    // 9. Quick Filter Chips in Expanded Panel
    container.querySelectorAll('.board-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeQuickFilter = chip.dataset.filter;
        this.render(container);
      });
    });

    // 10. Clickable Overdue Inline Metric Pill
    const overduePill = container.querySelector('#board-metric-overdue');
    if (overduePill) {
      overduePill.addEventListener('click', () => {
        this.activeQuickFilter = this.activeQuickFilter === 'overdue' ? 'all' : 'overdue';
        this.render(container);
      });
    }

    // 11. Select Filters (Project, Sprint, Type, Priority)
    const projSelect = container.querySelector('#board-project-filter');
    if (projSelect) {
      projSelect.addEventListener('change', (e) => {
        AppState.selectedProjectId = e.target.value || null;
        if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
          Router.updateTopbarProjectPicker();
        }
        this.render(container);
      });
    }

    const sprintSelect = container.querySelector('#board-sprint-filter');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', (e) => {
        AppState.activeFilters.sprintId = e.target.value || null;
        this.render(container);
      });
    }

    const typeSelect = container.querySelector('#board-type-filter');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.selectedType = val;
        AppState.activeFilters.type = val ? [val] : [];
        this.render(container);
      });
    }

    const prioSelect = container.querySelector('#board-priority-filter');
    if (prioSelect) {
      prioSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.selectedPriority = val;
        AppState.activeFilters.priority = val ? [val] : [];
        this.render(container);
      });
    }

    // 12. Reset All Filters Button
    const resetBtn = container.querySelector('#board-btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.clearAllFilters(container);
      });
    }

    // 13. Advanced Horizontal Scroll UI/UX (Floating arrows & canvas drag-to-pan)
    const boardContainer = container.querySelector('#kanban-columns-container');
    const scrollLeftBtn = container.querySelector('#board-scroll-left');
    const scrollRightBtn = container.querySelector('#board-scroll-right');

    if (boardContainer) {
      const updateScrollArrows = () => {
        if (!scrollLeftBtn || !scrollRightBtn) return;
        const maxScroll = boardContainer.scrollWidth - boardContainer.clientWidth;
        if (maxScroll <= 10) {
          scrollLeftBtn.classList.remove('visible');
          scrollRightBtn.classList.remove('visible');
          return;
        }
        scrollLeftBtn.classList.toggle('visible', boardContainer.scrollLeft > 20);
        scrollRightBtn.classList.toggle('visible', boardContainer.scrollLeft < maxScroll - 20);
      };

      boardContainer.addEventListener('scroll', updateScrollArrows, { passive: true });
      window.addEventListener('resize', updateScrollArrows, { passive: true });
      setTimeout(updateScrollArrows, 80);

      if (scrollLeftBtn) {
        scrollLeftBtn.addEventListener('click', () => {
          boardContainer.scrollBy({ left: -340, behavior: 'smooth' });
        });
      }
      if (scrollRightBtn) {
        scrollRightBtn.addEventListener('click', () => {
          boardContainer.scrollBy({ left: 340, behavior: 'smooth' });
        });
      }

      // Smart Mouse Wheel:
      // Inside column bodies, allow normal vertical scrolling of cards without hijacking!
      // Horizontal scrolling is only applied on shiftKey, deltaX, or outside column bodies.
      const onWheelHandler = (e) => {
        const colBody = e.target.closest('.board-column-body');
        if (colBody) {
          // Allow native vertical scrolling of task cards inside the column!
          if (!e.shiftKey && e.deltaX === 0) {
            return;
          }
        }
        if (e.deltaX !== 0 || (e.shiftKey && e.deltaY !== 0)) {
          e.preventDefault();
          const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
          boardContainer.scrollLeft += delta * 1.25;
          updateScrollArrows();
        } else if (!colBody && e.deltaY !== 0) {
          // If scrolling on empty board canvas outside column body, scroll horizontally
          e.preventDefault();
          boardContainer.scrollLeft += e.deltaY * 1.25;
          updateScrollArrows();
        }
      };

      boardContainer.addEventListener('wheel', onWheelHandler, { passive: false });

      // Canvas Drag-to-Pan (clicking and dragging empty board background)
      let isPanning = false;
      let startX = 0;
      let initialScroll = 0;

      boardContainer.addEventListener('mousedown', (e) => {
        if (
          e.target.closest('.task-card') ||
          e.target.closest('button') ||
          e.target.closest('select') ||
          e.target.closest('input') ||
          e.target.closest('.tf-dropdown-trigger') ||
          e.target.closest('.board-scroll-arrow') ||
          e.target.closest('.board-column-collapsed-strip') ||
          e.target.closest('.board-column-body')
        ) return;
        isPanning = true;
        boardContainer.classList.add('is-panning');
        startX = e.pageX - boardContainer.offsetLeft;
        initialScroll = boardContainer.scrollLeft;
      });

      window.addEventListener('mouseup', () => {
        if (isPanning) {
          isPanning = false;
          boardContainer.classList.remove('is-panning');
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        const x = e.pageX - boardContainer.offsetLeft;
        const walk = (x - startX) * 1.5;
        boardContainer.scrollLeft = initialScroll - walk;
        updateScrollArrows();
      });
    }
  },

  clearAllFilters(container) {
    this.searchQuery = '';
    this.selectedType = '';
    this.selectedPriority = '';
    this.activeQuickFilter = 'all';
    AppState.activeFilters.sprintId = null;
    AppState.activeFilters.priority = [];
    AppState.activeFilters.type = [];
    AppState.selectedProjectId = null;
    if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
      Router.updateTopbarProjectPicker();
    }
    this.render(container);
  }
};
