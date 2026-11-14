/**
 * TaskForge — Sprint Planning & Iteration Workspace
 *
 * Scenario-driven agile workspace aligned with TaskForge's ADS design tokens:
 * - Adaptive Page Header + contextual primary CTAs (zero duplicate chrome)
 * - Active Sprint Executive Card: compact telemetry KPI bar, interactive status
 *   filter pills, inline work-item composer, Status Swimlanes / Project Matrix / Kanban Board
 * - Scenario-aware Planning Launchpad when no sprint is active
 * - Dedicated Planning & Backlog Workspace (Upcoming Sprints <-> Draggable Backlog Pool)
 *   plus tabbed Completed History & Retrospective Reports
 */

const BacklogView = {
  activeStatusFilter: 'all', // 'all' | 'todo' | 'inprogress' | 'inreview' | 'done'
  activeViewMode: 'lanes',   // 'lanes' | 'project' | 'board'
  lowerTab: 'planning',      // 'planning' | 'history'
  searchQuery: '',

  _getTypeIcon(type) {
    return {
      bug: 'fa-circle-dot',
      story: 'fa-bookmark',
      epic: 'fa-bolt',
      subtask: 'fa-network-wired'
    }[type] || 'fa-square-check';
  },

  _getPriorityIcon(priority) {
    return {
      critical: 'fa-solid fa-angles-up',
      highest: 'fa-solid fa-angles-up',
      high: 'fa-solid fa-angle-up',
      medium: 'fa-solid fa-equals',
      low: 'fa-solid fa-angle-down',
      lowest: 'fa-solid fa-angles-down'
    }[priority] || 'fa-solid fa-equals';
  },

  _getViewData() {
    const tasks = AppState.tasks || [];
    const selectedProjectId = AppState.selectedProjectId;
    const selectedProject = selectedProjectId
      ? (AppState.projects || []).find(p => p.id === selectedProjectId) || null
      : null;

    const projectSprints = selectedProjectId
      ? AppState.sprints.filter(s => !s.projectId || s.projectId === selectedProjectId)
      : AppState.sprints;

    let filteredTasks = selectedProjectId ? tasks.filter(t => t.projectId === selectedProjectId) : tasks;
    if (AppState.activeFilters && AppState.activeFilters.epicId) {
      filteredTasks = filteredTasks.filter(t => t.epicId === AppState.activeFilters.epicId);
    }

    const activeSprint = projectSprints.find(s => s.status === 'active') || null;
    const plannedSprints = projectSprints.filter(s => s.status === 'planned');
    const completedSprints = [...projectSprints.filter(s => s.status === 'completed')].reverse();

    const activeTasks = activeSprint ? filteredTasks.filter(t => t.sprintId === activeSprint.id) : [];
    const backlogTasks = filteredTasks
      .filter(t => !t.sprintId && t.status !== 'done' && t.status !== 'cancelled')
      .sort((a, b) => this._sortByItemId(a, b));

    const plannedTotalItems = plannedSprints.reduce(
      (sum, sp) => sum + filteredTasks.filter(t => t.sprintId === sp.id).length,
      0
    );
    const plannedTotalPts = plannedSprints.reduce((sum, sp) => {
      return sum + filteredTasks.filter(t => t.sprintId === sp.id).reduce((pts, t) => pts + (Number(t.storyPoints) || 0), 0);
    }, 0);

    const completedStatsList = completedSprints.map(s => this._analyzeCompletedSprint(s, filteredTasks.filter(t => t.sprintId === s.id)));
    const avgDeliveryPct = completedStatsList.length
      ? Math.round(completedStatsList.reduce((sum, st) => sum + st.completionPct, 0) / completedStatsList.length)
      : 0;
    const totalCompletedPts = completedStatsList.reduce((sum, st) => sum + st.completedPoints, 0);

    return {
      selectedProjectId,
      selectedProject,
      projectSprints,
      filteredTasks,
      activeSprint,
      plannedSprints,
      completedSprints,
      activeTasks,
      backlogTasks,
      plannedTotalItems,
      plannedTotalPts,
      avgDeliveryPct,
      totalCompletedPts
    };
  },

  attachListeners(container) {
    const createSprintBtn = container.querySelector('#btn-create-sprint');
    if (createSprintBtn) createSprintBtn.addEventListener('click', () => this.openCreateSprintModal());

    const stackSprintsBtn = container.querySelector('#btn-stack-sprints');
    if (stackSprintsBtn) stackSprintsBtn.addEventListener('click', () => this.openStackSprintsModal());

    const toggleAutopilotBtn = container.querySelector('#btn-toggle-sprint-autopilot');
    if (toggleAutopilotBtn) {
      toggleAutopilotBtn.addEventListener('click', () => {
        const currentEnabled = !(AppState.settings && AppState.settings.autoSprintSchedule === false);
        const nextEnabled = !currentEnabled;
        AppState.settings = { ...(AppState.settings || {}), autoSprintSchedule: nextEnabled };
        StorageService.set(StorageService.KEYS.SETTINGS, AppState.settings);
        Toast.info(`Sprint Auto-Pilot ${nextEnabled ? 'enabled (auto open, close & rollover)' : 'paused'}`);
        if (nextEnabled && typeof Automations !== 'undefined' && typeof Automations.checkSprintSchedule === 'function') {
          Automations.checkSprintSchedule();
        }
        this.render(container);
      });
    }

    const resetScopeBtn = container.querySelector('#sp-reset-project-scope');
    if (resetScopeBtn) {
      resetScopeBtn.addEventListener('click', () => {
        AppState.selectedProjectId = null;
        if (typeof Sidebar !== 'undefined' && Sidebar.syncProjectPicker) Sidebar.syncProjectPicker();
        if (typeof Router !== 'undefined' && Router.updateTopbarProjectPicker) Router.updateTopbarProjectPicker();
        AppState.emit('projects:changed', { action: 'select', projectId: null });
        this.render(container);
      });
    }

    // Lower workspace tab switcher ('planning' | 'history')
    container.querySelectorAll('[data-sp-lower-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.lowerTab = btn.dataset.spLowerTab || 'planning';
        this.render(container);
      });
    });

    // Live search input (partial DOM update preserves focus & cursor position)
    const searchInput = container.querySelector('#sp-global-search');
    const clearSearchBtn = container.querySelector('#sp-clear-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value || '';
        if (clearSearchBtn) clearSearchBtn.classList.toggle('is-hidden', !this.searchQuery);
        this._refreshFilteredRegions(container);
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        clearSearchBtn.classList.add('is-hidden');
        this._refreshFilteredRegions(container);
      });
    }

    // Active sprint status filter pills
    container.querySelectorAll('[data-active-status-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.activeStatusFilter || 'all';
        this.activeStatusFilter = (this.activeStatusFilter === target && target !== 'all') ? 'all' : target;
        this.render(container);
      });
    });

    // Active sprint view mode switcher ('lanes' | 'project' | 'board')
    container.querySelectorAll('[data-active-view-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeViewMode = btn.dataset.activeViewMode || 'lanes';
        this.render(container);
      });
    });

    // Inline Quick-Add Work Item Form inside Active Sprint
    const quickForm = container.querySelector('#sp-active-quick-form');
    if (quickForm) {
      quickForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleInput = quickForm.querySelector('#sp-quick-title');
        const projSelect = quickForm.querySelector('#sp-quick-project');
        const prioSelect = quickForm.querySelector('#sp-quick-priority');
        const ptsSelect = quickForm.querySelector('#sp-quick-points');
        const sprintId = quickForm.dataset.sprintId;

        const title = titleInput ? titleInput.value.trim() : '';
        if (!title || !sprintId) return;

        const activeSprint = AppState.sprints.find(s => s.id === sprintId);
        const projectId = (projSelect && projSelect.value)
          || (activeSprint && activeSprint.projectId)
          || AppState.selectedProjectId
          || (AppState.projects[0] && AppState.projects[0].id)
          || 'proj_web';
        const priority = (prioSelect && prioSelect.value) || 'medium';
        const storyPoints = ptsSelect ? Number(ptsSelect.value) || 0 : 0;

        AppState.createTask({
          title,
          projectId,
          sprintId,
          priority,
          storyPoints,
          status: 'todo',
          type: 'task'
        });

        Toast.success('Added work item to active sprint');
      });
    }

    // Inline Quick-Add Work Item Form inside Backlog Pool
    const backlogForm = container.querySelector('#sp-backlog-quick-form');
    if (backlogForm) {
      backlogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleInput = backlogForm.querySelector('#sp-backlog-quick-title');
        const prioSelect = backlogForm.querySelector('#sp-backlog-quick-priority');
        const ptsSelect = backlogForm.querySelector('#sp-backlog-quick-points');

        const title = titleInput ? titleInput.value.trim() : '';
        if (!title) return;

        const projectId = AppState.selectedProjectId
          || (AppState.projects[0] && AppState.projects[0].id)
          || 'proj_web';

        AppState.createTask({
          title,
          projectId,
          sprintId: null,
          priority: (prioSelect && prioSelect.value) || 'medium',
          storyPoints: ptsSelect ? Number(ptsSelect.value) || 0 : 0,
          status: 'backlog',
          type: 'task'
        });

        Toast.success('Added item to backlog');
      });
    }

    this._bindDynamicInteractions(container);

    // Delegated page-level actions (StatusControl, task detail, toggle done, context menu, modals)
    const pageRoot = container.querySelector('.backlog-page');
    if (pageRoot && !pageRoot.dataset.spRootBound) {
      pageRoot.dataset.spRootBound = '1';

      pageRoot.addEventListener('click', (e) => {
        const statusFilterReset = e.target.closest('[data-reset-status-filter]');
        if (statusFilterReset && pageRoot.contains(statusFilterReset)) {
          this.activeStatusFilter = 'all';
          this.render(container);
          return;
        }

        const addExistingBtn = e.target.closest('.btn-add-existing');
        if (addExistingBtn && pageRoot.contains(addExistingBtn)) {
          e.stopPropagation();
          this.openAddExistingTasksModal(addExistingBtn.dataset.sprintId);
          return;
        }

        const quickAssignBtn = e.target.closest('[data-quick-assign-task]');
        if (quickAssignBtn && pageRoot.contains(quickAssignBtn)) {
          e.stopPropagation();
          const taskId = quickAssignBtn.dataset.quickAssignTask;
          const targetSprintId = quickAssignBtn.dataset.targetSprintId;
          const task = AppState.tasks.find(t => t.id === taskId);
          const sprint = AppState.sprints.find(s => s.id === targetSprintId);
          if (task && sprint) {
            const updates = { sprintId: targetSprintId };
            if (task.status === 'backlog') updates.status = 'todo';
            AppState.updateTask(taskId, updates);
            Toast.success(`Assigned ${task.key} to ${sprint.name}`);
          }
          return;
        }

        const removeSprintBtn = e.target.closest('.btn-remove-from-sprint');
        if (removeSprintBtn && pageRoot.contains(removeSprintBtn)) {
          e.stopPropagation();
          const taskId = removeSprintBtn.dataset.taskId;
          AppState.updateTask(taskId, { sprintId: null });
          Toast.info('Moved work item to backlog');
          return;
        }

        const openSprintPopup = e.target.closest('[data-open-sprint-popup]');
        if (openSprintPopup && pageRoot.contains(openSprintPopup)) {
          if (!e.target.closest('button:not([data-open-sprint-popup-btn])')) {
            const sprintId = openSprintPopup.dataset.openSprintPopup;
            if (sprintId) this.openSprintDetailModal(sprintId);
            return;
          }
        }

        const openCompletedPopup = e.target.closest('[data-open-completed-popup]');
        if (openCompletedPopup && pageRoot.contains(openCompletedPopup)) {
          if (!e.target.closest('button:not([data-open-completed-popup-btn])')) {
            const sprintId = openCompletedPopup.dataset.openCompletedPopup;
            if (sprintId) this.openSprintReportModal(sprintId);
            return;
          }
        }

        const menuBtn = e.target.closest('[data-status-action="menu"]');
        if (menuBtn && pageRoot.contains(menuBtn)) {
          e.stopPropagation();
          StatusControl.openMenu(menuBtn, menuBtn.dataset.taskId);
          return;
        }

        const openCompletedEl = e.target.closest('[data-completed-task-open]');
        if (openCompletedEl && pageRoot.contains(openCompletedEl)) {
          e.stopPropagation();
          TaskModal.openDetail(openCompletedEl.dataset.completedTaskOpen);
          return;
        }

        const actionEl = e.target.closest('[data-sprint-action]');
        if (!actionEl || !pageRoot.contains(actionEl)) return;
        const card = actionEl.closest('[data-task-id]');
        const taskId = card ? card.dataset.taskId : null;
        if (!taskId) return;
        e.stopPropagation();

        switch (actionEl.dataset.sprintAction) {
          case 'open':
            TaskModal.openDetail(taskId);
            break;
          case 'toggle-done':
            StatusControl.toggleDone(taskId);
            break;
          case 'advance':
            StatusControl.advance(taskId);
            break;
          case 'set-status':
            StatusControl.setStatus(taskId, actionEl.dataset.status);
            break;
        }
      });

      pageRoot.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.backlog-item-row');
        if (!card || typeof ContextMenu === 'undefined') return;
        const task = AppState.tasks.find(t => t.id === card.dataset.taskId);
        if (!task) return;
        e.preventDefault();
        ContextMenu.open(e.clientX, e.clientY, task);
      });
    }
  },

  _refreshFilteredRegions(container) {
    const data = this._getViewData();

    const canvasSlot = container.querySelector('[data-sp-refresh="active-canvas"]');
    if (canvasSlot && data.activeSprint) {
      canvasSlot.innerHTML = this._renderActiveCanvasHTML(data.activeSprint, data.activeTasks);
    }

    const upcomingSlot = container.querySelector('[data-sp-refresh="upcoming"]');
    if (upcomingSlot) {
      upcomingSlot.innerHTML = this._renderUpcomingListHTML(data.plannedSprints, data.filteredTasks);
    }

    const backlogSlot = container.querySelector('[data-sp-refresh="backlog"]');
    if (backlogSlot) {
      const quickTargetSprint = data.activeSprint || data.plannedSprints[0] || null;
      backlogSlot.innerHTML = this._renderBacklogPoolList(data.backlogTasks, quickTargetSprint);
    }

    const historySlot = container.querySelector('[data-sp-refresh="history"]');
    if (historySlot) {
      historySlot.innerHTML = this._renderCompletedHistoryHTML(data.completedSprints, data.filteredTasks);
    }

    this._bindDynamicInteractions(container);
  },

  _bindDynamicInteractions(container) {
    // Draggable work items (Active Sprint + Backlog Pool)
    container.querySelectorAll('.backlog-item-row').forEach(row => {
      if (row.dataset.spDragBound) return;
      row.dataset.spDragBound = '1';

      row.addEventListener('dragstart', (e) => {
        const taskId = row.dataset.taskId;
        row.classList.add('dragging');
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        container.querySelectorAll('.sprint-drop-zone, .sp-board-col-body, .sp-swimlane-body').forEach(z => {
          z.classList.remove('drag-over');
        });
      });
    });

    // Status Drop Zones (Board Columns & Swimlanes inside Active Sprint)
    container.querySelectorAll('[data-status-col]').forEach(col => {
      if (col.dataset.spDropBound) return;
      col.dataset.spDropBound = '1';

      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        col.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        const targetStatus = col.dataset.statusCol;
        const targetSprintId = col.dataset.sprintId;
        if (!taskId || !targetStatus) return;

        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task) return;

        const updates = {};
        if (targetSprintId && task.sprintId !== targetSprintId) {
          updates.sprintId = targetSprintId;
        }
        if (task.status !== targetStatus) {
          updates.status = targetStatus;
        }
        if (Object.keys(updates).length > 0) {
          AppState.updateTask(taskId, updates);
        }
      });
    });

    // Sprint & Backlog Drop Zones (empty string data-sprint-id unassigns to backlog)
    container.querySelectorAll('.sprint-drop-zone').forEach(zone => {
      if (zone.dataset.spDropBound) return;
      zone.dataset.spDropBound = '1';

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
        }
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const targetSprintId = zone.dataset.sprintId || null;
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task || (task.sprintId || null) === targetSprintId) return;

        const updates = { sprintId: targetSprintId };
        if (targetSprintId && task.status === 'backlog') {
          updates.status = 'todo';
        }
        AppState.updateTask(taskId, updates);
        const targetSprint = targetSprintId ? AppState.sprints.find(s => s.id === targetSprintId) : null;
        Toast.success(`Moved ${task.key} to ${targetSprint ? targetSprint.name : 'backlog'}`);
      });
    });
  },

  _sortByItemId(a, b) {
    const keyA = a.key || a.id || '';
    const keyB = b.key || b.id || '';
    const cmp = keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
  },

  _groupTasksByProject(tasks) {
    const groups = [];
    const projectMap = new Map();

    (AppState.projects || []).forEach(p => {
      projectMap.set(p.id, { project: p, tasks: [] });
    });

    const noProjectGroup = {
      project: { id: null, name: 'Unassigned Project', key: '', color: '#6B6E76' },
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
        group.tasks.sort((a, b) => this._sortByItemId(a, b));
        groups.push(group);
      }
    });

    if (noProjectGroup.tasks.length > 0) {
      noProjectGroup.tasks.sort((a, b) => this._sortByItemId(a, b));
      groups.push(noProjectGroup);
    }

    return groups;
  },

  _matchesQuery(task) {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (!q) return true;
    return (
      (task.key && task.key.toLowerCase().includes(q)) ||
      (task.title && task.title.toLowerCase().includes(q))
    );
  },

  // ── Add Existing Tasks Modal ──
  openAddExistingTasksModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const availableTasks = AppState.tasks.filter(t => t.sprintId !== sprintId);

    const modalBody = `
      <div id="add-existing-tasks-container">
        <div class="sp-picker-filters">
          <div class="sp-picker-search-wrap">
            <label for="add-task-search" class="sr-only">Search work items</label>
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="add-task-search" class="form-input" placeholder="Search by title or key...">
          </div>
          <select id="add-task-filter-project" class="form-select" aria-label="Filter by project">
            <option value="">All projects</option>
            ${AppState.projects.map(p => `<option value="${p.id}">${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
          </select>
          <select id="add-task-filter-status" class="form-select" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
          </select>
          <select id="add-task-filter-assignment" class="form-select" aria-label="Filter by sprint assignment">
            <option value="">All work items</option>
            <option value="unassigned" selected>Unassigned (Backlog)</option>
            <option value="other">In other sprints</option>
          </select>
        </div>

        <div class="sp-picker-Subbar">
          <label class="sp-picker-select-all">
            <input type="checkbox" id="add-task-select-all"> Select all visible
          </label>
          <span id="add-task-selected-count" class="sp-picker-count">0 selected</span>
        </div>

        <div id="add-task-list" class="sp-picker-list">
          ${this._renderTaskPickerList(availableTasks, sprintId)}
        </div>
      </div>
    `;

    Modal.open({
      title: `Commit Backlog Items to ${Utils.escapeHTML(sprint.name)}`,
      body: modalBody,
      size: 'lg',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Commit Selected Items',
          class: 'btn-primary',
          id: 'btn-confirm-add-tasks',
          onClick: () => {
            const checked = document.querySelectorAll('.add-task-checkbox:checked');
            if (checked.length === 0) {
              Toast.warning('Select at least one work item.');
              return;
            }
            const ids = Array.from(checked).map(cb => cb.dataset.taskId);
            AppState.bulkUpdateTasks(ids, { sprintId });
            Modal.close();
            Toast.success(`Committed ${ids.length} item(s) to ${sprint.name}`);
          }
        }
      ]
    });

    setTimeout(() => {
      this._attachTaskPickerListeners(sprintId);
    }, 50);
  },

  _renderTaskPickerList(tasks) {
    if (tasks.length === 0) {
      return `
        <div class="sp-empty-well">
          <i class="fa-solid fa-inbox"></i>
          <span>No work items match your current filters.</span>
        </div>
      `;
    }

    const groups = this._groupTasksByProject(tasks);

    return groups.map(group => {
      const p = group.project;
      const pColor = p.color || '#388bfd';
      return `
        <div class="add-task-project-group">
          <div class="add-task-project-header">
            <div class="add-task-project-header-left">
              <span class="add-task-project-dot" style="background: ${pColor};"></span>
              <span class="add-task-project-name">${Utils.escapeHTML(p.name)}</span>
              ${p.key ? `<span class="add-task-project-key">${Utils.escapeHTML(p.key)}</span>` : ''}
            </div>
            <span class="add-task-project-count">${group.tasks.length} item${group.tasks.length === 1 ? '' : 's'}</span>
          </div>
          <div class="add-task-project-items">
            ${group.tasks.map(task => this._renderTaskPickerRow(task)).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  _renderTaskPickerRow(task) {
    let typeIcon = 'fa-square-check';
    if (task.type === 'bug') typeIcon = 'fa-circle-dot';
    if (task.type === 'story') typeIcon = 'fa-bookmark';
    if (task.type === 'epic') typeIcon = 'fa-bolt';
    if (task.type === 'subtask') typeIcon = 'fa-network-wired';

    const currentSprint = task.sprintId ? AppState.sprints.find(s => s.id === task.sprintId) : null;
    const sprintTag = currentSprint
      ? `<span class="sp-chip">${Utils.escapeHTML(currentSprint.name)}</span>`
      : `<span class="sp-pill tone-neutral">Backlog</span>`;

    return `
      <label class="add-task-row" data-task-id="${task.id}">
        <input type="checkbox" class="add-task-checkbox" data-task-id="${task.id}">
        <span class="type-icon type-${task.type}"><i class="fa-solid ${typeIcon}"></i></span>
        <span class="sp-mono-key">${Utils.escapeHTML(task.key)}</span>
        <span class="add-task-row-title">${Utils.escapeHTML(task.title)}</span>
        ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints} pts</span>` : ''}
        ${sprintTag}
      </label>
    `;
  },

  _attachTaskPickerListeners(targetSprintId) {
    const searchInput = document.getElementById('add-task-search');
    const statusFilter = document.getElementById('add-task-filter-status');
    const assignmentFilter = document.getElementById('add-task-filter-assignment');
    const projectFilter = document.getElementById('add-task-filter-project');
    const selectAllCb = document.getElementById('add-task-select-all');
    const taskList = document.getElementById('add-task-list');

    if (!searchInput || !taskList) return;

    const updateList = () => {
      const query = searchInput.value.toLowerCase().trim();
      const statusVal = statusFilter.value;
      const assignVal = assignmentFilter.value;
      const projectVal = projectFilter ? projectFilter.value : '';

      let tasks = AppState.tasks.filter(t => t.sprintId !== targetSprintId);

      if (projectVal) tasks = tasks.filter(t => t.projectId === projectVal);
      if (query) {
        tasks = tasks.filter(t =>
          (t.title && t.title.toLowerCase().includes(query)) ||
          (t.key && t.key.toLowerCase().includes(query))
        );
      }
      if (statusVal) tasks = tasks.filter(t => t.status === statusVal);
      if (assignVal === 'unassigned') {
        tasks = tasks.filter(t => !t.sprintId);
      } else if (assignVal === 'other') {
        tasks = tasks.filter(t => t.sprintId && t.sprintId !== targetSprintId);
      }

      taskList.innerHTML = this._renderTaskPickerList(tasks, targetSprintId);
      if (selectAllCb) selectAllCb.checked = false;

      this._updateSelectedCount();
      taskList.querySelectorAll('.add-task-checkbox').forEach(cb => {
        cb.addEventListener('change', () => this._updateSelectedCount());
      });
    };

    searchInput.addEventListener('input', updateList);
    statusFilter.addEventListener('change', updateList);
    assignmentFilter.addEventListener('change', updateList);
    if (projectFilter) projectFilter.addEventListener('change', updateList);

    if (selectAllCb) {
      selectAllCb.addEventListener('change', () => {
        taskList.querySelectorAll('.add-task-checkbox').forEach(cb => {
          cb.checked = selectAllCb.checked;
        });
        this._updateSelectedCount();
      });
    }

    updateList();
  },

  _updateSelectedCount() {
    const count = document.querySelectorAll('.add-task-checkbox:checked').length;
    const countEl = document.getElementById('add-task-selected-count');
    if (countEl) {
      countEl.textContent = `${count} selected`;
    }
  },

  startSprint(sprintId) {
    AppState.startSprint(sprintId);
  },

  completeSprint(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const sprintTasks = AppState.tasks.filter(t => t.sprintId === sprintId);
    const completed = sprintTasks.filter(t => t.status === 'done');
    const incomplete = sprintTasks.filter(t => t.status !== 'done');
    const nextScheduled = AppState.getNextScheduledSprint(sprintId);

    // If NO upcoming sprint is scheduled, open the warning popup modal!
    if (!nextScheduled) {
      this.openNoNextSprintWarningModal(sprintId, { isAutoExpired: false });
      return;
    }

    const plannedSprints = AppState.sprints
      .filter(s => s.status === 'planned' && s.id !== sprintId)
      .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

    const donePts = completed.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
    const openPts = incomplete.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);

    const bodyHTML = `
      <div class="complete-sprint-modal-body">
        <p class="sp-modal-intro">
          Review the cycle delivery summary for <strong>${Utils.escapeHTML(sprint.name)}</strong> before closing this iteration.
        </p>
        <div class="complete-sprint-summary-grid">
          <div class="complete-sprint-stat is-success">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-circle-check"></i> Delivered Items</span>
            <strong>${completed.length} <small>item${completed.length === 1 ? '' : 's'} · ${donePts} pts</small></strong>
          </div>
          <div class="complete-sprint-stat ${incomplete.length ? 'is-warning' : ''}">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-clock-rotate-left"></i> Pending Auto-Rollover</span>
            <strong>${incomplete.length} <small>item${incomplete.length === 1 ? '' : 's'} · ${openPts} pts</small></strong>
          </div>
        </div>

        ${incomplete.length > 0 ? `
          <div class="sp-autorollover-banner">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
            <div>
              <strong>Automatic Pending Task Rollover</strong>
              <span>All <strong>${incomplete.length}</strong> pending task${incomplete.length === 1 ? '' : 's'} will automatically move into the next scheduled sprint (<strong>${Utils.escapeHTML(nextScheduled.name)}</strong>).</span>
            </div>
          </div>
          <div class="form-group" style="margin-top: 0.75rem;">
            <label class="form-label" for="complete-sprint-move-target">Destination Sprint for Pending Tasks</label>
            <select id="complete-sprint-move-target" class="form-select">
              ${plannedSprints.map(ps => `<option value="${Utils.escapeHTML(ps.id)}" ${ps.id === nextScheduled.id ? 'selected' : ''}>${Utils.escapeHTML(ps.name)} (${Utils.formatDate(ps.startDate)} → ${Utils.formatDate(ps.endDate)})</option>`).join('')}
              <option value="__backlog__">Backlog Pool (Unassigned)</option>
            </select>
          </div>
        ` : `
          <div class="sp-autorollover-banner is-clean">
            <i class="fa-solid fa-trophy"></i>
            <div>
              <strong>100% Sprint Completion</strong>
              <span>All committed tasks are done! Next scheduled sprint: <strong>${Utils.escapeHTML(nextScheduled.name)}</strong>.</span>
            </div>
          </div>
        `}

        <label class="sp-checkbox-row" style="margin-top: 0.75rem;">
  <input type="checkbox" id="complete-sprint-auto-start-next" checked>
    <span>Automatically open <strong>${Utils.escapeHTML(nextScheduled.name)}</strong> upon completing this sprint</span>
  </label>
      </div>
  `;

    Modal.open({
      title: `Complete Cycle: ${Utils.escapeHTML(sprint.name)} `,
      body: bodyHTML,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: incomplete.length > 0 ? `Complete & Move Pending to ${nextScheduled.name} ` : 'Complete Cycle',
          class: 'btn-primary',
          onClick: () => {
            const selectEl = document.getElementById('complete-sprint-move-target');
            const autoStartCb = document.getElementById('complete-sprint-auto-start-next');
            let targetId = nextScheduled.id;
            if (selectEl) {
              targetId = selectEl.value === '__backlog__' ? null : selectEl.value;
            }
            AppState.completeSprint(sprintId, targetId, {
              forceActivateNext: autoStartCb ? autoStartCb.checked : false
            });
            Modal.close();
          }
        }
      ]
    });
  },

  /**
   * Warning Popup Modal displayed when completing a sprint (manually or via time-based auto-close)
   * when NO upcoming sprint is scheduled to receive pending tasks.
   */
  openNoNextSprintWarningModal(sprintId, options = {}) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const esc = Utils.escapeHTML;
    const isAutoExpired = Boolean(options.isAutoExpired);
    const sprintTasks = AppState.tasks.filter(t => t.sprintId === sprintId);
    const completed = sprintTasks.filter(t => t.status === 'done');
    const incomplete = sprintTasks.filter(t => t.status !== 'done');
    const donePts = completed.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
    const openPts = incomplete.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);

    const suggestedNextNum = AppState.sprints.length + 1;
    const suggestedName = `Sprint ${suggestedNextNum} `;
    const previewPending = incomplete.slice(0, 4);

    const bodyHTML = `
  <div class="sp-no-sprint-warning-modal">
        <div class="sp-warning-popup-banner">
          <div class="sp-warning-popup-icon">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="sp-warning-popup-copy">
            <strong>${isAutoExpired ? `Time Window Elapsed for "${esc(sprint.name)}" — No Next Sprint Scheduled!` : `No Upcoming Sprint Scheduled After "${esc(sprint.name)}"!`}</strong>
            <p>
              ${incomplete.length > 0
        ? `There ${incomplete.length === 1 ? 'is' : 'are'} <strong>${incomplete.length} pending task${incomplete.length === 1 ? '' : 's'} (${openPts} pts)</strong> that need to roll over, but no upcoming sprint is scheduled in the pipeline.`
        : `This sprint has ${completed.length} completed item${completed.length === 1 ? '' : 's'} (${donePts} pts), and there is no upcoming sprint scheduled in the pipeline.`}
            </p>
          </div>
        </div>

        <div class="complete-sprint-summary-grid" style="margin-bottom: 0.85rem;">
          <div class="complete-sprint-stat is-success">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-circle-check"></i> Completed</span>
            <strong>${completed.length} <small>item${completed.length === 1 ? '' : 's'} · ${donePts} pts</small></strong>
          </div>
          <div class="complete-sprint-stat is-warning">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-triangle-exclamation"></i> Pending Unscheduled</span>
            <strong>${incomplete.length} <small>item${incomplete.length === 1 ? '' : 's'} · ${openPts} pts</small></strong>
          </div>
        </div>

        ${previewPending.length > 0 ? `
          <div class="sp-warn-pending-box">
            <span class="sp-warn-pending-title">Pending tasks awaiting next sprint destination:</span>
            <div class="sp-warn-pending-list">
              ${previewPending.map(t => `
                <div class="sp-warn-pending-item">
                  <span class="sp-mono-key">${esc(t.key)}</span>
                  <span class="sp-warn-pending-item-title">${esc(t.title)}</span>
                  ${t.storyPoints ? `<span class="sp-pts-badge">${t.storyPoints} pts</span>` : ''}
                </div>
              `).join('')}
              ${incomplete.length > previewPending.length ? `<div class="sp-warn-pending-more">+${incomplete.length - previewPending.length} more pending task(s)</div>` : ''}
            </div>
          </div>
        ` : ''
      }

<div class="sp-quick-next-creator">
  <div class="sp-quick-next-head">
    <i class="fa-solid fa-bolt"></i>
    <span>Quick-Schedule Next Sprint & Auto-Transfer Pending Tasks</span>
  </div>
  <div class="form-row">
    <div class="form-group" style="flex: 2;">
      <label class="form-label" for="warn-next-sprint-name">Next Sprint Custom Name</label>
      <input type="text" id="warn-next-sprint-name" class="form-input" value="${esc(suggestedName)}" placeholder="e.g. Sprint ${suggestedNextNum} — Core Delivery">
    </div>
    <div class="form-group" style="flex: 1;">
      <label class="form-label" for="warn-next-sprint-days">Interval (Days)</label>
      <input type="number" id="warn-next-sprint-days" class="form-input" value="14" min="1" max="365">
    </div>
  </div>
  <label class="sp-checkbox-row">
    <input type="checkbox" id="warn-start-immediately" checked>
      <span>Activate this new sprint immediately & move all ${incomplete.length} pending task${incomplete.length === 1 ? '' : 's'} into it</span>
  </label>
</div>
      </div>
  `;

    Modal.open({
      title: 'Warning: No Scheduled Next Sprint',
      body: bodyHTML,
      size: 'md',
      footerButtons: [
        {
          text: 'Complete to Backlog',
          class: 'btn-ghost is-danger',
          onClick: () => {
            AppState.completeSprint(sprintId, null);
            Modal.close();
          }
        },
        {
          text: 'Stack Multiple Sprints...',
          class: 'btn-secondary',
          onClick: () => {
            Modal.close();
            this.openStackSprintsModal({ completeSprintIdAfterStack: sprintId });
          }
        },
        {
          text: 'Create Next Sprint & Move Pending',
          class: 'btn-primary',
          onClick: () => {
            const nameInput = document.getElementById('warn-next-sprint-name');
            const daysInput = document.getElementById('warn-next-sprint-days');
            const startNowCb = document.getElementById('warn-start-immediately');

            const nextName = (nameInput && nameInput.value.trim()) || suggestedName;
            const intervalDays = Math.max(1, Number(daysInput && daysInput.value) || 14);
            const startNow = startNowCb ? startNowCb.checked : true;

            const sDate = new Date();
            const eDate = new Date(sDate.getTime() + intervalDays * 86400000);

            const createdNext = AppState.createSprint({
              name: nextName,
              projectId: sprint.projectId || null,
              goal: '',
              startDate: sDate.toISOString(),
              endDate: eDate.toISOString(),
              intervalDays,
              autoSchedule: true,
              status: 'planned'
            });

            AppState.completeSprint(sprintId, createdNext.id, {
              forceActivateNext: startNow
            });
            Modal.close();
          }
        }
      ]
    });
  },

  /**
   * Stack Multiple Sprints Modal:
   * Allows stacking N sprints back-to-back in a constant time interval with custom names & goals for each.
   */
  openStackSprintsModal(options = {}) {
    const esc = Utils.escapeHTML;
    const defaultProj = AppState.selectedProjectId || '__all_projects__';
    const completeSprintIdAfterStack = options.completeSprintIdAfterStack || null;

    // Determine smart anchor start date: day after the latest planned or active sprint endDate, or today
    let anchorDate = new Date();
    const activeAndPlanned = (AppState.sprints || [])
      .filter(s => (s.status === 'planned' || s.status === 'active') && s.id !== completeSprintIdAfterStack && s.endDate);
    if (activeAndPlanned.length > 0) {
      const maxEndMs = Math.max(...activeAndPlanned.map(s => new Date(s.endDate).getTime()).filter(n => !isNaN(n)));
      if (maxEndMs > Date.now()) {
        anchorDate = new Date(maxEndMs + 86400000);
      }
    }

    const baseNum = (AppState.sprints || []).length + 1;
    let stackItems = [
      { name: `Sprint ${baseNum} — Foundation & Architecture`, goal: 'Core infrastructure and high-priority deliverables' },
      { name: `Sprint ${baseNum + 1} — Feature Execution`, goal: 'Primary user-facing workflows and API integration' },
      { name: `Sprint ${baseNum + 2} — Hardening & Polish`, goal: 'QA verification, performance tuning, and release prep' }
    ];

    const modalBody = `
  <div class="sp-stack-modal" id="sp-stack-modal-root">
    ${completeSprintIdAfterStack ? `
          <div class="sp-autorollover-banner" style="margin-bottom: 0.85rem;">
            <i class="fa-solid fa-layer-group"></i>
            <div>
              <strong>Stack & Rollover Active</strong>
              <span>Creating this stack will automatically complete the current sprint and move all pending tasks into the 1st stacked sprint below.</span>
            </div>
          </div>
        ` : `
          <p class="sp-modal-intro">
            Schedule a continuous chain of back-to-back sprints at a <strong>constant time interval</strong> with custom names for each cycle. Sprints automatically open and close on schedule.
          </p>
        `}

        <div class="sp-stack-config-grid">
          <div class="form-group">
            <label class="form-label" for="stack-interval-days">Constant Time Interval (Days)</label>
            <div class="sp-interval-control-row">
              <input type="number" id="stack-interval-days" class="form-input" value="14" min="1" max="365">
              <div class="sp-interval-presets" role="group" aria-label="Interval presets">
                <button type="button" class="sp-preset-chip" data-interval-preset="7">7d</button>
                <button type="button" class="sp-preset-chip" data-interval-preset="10">10d</button>
                <button type="button" class="sp-preset-chip is-active" data-interval-preset="14">14d</button>
                <button type="button" class="sp-preset-chip" data-interval-preset="21">21d</button>
                <button type="button" class="sp-preset-chip" data-interval-preset="28">28d</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="stack-anchor-start">First Sprint Start Date</label>
            <input type="date" id="stack-anchor-start" class="form-input" value="${Utils.toDateInputValue(anchorDate)}">
          </div>

          <div class="form-group">
            <label class="form-label" for="stack-project">Project Scope</label>
            <select id="stack-project" class="form-select">
              <option value="__all_projects__" ${defaultProj === '__all_projects__' ? 'selected' : ''}>All Projects (Cross-Workspace)</option>
              ${AppState.projects.map(p => `<option value="${esc(p.id)}" ${p.id === defaultProj ? 'selected' : ''}>${esc(p.name)} (${esc(p.key)})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="sp-stack-list-header">
          <div class="sp-stack-list-title">
            <i class="fa-solid fa-timeline"></i>
            <span>Stacked Sprint Queue (<strong id="stack-count-badge">${stackItems.length}</strong> Sprints)</span>
          </div>
          <div class="sp-stack-list-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-stack-row">
              <i class="fa-solid fa-plus"></i> Add Sprint to Stack
            </button>
          </div>
        </div>

        <div id="stack-sprints-rows" class="sp-stack-rows-container"></div>

        <div class="sp-stack-options-bar">
          <label class="sp-checkbox-row">
            <input type="checkbox" id="stack-auto-schedule" checked>
            <span><strong>Auto-Pilot Schedule:</strong> Automatically open & close each sprint based on its time window and roll pending tasks to the next sprint</span>
          </label>
        </div>
      </div>
  `;

    Modal.open({
      title: 'Stack Multiple Sprints (Constant Interval)',
      body: modalBody,
      size: 'lg',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: completeSprintIdAfterStack ? 'Stack Sprints & Rollover Pending Tasks' : 'Create Sprint Stack',
          class: 'btn-primary',
          id: 'btn-confirm-stack-sprints',
          onClick: () => {
            const root = document.getElementById('sp-stack-modal-root');
            if (!root) return;

            const intervalDays = Math.max(1, Number(root.querySelector('#stack-interval-days').value) || 14);
            const anchorVal = root.querySelector('#stack-anchor-start').value;
            const projVal = root.querySelector('#stack-project').value;
            const autoSchedule = root.querySelector('#stack-auto-schedule').checked;
            const projectId = projVal === '__all_projects__' ? null : projVal;

            const rowEls = Array.from(root.querySelectorAll('.sp-stack-row'));
            if (rowEls.length === 0) {
              Toast.warning('Add at least one sprint to the stack.');
              return;
            }

            const baseStart = anchorVal ? new Date(anchorVal + 'T00:00:00') : new Date();
            const specs = [];

            for (let i = 0; i < rowEls.length; i++) {
              const nameInput = rowEls[i].querySelector('.stack-row-name');
              const goalInput = rowEls[i].querySelector('.stack-row-goal');
              const customName = nameInput ? nameInput.value.trim() : '';
              if (!customName) {
                Toast.warning(`Please enter a custom name for Sprint #${i + 1}.`);
                if (nameInput) nameInput.focus();
                return;
              }
              const sDate = new Date(baseStart.getTime() + i * intervalDays * 86400000);
              const eDate = new Date(sDate.getTime() + intervalDays * 86400000);

              specs.push({
                name: customName,
                goal: goalInput ? goalInput.value.trim() : '',
                projectId,
                startDate: sDate.toISOString(),
                endDate: eDate.toISOString(),
                intervalDays,
                autoSchedule,
                status: 'planned'
              });
            }

            const created = AppState.createSprintStack(specs);

            if (completeSprintIdAfterStack && created.length > 0) {
              AppState.completeSprint(completeSprintIdAfterStack, created[0].id, {
                forceActivateNext: true
              });
            }

            Modal.close();
          }
        }
      ]
    });

    setTimeout(() => {
      const root = document.getElementById('sp-stack-modal-root');
      if (!root) return;

      const intervalInput = root.querySelector('#stack-interval-days');
      const anchorInput = root.querySelector('#stack-anchor-start');
      const rowsContainer = root.querySelector('#stack-sprints-rows');
      const countBadge = root.querySelector('#stack-count-badge');
      const addRowBtn = root.querySelector('#btn-add-stack-row');

      const syncFromDOM = () => {
        const currentRows = rowsContainer.querySelectorAll('.sp-stack-row');
        if (currentRows.length > 0) {
          stackItems = Array.from(currentRows).map(r => ({
            name: r.querySelector('.stack-row-name')?.value || '',
            goal: r.querySelector('.stack-row-goal')?.value || ''
          }));
        }
      };

      const computeWindows = () => {
        const intervalDays = Math.max(1, Number(intervalInput.value) || 14);
        const anchorVal = anchorInput.value;
        const baseStart = anchorVal ? new Date(anchorVal + 'T00:00:00') : new Date();
        return stackItems.map((_, idx) => {
          const sDate = new Date(baseStart.getTime() + idx * intervalDays * 86400000);
          const eDate = new Date(sDate.getTime() + intervalDays * 86400000);
          return {
            startLabel: Utils.formatDate(sDate.toISOString()),
            endLabel: Utils.formatDate(eDate.toISOString()),
            intervalDays
          };
        });
      };

      const renderRows = () => {
        const windows = computeWindows();
        if (countBadge) countBadge.textContent = String(stackItems.length);

        rowsContainer.innerHTML = stackItems.map((item, idx) => {
          const w = windows[idx];
          return `
  <div class="sp-stack-row" data-stack-index="${idx}">
              <div class="sp-stack-row-seq">
                <span class="sp-stack-seq-num">#${idx + 1}</span>
                <span class="sp-stack-seq-days">${w.intervalDays}d</span>
              </div>
              <div class="sp-stack-row-fields">
                <div class="sp-stack-row-top">
                  <input type="text" class="form-input stack-row-name" value="${esc(item.name)}" placeholder="Custom name for Sprint #${idx + 1} (e.g. Sprint ${baseNum + idx} — API & Auth)" required>
                  <span class="sp-stack-window-badge" data-stack-window="${idx}">
                    <i class="fa-regular fa-calendar"></i> ${esc(w.startLabel)} → ${esc(w.endLabel)}
                  </span>
                </div>
                <input type="text" class="form-input stack-row-goal" value="${esc(item.goal)}" placeholder="Optional cycle goal or milestone for Sprint #${idx + 1}...">
              </div>
              <button type="button" class="sp-stack-row-remove" data-remove-stack-idx="${idx}" title="Remove from stack" ${stackItems.length <= 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
  `;
        }).join('');

        rowsContainer.querySelectorAll('[data-remove-stack-idx]').forEach(btn => {
          btn.addEventListener('click', () => {
            if (stackItems.length <= 1) return;
            syncFromDOM();
            const idx = Number(btn.dataset.removeStackIdx);
            stackItems.splice(idx, 1);
            renderRows();
          });
        });
      };

      const updateWindowBadgesOnly = () => {
        const windows = computeWindows();
        rowsContainer.querySelectorAll('.sp-stack-row').forEach((row, idx) => {
          const w = windows[idx];
          if (!w) return;
          const badge = row.querySelector('[data-stack-window]');
          const daysEl = row.querySelector('.sp-stack-seq-days');
          if (badge) badge.innerHTML = `<i class="fa-regular fa-calendar"></i> ${esc(w.startLabel)} → ${esc(w.endLabel)} `;
          if (daysEl) daysEl.textContent = `${w.intervalDays}d`;
        });
      };

      intervalInput.addEventListener('input', () => {
        const val = Number(intervalInput.value);
        root.querySelectorAll('[data-interval-preset]').forEach(chip => {
          chip.classList.toggle('is-active', Number(chip.dataset.intervalPreset) === val);
        });
        updateWindowBadgesOnly();
      });

      anchorInput.addEventListener('change', updateWindowBadgesOnly);

      root.querySelectorAll('[data-interval-preset]').forEach(chip => {
        chip.addEventListener('click', () => {
          const presetDays = Number(chip.dataset.intervalPreset) || 14;
          intervalInput.value = String(presetDays);
          root.querySelectorAll('[data-interval-preset]').forEach(c => c.classList.remove('is-active'));
          chip.classList.add('is-active');
          updateWindowBadgesOnly();
        });
      });

      if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
          syncFromDOM();
          const nextIdx = stackItems.length;
          stackItems.push({
            name: `Sprint ${baseNum + nextIdx} — Cycle ${nextIdx + 1} `,
            goal: ''
          });
          renderRows();
          const nameInputs = rowsContainer.querySelectorAll('.stack-row-name');
          if (nameInputs.length > 0) {
            nameInputs[nameInputs.length - 1].focus();
            nameInputs[nameInputs.length - 1].select();
          }
        });
      }

      renderRows();
    }, 30);
  },

  openCreateSprintModal() {
    const defaultProj = AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : 'proj_web');
    const defaultEnd = new Date(Date.now() + 14 * 86400000);

    const modalBody = `
  <form id="create-sprint-form">
        <div class="form-group">
          <label class="form-label" for="sprint-name">Sprint / Cycle Name <span class="required">*</span></label>
          <input type="text" id="sprint-name" class="form-input" placeholder="e.g. Cycle 04 — Performance & Realtime Sync" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label" for="sprint-project">Project Scope</label>
          <select id="sprint-project" class="form-select">
            <option value="__all_projects__">All Projects (Cross-Workspace Cycle)</option>
            ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === defaultProj ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="sprint-goal">Cycle Objective / Goal</label>
          <textarea id="sprint-goal" class="form-textarea" placeholder="Define the primary engineering milestone for this cycle..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="sprint-start">Start Date</label>
            <input type="date" id="sprint-start" class="form-input" value="${Utils.toDateInputValue(new Date())}">
          </div>
          <div class="form-group">
            <label class="form-label" for="sprint-end">Target End Date</label>
            <input type="date" id="sprint-end" class="form-input" value="${Utils.toDateInputValue(defaultEnd)}">
          </div>
        </div>
        <label class="sp-checkbox-row" style="margin-top: 0.35rem;">
          <input type="checkbox" id="sprint-auto-schedule" checked>
          <span>Auto-open & auto-close this sprint based on its scheduled dates</span>
        </label>
      </form>
`;

    Modal.open({
      title: 'Plan New Sprint Cycle',
      body: modalBody,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Stack Multiple Sprints...',
          class: 'btn-ghost',
          onClick: () => {
            Modal.close();
            this.openStackSprintsModal();
          }
        },
        {
          text: 'Create Cycle',
          class: 'btn-primary',
          onClick: () => {
            const name = document.getElementById('sprint-name').value.trim();
            if (!name) return;

            const sprintStartVal = document.getElementById('sprint-start').value;
            const sprintEndVal = document.getElementById('sprint-end').value;
            const autoScheduleCb = document.getElementById('sprint-auto-schedule');

            const sDate = sprintStartVal ? new Date(sprintStartVal) : new Date();
            let eDate;
            if (sprintEndVal) {
              eDate = new Date(sprintEndVal);
            } else {
              eDate = new Date(sDate);
              eDate.setDate(eDate.getDate() + 14);
            }

            AppState.createSprint({
              projectId: document.getElementById('sprint-project').value === '__all_projects__'
                ? null
                : document.getElementById('sprint-project').value,
              name,
              goal: document.getElementById('sprint-goal').value.trim(),
              startDate: sDate.toISOString(),
              endDate: eDate.toISOString(),
              autoSchedule: autoScheduleCb ? autoScheduleCb.checked : true,
              status: 'planned'
            });

            Modal.close();
          }
        }
      ]
    });
  },

  openEditSprintModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const { startMs, endMs } = AppState.getSprintWindowMs(sprint);

    const modalBody = `
  <form id="edit-sprint-form">
        <div class="form-group">
          <label class="form-label" for="edit-sprint-name">Sprint / Cycle Name <span class="required">*</span></label>
          <input type="text" id="edit-sprint-name" class="form-input" value="${Utils.escapeHTML(sprint.name)}" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-sprint-project">Project Scope</label>
          <select id="edit-sprint-project" class="form-select">
            <option value="__all_projects__" ${!sprint.projectId ? 'selected' : ''}>All Projects (Cross-Workspace Cycle)</option>
            ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === sprint.projectId ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-sprint-goal">Cycle Objective / Goal</label>
          <textarea id="edit-sprint-goal" class="form-textarea">${Utils.escapeHTML(sprint.goal || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="edit-sprint-start">Start Date</label>
            <input type="date" id="edit-sprint-start" class="form-input" value="${Utils.toDateInputValue(startMs)}">
          </div>
          <div class="form-group">
            <label class="form-label" for="edit-sprint-end">Target End Date</label>
            <input type="date" id="edit-sprint-end" class="form-input" value="${Utils.toDateInputValue(endMs)}">
          </div>
        </div>
        <label class="sp-checkbox-row" style="margin-top: 0.35rem;">
          <input type="checkbox" id="edit-sprint-auto-schedule" ${sprint.autoSchedule !== false ? 'checked' : ''}>
          <span>Auto-open & auto-close this sprint based on its scheduled dates</span>
        </label>
      </form>
  `;

    Modal.open({
      title: `Edit Sprint Cycle: ${Utils.escapeHTML(sprint.name)} `,
      body: modalBody,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Save Changes',
          class: 'btn-primary',
          onClick: () => {
            const name = document.getElementById('edit-sprint-name').value.trim();
            if (!name) return;

            const projSelect = document.getElementById('edit-sprint-project');
            const projectId = projSelect && projSelect.value !== '__all_projects__' ? projSelect.value : null;
            const autoScheduleCb = document.getElementById('edit-sprint-auto-schedule');

            const startDateVal = document.getElementById('edit-sprint-start').value;
            const endDateVal = document.getElementById('edit-sprint-end').value;
            const existingStartHMS = Utils.formatTimeHMS(startMs);
            const existingEndHMS = Utils.formatTimeHMS(endMs);

            const updates = {
              name,
              projectId,
              goal: document.getElementById('edit-sprint-goal').value.trim(),
              startDate: startDateVal ? (Utils.combineDateAndTimeISO(startDateVal, existingStartHMS, '00:00:00') || sprint.startDate) : sprint.startDate,
              endDate: endDateVal ? (Utils.combineDateAndTimeISO(endDateVal, existingEndHMS, '23:59:59') || sprint.endDate) : sprint.endDate,
              autoSchedule: autoScheduleCb ? autoScheduleCb.checked : true
            };

            AppState.updateSprint(sprintId, updates);
            Modal.close();
            Toast.success(`Updated "${name}"`);
          }
        }
      ]
    });
  },

  // ── Main Render ──
  render(container) {
    if (!container) return;

    const esc = Utils.escapeHTML;
    const data = this._getViewData();
    const {
      selectedProject,
      projectSprints,
      filteredTasks,
      activeSprint,
      plannedSprints,
      completedSprints,
      activeTasks,
      backlogTasks,
      plannedTotalItems,
      plannedTotalPts,
      avgDeliveryPct,
      totalCompletedPts
    } = data;

    const isAutoPilotOn = !(AppState.settings && AppState.settings.autoSprintSchedule === false);
    const hasCompleted = completedSprints.length > 0;
    const effectiveLowerTab = (!hasCompleted || this.lowerTab !== 'history') ? 'planning' : 'history';
    const quickTargetSprint = activeSprint || plannedSprints[0] || null;

    let headerSubtitle = 'Organize iterations, prioritize backlog, and track sprint velocity';
    if (projectSprints.length === 0) {
      headerSubtitle = 'Create your first sprint cycle to plan and track work';
    } else if (activeSprint) {
      headerSubtitle = `${activeSprint.name} in progress · ${plannedSprints.length} upcoming · ${backlogTasks.length} in backlog`;
    } else {
      headerSubtitle = `${plannedSprints.length} upcoming · ${backlogTasks.length} in backlog · ${completedSprints.length} completed`;
    }

    container.innerHTML = `
      <div class="view-page backlog-page sp-page">
        <!-- 1. CLEAN PAGE HEADER -->
        <header class="view-header sp-page-header">
          <div class="view-title-group">
            <div class="sp-title-row">
              <h1>Sprint Planning</h1>
              ${selectedProject ? `
                <button type="button" id="sp-reset-project-scope" class="sp-scope-pill" title="Clear project filter">
                  <span class="sp-dot" style="background:${selectedProject.color || 'var(--accent-primary)'};"></span>
                  <span>${esc(selectedProject.name)}</span>
                  <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
            </div>
            <p>${esc(headerSubtitle)}</p>
          </div>

          ${projectSprints.length > 0 ? `
            <div class="view-actions sp-header-actions">
              <div class="sp-search-field ${this.searchQuery ? 'has-value' : ''}">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="sp-global-search" value="${esc(this.searchQuery)}" placeholder="Search sprints or tasks..." aria-label="Search sprints and tasks">
                <button type="button" id="sp-clear-search" class="sp-search-clear ${this.searchQuery ? '' : 'is-hidden'}" title="Clear search">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <button type="button" id="btn-toggle-sprint-autopilot" class="sp-autopilot-toggle ${isAutoPilotOn ? 'is-on' : 'is-off'}" title="${isAutoPilotOn ? 'Auto-Pilot enabled: automatically starts, closes, and rolls over sprints on schedule' : 'Auto-Pilot paused: sprints require manual start/complete'}">
                <span class="sp-autopilot-dot"></span>
                <span>Auto-Pilot ${isAutoPilotOn ? 'On' : 'Off'}</span>
              </button>
              <button type="button" id="btn-stack-sprints" class="btn btn-secondary btn-sm" title="Create multiple back-to-back sprints">
                <i class="fa-solid fa-layer-group"></i>
                <span>Stack Sprints</span>
              </button>
              <button type="button" id="btn-create-sprint" class="btn ${activeSprint ? 'btn-secondary' : 'btn-primary'} btn-sm">
                <i class="fa-solid fa-plus"></i>
                <span>New Sprint</span>
              </button>
            </div>
          ` : ''}
        </header>

        ${projectSprints.length === 0 ? `
          <!-- SCENARIO 1: NO SPRINTS CREATED -->
          <section class="sp-empty-state">
            <div class="sp-empty-icon"><i class="fa-regular fa-calendar-check"></i></div>
            <h3>No Sprints Scheduled Yet</h3>
            <p>Break your product backlog into focused iterations, or generate a series of back-to-back sprints at a fixed cadence.</p>
            <div class="sp-empty-actions">
              <button type="button" class="btn btn-primary" onclick="BacklogView.openCreateSprintModal()">
                <i class="fa-solid fa-plus"></i> Plan First Sprint
              </button>
              <button type="button" class="btn btn-secondary" onclick="BacklogView.openStackSprintsModal()">
                <i class="fa-solid fa-layer-group"></i> Stack Multiple Sprints
              </button>
            </div>
          </section>

          ${backlogTasks.length > 0 ? `
            <section class="sp-solo-backlog-wrap">
              ${this._renderBacklogPoolPanel(backlogTasks, null)}
            </section>
          ` : ''}
        ` : `
          <!-- SCENARIO 2 / 3: ACTIVE SPRINT CARD OR PLANNING LAUNCHPAD -->
          <section class="sp-primary-zone" aria-label="${activeSprint ? 'Active sprint' : 'Sprint launchpad'}">
            ${activeSprint
        ? this.renderActiveSprintStudio(activeSprint, activeTasks, backlogTasks.length)
        : this.renderSprintPlanningEmpty(plannedSprints, filteredTasks)}
          </section>

          <!-- SCENARIO-AWARE LOWER WORKSPACE: PLANNING & BACKLOG / COMPLETED HISTORY -->
          <section class="sp-lower-workspace" aria-label="Sprint pipeline and backlog">
            <div class="sp-lower-bar">
              ${hasCompleted ? `
                <div class="sp-segmented sp-lower-tabs" role="tablist" aria-label="Planning sections">
                  <button type="button" role="tab" aria-selected="${effectiveLowerTab === 'planning'}" class="sp-seg-btn ${effectiveLowerTab === 'planning' ? 'is-active' : ''}" data-sp-lower-tab="planning">
                    <i class="fa-solid fa-bars-progress"></i>
                    <span>Pipeline &amp; Backlog</span>
                    <span class="sp-seg-count">${plannedSprints.length + backlogTasks.length}</span>
                  </button>
                  <button type="button" role="tab" aria-selected="${effectiveLowerTab === 'history'}" class="sp-seg-btn ${effectiveLowerTab === 'history' ? 'is-active' : ''}" data-sp-lower-tab="history">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <span>Completed History</span>
                    <span class="sp-seg-count">${completedSprints.length}</span>
                  </button>
                </div>
              ` : `
                <div class="sp-section-heading">
                  <h2>Pipeline &amp; Backlog</h2>
                  <span class="sp-muted-meta">${plannedSprints.length} planned sprint${plannedSprints.length === 1 ? '' : 's'} · ${backlogTasks.length} unassigned item${backlogTasks.length === 1 ? '' : 's'}</span>
                </div>
              `}
            </div>

            ${effectiveLowerTab === 'planning' ? `
              <div class="sp-planning-grid">
                <!-- LEFT: UPCOMING SPRINT PIPELINE -->
                <div class="sp-panel sp-upcoming-panel">
                  <div class="sp-panel-head">
                    <div class="sp-panel-title-wrap">
                      <h3>Upcoming Sprints</h3>
                      <span class="sp-count-pill">${plannedSprints.length}</span>
                    </div>
                    ${plannedSprints.length > 0 ? `
                      <span class="sp-muted-meta">${plannedTotalItems} item${plannedTotalItems === 1 ? '' : 's'} · ${plannedTotalPts} pts</span>
                    ` : ''}
                  </div>
                  <div class="sp-upcoming-list" data-sp-refresh="upcoming">
                    ${this._renderUpcomingListHTML(plannedSprints, filteredTasks)}
                  </div>
                </div>

                <!-- RIGHT: UNASSIGNED PRODUCT BACKLOG -->
                ${this._renderBacklogPoolPanel(backlogTasks, quickTargetSprint)}
              </div>
            ` : `
              <!-- TAB 2: COMPLETED SPRINT HISTORY -->
              <div class="sp-panel sp-history-panel">
                <div class="sp-panel-head">
                  <div class="sp-panel-title-wrap">
                    <h3>Completed Sprints</h3>
                    <span class="sp-count-pill is-success">${completedSprints.length}</span>
                  </div>
                  <div class="sp-history-summary">
                    <span><strong>${avgDeliveryPct}%</strong> avg delivery</span>
                    <span class="sp-sep-dot"></span>
                    <span><strong>${totalCompletedPts}</strong> pts delivered</span>
                  </div>
                </div>
                <div class="sp-history-grid" data-sp-refresh="history">
                  ${this._renderCompletedHistoryHTML(completedSprints, filteredTasks)}
                </div>
              </div>
            `}
          </section>
        `}
      </div>
    `;

    this.attachListeners(container);
  },

  renderSprintPlanningEmpty(plannedSprints, filteredTasks = []) {
    const esc = Utils.escapeHTML;
    const nextSprint = plannedSprints[0] || null;

    if (!nextSprint) {
      return `
        <div class="sp-launchpad is-empty-queue">
          <div class="sp-launchpad-copy">
            <span class="sp-pill tone-neutral"><i class="fa-regular fa-pause-circle"></i> No Active Sprint</span>
            <div>
              <h2>Ready for your next iteration</h2>
              <p>No active or upcoming sprints are currently scheduled. Plan a new cycle from your backlog or stack multiple sprints ahead.</p>
            </div>
          </div>
          <div class="sp-launchpad-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="BacklogView.openCreateSprintModal()">
              <i class="fa-solid fa-plus"></i> Plan Sprint
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openStackSprintsModal()">
              <i class="fa-solid fa-layer-group"></i> Stack Sprints
            </button>
          </div>
        </div>
      `;
    }

    const nextTasks = filteredTasks.filter(t => t.sprintId === nextSprint.id);
    const nextPts = nextTasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);

    return `
      <div class="sp-launchpad">
        <div class="sp-launchpad-copy">
          <span class="sp-pill tone-brand"><i class="fa-regular fa-circle-play"></i> Up Next</span>
          <div class="sp-launchpad-text">
            <h2>${esc(nextSprint.name)}</h2>
            <p>
              ${nextSprint.startDate && nextSprint.endDate ? `<span><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(nextSprint.startDate)} – ${Utils.formatDate(nextSprint.endDate)}</span>` : ''}
              <span>· ${nextTasks.length} item${nextTasks.length === 1 ? '' : 's'}</span>
              ${nextPts > 0 ? `<span>· ${nextPts} pts</span>` : ''}
              ${nextSprint.goal ? `<span class="sp-launchpad-goal">· ${esc(nextSprint.goal)}</span>` : ''}
            </p>
          </div>
        </div>
        <div class="sp-launchpad-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openSprintDetailModal('${esc(nextSprint.id)}')">
            <i class="fa-solid fa-sliders"></i> Manage Scope
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${esc(nextSprint.id)}')">
            <i class="fa-solid fa-play"></i> Start Sprint
          </button>
        </div>
      </div>
    `;
  },

  renderActiveSprintStudio(sprint, sprintTasks, unassignedCount = 0) {
    const esc = Utils.escapeHTML;
    const total = sprintTasks.length;
    const doneTasks = sprintTasks.filter(t => t.status === 'done').length;
    const progress = total ? Math.round((doneTasks / total) * 100) : 0;

    const totalPoints = sprintTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const donePoints = sprintTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const remainingPoints = Math.max(0, totalPoints - donePoints);
    const totalTracked = sprintTasks.reduce((sum, t) => sum + (Number(t.trackedTime) || 0), 0);
    const totalEstimate = sprintTasks.reduce((sum, t) => sum + (Number(t.estimate) || 0), 0);

    const breakdown = {
      todo: sprintTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length,
      inprogress: sprintTasks.filter(t => t.status === 'inprogress').length,
      reviewBlocked: sprintTasks.filter(t => t.status === 'inreview' || t.status === 'blocked').length,
      done: doneTasks
    };

    let timeProgressPct = 0;
    let countdownLabel = 'Active';
    let countdownTone = 'tone-brand';
    if (sprint.startDate && sprint.endDate) {
      const startMs = new Date(sprint.startDate).getTime();
      const endMs = new Date(sprint.endDate).getTime();
      const nowMs = Date.now();
      const span = Math.max(86400000, endMs - startMs);
      timeProgressPct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / span) * 100)));

      const diff = Math.ceil((endMs - nowMs) / 86400000);
      countdownTone = diff < 0 ? 'tone-danger' : diff <= 3 ? 'tone-warning' : 'tone-brand';
      countdownLabel = diff > 0 ? `${diff}d left` : diff === 0 ? 'Ends today' : `${Math.abs(diff)}d overdue`;
    }

    const sprintProject = sprint.projectId ? AppState.projects.find(p => p.id === sprint.projectId) : null;
    const defaultProjectId = sprint.projectId || AppState.selectedProjectId || (AppState.projects[0] && AppState.projects[0].id) || '';
    const nextScheduledSprint = AppState.getNextScheduledSprint(sprint.id);

    const filterPills = [
      { id: 'all', label: 'All', count: total },
      { id: 'todo', label: 'To Do', count: breakdown.todo },
      { id: 'inprogress', label: 'In Progress', count: breakdown.inprogress },
      { id: 'inreview', label: 'Review / Blocked', count: breakdown.reviewBlocked },
      { id: 'done', label: 'Done', count: breakdown.done }
    ].filter(f => f.id === 'all' || f.count > 0 || this.activeStatusFilter === f.id);

    const showQuickProjectSelect = !sprint.projectId && (AppState.projects || []).length > 1;

    return `
      <article class="sp-active-card sprint-drop-zone" data-sprint-id="${esc(sprint.id)}">
        <!-- EXECUTIVE SPRINT HEADER -->
        <header class="sp-active-head">
          <div class="sp-active-identity">
            <div class="sp-active-badges">
              <span class="sp-live-pill">
                <span class="sp-live-dot"></span>
                Active Sprint
              </span>
              <span class="sp-pill ${countdownTone}">
                <i class="fa-regular fa-clock"></i> ${esc(countdownLabel)}
              </span>
              ${sprintProject ? `
                <span class="sp-chip">
                  <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                  ${esc(sprintProject.name)}
                </span>
              ` : ''}
            </div>

            <div class="sp-active-title-row">
              <h2>${esc(sprint.name)}</h2>
              ${sprint.startDate && sprint.endDate ? `
                <span class="sp-active-dates">
                  <i class="fa-regular fa-calendar"></i>
                  ${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)}
                </span>
              ` : ''}
              ${nextScheduledSprint ? `
                <span class="sp-rollover-note is-linked" title="Unfinished tasks can automatically roll over into ${esc(nextScheduledSprint.name)}">
                  <i class="fa-solid fa-arrow-right-arrow-left"></i> Next: ${esc(nextScheduledSprint.name)}
                </span>
              ` : `
                <button type="button" class="sp-rollover-note is-unscheduled" onclick="BacklogView.openStackSprintsModal()" title="Schedule upcoming sprints so pending items roll over seamlessly">
                  <i class="fa-regular fa-calendar-plus"></i> Schedule next sprint
                </button>
              `}
            </div>

            ${sprint.goal ? `<p class="sp-active-goal">${esc(sprint.goal)}</p>` : ''}
          </div>

          <div class="sp-active-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="BacklogView.completeSprint('${esc(sprint.id)}')">
              <i class="fa-solid fa-flag-checkered"></i> Complete Sprint
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openSprintDetailModal('${esc(sprint.id)}')" title="Open full sprint workspace & HH:MM:SS time window">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i> Workspace
            </button>
            <button type="button" class="btn btn-ghost btn-sm sp-icon-action" onclick="BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit sprint details">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="btn btn-ghost btn-sm sp-icon-action is-danger" onclick="AppState.deleteSprint('${esc(sprint.id)}')" title="Delete sprint">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </header>

        <!-- CLEAN 4-METRIC TELEMETRY STRIP -->
        <div class="sp-kpi-strip">
          <div class="sp-kpi-item">
            <span class="sp-kpi-label">Completion</span>
            <div class="sp-kpi-value-row">
              <strong>${progress}%</strong>
              <span>${doneTasks}/${total} tasks</span>
            </div>
          </div>
          <div class="sp-kpi-item">
            <span class="sp-kpi-label">Story Points</span>
            <div class="sp-kpi-value-row">
              <strong>${donePoints}<small>/${totalPoints}</small></strong>
              <span>${totalPoints > 0 ? `${remainingPoints} pts left` : 'No points set'}</span>
            </div>
          </div>
          <div class="sp-kpi-item">
            <span class="sp-kpi-label">In Progress</span>
            <div class="sp-kpi-value-row">
              <strong>${breakdown.inprogress}</strong>
              <span>${breakdown.reviewBlocked > 0 ? `${breakdown.reviewBlocked} review/blocked` : `${breakdown.todo} to do`}</span>
            </div>
          </div>
          <div class="sp-kpi-item">
            <span class="sp-kpi-label">Cycle Timeline</span>
            <div class="sp-kpi-value-row">
              <strong>${timeProgressPct}%</strong>
              <span>${totalTracked > 0 ? `${Utils.formatMinutes(totalTracked)} logged` : (totalEstimate > 0 ? `${Utils.formatMinutes(totalEstimate)} est.` : 'Time elapsed')}</span>
            </div>
          </div>
        </div>

        <div class="sp-progress-rail" title="${progress}% work completed">
          <div class="sp-progress-fill" style="width:${progress}%;"></div>
        </div>

        <!-- EXECUTION WORKSPACE -->
        <div class="sp-execution-body">
          <div class="sp-stage-toolbar">
            <div class="sp-stage-toolbar-left">
              <div class="sp-segmented" role="group" aria-label="View mode">
                <button type="button" class="sp-seg-btn ${this.activeViewMode === 'lanes' ? 'is-active' : ''}" data-active-view-mode="lanes">
                  <i class="fa-solid fa-bars-staggered"></i>
                  <span>List</span>
                </button>
                <button type="button" class="sp-seg-btn ${this.activeViewMode === 'project' ? 'is-active' : ''}" data-active-view-mode="project">
                  <i class="fa-solid fa-folder-tree"></i>
                  <span>By Project</span>
                </button>
                <button type="button" class="sp-seg-btn ${this.activeViewMode === 'board' ? 'is-active' : ''}" data-active-view-mode="board">
                  <i class="fa-solid fa-table-columns"></i>
                  <span>Board</span>
                </button>
              </div>

              ${total > 0 ? `
                <div class="sp-status-pills" role="group" aria-label="Filter active sprint items">
                  ${filterPills.map(f => `
                    <button type="button" class="sp-filter-pill ${this.activeStatusFilter === f.id ? 'is-active' : ''}" data-active-status-filter="${f.id}">
                      <span>${f.label}</span>
                      <span class="sp-filter-count">${f.count}</span>
                    </button>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <div class="sp-stage-toolbar-right">
              ${unassignedCount > 0 ? `
                <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}">
                  <i class="fa-solid fa-arrow-down-short-wide"></i>
                  <span>Pull Backlog (${unassignedCount})</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- SLEEK INLINE WORK ITEM COMPOSER -->
          <form id="sp-active-quick-form" class="sp-composer" data-sprint-id="${esc(sprint.id)}">
            <span class="sp-composer-icon"><i class="fa-solid fa-plus"></i></span>
            <input type="text" id="sp-quick-title" placeholder="Add work item to ${esc(sprint.name)}... (Press Enter)" maxlength="180" autocomplete="off">
            <div class="sp-composer-controls">
              ${showQuickProjectSelect ? `
                <select id="sp-quick-project" aria-label="Project">
                  ${AppState.projects.map(p => `<option value="${esc(p.id)}" ${p.id === defaultProjectId ? 'selected' : ''}>${esc(p.key || p.name)}</option>`).join('')}
                </select>
              ` : ''}
              <select id="sp-quick-priority" aria-label="Priority">
                <option value="high">High</option>
                <option value="medium" selected>Medium</option>
                <option value="low">Low</option>
                <option value="critical">Critical</option>
              </select>
              <select id="sp-quick-points" aria-label="Story points">
                <option value="0">0 pts</option>
                <option value="1">1 pt</option>
                <option value="2">2 pts</option>
                <option value="3" selected>3 pts</option>
                <option value="5">5 pts</option>
                <option value="8">8 pts</option>
              </select>
              <button type="submit" class="btn btn-primary btn-sm">Add</button>
              <button type="button" class="btn btn-ghost btn-sm sp-composer-expand" onclick="TaskModal.openCreate({ sprintId: '${esc(sprint.id)}', projectId: '${esc(sprint.projectId || '')}' })" title="Open full task form">
                <i class="fa-solid fa-up-right-from-square"></i>
              </button>
            </div>
          </form>

          <!-- DYNAMIC EXECUTION CANVAS -->
          <div class="sp-stage-canvas" data-sp-refresh="active-canvas">
            ${this._renderActiveCanvasHTML(sprint, sprintTasks)}
          </div>
        </div>
      </article>
    `;
  },

  _renderActiveCanvasHTML(sprint, sprintTasks) {
    const esc = Utils.escapeHTML;

    if (sprintTasks.length === 0) {
      return `
        <div class="sp-empty-well sprint-drop-empty">
          <i class="fa-regular fa-square-plus"></i>
          <strong>No items in ${esc(sprint.name)} yet</strong>
          <span>Use the quick-add input above, drag tasks from the backlog below, or pull existing items.</span>
          <div class="sp-empty-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}">
              <i class="fa-solid fa-link"></i> Pull from Backlog
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="TaskModal.openCreate({ sprintId: '${esc(sprint.id)}', projectId: '${esc(sprint.projectId || '')}' })">
              <i class="fa-solid fa-plus"></i> Create Task
            </button>
          </div>
        </div>
      `;
    }

    const visibleTasks = sprintTasks
      .filter(t => this._matchesQuery(t))
      .filter(t => {
        if (this.activeStatusFilter === 'all') return true;
        if (this.activeStatusFilter === 'todo') return t.status === 'todo' || t.status === 'backlog';
        if (this.activeStatusFilter === 'inreview') return t.status === 'inreview' || t.status === 'blocked';
        return t.status === this.activeStatusFilter;
      })
      .sort((a, b) => this._sortByItemId(a, b));

    if (visibleTasks.length === 0) {
      return `
        <div class="sp-empty-well">
          <i class="fa-solid fa-filter-circle-xmark"></i>
          <strong>No matching work items</strong>
          <span>${this.searchQuery ? `Nothing matched "${esc(this.searchQuery)}"` : 'No items match the selected status filter.'}</span>
          ${this.activeStatusFilter !== 'all' ? `<button type="button" class="btn btn-secondary btn-sm" data-reset-status-filter="1">Reset Filter</button>` : ''}
        </div>
      `;
    }

    if (this.activeViewMode === 'project') {
      return this.renderActiveProjectMatrix(sprint, visibleTasks);
    }
    if (this.activeViewMode === 'board') {
      return this.renderActiveKanbanBoard(sprint, visibleTasks);
    }
    return this.renderActiveStatusSwimlanes(sprint, visibleTasks);
  },

  _renderUpcomingListHTML(plannedSprints, filteredTasks) {
    const q = (this.searchQuery || '').trim().toLowerCase();
    const matchingSprints = !q
      ? plannedSprints
      : plannedSprints.filter(sprint => {
        if ((sprint.name || '').toLowerCase().includes(q) || (sprint.goal || '').toLowerCase().includes(q)) return true;
        return filteredTasks.some(t => t.sprintId === sprint.id && this._matchesQuery(t));
      });

    if (plannedSprints.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-regular fa-calendar-plus"></i>
          <strong>No upcoming sprints planned</strong>
          <span>Queue future sprints so pending items roll over cleanly.</span>
          <div class="sp-empty-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openCreateSprintModal()">
              <i class="fa-solid fa-plus"></i> Plan Sprint
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openStackSprintsModal()">
              <i class="fa-solid fa-layer-group"></i> Stack Sprints
            </button>
          </div>
        </div>
      `;
    }

    if (matchingSprints.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-magnifying-glass"></i>
          <strong>No upcoming sprints match "${Utils.escapeHTML(this.searchQuery)}"</strong>
        </div>
      `;
    }

    return matchingSprints
      .map((sprint, idx) => this.renderCompressedUpcomingSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id), idx))
      .join('');
  },

  _renderBacklogPoolPanel(backlogTasks, quickTargetSprint) {
    const esc = Utils.escapeHTML;
    const totalPts = backlogTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);

    return `
      <div class="sp-panel sp-backlog-panel sprint-drop-zone" data-sprint-id="">
        <div class="sp-panel-head">
          <div class="sp-panel-title-wrap">
            <h3>Product Backlog</h3>
            <span class="sp-count-pill">${backlogTasks.length}</span>
          </div>
          ${totalPts > 0 ? `<span class="sp-muted-meta">${totalPts} pts</span>` : `<span class="sp-muted-meta">Unassigned</span>`}
        </div>

        <form id="sp-backlog-quick-form" class="sp-backlog-composer">
          <input type="text" id="sp-backlog-quick-title" placeholder="Capture backlog item... (Enter)" maxlength="160" autocomplete="off">
          <select id="sp-backlog-quick-priority" aria-label="Backlog priority">
            <option value="high">High</option>
            <option value="medium" selected>Med</option>
            <option value="low">Low</option>
            <option value="critical">Crit</option>
          </select>
          <select id="sp-backlog-quick-points" aria-label="Backlog story points">
            <option value="0">0p</option>
            <option value="1">1p</option>
            <option value="2">2p</option>
            <option value="3" selected>3p</option>
            <option value="5">5p</option>
            <option value="8">8p</option>
          </select>
          <button type="submit" class="btn btn-secondary btn-sm">Add</button>
        </form>

        <div class="sp-backlog-list" data-sp-refresh="backlog">
          ${this._renderBacklogPoolList(backlogTasks, quickTargetSprint)}
        </div>
      </div>
    `;
  },

  _renderBacklogPoolList(backlogTasks, quickTargetSprint) {
    const esc = Utils.escapeHTML;
    const matching = backlogTasks.filter(t => this._matchesQuery(t));

    if (backlogTasks.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-check-double"></i>
          <strong>Backlog is clear</strong>
          <span>Every open task is scheduled in a sprint, or capture new ideas above.</span>
        </div>
      `;
    }

    if (matching.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-magnifying-glass"></i>
          <strong>No backlog items match "${esc(this.searchQuery)}"</strong>
        </div>
      `;
    }

    return matching.map(task => {
      const project = AppState.projects.find(p => p.id === task.projectId);
      const pColor = (project && project.color) || 'var(--accent-primary)';
      const typeIcon = this._getTypeIcon(task.type);
      const priorityIcon = this._getPriorityIcon(task.priority);

      return `
        <div class="sp-backlog-row backlog-item-row"
             style="--row-proj-color:${pColor};"
             draggable="true"
             data-task-id="${esc(task.id)}">
          <span class="sp-row-drag" title="Drag into a sprint"><i class="fa-solid fa-grip-vertical"></i></span>
          <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
          <span class="sp-mono-key" data-sprint-action="open">${esc(task.key)}</span>
          <span class="sp-backlog-row-title" data-sprint-action="open">${esc(task.title)}</span>
          <div class="sp-backlog-row-meta">
            <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
            ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints}p</span>` : ''}
            ${quickTargetSprint ? `
              <button type="button"
                      class="sp-assign-btn"
                      data-quick-assign-task="${esc(task.id)}"
                      data-target-sprint-id="${esc(quickTargetSprint.id)}"
                      title="Assign to ${esc(quickTargetSprint.name)}">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                <span>${esc(quickTargetSprint.name)}</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  _renderCompletedHistoryHTML(completedSprints, filteredTasks) {
    const q = (this.searchQuery || '').trim().toLowerCase();
    const matching = !q
      ? completedSprints
      : completedSprints.filter(sprint => {
        if ((sprint.name || '').toLowerCase().includes(q) || (sprint.goal || '').toLowerCase().includes(q)) return true;
        return filteredTasks.some(t => t.sprintId === sprint.id && this._matchesQuery(t));
      });

    if (matching.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-magnifying-glass"></i>
          <strong>No completed sprints match "${Utils.escapeHTML(this.searchQuery)}"</strong>
        </div>
      `;
    }

    return matching
      .map(sprint => this.renderCompressedCompletedSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id)))
      .join('');
  },

  // ── MODE 1: STATUS SWIMLANES ──
  renderActiveStatusSwimlanes(sprint, tasks) {
    const esc = Utils.escapeHTML;
    const lanes = [
      {
        id: 'inprogress',
        label: 'In Progress & Review',
        accent: 'var(--status-inprogress)',
        icon: 'fa-solid fa-circle-half-stroke',
        items: tasks.filter(t => t.status === 'inprogress' || t.status === 'inreview' || t.status === 'blocked')
      },
      {
        id: 'todo',
        label: 'To Do',
        accent: 'var(--status-todo)',
        icon: 'fa-regular fa-circle',
        items: tasks.filter(t => t.status === 'todo' || t.status === 'backlog')
      },
      {
        id: 'done',
        label: 'Done',
        accent: 'var(--status-done)',
        icon: 'fa-solid fa-circle-check',
        items: tasks.filter(t => t.status === 'done')
      }
    ].filter(lane => lane.items.length > 0 || this.activeStatusFilter === 'all');

    return `
      <div class="sp-swimlanes">
        ${lanes.map(lane => {
      const pts = lane.items.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      return `
            <div class="sp-swimlane" style="--lane-color: ${lane.accent};">
              <div class="sp-swimlane-head">
                <div class="sp-swimlane-title">
                  <span class="sp-swimlane-dot"></span>
                  <strong>${lane.label}</strong>
                  <span class="sp-swimlane-count">${lane.items.length}</span>
                </div>
                ${pts > 0 ? `<span class="sp-swimlane-pts">${pts} pts</span>` : ''}
              </div>
              <div class="sp-swimlane-body" data-status-col="${lane.id}" data-sprint-id="${esc(sprint.id)}">
                ${lane.items.length
          ? lane.items.map(t => this.renderActiveWorkItemRow(t, sprint.id)).join('')
          : `<div class="sp-swimlane-empty">Drop items here to move to ${lane.label}</div>`}
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  },

  // ── MODE 2: PROJECT MATRIX ──
  renderActiveProjectMatrix(sprint, tasks) {
    const esc = Utils.escapeHTML;
    const groups = this._groupTasksByProject(tasks);

    return `
      <div class="sp-project-matrix">
        ${groups.map(g => {
      const pColor = g.project.color || 'var(--accent-primary)';
      const grpDone = g.tasks.filter(t => t.status === 'done').length;
      const grpPct = g.tasks.length ? Math.round((grpDone / g.tasks.length) * 100) : 0;
      const grpPts = g.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      return `
            <div class="sp-matrix-project-card" style="--proj-accent: ${pColor};">
              <div class="sp-matrix-project-head">
                <div class="sp-matrix-project-id">
                  <span class="sp-dot" style="background: ${pColor};"></span>
                  <strong>${esc(g.project.name)}</strong>
                  ${g.project.key ? `<span class="sp-mono-key">${esc(g.project.key)}</span>` : ''}
                </div>
                <div class="sp-matrix-project-stats">
                  <span>${grpDone}/${g.tasks.length} done (${grpPct}%)</span>
                  ${grpPts > 0 ? `<span class="sp-pts-badge">${grpPts} pts</span>` : ''}
                </div>
              </div>
              <div class="sp-workitem-table">
                ${g.tasks.map(t => this.renderActiveWorkItemRow(t, sprint.id)).join('')}
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  },

  // ── MODE 3: 4-COLUMN KANBAN BOARD ──
  renderActiveKanbanBoard(sprint, tasks) {
    const esc = Utils.escapeHTML;
    const columns = [
      {
        id: 'todo',
        title: 'To Do',
        accent: 'var(--status-todo)',
        items: tasks.filter(t => t.status === 'todo' || t.status === 'backlog')
      },
      {
        id: 'inprogress',
        title: 'In Progress',
        accent: 'var(--status-inprogress)',
        items: tasks.filter(t => t.status === 'inprogress')
      },
      {
        id: 'inreview',
        title: 'Review / Blocked',
        accent: 'var(--status-inreview)',
        items: tasks.filter(t => t.status === 'inreview' || t.status === 'blocked')
      },
      {
        id: 'done',
        title: 'Done',
        accent: 'var(--status-done)',
        items: tasks.filter(t => t.status === 'done')
      }
    ];

    return `
      <div class="sp-board-grid">
        ${columns.map(col => {
      const colPts = col.items.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      return `
            <div class="sp-board-col" style="--col-accent: ${col.accent};">
              <div class="sp-board-col-head">
                <div class="sp-board-col-title">
                  <span class="sp-board-col-dot" style="background: ${col.accent};"></span>
                  <span>${col.title}</span>
                  <span class="sp-board-col-count">${col.items.length}</span>
                </div>
                ${colPts > 0 ? `<span class="sp-board-col-pts">${colPts} pts</span>` : ''}
              </div>
              <div class="sp-board-col-body" data-status-col="${col.id}" data-sprint-id="${esc(sprint.id)}">
                ${col.items.length
          ? col.items.map(t => this.renderBoardMiniCard(t, sprint.id)).join('')
          : `<div class="sp-board-col-empty">Drop items here</div>`}
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  },

  renderBoardMiniCard(task, sprintId) {
    const esc = Utils.escapeHTML;
    const isDone = task.status === 'done';
    const isBlocked = task.status === 'blocked';
    const project = AppState.projects.find(p => p.id === task.projectId);
    const pColor = (project && project.color) || 'var(--accent-primary)';
    const priorityIcon = this._getPriorityIcon(task.priority);
    const typeIcon = this._getTypeIcon(task.type);

    const subtasks = AppState.tasks.filter(item => item.parentId === task.id);
    const completedSubtasks = subtasks.filter(item => item.status === 'done').length;

    let dueChip = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = !isDone && task.status !== 'cancelled' && due < today;
      dueChip = `<span class="sp-mini-due ${overdue ? 'is-overdue' : ''}"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>`;
    }

    return `
      <div class="sp-board-card backlog-item-row ${isDone ? 'is-done' : ''} ${isBlocked ? 'is-blocked' : ''}"
           style="--card-proj-color: ${pColor};"
           draggable="true" data-task-id="${esc(task.id)}" data-current-sprint="${esc(sprintId)}">
        <div class="sp-board-card-top">
          <div class="sp-board-card-id">
            <button type="button" class="sp-row-check ${isDone ? 'is-checked' : ''}" data-sprint-action="toggle-done" aria-pressed="${isDone}" title="${isDone ? 'Reopen item' : 'Mark done'}">
              ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
            </button>
            <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
            <span class="sp-mono-key" data-sprint-action="open">${esc(task.key)}</span>
          </div>
          <div class="sp-board-card-right">
            <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
            <button type="button" class="sp-card-unassign btn-remove-from-sprint" data-task-id="${esc(task.id)}" title="Move back to backlog">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div class="sp-board-card-title" data-sprint-action="open">${esc(task.title)}</div>

        <div class="sp-board-card-foot">
          <div class="sp-board-card-badges">
            ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints} pts</span>` : ''}
            ${subtasks.length ? `<span class="sp-chip"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
            ${dueChip}
          </div>
          ${StatusControl.pillHTML(task)}
        </div>
      </div>
    `;
  },

  renderActiveWorkItemRow(task, sprintId) {
    const esc = Utils.escapeHTML;
    const isDone = task.status === 'done';
    const project = AppState.projects.find(p => p.id === task.projectId);
    const pColor = (project && project.color) || 'var(--accent-primary)';
    const subtasks = AppState.tasks.filter(item => item.parentId === task.id);
    const completedSubtasks = subtasks.filter(item => item.status === 'done').length;
    const typeIcon = this._getTypeIcon(task.type);
    const priorityIcon = this._getPriorityIcon(task.priority);

    let dueTag = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = !isDone && task.status !== 'cancelled' && due < today;
      dueTag = `<span class="sp-pill ${overdue ? 'tone-danger' : 'tone-neutral'}"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>`;
    }

    return `
      <div class="sp-workitem-row backlog-item-row ${isDone ? 'is-done' : ''}"
           style="--row-proj-color: ${pColor};"
           draggable="true" data-task-id="${esc(task.id)}" data-current-sprint="${esc(sprintId)}">
        <span class="sp-row-drag" title="Drag to change status or move sprint"><i class="fa-solid fa-grip-vertical"></i></span>
        <button type="button" class="sp-row-check ${isDone ? 'is-checked' : ''}" data-sprint-action="toggle-done" aria-pressed="${isDone}" aria-label="${isDone ? 'Mark as incomplete' : 'Mark as done'}">
          ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
        </button>
        <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
        <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
        <span class="sp-mono-key" data-sprint-action="open">${esc(task.key)}</span>
        <span class="sp-row-title" data-sprint-action="open">${esc(task.title)}</span>

        <div class="sp-row-meta">
          ${project ? `<span class="sp-chip"><span class="sp-dot" style="background:${pColor}"></span>${esc(project.key || project.name)}</span>` : ''}
          ${subtasks.length ? `<span class="sp-chip" title="Subtasks"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
          ${dueTag}
          ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints} pts</span>` : ''}
          ${StatusControl.pillHTML(task)}
          <button type="button" class="sp-row-remove btn-remove-from-sprint" data-task-id="${esc(task.id)}" title="Move back to backlog">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `;
  },

  // ── UPCOMING SPRINT CARD ──
  renderCompressedUpcomingSprint(sprint, sprintTasks, index = 0) {
    const esc = Utils.escapeHTML;
    const sortedTasks = [...sprintTasks].sort((a, b) => this._sortByItemId(a, b));
    const total = sortedTasks.length;
    const totalPoints = sortedTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const sprintProject = sprint.projectId ? AppState.projects.find(p => p.id === sprint.projectId) : null;
    const accentColor = (sprintProject && sprintProject.color) || 'var(--accent-primary)';
    const isAutoGlobal = !(AppState.settings && AppState.settings.autoSprintSchedule === false);

    let cycleDays = '';
    if (sprint.startDate && sprint.endDate) {
      const d = Math.max(1, Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000));
      if (!isNaN(d)) cycleDays = `${d}d`;
    }

    const previewKeys = sortedTasks.slice(0, 4);
    const remainingKeys = Math.max(0, sortedTasks.length - previewKeys.length);

    return `
      <article class="sp-upcoming-card sprint-drop-zone ${index === 0 ? 'is-next-up' : ''}"
               style="--card-accent: ${accentColor};"
               data-sprint-id="${esc(sprint.id)}"
               data-open-sprint-popup="${esc(sprint.id)}"
               title="Click to open ${esc(sprint.name)} workspace">
        <div class="sp-up-main">
          <div class="sp-up-head">
            <div class="sp-up-title-group">
              ${index === 0 ? `<span class="sp-pill tone-brand">Next</span>` : `<span class="sp-seq-tag">#${index + 1}</span>`}
              <h4>${esc(sprint.name)}</h4>
              ${sprintProject ? `
                <span class="sp-chip">
                  <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                  ${esc(sprintProject.name)}
                </span>
              ` : ''}
              ${isAutoGlobal && sprint.autoSchedule !== false ? `<span class="sp-pill tone-neutral" title="Scheduled to auto-open on start date">Auto</span>` : ''}
            </div>
            ${sprint.startDate && sprint.endDate ? `
              <span class="sp-up-window">
                ${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)}${cycleDays ? ` (${cycleDays})` : ''}
              </span>
            ` : ''}
          </div>

          ${sprint.goal ? `<p class="sp-up-goal">${esc(sprint.goal)}</p>` : ''}

          <div class="sp-up-footer">
            <div class="sp-up-stats">
              <span class="sp-metric-chip"><strong>${total}</strong> item${total === 1 ? '' : 's'}</span>
              ${totalPoints > 0 ? `<span class="sp-metric-chip is-pts"><strong>${totalPoints}</strong> pts</span>` : ''}
              ${previewKeys.length > 0 ? `
                <div class="sp-key-preview-row">
                  ${previewKeys.map(t => `<span class="sp-key-chip ${t.status === 'done' ? 'is-done' : ''}">${esc(t.key)}</span>`).join('')}
                  ${remainingKeys > 0 ? `<span class="sp-key-more">+${remainingKeys}</span>` : ''}
                </div>
              ` : `<span class="sp-muted-hint">Drop backlog items here to scope</span>`}
            </div>

            <div class="sp-up-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}" title="Add items from backlog">
                <i class="fa-solid fa-plus"></i> Items
              </button>
              <button type="button" class="sp-icon-btn" onclick="event.stopPropagation(); BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit sprint">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button type="button" class="sp-icon-btn" data-open-sprint-popup-btn="${esc(sprint.id)}" title="Open workspace & window">
                <i class="fa-solid fa-up-right-from-square"></i>
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); BacklogView.startSprint('${esc(sprint.id)}')">
                <i class="fa-solid fa-play"></i> Start
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  },

  // ── COMPLETED SPRINT CARD ──
  renderCompressedCompletedSprint(sprint, sprintTasks) {
    const esc = Utils.escapeHTML;
    const stats = this._analyzeCompletedSprint(sprint, sprintTasks);
    const sprintProject = sprint.projectId ? AppState.projects.find(p => p.id === sprint.projectId) : null;

    const ringC = 2 * Math.PI * 18;
    const ringOffset = ringC * (1 - stats.completionPct / 100);
    const ringColor = stats.completionPct >= 80
      ? 'var(--accent-success)'
      : stats.completionPct >= 50
        ? 'var(--accent-warning)'
        : 'var(--accent-primary)';

    return `
      <article class="sp-history-card"
               data-sprint-id="${esc(sprint.id)}"
               data-open-completed-popup="${esc(sprint.id)}"
               title="Open ${esc(sprint.name)} retrospective report">
        <div class="sp-history-top">
          <div class="sp-medallion">
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle class="sp-medallion-track" cx="22" cy="22" r="18"></circle>
              <circle class="sp-medallion-fill" cx="22" cy="22" r="18"
                style="stroke: ${ringColor}; stroke-dasharray: ${ringC.toFixed(2)}; stroke-dashoffset: ${ringOffset.toFixed(2)};"></circle>
            </svg>
            <span>${stats.completionPct}%</span>
          </div>

          <div class="sp-history-info">
            <div class="sp-history-title-row">
              <h4>${esc(sprint.name)}</h4>
              ${sprintProject ? `
                <span class="sp-chip">
                  <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                  ${esc(sprintProject.name)}
                </span>
              ` : ''}
            </div>
            <span class="sp-history-meta">Closed ${esc(stats.completedAtLabel)} · ${stats.durationDays}d cycle</span>
            ${sprint.goal ? `<p class="sp-history-goal">${esc(sprint.goal)}</p>` : ''}
          </div>
        </div>

        <div class="sp-history-bottom">
          <div class="sp-history-metrics">
            <span class="sp-metric-chip is-done"><strong>${stats.completedCount}/${stats.committedCount}</strong> delivered</span>
            <span class="sp-metric-chip is-pts"><strong>${stats.completedPoints}/${stats.committedPoints}</strong> pts</span>
            ${stats.totalTracked > 0 ? `<span class="sp-metric-chip"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(stats.totalTracked)}</span>` : ''}
            ${stats.incompleteCount > 0 ? `<span class="sp-pill tone-warning">${stats.incompleteCount} rolled over</span>` : ''}
          </div>

          <div class="sp-history-actions">
            <button type="button" class="sp-icon-btn" onclick="event.stopPropagation(); AppState.reopenSprint('${esc(sprint.id)}')" title="Reopen sprint">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button type="button" class="sp-icon-btn" onclick="event.stopPropagation(); BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit sprint">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="sp-icon-btn is-danger" onclick="event.stopPropagation(); AppState.deleteSprint('${esc(sprint.id)}')" title="Delete sprint">
              <i class="fa-regular fa-trash-can"></i>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" data-open-completed-popup-btn="${esc(sprint.id)}">
              <i class="fa-solid fa-chart-pie"></i> Report
            </button>
          </div>
        </div>
      </article>
    `;
  },

  // ── POPUP MODAL FOR UPCOMING / ACTIVE SPRINT DETAILS (CYCLE WORKSPACE) ──
  openSprintDetailModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    if (sprint.status === 'completed') {
      this.openSprintReportModal(sprintId);
      return;
    }

    let isScheduleOpen = false;
    let popupSearchQuery = '';

    const renderModalContent = (focusSelector = null) => {
      const freshSprint = AppState.sprints.find(s => s.id === sprintId);
      if (!freshSprint) {
        Modal.close();
        return;
      }

      const esc = Utils.escapeHTML;
      const isActive = freshSprint.status === 'active';
      const sprintTasks = AppState.tasks
        .filter(t => t.sprintId === freshSprint.id)
        .sort((a, b) => this._sortByItemId(a, b));

      const unassignedCount = (AppState.tasks || []).filter(
        t => !t.sprintId && t.status !== 'done' && t.status !== 'cancelled' && (!freshSprint.projectId || t.projectId === freshSprint.projectId)
      ).length;

      const total = sprintTasks.length;
      const doneCount = sprintTasks.filter(t => t.status === 'done').length;
      const activeCount = sprintTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;
      const todoCount = sprintTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
      const blockedCount = sprintTasks.filter(t => t.status === 'blocked').length;
      const progress = total ? Math.round((doneCount / total) * 100) : 0;

      const totalPoints = sprintTasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      const donePoints = sprintTasks.filter(t => t.status === 'done').reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      const totalEst = sprintTasks.reduce((s, t) => s + (Number(t.estimate) || 0), 0);
      const totalTracked = sprintTasks.reduce((s, t) => s + (Number(t.trackedTime) || 0), 0);

      const sprintProject = freshSprint.projectId ? AppState.projects.find(p => p.id === freshSprint.projectId) : null;
      const { startMs, endMs } = AppState.getSprintWindowMs(freshSprint);
      const startDateLabel = Utils.formatDate(startMs);
      const startTimeHMS = Utils.formatTimeHMS(startMs);
      const endDateLabel = Utils.formatDate(endMs);
      const endTimeHMS = Utils.formatTimeHMS(endMs);

      let cycleDays = 14;
      let timeElapsedPct = 0;
      let timingLabel = `${cycleDays}d cycle`;
      let timingTone = 'tone-brand';
      const nowMs = Date.now();
      if (startMs && endMs) {
        const span = Math.max(86400000, endMs - startMs);
        cycleDays = Math.max(1, Math.round(span / 86400000));
        if (isActive) {
          timeElapsedPct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / span) * 100)));
          const diff = Math.ceil((endMs - nowMs) / 86400000);
          timingTone = diff < 0 ? 'tone-danger' : diff <= 3 ? 'tone-warning' : 'tone-brand';
          timingLabel = diff > 0 ? `${diff}d left` : diff === 0 ? 'Ends today' : `${Math.abs(diff)}d overdue`;
        } else {
          const daysUntil = Math.ceil((startMs - nowMs) / 86400000);
          timingLabel = daysUntil > 0 ? `Starts in ${daysUntil}d` : daysUntil === 0 ? 'Starts today' : `${cycleDays}d planned`;
        }
      }

      const filteredPopupTasks = !popupSearchQuery.trim()
        ? sprintTasks
        : sprintTasks.filter(t => {
          const q = popupSearchQuery.trim().toLowerCase();
          return (t.key && t.key.toLowerCase().includes(q)) || (t.title && t.title.toLowerCase().includes(q));
        });

      const projGroups = this._groupTasksByProject(filteredPopupTasks);
      const showProjectGroups = projGroups.length > 1;
      const defaultProjectId = freshSprint.projectId || AppState.selectedProjectId || (AppState.projects[0] && AppState.projects[0].id) || '';
      const showQuickProjectSelect = !freshSprint.projectId && (AppState.projects || []).length > 1;

      // Scenario-driven KPI cards: omit cards that carry no signal (e.g. 0/0 pts or 0m tracked)
      const kpiCards = [];
      if (total > 0) {
        kpiCards.push({
          label: 'Completion',
          value: `${progress}%`,
          sub: `${doneCount} of ${total} items done`
        });
        const breakdownParts = [`${todoCount} to do`, `${activeCount} active`];
        if (blockedCount > 0) breakdownParts.push(`${blockedCount} blocked`);
        kpiCards.push({
          label: 'Work Mix',
          value: `${todoCount + activeCount + blockedCount} <small>open</small>`,
          sub: breakdownParts.join(' · ')
        });
        if (totalPoints > 0) {
          kpiCards.push({
            label: 'Story Points',
            value: `${donePoints}<small>/${totalPoints} pts</small>`,
            sub: `${Math.max(0, totalPoints - donePoints)} pts remaining`
          });
        }
        if (totalTracked > 0 || totalEst > 0) {
          kpiCards.push({
            label: 'Time Logged',
            value: `${Utils.formatMinutes(totalTracked)}`,
            sub: totalEst ? `of ${Utils.formatMinutes(totalEst)} estimated` : 'Logged across tasks'
          });
        } else {
          kpiCards.push({
            label: isActive ? 'Elapsed Window' : 'Duration',
            value: isActive ? `${timeElapsedPct}%` : `${cycleDays}d`,
            sub: timingLabel
          });
        }
      }

      const hasAnotherActiveSprint = !isActive && AppState.sprints.some(s => s.status === 'active' && s.id !== freshSprint.id);

      const bodyHTML = `
        <div class="sp-detail-popup" data-sp-popup-root="1">
          <!-- TOP CONTEXT & SCHEDULE SUMMARY -->
          <div class="sp-popup-summary-bar">
            <div class="sp-popup-summary-left">
              <div class="sp-popup-meta-row">
                <span class="sp-pill ${isActive ? 'tone-success' : 'tone-brand'}">
                  ${isActive ? '<span class="sp-live-dot"></span> Active Sprint' : 'Planned Sprint'}
                </span>
                <span class="sp-pill ${timingTone}">${esc(timingLabel)}</span>
                ${sprintProject ? `
                  <span class="sp-chip">
                    <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                    ${esc(sprintProject.name)}
                  </span>
                ` : ''}
                ${freshSprint.autoSchedule !== false && !(AppState.settings && AppState.settings.autoSprintSchedule === false)
          ? `<span class="sp-pill tone-neutral" title="Automatically transitions based on start/end timestamps">Auto-Pilot</span>`
          : ''}
              </div>

              <div class="sp-popup-schedule-row">
                <span class="sp-popup-dates">
                  <i class="fa-regular fa-calendar"></i>
                  <span class="sp-popup-dt-pair">
                    <strong>${esc(startDateLabel)}</strong>
                    <code class="sp-hms-badge" title="Start time (24h HH:MM:SS)">${esc(startTimeHMS)}</code>
                  </span>
                  <span class="sp-popup-dt-sep">→</span>
                  <span class="sp-popup-dt-pair">
                    <strong>${esc(endDateLabel)}</strong>
                    <code class="sp-hms-badge" title="End time (24h HH:MM:SS)">${esc(endTimeHMS)}</code>
                  </span>
                  <span class="sp-popup-dt-days">(${cycleDays}d)</span>
                </span>
                <button type="button" class="sp-schedule-toggle-btn ${isScheduleOpen ? 'is-open' : ''}" id="popup-btn-toggle-schedule">
                  <i class="fa-regular fa-clock"></i>
                  <span>${isScheduleOpen ? 'Hide Editor' : 'Adjust Window'}</span>
                </button>
              </div>

              ${freshSprint.goal ? `<p class="sp-popup-goal">${esc(freshSprint.goal)}</p>` : ''}
            </div>

            <div class="sp-popup-summary-actions">
              ${unassignedCount > 0 ? `
                <button type="button" class="btn btn-secondary btn-sm" id="popup-btn-add-existing">
                  <i class="fa-solid fa-arrow-down-short-wide"></i> Pull Backlog (${unassignedCount})
                </button>
              ` : ''}
              <button type="button" class="btn btn-secondary btn-sm" id="popup-btn-edit-sprint" title="Edit sprint name, goal, or auto-schedule">
                <i class="fa-solid fa-pen"></i> Settings
              </button>
              <button type="button" class="btn btn-primary btn-sm" id="popup-btn-new-issue" title="Open full task modal">
                <i class="fa-solid fa-plus"></i> Full Task
              </button>
            </div>
          </div>

          <!-- COLLAPSIBLE PRECISION HH:MM:SS WINDOW EDITOR -->
          <div class="sp-popup-datetime-bar ${isScheduleOpen ? '' : 'sp-is-hidden'}" data-sp-schedule-drawer="1" aria-label="Edit sprint schedule">
            <div class="sp-popup-dt-group">
              <label class="sp-popup-dt-field-label" for="popup-sprint-start-date">
                <i class="fa-regular fa-calendar-check"></i> Start Date &amp; Time (HH:MM:SS)
              </label>
              <div class="sp-popup-dt-inputs">
                <input type="date" id="popup-sprint-start-date" class="form-input sp-popup-date-input" value="${esc(Utils.toDateInputValue(startMs))}" aria-label="Sprint start date">
                <input type="time" id="popup-sprint-start-time" class="form-input sp-popup-time-input" step="1" value="${esc(startTimeHMS)}" aria-label="Sprint start time HH:MM:SS">
                <span class="sp-hms-readout" id="popup-start-hms-readout" title="24-hour HH:MM:SS">${esc(startTimeHMS)}</span>
              </div>
            </div>

            <span class="sp-popup-dt-bar-arrow"><i class="fa-solid fa-arrow-right-long"></i></span>

            <div class="sp-popup-dt-group">
              <label class="sp-popup-dt-field-label" for="popup-sprint-end-date">
                <i class="fa-solid fa-flag-checkered"></i> End Date &amp; Time (HH:MM:SS)
              </label>
              <div class="sp-popup-dt-inputs">
                <input type="date" id="popup-sprint-end-date" class="form-input sp-popup-date-input" value="${esc(Utils.toDateInputValue(endMs))}" aria-label="Sprint end date">
                <input type="time" id="popup-sprint-end-time" class="form-input sp-popup-time-input" step="1" value="${esc(endTimeHMS)}" aria-label="Sprint end time HH:MM:SS">
                <span class="sp-hms-readout" id="popup-end-hms-readout" title="24-hour HH:MM:SS">${esc(endTimeHMS)}</span>
              </div>
            </div>

            <button type="button" class="btn btn-primary btn-sm sp-popup-dt-save-btn" id="popup-btn-save-datetime">
              <i class="fa-solid fa-check"></i> Apply Window
            </button>
          </div>

          <!-- SCENARIO-ADAPTIVE KPI BAR + PROGRESS RAIL (ONLY WHEN TASKS EXIST) -->
          ${total > 0 ? `
            <div class="sc-kpi-wrap">
              <div class="sc-kpi-grid" style="--kpi-cols:${kpiCards.length};">
                ${kpiCards.map(c => `
                  <div class="sc-kpi-card">
                    <span class="sc-kpi-label">${c.label}</span>
                    <strong class="sc-kpi-value">${c.value}</strong>
                    <span class="sc-kpi-sub">${esc(c.sub)}</span>
                  </div>
                `).join('')}
              </div>
              <div class="sp-progress-rail" title="${progress}% completed">
                <div class="sp-progress-fill" style="width:${progress}%;"></div>
              </div>
            </div>
          ` : ''}

          <!-- INLINE QUICK-ADD INSIDE WORKSPACE POPUP -->
          <form id="popup-quick-add-form" class="sp-composer">
            <span class="sp-composer-icon"><i class="fa-solid fa-plus"></i></span>
            <input type="text" id="popup-quick-title" placeholder="Quick-add task to ${esc(freshSprint.name)}... (Press Enter)" maxlength="180" autocomplete="off">
            <div class="sp-composer-controls">
              ${showQuickProjectSelect ? `
                <select id="popup-quick-project" aria-label="Project">
                  ${AppState.projects.map(p => `<option value="${esc(p.id)}" ${p.id === defaultProjectId ? 'selected' : ''}>${esc(p.key || p.name)}</option>`).join('')}
                </select>
              ` : ''}
              <select id="popup-quick-priority" aria-label="Priority">
                <option value="high">High</option>
                <option value="medium" selected>Medium</option>
                <option value="low">Low</option>
                <option value="critical">Critical</option>
              </select>
              <select id="popup-quick-points" aria-label="Story points">
                <option value="0">0 pts</option>
                <option value="1">1 pt</option>
                <option value="2">2 pts</option>
                <option value="3" selected>3 pts</option>
                <option value="5">5 pts</option>
                <option value="8">8 pts</option>
              </select>
              <button type="submit" class="btn btn-primary btn-sm">Add</button>
            </div>
          </form>

          <!-- COMMITTED WORK ITEMS -->
          <div class="sc-tasks-section">
            <div class="sc-tasks-section-head">
              <h4>Scoped Work Items <span class="sp-count-pill">${total}</span></h4>
              ${total >= 6 ? `
                <div class="sp-popup-search">
                  <i class="fa-solid fa-magnifying-glass"></i>
                  <input type="text" id="popup-task-search" value="${esc(popupSearchQuery)}" placeholder="Filter cycle tasks..." aria-label="Filter tasks in sprint">
                </div>
              ` : ''}
            </div>

            ${total === 0 ? `
              <div class="sc-empty-box">
                <strong>No work items in ${esc(freshSprint.name)} yet</strong>
                <p>Type a task above to create one immediately, or pull existing items from your backlog.</p>
                ${unassignedCount > 0 ? `
                  <button type="button" class="btn btn-secondary btn-sm" id="popup-empty-pull-btn">
                    <i class="fa-solid fa-arrow-down-short-wide"></i> Pull from Backlog (${unassignedCount})
                  </button>
                ` : ''}
              </div>
            ` : filteredPopupTasks.length === 0 ? `
              <div class="sc-empty-box">
                <strong>No tasks match "${esc(popupSearchQuery)}"</strong>
              </div>
            ` : showProjectGroups ? `
              <div class="sc-project-groups">
                ${projGroups.map(group => {
            const p = group.project;
            const pColor = p.color || 'var(--accent-primary)';
            const grpPoints = group.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
            const grpDone = group.tasks.filter(t => t.status === 'done').length;
            return `
                    <div class="sc-project-group">
                      <div class="sc-project-group-header">
                        <div class="sc-project-group-left">
                          <span class="sc-dot" style="background: ${pColor};"></span>
                          <strong>${esc(p.name)}</strong>
                          ${p.key ? `<span class="sc-proj-key">${esc(p.key)}</span>` : ''}
                        </div>
                        <span class="sc-proj-meta">${grpDone}/${group.tasks.length} done${grpPoints > 0 ? ` · ${grpPoints} pts` : ''}</span>
                      </div>
                      <div class="sc-task-list">
                        ${group.tasks.map(t => this._renderPopupInteractiveTaskRow(t)).join('')}
                      </div>
                    </div>
                  `;
          }).join('')}
              </div>
            ` : `
              <div class="sc-project-group">
                <div class="sc-task-list">
                  ${filteredPopupTasks.map(t => this._renderPopupInteractiveTaskRow(t)).join('')}
                </div>
              </div>
            `}
          </div>
        </div>
      `;

      const footerButtons = [
        {
          text: '<i class="fa-regular fa-trash-can"></i> Delete Sprint',
          class: 'btn-ghost is-danger sp-footer-danger-left',
          onClick: () => {
            Modal.confirm(
              `Delete ${freshSprint.name}?`,
              'This removes the sprint and moves any open tasks back to the backlog.',
              () => {
                AppState.deleteSprint(freshSprint.id);
              }
            );
          }
        }
      ];

      footerButtons.push({
        text: 'Close',
        class: 'btn-secondary',
        onClick: () => Modal.close()
      });

      if (isActive) {
        footerButtons.push({
          text: '<i class="fa-solid fa-flag-checkered"></i> Complete Sprint',
          class: 'btn-primary',
          onClick: () => {
            Modal.close();
            this.completeSprint(freshSprint.id);
          }
        });
      } else {
        footerButtons.push({
          text: hasAnotherActiveSprint
            ? '<i class="fa-solid fa-play"></i> Start (Active Running)'
            : '<i class="fa-solid fa-play"></i> Start Sprint',
          class: hasAnotherActiveSprint ? 'btn-secondary' : 'btn-primary',
          onClick: () => {
            const started = AppState.startSprint(freshSprint.id);
            if (started) Modal.close();
          }
        });
      }

      Modal.open({
        title: `<i class="fa-regular fa-calendar-check"></i> Cycle Workspace: ${esc(freshSprint.name)}`,
        body: bodyHTML,
        size: 'xl',
        footerButtons
      });

      setTimeout(() => {
        const modalRoot = document.querySelector('.sp-detail-popup');
        if (!modalRoot) return;

        if (focusSelector) {
          const elToFocus = modalRoot.querySelector(focusSelector);
          if (elToFocus) {
            elToFocus.focus();
            if (typeof elToFocus.setSelectionRange === 'function' && elToFocus.value) {
              const len = elToFocus.value.length;
              try { elToFocus.setSelectionRange(len, len); } catch (_) { }
            }
          }
        }

        const toggleScheduleBtn = modalRoot.querySelector('#popup-btn-toggle-schedule');
        const scheduleDrawer = modalRoot.querySelector('[data-sp-schedule-drawer]');
        if (toggleScheduleBtn && scheduleDrawer) {
          toggleScheduleBtn.addEventListener('click', () => {
            isScheduleOpen = !isScheduleOpen;
            scheduleDrawer.classList.toggle('sp-is-hidden', !isScheduleOpen);
            toggleScheduleBtn.classList.toggle('is-open', isScheduleOpen);
            const lbl = toggleScheduleBtn.querySelector('span');
            if (lbl) lbl.textContent = isScheduleOpen ? 'Hide Editor' : 'Adjust Window';
          });
        }

        const openAddExisting = () => {
          Modal.close();
          this.openAddExistingTasksModal(freshSprint.id);
        };
        const addExistingBtn = modalRoot.querySelector('#popup-btn-add-existing');
        if (addExistingBtn) addExistingBtn.addEventListener('click', openAddExisting);
        const emptyPullBtn = modalRoot.querySelector('#popup-empty-pull-btn');
        if (emptyPullBtn) emptyPullBtn.addEventListener('click', openAddExisting);

        const newIssueBtn = modalRoot.querySelector('#popup-btn-new-issue');
        if (newIssueBtn) {
          newIssueBtn.addEventListener('click', () => {
            Modal.close();
            TaskModal.openCreate({ sprintId: freshSprint.id, projectId: freshSprint.projectId || '' });
          });
        }

        const editSprintBtn = modalRoot.querySelector('#popup-btn-edit-sprint');
        if (editSprintBtn) {
          editSprintBtn.addEventListener('click', () => {
            Modal.close();
            this.openEditSprintModal(freshSprint.id);
          });
        }

        const quickAddForm = modalRoot.querySelector('#popup-quick-add-form');
        if (quickAddForm) {
          quickAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleEl = quickAddForm.querySelector('#popup-quick-title');
            const projEl = quickAddForm.querySelector('#popup-quick-project');
            const prioEl = quickAddForm.querySelector('#popup-quick-priority');
            const ptsEl = quickAddForm.querySelector('#popup-quick-points');
            const title = titleEl ? titleEl.value.trim() : '';
            if (!title) return;

            const projectId = (projEl && projEl.value)
              || freshSprint.projectId
              || AppState.selectedProjectId
              || (AppState.projects[0] && AppState.projects[0].id)
              || 'proj_web';

            AppState.createTask({
              title,
              projectId,
              sprintId: freshSprint.id,
              priority: (prioEl && prioEl.value) || 'medium',
              storyPoints: ptsEl ? Number(ptsEl.value) || 0 : 0,
              status: 'todo',
              type: 'task'
            });
            Toast.success(`Added item to ${freshSprint.name}`);
            renderModalContent('#popup-quick-title');
          });
        }

        const popupSearchInput = modalRoot.querySelector('#popup-task-search');
        if (popupSearchInput) {
          popupSearchInput.addEventListener('input', (e) => {
            popupSearchQuery = e.target.value || '';
            renderModalContent('#popup-task-search');
          });
        }

        const startDateInput = modalRoot.querySelector('#popup-sprint-start-date');
        const startTimeInput = modalRoot.querySelector('#popup-sprint-start-time');
        const endDateInput = modalRoot.querySelector('#popup-sprint-end-date');
        const endTimeInput = modalRoot.querySelector('#popup-sprint-end-time');
        const startReadout = modalRoot.querySelector('#popup-start-hms-readout');
        const endReadout = modalRoot.querySelector('#popup-end-hms-readout');
        const saveDateTimeBtn = modalRoot.querySelector('#popup-btn-save-datetime');

        if (startTimeInput && startReadout) {
          startTimeInput.addEventListener('input', () => {
            startReadout.textContent = Utils.parseTimeHMS(startTimeInput.value, '00:00:00').formatted;
          });
        }
        if (endTimeInput && endReadout) {
          endTimeInput.addEventListener('input', () => {
            endReadout.textContent = Utils.parseTimeHMS(endTimeInput.value, '23:59:59').formatted;
          });
        }

        if (saveDateTimeBtn) {
          saveDateTimeBtn.addEventListener('click', () => {
            const sDateVal = startDateInput ? startDateInput.value : '';
            const sTimeVal = startTimeInput ? startTimeInput.value : '00:00:00';
            const eDateVal = endDateInput ? endDateInput.value : '';
            const eTimeVal = endTimeInput ? endTimeInput.value : '23:59:59';

            const newStartIso = Utils.combineDateAndTimeISO(sDateVal, sTimeVal, '00:00:00');
            const newEndIso = Utils.combineDateAndTimeISO(eDateVal, eTimeVal, '23:59:59');

            if (!newStartIso || !newEndIso) {
              Toast.warning('Please enter valid start and end dates and HH:MM:SS times.');
              return;
            }
            if (new Date(newEndIso).getTime() <= new Date(newStartIso).getTime()) {
              Toast.warning('End date and time (HH:MM:SS) must be after start date and time.');
              return;
            }

            AppState.updateSprint(freshSprint.id, {
              startDate: newStartIso,
              endDate: newEndIso,
              hasCustomTime: true
            });
            isScheduleOpen = false;
            Toast.success(`Updated window to ${Utils.formatDate(newStartIso)} ${Utils.formatTimeHMS(newStartIso)} → ${Utils.formatDate(newEndIso)} ${Utils.formatTimeHMS(newEndIso)}`);
            renderModalContent();
          });
        }

        modalRoot.querySelectorAll('[data-popup-toggle-done]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tId = btn.dataset.popupToggleDone;
            const task = AppState.tasks.find(t => t.id === tId);
            if (!task) return;
            AppState.updateTask(tId, { status: task.status === 'done' ? 'todo' : 'done' });
            renderModalContent();
          });
        });

        modalRoot.querySelectorAll('[data-popup-task-open]').forEach(el => {
          el.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('select')) return;
            const tId = el.dataset.popupTaskOpen;
            Modal.close();
            if (tId) TaskModal.openDetail(tId);
          });
        });

        modalRoot.querySelectorAll('[data-popup-status-select]').forEach(sel => {
          sel.addEventListener('change', (e) => {
            e.stopPropagation();
            const tId = sel.dataset.popupStatusSelect;
            const newStatus = sel.value;
            if (tId && newStatus) {
              AppState.updateTask(tId, { status: newStatus });
              renderModalContent();
            }
          });
        });

        modalRoot.querySelectorAll('[data-popup-remove-task]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tId = btn.dataset.popupRemoveTask;
            if (tId) {
              AppState.updateTask(tId, { sprintId: null });
              Toast.info('Moved work item to backlog');
              renderModalContent();
            }
          });
        });
      }, 30);
    };

    renderModalContent();
  },

  _renderPopupInteractiveTaskRow(task) {
    const esc = Utils.escapeHTML;
    const isDone = task.status === 'done';
    const typeIcon = this._getTypeIcon(task.type);
    const priorityIcon = this._getPriorityIcon(task.priority);

    const subtasks = AppState.tasks.filter(item => item.parentId === task.id);
    const completedSubtasks = subtasks.filter(item => item.status === 'done').length;

    let dueChip = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = !isDone && task.status !== 'cancelled' && due < today;
      dueChip = `<span class="sp-pill ${overdue ? 'tone-danger' : 'tone-neutral'}"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>`;
    }

    const statuses = [
      { id: 'backlog', label: 'Backlog' },
      { id: 'todo', label: 'To Do' },
      { id: 'inprogress', label: 'In Progress' },
      { id: 'inreview', label: 'In Review' },
      { id: 'blocked', label: 'Blocked' },
      { id: 'done', label: 'Done' }
    ];

    return `
      <div class="sc-task-row ${isDone ? 'is-done' : ''}" data-popup-task-open="${esc(task.id)}">
        <button type="button" class="sp-row-check ${isDone ? 'is-checked' : ''}" data-popup-toggle-done="${esc(task.id)}" aria-pressed="${isDone}" title="${isDone ? 'Reopen task' : 'Mark done'}">
          ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
        </button>
        <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
        <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
        <span class="sc-task-key">${esc(task.key)}</span>
        <span class="sc-task-title">${esc(task.title)}</span>

        <div class="sc-task-meta">
          ${subtasks.length ? `<span class="sp-chip" title="Subtasks"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
          ${dueChip}
          ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints} pts</span>` : ''}
          <select class="sp-popup-status-select" data-popup-status-select="${esc(task.id)}" aria-label="Change status for ${esc(task.key)}">
            ${statuses.map(s => `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <button type="button" class="sp-popup-remove-btn" data-popup-remove-task="${esc(task.id)}" title="Move back to backlog">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `;
  },

  // ── COMPLETED SPRINT ANALYTICS ──
  _analyzeCompletedSprint(sprint, currentSprintTasks) {
    const snap = sprint.completionSnapshot || null;
    const taskMap = new Map();

    (currentSprintTasks || []).forEach(t => taskMap.set(t.id, t));

    if (snap && Array.isArray(snap.committedTaskIds)) {
      snap.committedTaskIds.forEach(id => {
        if (!taskMap.has(id)) {
          const found = AppState.tasks.find(t => t.id === id);
          if (found && (!AppState.selectedProjectId || found.projectId === AppState.selectedProjectId)) {
            taskMap.set(id, found);
          }
        }
      });
    }

    const allTasks = [...taskMap.values()].sort((a, b) => this._sortByItemId(a, b));
    const rolledOverIdSet = new Set(snap && Array.isArray(snap.incompleteTaskIds) ? snap.incompleteTaskIds : []);

    const completedTasks = allTasks.filter(t => !rolledOverIdSet.has(t.id) && (t.status === 'done' || (t.sprintId === sprint.id && t.status === 'done')));
    const incompleteTasks = allTasks.filter(t => rolledOverIdSet.has(t.id) || (t.sprintId === sprint.id && t.status !== 'done'));

    const committedCount = snap && !AppState.selectedProjectId ? Math.max(snap.committedCount || 0, allTasks.length) : allTasks.length;
    const completedCount = completedTasks.length;
    const incompleteCount = incompleteTasks.length;
    const completionPct = committedCount ? Math.round((completedCount / committedCount) * 100) : 0;

    const completedPoints = completedTasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
    const incompletePoints = incompleteTasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
    const committedPoints = completedPoints + incompletePoints;
    const pointsPct = committedPoints ? Math.round((completedPoints / committedPoints) * 100) : (completionPct || 0);

    const totalTracked = allTasks.reduce((s, t) => s + (Number(t.trackedTime) || 0), 0);
    const totalEstimate = allTasks.reduce((s, t) => s + (Number(t.estimate) || 0), 0);

    let durationDays = 14;
    if (sprint.startDate && sprint.endDate) {
      const d = Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000);
      if (!isNaN(d) && d > 0) durationDays = d;
    }

    const completedAtIso = sprint.completedAt || (snap && snap.completedAt) || sprint.endDate;
    const completedAtLabel = completedAtIso ? Utils.formatDate(completedAtIso) : 'Completed';
    const movedToSprint = snap && snap.movedToSprintId ? AppState.sprints.find(s => s.id === snap.movedToSprintId) : null;

    const projGroups = this._groupTasksByProject(allTasks);
    const projectBreakdown = projGroups.map(g => {
      const doneInProj = g.tasks.filter(t => !rolledOverIdSet.has(t.id) && t.status === 'done');
      const ptsTotal = g.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      const ptsDone = doneInProj.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
      const tracked = g.tasks.reduce((s, t) => s + (Number(t.trackedTime) || 0), 0);
      return {
        project: g.project,
        total: g.tasks.length,
        done: doneInProj.length,
        pct: g.tasks.length ? Math.round((doneInProj.length / g.tasks.length) * 100) : 0,
        ptsTotal,
        ptsDone,
        tracked
      };
    });

    return {
      allTasks,
      completedTasks,
      incompleteTasks,
      committedCount,
      completedCount,
      incompleteCount,
      completionPct,
      committedPoints,
      completedPoints,
      incompletePoints,
      pointsPct,
      totalTracked,
      totalEstimate,
      durationDays,
      completedAtLabel,
      movedToSprint,
      projectBreakdown
    };
  },

  _renderCompletedSprintTaskRow(task, isRolledOver = false) {
    const esc = Utils.escapeHTML;
    const typeIcon = {
      bug: 'fa-circle-dot',
      story: 'fa-bookmark',
      epic: 'fa-bolt',
      subtask: 'fa-network-wired'
    }[task.type] || 'fa-square-check';

    const priorityIcon = {
      critical: 'fa-solid fa-angles-up',
      highest: 'fa-solid fa-angles-up',
      high: 'fa-solid fa-angle-up',
      medium: 'fa-solid fa-equals',
      low: 'fa-solid fa-angle-down',
      lowest: 'fa-solid fa-angles-down'
    }[task.priority] || 'fa-solid fa-equals';

    const subtasks = AppState.tasks.filter(item => item.parentId === task.id);
    const completedSubtasks = subtasks.filter(item => item.status === 'done').length;
    const currentSprint = task.sprintId ? AppState.sprints.find(s => s.id === task.sprintId) : null;

    return `
  <div class="sc-task-row ${task.status === 'done' ? 'is-done' : ''}" data-completed-task-open="${esc(task.id)}" title="Open ${esc(task.key)}">
        <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
        <span class="sc-task-key">${esc(task.key)}</span>
        <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
        <span class="sc-task-title">${esc(task.title)}</span>

        <div class="sc-task-meta">
          ${subtasks.length ? `<span class="sp-chip"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
          ${task.trackedTime > 0 || task.estimate > 0 ? `<span class="sp-chip">${Utils.formatMinutes(task.trackedTime || 0)}${task.estimate ? ` / ${Utils.formatMinutes(task.estimate)}` : ''}</span>` : ''}
          ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints} pts</span>` : ''}
          ${task.completedAt ? `<span class="sp-chip">Done ${Utils.formatDate(task.completedAt)}</span>` : ''}
          ${isRolledOver ? `<span class="sp-pill tone-warning">${currentSprint ? `In ${esc(currentSprint.name)}` : 'In Backlog'}</span>` : ''}
          ${typeof StatusControl !== 'undefined' ? StatusControl.pillHTML(task) : `<span class="sp-pill tone-neutral">${esc(task.status)}</span>`}
        </div>
      </div>
  `;
  },

  // ── POPUP MODAL FOR COMPLETED SPRINT REPORT ──
  openSprintReportModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const esc = Utils.escapeHTML;
    const sprintTasks = AppState.tasks.filter(t => t.sprintId === sprint.id);
    const stats = this._analyzeCompletedSprint(sprint, sprintTasks);
    const completedGroups = this._groupTasksByProject(stats.completedTasks);
    const incompleteGroups = this._groupTasksByProject(stats.incompleteTasks);
    const { startMs, endMs } = AppState.getSprintWindowMs(sprint);
    const startDateLabel = Utils.formatDate(startMs);
    const startTimeHMS = Utils.formatTimeHMS(startMs);
    const endDateLabel = Utils.formatDate(endMs);
    const endTimeHMS = Utils.formatTimeHMS(endMs);

    const bodyHTML = `
  <div class="sprint-report-modal">
        <div class="sprint-report-banner">
          <div>
            <div class="sprint-report-dates">
              <span class="sp-pill tone-success"><i class="fa-solid fa-check"></i> Completed Cycle</span>
              <span class="sp-popup-dates">
                <i class="fa-regular fa-calendar"></i>
                <span class="sp-popup-dt-pair">
                  <span class="sp-popup-dt-tag">Start:</span>
                  <strong>${esc(startDateLabel)}</strong>
                  <code class="sp-hms-badge" title="Start time (HH:MM:SS)"><i class="fa-regular fa-clock"></i> ${esc(startTimeHMS)}</code>
                </span>
                <span class="sp-popup-dt-sep">→</span>
                <span class="sp-popup-dt-pair">
                  <span class="sp-popup-dt-tag">End:</span>
                  <strong>${esc(endDateLabel)}</strong>
                  <code class="sp-hms-badge" title="End time (HH:MM:SS)"><i class="fa-regular fa-clock"></i> ${esc(endTimeHMS)}</code>
                </span>
                <span class="sp-popup-dt-days">(${stats.durationDays} days)</span>
              </span>
              <span>·</span>
              <span>Closed on ${esc(stats.completedAtLabel)}</span>
            </div>
            ${sprint.goal ? `<p class="sprint-report-goal"><strong>Objective:</strong> ${esc(sprint.goal)}</p>` : ''}
          </div>
          <div class="sprint-report-score">
            <strong>${stats.completionPct}%</strong>
            <span>Delivery Rate</span>
          </div>
        </div>

        <div class="sc-kpi-grid" style="margin-bottom: 1rem;">
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Items Delivered</span>
            <strong class="sc-kpi-value">${stats.completedCount} / ${stats.committedCount}</strong>
            <span class="sc-kpi-sub">${stats.incompleteCount > 0 ? `${stats.incompleteCount} rolled over ${stats.movedToSprint ? `to ${esc(stats.movedToSprint.name)}` : 'to backlog'}` : '100% of committed items delivered'}</span>
          </div>
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Story Points Burned</span>
            <strong class="sc-kpi-value">${stats.completedPoints} / ${stats.committedPoints} pts</strong>
            <span class="sc-kpi-sub">${stats.pointsPct}% point velocity</span>
          </div>
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Time Logged</span>
            <strong class="sc-kpi-value">${Utils.formatMinutes(stats.totalTracked)}</strong>
            <span class="sc-kpi-sub">${stats.totalEstimate ? `Estimated: ${Utils.formatMinutes(stats.totalEstimate)}` : 'Logged across sprint items'}</span>
          </div>
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Projects Covered</span>
            <strong class="sc-kpi-value">${stats.projectBreakdown.length}</strong>
            <span class="sc-kpi-sub">${stats.allTasks.length} total work items</span>
          </div>
        </div>

        ${stats.projectBreakdown.length > 0 ? `
          <div class="sprint-report-section">
            <h4>Project Delivery Breakdown</h4>
            <div class="sprint-report-table-wrap">
              <table class="sprint-report-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Delivered</th>
                    <th>Story Points</th>
                    <th>Time Logged</th>
                    <th>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.projectBreakdown.map(pb => `
                    <tr>
                      <td>
                        <span class="sc-dot" style="background:${pb.project.color || '#388bfd'};display:inline-block;margin-right:6px;"></span>
                        <strong>${esc(pb.project.name)}</strong>
                        ${pb.project.key ? `<span class="sc-proj-key" style="margin-left:4px;">${esc(pb.project.key)}</span>` : ''}
                      </td>
                      <td>${pb.done} / ${pb.total} items</td>
                      <td>${pb.ptsDone} / ${pb.ptsTotal} pts</td>
                      <td>${Utils.formatMinutes(pb.tracked)}</td>
                      <td><strong>${pb.pct}%</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''
      }

