/**
 * TaskForge — Sprint Studio & Iteration Command Deck
 *
 * Bespoke modern UI/UX architecture (Linear Cycles × Executive Flight Deck):
 * 1. Top Studio Bar + Interactive Cycle Pipeline Ribbon (Completed -> LIVE ACTIVE -> Upcoming Queue)
 * 2. Active Sprint Split-Studio at Top:
 *    - Left Telemetry Pod: 112px Dual-Arc SVG Radial Gauge (Work Done % vs Time Elapsed %),
 *      Live Timeline Pin Bar, Sprint Objective Card, Interactive 2x2 Status Matrix Filter, & Velocity Readout
 *    - Right Execution Canvas: Inline Issue Composer + 3 Switchable Execution Views:
 *        a) Status Swimlanes (Linear-style grouped status strips with inline controls)
 *        b) Project Matrix (Segregated by project with per-project progress & natural ID sorting)
 *        c) 4-Column Kanban Board (Drag & drop across statuses)
 * 3. Side-by-Side Lower Vaults:
 *    - Left Vault (Upcoming Sprints): Vertical connected timeline cards with sequence nodes,
 *      capacity meters, key previews, drag-and-drop targeting, and 1-click Popup Workspace expansion
 *    - Right Vault (Completed Sprints): Executive retrospective ledger cards with SVG delivery rings,
 *      velocity metrics, and 1-click Retrospective Report Popup expansion
 */

