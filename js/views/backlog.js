/**
 * TaskForge — Sprint Planning & Iteration Workspace
 *
 * Modern, scenario-driven sprint planning interface:
 * - Zero redundant chrome: adapts cleanly to empty, planning-only, active-sprint,
 *   single-project, multi-project, and retrospective scenarios
 * - Executive Active Sprint Command Card with adaptive KPIs, segmented status
 *   distribution bar with elapsed-time pace marker, and 3 execution views
 * - Promoted "Up Next" planning card when no sprint is active (zero duplication)
 * - Scenario-adaptive lower workspace (Upcoming Pipeline, Backlog Pool, Completed History)
 * - Refined Cycle Workspace, Retrospective Report, Stack Sprints, and Picker modals
 */

const BacklogView = {
  activeStatusFilter: 'all', // 'all' | 'todo' | 'inprogress' | 'inreview' | 'done'
  activeViewMode: 'lanes',   // 'lanes' | 'project' | 'board'
  lowerTab: 'planning',      // 'planning' | 'history'
  searchQuery: '',
  doneLaneCollapsed: false,
  _docMenuListenerBound: false,

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
    const plannedSprints = projectSprints
      .filter(s => s.status === 'planned')
      .sort((a, b) => {
        const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
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

  _closeAllActionMenus(exceptMenu = null) {
    document.querySelectorAll('.sp-action-menu.is-open').forEach(menu => {
      if (menu !== exceptMenu) {
        menu.classList.remove('is-open');
        const btn = menu.querySelector('[data-sp-menu-toggle]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  },

  _ensureGlobalMenuListeners() {
    if (this._docMenuListenerBound) return;
    this._docMenuListenerBound = true;

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sp-action-menu')) {
        this._closeAllActionMenus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._closeAllActionMenus();
      }
    });
  },

  attachListeners(container) {
    this._ensureGlobalMenuListeners();

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

    // Inline Quick-Add Work Item Form (Active Sprint or Promoted Next-Up Sprint)
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

        const targetSprint = AppState.sprints.find(s => s.id === sprintId);
        const projectId = (projSelect && projSelect.value)
          || (targetSprint && targetSprint.projectId)
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

        Toast.success(`Added work item to ${targetSprint ? targetSprint.name : 'sprint'}`);
      });
    }

    // Inline Quick-Add Work Item Form inside Backlog Pool (or compact capture strip)
    container.querySelectorAll('#sp-backlog-quick-form').forEach(backlogForm => {
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

        Toast.success('Captured item in product backlog');
      });
    });

    this._bindDynamicInteractions(container);

    // Delegated page-level actions
    const pageRoot = container.querySelector('.backlog-page');
    if (pageRoot && !pageRoot.dataset.spRootBound) {
      pageRoot.dataset.spRootBound = '1';

      pageRoot.addEventListener('click', (e) => {
        // Overflow menu toggle
        const menuToggle = e.target.closest('[data-sp-menu-toggle]');
        if (menuToggle && pageRoot.contains(menuToggle)) {
          e.stopPropagation();
          const menuWrap = menuToggle.closest('.sp-action-menu');
          if (!menuWrap) return;
          const willOpen = !menuWrap.classList.contains('is-open');
          this._closeAllActionMenus(willOpen ? menuWrap : null);
          menuWrap.classList.toggle('is-open', willOpen);
          menuToggle.setAttribute('aria-expanded', String(willOpen));
          return;
        }

        // Overflow menu item click
        const menuItem = e.target.closest('[data-sp-menu-action]');
        if (menuItem && pageRoot.contains(menuItem)) {
          e.stopPropagation();
          const action = menuItem.dataset.spMenuAction;
          const sprintId = menuItem.dataset.sprintId;
          this._closeAllActionMenus();
          if (!sprintId) return;

          if (action === 'window') {
            this.openSprintDetailModal(sprintId, { openSchedule: true });
          } else if (action === 'edit') {
            this.openEditSprintModal(sprintId);
          } else if (action === 'pull') {
            this.openAddExistingTasksModal(sprintId);
          } else if (action === 'new-task') {
            const sp = AppState.sprints.find(s => s.id === sprintId);
            TaskModal.openCreate({ sprintId, projectId: (sp && sp.projectId) || '' });
          } else if (action === 'delete') {
            AppState.deleteSprint(sprintId);
          } else if (action === 'start') {
            this.startSprint(sprintId);
          }
          return;
        }

        // Collapsible Done swimlane toggle
        const doneToggle = e.target.closest('[data-toggle-done-lane]');
        if (doneToggle && pageRoot.contains(doneToggle)) {
          e.stopPropagation();
          this.doneLaneCollapsed = !this.doneLaneCollapsed;
          const lane = doneToggle.closest('.sp-swimlane');
          if (lane) {
            lane.classList.toggle('is-collapsed', this.doneLaneCollapsed);
            doneToggle.setAttribute('aria-expanded', String(!this.doneLaneCollapsed));
          }
          return;
        }

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
          Toast.info('Moved work item back to backlog');
          return;
        }

        const openSprintPopup = e.target.closest('[data-open-sprint-popup]');
        if (openSprintPopup && pageRoot.contains(openSprintPopup)) {
          if (!e.target.closest('button:not([data-open-sprint-popup-btn]), .sp-action-menu')) {
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

      pageRoot.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const doneToggle = e.target.closest('[data-toggle-done-lane]');
        if (doneToggle && pageRoot.contains(doneToggle)) {
          e.preventDefault();
          doneToggle.click();
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
      canvasSlot.innerHTML = this._renderActiveCanvasHTML(data.activeSprint, data.activeTasks, data.selectedProjectId);
    }

    const nextUpSlot = container.querySelector('[data-sp-refresh="nextup-items"]');
    if (nextUpSlot && !data.activeSprint && data.plannedSprints[0]) {
      const nextSprint = data.plannedSprints[0];
      const nextTasks = data.filteredTasks.filter(t => t.sprintId === nextSprint.id);
      nextUpSlot.innerHTML = this._renderNextUpItemsHTML(nextSprint, nextTasks, data.selectedProjectId);
    }

    const upcomingSlot = container.querySelector('[data-sp-refresh="upcoming"]');
    if (upcomingSlot) {
      const remainingPlanned = data.activeSprint ? data.plannedSprints : data.plannedSprints.slice(1);
      upcomingSlot.innerHTML = this._renderUpcomingListHTML(remainingPlanned, data.filteredTasks, Boolean(data.activeSprint));
    }

    const backlogSlot = container.querySelector('[data-sp-refresh="backlog"]');
    if (backlogSlot) {
      const quickTargetSprint = data.activeSprint || data.plannedSprints[0] || null;
      backlogSlot.innerHTML = this._renderBacklogPoolList(data.backlogTasks, quickTargetSprint, data.selectedProjectId);
    }

    const historySlot = container.querySelector('[data-sp-refresh="history"]');
    if (historySlot) {
      historySlot.innerHTML = this._renderCompletedHistoryHTML(data.completedSprints, data.filteredTasks);
    }

    this._bindDynamicInteractions(container);
  },

  _bindDynamicInteractions(container) {
    const pageRoot = container.querySelector('.backlog-page');

    // Draggable work items (Active Sprint + Next-Up + Backlog Pool)
    container.querySelectorAll('.backlog-item-row').forEach(row => {
      if (row.dataset.spDragBound) return;
      row.dataset.spDragBound = '1';

      row.addEventListener('dragstart', (e) => {
        const taskId = row.dataset.taskId;
        row.classList.add('dragging');
        if (pageRoot) pageRoot.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        if (pageRoot) pageRoot.classList.remove('is-dragging');
        container.querySelectorAll('.sprint-drop-zone, .sp-board-col-body, .sp-swimlane-body, .sp-status-drop-chip').forEach(z => {
          z.classList.remove('drag-over');
        });
      });
    });

    // Status Drop Zones (Board Columns, Swimlanes, and Drag-Revealed Status Dock)
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
        if (pageRoot) pageRoot.classList.remove('is-dragging');

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
        if (pageRoot) pageRoot.classList.remove('is-dragging');

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

  _renderSegmentedBarHTML(tasks, timeProgressPct = null) {
    const total = tasks.length;
    if (total === 0) return '';

    const counts = {
      done: tasks.filter(t => t.status === 'done').length,
      inreview: tasks.filter(t => t.status === 'inreview').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      blocked: tasks.filter(t => t.status === 'blocked').length
    };

    const pct = (n) => ((n / total) * 100).toFixed(2);
    const showTimeTick = typeof timeProgressPct === 'number' && timeProgressPct > 2 && timeProgressPct < 98;

    return `
      <div class="sp-velocity-rail" role="img" aria-label="${counts.done} of ${total} items completed">
        ${counts.done ? `<span class="sp-vel-seg is-done" style="width:${pct(counts.done)}%;" title="${counts.done} Done"></span>` : ''}
        ${counts.inreview ? `<span class="sp-vel-seg is-review" style="width:${pct(counts.inreview)}%;" title="${counts.inreview} In Review"></span>` : ''}
        ${counts.inprogress ? `<span class="sp-vel-seg is-progress" style="width:${pct(counts.inprogress)}%;" title="${counts.inprogress} In Progress"></span>` : ''}
        ${counts.blocked ? `<span class="sp-vel-seg is-blocked" style="width:${pct(counts.blocked)}%;" title="${counts.blocked} Blocked"></span>` : ''}
        ${showTimeTick ? `<span class="sp-vel-pace-tick" style="left:${timeProgressPct}%;" title="Elapsed cycle time: ${timeProgressPct}%"></span>` : ''}
      </div>
    `;
  },

  // ── Add Existing Tasks Modal ──
  openAddExistingTasksModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const availableTasks = AppState.tasks.filter(t => t.sprintId !== sprintId);
    const showProjectFilter = (AppState.projects || []).length > 1;

    const modalBody = `
      <div id="add-existing-tasks-container">
        <div class="sp-picker-filters">
          <div class="sp-picker-search-wrap">
            <label for="add-task-search" class="sr-only">Search work items</label>
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="add-task-search" class="form-input" placeholder="Search by title or key...">
          </div>
          ${showProjectFilter ? `
            <select id="add-task-filter-project" class="form-select" aria-label="Filter by project">
              <option value="">All projects</option>
              ${AppState.projects.map(p => `<option value="${p.id}">${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
            </select>
          ` : ''}
          <select id="add-task-filter-status" class="form-select" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
          </select>
          <select id="add-task-filter-assignment" class="form-select" aria-label="Filter by sprint assignment">
            <option value="">All items</option>
            <option value="unassigned" selected>Unassigned (Backlog)</option>
            <option value="other">In other sprints</option>
          </select>
        </div>

        <div class="sp-picker-subbar">
          <label class="sp-picker-select-all">
            <input type="checkbox" id="add-task-select-all">
            <span>Select all visible</span>
          </label>
          <span id="add-task-selected-count" class="sp-picker-count">0 selected</span>
        </div>

        <div id="add-task-list" class="sp-picker-list">
          ${this._renderTaskPickerList(availableTasks, sprintId)}
        </div>
      </div>
    `;

    Modal.open({
      title: `Commit Items to ${Utils.escapeHTML(sprint.name)}`,
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
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-inbox"></i>
          <span>No work items match your current filters.</span>
        </div>
      `;
    }

    const groups = this._groupTasksByProject(tasks);
    const multiProject = groups.length > 1;

    if (!multiProject) {
      return `
        <div class="add-task-project-items">
          ${groups[0].tasks.map(task => this._renderTaskPickerRow(task)).join('')}
        </div>
      `;
    }

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
    const typeIcon = this._getTypeIcon(task.type);
    const currentSprint = task.sprintId ? AppState.sprints.find(s => s.id === task.sprintId) : null;
    const sprintTag = currentSprint
      ? `<span class="sp-chip">${Utils.escapeHTML(currentSprint.name)}</span>`
      : `<span class="sp-pill tone-neutral">Backlog</span>`;

    return `
      <label class="add-task-row" data-task-id="${task.id}">
        <input type="checkbox" class="add-task-checkbox" data-task-id="${task.id}" data-points="${Number(task.storyPoints) || 0}">
        <span class="type-icon type-${task.type || 'task'}"><i class="fa-solid ${typeIcon}"></i></span>
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
      const statusVal = statusFilter ? statusFilter.value : '';
      const assignVal = assignmentFilter ? assignmentFilter.value : '';
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
    if (statusFilter) statusFilter.addEventListener('change', updateList);
    if (assignmentFilter) assignmentFilter.addEventListener('change', updateList);
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
    const checked = Array.from(document.querySelectorAll('.add-task-checkbox:checked'));
    const count = checked.length;
    const pts = checked.reduce((sum, cb) => sum + (Number(cb.dataset.points) || 0), 0);
    const countEl = document.getElementById('add-task-selected-count');
    if (countEl) {
      countEl.textContent = pts > 0 ? `${count} selected · ${pts} pts` : `${count} selected`;
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
          Review delivery outcomes for <strong>${Utils.escapeHTML(sprint.name)}</strong> before closing this cycle.
        </p>
        <div class="complete-sprint-summary-grid">
          <div class="complete-sprint-stat is-success">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-circle-check"></i> Delivered</span>
            <strong>${completed.length} <small>item${completed.length === 1 ? '' : 's'}${donePts > 0 ? ` · ${donePts} pts` : ''}</small></strong>
          </div>
          <div class="complete-sprint-stat ${incomplete.length ? 'is-warning' : ''}">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-clock-rotate-left"></i> Pending Rollover</span>
            <strong>${incomplete.length} <small>item${incomplete.length === 1 ? '' : 's'}${openPts > 0 ? ` · ${openPts} pts` : ''}</small></strong>
          </div>
        </div>

        ${incomplete.length > 0 ? `
          <div class="sp-autorollover-banner">
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
            <div>
              <strong>Automatic Pending Rollover</strong>
              <span><strong>${incomplete.length}</strong> open item${incomplete.length === 1 ? '' : 's'} will carry forward into <strong>${Utils.escapeHTML(nextScheduled.name)}</strong>.</span>
            </div>
          </div>
          <div class="form-group" style="margin-top: 0.75rem;">
            <label class="form-label" for="complete-sprint-move-target">Destination for Pending Items</label>
            <select id="complete-sprint-move-target" class="form-select">
              ${plannedSprints.map(ps => `<option value="${Utils.escapeHTML(ps.id)}" ${ps.id === nextScheduled.id ? 'selected' : ''}>${Utils.escapeHTML(ps.name)} (${Utils.formatDate(ps.startDate)} → ${Utils.formatDate(ps.endDate)})</option>`).join('')}
              <option value="__backlog__">Product Backlog (Unassigned)</option>
            </select>
          </div>
        ` : `
          <div class="sp-autorollover-banner is-clean">
            <i class="fa-solid fa-trophy"></i>
            <div>
              <strong>100% Delivery Achieved</strong>
              <span>Every committed item is complete. Next up: <strong>${Utils.escapeHTML(nextScheduled.name)}</strong>.</span>
            </div>
          </div>
        `}

        <label class="sp-checkbox-row" style="margin-top: 0.75rem;">
          <input type="checkbox" id="complete-sprint-auto-start-next" checked>
          <span>Start <strong>${Utils.escapeHTML(nextScheduled.name)}</strong> immediately upon closing</span>
        </label>
      </div>
    `;

    Modal.open({
      title: `Complete Cycle: ${Utils.escapeHTML(sprint.name)}`,
      body: bodyHTML,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: incomplete.length > 0 ? `Complete & Rollover` : 'Complete Cycle',
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
    const suggestedName = `Sprint ${suggestedNextNum}`;
    const previewPending = incomplete.slice(0, 4);

    const bodyHTML = `
      <div class="sp-no-sprint-warning-modal">
        <div class="sp-warning-popup-banner">
          <div class="sp-warning-popup-icon">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="sp-warning-popup-copy">
            <strong>${isAutoExpired ? `Time Window Elapsed for "${esc(sprint.name)}" — No Next Sprint Scheduled` : `No Upcoming Sprint Scheduled After "${esc(sprint.name)}"`}</strong>
            <p>
              ${incomplete.length > 0
                ? `<strong>${incomplete.length} open item${incomplete.length === 1 ? '' : 's'}</strong>${openPts > 0 ? ` (${openPts} pts)` : ''} need a rollover target, or can return to the backlog.`
                : `${completed.length} item${completed.length === 1 ? '' : 's'} delivered${donePts > 0 ? ` (${donePts} pts)` : ''}. Schedule a follow-up cycle or close now.`}
            </p>
          </div>
        </div>

        <div class="complete-sprint-summary-grid">
          <div class="complete-sprint-stat is-success">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-circle-check"></i> Completed</span>
            <strong>${completed.length} <small>item${completed.length === 1 ? '' : 's'}${donePts > 0 ? ` · ${donePts} pts` : ''}</small></strong>
          </div>
          <div class="complete-sprint-stat ${incomplete.length ? 'is-warning' : ''}">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-clock-rotate-left"></i> Pending</span>
            <strong>${incomplete.length} <small>item${incomplete.length === 1 ? '' : 's'}${openPts > 0 ? ` · ${openPts} pts` : ''}</small></strong>
          </div>
        </div>

        ${previewPending.length > 0 ? `
          <div class="sp-warn-pending-box">
            <span class="sp-warn-pending-title">Pending items awaiting destination</span>
            <div class="sp-warn-pending-list">
              ${previewPending.map(t => `
                <div class="sp-warn-pending-item">
                  <span class="sp-mono-key">${esc(t.key)}</span>
                  <span class="sp-warn-pending-item-title">${esc(t.title)}</span>
                  ${t.storyPoints ? `<span class="sp-pts-badge">${t.storyPoints} pts</span>` : ''}
                </div>
              `).join('')}
              ${incomplete.length > previewPending.length ? `<div class="sp-warn-pending-more">+${incomplete.length - previewPending.length} more pending item(s)</div>` : ''}
            </div>
          </div>
        ` : ''}

        <div class="sp-quick-next-creator">
          <div class="sp-quick-next-head">
            <i class="fa-solid fa-bolt"></i>
            <span>Quick-Schedule Next Sprint${incomplete.length ? ' & Auto-Transfer Pending' : ''}</span>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex: 2;">
              <label class="form-label" for="warn-next-sprint-name">Next Sprint Name</label>
              <input type="text" id="warn-next-sprint-name" class="form-input" value="${esc(suggestedName)}" placeholder="e.g. Sprint ${suggestedNextNum} — Core Delivery">
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="warn-next-sprint-days">Duration (Days)</label>
              <input type="number" id="warn-next-sprint-days" class="form-input" value="14" min="1" max="365">
            </div>
          </div>
          <label class="sp-checkbox-row">
            <input type="checkbox" id="warn-start-immediately" checked>
            <span>Activate immediately${incomplete.length > 0 ? ` &amp; transfer ${incomplete.length} pending item${incomplete.length === 1 ? '' : 's'}` : ''}</span>
          </label>
        </div>
      </div>
    `;

    Modal.open({
      title: 'No Next Sprint Scheduled',
      body: bodyHTML,
      size: 'md',
      footerButtons: [
        {
          text: incomplete.length > 0 ? 'Move to Backlog & Close' : 'Close Cycle',
          class: 'btn-ghost sp-footer-danger-left',
          onClick: () => {
            AppState.completeSprint(sprintId, null);
            Modal.close();
          }
        },
        {
          text: 'Stack Sprints...',
          class: 'btn-secondary',
          onClick: () => {
            Modal.close();
            this.openStackSprintsModal({ completeSprintIdAfterStack: sprintId });
          }
        },
        {
          text: incomplete.length > 0 ? 'Create & Transfer' : 'Create & Start Next',
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
   * Allows stacking N sprints back-to-back in a constant time interval with custom names & goals.
   */
  openStackSprintsModal(options = {}) {
    const esc = Utils.escapeHTML;
    const defaultProj = AppState.selectedProjectId || '__all_projects__';
    const completeSprintIdAfterStack = options.completeSprintIdAfterStack || null;

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
      { name: `Sprint ${baseNum + 1} — Feature Execution`, goal: 'Primary user-facing workflows and integration' },
      { name: `Sprint ${baseNum + 2} — Hardening & Release`, goal: 'Verification, performance tuning, and release prep' }
    ];

    const modalBody = `
      <div class="sp-stack-modal" id="sp-stack-modal-root">
        ${completeSprintIdAfterStack ? `
          <div class="sp-autorollover-banner">
            <i class="fa-solid fa-layer-group"></i>
            <div>
              <strong>Stack &amp; Rollover Active</strong>
              <span>Creating this stack will close the current sprint and move open items into the first stacked cycle.</span>
            </div>
          </div>
        ` : `
          <p class="sp-modal-intro">
            Generate a continuous chain of back-to-back sprints at a fixed cadence with custom names and objectives.
          </p>
        `}

        <div class="sp-stack-config-grid">
          <div class="form-group">
            <label class="form-label" for="stack-interval-days">Cadence (Days)</label>
            <div class="sp-interval-control-row">
              <input type="number" id="stack-interval-days" class="form-input" value="14" min="1" max="365">
              <div class="sp-interval-presets" role="group" aria-label="Interval presets">
                <button type="button" class="sp-preset-chip" data-interval-preset="7">7d</button>
                <button type="button" class="sp-preset-chip is-active" data-interval-preset="14">14d</button>
                <button type="button" class="sp-preset-chip" data-interval-preset="21">21d</button>
                <button type="button" class="sp-preset-chip" data-interval-preset="28">28d</button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="stack-anchor-start">First Start Date</label>
            <input type="date" id="stack-anchor-start" class="form-input" value="${Utils.toDateInputValue(anchorDate)}">
          </div>

          <div class="form-group">
            <label class="form-label" for="stack-project">Project Scope</label>
            <select id="stack-project" class="form-select">
              <option value="__all_projects__" ${defaultProj === '__all_projects__' ? 'selected' : ''}>All Projects</option>
              ${AppState.projects.map(p => `<option value="${esc(p.id)}" ${p.id === defaultProj ? 'selected' : ''}>${esc(p.name)} (${esc(p.key)})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="sp-stack-list-header">
          <div class="sp-stack-list-title">
            <i class="fa-solid fa-timeline"></i>
            <span>Cycle Queue</span>
            <span class="sp-count-pill" id="stack-count-badge">${stackItems.length}</span>
          </div>
          <div class="sp-stack-list-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-stack-row">
              <i class="fa-solid fa-plus"></i> Add Cycle
            </button>
          </div>
        </div>

        <div id="stack-sprints-rows" class="sp-stack-rows-container"></div>

        <div class="sp-stack-options-bar">
          <label class="sp-checkbox-row">
            <input type="checkbox" id="stack-auto-schedule" checked>
            <span><strong>Auto-Pilot:</strong> Open &amp; close cycles automatically on schedule and roll over pending items</span>
          </label>
        </div>
      </div>
    `;

    Modal.open({
      title: 'Stack Sprint Cadence',
      body: modalBody,
      size: 'lg',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: completeSprintIdAfterStack ? 'Stack & Rollover Pending' : 'Create Sprint Stack',
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
                Toast.warning(`Please enter a name for Sprint #${i + 1}.`);
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
                  <input type="text" class="form-input stack-row-name" value="${esc(item.name)}" placeholder="Sprint #${idx + 1} name..." required>
                  <span class="sp-stack-window-badge" data-stack-window="${idx}">
                    <i class="fa-regular fa-calendar"></i> ${esc(w.startLabel)} → ${esc(w.endLabel)}
                  </span>
                </div>
                <input type="text" class="form-input stack-row-goal" value="${esc(item.goal)}" placeholder="Optional goal or milestone...">
              </div>
              <button type="button" class="sp-stack-row-remove" data-remove-stack-idx="${idx}" title="Remove from stack" ${stackItems.length <= 1 ? 'disabled' : ''}>
                <i class="fa-regular fa-trash-can"></i>
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
          if (badge) badge.innerHTML = `<i class="fa-regular fa-calendar"></i> ${esc(w.startLabel)} → ${esc(w.endLabel)}`;
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
            name: `Sprint ${baseNum + nextIdx} — Cycle ${nextIdx + 1}`,
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
          <label class="form-label" for="sprint-name">Sprint Name <span class="required">*</span></label>
          <input type="text" id="sprint-name" class="form-input" placeholder="e.g. Sprint 4 — Performance & Realtime Sync" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label" for="sprint-project">Project Scope</label>
          <select id="sprint-project" class="form-select">
            <option value="__all_projects__">All Projects (Cross-Workspace Cycle)</option>
            ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === defaultProj ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="sprint-goal">Sprint Goal</label>
          <textarea id="sprint-goal" class="form-textarea" placeholder="Define the primary outcome or milestone for this cycle..."></textarea>
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
          <span>Auto-open &amp; auto-close this sprint on its scheduled dates</span>
        </label>
      </form>
    `;

    Modal.open({
      title: 'Plan New Sprint',
      body: modalBody,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Stack Multiple...',
          class: 'btn-ghost',
          onClick: () => {
            Modal.close();
            this.openStackSprintsModal();
          }
        },
        {
          text: 'Create Sprint',
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
          <label class="form-label" for="edit-sprint-name">Sprint Name <span class="required">*</span></label>
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
          <label class="form-label" for="edit-sprint-goal">Sprint Goal</label>
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
          <span>Auto-open &amp; auto-close this sprint on its scheduled dates</span>
        </label>
      </form>
    `;

    Modal.open({
      title: `Edit Sprint: ${Utils.escapeHTML(sprint.name)}`,
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
      selectedProjectId,
      selectedProject,
      projectSprints,
      filteredTasks,
      activeSprint,
      plannedSprints,
      completedSprints,
      activeTasks,
      backlogTasks,
      avgDeliveryPct,
      totalCompletedPts
    } = data;

    const isAutoPilotOn = !(AppState.settings && AppState.settings.autoSprintSchedule === false);
    const hasCompleted = completedSprints.length > 0;

    // When no sprint is active, plannedSprints[0] is promoted into the hero card (avoid duplicating it below)
    const remainingPlanned = activeSprint ? plannedSprints : plannedSprints.slice(1);
    const hasPlanningContent = remainingPlanned.length > 0 || backlogTasks.length > 0;

    // Smart default tab: if planning & backlog are both empty while completed sprints exist, show history directly
    let effectiveLowerTab = this.lowerTab;
    if (!hasCompleted) {
      effectiveLowerTab = 'planning';
    } else if (!hasPlanningContent && !activeSprint && plannedSprints.length === 0) {
      effectiveLowerTab = 'history';
    } else if (effectiveLowerTab !== 'history') {
      effectiveLowerTab = 'planning';
    }

    const quickTargetSprint = activeSprint || plannedSprints[0] || null;

    // Show search bar only when there are enough entities to warrant searching
    const totalSearchableCount = activeTasks.length + backlogTasks.length + plannedSprints.length + completedSprints.length;
    const showSearch = projectSprints.length > 0 && (totalSearchableCount >= 4 || Boolean(this.searchQuery));

    container.innerHTML = `
      <div class="view-page backlog-page sp-page">
        <!-- 1. EXECUTIVE PAGE HEADER -->
        <header class="sp-page-header">
          <div class="sp-header-left">
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
            ${projectSprints.length === 0 ? `<p class="sp-header-sub">Plan focused iterations, prioritize backlog, and track delivery velocity.</p>` : ''}
          </div>

          ${projectSprints.length > 0 ? `
            <div class="sp-header-actions">
              ${showSearch ? `
                <div class="sp-search-field ${this.searchQuery ? 'has-value' : ''}">
                  <i class="fa-solid fa-magnifying-glass"></i>
                  <input type="text" id="sp-global-search" value="${esc(this.searchQuery)}" placeholder="Search sprints or tasks..." aria-label="Search sprints and tasks">
                  <button type="button" id="sp-clear-search" class="sp-search-clear ${this.searchQuery ? '' : 'is-hidden'}" title="Clear search">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ` : ''}
              <button type="button" id="btn-toggle-sprint-autopilot" class="sp-autopilot-pill ${isAutoPilotOn ? 'is-on' : 'is-off'}" title="${isAutoPilotOn ? 'Auto-Pilot enabled: automatically starts, closes, and rolls over sprints on schedule' : 'Auto-Pilot paused: sprints require manual start and completion'}">
                <span class="sp-autopilot-dot"></span>
                <span>Auto-Pilot</span>
              </button>
              <button type="button" id="btn-stack-sprints" class="btn btn-secondary btn-sm" title="Batch-create back-to-back sprints at a fixed cadence">
                <i class="fa-solid fa-layer-group"></i>
                <span>Stack</span>
              </button>
              <button type="button" id="btn-create-sprint" class="btn ${activeSprint || plannedSprints.length > 0 ? 'btn-secondary' : 'btn-primary'} btn-sm">
                <i class="fa-solid fa-plus"></i>
                <span>New Sprint</span>
              </button>
            </div>
          ` : ''}
        </header>

        ${projectSprints.length === 0 ? `
          <!-- SCENARIO 1: NO SPRINTS SCHEDULED YET -->
          <section class="sp-empty-hero">
            <div class="sp-empty-hero-icon">
              <i class="fa-solid fa-layer-group"></i>
            </div>
            <h2>Plan your first sprint cycle</h2>
            <p>Organize work into time-boxed iterations with automatic rollover, or stack multiple cycles ahead at a fixed cadence.</p>
            <div class="sp-empty-actions">
              <button type="button" class="btn btn-primary" onclick="BacklogView.openCreateSprintModal()">
                <i class="fa-solid fa-plus"></i> Plan First Sprint
              </button>
              <button type="button" class="btn btn-secondary" onclick="BacklogView.openStackSprintsModal()">
                <i class="fa-solid fa-layer-group"></i> Stack Sprint Cadence
              </button>
            </div>
          </section>

          ${backlogTasks.length > 0 ? `
            <section class="sp-solo-backlog-wrap">
              ${this._renderBacklogPoolPanel(backlogTasks, null, selectedProjectId, { showDropHint: false })}
            </section>
          ` : ''}
        ` : `
          <!-- SCENARIO 2 / 3: ACTIVE SPRINT CARD OR PROMOTED NEXT-UP / COMPLETED LAUNCHPAD -->
          <section class="sp-primary-zone" aria-label="${activeSprint ? 'Active sprint' : 'Next sprint planning'}">
            ${activeSprint
              ? this.renderActiveSprintStudio(activeSprint, activeTasks, backlogTasks.length, selectedProjectId)
              : this.renderNoActiveSprintHero(plannedSprints, filteredTasks, backlogTasks.length, completedSprints, avgDeliveryPct, selectedProjectId)}
          </section>

          <!-- SCENARIO 4: ADAPTIVE LOWER WORKSPACE -->
          ${this._renderLowerWorkspace({
            activeSprint,
            remainingPlanned,
            backlogTasks,
            completedSprints,
            filteredTasks,
            hasCompleted,
            effectiveLowerTab,
            quickTargetSprint,
            avgDeliveryPct,
            totalCompletedPts,
            selectedProjectId
          })}
        `}
      </div>
    `;

    this.attachListeners(container);
  },

  _renderLowerWorkspace(ctx) {
    const {
      activeSprint,
      remainingPlanned,
      backlogTasks,
      completedSprints,
      filteredTasks,
      hasCompleted,
      effectiveLowerTab,
      quickTargetSprint,
      avgDeliveryPct,
      totalCompletedPts,
      selectedProjectId
    } = ctx;

    const plannedItemsCount = remainingPlanned.reduce(
      (sum, sp) => sum + filteredTasks.filter(t => t.sprintId === sp.id).length,
      0
    );
    const plannedPtsCount = remainingPlanned.reduce(
      (sum, sp) => sum + filteredTasks.filter(t => t.sprintId === sp.id).reduce((p, t) => p + (Number(t.storyPoints) || 0), 0),
      0
    );

    const planningBadgeCount = remainingPlanned.length + backlogTasks.length;
    const hasPlanned = remainingPlanned.length > 0;
    const hasBacklog = backlogTasks.length > 0;

    // Header bar for lower workspace: only show tabs when Completed History exists AND there is planning/active context
    const showTabs = hasCompleted && (activeSprint || hasPlanned || hasBacklog);

    const upcomingHeading = activeSprint ? 'Upcoming Sprints' : 'Later in Queue';

    let lowerBodyHTML = '';
    if (effectiveLowerTab === 'history' && hasCompleted) {
      lowerBodyHTML = `
        <div class="sp-panel sp-history-panel">
          <div class="sp-panel-head">
            <div class="sp-panel-title-wrap">
              <h3>Completed Cycles</h3>
              <span class="sp-count-pill is-success">${completedSprints.length}</span>
            </div>
            <div class="sp-history-summary">
              <span><strong>${avgDeliveryPct}%</strong> avg delivery</span>
              ${totalCompletedPts > 0 ? `<span class="sp-sep-dot"></span><span><strong>${totalCompletedPts}</strong> pts burned</span>` : ''}
            </div>
          </div>
          <div class="sp-history-grid" data-sp-refresh="history">
            ${this._renderCompletedHistoryHTML(completedSprints, filteredTasks)}
          </div>
        </div>
      `;
    } else if (hasPlanned && hasBacklog) {
      // Scenario A: Both upcoming sprints & backlog items exist -> Side-by-side planning workbench
      lowerBodyHTML = `
        <div class="sp-planning-grid">
          <div class="sp-panel sp-upcoming-panel">
            <div class="sp-panel-head">
              <div class="sp-panel-title-wrap">
                <h3>${upcomingHeading}</h3>
                <span class="sp-count-pill">${remainingPlanned.length}</span>
              </div>
              <span class="sp-muted-meta">${plannedItemsCount} item${plannedItemsCount === 1 ? '' : 's'}${plannedPtsCount > 0 ? ` · ${plannedPtsCount} pts` : ''}</span>
            </div>
            <div class="sp-upcoming-list" data-sp-refresh="upcoming">
              ${this._renderUpcomingListHTML(remainingPlanned, filteredTasks, Boolean(activeSprint))}
            </div>
          </div>

          ${this._renderBacklogPoolPanel(backlogTasks, quickTargetSprint, selectedProjectId)}
        </div>
      `;
    } else if (hasPlanned && !hasBacklog) {
      // Scenario B: Upcoming sprints exist, backlog is clear -> Give full width to upcoming pipeline + compact backlog capture/drop strip
      lowerBodyHTML = `
        <div class="sp-stack-layout">
          <div class="sp-panel sp-upcoming-panel">
            <div class="sp-panel-head">
              <div class="sp-panel-title-wrap">
                <h3>${upcomingHeading}</h3>
                <span class="sp-count-pill">${remainingPlanned.length}</span>
              </div>
              <span class="sp-muted-meta">${plannedItemsCount} item${plannedItemsCount === 1 ? '' : 's'}${plannedPtsCount > 0 ? ` · ${plannedPtsCount} pts` : ''}</span>
            </div>
            <div class="sp-upcoming-list ${remainingPlanned.length >= 2 ? 'is-grid' : ''}" data-sp-refresh="upcoming">
              ${this._renderUpcomingListHTML(remainingPlanned, filteredTasks, Boolean(activeSprint))}
            </div>
          </div>

          ${this._renderCompactBacklogCaptureBar()}
        </div>
      `;
    } else if (!hasPlanned && hasBacklog) {
      // Scenario C: Backlog items exist, no extra upcoming sprints -> Full-width crisp backlog workbench
      lowerBodyHTML = `
        <div class="sp-solo-panel-wrap">
          ${this._renderBacklogPoolPanel(backlogTasks, quickTargetSprint, selectedProjectId, { showPlanSprintHint: Boolean(activeSprint) })}
        </div>
      `;
    } else {
      // Scenario D: Both upcoming queue and backlog are clear -> Minimal single-line capture & drop bar (zero empty boxes!)
      lowerBodyHTML = this._renderCompactBacklogCaptureBar({ showPlanPrompt: Boolean(activeSprint) });
    }

    return `
      <section class="sp-lower-workspace" aria-label="Sprint pipeline and backlog">
        ${showTabs ? `
          <div class="sp-lower-bar">
            <div class="sp-segmented sp-lower-tabs" role="tablist" aria-label="Planning sections">
              <button type="button" role="tab" aria-selected="${effectiveLowerTab === 'planning'}" class="sp-seg-btn ${effectiveLowerTab === 'planning' ? 'is-active' : ''}" data-sp-lower-tab="planning">
                <i class="fa-solid fa-bars-progress"></i>
                <span>Pipeline &amp; Backlog</span>
                ${planningBadgeCount > 0 ? `<span class="sp-seg-count">${planningBadgeCount}</span>` : ''}
              </button>
              <button type="button" role="tab" aria-selected="${effectiveLowerTab === 'history'}" class="sp-seg-btn ${effectiveLowerTab === 'history' ? 'is-active' : ''}" data-sp-lower-tab="history">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>Completed</span>
                <span class="sp-seg-count">${completedSprints.length}</span>
              </button>
            </div>
          </div>
        ` : ''}

        ${lowerBodyHTML}
      </section>
    `;
  },

  _renderCompactBacklogCaptureBar(options = {}) {
    return `
      <div class="sp-compact-backlog-bar sprint-drop-zone" data-sprint-id="">
        <div class="sp-compact-backlog-label">
          <i class="fa-solid fa-inbox"></i>
          <span>Product Backlog</span>
          <span class="sp-muted-hint">All open items scheduled · Drop here to unassign</span>
        </div>
        <form id="sp-backlog-quick-form" class="sp-compact-backlog-form">
          <input type="text" id="sp-backlog-quick-title" placeholder="Capture new backlog item... (Enter)" maxlength="160" autocomplete="off">
          <button type="submit" class="btn btn-secondary btn-sm">Add</button>
        </form>
        ${options.showPlanPrompt ? `
          <button type="button" class="btn btn-ghost btn-sm" onclick="BacklogView.openCreateSprintModal()">
            <i class="fa-regular fa-calendar-plus"></i> Queue Next Sprint
          </button>
        ` : ''}
      </div>
    `;
  },

  // ── SCENARIO 3: NO ACTIVE SPRINT HERO (PROMOTED NEXT-UP OR ALL-COMPLETED LAUNCHPAD) ──
  renderNoActiveSprintHero(plannedSprints, filteredTasks = [], unassignedCount = 0, completedSprints = [], avgDeliveryPct = 0, selectedProjectId = null) {
    const esc = Utils.escapeHTML;
    const nextSprint = plannedSprints[0] || null;

    if (!nextSprint) {
      return `
        <div class="sp-launchpad">
          <div class="sp-launchpad-copy">
            <div class="sp-launchpad-icon"><i class="fa-regular fa-flag"></i></div>
            <div class="sp-launchpad-text">
              <div class="sp-launchpad-kicker">
                <span class="sp-pill tone-neutral">No Active Cycle</span>
                ${completedSprints.length > 0 ? `<span class="sp-muted-meta">${completedSprints.length} completed · ${avgDeliveryPct}% avg delivery</span>` : ''}
              </div>
              <h2>Ready for your next sprint</h2>
              <p>Create a single sprint cycle or generate a stacked cadence to start executing from your backlog.</p>
            </div>
          </div>
          <div class="sp-launchpad-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openStackSprintsModal()">
              <i class="fa-solid fa-layer-group"></i> Stack Sprints
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="BacklogView.openCreateSprintModal()">
              <i class="fa-solid fa-plus"></i> Plan Next Sprint
            </button>
          </div>
        </div>
      `;
    }

    const nextTasks = filteredTasks
      .filter(t => t.sprintId === nextSprint.id)
      .sort((a, b) => this._sortByItemId(a, b));
    const total = nextTasks.length;
    const totalPts = nextTasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
    const sprintProject = (!selectedProjectId && nextSprint.projectId)
      ? AppState.projects.find(p => p.id === nextSprint.projectId)
      : null;

    let cycleDays = '';
    let startCountdown = 'Ready to launch';
    if (nextSprint.startDate && nextSprint.endDate) {
      const startMs = new Date(nextSprint.startDate).getTime();
      const endMs = new Date(nextSprint.endDate).getTime();
      const d = Math.max(1, Math.round((endMs - startMs) / 86400000));
      if (!isNaN(d)) cycleDays = `${d}d`;
      const daysUntil = Math.ceil((startMs - Date.now()) / 86400000);
      if (daysUntil > 0) startCountdown = `Starts in ${daysUntil}d`;
      else if (daysUntil === 0) startCountdown = 'Scheduled today';
    }

    const defaultProjectId = nextSprint.projectId || AppState.selectedProjectId || (AppState.projects[0] && AppState.projects[0].id) || '';
    const showQuickProjectSelect = !nextSprint.projectId && !selectedProjectId && (AppState.projects || []).length > 1;

    return `
      <article class="sp-active-card sp-next-hero sprint-drop-zone" data-sprint-id="${esc(nextSprint.id)}">
        <header class="sp-active-head">
          <div class="sp-active-identity">
            <div class="sp-active-badges">
              <span class="sp-pill tone-brand"><i class="fa-regular fa-circle-play"></i> Up Next</span>
              <span class="sp-pill tone-neutral">${esc(startCountdown)}</span>
              ${sprintProject ? `
                <span class="sp-chip">
                  <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                  ${esc(sprintProject.name)}
                </span>
              ` : ''}
            </div>

            <h2 class="sp-sprint-title">${esc(nextSprint.name)}</h2>

            <div class="sp-meta-line">
              ${nextSprint.startDate && nextSprint.endDate ? `
                <span class="sp-meta-item">
                  <i class="fa-regular fa-calendar"></i>
                  ${Utils.formatDate(nextSprint.startDate)} – ${Utils.formatDate(nextSprint.endDate)}${cycleDays ? ` (${cycleDays})` : ''}
                </span>
              ` : ''}
              <span class="sp-meta-sep"></span>
              <span class="sp-meta-item"><strong>${total}</strong> item${total === 1 ? '' : 's'} scoped</span>
              ${totalPts > 0 ? `<span class="sp-meta-sep"></span><span class="sp-meta-item"><strong>${totalPts}</strong> pts</span>` : ''}
            </div>

            ${nextSprint.goal ? `<p class="sp-active-goal">${esc(nextSprint.goal)}</p>` : ''}
          </div>

          <div class="sp-active-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${esc(nextSprint.id)}')">
              <i class="fa-solid fa-play"></i> Start Sprint
            </button>
            ${unassignedCount > 0 ? `
              <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(nextSprint.id)}">
                <i class="fa-solid fa-arrow-down-short-wide"></i> Pull Backlog (${unassignedCount})
              </button>
            ` : ''}
            <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openSprintDetailModal('${esc(nextSprint.id)}')" title="Open cycle workspace & schedule window">
              <i class="fa-regular fa-clock"></i> Schedule
            </button>
            ${this._renderSprintOverflowMenu(nextSprint.id, { unassignedCount, isActive: false })}
          </div>
        </header>

        <div class="sp-execution-body">
          ${this._renderQuickAddComposer(nextSprint, { defaultProjectId, showQuickProjectSelect })}

          <div class="sp-stage-canvas" data-sp-refresh="nextup-items">
            ${this._renderNextUpItemsHTML(nextSprint, nextTasks, selectedProjectId)}
          </div>
        </div>
      </article>
    `;
  },

  _renderNextUpItemsHTML(sprint, tasks, selectedProjectId = null) {
    const esc = Utils.escapeHTML;
    const visible = tasks.filter(t => this._matchesQuery(t));

    if (tasks.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-regular fa-square-plus"></i>
          <strong>Scope ${esc(sprint.name)} before launching</strong>
          <span>Add items above or drag tasks from the backlog below into this sprint.</span>
        </div>
      `;
    }

    if (visible.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-magnifying-glass"></i>
          <strong>No scoped items match "${esc(this.searchQuery)}"</strong>
        </div>
      `;
    }

    const distinctProjects = new Set(tasks.map(t => t.projectId).filter(Boolean));
    const showProjectChip = !sprint.projectId && !selectedProjectId && distinctProjects.size > 1;

    return `
      <div class="sp-workitem-surface">
        ${visible.map(t => this.renderActiveWorkItemRow(t, sprint.id, { showProjectChip })).join('')}
      </div>
    `;
  },

  _renderSprintOverflowMenu(sprintId, opts = {}) {
    const esc = Utils.escapeHTML;
    return `
      <div class="sp-action-menu">
        <button type="button" class="sp-icon-btn sp-menu-trigger" data-sp-menu-toggle="1" aria-haspopup="menu" aria-expanded="false" title="Sprint options">
          <i class="fa-solid fa-ellipsis"></i>
        </button>
        <div class="sp-menu-popover" role="menu">
          <button type="button" class="sp-menu-item" role="menuitem" data-sp-menu-action="window" data-sprint-id="${esc(sprintId)}">
            <i class="fa-regular fa-clock"></i>
            <span>Adjust Time Window</span>
          </button>
          <button type="button" class="sp-menu-item" role="menuitem" data-sp-menu-action="edit" data-sprint-id="${esc(sprintId)}">
            <i class="fa-solid fa-pen"></i>
            <span>Edit Sprint Details</span>
          </button>
          ${opts.unassignedCount > 0 ? `
            <button type="button" class="sp-menu-item" role="menuitem" data-sp-menu-action="pull" data-sprint-id="${esc(sprintId)}">
              <i class="fa-solid fa-arrow-down-short-wide"></i>
              <span>Pull from Backlog (${opts.unassignedCount})</span>
            </button>
          ` : ''}
          <button type="button" class="sp-menu-item" role="menuitem" data-sp-menu-action="new-task" data-sprint-id="${esc(sprintId)}">
            <i class="fa-solid fa-plus"></i>
            <span>Create Full Task</span>
          </button>
          <div class="sp-menu-divider"></div>
          <button type="button" class="sp-menu-item is-danger" role="menuitem" data-sp-menu-action="delete" data-sprint-id="${esc(sprintId)}">
            <i class="fa-regular fa-trash-can"></i>
            <span>Delete Sprint</span>
          </button>
        </div>
      </div>
    `;
  },

  _renderQuickAddComposer(sprint, opts = {}) {
    const esc = Utils.escapeHTML;
    const { defaultProjectId, showQuickProjectSelect } = opts;

    return `
      <form id="sp-active-quick-form" class="sp-composer" data-sprint-id="${esc(sprint.id)}">
        <span class="sp-composer-icon"><i class="fa-solid fa-plus"></i></span>
        <input type="text" id="sp-quick-title" placeholder="Add work item to ${esc(sprint.name)}... (Enter)" maxlength="180" autocomplete="off">
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
          <button type="button" class="sp-icon-btn sp-composer-expand" onclick="TaskModal.openCreate({ sprintId: '${esc(sprint.id)}', projectId: '${esc(sprint.projectId || '')}' })" title="Open full task editor">
            <i class="fa-solid fa-up-right-from-square"></i>
          </button>
        </div>
      </form>
    `;
  },

  // ── SCENARIO 2: ACTIVE SPRINT EXECUTIVE COMMAND CARD ──
  renderActiveSprintStudio(sprint, sprintTasks, unassignedCount = 0, selectedProjectId = null) {
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
      inreview: sprintTasks.filter(t => t.status === 'inreview').length,
      blocked: sprintTasks.filter(t => t.status === 'blocked').length,
      reviewBlocked: sprintTasks.filter(t => t.status === 'inreview' || t.status === 'blocked').length,
      done: doneTasks
    };

    let timeProgressPct = null;
    let countdownLabel = '';
    let countdownTone = 'tone-neutral';
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

    const sprintProject = (!selectedProjectId && sprint.projectId)
      ? AppState.projects.find(p => p.id === sprint.projectId)
      : null;
    const defaultProjectId = sprint.projectId || AppState.selectedProjectId || (AppState.projects[0] && AppState.projects[0].id) || '';
    const nextScheduledSprint = AppState.getNextScheduledSprint(sprint.id);

    // Distinct projects across active sprint tasks (only offer "By Project" mode when > 1 project!)
    const distinctProjects = new Set(sprintTasks.map(t => t.projectId).filter(Boolean));
    const supportsProjectView = distinctProjects.size > 1;
    const effectiveViewMode = (this.activeViewMode === 'project' && !supportsProjectView) ? 'lanes' : this.activeViewMode;

    // Status filter pills: only show when not in Board mode and >= 2 populated status buckets exist
    const filterPills = [
      { id: 'all', label: 'All', count: total },
      { id: 'todo', label: 'To Do', count: breakdown.todo },
      { id: 'inprogress', label: 'In Progress', count: breakdown.inprogress },
      { id: 'inreview', label: 'Review / Blocked', count: breakdown.reviewBlocked },
      { id: 'done', label: 'Done', count: breakdown.done }
    ].filter(f => f.id === 'all' || f.count > 0 || this.activeStatusFilter === f.id);
    const showStatusFilters = total > 0 && effectiveViewMode !== 'board' && filterPills.length > 2;

    const showQuickProjectSelect = !sprint.projectId && !selectedProjectId && (AppState.projects || []).length > 1;

    // Scenario-adaptive KPI cards (zero empty filler columns!)
    const kpiItems = [];
    if (total > 0) {
      let paceBadge = '';
      if (typeof timeProgressPct === 'number' && timeProgressPct >= 15 && progress < 100) {
        const delta = progress - timeProgressPct;
        if (delta >= 10) paceBadge = `<span class="sp-pace-tag is-ahead">Ahead</span>`;
        else if (delta <= -20) paceBadge = `<span class="sp-pace-tag is-behind">Behind pace</span>`;
        else paceBadge = `<span class="sp-pace-tag is-ontrack">On track</span>`;
      } else if (progress === 100) {
        paceBadge = `<span class="sp-pace-tag is-ahead">Complete</span>`;
      }

      kpiItems.push({
        label: 'Completion',
        value: `${progress}%`,
        sub: `${doneTasks}/${total} items`,
        badge: paceBadge
      });

      if (totalPoints > 0) {
        kpiItems.push({
          label: 'Story Points',
          value: `${donePoints}<small>/${totalPoints}</small>`,
          sub: remainingPoints > 0 ? `${remainingPoints} pts remaining` : 'All points burned'
        });
      }

      const flowSubParts = [];
      if (breakdown.blocked > 0) flowSubParts.push(`<span class="sp-inline-danger">${breakdown.blocked} blocked</span>`);
      if (breakdown.inreview > 0) flowSubParts.push(`${breakdown.inreview} review`);
      if (flowSubParts.length === 0) flowSubParts.push(`${breakdown.todo} to do`);

      kpiItems.push({
        label: 'In Flight',
        value: `${breakdown.inprogress}`,
        subHTML: flowSubParts.join(' · ')
      });

      if (typeof timeProgressPct === 'number' || totalTracked > 0 || totalEstimate > 0) {
        const timeSub = totalTracked > 0
          ? `${Utils.formatMinutes(totalTracked)} logged`
          : (totalEstimate > 0 ? `${Utils.formatMinutes(totalEstimate)} est.` : (countdownLabel || 'Cycle progress'));
        kpiItems.push({
          label: typeof timeProgressPct === 'number' ? 'Cycle Elapsed' : 'Time Logged',
          value: typeof timeProgressPct === 'number' ? `${timeProgressPct}%` : Utils.formatMinutes(totalTracked),
          sub: timeSub
        });
      }
    }

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
              ${countdownLabel ? `<span class="sp-pill ${countdownTone}"><i class="fa-regular fa-clock"></i> ${esc(countdownLabel)}</span>` : ''}
              ${sprintProject ? `
                <span class="sp-chip">
                  <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                  ${esc(sprintProject.name)}
                </span>
              ` : ''}
            </div>

            <h2 class="sp-sprint-title">${esc(sprint.name)}</h2>

            <div class="sp-meta-line">
              ${sprint.startDate && sprint.endDate ? `
                <span class="sp-meta-item">
                  <i class="fa-regular fa-calendar"></i>
                  ${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)}
                </span>
              ` : ''}
              ${sprint.startDate && sprint.endDate ? `<span class="sp-meta-sep"></span>` : ''}
              ${nextScheduledSprint ? `
                <span class="sp-rollover-note is-linked" title="Unfinished tasks automatically carry forward into ${esc(nextScheduledSprint.name)}">
                  <i class="fa-solid fa-arrow-right-arrow-left"></i> Rollover → ${esc(nextScheduledSprint.name)}
                </span>
              ` : `
                <button type="button" class="sp-rollover-note is-unscheduled" onclick="BacklogView.openStackSprintsModal()" title="Schedule upcoming sprint so pending items roll over cleanly">
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
            <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openSprintDetailModal('${esc(sprint.id)}')" title="Open full cycle workspace & HH:MM:SS window">
              <i class="fa-regular fa-clock"></i> Cycle Window
            </button>
            ${this._renderSprintOverflowMenu(sprint.id, { unassignedCount, isActive: true })}
          </div>
        </header>

        <!-- SCENARIO-ADAPTIVE TELEMETRY STRIP & SEGMENTED VELOCITY BAR (ONLY WHEN ITEMS EXIST) -->
        ${total > 0 ? `
          <div class="sp-telemetry-band">
            <div class="sp-kpi-strip" style="--kpi-cols: ${kpiItems.length};">
              ${kpiItems.map(item => `
                <div class="sp-kpi-item">
                  <div class="sp-kpi-top">
                    <span class="sp-kpi-label">${item.label}</span>
                    ${item.badge || ''}
                  </div>
                  <div class="sp-kpi-value-row">
                    <strong>${item.value}</strong>
                    <span>${item.subHTML || esc(item.sub || '')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            ${this._renderSegmentedBarHTML(sprintTasks, timeProgressPct)}
          </div>
        ` : ''}

        <!-- EXECUTION WORKSPACE -->
        <div class="sp-execution-body">
          ${total > 0 ? `
            <div class="sp-stage-toolbar">
              <div class="sp-stage-toolbar-left">
                <div class="sp-segmented" role="group" aria-label="View mode">
                  <button type="button" class="sp-seg-btn ${effectiveViewMode === 'lanes' ? 'is-active' : ''}" data-active-view-mode="lanes">
                    <i class="fa-solid fa-bars-staggered"></i>
                    <span>List</span>
                  </button>
                  ${supportsProjectView ? `
                    <button type="button" class="sp-seg-btn ${effectiveViewMode === 'project' ? 'is-active' : ''}" data-active-view-mode="project">
                      <i class="fa-solid fa-folder-tree"></i>
                      <span>By Project</span>
                    </button>
                  ` : ''}
                  <button type="button" class="sp-seg-btn ${effectiveViewMode === 'board' ? 'is-active' : ''}" data-active-view-mode="board">
                    <i class="fa-solid fa-table-columns"></i>
                    <span>Board</span>
                  </button>
                </div>

                ${showStatusFilters ? `
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

              ${unassignedCount > 0 ? `
                <div class="sp-stage-toolbar-right">
                  <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}">
                    <i class="fa-solid fa-arrow-down-short-wide"></i>
                    <span>Pull Backlog (${unassignedCount})</span>
                  </button>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- INLINE WORK ITEM COMPOSER -->
          ${this._renderQuickAddComposer(sprint, { defaultProjectId, showQuickProjectSelect })}

          <!-- DYNAMIC EXECUTION CANVAS -->
          <div class="sp-stage-canvas" data-sp-refresh="active-canvas">
            ${this._renderActiveCanvasHTML(sprint, sprintTasks, selectedProjectId)}
          </div>
        </div>
      </article>
    `;
  },

  _renderActiveCanvasHTML(sprint, sprintTasks, selectedProjectId = null) {
    const esc = Utils.escapeHTML;

    if (sprintTasks.length === 0) {
      const unassignedCount = (AppState.tasks || []).filter(
        t => !t.sprintId && t.status !== 'done' && t.status !== 'cancelled' && (!sprint.projectId || t.projectId === sprint.projectId)
      ).length;

      return `
        <div class="sp-empty-well sprint-drop-empty">
          <i class="fa-regular fa-square-plus"></i>
          <strong>No work items in ${esc(sprint.name)} yet</strong>
          <span>Use the quick-add bar above, drag tasks from your backlog, or commit existing items.</span>
          <div class="sp-empty-actions">
            ${unassignedCount > 0 ? `
              <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}">
                <i class="fa-solid fa-arrow-down-short-wide"></i> Pull from Backlog (${unassignedCount})
              </button>
            ` : ''}
            <button type="button" class="btn btn-primary btn-sm" onclick="TaskModal.openCreate({ sprintId: '${esc(sprint.id)}', projectId: '${esc(sprint.projectId || '')}' })">
              <i class="fa-solid fa-plus"></i> Create Task
            </button>
          </div>
        </div>
      `;
    }

    const distinctProjects = new Set(sprintTasks.map(t => t.projectId).filter(Boolean));
    const supportsProjectView = distinctProjects.size > 1;
    const effectiveViewMode = (this.activeViewMode === 'project' && !supportsProjectView) ? 'lanes' : this.activeViewMode;
    const showProjectChip = !sprint.projectId && !selectedProjectId && distinctProjects.size > 1;

    const visibleTasks = sprintTasks
      .filter(t => this._matchesQuery(t))
      .filter(t => {
        if (effectiveViewMode === 'board' || this.activeStatusFilter === 'all') return true;
        if (this.activeStatusFilter === 'todo') return t.status === 'todo' || t.status === 'backlog';
        if (this.activeStatusFilter === 'inreview') return t.status === 'inreview' || t.status === 'blocked';
        return t.status === this.activeStatusFilter;
      })
      .sort((a, b) => this._sortByItemId(a, b));

    if (visibleTasks.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-filter-circle-xmark"></i>
          <strong>No matching work items</strong>
          <span>${this.searchQuery ? `Nothing matched "${esc(this.searchQuery)}"` : 'No items match the selected status filter.'}</span>
          ${this.activeStatusFilter !== 'all' ? `<button type="button" class="btn btn-secondary btn-sm" data-reset-status-filter="1">Show All Items</button>` : ''}
        </div>
      `;
    }

    if (effectiveViewMode === 'project') {
      return this.renderActiveProjectMatrix(sprint, visibleTasks);
    }
    if (effectiveViewMode === 'board') {
      return this.renderActiveKanbanBoard(sprint, visibleTasks, { showProjectChip });
    }
    return this.renderActiveStatusSwimlanes(sprint, visibleTasks, { showProjectChip });
  },

  _renderUpcomingListHTML(plannedSprints, filteredTasks, hasActiveSprint = false) {
    const q = (this.searchQuery || '').trim().toLowerCase();
    const matchingSprints = !q
      ? plannedSprints
      : plannedSprints.filter(sprint => {
        if ((sprint.name || '').toLowerCase().includes(q) || (sprint.goal || '').toLowerCase().includes(q)) return true;
        return filteredTasks.some(t => t.sprintId === sprint.id && this._matchesQuery(t));
      });

    if (matchingSprints.length === 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-magnifying-glass"></i>
          <strong>No upcoming sprints match "${Utils.escapeHTML(this.searchQuery)}"</strong>
        </div>
      `;
    }

    return matchingSprints
      .map((sprint, idx) => this.renderCompressedUpcomingSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id), idx, { hasActiveSprint }))
      .join('');
  },

  _renderBacklogPoolPanel(backlogTasks, quickTargetSprint, selectedProjectId = null, options = {}) {
    const esc = Utils.escapeHTML;
    const totalPts = backlogTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);

    return `
      <div class="sp-panel sp-backlog-panel sprint-drop-zone" data-sprint-id="">
        <div class="sp-panel-head">
          <div class="sp-panel-title-wrap">
            <h3>Product Backlog</h3>
            <span class="sp-count-pill">${backlogTasks.length}</span>
          </div>
          <div class="sp-panel-head-right">
            ${totalPts > 0 ? `<span class="sp-muted-meta">${totalPts} pts</span>` : ''}
            ${options.showPlanSprintHint ? `
              <button type="button" class="btn btn-ghost btn-sm" onclick="BacklogView.openCreateSprintModal()">
                <i class="fa-regular fa-calendar-plus"></i> Queue Next Sprint
              </button>
            ` : (options.showDropHint !== false && quickTargetSprint ? `<span class="sp-muted-hint">Drag into a sprint</span>` : '')}
          </div>
        </div>

        <form id="sp-backlog-quick-form" class="sp-backlog-composer">
          <span class="sp-composer-icon"><i class="fa-solid fa-plus"></i></span>
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
          ${this._renderBacklogPoolList(backlogTasks, quickTargetSprint, selectedProjectId)}
        </div>
      </div>
    `;
  },

  _renderBacklogPoolList(backlogTasks, quickTargetSprint, selectedProjectId = null) {
    const esc = Utils.escapeHTML;
    const matching = backlogTasks.filter(t => this._matchesQuery(t));

    if (matching.length === 0 && backlogTasks.length > 0) {
      return `
        <div class="sp-empty-well is-compact">
          <i class="fa-solid fa-magnifying-glass"></i>
          <strong>No backlog items match "${esc(this.searchQuery)}"</strong>
        </div>
      `;
    }

    const distinctProjects = new Set(backlogTasks.map(t => t.projectId).filter(Boolean));
    const showProjDot = !selectedProjectId && distinctProjects.size > 1;
    const shortTargetLabel = quickTargetSprint
      ? (quickTargetSprint.status === 'active' ? 'Active' : 'Next')
      : '';

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
            ${showProjDot && project ? `<span class="sp-dot" style="background:${pColor};" title="${esc(project.name)}"></span>` : ''}
            <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
            ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints}p</span>` : ''}
            ${quickTargetSprint ? `
              <button type="button"
                      class="sp-assign-btn"
                      data-quick-assign-task="${esc(task.id)}"
                      data-target-sprint-id="${esc(quickTargetSprint.id)}"
                      title="Move to ${esc(quickTargetSprint.name)}">
                <i class="fa-solid fa-arrow-turn-up"></i>
                <span>${esc(shortTargetLabel)}</span>
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

  // ── MODE 1: STATUS SWIMLANES (NO EMPTY LANE CLUTTER + DRAG-REVEALED STATUS DOCK) ──
  renderActiveStatusSwimlanes(sprint, tasks, opts = {}) {
    const esc = Utils.escapeHTML;
    const allLanes = [
      {
        id: 'inprogress',
        label: 'In Progress & Review',
        accent: 'var(--status-inprogress)',
        items: tasks.filter(t => t.status === 'inprogress' || t.status === 'inreview' || t.status === 'blocked')
      },
      {
        id: 'todo',
        label: 'To Do',
        accent: 'var(--status-todo)',
        items: tasks.filter(t => t.status === 'todo' || t.status === 'backlog')
      },
      {
        id: 'done',
        label: 'Done',
        accent: 'var(--sp-success-dot)',
        collapsible: true,
        items: tasks.filter(t => t.status === 'done')
      }
    ];

    const populatedLanes = allLanes.filter(l => l.items.length > 0);
    const emptyLanes = allLanes.filter(l => l.items.length === 0);

    return `
      <div class="sp-swimlanes">
        ${populatedLanes.map(lane => {
          const pts = lane.items.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
          const isCollapsed = lane.collapsible && this.doneLaneCollapsed;
          return `
            <div class="sp-swimlane ${lane.id === 'done' ? 'is-done-lane' : ''} ${isCollapsed ? 'is-collapsed' : ''}" style="--lane-color: ${lane.accent};">
              <div class="sp-swimlane-head" ${lane.collapsible ? `data-toggle-done-lane="1" role="button" tabindex="0" aria-expanded="${!isCollapsed}"` : ''}>
                <div class="sp-swimlane-title">
                  ${lane.collapsible ? `<i class="fa-solid fa-chevron-down sp-lane-chevron"></i>` : ''}
                  <span class="sp-swimlane-dot"></span>
                  <strong>${lane.label}</strong>
                  <span class="sp-swimlane-count">${lane.items.length}</span>
                </div>
                ${pts > 0 ? `<span class="sp-swimlane-pts">${pts} pts</span>` : ''}
              </div>
              <div class="sp-swimlane-body" data-status-col="${lane.id}" data-sprint-id="${esc(sprint.id)}">
                ${lane.items.map(t => this.renderActiveWorkItemRow(t, sprint.id, opts)).join('')}
              </div>
            </div>
          `;
        }).join('')}

        ${emptyLanes.length > 0 ? `
          <div class="sp-drag-status-dock" aria-hidden="true">
            <span class="sp-drag-dock-label"><i class="fa-solid fa-arrows-up-down-left-right"></i> Drop to update status:</span>
            ${emptyLanes.map(lane => `
              <div class="sp-status-drop-chip" style="--lane-color: ${lane.accent};" data-status-col="${lane.id}" data-sprint-id="${esc(sprint.id)}">
                <span class="sp-swimlane-dot"></span>
                <span>${lane.label}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  // ── MODE 2: PROJECT MATRIX (MULTI-PROJECT ONLY, ZERO REDUNDANT PROJECT CHIPS) ──
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
                  <div class="sp-mini-bar"><span style="width:${grpPct}%; background:${pColor};"></span></div>
                  <span>${grpDone}/${g.tasks.length} done</span>
                  ${grpPts > 0 ? `<span class="sp-pts-badge">${grpPts} pts</span>` : ''}
                </div>
              </div>
              <div class="sp-workitem-table">
                ${g.tasks.map(t => this.renderActiveWorkItemRow(t, sprint.id, { showProjectChip: false })).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // ── MODE 3: 4-COLUMN KANBAN BOARD ──
  renderActiveKanbanBoard(sprint, tasks, opts = {}) {
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
        accent: 'var(--sp-success-dot)',
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
                  ? col.items.map(t => this.renderBoardMiniCard(t, sprint.id, opts)).join('')
                  : `<div class="sp-board-col-empty">Drop items here</div>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderBoardMiniCard(task, sprintId, opts = {}) {
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
            ${opts.showProjectChip && project ? `<span class="sp-dot" style="background:${pColor};" title="${esc(project.name)}"></span>` : ''}
            ${isBlocked ? `<span class="sp-pill tone-danger">Blocked</span>` : ''}
            ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints}p</span>` : ''}
            ${subtasks.length ? `<span class="sp-chip"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
            ${dueChip}
          </div>
          ${StatusControl.pillHTML(task)}
        </div>
      </div>
    `;
  },

  renderActiveWorkItemRow(task, sprintId, opts = {}) {
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
      dueTag = `<span class="sp-due-tag ${overdue ? 'is-overdue' : ''}"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>`;
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
          ${opts.showProjectChip && project ? `<span class="sp-chip"><span class="sp-dot" style="background:${pColor}"></span>${esc(project.key || project.name)}</span>` : ''}
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

  // ── UPCOMING SPRINT CARD (SCENARIO-AWARE ACTIONS, EXCEPTION-ONLY BADGES) ──
  renderCompressedUpcomingSprint(sprint, sprintTasks, index = 0, opts = {}) {
    const esc = Utils.escapeHTML;
    const hasActiveSprint = Boolean(opts.hasActiveSprint);
    const sortedTasks = [...sprintTasks].sort((a, b) => this._sortByItemId(a, b));
    const total = sortedTasks.length;
    const totalPoints = sortedTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const sprintProject = (!AppState.selectedProjectId && sprint.projectId)
      ? AppState.projects.find(p => p.id === sprint.projectId)
      : null;
    const accentColor = (sprintProject && sprintProject.color) || 'var(--sp-brand)';
    const isAutoGlobal = !(AppState.settings && AppState.settings.autoSprintSchedule === false);
    const isManualOverride = isAutoGlobal && sprint.autoSchedule === false;

    let cycleDays = '';
    if (sprint.startDate && sprint.endDate) {
      const d = Math.max(1, Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000));
      if (!isNaN(d)) cycleDays = `${d}d`;
    }

    const previewKeys = sortedTasks.slice(0, 4);
    const remainingKeys = Math.max(0, sortedTasks.length - previewKeys.length);

    return `
      <article class="sp-upcoming-card sprint-drop-zone ${index === 0 && hasActiveSprint ? 'is-next-up' : ''}"
               style="--card-accent: ${accentColor};"
               data-sprint-id="${esc(sprint.id)}"
               data-open-sprint-popup="${esc(sprint.id)}"
               title="Click to open ${esc(sprint.name)} workspace">
        <div class="sp-up-main">
          <div class="sp-up-head">
            <div class="sp-up-title-group">
              ${index === 0 && hasActiveSprint ? `<span class="sp-pill tone-brand">Next</span>` : `<span class="sp-seq-tag">#${hasActiveSprint ? index + 1 : index + 2}</span>`}
              <h4>${esc(sprint.name)}</h4>
              ${sprintProject ? `
                <span class="sp-chip">
                  <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                  ${esc(sprintProject.key || sprintProject.name)}
                </span>
              ` : ''}
              ${isManualOverride ? `<span class="sp-pill tone-neutral" title="Auto-Pilot disabled for this sprint">Manual</span>` : ''}
            </div>
            ${sprint.startDate && sprint.endDate ? `
              <span class="sp-up-window">
                ${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)}${cycleDays ? ` · ${cycleDays}` : ''}
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
              ` : `<span class="sp-muted-hint">Drop backlog items here</span>`}
            </div>

            <div class="sp-up-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}" title="Commit backlog items">
                <i class="fa-solid fa-plus"></i> Scope
              </button>
              <button type="button" class="sp-icon-btn sp-reveal-action" onclick="event.stopPropagation(); BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit sprint">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button type="button" class="sp-icon-btn sp-reveal-action" data-open-sprint-popup-btn="${esc(sprint.id)}" title="Open cycle workspace">
                <i class="fa-solid fa-up-right-from-square"></i>
              </button>
              ${!hasActiveSprint ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); BacklogView.startSprint('${esc(sprint.id)}')">
                  <i class="fa-solid fa-play"></i> Start
                </button>
              ` : ''}
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
    const sprintProject = (!AppState.selectedProjectId && sprint.projectId)
      ? AppState.projects.find(p => p.id === sprint.projectId)
      : null;

    const ringC = 2 * Math.PI * 18;
    const ringOffset = ringC * (1 - stats.completionPct / 100);
    const ringColor = stats.completionPct >= 80
      ? 'var(--sp-success-dot)'
      : stats.completionPct >= 50
        ? 'var(--sp-warning-dot)'
        : 'var(--sp-brand)';

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
                  ${esc(sprintProject.key || sprintProject.name)}
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
            ${stats.committedPoints > 0 ? `<span class="sp-metric-chip is-pts"><strong>${stats.completedPoints}/${stats.committedPoints}</strong> pts</span>` : ''}
            ${stats.totalTracked > 0 ? `<span class="sp-metric-chip"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(stats.totalTracked)}</span>` : ''}
            ${stats.incompleteCount > 0 ? `<span class="sp-pill tone-warning">${stats.incompleteCount} rolled over</span>` : ''}
          </div>

          <div class="sp-history-actions">
            <button type="button" class="sp-icon-btn sp-reveal-action" onclick="event.stopPropagation(); AppState.reopenSprint('${esc(sprint.id)}')" title="Reopen sprint">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button type="button" class="sp-icon-btn sp-reveal-action" onclick="event.stopPropagation(); BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit sprint">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button type="button" class="sp-icon-btn sp-reveal-action is-danger" onclick="event.stopPropagation(); AppState.deleteSprint('${esc(sprint.id)}')" title="Delete sprint">
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
  openSprintDetailModal(sprintId, options = {}) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    if (sprint.status === 'completed') {
      this.openSprintReportModal(sprintId);
      return;
    }

    let isScheduleOpen = Boolean(options.openSchedule);
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
      let timeElapsedPct = null;
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

      const kpiCards = [];
      if (total > 0) {
        kpiCards.push({
          label: 'Completion',
          value: `${progress}%`,
          sub: `${doneCount} of ${total} done`
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
            label: isActive ? 'Elapsed' : 'Duration',
            value: isActive && timeElapsedPct !== null ? `${timeElapsedPct}%` : `${cycleDays}d`,
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
                <span class="${isActive ? 'sp-live-pill' : 'sp-pill tone-brand'}">
                  ${isActive ? '<span class="sp-live-dot"></span> Active Sprint' : 'Planned Sprint'}
                </span>
                <span class="sp-pill ${timingTone}">${esc(timingLabel)}</span>
                ${sprintProject ? `
                  <span class="sp-chip">
                    <span class="sp-dot" style="background:${sprintProject.color || 'var(--accent-primary)'};"></span>
                    ${esc(sprintProject.name)}
                  </span>
                ` : ''}
                ${freshSprint.autoSchedule === false && !(AppState.settings && AppState.settings.autoSprintSchedule === false)
                  ? `<span class="sp-pill tone-neutral">Manual Schedule</span>`
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
              <button type="button" class="btn btn-secondary btn-sm" id="popup-btn-edit-sprint" title="Edit sprint details">
                <i class="fa-solid fa-pen"></i> Settings
              </button>
              <button type="button" class="btn btn-primary btn-sm" id="popup-btn-new-issue" title="Open full task editor">
                <i class="fa-solid fa-plus"></i> Full Task
              </button>
            </div>
          </div>

          <!-- COLLAPSIBLE PRECISION HH:MM:SS WINDOW EDITOR -->
          <div class="sp-popup-datetime-bar ${isScheduleOpen ? '' : 'sp-is-hidden'}" data-sp-schedule-drawer="1" aria-label="Edit sprint schedule">
            <div class="sp-popup-dt-group">
              <label class="sp-popup-dt-field-label" for="popup-sprint-start-date">
                <i class="fa-regular fa-calendar-check"></i> Start (Date &amp; HH:MM:SS)
              </label>
              <div class="sp-popup-dt-inputs">
                <input type="date" id="popup-sprint-start-date" class="form-input sp-popup-date-input" value="${esc(Utils.toDateInputValue(startMs))}" aria-label="Sprint start date">
                <input type="time" id="popup-sprint-start-time" class="form-input sp-popup-time-input" step="1" value="${esc(startTimeHMS)}" aria-label="Sprint start time HH:MM:SS">
                <span class="sp-hms-readout" id="popup-start-hms-readout">${esc(startTimeHMS)}</span>
              </div>
            </div>

            <span class="sp-popup-dt-bar-arrow"><i class="fa-solid fa-arrow-right-long"></i></span>

            <div class="sp-popup-dt-group">
              <label class="sp-popup-dt-field-label" for="popup-sprint-end-date">
                <i class="fa-solid fa-flag-checkered"></i> End (Date &amp; HH:MM:SS)
              </label>
              <div class="sp-popup-dt-inputs">
                <input type="date" id="popup-sprint-end-date" class="form-input sp-popup-date-input" value="${esc(Utils.toDateInputValue(endMs))}" aria-label="Sprint end date">
                <input type="time" id="popup-sprint-end-time" class="form-input sp-popup-time-input" step="1" value="${esc(endTimeHMS)}" aria-label="Sprint end time HH:MM:SS">
                <span class="sp-hms-readout" id="popup-end-hms-readout">${esc(endTimeHMS)}</span>
              </div>
            </div>

            <button type="button" class="btn btn-primary btn-sm sp-popup-dt-save-btn" id="popup-btn-save-datetime">
              <i class="fa-solid fa-check"></i> Apply Window
            </button>
          </div>

          <!-- SCENARIO-ADAPTIVE KPI BAR + SEGMENTED VELOCITY RAIL -->
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
              ${this._renderSegmentedBarHTML(sprintTasks, isActive ? timeElapsedPct : null)}
            </div>
          ` : ''}

          <!-- INLINE QUICK-ADD INSIDE WORKSPACE POPUP -->
          <form id="popup-quick-add-form" class="sp-composer">
            <span class="sp-composer-icon"><i class="fa-solid fa-plus"></i></span>
            <input type="text" id="popup-quick-title" placeholder="Quick-add task to ${esc(freshSprint.name)}... (Enter)" maxlength="180" autocomplete="off">
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
              ${total >= 5 ? `
                <div class="sp-popup-search">
                  <i class="fa-solid fa-magnifying-glass"></i>
                  <input type="text" id="popup-task-search" value="${esc(popupSearchQuery)}" placeholder="Filter items..." aria-label="Filter tasks in sprint">
                </div>
              ` : ''}
            </div>

            ${total === 0 ? `
              <div class="sc-empty-box">
                <strong>No work items in ${esc(freshSprint.name)} yet</strong>
                <p>Capture a task above or pull existing items from your product backlog.</p>
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
          class: 'btn-ghost sp-footer-danger-left',
          onClick: () => {
            Modal.confirm(
              `Delete ${freshSprint.name}?`,
              'This removes the sprint and moves any open tasks back to the backlog.',
              () => {
                AppState.deleteSprint(freshSprint.id, true, false);
              }
            );
          }
        },
        {
          text: 'Close',
          class: 'btn-secondary',
          onClick: () => Modal.close()
        }
      ];

      if (isActive) {
        footerButtons.push({
          text: '<i class="fa-solid fa-flag-checkered"></i> Complete Sprint',
          class: 'btn-primary',
          onClick: () => {
            Modal.close();
            this.completeSprint(freshSprint.id);
          }
        });
      } else if (!hasAnotherActiveSprint) {
        footerButtons.push({
          text: '<i class="fa-solid fa-play"></i> Start Sprint',
          class: 'btn-primary',
          onClick: () => {
            const started = AppState.startSprint(freshSprint.id);
            if (started) Modal.close();
          }
        });
      }

      Modal.open({
        title: `<i class="fa-regular fa-calendar-check"></i> ${esc(freshSprint.name)}`,
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
            if (e.target.closest('button') || e.target.closest('select') || e.target.closest('.tf-dropdown-trigger')) return;
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
              Toast.info('Moved work item back to backlog');
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
      dueChip = `<span class="sp-due-tag ${overdue ? 'is-overdue' : ''}"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>`;
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
    const typeIcon = this._getTypeIcon(task.type);
    const priorityIcon = this._getPriorityIcon(task.priority);

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
          ${isRolledOver ? `<span class="sp-pill tone-warning">${currentSprint ? `In ${esc(currentSprint.name)}` : 'In Backlog'}</span>` : ''}
          ${typeof StatusControl !== 'undefined' ? StatusControl.pillHTML(task) : `<span class="sp-pill tone-neutral">${esc(task.status)}</span>`}
        </div>
      </div>
    `;
  },

  // ── POPUP MODAL FOR COMPLETED SPRINT RETROSPECTIVE REPORT ──
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

    const multiProject = stats.projectBreakdown.length > 1;

    // Scenario-adaptive retrospective KPIs (omit zero-signal metrics)
    const reportKpis = [
      {
        label: 'Items Delivered',
        value: `${stats.completedCount}<small>/${stats.committedCount}</small>`,
        sub: stats.incompleteCount > 0
          ? `${stats.incompleteCount} rolled over ${stats.movedToSprint ? `to ${stats.movedToSprint.name}` : 'to backlog'}`
          : '100% of scope delivered'
      }
    ];
    if (stats.committedPoints > 0) {
      reportKpis.push({
        label: 'Points Burned',
        value: `${stats.completedPoints}<small>/${stats.committedPoints} pts</small>`,
        sub: `${stats.pointsPct}% point velocity`
      });
    }
    if (stats.totalTracked > 0 || stats.totalEstimate > 0) {
      reportKpis.push({
        label: 'Time Logged',
        value: Utils.formatMinutes(stats.totalTracked),
        sub: stats.totalEstimate ? `of ${Utils.formatMinutes(stats.totalEstimate)} estimated` : 'Logged across cycle'
      });
    }
    if (multiProject) {
      reportKpis.push({
        label: 'Projects',
        value: `${stats.projectBreakdown.length}`,
        sub: `${stats.allTasks.length} total work items`
      });
    } else if (reportKpis.length < 3) {
      reportKpis.push({
        label: 'Cycle Length',
        value: `${stats.durationDays}d`,
        sub: `Closed ${stats.completedAtLabel}`
      });
    }

    const ringC = 2 * Math.PI * 22;
    const ringOffset = ringC * (1 - stats.completionPct / 100);
    const ringColor = stats.completionPct >= 80
      ? 'var(--sp-success-dot)'
      : stats.completionPct >= 50
        ? 'var(--sp-warning-dot)'
        : 'var(--sp-brand)';

    const renderGroupList = (groups, isRolledOver) => {
      if (groups.length === 1) {
        return `
          <div class="sc-project-group">
            <div class="sc-task-list">
              ${groups[0].tasks.map(t => this._renderCompletedSprintTaskRow(t, isRolledOver)).join('')}
            </div>
          </div>
        `;
      }
      return `
        <div class="sc-project-groups">
          ${groups.map(group => {
            const grpPts = group.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
            return `
              <div class="sc-project-group">
                <div class="sc-project-group-header">
                  <div class="sc-project-group-left">
                    <span class="sc-dot" style="background: ${group.project.color || '#388bfd'};"></span>
                    <strong>${esc(group.project.name)}</strong>
                    ${group.project.key ? `<span class="sc-proj-key">${esc(group.project.key)}</span>` : ''}
                  </div>
                  <span class="sc-proj-meta">${group.tasks.length} item${group.tasks.length === 1 ? '' : 's'}${grpPts > 0 ? ` · ${grpPts} pts` : ''}</span>
                </div>
                <div class="sc-task-list">
                  ${group.tasks.map(t => this._renderCompletedSprintTaskRow(t, isRolledOver)).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    const bodyHTML = `
      <div class="sprint-report-modal">
        <div class="sprint-report-banner">
          <div class="sp-popup-summary-left">
            <div class="sprint-report-dates">
              <span class="sp-pill tone-success"><i class="fa-solid fa-check"></i> Completed Cycle</span>
              <span class="sp-popup-dates">
                <i class="fa-regular fa-calendar"></i>
                <span class="sp-popup-dt-pair">
                  <strong>${esc(startDateLabel)}</strong>
                  <code class="sp-hms-badge">${esc(startTimeHMS)}</code>
                </span>
                <span class="sp-popup-dt-sep">→</span>
                <span class="sp-popup-dt-pair">
                  <strong>${esc(endDateLabel)}</strong>
                  <code class="sp-hms-badge">${esc(endTimeHMS)}</code>
                </span>
                <span class="sp-popup-dt-days">(${stats.durationDays}d)</span>
              </span>
            </div>
            ${sprint.goal ? `<p class="sprint-report-goal">${esc(sprint.goal)}</p>` : ''}
          </div>
          <div class="sp-report-ring-wrap">
            <div class="sp-medallion is-lg">
              <svg viewBox="0 0 52 52" aria-hidden="true">
                <circle class="sp-medallion-track" cx="26" cy="26" r="22"></circle>
                <circle class="sp-medallion-fill" cx="26" cy="26" r="22"
                  style="stroke: ${ringColor}; stroke-dasharray: ${ringC.toFixed(2)}; stroke-dashoffset: ${ringOffset.toFixed(2)};"></circle>
              </svg>
              <span>${stats.completionPct}%</span>
            </div>
            <span class="sp-report-ring-label">Delivery</span>
          </div>
        </div>

        <div class="sc-kpi-wrap">
          <div class="sc-kpi-grid" style="--kpi-cols:${reportKpis.length};">
            ${reportKpis.map(k => `
              <div class="sc-kpi-card">
                <span class="sc-kpi-label">${k.label}</span>
                <strong class="sc-kpi-value">${k.value}</strong>
                <span class="sc-kpi-sub">${esc(k.sub)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${multiProject ? `
          <div class="sprint-report-section">
            <h4>Project Delivery Breakdown</h4>
            <div class="sprint-report-table-wrap">
              <table class="sprint-report-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Delivered</th>
                    ${stats.committedPoints > 0 ? '<th>Points</th>' : ''}
                    ${stats.totalTracked > 0 ? '<th>Logged</th>' : ''}
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.projectBreakdown.map(pb => `
                    <tr>
                      <td>
                        <span class="sc-dot" style="background:${pb.project.color || '#388bfd'};margin-right:6px;"></span>
                        <strong>${esc(pb.project.name)}</strong>
                        ${pb.project.key ? `<span class="sc-proj-key" style="margin-left:4px;">${esc(pb.project.key)}</span>` : ''}
                      </td>
                      <td>${pb.done} / ${pb.total}</td>
                      ${stats.committedPoints > 0 ? `<td>${pb.ptsDone} / ${pb.ptsTotal} pts</td>` : ''}
                      ${stats.totalTracked > 0 ? `<td>${Utils.formatMinutes(pb.tracked)}</td>` : ''}
                      <td>
                        <div class="sp-table-rate">
                          <div class="sp-mini-bar"><span style="width:${pb.pct}%;background:${pb.project.color || 'var(--sp-brand)'};"></span></div>
                          <strong>${pb.pct}%</strong>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <div class="sprint-report-section">
          <div class="sc-tasks-section-head">
            <h4>Delivered Work Items <span class="sp-count-pill is-success">${stats.completedTasks.length}</span></h4>
          </div>
          ${completedGroups.length
            ? renderGroupList(completedGroups, false)
            : '<div class="sc-empty-box">No completed work items recorded in this sprint.</div>'}
        </div>

        ${incompleteGroups.length ? `
          <div class="sprint-report-section">
            <div class="sc-tasks-section-head">
              <h4>Rolled-Over Work Items <span class="sp-count-pill">${stats.incompleteTasks.length}</span></h4>
              <span class="sp-muted-meta">${stats.movedToSprint ? `Moved to ${esc(stats.movedToSprint.name)}` : 'Returned to Backlog'}</span>
            </div>
            ${renderGroupList(incompleteGroups, true)}
          </div>
        ` : ''}
      </div>
    `;

    Modal.open({
      title: `<i class="fa-solid fa-chart-pie"></i> Retrospective: ${esc(sprint.name)}`,
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
