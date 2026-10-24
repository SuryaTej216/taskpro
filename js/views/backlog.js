/**
 * TaskForge - Sprint Planning View
 * Features: Sprint-focused management — create, start, complete sprints with drag-and-drop task assignment
 */

const BacklogView = {
  attachListeners(container) {
    const createBtn = container.querySelector('#btn-sprint-create-task');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());

    const createBtnEmpty = container.querySelector('#btn-sprint-create-task-empty');
    if (createBtnEmpty) createBtnEmpty.addEventListener('click', () => TaskModal.openCreate());

    const createSprintBtn = container.querySelector('#btn-create-sprint');
    if (createSprintBtn) createSprintBtn.addEventListener('click', () => this.openCreateSprintModal());

    // Toggle completed sprints
    const toggleBtn = container.querySelector('#btn-toggle-completed');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const list = container.querySelector('#completed-sprints-list');
        const chevron = container.querySelector('#completed-chevron');
        if (list.style.display === 'none') {
          list.style.display = 'flex';
          toggleBtn.setAttribute('aria-expanded', 'true');
          chevron.style.transform = 'rotate(90deg)';
        } else {
          list.style.display = 'none';
          toggleBtn.setAttribute('aria-expanded', 'false');
          chevron.style.transform = 'rotate(0deg)';
        }
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

    // 1. HTML5 Drag and Drop Handlers
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
        container.querySelectorAll('.sprint-drop-zone').forEach(z => {
          z.classList.remove('drag-over');
          z.style.background = '';
          z.style.border = '';
        });
      });
    });

    const dropZones = container.querySelectorAll('.sprint-drop-zone');
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
        zone.style.background = 'var(--bg-surface-active)';
        zone.style.border = '2px dashed var(--accent-primary)';
      });

      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
          zone.style.background = '';
          zone.style.border = '';
        }
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        zone.style.background = '';
        zone.style.border = '';

        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const targetSprintId = zone.dataset.sprintId || null;
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task || task.sprintId === targetSprintId) return;

        const targetSprint = targetSprintId ? AppState.sprints.find(s => s.id === targetSprintId) : null;
        if (targetSprint && targetSprint.projectId && targetSprint.projectId !== task.projectId) {
          Toast.warning('This sprint only accepts tasks from its project.');
          return;
        }

        AppState.updateTask(taskId, { sprintId: targetSprintId });
        Toast.success(`Moved ${task.key} to ${targetSprint ? targetSprint.name : 'unassigned'}`);
      });
    });

    // 2. Remove from sprint buttons
    container.querySelectorAll('.btn-remove-from-sprint').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        AppState.updateTask(taskId, { sprintId: null });
        Toast.info('Removed task from sprint');
      });
    });
  },

  // ── Add Existing Tasks Modal ──
  openAddExistingTasksModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    // Get tasks that are NOT already in this sprint
    // Project sprints stay within their project; shared sprints can pull work
    // from every project even when the planning view is currently filtered.
    let availableTasks = sprint.projectId
      ? AppState.tasks.filter(t => t.projectId === sprint.projectId)
      : AppState.tasks;
    
    // Exclude tasks already in this sprint
    availableTasks = availableTasks.filter(t => t.sprintId !== sprintId);

    const modalBody = `
      <div id="add-existing-tasks-container">
        <!-- Search & Filter Bar -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px; position: relative;">
            <i class="fa-solid fa-search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 12px;"></i>
            <input type="text" id="add-task-search" class="form-input" placeholder="Search tasks by title or key..." style="padding-left: 32px; font-size: 13px; height: 36px;">
          </div>
          <select id="add-task-filter-status" class="form-select" style="width: auto; min-width: 120px; font-size: 13px; height: 36px;">
            <option value="">All Statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
          </select>
          <select id="add-task-filter-assignment" class="form-select" style="width: auto; min-width: 140px; font-size: 13px; height: 36px;">
            <option value="">All Tasks</option>
            <option value="unassigned" selected>Unassigned to Sprint</option>
            <option value="other">In Other Sprints</option>
          </select>
        </div>

        <!-- Select All / Counter -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 0 4px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); cursor: pointer;">
            <input type="checkbox" id="add-task-select-all" style="cursor: pointer;"> Select all visible
          </label>
          <span id="add-task-selected-count" style="font-size: 12px; color: var(--text-muted);">0 selected</span>
        </div>

        <!-- Task List -->
        <div id="add-task-list" style="max-height: 360px; overflow-y: auto; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-app);">
          ${this._renderTaskPickerList(availableTasks, sprintId)}
        </div>
      </div>
    `;

    Modal.open({
      title: `<i class="fa-solid fa-link" style="color: var(--accent-primary);"></i> Add Tasks to ${Utils.escapeHTML(sprint.name)}`,
      body: modalBody,
      size: 'lg',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Add Selected Tasks',
          class: 'btn-primary',
          id: 'btn-confirm-add-tasks',
          onClick: () => {
            const checked = document.querySelectorAll('.add-task-checkbox:checked');
            if (checked.length === 0) {
              Toast.warning('No tasks selected.');
              return;
            }
            let count = 0;
            checked.forEach(cb => {
              const taskId = cb.dataset.taskId;
              AppState.updateTask(taskId, { sprintId });
              count++;
            });
            Modal.close();
            Toast.success(`Added ${count} task(s) to ${sprint.name}`);
          }
        }
      ]
    });

    // Attach search/filter listeners after modal opens
    setTimeout(() => {
      this._attachTaskPickerListeners(sprintId);
    }, 50);
  },

  _renderTaskPickerList(tasks, targetSprintId) {
    if (tasks.length === 0) {
      return `
        <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px;">
          <i class="fa-solid fa-inbox" style="font-size: 20px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
          No tasks match your filters.
        </div>
      `;
    }

    return tasks.map(task => {
      let typeIcon = 'fa-square-check';
      if (task.type === 'bug') typeIcon = 'fa-circle-dot';
      if (task.type === 'story') typeIcon = 'fa-bookmark';
      if (task.type === 'epic') typeIcon = 'fa-bolt';
      if (task.type === 'subtask') typeIcon = 'fa-network-wired';

      const currentSprint = task.sprintId ? AppState.sprints.find(s => s.id === task.sprintId) : null;
      const sprintLabel = currentSprint ? `<span style="font-size: 10px; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 1px 6px; border-radius: 3px;"><i class="fa-solid fa-bolt" style="font-size: 8px; margin-right: 2px;"></i>${Utils.escapeHTML(currentSprint.name)}</span>` : `<span style="font-size: 10px; color: var(--accent-warning); background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); padding: 1px 6px; border-radius: 3px;">No Sprint</span>`;

      return `
        <label class="add-task-row" data-task-id="${task.id}" data-status="${task.status}" data-sprint="${task.sprintId || ''}" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background var(--transition-fast);" onmouseover="this.style.background='var(--bg-surface-elevated)'" onmouseout="this.style.background=''">
          <input type="checkbox" class="add-task-checkbox" data-task-id="${task.id}" style="cursor: pointer; flex-shrink: 0;">
          <span class="type-icon type-${task.type}" style="flex-shrink: 0;"><i class="fa-solid ${typeIcon}"></i></span>
          <span style="font-family: var(--font-mono); font-weight: 600; font-size: 11px; color: var(--text-muted); flex-shrink: 0;">${task.key}</span>
          <span style="font-size: 13px; color: var(--text-primary); font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${Utils.escapeHTML(task.title)}</span>
          <span class="badge badge-status-${task.status}" style="font-size: 10px; flex-shrink: 0;">${task.status}</span>
          <span class="badge-priority priority-${task.priority}" style="flex-shrink: 0;"><i class="fa-solid fa-angles-up"></i></span>
          ${task.storyPoints > 0 ? `<span class="card-story-points" style="flex-shrink: 0;" title="Story Points">${task.storyPoints}</span>` : ''}
          ${sprintLabel}
        </label>
      `;
    }).join('');
  },

  _attachTaskPickerListeners(targetSprintId) {
    const searchInput = document.getElementById('add-task-search');
    const statusFilter = document.getElementById('add-task-filter-status');
    const assignmentFilter = document.getElementById('add-task-filter-assignment');
    const selectAllCb = document.getElementById('add-task-select-all');
    const taskList = document.getElementById('add-task-list');

    if (!searchInput || !taskList) return;

    const updateList = () => {
      const query = searchInput.value.toLowerCase().trim();
      const statusVal = statusFilter.value;
      const assignVal = assignmentFilter.value;

      const targetSprint = AppState.sprints.find(s => s.id === targetSprintId);
      let tasks = targetSprint && targetSprint.projectId
        ? AppState.tasks.filter(t => t.projectId === targetSprint.projectId)
        : AppState.tasks;

      // Exclude tasks already in target sprint
      tasks = tasks.filter(t => t.sprintId !== targetSprintId);

      // Search filter
      if (query) {
        tasks = tasks.filter(t =>
          t.title.toLowerCase().includes(query) ||
          (t.key && t.key.toLowerCase().includes(query))
        );
      }

      // Status filter
      if (statusVal) {
        tasks = tasks.filter(t => t.status === statusVal);
      }

      // Assignment filter
      if (assignVal === 'unassigned') {
        tasks = tasks.filter(t => !t.sprintId);
      } else if (assignVal === 'other') {
        tasks = tasks.filter(t => t.sprintId && t.sprintId !== targetSprintId);
      }

      taskList.innerHTML = this._renderTaskPickerList(tasks, targetSprintId);

      // Re-attach checkbox listeners
      this._updateSelectedCount();
      taskList.querySelectorAll('.add-task-checkbox').forEach(cb => {
        cb.addEventListener('change', () => this._updateSelectedCount());
      });
    };

    searchInput.addEventListener('input', updateList);
    statusFilter.addEventListener('change', updateList);
    assignmentFilter.addEventListener('change', updateList);

    // Select all
    if (selectAllCb) {
      selectAllCb.addEventListener('change', () => {
        const checkboxes = taskList.querySelectorAll('.add-task-checkbox');
        checkboxes.forEach(cb => { cb.checked = selectAllCb.checked; });
        this._updateSelectedCount();
      });
    }

    // Initial checkbox listeners
    taskList.querySelectorAll('.add-task-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this._updateSelectedCount());
    });

    // Trigger initial filter (default: unassigned)
    updateList();
  },

  _updateSelectedCount() {
    const count = document.querySelectorAll('.add-task-checkbox:checked').length;
    const countEl = document.getElementById('add-task-selected-count');
    if (countEl) {
      countEl.textContent = `${count} selected`;
      countEl.style.color = count > 0 ? 'var(--accent-primary)' : 'var(--text-muted)';
      countEl.style.fontWeight = count > 0 ? '600' : '400';
    }
  },

  startSprint(sprintId) {
    AppState.startSprint(sprintId);
  },

  completeSprint(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const sprintTasks = AppState.tasks.filter(t => t.sprintId === sprintId);
    const incomplete = sprintTasks.filter(t => t.status !== 'done');
    const nextPlanned = AppState.sprints.find(s => s.status === 'planned' && s.id !== sprintId);

    Modal.confirm(
      'Complete Sprint',
      `Sprint "${sprint.name}" contains ${incomplete.length} uncompleted issues. Would you like to complete this sprint and move remaining issues to ${nextPlanned ? `"${nextPlanned.name}"` : 'unassigned'}?`,
      () => {
        AppState.completeSprint(sprintId, nextPlanned ? nextPlanned.id : null);
      }
    );
  },

  openCreateSprintModal() {
    const defaultProj = AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : 'proj_web');

    const modalBody = `
      <form id="create-sprint-form">
        <div class="form-group">
          <label class="form-label">Sprint Name <span class="required">*</span></label>
          <input type="text" id="sprint-name" class="form-input" placeholder="e.g. Sprint 3: Polish & Release" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Project Scope <span class="required">*</span></label>
          <select id="sprint-project" class="form-select">
            <option value="__all_projects__">All Projects (Combined)</option>
            ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === defaultProj ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Sprint Goal</label>
          <textarea id="sprint-goal" class="form-textarea" placeholder="What is the key milestone for this cycle?"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" id="sprint-start" class="form-input" value="${Utils.toDateInputValue(new Date())}">
          </div>
          <div class="form-group">
            <label class="form-label">End Date (2 weeks recommended)</label>
            <input type="date" id="sprint-end" class="form-input">
          </div>
        </div>
      </form>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-calendar-plus" style="color: var(--accent-primary);"></i> Create Sprint',
      body: modalBody,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Create Sprint',
          class: 'btn-primary',
          onClick: () => {
            const name = document.getElementById('sprint-name').value.trim();
            if (!name) return;

            const sprintStartVal = document.getElementById('sprint-start').value;
            const sprintEndVal = document.getElementById('sprint-end').value;

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

    const modalBody = `
      <form id="edit-sprint-form">
        <div class="form-group">
          <label class="form-label">Sprint Name <span class="required">*</span></label>
          <input type="text" id="edit-sprint-name" class="form-input" value="${Utils.escapeHTML(sprint.name)}" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Sprint Goal</label>
          <textarea id="edit-sprint-goal" class="form-textarea">${Utils.escapeHTML(sprint.goal || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" id="edit-sprint-start" class="form-input" value="${Utils.toDateInputValue(sprint.startDate)}">
          </div>
          <div class="form-group">
            <label class="form-label">End Date</label>
            <input type="date" id="edit-sprint-end" class="form-input" value="${Utils.toDateInputValue(sprint.endDate)}">
          </div>
        </div>
      </form>
    `;

    Modal.open({
      title: `<i class="fa-solid fa-pen" style="color: var(--accent-primary);"></i> Edit Sprint: ${Utils.escapeHTML(sprint.name)}`,
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

            const updates = {
              name,
              goal: document.getElementById('edit-sprint-goal').value.trim(),
              startDate: document.getElementById('edit-sprint-start').value ? new Date(document.getElementById('edit-sprint-start').value).toISOString() : sprint.startDate,
              endDate: document.getElementById('edit-sprint-end').value ? new Date(document.getElementById('edit-sprint-end').value).toISOString() : sprint.endDate
            };

            AppState.updateSprint(sprintId, updates);
            Modal.close();
            Toast.success(`Updated sprint "${name}"`);
          }
        }
      ]
    });
  },

  render(container) {
    if (!container) return;

    const tasks = AppState.tasks;
    const selectedProjectId = AppState.selectedProjectId;
    const projectSprints = selectedProjectId
      ? AppState.sprints.filter(s => !s.projectId || s.projectId === selectedProjectId)
      : AppState.sprints;
    let filteredTasks = selectedProjectId ? tasks.filter(t => t.projectId === selectedProjectId) : tasks;

    if (AppState.activeFilters.epicId) {
      filteredTasks = filteredTasks.filter(t => t.epicId === AppState.activeFilters.epicId);
    }

    const activeSprint = projectSprints.find(s => s.status === 'active');
    const plannedSprints = projectSprints.filter(s => s.status === 'planned');
    const completedSprints = projectSprints.filter(s => s.status === 'completed');
    const activeTasks = activeSprint ? filteredTasks.filter(t => t.sprintId === activeSprint.id) : [];
    const activeDone = activeTasks.filter(t => t.status === 'done').length;
    const activeProgress = activeTasks.length ? Math.round((activeDone / activeTasks.length) * 100) : 0;
    const activeDaysLeft = activeSprint && activeSprint.endDate
      ? (() => {
          const diff = Math.ceil((new Date(activeSprint.endDate) - new Date()) / 86400000);
          return diff > 0 ? `${diff}d left` : diff === 0 ? 'Ends today' : `${Math.abs(diff)}d overdue`;
        })()
      : 'No end date';
    const allSprintTasks = filteredTasks.filter(t => t.sprintId);
    const allDone = allSprintTasks.filter(t => t.status === 'done').length;
    const completionRate = allSprintTasks.length ? Math.round((allDone / allSprintTasks.length) * 100) : 0;
    const totalPoints = allSprintTasks.reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const burnedPoints = allSprintTasks.filter(t => t.status === 'done').reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const inProgressCount = filteredTasks.filter(t => t.sprintId && (t.status === 'inprogress' || t.status === 'inreview')).length;
    const ringC = 2 * Math.PI * 22;
    const ringOffset = ringC * (1 - activeProgress / 100);
    const selectedProject = selectedProjectId ? AppState.projects.find(p => p.id === selectedProjectId) : null;

    container.innerHTML = ` 
      <div class="view-page planner-page backlog-page">
        <header class="view-header planner-header backlog-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-layer-group planner-title-icon"></i> Sprint Planning</h1>
            <p>Plan sprint work, track delivery, and manage the backlog${selectedProject ? ` · <strong>${Utils.escapeHTML(selectedProject.name)}</strong>` : ''}.</p>
          </div>
          <div class="view-actions">
            <button id="btn-create-sprint" class="btn btn-secondary"><i class="fa-solid fa-calendar-plus"></i> Create Sprint</button>
            <button id="btn-sprint-create-task" class="btn btn-primary"><i class="fa-solid fa-plus"></i> New Issue</button>
          </div>
        </header>

        <section class="planner-summary backlog-summary" aria-label="Sprint summary">
          <div class="planner-kpi planner-kpi-progress">
            <svg class="planner-ring" viewBox="0 0 52 52" aria-hidden="true">
              <circle class="planner-ring-track" cx="26" cy="26" r="22"></circle>
              <circle class="planner-ring-fill" cx="26" cy="26" r="22" style="stroke-dasharray: ${ringC.toFixed(2)}; stroke-dashoffset: ${ringOffset.toFixed(2)};"></circle>
            </svg>
            <div class="planner-kpi-ring-label">${activeProgress}%</div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Active sprint</span>
              <span class="planner-kpi-value backlog-kpi-name">${activeSprint ? Utils.escapeHTML(activeSprint.name) : 'None'}</span>
              <small class="backlog-kpi-detail">${activeSprint ? Utils.escapeHTML(activeDaysLeft) : 'Start a planned sprint'}</small>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-green"><i class="fa-solid fa-chart-pie"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Assigned tasks done</span>
              <span class="planner-kpi-value">${completionRate}% <small>${allDone} of ${allSprintTasks.length}</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-blue"><i class="fa-solid fa-fire-flame-curved"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Points burned</span>
              <span class="planner-kpi-value">${burnedPoints} <small>of ${totalPoints} pts</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-purple"><i class="fa-solid fa-spinner"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Work in progress</span>
              <span class="planner-kpi-value">${inProgressCount} <small>active or review</small></span>
            </div>
          </div>
        </section>

        ${projectSprints.length === 0 ? `
          <section class="projects-empty backlog-empty">
            <div class="projects-empty-icon"><i class="fa-solid fa-layer-group"></i></div>
            <h3>Start Sprint Planning</h3>
            <p>Create a sprint to organize work into a focused cycle, then add existing tasks or create new issues as you plan.</p>
            <div class="backlog-empty-actions">
              <button class="btn btn-primary" onclick="BacklogView.openCreateSprintModal()"><i class="fa-solid fa-calendar-plus"></i> Create First Sprint</button>
              <button class="btn btn-secondary" id="btn-sprint-create-task-empty"><i class="fa-solid fa-plus"></i> Create a Task First</button>
            </div>
          </section>
        ` : `
          <div class="backlog-sections">
            <section class="backlog-section">
              <div class="projects-section-head backlog-section-head">
                <h2>Active sprint</h2>
                <span>${activeSprint ? 'Current cycle' : 'No sprint running'}</span>
              </div>
              ${activeSprint
                ? this.renderPlannerSprint(activeSprint, activeTasks, true, plannedSprints)
                : this.renderSprintPlanningEmpty(plannedSprints)}
            </section>

            ${plannedSprints.length ? `
              <section class="backlog-section">
                <div class="projects-section-head backlog-section-head">
                  <h2>Planned sprints</h2>
                  <span>${plannedSprints.length} sprint${plannedSprints.length === 1 ? '' : 's'}</span>
                </div>
                <div class="backlog-sprint-list">
                  ${plannedSprints.map(sprint => this.renderPlannerSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id), false)).join('')}
                </div>
              </section>
            ` : ''}

            ${completedSprints.length ? `
              <section class="backlog-section backlog-completed-section">
                <button id="btn-toggle-completed" class="btn btn-ghost backlog-completed-toggle" aria-expanded="false">
                  <i class="fa-solid fa-chevron-right" id="completed-chevron"></i>
                  <i class="fa-solid fa-box-archive"></i>
                  <span>Completed sprints</span>
                  <span class="planner-count-pill">${completedSprints.length}</span>
                </button>
                <div id="completed-sprints-list" class="backlog-completed-list" style="display: none;">
                  ${completedSprints.map(sprint => this.renderPlannerCompletedSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id))).join('')}
                </div>
              </section>
            ` : ''}
          </div>
        `}
      </div>
    `;

    this.attachListeners(container);
  },

  renderSprintPlanningEmpty(plannedSprints) {
    return `
      <div class="planner-empty backlog-active-empty">
        <i class="fa-solid fa-person-running"></i>
        <strong>No active sprint</strong>
        <span>Start a planned sprint to track progress through the current cycle.</span>
        ${plannedSprints.length
          ? `<button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${plannedSprints[0].id}')"><i class="fa-solid fa-play"></i> Start ${Utils.escapeHTML(plannedSprints[0].name)}</button>`
          : '<button class="btn btn-primary btn-sm" onclick="BacklogView.openCreateSprintModal()"><i class="fa-solid fa-plus"></i> Create a sprint</button>'}
      </div>
    `;
  },

  renderPlannerSprint(sprint, sprintTasks, isActive) {
    const doneTasks = sprintTasks.filter(task => task.status === 'done').length;
    const progress = sprintTasks.length ? Math.round((doneTasks / sprintTasks.length) * 100) : 0;
    const totalPoints = sprintTasks.reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const donePoints = sprintTasks.filter(task => task.status === 'done').reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const breakdown = {
      todo: sprintTasks.filter(task => task.status === 'todo' || task.status === 'backlog').length,
      inprogress: sprintTasks.filter(task => task.status === 'inprogress').length,
      inreview: sprintTasks.filter(task => task.status === 'inreview').length,
      blocked: sprintTasks.filter(task => task.status === 'blocked').length,
      done: doneTasks,
      cancelled: sprintTasks.filter(task => task.status === 'cancelled').length
    };
    let daysInfo = '';
    if (sprint.endDate) {
      const diff = Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000);
      daysInfo = diff > 0 ? `${diff}d left` : diff === 0 ? 'Ends today' : `${Math.abs(diff)}d overdue`;
    }

    return `
      <article class="sprint-container planner-day ${isActive ? 'is-today' : ''} ${sprintTasks.length && doneTasks === sprintTasks.length ? 'is-complete' : ''}" data-sprint-id="${Utils.escapeHTML(sprint.id)}">
        <header class="planner-day-header sprint-card-header">
          <div class="planner-day-title">
            <div class="planner-day-label">
              ${Utils.escapeHTML(sprint.name)}
              ${isActive
                ? '<span class="planner-now-pill"><span class="planner-now-dot"></span>Active</span>'
                : '<span class="sprint-state-pill">Planned</span>'}
              ${!sprint.projectId ? '<span class="sprint-shared-pill">All projects</span>' : ''}
            </div>
            <div class="planner-day-date">${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)}${daysInfo ? ` · ${Utils.escapeHTML(daysInfo)}` : ''}</div>
          </div>
          <div class="planner-day-count" title="${doneTasks} of ${sprintTasks.length} tasks done">${doneTasks}/${sprintTasks.length}</div>
        </header>

        ${sprint.goal ? `<div class="sprint-goal"><i class="fa-solid fa-bullseye"></i><span>${Utils.escapeHTML(sprint.goal)}</span></div>` : ''}

        <div class="planner-day-progress" title="${progress}% of tasks complete" role="progressbar" aria-label="Sprint task progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
          <div class="planner-day-progress-fill" style="width: ${progress}%;"></div>
        </div>

        <div class="planner-day-load sprint-card-load">
          <span><i class="fa-solid fa-star"></i> ${donePoints} of ${totalPoints} points burned</span>
          <span>${sprintTasks.length} task${sprintTasks.length === 1 ? '' : 's'}</span>
        </div>

        <div class="sprint-status-summary" aria-label="Task status breakdown">
          <span class="sprint-status-todo">${breakdown.todo} backlog / to do</span>
          <span class="sprint-status-active">${breakdown.inprogress} active</span>
          <span class="sprint-status-review">${breakdown.inreview} review</span>
          <span class="sprint-status-blocked">${breakdown.blocked} blocked</span>
          <span class="sprint-status-done">${breakdown.done} done</span>
          ${breakdown.cancelled ? `<span class="sprint-status-cancelled">${breakdown.cancelled} cancelled</span>` : ''}
        </div>

        <div class="sprint-card-actions">
          <button class="btn btn-ghost btn-sm btn-add-existing" data-sprint-id="${Utils.escapeHTML(sprint.id)}" title="Add existing tasks"><i class="fa-solid fa-link"></i> Add existing</button>
          <button class="btn btn-ghost btn-sm" onclick="TaskModal.openCreate({ sprintId: '${sprint.id}', projectId: '${sprint.projectId || ''}' })" title="Create an issue in this sprint"><i class="fa-solid fa-plus"></i> New issue</button>
          ${isActive
            ? `<button class="btn btn-secondary btn-sm" onclick="BacklogView.completeSprint('${sprint.id}')"><i class="fa-solid fa-flag-checkered"></i> Complete sprint</button>`
            : `<button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${sprint.id}')"><i class="fa-solid fa-play"></i> Start sprint</button>`}
          <button class="btn btn-ghost btn-sm sprint-icon-action" onclick="BacklogView.openEditSprintModal('${sprint.id}')" title="Edit sprint"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-ghost btn-sm sprint-icon-action is-danger" onclick="AppState.deleteSprint('${sprint.id}')" title="Delete sprint"><i class="fa-regular fa-trash-can"></i></button>
        </div>

        <div class="planner-day-list sprint-drop-zone" data-sprint-id="${Utils.escapeHTML(sprint.id)}">
          ${sprintTasks.length
            ? sprintTasks.map(task => this.renderPlannerSprintTask(task, sprint.id)).join('')
            : '<div class="planner-empty sprint-drop-empty"><i class="fa-solid fa-arrows-to-dot"></i><span>Drag a task here or use Add existing / New issue above.</span></div>'}
        </div>
      </article>
    `;
  },

  renderPlannerSprintTask(task, sprintId) {
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
    const statusLabel = {
      backlog: 'Backlog',
      todo: 'To Do',
      inprogress: 'In Progress',
      inreview: 'In Review',
      blocked: 'Blocked',
      done: 'Done',
      cancelled: 'Cancelled'
    }[task.status] || task.status;

    return `
      <div class="planner-task backlog-item-row sprint-task-card status-${Utils.escapeHTML(task.status)} ${task.status === 'done' ? 'is-done' : ''}" draggable="true" data-task-id="${Utils.escapeHTML(task.id)}" data-current-sprint="${Utils.escapeHTML(sprintId)}" style="--planner-project: ${PlannerView.getProjectColor(task)};">
        <span class="sprint-drag-handle" title="Drag to another sprint"><i class="fa-solid fa-grip-vertical"></i></span>
        <span class="type-icon type-${Utils.escapeHTML(task.type)}"><i class="fa-solid ${typeIcon}"></i></span>
        <div class="planner-task-body" onclick="TaskModal.openDetail('${task.id}')" title="Open task details">
          <div class="planner-task-title">${Utils.escapeHTML(task.title)}</div>
          <div class="planner-task-meta">
            <span class="planner-task-key">${Utils.escapeHTML(task.key)}</span>
            <span class="planner-status status-${Utils.escapeHTML(task.status)}">${Utils.escapeHTML(statusLabel)}</span>
            <span class="planner-prio prio-${Utils.escapeHTML(task.priority)}" title="${Utils.escapeHTML(task.priority)} priority"><i class="${priorityIcon}"></i></span>
            ${task.storyPoints > 0 ? `<span class="card-story-points" title="Story points">${task.storyPoints} pts</span>` : ''}
            ${subtasks.length ? `<span class="planner-count-pill" title="${completedSubtasks} of ${subtasks.length} subtasks complete"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
          </div>
        </div>
        <div class="planner-task-actions">
          <button class="planner-icon-btn btn-remove-from-sprint" data-task-id="${Utils.escapeHTML(task.id)}" title="Remove from sprint" aria-label="Remove ${Utils.escapeHTML(task.key)} from sprint"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `;
  },

  renderPlannerCompletedSprint(sprint, sprintTasks) {
    const doneTasks = sprintTasks.filter(task => task.status === 'done').length;
    const totalPoints = sprintTasks.reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const donePoints = sprintTasks.filter(task => task.status === 'done').reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const progress = sprintTasks.length ? Math.round((doneTasks / sprintTasks.length) * 100) : 0;

    return `
      <article class="sprint-completed-row">
        <div class="sprint-completed-main">
          <span class="sprint-completed-icon"><i class="fa-solid fa-circle-check"></i></span>
          <div class="sprint-completed-title">
            <strong>${Utils.escapeHTML(sprint.name)}</strong>
            <span>${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)}</span>
          </div>
        </div>
        <div class="sprint-completed-stats">
          <span>${doneTasks}/${sprintTasks.length} tasks</span>
          <span>${donePoints}/${totalPoints} points</span>
          <div class="project-progress-track" role="progressbar" aria-label="Completed sprint task progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
            <div class="project-progress-fill" style="width: ${progress}%;"></div>
          </div>
          <strong>${progress}%</strong>
          <button class="btn btn-ghost btn-sm sprint-icon-action is-danger" onclick="AppState.deleteSprint('${sprint.id}')" title="Delete sprint"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </article>
    `;
  }
};