const BacklogView = {
  activeStatusFilter: 'all', // 'all' | 'todo' | 'inprogress' | 'inreview' | 'blocked' | 'done'
  activeViewMode: 'lanes',   // 'lanes' | 'project' | 'board'
  searchQuery: '',

  attachListeners(container) {
    const createBtn = container.querySelector('#btn-sprint-create-task');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());

    const createBtnEmpty = container.querySelector('#btn-sprint-create-task-empty');
    if (createBtnEmpty) createBtnEmpty.addEventListener('click', () => TaskModal.openCreate());

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
        Toast.info(`Sprint Time Auto-Pilot ${nextEnabled ? 'enabled (Auto-open, auto-close & rollover)' : 'paused'}`);
        if (nextEnabled && typeof Automations !== 'undefined' && typeof Automations.checkSprintSchedule === 'function') {
          Automations.checkSprintSchedule();
        }
        this.render(container);
      });
    }

    // Live search input
    const searchInput = container.querySelector('#sp-global-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value || '';
        const pos = searchInput.selectionStart;
        this.render(container);
        const nextInput = container.querySelector('#sp-global-search');
        if (nextInput) {
          nextInput.focus();
          try { nextInput.setSelectionRange(pos, pos); } catch (_) { }
        }
      });
    }

    const clearSearchBtn = container.querySelector('#sp-clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render(container);
      });
    }

    // Global Project Scope Pills
    container.querySelectorAll('[data-sp-project-scope]').forEach(tab => {
      tab.addEventListener('click', () => {
        const projId = tab.dataset.spProjectScope || null;
        AppState.selectedProjectId = projId === '__all__' ? null : projId;
        if (typeof Sidebar !== 'undefined' && Sidebar.syncProjectPicker) {
          Sidebar.syncProjectPicker();
        }
        if (typeof Router !== 'undefined' && Router.updateTopbarProjectPicker) {
          Router.updateTopbarProjectPicker();
        }
        AppState.emit('projects:changed', { action: 'select', projectId: AppState.selectedProjectId });
        this.render(container);
      });
    });

    // Active sprint status filter triggers (2x2 matrix cells + filter pills)
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

        const projectId = (projSelect && projSelect.value) || AppState.selectedProjectId || (AppState.projects[0] && AppState.projects[0].id) || 'proj_web';
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

        Toast.success('Committed new work item to active sprint');
      });
    }

    // Add Existing Tasks buttons
    container.querySelectorAll('.btn-add-existing').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sprintId = btn.dataset.sprintId;
        this.openAddExistingTasksModal(sprintId);
      });
    });

    // Compressed Upcoming Sprint Card -> Expand in Popup
    container.querySelectorAll('[data-open-sprint-popup]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button:not([data-open-sprint-popup-btn])')) return;
        const sprintId = el.dataset.openSprintPopup;
        if (sprintId) this.openSprintDetailModal(sprintId);
      });
    });

    // Compressed Completed Sprint Card -> Expand in Popup
    container.querySelectorAll('[data-open-completed-popup]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button:not([data-open-completed-popup-btn])')) return;
        const sprintId = el.dataset.openCompletedPopup;
        if (sprintId) this.openSprintReportModal(sprintId);
      });
    });

    // HTML5 Drag & Drop: Task Cards & Rows
    const draggableRows = container.querySelectorAll('.backlog-item-row');
    draggableRows.forEach(row => {
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
    const statusZones = container.querySelectorAll('[data-status-col]');
    statusZones.forEach(col => {
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

    // Sprint Drop Zones (Active Sprint & Compressed Upcoming Cards)
    const dropZones = container.querySelectorAll('.sprint-drop-zone');
    dropZones.forEach(zone => {
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
        if (!task || task.sprintId === targetSprintId) return;

        AppState.updateTask(taskId, { sprintId: targetSprintId });
        const targetSprint = targetSprintId ? AppState.sprints.find(s => s.id === targetSprintId) : null;
        Toast.success(`Moved ${task.key} to ${targetSprint ? targetSprint.name : 'backlog'}`);
      });
    });

    // Remove from sprint buttons
    container.querySelectorAll('.btn-remove-from-sprint').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        AppState.updateTask(taskId, { sprintId: null });
        Toast.info('Removed work item from sprint');
      });
    });

    // Delegated task row/card actions
    const pageRoot = container.querySelector('.backlog-page');
    if (pageRoot) {
      pageRoot.addEventListener('click', (e) => {
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
      title: `Complete Cycle: ${ Utils.escapeHTML(sprint.name) } `,
      body: bodyHTML,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: incomplete.length > 0 ? `Complete & Move Pending to ${ nextScheduled.name } ` : 'Complete Cycle',
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
    const suggestedName = `Sprint ${ suggestedNextNum } `;
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

        ${
  previewPending.length > 0 ? `
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
      { name: `Sprint ${ baseNum } — Foundation & Architecture`, goal: 'Core infrastructure and high-priority deliverables' },
      { name: `Sprint ${ baseNum + 1 } — Feature Execution`, goal: 'Primary user-facing workflows and API integration' },
      { name: `Sprint ${ baseNum + 2 } — Hardening & Polish`, goal: 'QA verification, performance tuning, and release prep' }
    ];

    const modalBody = `
  <div class="sp-stack-modal" id="sp-stack-modal-root">
    ${
      completeSprintIdAfterStack ? `
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
                Toast.warning(`Please enter a custom name for Sprint #${ i + 1}.`);
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
          if (badge) badge.innerHTML = `<i class="fa-regular fa-calendar"></i> ${ esc(w.startLabel) } → ${ esc(w.endLabel) } `;
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
            name: `Sprint ${ baseNum + nextIdx } — Cycle ${ nextIdx + 1 } `,
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
      title: `Edit Sprint Cycle: ${ Utils.escapeHTML(sprint.name) } `,
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
    const tasks = AppState.tasks || [];
    const projects = AppState.projects || [];
    const selectedProjectId = AppState.selectedProjectId;

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
    const unassignedCount = filteredTasks.filter(t => !t.sprintId && t.status !== 'done' && t.status !== 'cancelled').length;

    const plannedTotalItems = plannedSprints.reduce((s, sp) => s + filteredTasks.filter(t => t.sprintId === sp.id).length, 0);
    const plannedTotalPts = plannedSprints.reduce((s, sp) => {
      return s + filteredTasks.filter(t => t.sprintId === sp.id).reduce((pts, t) => pts + (Number(t.storyPoints) || 0), 0);
    }, 0);

    const completedStatsList = completedSprints.map(s => this._analyzeCompletedSprint(s, filteredTasks.filter(t => t.sprintId === s.id)));
    const avgDeliveryPct = completedStatsList.length
      ? Math.round(completedStatsList.reduce((sum, st) => sum + st.completionPct, 0) / completedStatsList.length)
      : 0;
    const totalCompletedPts = completedStatsList.reduce((sum, st) => sum + st.completedPoints, 0);

    container.innerHTML = `
  <div class="view-page backlog-page sp-studio-page">
        <!--1. UNIFIED STUDIO HEADER + CYCLE PIPELINE RIBBON-->
  <header class="sp-studio-header">
    <div class="sp-studio-top">
      <div class="sp-studio-title-cluster">
        <div class="sp-studio-emblem">
          <i class="fa-solid fa-infinity"></i>
        </div>
        <div>
          <div class="sp-studio-kicker">AGILE ITERATION STUDIO</div>
          <h1>Sprint Planning</h1>
        </div>
      </div>

      <!-- Horizontal Cycle Pipeline Stepper -->
      <div class="sp-cycle-stepper" aria-label="Iteration lifecycle overview">
        <div class="sp-step-node is-past">
          <span class="sp-step-icon"><i class="fa-solid fa-check-double"></i></span>
          <div class="sp-step-copy">
            <span class="sp-step-label">ARCHIVED</span>
            <strong>${completedSprints.length} Closed · ${avgDeliveryPct}% Avg</strong>
          </div>
        </div>
        <span class="sp-step-arrow"><i class="fa-solid fa-chevron-right"></i></span>
        <div class="sp-step-node ${activeSprint ? 'is-live' : 'is-idle'}">
          <span class="sp-step-icon"><i class="fa-solid ${activeSprint ? 'fa-bolt' : 'fa-pause'}"></i></span>
          <div class="sp-step-copy">
            <span class="sp-step-label">CURRENT ACTIVE</span>
            <strong>${activeSprint ? esc(activeSprint.name) : 'Slot Standby'}</strong>
          </div>
        </div>
        <span class="sp-step-arrow"><i class="fa-solid fa-chevron-right"></i></span>
        <div class="sp-step-node is-future">
          <span class="sp-step-icon"><i class="fa-regular fa-calendar-check"></i></span>
          <div class="sp-step-copy">
            <span class="sp-step-label">UPCOMING PIPELINE</span>
            <strong>${plannedSprints.length} Planned · ${plannedTotalPts} pts</strong>
          </div>
        </div>
      </div>

      <div class="sp-studio-actions">
        <div class="sp-search-field">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="sp-global-search" value="${esc(this.searchQuery)}" placeholder="Search key or title..." aria-label="Filter sprint items">
            ${this.searchQuery ? `<button type="button" id="sp-clear-search" class="sp-search-clear" title="Clear"><i class="fa-solid fa-xmark"></i></button>` : ''}
        </div>
        ${unassignedCount > 0 && (activeSprint || plannedSprints.length > 0) ? `
                <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc((activeSprint || plannedSprints[0]).id)}" title="Pull unassigned items from backlog">
                  <i class="fa-solid fa-layer-group"></i>
                  <span>Backlog (${unassignedCount})</span>
                </button>
              ` : ''}
        <button id="btn-stack-sprints" class="btn btn-secondary btn-sm" title="Stack multiple back-to-back sprints at a constant time interval">
          <i class="fa-solid fa-layer-group"></i>
          <span>Stack Sprints</span>
        </button>
        <button id="btn-create-sprint" class="btn btn-secondary btn-sm">
          <i class="fa-solid fa-calendar-plus"></i>
          <span>New Cycle</span>
        </button>
        <button id="btn-sprint-create-task" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-plus"></i>
          <span>New Issue</span>
        </button>
      </div>
    </div>

    <!-- Project Scope Filter Bar + Time Auto-Pilot Status -->
    <div class="sp-studio-scope-strip" role="tablist" aria-label="Project scope">
      <span class="sp-scope-caption"><i class="fa-solid fa-sliders"></i> Scope:</span>
      <button type="button" role="tab" aria-selected="${!selectedProjectId}" class="sp-scope-chip ${!selectedProjectId ? 'is-active' : ''}" data-sp-project-scope="__all__">
        <span>All Workspaces</span>
        <span class="sp-scope-num">${AppState.sprints.length}</span>
      </button>
      ${projects.map(p => {
        const count = AppState.sprints.filter(s => !s.projectId || s.projectId === p.id).length;
        const isSel = selectedProjectId === p.id;
        return `
                <button type="button" role="tab" aria-selected="${isSel}" class="sp-scope-chip ${isSel ? 'is-active' : ''}" data-sp-project-scope="${esc(p.id)}">
                  <span class="sp-scope-dot" style="background: ${p.color || '#388bfd'};"></span>
                  <span>${esc(p.name)}</span>
                  <span class="sp-scope-num">${count}</span>
                </button>
              `;
      }).join('')}

      <button type="button" id="btn-toggle-sprint-autopilot" class="sp-autopilot-pill ${!(AppState.settings && AppState.settings.autoSprintSchedule === false) ? 'is-on' : 'is-off'}" title="Toggle automatic time-based sprint open/close & pending task rollover">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>Auto-Pilot: <strong>${!(AppState.settings && AppState.settings.autoSprintSchedule === false) ? 'ON' : 'PAUSED'}</strong></span>
        <small>Auto Open/Close & Rollover</small>
      </button>
    </div>
  </header>

        ${
  projectSprints.length === 0 ? `
          <section class="sp-empty-state">
            <div class="sp-empty-icon"><i class="fa-solid fa-infinity"></i></div>
            <h3>Initialize Your First Sprint Cycle</h3>
            <p>Structure your engineering backlog into focused time-boxed cycles, stack multiple sprints at a constant interval, and monitor velocity.</p>
            <div class="sp-empty-actions">
              <button class="btn btn-primary" onclick="BacklogView.openStackSprintsModal()">
                <i class="fa-solid fa-layer-group"></i> Stack Multiple Sprints
              </button>
              <button class="btn btn-secondary" onclick="BacklogView.openCreateSprintModal()">
                <i class="fa-solid fa-calendar-plus"></i> Plan Single Cycle
              </button>
              <button class="btn btn-secondary" id="btn-sprint-create-task-empty">
                <i class="fa-solid fa-plus"></i> Create Work Item
              </button>
            </div>
          </section>
        ` : `
          <!-- 2. TOP FULL-WIDTH ACTIVE SPRINT SPLIT-STUDIO -->
          <section class="sp-top-active-zone" aria-label="Active sprint command studio">
            ${activeSprint
  ? this.renderActiveSprintStudio(activeSprint, activeTasks)
  : this.renderSprintPlanningEmpty(plannedSprints)}
          </section>

          <!-- 3. SIDE-BY-SIDE LOWER VAULTS: UPCOMING PIPELINE (LEFT) & COMPLETED LEDGER (RIGHT) -->
          <div class="sp-vault-grid">
            <!-- LEFT VAULT: UPCOMING SPRINTS (Connected Timeline + Popup Expand) -->
            <section class="sp-vault-panel is-upcoming-vault" aria-label="Upcoming sprints">
              <header class="sp-vault-header">
                <div class="sp-vault-title-wrap">
                  <span class="sp-vault-badge tone-brand"><i class="fa-solid fa-route"></i></span>
                  <div>
                    <div class="sp-vault-heading">
                      <h2>Upcoming Sprint Pipeline</h2>
                      <span class="sp-vault-count">${plannedSprints.length}</span>
                    </div>
                    <p>${plannedSprints.length
  ? `${plannedTotalItems} staged item${plannedTotalItems === 1 ? '' : 's'} · ${plannedTotalPts} story pts committed · Click card for popup`
  : 'Stage future iterations and pre-allocate backlog capacity'}</p>
                  </div>
                </div>
                <div class="sp-vault-header-actions">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openStackSprintsModal()" title="Stack multiple sprints at a constant interval">
                    <i class="fa-solid fa-layer-group"></i> Stack Cycles
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openCreateSprintModal()">
                    <i class="fa-solid fa-plus"></i> Plan Cycle
                  </button>
                </div>
              </header>

              <div class="sp-timeline-track">
                ${plannedSprints.length
  ? plannedSprints.map((sprint, idx) => this.renderCompressedUpcomingSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id), idx)).join('')
  : `
                    <div class="sp-empty-well">
                      <i class="fa-regular fa-calendar-plus"></i>
                      <strong>No Upcoming Cycles Queued</strong>
                      <span>Stack multiple sprints at a constant interval or plan your next iteration so pending tasks roll over automatically upon completion.</span>
                      <div class="sp-empty-actions">
                        <button type="button" class="btn btn-primary btn-sm" onclick="BacklogView.openStackSprintsModal()">
                          <i class="fa-solid fa-layer-group"></i> Stack Multiple Sprints
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openCreateSprintModal()">
                          <i class="fa-solid fa-plus"></i> Plan Single Cycle
                        </button>
                      </div>
                    </div>
                  `}
              </div>
            </section>

            <!-- RIGHT VAULT: COMPLETED SPRINTS (Retrospective Ledger + Popup Expand) -->
            <section class="sp-vault-panel is-completed-vault" aria-label="Completed sprints">
              <header class="sp-vault-header">
                <div class="sp-vault-title-wrap">
                  <span class="sp-vault-badge tone-success"><i class="fa-solid fa-award"></i></span>
                  <div>
                    <div class="sp-vault-heading">
                      <h2>Completed Cycle Ledger</h2>
                      <span class="sp-vault-count is-success">${completedSprints.length}</span>
                    </div>
                    <p>${completedSprints.length
  ? `${avgDeliveryPct}% average delivery rate · ${totalCompletedPts} total pts burned · Click card for report popup`
  : 'Historical sprint snapshots & velocity retrospectives'}</p>
                  </div>
                </div>
                ${completedSprints.length > 0 ? `
                  <div class="sp-ledger-summary-pill">
                    <span>Avg Delivery</span>
                    <strong>${avgDeliveryPct}%</strong>
                  </div>
                ` : ''}
              </header>

              <div class="sp-ledger-stack">
                ${completedSprints.length
  ? completedSprints.map(sprint => this.renderCompressedCompletedSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id))).join('')
  : `
                    <div class="sp-empty-well">
                      <i class="fa-solid fa-box-archive"></i>
                      <strong>No Completed Cycles Yet</strong>
                      <span>Completed sprints are archived here with full delivery scores, point velocity, and rollover logs.</span>
                    </div>
                  `}
              </div>
            </section>
          </div>
        `}
      </div>
  `;

    this.attachListeners(container);
  },

  renderSprintPlanningEmpty(plannedSprints) {
    const nextSprint = plannedSprints[0] || null;
    return `
  <div class="sp-standby-hero">
        <div class="sp-standby-orb">
          <i class="fa-solid fa-satellite-dish"></i>
        </div>
        <div class="sp-standby-copy">
          <span class="sp-standby-tag">ACTIVE EXECUTION STAGE STANDBY</span>
          <h3>No Active Sprint Cycle in Flight</h3>
          <p>${nextSprint
            ? `Your next staged cycle <strong>${Utils.escapeHTML(nextSprint.name)}</strong> is ready on the launchpad. Start it now to activate the live Split-Studio Telemetry & Execution Deck.`
            : 'Plan and launch a sprint cycle to unlock live radial burndown telemetry, status swimlanes, and instant issue capture.'}</p>
        </div>
        <div class="sp-standby-cta">
          ${nextSprint
            ? `
              <button class="btn btn-primary" onclick="BacklogView.startSprint('${Utils.escapeHTML(nextSprint.id)}')">
                <i class="fa-solid fa-play"></i> Launch ${Utils.escapeHTML(nextSprint.name)}
              </button>
              <button class="btn btn-secondary" onclick="BacklogView.openSprintDetailModal('${Utils.escapeHTML(nextSprint.id)}')">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i> Preview in Popup
              </button>
            `
            : `
              <button class="btn btn-primary" onclick="BacklogView.openCreateSprintModal()">
                <i class="fa-solid fa-calendar-plus"></i> Plan New Cycle
              </button>
            `}
        </div>
      </div>
  `;
  },

  // ── TOP ACTIVE SPRINT SPLIT-STUDIO (Left Telemetry Pod + Right Execution Canvas) ──
  renderActiveSprintStudio(sprint, sprintTasks) {
    const esc = Utils.escapeHTML;
    const total = sprintTasks.length;
    const doneTasks = sprintTasks.filter(t => t.status === 'done').length;
    const progress = total ? Math.round((doneTasks / total) * 100) : 0;

    const totalPoints = sprintTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const donePoints = sprintTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const totalTracked = sprintTasks.reduce((sum, t) => sum + (Number(t.trackedTime) || 0), 0);
    const totalEstimate = sprintTasks.reduce((sum, t) => sum + (Number(t.estimate) || 0), 0);

    const breakdown = {
      todo: sprintTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length,
      inprogress: sprintTasks.filter(t => t.status === 'inprogress').length,
      inreview: sprintTasks.filter(t => t.status === 'inreview').length,
      blocked: sprintTasks.filter(t => t.status === 'blocked').length,
      done: doneTasks
    };

    // Cycle Timeline & Countdown Calculation
    let timeProgressPct = 45;
    let countdownLabel = 'Active';
    let countdownTone = 'tone-brand';
    if (sprint.startDate && sprint.endDate) {
      const startMs = new Date(sprint.startDate).getTime();
      const endMs = new Date(sprint.endDate).getTime();
      const nowMs = Date.now();
      const span = Math.max(86400000, endMs - startMs);
      timeProgressPct = Math.min(100, Math.max(4, Math.round(((nowMs - startMs) / span) * 100)));

      const diff = Math.ceil((endMs - nowMs) / 86400000);
      countdownTone = diff < 0 ? 'tone-danger' : diff <= 3 ? 'tone-warning' : 'tone-brand';
      countdownLabel = diff > 0 ? `${ diff }d left` : diff === 0 ? 'Ends today' : `${ Math.abs(diff) }d overdue`;
    }

    // Dual-Arc SVG Radial Gauge math
    const outerR = 46;
    const innerR = 35;
    const outerC = 2 * Math.PI * outerR;
    const innerC = 2 * Math.PI * innerR;
    const outerOffset = outerC * (1 - progress / 100);
    const innerOffset = innerC * (1 - timeProgressPct / 100);

    const sprintProject = sprint.projectId ? AppState.projects.find(p => p.id === sprint.projectId) : null;
    const defaultProjectId = sprint.projectId || AppState.selectedProjectId || (AppState.projects[0] && AppState.projects[0].id) || '';
    const nextScheduledSprint = AppState.getNextScheduledSprint(sprint.id);
    const isAutoPilotActive = sprint.autoSchedule !== false && !(AppState.settings && AppState.settings.autoSprintSchedule === false);

    // Filter tasks for the Right Execution Canvas
    const visibleTasks = sprintTasks
      .filter(t => this._matchesQuery(t))
      .filter(t => {
        if (this.activeStatusFilter === 'all') return true;
        if (this.activeStatusFilter === 'todo') return t.status === 'todo' || t.status === 'backlog';
        if (this.activeStatusFilter === 'inreview') return t.status === 'inreview' || t.status === 'blocked';
        return t.status === this.activeStatusFilter;
      })
      .sort((a, b) => this._sortByItemId(a, b));

    let executionCanvasHTML = '';
    if (sprintTasks.length === 0) {
      executionCanvasHTML = `
  <div class="sp-empty-well sprint-drop-empty">
          <i class="fa-solid fa-layer-group"></i>
          <strong>No Work Items Committed to ${esc(sprint.name)}</strong>
          <span>Type in the quick composer above, pull items from the backlog, or drag tasks here.</span>
          <div class="sp-empty-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}">
              <i class="fa-solid fa-link"></i> Pull from Backlog
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="TaskModal.openCreate({ sprintId: '${esc(sprint.id)}', projectId: '${esc(sprint.projectId || '')}' })">
              <i class="fa-solid fa-plus"></i> Create Work Item
            </button>
          </div>
        </div>
  `;
    } else if (visibleTasks.length === 0) {
      executionCanvasHTML = `
  <div class="sp-empty-well">
          <i class="fa-solid fa-filter-circle-xmark"></i>
          <strong>No items match the current filter</strong>
          <button type="button" class="btn btn-secondary btn-sm" data-active-status-filter="all">Reset Filter</button>
        </div>
  `;
    } else if (this.activeViewMode === 'lanes') {
      executionCanvasHTML = this.renderActiveStatusSwimlanes(sprint, visibleTasks);
    } else if (this.activeViewMode === 'project') {
      executionCanvasHTML = this.renderActiveProjectMatrix(sprint, visibleTasks);
    } else {
      executionCanvasHTML = this.renderActiveKanbanBoard(sprint, visibleTasks);
    }

    return `
  <article class="sp-hero-studio" data-sprint-id="${esc(sprint.id)}">
        <!--LEFT TELEMETRY POD: Radial Burndown Ring, Timeline Pin, 2x2 Matrix Filter & Velocity-->
        <aside class="sp-telemetry-pod">
          <div class="sp-pod-top">
            <div class="sp-pod-badges">
              <span class="sp-live-beacon">
                <span class="sp-live-beacon-dot"></span>
                LIVE CYCLE
              </span>
              <span class="sp-pill ${countdownTone}"><i class="fa-regular fa-clock"></i> ${esc(countdownLabel)}</span>
            </div>
            <h2 class="sp-pod-sprint-title">${esc(sprint.name)}</h2>
            <div class="sp-pod-scope-line">
              ${sprintProject
                ? `<span class="sp-chip"><span class="sp-scope-dot" style="background:${sprintProject.color || '#388bfd'}"></span>${esc(sprintProject.name)}</span>`
                : '<span class="sp-chip"><i class="fa-solid fa-globe"></i> All Workspaces</span>'}
              <span class="sp-pod-dates">${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)}</span>
            </div>
          </div>

          <!-- Dual-Arc Radial Progress & Time Gauge -->
          <div class="sp-radial-stage">
            <div class="sp-dual-ring-wrap">
              <svg class="sp-dual-ring" viewBox="0 0 108 108" aria-hidden="true">
                <!-- Outer Track & Fill (Work Completion %) -->
                <circle class="sp-ring-outer-track" cx="54" cy="54" r="${outerR}"></circle>
                <circle class="sp-ring-outer-fill" cx="54" cy="54" r="${outerR}"
                  style="stroke-dasharray: ${outerC.toFixed(2)}; stroke-dashoffset: ${outerOffset.toFixed(2)};"></circle>
                <!-- Inner Track & Fill (Cycle Time Elapsed %) -->
                <circle class="sp-ring-inner-track" cx="54" cy="54" r="${innerR}"></circle>
                <circle class="sp-ring-inner-fill" cx="54" cy="54" r="${innerR}"
                  style="stroke-dasharray: ${innerC.toFixed(2)}; stroke-dashoffset: ${innerOffset.toFixed(2)};"></circle>
              </svg>
              <div class="sp-dual-ring-center">
                <strong>${progress}%</strong>
                <span>${doneTasks}/${total} done</span>
              </div>
            </div>

            <div class="sp-radial-legend">
              <div class="sp-legend-row">
                <span class="sp-legend-swatch is-work"></span>
                <div>
                  <span>Work Completed</span>
                  <strong>${doneTasks} of ${total} items (${progress}%)</strong>
                </div>
              </div>
              <div class="sp-legend-row">
                <span class="sp-legend-swatch is-time"></span>
                <div>
                  <span>Cycle Time Elapsed</span>
                  <strong>${timeProgressPct}% of window</strong>
                </div>
              </div>
              <div class="sp-legend-row">
                <span class="sp-legend-swatch is-pts"></span>
                <div>
                  <span>Story Point Velocity</span>
                  <strong>${donePoints} / ${totalPoints} pts burned</strong>
                </div>
              </div>
            </div>
          </div>

          ${sprint.goal ? `
            <div class="sp-pod-goal-box">
              <span class="sp-pod-goal-label"><i class="fa-solid fa-bullseye"></i> CYCLE OBJECTIVE</span>
              <p>${esc(sprint.goal)}</p>
            </div>
          ` : ''}

          <!-- Interactive 2x2 Status Matrix (Click to Filter Canvas) -->
          <div class="sp-matrix-grid" role="group" aria-label="Filter by status">
            <button type="button" class="sp-matrix-cell tone-todo ${this.activeStatusFilter === 'todo' ? 'is-selected' : ''}" data-active-status-filter="todo">
              <span class="sp-matrix-num">${breakdown.todo}</span>
              <span class="sp-matrix-lbl">Queued / To Do</span>
            </button>
            <button type="button" class="sp-matrix-cell tone-active ${this.activeStatusFilter === 'inprogress' ? 'is-selected' : ''}" data-active-status-filter="inprogress">
              <span class="sp-matrix-num">${breakdown.inprogress}</span>
              <span class="sp-matrix-lbl">In Flight</span>
            </button>
            <button type="button" class="sp-matrix-cell tone-review ${this.activeStatusFilter === 'inreview' ? 'is-selected' : ''}" data-active-status-filter="inreview">
              <span class="sp-matrix-num">${breakdown.inreview + breakdown.blocked}</span>
              <span class="sp-matrix-lbl">Review / Blocked</span>
            </button>
            <button type="button" class="sp-matrix-cell tone-done ${this.activeStatusFilter === 'done' ? 'is-selected' : ''}" data-active-status-filter="done">
              <span class="sp-matrix-num">${breakdown.done}</span>
              <span class="sp-matrix-lbl">Completed</span>
            </button>
          </div>

          <div class="sp-pod-footer">
            <div class="sp-pod-rollover-hint ${nextScheduledSprint ? 'has-next' : 'is-unscheduled'}">
              <i class="fa-solid ${nextScheduledSprint ? 'fa-arrow-right-arrow-left' : 'fa-triangle-exclamation'}"></i>
              <span>${nextScheduledSprint
                ? `Pending auto-rollover → <strong>${esc(nextScheduledSprint.name)}</strong>`
                : `No next sprint scheduled — <button type="button" class="sp-inline-link" onclick="BacklogView.openStackSprintsModal()">Stack Sprints</button>`}</span>
            </div>
            <button type="button" class="btn btn-primary sp-complete-cycle-btn" onclick="BacklogView.completeSprint('${esc(sprint.id)}')">
              <i class="fa-solid fa-flag-checkered"></i> Complete Sprint Cycle
            </button>
            <div class="sp-pod-utility-btns">
              <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openSprintDetailModal('${esc(sprint.id)}')" title="Expand full sprint in popup">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i> Popup
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit sprint settings">
                <i class="fa-solid fa-pen"></i> Edit
              </button>
              <button type="button" class="btn btn-ghost btn-sm sp-icon-btn is-danger" onclick="AppState.deleteSprint('${esc(sprint.id)}')" title="Delete sprint">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </aside>

        <!--RIGHT EXECUTION CANVAS: Workbench Bar + Inline Composer + Swimlanes / Matrix / Board-->
  <div class="sp-execution-stage sprint-drop-zone" data-sprint-id="${esc(sprint.id)}">
    <div class="sp-stage-topbar">
      <div class="sp-stage-topbar-left">
        <div class="sp-mode-switcher" role="group" aria-label="Execution canvas mode">
          <button type="button" class="sp-mode-tab ${this.activeViewMode === 'lanes' ? 'is-active' : ''}" data-active-view-mode="lanes">
            <i class="fa-solid fa-bars-staggered"></i>
            <span>Status Swimlanes</span>
          </button>
          <button type="button" class="sp-mode-tab ${this.activeViewMode === 'project' ? 'is-active' : ''}" data-active-view-mode="project">
            <i class="fa-solid fa-folder-tree"></i>
            <span>Project Matrix</span>
          </button>
          <button type="button" class="sp-mode-tab ${this.activeViewMode === 'board' ? 'is-active' : ''}" data-active-view-mode="board">
            <i class="fa-solid fa-table-columns"></i>
            <span>Kanban Board</span>
          </button>
        </div>

        ${this.activeStatusFilter !== 'all' ? `
                <button type="button" class="sp-active-filter-reset" data-active-status-filter="all">
                  <span>Filtered: ${esc(this.activeStatusFilter)}</span>
                  <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
      </div>

      <div class="sp-stage-topbar-right">
        ${totalTracked > 0 || totalEstimate > 0 ? `
                <span class="sp-chip"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(totalTracked)}${totalEstimate ? ` / ${Utils.formatMinutes(totalEstimate)}` : ''}</span>
              ` : ''}
        <button type="button" class="btn btn-secondary btn-sm btn-add-existing" data-sprint-id="${esc(sprint.id)}">
          <i class="fa-solid fa-link"></i> Pull Existing
        </button>
        <button type="button" class="btn btn-primary btn-sm" onclick="TaskModal.openCreate({ sprintId: '${esc(sprint.id)}', projectId: '${esc(sprint.projectId || '')}' })">
          <i class="fa-solid fa-plus"></i> Full Issue
        </button>
      </div>
    </div>

    <!-- Inline Issue Composer -->
    <form id="sp-active-quick-form" class="sp-composer-bar" data-sprint-id="${esc(sprint.id)}">
      <span class="sp-composer-prompt"><i class="fa-solid fa-terminal"></i></span>
      <input type="text" id="sp-quick-title" placeholder="Commit new work item directly to ${esc(sprint.name)}... (Enter)" maxlength="180" autocomplete="off">
        <div class="sp-composer-controls">
          <select id="sp-quick-project" aria-label="Project">
            ${AppState.projects.map(p => `<option value="${esc(p.id)}" ${p.id === defaultProjectId ? 'selected' : ''}>${esc(p.key)} · ${esc(p.name)}</option>`).join('')}
          </select>
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
          <button type="submit" class="btn btn-primary btn-sm">Commit</button>
        </div>
    </form>

    <!-- Dynamic Execution Canvas -->
    <div class="sp-stage-canvas">
      ${executionCanvasHTML}
    </div>
  </div>
      </article>
  `;
  },

  // ── MODE 1: LINEAR-STYLE STATUS SWIMLANES (Default Active Sprint View) ──
  renderActiveStatusSwimlanes(sprint, tasks) {
    const esc = Utils.escapeHTML;
    const lanes = [
      {
        id: 'inprogress',
        label: 'In Flight — Active Execution',
        accent: 'var(--status-inprogress)',
        icon: 'fa-solid fa-bolt',
        items: tasks.filter(t => t.status === 'inprogress' || t.status === 'inreview' || t.status === 'blocked')
      },
      {
        id: 'todo',
        label: 'Queued — Ready to Pull',
        accent: 'var(--status-todo)',
        icon: 'fa-regular fa-circle-dot',
        items: tasks.filter(t => t.status === 'todo' || t.status === 'backlog')
      },
      {
        id: 'done',
        label: 'Delivered — Completed in Cycle',
        accent: 'var(--status-done)',
        icon: 'fa-solid fa-circle-check',
        items: tasks.filter(t => t.status === 'done')
      }
    ].filter(lane => lane.items.length > 0 || this.activeStatusFilter === 'all');

    return `
  <div class="sp-swimlanes">
    ${
      lanes.map(lane => {
        const pts = lane.items.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
        return `
            <div class="sp-swimlane" style="--lane-color: ${lane.accent};">
              <div class="sp-swimlane-head">
                <div class="sp-swimlane-title">
                  <span class="sp-swimlane-indicator"></span>
                  <i class="${lane.icon}" style="color: ${lane.accent};"></i>
                  <strong>${lane.label}</strong>
                  <span class="sp-swimlane-count">${lane.items.length}</span>
                </div>
                <span class="sp-swimlane-pts">${pts} story pts</span>
              </div>
              <div class="sp-swimlane-body" data-status-col="${lane.id}" data-sprint-id="${esc(sprint.id)}">
                ${lane.items.length
            ? lane.items.map(t => this.renderActiveWorkItemRow(t, sprint.id)).join('')
            : `<div class="sp-swimlane-empty">Drag work items here to set status to ${lane.id === 'inprogress' ? 'In Progress' : lane.id === 'done' ? 'Done' : 'To Do'}</div>`}
              </div>
            </div>
          `;
      }).join('')
}
      </div>
  `;
  },

  // ── MODE 2: PROJECT MATRIX (Grouped by Project, Sorted by Item ID) ──
  renderActiveProjectMatrix(sprint, tasks) {
    const esc = Utils.escapeHTML;
    const groups = this._groupTasksByProject(tasks);

    return `
  <div class="sp-project-matrix">
    ${
      groups.map(g => {
        const pColor = g.project.color || '#388bfd';
        const grpDone = g.tasks.filter(t => t.status === 'done').length;
        const grpPct = g.tasks.length ? Math.round((grpDone / g.tasks.length) * 100) : 0;
        const grpPts = g.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
        return `
            <div class="sp-matrix-project-card" style="--proj-accent: ${pColor};">
              <div class="sp-matrix-project-head">
                <div class="sp-matrix-project-id">
                  <span class="sc-dot" style="background: ${pColor};"></span>
                  <strong>${esc(g.project.name)}</strong>
                  ${g.project.key ? `<span class="sc-proj-key">${esc(g.project.key)}</span>` : ''}
                </div>
                <div class="sp-matrix-project-stats">
                  <span>${grpDone}/${g.tasks.length} done (${grpPct}%)</span>
                  <span class="sp-pts-badge">${grpPts} pts</span>
                </div>
              </div>
              <div class="sp-workitem-table">
                ${g.tasks.map(t => this.renderActiveWorkItemRow(t, sprint.id)).join('')}
              </div>
            </div>
          `;
      }).join('')
}
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
    ${
      columns.map(col => {
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
      }).join('')
}
      </div>
  `;
  },

  renderBoardMiniCard(task, sprintId) {
    const esc = Utils.escapeHTML;
    const isDone = task.status === 'done';
    const isBlocked = task.status === 'blocked';
    const project = AppState.projects.find(p => p.id === task.projectId);
    const pColor = (project && project.color) || '#388bfd';

    const priorityIcon = {
      critical: 'fa-solid fa-angles-up',
      highest: 'fa-solid fa-angles-up',
      high: 'fa-solid fa-angle-up',
      medium: 'fa-solid fa-equals',
      low: 'fa-solid fa-angle-down',
      lowest: 'fa-solid fa-angles-down'
    }[task.priority] || 'fa-solid fa-equals';

    const typeIcon = {
      bug: 'fa-circle-dot',
      story: 'fa-bookmark',
      epic: 'fa-bolt',
      subtask: 'fa-network-wired'
    }[task.type] || 'fa-square-check';

    const subtasks = AppState.tasks.filter(item => item.parentId === task.id);
    const completedSubtasks = subtasks.filter(item => item.status === 'done').length;

    let dueChip = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = !isDone && task.status !== 'cancelled' && due < today;
      dueChip = `<span class="sp-mini-due ${overdue ? 'is-overdue' : ''}"> <i class="fa-regular fa-calendar"></i> ${ Utils.formatDate(task.dueDate) }</span> `;
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
            ${project ? `<span class="sp-mini-proj" style="color:${pColor}">${esc(project.key)}</span>` : ''}
          </div>
          <div class="sp-board-card-right">
            <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
            <button type="button" class="sp-card-unassign btn-remove-from-sprint" data-task-id="${esc(task.id)}" title="Remove from sprint">
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

  // ── LINEAR-STYLE ISSUE STRIP ROW (Used in Swimlanes & Project Matrix) ──
  renderActiveWorkItemRow(task, sprintId) {
    const esc = Utils.escapeHTML;
    const isDone = task.status === 'done';
    const project = AppState.projects.find(p => p.id === task.projectId);
    const pColor = (project && project.color) || '#388bfd';
    const subtasks = AppState.tasks.filter(item => item.parentId === task.id);
    const completedSubtasks = subtasks.filter(item => item.status === 'done').length;

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

    let dueTag = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = !isDone && task.status !== 'cancelled' && due < today;
      dueTag = `<span class="sp-pill ${overdue ? 'tone-danger' : 'tone-neutral'}"> <i class="fa-regular fa-calendar"></i> ${ Utils.formatDate(task.dueDate) }</span> `;
    }

    return `
  <div class="sp-workitem-row backlog-item-row ${isDone ? 'is-done' : ''}"
style="--row-proj-color: ${pColor};"
draggable="true" data-task-id="${esc(task.id)}" data-current-sprint="${esc(sprintId)}">
        <span class="sp-row-drag" title="Drag to another status or sprint"><i class="fa-solid fa-grip-vertical"></i></span>
        <button type="button" class="sp-row-check ${isDone ? 'is-checked' : ''}" data-sprint-action="toggle-done" aria-pressed="${isDone}" aria-label="${isDone ? 'Mark as incomplete' : 'Mark as done'}">
          ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
        </button>
        <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
        <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
        <span class="sp-mono-key" data-sprint-action="open">${esc(task.key)}</span>
        <span class="sp-row-title" data-sprint-action="open">${esc(task.title)}</span>

        <div class="sp-row-meta">
          ${project ? `<span class="sp-chip"><span class="sp-scope-dot" style="background:${pColor}"></span>${esc(project.key || project.name)}</span>` : ''}
          ${subtasks.length ? `<span class="sp-chip" title="Subtasks"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
          ${dueTag}
          ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints} pts</span>` : ''}
          ${StatusControl.pillHTML(task)}
          <button type="button" class="sp-row-remove btn-remove-from-sprint" data-task-id="${esc(task.id)}" title="Remove from sprint">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
  `;
  },

  // ── COMPRESSED UPCOMING SPRINT TIMELINE CARD (Left Lower Vault) ──
  renderCompressedUpcomingSprint(sprint, sprintTasks, index = 0) {
    const esc = Utils.escapeHTML;
    const sortedTasks = [...sprintTasks].sort((a, b) => this._sortByItemId(a, b));
    const total = sortedTasks.length;
    const doneCount = sortedTasks.filter(t => t.status === 'done').length;
    const activeCount = sortedTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;
    const todoCount = sortedTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
    const progress = total ? Math.round((doneCount / total) * 100) : 0;
    const totalPoints = sortedTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);

    const sprintProject = sprint.projectId ? AppState.projects.find(p => p.id === sprint.projectId) : null;
    const accentColor = (sprintProject && sprintProject.color) || 'var(--accent-primary)';

    let cycleDays = '14d';
    if (sprint.startDate && sprint.endDate) {
      const d = Math.max(1, Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000));
      if (!isNaN(d)) cycleDays = `${d}d`;
    }

    const previewKeys = sortedTasks.slice(0, 3);
    const remainingKeys = Math.max(0, sortedTasks.length - previewKeys.length);

    return `
  <article class="sp-timeline-card sprint-drop-zone ${index === 0 ? 'is-next-up' : ''}"
style="--card-accent: ${accentColor};"
data-sprint-id="${esc(sprint.id)}"
data-open-sprint-popup="${esc(sprint.id)}"
title="Click to expand ${esc(sprint.name)} in popup workspace">
        <!--Left Sequence Node-->
        <div class="sp-tl-node">
          <span class="sp-tl-seq">${index === 0 ? 'NEXT' : `0${index + 1}`}</span>
          <span class="sp-tl-dur">${cycleDays}</span>
        </div>

        <!--Center Content-->
        <div class="sp-tl-body">
          <div class="sp-tl-head">
            <h3 class="sp-tl-title">${esc(sprint.name)}</h3>
            ${sprintProject
              ? `<span class="sp-chip"><span class="sp-scope-dot" style="background:${sprintProject.color || '#388bfd'}"></span>${esc(sprintProject.name)}</span>`
              : '<span class="sp-chip">All Workspaces</span>'}
            ${sprint.autoSchedule !== false ? `<span class="sp-pill tone-brand" title="Automatically opens and closes on schedule"><i class="fa-solid fa-wand-magic-sparkles"></i> Auto</span>` : ''}
            <span class="sp-tl-window"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(sprint.startDate)} → ${Utils.formatDate(sprint.endDate)}</span>
          </div>

          ${sprint.goal ? `<p class="sp-tl-goal">${esc(sprint.goal)}</p>` : ''}

          <div class="sp-tl-telemetry">
            <div class="sp-tl-pills">
              <span class="sp-metric-pill"><strong>${total}</strong> item${total === 1 ? '' : 's'}</span>
              <span class="sp-metric-pill is-pts"><strong>${totalPoints}</strong> pts</span>
              ${total > 0
                ? `<span class="sp-tl-breakdown">${todoCount} queued · ${activeCount} active · ${doneCount} done</span>`
                : `<span class="sp-tl-breakdown">Drag issues here or click to stage</span>`}
            </div>
            ${previewKeys.length > 0 ? `
              <div class="sp-key-preview-row">
                ${previewKeys.map(t => `<span class="sp-key-chip ${t.status === 'done' ? 'is-done' : ''}">${esc(t.key)}</span>`).join('')}
                ${remainingKeys > 0 ? `<span class="sp-key-more">+${remainingKeys}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <!--Right Action Dock-->
  <div class="sp-tl-dock">
    <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); BacklogView.startSprint('${esc(sprint.id)}')">
      <i class="fa-solid fa-play"></i> Start
    </button>
    <div class="sp-tl-subactions">
      <button type="button" class="sp-mini-action btn-add-existing" data-sprint-id="${esc(sprint.id)}" title="Add backlog items">
        <i class="fa-solid fa-plus"></i>
      </button>
      <button type="button" class="sp-mini-action" onclick="event.stopPropagation(); BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit cycle">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button type="button" class="sp-mini-action is-expand" data-open-sprint-popup-btn="${esc(sprint.id)}" title="Open in Popup">
        <span>Popup</span>
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </button>
    </div>
  </div>
      </article>
  `;
  },

  // ── COMPRESSED COMPLETED SPRINT LEDGER CARD (Right Lower Vault) ──
  renderCompressedCompletedSprint(sprint, sprintTasks) {
    const esc = Utils.escapeHTML;
    const stats = this._analyzeCompletedSprint(sprint, sprintTasks);
    const sprintProject = sprint.projectId ? AppState.projects.find(p => p.id === sprint.projectId) : null;

    const ringC = 2 * Math.PI * 18;
    const ringOffset = ringC * (1 - stats.completionPct / 100);
    const ringColor = stats.completionPct >= 80 ? 'var(--sp-success)' : stats.completionPct >= 50 ? 'var(--sp-warning)' : 'var(--sp-brand)';

    return `
  <article class="sp-ledger-card"
