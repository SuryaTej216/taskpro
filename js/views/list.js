/**
 * TaskForge - Enterprise High-Density Data Grid & Bulk Operations View
 * 
 * Built for clarity, balance, and professional UX:
 * - Clean executive header with compact inline metrics (tasks, active, critical, improvements, completion)
 * - Single-row streamlined filter console (Search with '/', Project, Type, Status, Priority, Sprint, Reset)
 * - High-clarity quick-filter chips (All, In Progress, Critical, Improvements, Completed, Bugs, Due Today)
 * - Non-breaking monospace Key badges with crisp contrast
 * - Dedicated vibrant Improvement badge with light text
 * - Clean 2-line title & hierarchy architecture (Title on line 1, subtle metadata on line 2)
 * - Balanced row padding and inline status/priority dropdowns
 * - Luxury floating bulk operations capsule with 1-click Mark Done
 */

/**
 * Interactive DataGrid Floating Dropdown Component
 */
const DataGridDropdown = {
  toggle(triggerBtn, type, taskId, currentValue) {
    if (typeof DropdownUI !== 'undefined') {
      if (DropdownUI.activeTrigger === triggerBtn && DropdownUI.isOpen()) {
        DropdownUI.close();
        return;
      }
    }
    this.open(triggerBtn, type, taskId, currentValue);
  },

  open(triggerBtn, type, taskId, currentValue) {
    if (typeof DropdownUI === 'undefined') return;

    let title = '';
    let items = [];

    if (type === 'status') {
      title = 'Change Status';
      items = [
        { value: 'backlog', label: 'Backlog', icon: 'fa-solid fa-inbox', iconColor: '#64748B' },
        { value: 'todo', label: 'To Do', icon: 'fa-regular fa-circle', iconColor: '#2563EB' },
        { value: 'inprogress', label: 'In Progress', icon: 'fa-solid fa-spinner', iconColor: '#EA580C' },
        { value: 'inreview', label: 'In Review', icon: 'fa-solid fa-eye', iconColor: '#9333EA' },
        { value: 'done', label: 'Done', icon: 'fa-solid fa-circle-check', iconColor: '#059669' }
      ];
    } else if (type === 'priority') {
      title = 'Change Priority';
      items = [
        { value: 'critical', label: 'Critical', icon: 'fa-solid fa-angles-up', iconColor: '#DC2626' },
        { value: 'highest', label: 'Highest', icon: 'fa-solid fa-angle-up', iconColor: '#EA580C' },
        { value: 'high', label: 'High', icon: 'fa-solid fa-angle-up', iconColor: '#D97706' },
        { value: 'medium', label: 'Medium', icon: 'fa-solid fa-minus', iconColor: '#EAB308' },
        { value: 'low', label: 'Low', icon: 'fa-solid fa-angle-down', iconColor: '#3B82F6' },
        { value: 'lowest', label: 'Lowest', icon: 'fa-solid fa-angles-down', iconColor: '#94A3B8' }
      ];
    } else if (type === 'actions') {
      title = 'Task Actions';
      items = [
        { value: 'edit', label: 'Edit task', icon: 'fa-solid fa-pen-to-square' },
        { value: 'duplicate', label: 'Duplicate', icon: 'fa-regular fa-copy' },
        { value: 'delete', label: 'Delete task', icon: 'fa-regular fa-trash-can', isDanger: true }
      ];
    }

    DropdownUI.openMenu({
      trigger: triggerBtn,
      title,
      items,
      currentValue,
      searchable: false,
      onSelect: (newVal) => {
        if (type === 'actions') {
          if (newVal === 'edit') TaskModal.openDetail(taskId);
          if (newVal === 'duplicate') AppState.duplicateTask(taskId);
          if (newVal === 'delete') AppState.deleteTask(taskId, true, true);
          return;
        }

        const task = AppState.tasks.find(t => t.id === taskId);
        if (task && newVal) {
          if (type === 'status') {
            AppState.updateTask(taskId, { status: newVal });
          } else if (type === 'priority') {
            AppState.updateTask(taskId, { priority: newVal });
          }
        }
        const container = document.getElementById('view-container') || document.getElementById('main-content');
        if (container) ListView.render(container);
      }
    });
  },

  close() {
    if (typeof DropdownUI !== 'undefined') {
      DropdownUI.close();
    }
  }
};