<div class="sprint-report-section">
  <div class="sc-tasks-section-head">
    <h4>Completed Work Items (${stats.completedTasks.length})</h4>
    <span>Grouped by project · Sorted by key</span>
  </div>
  ${completedGroups.length ? `
            <div class="sc-project-groups">
              ${completedGroups.map(group => {
        const grpPts = group.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
        return `
                  <div class="sc-project-group">
                    <div class="sc-project-group-header">
                      <div class="sc-project-group-left">
                        <span class="sc-dot" style="background: ${group.project.color || '#388bfd'};"></span>
                        <strong>${esc(group.project.name)}</strong>
                        ${group.project.key ? `<span class="sc-proj-key">${esc(group.project.key)}</span>` : ''}
                      </div>
                      <span class="sc-proj-meta">${group.tasks.length} item${group.tasks.length === 1 ? '' : 's'} · ${grpPts} pts</span>
                    </div>
                    <div class="sc-task-list">
                      ${group.tasks.map(t => this._renderCompletedSprintTaskRow(t, false)).join('')}
                    </div>
                  </div>
                `;
      }).join('')}
            </div>
          ` : '<div class="sc-empty-box">No completed work items in this sprint.</div>'}
</div>

        ${incompleteGroups.length ? `
          <div class="sprint-report-section" style="margin-top: 1rem;">
            <div class="sc-tasks-section-head">
              <h4>Incomplete / Rolled-Over Work Items (${stats.incompleteTasks.length})</h4>
              <span>${stats.movedToSprint ? `Moved to ${esc(stats.movedToSprint.name)}` : 'Returned to Backlog'}</span>
            </div>
            <div class="sc-project-groups">
              ${incompleteGroups.map(group => `
                <div class="sc-project-group">
                  <div class="sc-project-group-header">
                    <div class="sc-project-group-left">
                      <span class="sc-dot" style="background: ${group.project.color || '#6B6E76'};"></span>
                      <strong>${esc(group.project.name)}</strong>
                      ${group.project.key ? `<span class="sc-proj-key">${esc(group.project.key)}</span>` : ''}
                    </div>
                    <span class="sc-proj-meta">${group.tasks.length} item${group.tasks.length === 1 ? '' : 's'}</span>
                  </div>
                  <div class="sc-task-list">
                    ${group.tasks.map(t => this._renderCompletedSprintTaskRow(t, true)).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''
      }
      </div>
  `;

    Modal.open({
      title: `Cycle Retrospective Report: ${esc(sprint.name)} `,
      body: bodyHTML,
      size: 'xl',
      footerButtons: [
        {
          text: 'Edit Cycle',
          class: 'btn-ghost',
          onClick: () => {
            Modal.close();
            this.openEditSprintModal(sprint.id);
          }
        },
        {
          text: 'Reopen Cycle',
          class: 'btn-secondary',
          onClick: () => {
            AppState.reopenSprint(sprint.id);
            Modal.close();
          }
        },
        { text: 'Close', class: 'btn-primary', onClick: () => Modal.close() }
      ]
    });

    setTimeout(() => {
      document.querySelectorAll('.sprint-report-modal [data-completed-task-open]').forEach(row => {
        row.addEventListener('click', () => {
          const tId = row.dataset.completedTaskOpen;
          Modal.close();
          if (tId) TaskModal.openDetail(tId);
        });
      });
    }, 40);
  }
};