data-sprint-id="${esc(sprint.id)}"
data-open-completed-popup="${esc(sprint.id)}"
title="Click to open ${esc(sprint.name)} retrospective report in popup">
        <!--Left Radial Delivery Medallion-->
        <div class="sp-medallion">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle class="sp-medallion-track" cx="22" cy="22" r="18"></circle>
            <circle class="sp-medallion-fill" cx="22" cy="22" r="18"
              style="stroke: ${ringColor}; stroke-dasharray: ${ringC.toFixed(2)}; stroke-dashoffset: ${ringOffset.toFixed(2)};"></circle>
          </svg>
          <span>${stats.completionPct}%</span>
        </div>

        <!--Center Ledger Info-->
        <div class="sp-ledger-body">
          <div class="sp-tl-head">
            <h3 class="sp-tl-title">${esc(sprint.name)}</h3>
            ${sprintProject
              ? `<span class="sp-chip"><span class="sp-scope-dot" style="background:${sprintProject.color || '#388bfd'}"></span>${esc(sprintProject.name)}</span>`
              : '<span class="sp-chip">All Workspaces</span>'}
            <span class="sp-tl-window">Closed ${esc(stats.completedAtLabel)} · ${stats.durationDays}d cycle</span>
          </div>

          ${sprint.goal ? `<p class="sp-tl-goal">${esc(sprint.goal)}</p>` : ''}

          <div class="sp-ledger-metrics">
            <span class="sp-metric-pill is-done"><i class="fa-solid fa-check"></i> <strong>${stats.completedCount}/${stats.committedCount}</strong> delivered</span>
            <span class="sp-metric-pill is-pts"><i class="fa-solid fa-bolt"></i> <strong>${stats.completedPoints}/${stats.committedPoints}</strong> pts</span>
            ${stats.totalTracked > 0 ? `<span class="sp-metric-pill"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(stats.totalTracked)}</span>` : ''}
            ${stats.incompleteCount > 0 ? `<span class="sp-pill tone-warning">${stats.incompleteCount} rolled over</span>` : ''}
          </div>
        </div>

        <!--Right Report Dock-->
  <div class="sp-tl-dock">
    <button type="button" class="btn btn-secondary btn-sm" data-open-completed-popup-btn="${esc(sprint.id)}">
      <i class="fa-solid fa-chart-pie"></i> Report
    </button>
    <div class="sp-tl-subactions">
      <button type="button" class="sp-mini-action" onclick="event.stopPropagation(); AppState.reopenSprint('${esc(sprint.id)}')" title="Reopen cycle">
        <i class="fa-solid fa-rotate-left"></i>
      </button>
      <button type="button" class="sp-mini-action" onclick="event.stopPropagation(); BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit cycle">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button type="button" class="sp-mini-action is-danger" onclick="event.stopPropagation(); AppState.deleteSprint('${esc(sprint.id)}')" title="Delete cycle">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  </div>
      </article>
  `;
  },

  // ── POPUP MODAL FOR UPCOMING / ACTIVE SPRINT DETAILS ──
  openSprintDetailModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    if (sprint.status === 'completed') {
      this.openSprintReportModal(sprintId);
      return;
    }

    const renderModalContent = () => {
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

      const projGroups = this._groupTasksByProject(sprintTasks);
      const sprintProject = freshSprint.projectId ? AppState.projects.find(p => p.id === freshSprint.projectId) : null;
      const { startMs, endMs } = AppState.getSprintWindowMs(freshSprint);
      const startDateLabel = Utils.formatDate(startMs);
      const startTimeHMS = Utils.formatTimeHMS(startMs);
      const endDateLabel = Utils.formatDate(endMs);
      const endTimeHMS = Utils.formatTimeHMS(endMs);

      let cycleDays = 14;
      if (startMs && endMs) {
        const d = Math.max(1, Math.round((endMs - startMs) / 86400000));
        if (!isNaN(d)) cycleDays = d;
      }

      const bodyHTML = `
  <div class="sp-detail-popup">
          <div class="sp-popup-summary-bar">
            <div class="sp-popup-summary-left">
              <div class="sp-popup-meta-row">
                <span class="sp-pill ${isActive ? 'tone-success' : 'tone-brand'}">${isActive ? 'Active Cycle' : 'Planned Cycle'}</span>
                ${sprintProject
                  ? `<span class="sp-chip"><span class="sp-scope-dot" style="background:${sprintProject.color || '#388bfd'}"></span>${esc(sprintProject.name)}</span>`
                  : '<span class="sp-chip">All Workspaces</span>'}
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
                  <span class="sp-popup-dt-days">(${cycleDays} days)</span>
                </span>
              </div>
              ${freshSprint.goal
                ? `<p class="sp-popup-goal"><strong>Objective:</strong> ${esc(freshSprint.goal)}</p>`
                : `<p class="sp-popup-goal is-muted">No sprint objective specified.</p>`}
            </div>
            <div class="sp-popup-summary-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="popup-btn-add-existing">
                <i class="fa-solid fa-link"></i> Commit Existing
              </button>
              <button type="button" class="btn btn-primary btn-sm" id="popup-btn-new-issue">
                <i class="fa-solid fa-plus"></i> New Issue
              </button>
              <button type="button" class="btn btn-ghost btn-sm" id="popup-btn-edit-sprint">
                <i class="fa-solid fa-pen"></i> Edit
              </button>
            </div>
          </div>

          <div class="sp-popup-datetime-bar" aria-label="Sprint start and end date with HH:MM:SS time">
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

            <button type="button" class="btn btn-secondary btn-sm sp-popup-dt-save-btn" id="popup-btn-save-datetime">
              <i class="fa-solid fa-floppy-disk"></i> Update Window
            </button>
          </div>

          <div class="sc-kpi-grid">
            <div class="sc-kpi-card">
              <span class="sc-kpi-label">Work Items</span>
              <strong class="sc-kpi-value">${doneCount} / ${total} <small>(${progress}%)</small></strong>
              <span class="sc-kpi-sub">${todoCount} queued · ${activeCount} active${blockedCount ? ` · ${blockedCount} blocked` : ''}</span>
            </div>
            <div class="sc-kpi-card">
              <span class="sc-kpi-label">Story Points</span>
              <strong class="sc-kpi-value">${donePoints} / ${totalPoints} <small>pts</small></strong>
              <span class="sc-kpi-sub">${totalPoints - donePoints} pts remaining</span>
            </div>
            <div class="sc-kpi-card">
              <span class="sc-kpi-label">Time Logged</span>
              <strong class="sc-kpi-value">${Utils.formatMinutes(totalTracked)} <small>${totalEst ? `/ ${Utils.formatMinutes(totalEst)}` : ''}</small></strong>
              <span class="sc-kpi-sub">${projGroups.length} project${projGroups.length === 1 ? '' : 's'} in scope</span>
            </div>
            <div class="sc-kpi-card">
              <span class="sc-kpi-label">Flow Status</span>
              <strong class="sc-kpi-value">${activeCount} <small>active</small> · ${todoCount} <small>queued</small></strong>
              <span class="sc-kpi-sub">${doneCount} completed</span>
            </div>
          </div>

          <div class="sc-tasks-section">
            <div class="sc-tasks-section-head">
              <h4>Committed Work Items (${total})</h4>
              <span>Segregated by project · Sorted by item key</span>
            </div>

            ${projGroups.length > 0 ? `
              <div class="sc-project-groups">
                ${projGroups.map(group => {
                  const p = group.project;
                  const pColor = p.color || '#388bfd';
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
                        <span class="sc-proj-meta">${grpDone}/${group.tasks.length} done · ${grpPoints} pts</span>
                      </div>
                      <div class="sc-task-list">
                        ${group.tasks.map(t => this._renderPopupInteractiveTaskRow(t)).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="sc-empty-box">
                No work items committed to <strong>${esc(freshSprint.name)}</strong> yet. Click <strong>Commit Existing</strong> or <strong>New Issue</strong> above.
              </div>
            `}
          </div>
        </div>
  `;

      const footerButtons = [
        {
          text: 'Delete Cycle',
          class: 'btn-ghost is-danger',
          onClick: () => {
            Modal.close();
            AppState.deleteSprint(freshSprint.id);
          }
        }
      ];

      if (isActive) {
        footerButtons.push({
          text: 'Complete Cycle',
          class: 'btn-primary',
          onClick: () => {
            Modal.close();
            this.completeSprint(freshSprint.id);
          }
        });
      } else {
        footerButtons.push({
          text: 'Launch Cycle',
          class: 'btn-primary',
          onClick: () => {
            const started = AppState.startSprint(freshSprint.id);
            if (started) Modal.close();
          }
        });
      }

      footerButtons.push({
        text: 'Close',
        class: 'btn-secondary',
        onClick: () => Modal.close()
      });

      Modal.open({
        title: `Cycle Workspace: ${ esc(freshSprint.name) } `,
        body: bodyHTML,
        size: 'xl',
        footerButtons
      });

      setTimeout(() => {
        const modalRoot = document.querySelector('.sp-detail-popup');
        if (!modalRoot) return;

        const addExistingBtn = modalRoot.querySelector('#popup-btn-add-existing');
        if (addExistingBtn) {
          addExistingBtn.addEventListener('click', () => {
            Modal.close();
            this.openAddExistingTasksModal(freshSprint.id);
          });
        }

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
            Toast.success(`Updated schedule to ${Utils.formatDate(newStartIso)} ${Utils.formatTimeHMS(newStartIso)} → ${Utils.formatDate(newEndIso)} ${Utils.formatTimeHMS(newEndIso)}`);
            renderModalContent();
          });
        }

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
              Toast.info('Removed work item from sprint');
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

    const statuses = [
      { id: 'backlog', label: 'Backlog' },
      { id: 'todo', label: 'To Do' },
      { id: 'inprogress', label: 'In Progress' },
      { id: 'inreview', label: 'In Review' },
      { id: 'blocked', label: 'Blocked' },
      { id: 'done', label: 'Done' }
    ];

    return `
  <div class="sc-task-row ${task.status === 'done' ? 'is-done' : ''}" data-popup-task-open="${esc(task.id)}">
        <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
        <span class="sc-task-key">${esc(task.key)}</span>
        <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
        <span class="sc-task-title">${esc(task.title)}</span>

        <div class="sc-task-meta">
          ${subtasks.length ? `<span class="sp-chip"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
          ${task.storyPoints > 0 ? `<span class="sp-pts-badge">${task.storyPoints} pts</span>` : ''}
          ${task.dueDate ? `<span class="sp-chip"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>` : ''}
          <select class="sp-popup-status-select" data-popup-status-select="${esc(task.id)}" aria-label="Change status for ${esc(task.key)}">
            ${statuses.map(s => `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <button type="button" class="sp-popup-remove-btn" data-popup-remove-task="${esc(task.id)}" title="Remove from sprint">
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

        ${
  stats.projectBreakdown.length > 0 ? `
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

        ${
  incompleteGroups.length ? `
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
      title: `Cycle Retrospective Report: ${ esc(sprint.name) } `,
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