const ListView = {
  selectedTaskIds: new Set(),
  lastClickedIndex: null,
  sortField: 'key',
  sortAsc: true,
  searchQuery: '',

  /**
   * Generates vibrant Atlassian Design System issue lozenges with icons & light text
   */
  getTypeBadgeHTML(type) {
    const t = (type || 'task').toLowerCase();
    switch (t) {
      case 'improvement':
        return `<span class="datagrid-type-badge type-badge-improvement" title="Improvement" role="img" aria-label="Improvement">
          <i class="fa-solid fa-arrow-up-right-dots" aria-hidden="true"></i>
        </span>`;
      case 'story':
        return `<span class="datagrid-type-badge type-badge-story" title="Story" role="img" aria-label="Story">
          <i class="fa-solid fa-bookmark" aria-hidden="true"></i>
        </span>`;
      case 'bug':
        return `<span class="datagrid-type-badge type-badge-bug" title="Bug" role="img" aria-label="Bug">
          <i class="fa-solid fa-bug" aria-hidden="true"></i>
        </span>`;
      case 'epic':
        return `<span class="datagrid-type-badge type-badge-epic" title="Epic" role="img" aria-label="Epic">
          <i class="fa-solid fa-bolt" aria-hidden="true"></i>
        </span>`;
      case 'subtask':
        return `<span class="datagrid-type-badge type-badge-subtask" title="Subtask" role="img" aria-label="Subtask">
          <i class="fa-solid fa-code-branch" aria-hidden="true"></i>
        </span>`;
      case 'task':
      default:
        return `<span class="datagrid-type-badge type-badge-task" title="Task" role="img" aria-label="Task">
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        </span>`;
    }
  },

  /**
   * Generates interactive status badge button
   */
  getStatusBadgeHTML(status, taskId) {
    const s = (status || 'todo').toLowerCase();
    const config = {
      backlog: { label: 'Backlog', icon: 'fa-solid fa-inbox' },
      todo: { label: 'To Do', icon: 'fa-regular fa-circle' },
      inprogress: { label: 'In Progress', icon: 'fa-solid fa-spinner' },
      inreview: { label: 'In Review', icon: 'fa-solid fa-eye' },
      done: { label: 'Done', icon: 'fa-solid fa-circle-check' }
    }[s] || { label: 'To Do', icon: 'fa-regular fa-circle' };

    return `
      <button type="button" class="datagrid-dropdown-btn cell-status-btn cell-status-${s}" data-action="toggle-status-menu" data-id="${taskId}" data-current="${s}" title="Change status (${config.label})">
        <span class="btn-inner">
          <i class="${config.icon} btn-icon"></i>
          <span class="btn-label">${config.label}</span>
        </span>
        <i class="fa-solid fa-chevron-down btn-chevron"></i>
      </button>
    `;
  },

  /**
   * Generates interactive priority badge button
   */
  getPriorityBadgeHTML(priority, taskId) {
    const p = (priority || 'medium').toLowerCase();
    const config = {
      critical: { label: 'Critical', icon: 'fa-solid fa-angles-up' },
      highest: { label: 'Highest', icon: 'fa-solid fa-angle-up' },
      high: { label: 'High', icon: 'fa-solid fa-angle-up' },
      medium: { label: 'Medium', icon: 'fa-solid fa-minus' },
      low: { label: 'Low', icon: 'fa-solid fa-angle-down' },
      lowest: { label: 'Lowest', icon: 'fa-solid fa-angles-down' }
    }[p] || { label: 'Medium', icon: 'fa-solid fa-minus' };

    return `
      <button type="button" class="datagrid-dropdown-btn cell-prio-btn cell-prio-${p}" data-action="toggle-prio-menu" data-id="${taskId}" data-current="${p}" title="Change priority (${config.label})">
        <span class="btn-inner">
          <i class="${config.icon} btn-icon"></i>
          <span class="btn-label">${config.label}</span>
        </span>
        <i class="fa-solid fa-chevron-down btn-chevron"></i>
      </button>
    `;
  },

  render(container) {
    // 0. Close any open floating dropdown
    DataGridDropdown.close();

    // 1. Clean ghost IDs
    const validTaskIdSet = new Set(AppState.tasks.map(t => t.id));
    this.selectedTaskIds = new Set([...this.selectedTaskIds].filter(id => validTaskIdSet.has(id)));

    // 2. Base tasks pool (exclude cancelled)
    const allTasks = AppState.tasks.filter(t => t.status !== 'cancelled');

    // 3. Project filter
    let tasks = allTasks;
    if (AppState.selectedProjectId) {
      tasks = tasks.filter(t => t.projectId === AppState.selectedProjectId);
    }

    // Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      tasks = tasks.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.key && t.key.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q)) ||
        (t.labels && t.labels.some(l => l.toLowerCase().includes(q)))
      );
    }

    // 10. Natural Sorting (handles WEB-1, WEB-2, WEB-10 correctly)
    const priorityWeights = { critical: 5, highest: 4, high: 3, medium: 2, low: 1, lowest: 0 };
    const statusWeights = { backlog: 0, todo: 1, inprogress: 2, inreview: 3, done: 4 };

    tasks.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      if (this.sortField === 'key') {
        const numA = parseInt((a.key || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.key || '').replace(/\D/g, ''), 10) || 0;
        return this.sortAsc ? numA - numB : numB - numA;
      }

      if (this.sortField === 'priority') {
        const pA = priorityWeights[a.priority] || 0;
        const pB = priorityWeights[b.priority] || 0;
        return this.sortAsc ? pA - pB : pB - pA;
      }

      if (this.sortField === 'status') {
        const sA = statusWeights[a.status] || 0;
        const sB = statusWeights[b.status] || 0;
        return this.sortAsc ? sA - sB : sB - sA;
      }

      if (this.sortField === 'storyPoints') {
        const nA = Number(valA) || 0;
        const nB = Number(valB) || 0;
        return this.sortAsc ? nA - nB : nB - nA;
      }

      if (this.sortField === 'dueDate' || this.sortField === 'createdAt') {
        const dateA = valA ? new Date(valA).getTime() : 0;
        const dateB = valB ? new Date(valB).getTime() : 0;
        return this.sortAsc ? dateA - dateB : dateB - dateA;
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });

    const isAllSelected = tasks.length > 0 && tasks.every(t => this.selectedTaskIds.has(t.id));
    const isSomeSelected = tasks.some(t => this.selectedTaskIds.has(t.id)) && !isAllSelected;

    // Metrics calculations
    const totalPoints = tasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const doneTasksCount = tasks.filter(t => t.status === 'done').length;
    const donePct = tasks.length > 0 ? Math.round((doneTasksCount / tasks.length) * 100) : 0;
    const overdueCount = tasks.filter(t => Utils.isOverdue(t.dueDate, t.status)).length;

    container.innerHTML = `
      <div class="view-page datagrid-view-container">
        
        <!-- Standard TaskForge Atlassian Design System Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-table-list" style="color: var(--accent-primary);"></i> Data Grid & Bulk Operations</h1>
            <p>High-density tabular workspace with multi-select, inline status editing, and batch actions.</p>
          </div>
          <div class="view-actions">
            <div class="datagrid-search-box">
              <i class="fa-solid fa-magnifying-glass datagrid-search-icon"></i>
              <input type="text" id="datagrid-search-input" placeholder="Search tasks... (/)" value="${Utils.escapeHTML(this.searchQuery)}">
              ${this.searchQuery ? `<button id="datagrid-search-clear" class="datagrid-search-clear" title="Clear search"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>
            <button id="btn-list-create" class="btn btn-primary btn-sm" title="Create New Task (C)">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>

        <!-- Main Data Grid Card (Zero horizontal side-scroll, perfectly constrained) -->
        <div class="datagrid-table-card">
          <div class="datagrid-scroll-wrapper">
            <table class="datagrid-table">
              <thead>
                <tr>
                  <th class="col-chk">
                    <input type="checkbox" id="chk-select-all" class="datagrid-chk" ${isAllSelected ? 'checked' : ''} title="Select All (Shift+Click rows for range)">
                  </th>
                  <th class="sortable col-key ${this.sortField === 'key' ? 'sorted' : ''}" data-sort="key">
                    Key <i class="fa-solid ${this.sortField === 'key' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-type ${this.sortField === 'type' ? 'sorted' : ''}" data-sort="type">
                    Type <i class="fa-solid ${this.sortField === 'type' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-title ${this.sortField === 'title' ? 'sorted' : ''}" data-sort="title">
                    Title & Hierarchy <i class="fa-solid ${this.sortField === 'title' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-status ${this.sortField === 'status' ? 'sorted' : ''}" data-sort="status">
                    Status <i class="fa-solid ${this.sortField === 'status' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-prio ${this.sortField === 'priority' ? 'sorted' : ''}" data-sort="priority">
                    Priority <i class="fa-solid ${this.sortField === 'priority' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-date ${this.sortField === 'dueDate' ? 'sorted' : ''}" data-sort="dueDate">
                    Due Date <i class="fa-solid ${this.sortField === 'dueDate' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="sortable col-pts ${this.sortField === 'storyPoints' ? 'sorted' : ''}" data-sort="storyPoints">
                    Pts <i class="fa-solid ${this.sortField === 'storyPoints' ? (this.sortAsc ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort'} sort-icon"></i>
                  </th>
                  <th class="col-actions" aria-label="Actions" title="Actions">
                    <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${tasks.length === 0 ? `
                  <tr>
                    <td colspan="9" style="padding: 48px 20px; text-align: center; color: var(--text-muted);">
                      <i class="fa-solid fa-list-check" style="font-size: 36px; margin-bottom: 12px; display: block; color: var(--border-bold);"></i>
                      <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">No Tasks Match Criteria</div>
                      <div style="font-size: 13px; margin-bottom: 16px; max-width: 400px; margin-left: auto; margin-right: auto; color: var(--text-secondary);">
                        ${this.searchQuery.trim() || AppState.selectedProjectId
                          ? 'No tasks match your search or selected project.'
                          : 'Create your first task to track progress and sprint workflows.'}
                      </div>
                      ${!this.searchQuery.trim() && !AppState.selectedProjectId
                        ? `<button class="btn btn-primary btn-sm" onclick="TaskModal.openCreate()"><i class="fa-solid fa-plus"></i> Create New Task</button>`
                        : ''}
                    </td>
                  </tr>
                ` : tasks.map((t, index) => {
                  const isSelected = this.selectedTaskIds.has(t.id);
                  const parentTask = t.parentId ? AppState.tasks.find(p => p.id === t.parentId) : null;
                  const sprint = t.sprintId ? AppState.sprints.find(s => s.id === t.sprintId) : null;
                  const project = AppState.projects.find(p => p.id === t.projectId);
                  const isOverdue = Utils.isOverdue(t.dueDate, t.status);
                  const isToday = Utils.isDueToday(t.dueDate);

                  let dateDisplay = '—';
                  let dateClass = '';
                  if (t.dueDate) {
                    if (isOverdue) {
                      dateDisplay = `<i class="fa-solid fa-triangle-exclamation"></i> ${Utils.formatDate(t.dueDate)}`;
                      dateClass = 'datagrid-date-overdue';
                    } else if (isToday) {
                      dateDisplay = `<i class="fa-solid fa-calendar-day"></i> Today`;
                      dateClass = 'datagrid-date-today';
                    } else {
                      dateDisplay = Utils.formatDate(t.dueDate);
                    }
                  }

                  return `
                    <tr class="datagrid-row ${isSelected ? 'row-selected' : ''}" data-id="${t.id}" data-index="${index}">
                      <td class="col-chk">
                        <input type="checkbox" class="datagrid-chk chk-task-row" data-id="${t.id}" data-index="${index}" ${isSelected ? 'checked' : ''}>
                      </td>
                      <td class="col-key">
                        <span class="datagrid-key-link" onclick="TaskModal.openDetail('${t.id}')" title="Open task details">
                          ${t.key}
                        </span>
                      </td>
                      <td class="col-type">
                        ${this.getTypeBadgeHTML(t.type)}
                      </td>
                      <td class="col-title">
                        <div class="datagrid-title-container">
                          <!-- Line 1: Main Task Title -->
                          <div class="datagrid-title-line">
                            <span class="datagrid-title-text ${t.status === 'done' ? 'title-done' : ''}" onclick="TaskModal.openDetail('${t.id}')" title="${Utils.escapeHTML(t.title)}">
                              ${Utils.escapeHTML(t.title)}
                            </span>
                          </div>

                          <!-- Line 2: Subtle Balanced Context Badges -->
                          <div class="datagrid-hierarchy-line">
                            ${parentTask ? `
                              <span class="datagrid-meta-badge datagrid-meta-parent" onclick="TaskModal.openDetail('${parentTask.id}')" title="Parent: ${Utils.escapeHTML(parentTask.title)}">
                                <i class="fa-solid fa-arrow-turn-down-right"></i> ${parentTask.key}
                              </span>
                            ` : ''}
                            ${sprint ? `
                              <span class="datagrid-meta-badge datagrid-meta-sprint" title="Sprint: ${Utils.escapeHTML(sprint.name)}">
                                <i class="fa-solid fa-person-running"></i> ${Utils.escapeHTML(sprint.name.split(':')[0])}
                              </span>
                            ` : ''}
                            ${!AppState.selectedProjectId && project ? `
                              <span class="datagrid-meta-badge datagrid-meta-project" title="Project: ${Utils.escapeHTML(project.name)}">
                                <span class="meta-project-dot" style="background: ${project.color || '#1868DB'};"></span>
                                ${Utils.escapeHTML(project.name.length > 16 ? project.name.substring(0, 14) + '...' : project.name)}
                              </span>
                            ` : ''}
                            ${(t.labels && t.labels.length > 0) ? `
                              ${t.labels.slice(0, 2).map(l => `<span class="datagrid-meta-badge datagrid-meta-label">#${Utils.escapeHTML(l)}</span>`).join('')}
                              ${t.labels.length > 2 ? `<span class="datagrid-meta-badge datagrid-meta-label" title="${Utils.escapeHTML(t.labels.slice(2).join(', '))}">+${t.labels.length - 2}</span>` : ''}
                            ` : ''}
                          </div>
                        </div>
                      </td>
                      <td class="col-status">
                        ${this.getStatusBadgeHTML(t.status, t.id)}
                      </td>
                      <td class="col-prio">
                        ${this.getPriorityBadgeHTML(t.priority, t.id)}
                      </td>
                      <td class="col-date">
                        <span class="datagrid-date-badge ${dateClass}">
                          ${dateDisplay}
                        </span>
                      </td>
                      <td class="col-pts">
                        <span class="datagrid-points-pill" title="Story Points">${t.storyPoints || 0}</span>
                      </td>
                      <td class="col-actions">
                        <button type="button" class="datagrid-dropdown-btn datagrid-row-action-menu" data-action="toggle-actions-menu" data-id="${t.id}" title="Task actions" aria-label="Task actions" aria-haspopup="menu" aria-expanded="false">
                          <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Summary Metrics Footer -->
          <div class="datagrid-footer">
            <div class="datagrid-footer-left">
              <div class="datagrid-metric-item">
                <span>Showing:</span>
                <strong>${tasks.length}</strong> of <strong>${allTasks.length}</strong> tasks
              </div>
              <div class="datagrid-metric-item">
                <span>Story Points:</span>
                <strong>${totalPoints}</strong>
              </div>
              <div class="datagrid-metric-item">
                <span>Progress:</span>
                <strong>${donePct}%</strong>
                <div class="datagrid-progress-mini">
                  <div class="datagrid-progress-fill" style="width: ${donePct}%;"></div>
                </div>
              </div>
              ${overdueCount > 0 ? `
                <div class="datagrid-metric-item" style="color: #EF4444;">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <strong>${overdueCount}</strong> overdue
                </div>
              ` : ''}
            </div>

            <div class="datagrid-footer-right">
              ${this.selectedTaskIds.size > 0 ? `
                <div class="datagrid-metric-item" style="color: #0BDA51;">
                  <i class="fa-solid fa-check-double"></i>
                  <strong>${this.selectedTaskIds.size}</strong> selected
                </div>
              ` : ''}
              <div style="font-size: 11px; color: var(--text-muted);">
                <i class="fa-regular fa-keyboard"></i> Shift+Click for range • / to search • Esc to clear
              </div>
            </div>
          </div>
        </div>

        <!-- Floating Bulk Operations Toolbar (Atlassian Design System) -->
        ${this.selectedTaskIds.size > 0 ? `
          <div id="datagrid-bulk-toolbar" class="bulk-operations-bar">
            
            <!-- Selection Counter Pill -->
            <div class="bulk-counter-pill">
              <i class="fa-solid fa-check-double"></i>
              <span><strong>${this.selectedTaskIds.size}</strong> selected</span>
            </div>

            <div class="bulk-divider"></div>

            <!-- 1-Click "Mark Done" Action Button -->
            <button id="btn-bulk-markdone" class="btn btn-sm bulk-btn-markdone" title="Complete all selected tasks with 1 click">
              <i class="fa-solid fa-circle-check"></i> Mark Done
            </button>

            <!-- Bulk Status Selector -->
            <select id="bulk-status-select" class="bulk-select" title="Change Status">
              <option value="">Status...</option>
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="inreview">In Review</option>
              <option value="done">Done</option>
            </select>

            <!-- Bulk Priority Selector -->
            <select id="bulk-priority-select" class="bulk-select" title="Change Priority">
              <option value="">Priority...</option>
              <option value="critical">Critical</option>
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <!-- Bulk Sprint Selector -->
            <select id="bulk-sprint-select" class="bulk-select" title="Assign to Sprint">
              <option value="">Sprint...</option>
              <option value="__backlog__">Backlog Pool</option>
              ${AppState.sprints.map(s => `
                <option value="${s.id}">${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]</option>
              `).join('')}
            </select>

            <div class="bulk-divider"></div>

            <!-- Bulk Duplicate Action -->
            <button id="btn-bulk-duplicate" class="btn btn-secondary btn-sm" title="Duplicate selected tasks">
              <i class="fa-regular fa-copy"></i> Duplicate
            </button>

            <!-- Bulk Delete Action -->
            <button id="btn-bulk-delete" class="btn btn-danger btn-sm" title="Delete selected tasks">
              <i class="fa-regular fa-trash-can"></i> Delete
            </button>

            <!-- Clear / Close Button -->
            <button id="btn-bulk-clear" class="btn btn-ghost btn-sm bulk-btn-clear" title="Clear selection (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>

          </div>
        ` : ''}

      </div>
    `;

    // Indeterminate state for select all checkbox
    const selectAllChk = container.querySelector('#chk-select-all');
    if (selectAllChk) {
      selectAllChk.indeterminate = isSomeSelected;
    }

    this.attachEventListeners(container, tasks);
  },

  attachEventListeners(container, tasks) {
    // 1. Search Box input with debounce
    const searchInput = container.querySelector('#datagrid-search-input');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.searchQuery = e.target.value;
          this.render(container);
        }, 200);
      });
    }

    // Search clear button
    const searchClearBtn = container.querySelector('#datagrid-search-clear');
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render(container);
      });
    }

    // 9. Column Sorting Headers
    container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (this.sortField === field) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortField = field;
          this.sortAsc = true;
        }
        this.render(container);
      });
    });

    // 10. Select All Checkbox
    const selectAllChk = container.querySelector('#chk-select-all');
    if (selectAllChk) {
      selectAllChk.addEventListener('change', (e) => {
        if (e.target.checked) {
          tasks.forEach(t => this.selectedTaskIds.add(t.id));
        } else {
          this.selectedTaskIds.clear();
        }
        this.render(container);
      });
    }

    // 11. Row Checkboxes with Shift+Click Multi-Select Range
    const rowCheckboxes = container.querySelectorAll('.chk-task-row');
    rowCheckboxes.forEach(chk => {
      chk.addEventListener('click', (e) => {
        const index = parseInt(chk.dataset.index, 10);
        const taskId = chk.dataset.id;

        if (e.shiftKey && this.lastClickedIndex !== null) {
          const start = Math.min(this.lastClickedIndex, index);
          const end = Math.max(this.lastClickedIndex, index);
          const targetState = chk.checked;

          for (let i = start; i <= end; i++) {
            if (tasks[i]) {
              if (targetState) {
                this.selectedTaskIds.add(tasks[i].id);
              } else {
                this.selectedTaskIds.delete(tasks[i].id);
              }
            }
          }
        } else {
          if (chk.checked) {
            this.selectedTaskIds.add(taskId);
          } else {
            this.selectedTaskIds.delete(taskId);
          }
        }

        this.lastClickedIndex = index;
        this.render(container);
      });
    });

    // 12. Interactive In-Cell Status Dropdown Trigger
    container.querySelectorAll('.datagrid-dropdown-btn[data-action="toggle-status-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.id;
        const current = btn.dataset.current;
        DataGridDropdown.toggle(btn, 'status', taskId, current);
      });
    });

    // 13. Interactive In-Cell Priority Dropdown Trigger
    container.querySelectorAll('.datagrid-dropdown-btn[data-action="toggle-prio-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.id;
        const current = btn.dataset.current;
        DataGridDropdown.toggle(btn, 'priority', taskId, current);
      });
    });

    // Compact per-row action menu
    container.querySelectorAll('.datagrid-dropdown-btn[data-action="toggle-actions-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        DataGridDropdown.toggle(btn, 'actions', btn.dataset.id);
        btn.setAttribute('aria-expanded', String(btn.classList.contains('dropdown-open')));
      });
    });

    // 14. Floating Bulk Operations Bar Controls
    const bulkToolbar = container.querySelector('#datagrid-bulk-toolbar');
    if (bulkToolbar) {

      // 1-Click Mark Done Button
      const markDoneBtn = bulkToolbar.querySelector('#btn-bulk-markdone');
      if (markDoneBtn) {
        markDoneBtn.addEventListener('click', () => {
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { status: 'done' });
          Toast.success(`Marked ${ids.length} task(s) as Done! 🎉`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Status Select
      const bulkStatus = bulkToolbar.querySelector('#bulk-status-select');
      if (bulkStatus) {
        bulkStatus.addEventListener('change', (e) => {
          const val = e.target.value;
          if (!val) return;
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { status: val });
          Toast.success(`Updated status for ${ids.length} task(s).`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Priority Select
      const bulkPriority = bulkToolbar.querySelector('#bulk-priority-select');
      if (bulkPriority) {
        bulkPriority.addEventListener('change', (e) => {
          const val = e.target.value;
          if (!val) return;
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { priority: val });
          Toast.success(`Updated priority for ${ids.length} task(s).`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Sprint Select
      const bulkSprint = bulkToolbar.querySelector('#bulk-sprint-select');
      if (bulkSprint) {
        bulkSprint.addEventListener('change', (e) => {
          const val = e.target.value;
          if (!val) return;
          const sprintId = val === '__backlog__' ? null : val;
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkUpdateTasks(ids, { sprintId });
          Toast.success(`Assigned ${ids.length} task(s) to ${sprintId ? 'sprint' : 'backlog pool'}.`);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Duplicate Button
      const bulkDupBtn = bulkToolbar.querySelector('#btn-bulk-duplicate');
      if (bulkDupBtn) {
        bulkDupBtn.addEventListener('click', () => {
          const ids = Array.from(this.selectedTaskIds);
          AppState.bulkDuplicateTasks(ids);
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }

      // Bulk Delete Button
      const bulkDelBtn = bulkToolbar.querySelector('#btn-bulk-delete');
      if (bulkDelBtn) {
        bulkDelBtn.addEventListener('click', () => {
          const count = this.selectedTaskIds.size;
          Modal.confirm(
            'Bulk Delete Tasks',
            `Are you sure you want to permanently delete <strong>${count}</strong> selected task(s)? This will also delete any child subtasks.`,
            () => {
              const ids = Array.from(this.selectedTaskIds);
              AppState.bulkDeleteTasks(ids, true);
              this.selectedTaskIds.clear();
              Toast.warning(`Deleted ${count} task(s).`);
              this.render(container);
            }
          );
        });
      }

      // Bulk Clear Selection Button
      const bulkClearBtn = bulkToolbar.querySelector('#btn-bulk-clear');
      if (bulkClearBtn) {
        bulkClearBtn.addEventListener('click', () => {
          this.selectedTaskIds.clear();
          this.render(container);
        });
      }
    }

    // 15. Top Action Buttons
    const createBtn = container.querySelector('#btn-list-create');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());

    // 16. Keyboard listener for Escape key to clear selection & '/' for search
    if (!this._hasBoundKeydown) {
      this._hasBoundKeydown = true;
      document.addEventListener('keydown', (e) => {
        if (AppState.currentView !== 'list') return;

        if (e.key === 'Escape' && this.selectedTaskIds.size > 0) {
          this.selectedTaskIds.clear();
          const viewContainer = document.getElementById('view-container');
          if (viewContainer) this.render(viewContainer);
        } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const s = document.getElementById('datagrid-search-input');
          if (s) {
            s.focus();
            s.select();
          }
        }
      });
    }

    if (typeof DropdownUI !== 'undefined') {
      DropdownUI.initAll(container);
    }
  }
};
