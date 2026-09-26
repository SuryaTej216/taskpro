/**
 * TaskForge - Timeline & Gantt View
 * Features:
 * - Unified sticky CSS grid architecture (synchronous 60fps horizontal & vertical scrolling)
 * - Intelligent date fallback (renders all tasks, visually distinguishes estimated vs scheduled dates)
 * - True multi-scale zoom (Day: 56px, Week: 36px, Month: 20px) with grouped month & day headers
 * - Project & Status filtering with instant search
 * - Today marker line and auto-centering "Jump to Today" button
 * - Subtask progress fill & status-based bar styling
 */

const TimelineView = {
  currentZoom: 'week', // 'day', 'week', 'month'
  statusFilter: 'all',  // 'all', 'active', 'todo', 'inprogress', 'inreview', 'done'
  projectFilter: 'all', // 'all' or projectId
  searchQuery: '',

  zoomConfigs: {
    day: { dayWidth: 56, beforeBuffer: 7, afterBuffer: 21 },
    week: { dayWidth: 36, beforeBuffer: 10, afterBuffer: 30 },
    month: { dayWidth: 20, beforeBuffer: 14, afterBuffer: 60 }
  },

  /**
   * Resolves valid start & end dates for any task, with graceful fallback
   */
  getTaskDates(task) {
    let start = null;
    let end = null;
    let isEstimated = false;

    if (task.startDate) {
      start = new Date(task.startDate);
    }
    if (task.dueDate) {
      end = new Date(task.dueDate);
    }

    if (!start && !end) {
      const created = task.createdAt ? new Date(task.createdAt) : new Date();
      start = new Date(created);
      end = new Date(start.getTime() + 4 * 86400000);
      isEstimated = true;
    } else if (!start) {
      start = new Date(end.getTime() - 4 * 86400000);
      isEstimated = true;
    } else if (!end) {
      end = new Date(start.getTime() + 4 * 86400000);
      isEstimated = true;
    }

    // Ensure valid non-reversed window
    if (end <= start) {
      end = new Date(start.getTime() + 86400000);
    }

    return { start, end, isEstimated };
  },

  render(container) {
    // If projectFilter is 'all' and AppState has a selected project, sync with it initially
    if (this.projectFilter === 'all' && AppState.selectedProjectId) {
      this.projectFilter = AppState.selectedProjectId;
    }

    const allTasks = AppState.tasks.filter(t => t.status !== 'cancelled');

    // Filter tasks
    let filteredTasks = allTasks;
    if (this.projectFilter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.projectId === this.projectFilter);
    }
    if (this.statusFilter === 'active') {
      filteredTasks = filteredTasks.filter(t => t.status !== 'done');
    } else if (this.statusFilter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.status === this.statusFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      filteredTasks = filteredTasks.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) || 
        (t.key && t.key.toLowerCase().includes(q))
      );
    }

    // Determine timeline range
    const zoomConfig = this.zoomConfigs[this.currentZoom] || this.zoomConfigs.week;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let minDate = new Date(now);
    let maxDate = new Date(now);

    filteredTasks.forEach(task => {
      const { start, end } = this.getTaskDates(task);
      if (start < minDate) minDate = new Date(start);
      if (end > maxDate) maxDate = new Date(end);
    });

    const timelineStart = new Date(minDate);
    timelineStart.setDate(timelineStart.getDate() - zoomConfig.beforeBuffer);
    timelineStart.setHours(0, 0, 0, 0);

    const timelineEnd = new Date(maxDate);
    timelineEnd.setDate(timelineEnd.getDate() + zoomConfig.afterBuffer);
    timelineEnd.setHours(23, 59, 59, 999);

    const totalDays = Math.max(14, Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24)));
    const dayWidth = zoomConfig.dayWidth;
    const totalTimelineWidth = totalDays * dayWidth;

    // Calculate Today's pixel offset
    const todayDiffDays = (now - timelineStart) / (1000 * 60 * 60 * 24);
    const todayLeftPx = Math.round(todayDiffDays * dayWidth) + Math.round(dayWidth / 2);

    container.innerHTML = `
      <div class="view-page timeline-view-container">
        <!-- View Header Toolbar -->
        <div class="view-header" style="margin-bottom: 0;">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-chart-gantt" style="color: var(--accent-primary);"></i> Timeline & Gantt Chart</h1>
            <p>Interactive schedule roadmap, delivery timeline, and workload visualization.</p>
          </div>
          <div class="view-actions">
            <button id="btn-timeline-today" class="btn btn-secondary btn-sm" title="Center timeline on today">
              <i class="fa-solid fa-calendar-day"></i> Today
            </button>
            <div class="timeline-zoom-group">
              <button class="timeline-zoom-btn ${this.currentZoom === 'day' ? 'active' : ''}" onclick="TimelineView.setZoom('day')">Day</button>
              <button class="timeline-zoom-btn ${this.currentZoom === 'week' ? 'active' : ''}" onclick="TimelineView.setZoom('week')">Week</button>
              <button class="timeline-zoom-btn ${this.currentZoom === 'month' ? 'active' : ''}" onclick="TimelineView.setZoom('month')">Month</button>
            </div>
            <button id="btn-timeline-create" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="timeline-toolbar">
          <div class="timeline-toolbar-left">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);"><i class="fa-solid fa-folder-tree"></i> Project:</span>
              <select id="timeline-project-select" class="timeline-filter-select">
                <option value="all" ${this.projectFilter === 'all' ? 'selected' : ''}>All Projects (${allTasks.length} tasks)</option>
                ${AppState.projects.map(p => {
                  const pCount = allTasks.filter(t => t.projectId === p.id).length;
                  return `<option value="${p.id}" ${this.projectFilter === p.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${pCount})</option>`;
                }).join('')}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);"><i class="fa-solid fa-filter"></i> Status:</span>
              <select id="timeline-status-select" class="timeline-filter-select">
                <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active (Incomplete)</option>
                <option value="todo" ${this.statusFilter === 'todo' ? 'selected' : ''}>To Do</option>
                <option value="inprogress" ${this.statusFilter === 'inprogress' ? 'selected' : ''}>In Progress</option>
                <option value="inreview" ${this.statusFilter === 'inreview' ? 'selected' : ''}>In Review</option>
                <option value="done" ${this.statusFilter === 'done' ? 'selected' : ''}>Done</option>
              </select>
            </div>

            <div style="position: relative; display: flex; align-items: center;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; font-size: 12px; color: var(--text-muted);"></i>
              <input type="text" id="timeline-search-input" class="timeline-filter-select" placeholder="Filter tasks..." value="${Utils.escapeHTML(this.searchQuery)}" style="padding-left: 28px; width: 180px;">
            </div>
          </div>

          <div class="timeline-toolbar-right">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">
              Showing <strong>${filteredTasks.length}</strong> of ${allTasks.length} tasks
            </span>
          </div>
        </div>

        <!-- Gantt Chart Frame -->
        <div class="gantt-chart-frame">
          <div class="gantt-scroll-viewport" id="gantt-scroll-viewport">
            <div class="gantt-grid-canvas" style="width: ${320 + totalTimelineWidth}px;">
              
              <!-- Sticky Header Row -->
              <div class="gantt-header">
                <!-- Top-Left Corner Header -->
                <div class="gantt-corner-header">
                  <span>Task / Initiative</span>
                  <span class="badge badge-secondary" style="font-size: 10px;">${filteredTasks.length}</span>
                </div>

                <!-- Timeline Scale Header -->
                <div class="gantt-time-scale" style="width: ${totalTimelineWidth}px;">
                  <!-- Months Grouped Row -->
                  <div class="gantt-months-row">
                    ${this.renderMonthsRow(timelineStart, totalDays, dayWidth)}
                  </div>
                  <!-- Days Row -->
                  <div class="gantt-days-row">
                    ${this.renderDaysRow(timelineStart, totalDays, dayWidth)}
                  </div>
                </div>
              </div>

              <!-- Task Rows Container -->
              <div class="gantt-rows-container">
                <!-- Full-height Today Needle Line -->
                ${todayDiffDays >= 0 && todayDiffDays <= totalDays ? `
                  <div class="gantt-today-line" style="left: ${320 + todayLeftPx}px;">
                    <span class="gantt-today-badge">TODAY</span>
                  </div>
                ` : ''}

                <!-- Rows Content -->
                ${filteredTasks.length === 0 ? `
                  <div class="gantt-empty-state">
                    <i class="fa-solid fa-calendar-xmark"></i>
                    <div class="gantt-empty-title">No tasks found</div>
                    <p class="gantt-empty-desc">
                      ${allTasks.length === 0 
                        ? 'Create your first task to start visualizing your timeline roadmap.' 
                        : 'No tasks match your selected project or status filters.'}
                    </p>
                    <button class="btn btn-primary btn-sm" onclick="${allTasks.length === 0 ? 'TaskModal.openCreate()' : 'TimelineView.resetFilters()'}">
                      <i class="fa-solid ${allTasks.length === 0 ? 'fa-plus' : 'fa-rotate-left'}"></i> 
                      ${allTasks.length === 0 ? 'Create New Task' : 'Reset Filters'}
                    </button>
                  </div>
                ` : filteredTasks.map(t => this.renderTaskRow(t, timelineStart, dayWidth, totalTimelineWidth)).join('')}
              </div>

            </div>
          </div>
        </div>
      </div>
    `;

    // Event bindings
    const viewport = container.querySelector('#gantt-scroll-viewport');

    const projectSelect = container.querySelector('#timeline-project-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', (e) => {
        this.projectFilter = e.target.value;
        this.render(container);
      });
    }

    const statusSelect = container.querySelector('#timeline-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.render(container);
      });
    }

    const searchInput = container.querySelector('#timeline-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        // Debounced re-render
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this.render(container);
          const input = container.querySelector('#timeline-search-input');
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }, 200);
      });
    }

    const createBtn = container.querySelector('#btn-timeline-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const defaultProps = {};
        if (this.projectFilter !== 'all') {
          defaultProps.projectId = this.projectFilter;
        }
        TaskModal.openCreate(defaultProps);
      });
    }

    const todayBtn = container.querySelector('#btn-timeline-today');
    if (todayBtn && viewport) {
      todayBtn.addEventListener('click', () => {
        this.scrollToToday(viewport, todayLeftPx);
      });
    }

    // Auto center on Today on initial load if within range
    if (viewport && todayDiffDays >= 0 && todayDiffDays <= totalDays) {
      setTimeout(() => {
        this.scrollToToday(viewport, todayLeftPx, 'auto');
      }, 50);
    }
  },

  scrollToToday(viewport, todayLeftPx, behavior = 'smooth') {
    if (!viewport) return;
    const viewWidth = viewport.clientWidth - 320;
    const targetScroll = Math.max(0, todayLeftPx - Math.floor(viewWidth / 2));
    viewport.scrollTo({
      left: targetScroll,
      behavior: behavior
    });
  },

  renderMonthsRow(startDate, totalDays, dayWidth) {
    const months = [];
    let currentMonth = null;
    let spanDays = 0;

    const d = new Date(startDate);
    for (let i = 0; i < totalDays; i++) {
      const monthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (monthYear !== currentMonth) {
        if (currentMonth !== null) {
          months.push({ name: currentMonth, days: spanDays });
        }
        currentMonth = monthYear;
        spanDays = 1;
      } else {
        spanDays++;
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentMonth !== null) {
      months.push({ name: currentMonth, days: spanDays });
    }

    return months.map(m => `
      <div class="gantt-month-cell" style="width: ${m.days * dayWidth}px; min-width: ${m.days * dayWidth}px;">
        <i class="fa-regular fa-calendar" style="opacity: 0.6; font-size: 10px;"></i>
        <span>${m.name}</span>
      </div>
    `).join('');
  },

  renderDaysRow(startDate, totalDays, dayWidth) {
    let html = '';
    const d = new Date(startDate);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    for (let i = 0; i < totalDays; i++) {
      const cellDateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const isToday = cellDateStr === todayStr;
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayNumber = d.getDate();
      const dayLetter = d.toLocaleDateString('en-US', { weekday: this.currentZoom === 'day' ? 'short' : 'narrow' });

      html += `
        <div class="gantt-day-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'is-today' : ''}" style="width: ${dayWidth}px; min-width: ${dayWidth}px;">
          <span class="gantt-day-number">${dayNumber}</span>
          <span class="gantt-day-name">${dayLetter}</span>
        </div>
      `;
      d.setDate(d.getDate() + 1);
    }
    return html;
  },

  renderTaskRow(task, timelineStart, dayWidth, totalTimelineWidth) {
    const { start, end, isEstimated } = this.getTaskDates(task);

    // Calculate left offset & duration
    const diffStartDays = (start - timelineStart) / (1000 * 60 * 60 * 24);
    const durationDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));

    const leftPx = Math.max(0, Math.round(diffStartDays * dayWidth));
    const widthPx = Math.max(dayWidth, Math.round(durationDays * dayWidth));

    // Calculate subtask progress
    let subtaskPercent = 0;
    if (task.subtasks && task.subtasks.length > 0) {
      const completed = task.subtasks.filter(s => s.completed).length;
      subtaskPercent = Math.round((completed / task.subtasks.length) * 100);
    } else if (task.status === 'done') {
      subtaskPercent = 100;
    }

    // Status pill colors
    const statusMap = {
      todo: { label: 'To Do', color: 'var(--text-secondary)', bg: 'rgba(0,0,0,0.06)' },
      inprogress: { label: 'In Progress', color: '#b45309', bg: 'rgba(245, 158, 11, 0.15)' },
      inreview: { label: 'In Review', color: '#6d28d9', bg: 'rgba(139, 92, 246, 0.15)' },
      done: { label: 'Done', color: '#087F30', bg: 'rgba(11, 218, 81, 0.15)' }
    };
    const sInfo = statusMap[task.status] || statusMap.todo;

    // Type icon
    const typeIcons = {
      bug: '<i class="fa-solid fa-circle-dot" style="color: #ef4444; font-size: 11px;"></i>',
      story: '<i class="fa-solid fa-bookmark" style="color: #0BDA51; font-size: 11px;"></i>',
      task: '<i class="fa-solid fa-square-check" style="color: #3b82f6; font-size: 11px;"></i>',
      subtask: '<i class="fa-solid fa-diagram-next" style="color: #8b5cf6; font-size: 11px;"></i>'
    };
    const typeIcon = typeIcons[task.type] || typeIcons.task;

    const tooltip = `${task.key}: ${Utils.escapeHTML(task.title)}\\n` +
      `Dates: ${Utils.formatDate(start)} - ${Utils.formatDate(end)} (${Math.round(durationDays)} days)` +
      `${isEstimated ? ' [Auto-estimated dates]' : ''}\\n` +
      `Status: ${sInfo.label} | Priority: ${task.priority}`;

    return `
      <div class="gantt-task-row">
        <!-- Sticky Left Metadata Column -->
        <div class="gantt-task-meta-col" onclick="TaskModal.openDetail('${task.id}')" title="Click to view details">
          ${typeIcon}
          <span class="gantt-task-key">${task.key}</span>
          <span class="gantt-task-title">${Utils.escapeHTML(task.title)}</span>
          <span class="gantt-task-status-pill" style="color: ${sInfo.color}; background: ${sInfo.bg};">
            ${sInfo.label}
          </span>
        </div>

        <!-- Right Timeline Track Space -->
        <div class="gantt-track-space" style="width: ${totalTimelineWidth}px; background: repeating-linear-gradient(to right, transparent, transparent ${dayWidth - 1}px, var(--border-subtle) ${dayWidth}px);">
          <!-- Gantt Task Bar -->
          <div class="gantt-bar status-${task.status} ${task.priority === 'critical' ? 'priority-critical' : ''} ${isEstimated ? 'is-estimated' : ''}" 
               style="left: ${leftPx}px; width: ${widthPx}px;" 
               onclick="TaskModal.openDetail('${task.id}')" 
               title="${tooltip}">
            
            ${subtaskPercent > 0 ? `<div class="gantt-bar-fill" style="width: ${subtaskPercent}%;"></div>` : ''}

            <div class="gantt-bar-content">
              ${task.status === 'done' ? '<i class="fa-solid fa-check" style="font-size: 10px;"></i>' : ''}
              ${task.priority === 'critical' ? '<i class="fa-solid fa-fire" style="font-size: 10px;"></i>' : ''}
              <span>${Utils.escapeHTML(task.title)}</span>
              ${isEstimated ? '<i class="fa-regular fa-clock" style="font-size: 10px; opacity: 0.8;" title="Estimated timeline"></i>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setZoom(zoom) {
    if (this.currentZoom === zoom) return;
    this.currentZoom = zoom;
    const container = document.getElementById('view-container') || document.querySelector('.main-content');
    if (container) {
      this.render(container);
    } else {
      Router.renderCurrentRoute();
    }
  },

  resetFilters() {
    this.statusFilter = 'all';
    this.projectFilter = 'all';
    this.searchQuery = '';
    const container = document.getElementById('view-container') || document.querySelector('.main-content');
    if (container) {
      this.render(container);
    }
  }
};
