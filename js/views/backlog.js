/**
 * TaskForge - Sprint Planning View
 * Features: Sprint-focused management — create, start, complete sprints with drag-and-drop task assignment
 */

const BacklogView = {
  showCompletedSection: true,
  expandedCompletedIds: null,

  attachListeners(container) {
    const createBtn = container.querySelector('#btn-sprint-create-task');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());

    const createBtnEmpty = container.querySelector('#btn-sprint-create-task-empty');
    if (createBtnEmpty) createBtnEmpty.addEventListener('click', () => TaskModal.openCreate());

    const createSprintBtn = container.querySelector('#btn-create-sprint');
    if (createSprintBtn) createSprintBtn.addEventListener('click', () => this.openCreateSprintModal());

    // Toggle completed sprints section
    const toggleBtn = container.querySelector('#btn-toggle-completed');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const list = container.querySelector('#completed-sprints-list');
        const chevron = container.querySelector('#completed-chevron');
        this.showCompletedSection = list.style.display === 'none';
        if (this.showCompletedSection) {
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

    // Toggle individual completed sprint details card
    container.querySelectorAll('[data-toggle-completed-sprint]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button:not([data-toggle-completed-sprint])')) return;
        const sprintId = el.dataset.toggleCompletedSprint;
        if (!sprintId) return;
        if (!this.expandedCompletedIds) this.expandedCompletedIds = new Set();
        const card = container.querySelector(`.sprint-completed-card[data-sprint-id="${sprintId}"]`);
        const details = card ? card.querySelector('.sprint-completed-details') : null;
        if (this.expandedCompletedIds.has(sprintId)) {
          this.expandedCompletedIds.delete(sprintId);
          if (card) card.classList.remove('is-expanded');
          if (details) details.style.display = 'none';
        } else {
          this.expandedCompletedIds.add(sprintId);
          if (card) card.classList.add('is-expanded');
          if (details) details.style.display = 'flex';
        }
      });
    });

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

        AppState.updateTask(taskId, { sprintId: targetSprintId });
        const targetSprint = targetSprintId ? AppState.sprints.find(s => s.id === targetSprintId) : null;
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

    // 3. Task card status controls (delegated on the page root, which is re-created each render)
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
        const card = actionEl.closest('.sprint-task-card');
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

      // Right-click on a card → full context menu (status, sprint, duplicate, delete…)
      pageRoot.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.sprint-task-card');
        if (!card || typeof ContextMenu === 'undefined') return;
        const task = AppState.tasks.find(t => t.id === card.dataset.taskId);
        if (!task) return;
        e.preventDefault();
        ContextMenu.open(e.clientX, e.clientY, task);
      });
    }
  },

  // ── Add Existing Tasks Modal ──
  openAddExistingTasksModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    // Get tasks that are NOT already in this sprint
    let availableTasks = AppState.tasks.filter(t => t.sprintId !== sprintId);

    const modalBody = `
      <div id="add-existing-tasks-container">
        <!-- Search & Filter Bar -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 180px; position: relative;">
            <i class="fa-solid fa-search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 12px;"></i>
            <input type="text" id="add-task-search" class="form-input" placeholder="Search tasks by title or key..." style="padding-left: 32px; font-size: 13px; height: 36px;">
          </div>
          <select id="add-task-filter-project" class="form-select" style="width: auto; min-width: 130px; font-size: 13px; height: 36px;">
            <option value="">All Projects</option>
            ${AppState.projects.map(p => `<option value="${p.id}">${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
          </select>
          <select id="add-task-filter-status" class="form-select" style="width: auto; min-width: 110px; font-size: 13px; height: 36px;">
            <option value="">All Statuses</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
          </select>
          <select id="add-task-filter-assignment" class="form-select" style="width: auto; min-width: 130px; font-size: 13px; height: 36px;">
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
            const ids = Array.from(checked).map(cb => cb.dataset.taskId);
            AppState.bulkUpdateTasks(ids, { sprintId });
            Modal.close();
            Toast.success(`Added ${ids.length} task(s) to ${sprint.name}`);
          }
        }
      ]
    });

    // Attach search/filter listeners after modal opens
    setTimeout(() => {
      this._attachTaskPickerListeners(sprintId);
    }, 50);
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
      projectMap.set(p.id, {
        project: p,
        tasks: []
      });
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

  _renderTaskPickerList(tasks, targetSprintId) {
    if (tasks.length === 0) {
      return `
        <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px;">
          <i class="fa-solid fa-inbox" style="font-size: 20px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
          No tasks match your filters.
        </div>
      `;
    }

    const groups = this._groupTasksByProject(tasks);

    return groups.map(group => {
      const p = group.project;
      const pColor = p.color || '#579DFF';
      return `
        <div class="add-task-project-group">
          <div class="add-task-project-header" style="--project-accent: ${pColor};">
            <div class="add-task-project-header-left">
              <span class="add-task-project-dot" style="background: ${pColor};"></span>
              <span class="add-task-project-name" title="${Utils.escapeHTML(p.name)}">${Utils.escapeHTML(p.name)}</span>
              ${p.key ? `<span class="add-task-project-key">${Utils.escapeHTML(p.key)}</span>` : ''}
            </div>
            <span class="add-task-project-count">${group.tasks.length} task${group.tasks.length === 1 ? '' : 's'}</span>
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
    const sprintLabel = currentSprint
      ? `<span style="font-size: 10px; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 1px 6px; border-radius: 3px;"><i class="fa-solid fa-bolt" style="font-size: 8px; margin-right: 2px;"></i>${Utils.escapeHTML(currentSprint.name)}</span>`
      : `<span style="font-size: 10px; color: var(--accent-warning); background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); padding: 1px 6px; border-radius: 3px;">No Sprint</span>`;

    return `
      <label class="add-task-row" data-task-id="${task.id}" data-status="${task.status}" data-sprint="${task.sprintId || ''}">
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

      // Project filter
      if (projectVal) {
        tasks = tasks.filter(t => t.projectId === projectVal);
      }

      // Search filter
      if (query) {
        tasks = tasks.filter(t =>
          (t.title && t.title.toLowerCase().includes(query)) ||
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

      // Reset select-all checkbox when list changes
      if (selectAllCb) selectAllCb.checked = false;

      // Re-attach checkbox listeners
      this._updateSelectedCount();
      taskList.querySelectorAll('.add-task-checkbox').forEach(cb => {
        cb.addEventListener('change', () => this._updateSelectedCount());
      });
    };

    searchInput.addEventListener('input', updateList);
    statusFilter.addEventListener('change', updateList);
    assignmentFilter.addEventListener('change', updateList);
    if (projectFilter) projectFilter.addEventListener('change', updateList);

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
    const completed = sprintTasks.filter(t => t.status === 'done');
    const incomplete = sprintTasks.filter(t => t.status !== 'done');
    const plannedSprints = AppState.sprints.filter(s => s.status === 'planned' && s.id !== sprintId);
    const nextPlanned = plannedSprints[0] || null;

    const donePts = completed.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
    const openPts = incomplete.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);

    const bodyHTML = `
      <div class="complete-sprint-modal-body">
        <p style="margin: 0 0 12px; color: var(--text-secondary); font-size: 13px;">
          Review the delivery summary for <strong>${Utils.escapeHTML(sprint.name)}</strong> before completing the cycle:
        </p>
        <div class="complete-sprint-summary-grid">
          <div class="complete-sprint-stat is-success">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-circle-check"></i> Completed Issues</span>
            <strong>${completed.length} <small>task${completed.length === 1 ? '' : 's'} · ${donePts} pts</small></strong>
          </div>
          <div class="complete-sprint-stat ${incomplete.length ? 'is-warning' : ''}">
            <span class="complete-sprint-stat-label"><i class="fa-solid fa-clock-rotate-left"></i> Incomplete Issues</span>
            <strong>${incomplete.length} <small>task${incomplete.length === 1 ? '' : 's'} · ${openPts} pts</small></strong>
          </div>
        </div>
        ${incomplete.length > 0 ? `
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label">Move ${incomplete.length} incomplete issue${incomplete.length === 1 ? '' : 's'} to:</label>
            <select id="complete-sprint-move-target" class="form-select">
              ${plannedSprints.map((ps, idx) => `<option value="${Utils.escapeHTML(ps.id)}" ${idx === 0 ? 'selected' : ''}>Planned Sprint: ${Utils.escapeHTML(ps.name)}</option>`).join('')}
              <option value="" ${!nextPlanned ? 'selected' : ''}>Backlog (Unassigned)</option>
            </select>
          </div>
        ` : ''}
      </div>
    `;

    Modal.open({
      title: `<i class="fa-solid fa-flag-checkered" style="color: var(--accent-success);"></i> Complete Sprint: ${Utils.escapeHTML(sprint.name)}`,
      body: bodyHTML,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Complete Sprint',
          class: 'btn-primary',
          onClick: () => {
            const selectEl = document.getElementById('complete-sprint-move-target');
            const targetId = selectEl ? (selectEl.value || null) : (nextPlanned ? nextPlanned.id : null);
            if (!this.expandedCompletedIds) this.expandedCompletedIds = new Set();
            this.expandedCompletedIds.add(sprintId);
            this.showCompletedSection = true;
            AppState.completeSprint(sprintId, targetId);
            Modal.close();
          }
        }
      ]
    });
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
                <button id="btn-toggle-completed" class="btn btn-ghost backlog-completed-toggle" aria-expanded="${this.showCompletedSection ? 'true' : 'false'}">
                  <i class="fa-solid fa-chevron-right" id="completed-chevron" style="transform: ${this.showCompletedSection ? 'rotate(90deg)' : 'rotate(0deg)'};"></i>
                  <i class="fa-solid fa-box-archive"></i>
                  <span>Completed sprints</span>
                  <span class="planner-count-pill">${completedSprints.length}</span>
                </button>
                <div id="completed-sprints-list" class="backlog-completed-list" style="display: ${this.showCompletedSection ? 'flex' : 'none'};">
                  ${(() => {
                    if (!this.expandedCompletedIds) {
                      this.expandedCompletedIds = new Set([completedSprints[completedSprints.length - 1].id]);
                    }
                    return completedSprints.map(sprint => this.renderPlannerCompletedSprint(sprint, filteredTasks.filter(t => t.sprintId === sprint.id))).join('');
                  })()}
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
    const esc = Utils.escapeHTML;
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
    const subPct = subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
    const isDone = task.status === 'done';
    const statusMeta = StatusControl.meta(task.status);
    const nextStatus = StatusControl.next(task.status);
    const project = AppState.projects.find(p => p.id === task.projectId);

    // Due date chip
    let dueChip = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = !isDone && task.status !== 'cancelled' && due < today;
      dueChip = `<span class="stc-chip ${overdue ? 'is-overdue' : ''}" title="Due ${Utils.formatDate(task.dueDate)}"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>`;
    }

    // Progress stepper (main flow). Blocked / cancelled shown as special state.
    const flow = ['todo', 'inprogress', 'inreview', 'done'];
    const flowIndex = task.status === 'backlog' ? -1 : flow.indexOf(task.status);
    const stepper = flow.map((s, i) => `
      <button type="button" class="stc-step ${flowIndex >= i ? 'is-filled' : ''} ${task.status === s ? 'is-current' : ''}"
        data-sprint-action="set-status" data-status="${s}" title="Set to ${StatusControl.label(s)}" aria-label="Set ${esc(task.key)} to ${StatusControl.label(s)}">
        <span class="stc-step-bar"></span>
        <span class="stc-step-label">${StatusControl.label(s)}</span>
      </button>
    `).join('');

    return `
      <div class="sprint-task-card backlog-item-row status-${esc(task.status)} ${isDone ? 'is-done' : ''}"
        draggable="true" data-task-id="${esc(task.id)}" data-current-sprint="${esc(sprintId)}"
        style="--stc-status: var(--status-${esc(task.status)}); --stc-project: ${PlannerView.getProjectColor(task)};">
        <div class="stc-main">
          <span class="sprint-drag-handle" title="Drag to another sprint"><i class="fa-solid fa-grip-vertical"></i></span>
          <button type="button" class="stc-check" data-sprint-action="toggle-done" aria-pressed="${isDone}" title="${isDone ? 'Reopen task' : 'Mark as done'}">
            <i class="fa-solid fa-check"></i>
          </button>
          <div class="stc-body" data-sprint-action="open" title="Open task details">
            <div class="stc-topline">
              <span class="type-icon type-${esc(task.type)}"><i class="fa-solid ${typeIcon}"></i></span>
              <span class="stc-key">${esc(task.key)}</span>
              ${project ? `<span class="stc-project"><span class="stc-project-dot"></span>${esc(project.key || project.name)}</span>` : ''}
              <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
            </div>
            <div class="stc-title">${esc(task.title)}</div>
            <div class="stc-meta">
              ${task.storyPoints > 0 ? `<span class="stc-chip" title="Story points"><i class="fa-solid fa-star"></i> ${task.storyPoints} pts</span>` : ''}
              ${subtasks.length ? `
                <span class="stc-chip stc-subtasks" title="${completedSubtasks} of ${subtasks.length} subtasks complete">
                  <i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}
                  <span class="stc-mini-track"><span style="width: ${subPct}%;"></span></span>
                </span>` : ''}
              ${dueChip}
            </div>
          </div>
          <div class="stc-side">
            ${StatusControl.pillHTML(task)}
            ${!isDone && task.status !== 'cancelled' ? `
              <button type="button" class="stc-advance" data-sprint-action="advance" title="Move to ${StatusControl.label(nextStatus)}">
                <span>${StatusControl.label(nextStatus)}</span><i class="fa-solid fa-arrow-right"></i>
              </button>` : ''}
          </div>
          <button type="button" class="stc-remove btn-remove-from-sprint" data-task-id="${esc(task.id)}" title="Remove from sprint" aria-label="Remove ${esc(task.key)} from sprint"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="stc-stepper ${task.status === 'blocked' ? 'is-blocked' : ''} ${task.status === 'cancelled' ? 'is-cancelled' : ''}" role="group" aria-label="Quick status">
          ${stepper}
          ${task.status === 'blocked' || task.status === 'cancelled' ? `<span class="stc-state-flag"><i class="${statusMeta.icon}"></i> ${statusMeta.label}</span>` : ''}
        </div>
      </div>
    `;
  },

  _analyzeCompletedSprint(sprint, currentSprintTasks) {
    const snap = sprint.completionSnapshot || null;
    const taskMap = new Map();

    // 1. Include tasks currently assigned to this sprint
    (currentSprintTasks || []).forEach(t => taskMap.set(t.id, t));

    // 2. Include any snapshot tasks (e.g., incomplete tasks that were moved out on completion)
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

    const completedTasks = allTasks.filter(t => !rolledOverIdSet.has(t.id) && (t.status === 'done' || t.sprintId === sprint.id && t.status === 'done'));
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

    // Cycle duration
    let durationDays = 14;
    if (sprint.startDate && sprint.endDate) {
      const d = Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000);
      if (!isNaN(d) && d > 0) durationDays = d;
    }

    const completedAtIso = sprint.completedAt || (snap && snap.completedAt) || sprint.endDate;
    const completedAtLabel = completedAtIso ? Utils.formatDate(completedAtIso) : 'Completed';
    const movedToSprint = snap && snap.movedToSprintId ? AppState.sprints.find(s => s.id === snap.movedToSprintId) : null;

    // Issue Type breakdown
    const typeCounts = {};
    allTasks.forEach(t => {
      const k = t.type || 'task';
      typeCounts[k] = (typeCounts[k] || 0) + 1;
    });

    // Priority breakdown
    const prioCounts = {};
    allTasks.forEach(t => {
      const k = t.priority || 'medium';
      prioCounts[k] = (prioCounts[k] || 0) + 1;
    });

    // Project breakdown
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
      typeCounts,
      prioCounts,
      projectBreakdown
    };
  },

  renderPlannerCompletedSprint(sprint, sprintTasks) {
    const esc = Utils.escapeHTML;
    const stats = this._analyzeCompletedSprint(sprint, sprintTasks);
    const isExpanded = this.expandedCompletedIds && this.expandedCompletedIds.has(sprint.id);
    const sprintProject = sprint.projectId ? AppState.projects.find(p => p.id === sprint.projectId) : null;
    const completedGroups = this._groupTasksByProject(stats.completedTasks);
    const incompleteGroups = this._groupTasksByProject(stats.incompleteTasks);

    const typeIcons = {
      story: 'fa-bookmark',
      task: 'fa-square-check',
      bug: 'fa-circle-dot',
      epic: 'fa-bolt',
      subtask: 'fa-network-wired'
    };

    return `
      <article class="sprint-completed-card ${isExpanded ? 'is-expanded' : ''}" data-sprint-id="${esc(sprint.id)}">
        <!-- Summary Header (Clickable to expand/collapse) -->
        <header class="sprint-completed-header" data-toggle-completed-sprint="${esc(sprint.id)}">
          <div class="sprint-completed-main">
            <span class="sprint-completed-expand-icon" aria-hidden="true">
              <i class="fa-solid fa-chevron-right"></i>
            </span>
            <span class="sprint-completed-icon"><i class="fa-solid fa-circle-check"></i></span>
            <div class="sprint-completed-title">
              <div class="sprint-completed-name-row">
                <strong>${esc(sprint.name)}</strong>
                <span class="sprint-completed-badge"><i class="fa-solid fa-flag-checkered"></i> Completed</span>
                ${sprintProject
                  ? `<span class="sprint-scope-pill" style="--proj-color:${sprintProject.color || '#388bfd'}"><span class="sprint-scope-dot" style="background:${sprintProject.color || '#388bfd'}"></span>${esc(sprintProject.name)}</span>`
                  : '<span class="sprint-shared-pill">All projects</span>'}
              </div>
              <div class="sprint-completed-submeta">
                <span><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)} (${stats.durationDays}d cycle)</span>
                <span>·</span>
                <span>Completed ${esc(stats.completedAtLabel)}</span>
                ${sprint.goal ? `<span>·</span><span class="sprint-completed-goal-inline" title="${esc(sprint.goal)}"><i class="fa-solid fa-bullseye"></i> ${esc(sprint.goal)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="sprint-completed-stats">
            <div class="sprint-completed-metric-pills">
              <span class="sc-metric-pill" title="Tasks completed vs committed">
                <i class="fa-solid fa-check-double"></i>
                <b>${stats.completedCount}/${stats.committedCount}</b> tasks
              </span>
              <span class="sc-metric-pill is-points" title="Story points burned vs committed">
                <i class="fa-solid fa-fire-flame-curved"></i>
                <b>${stats.completedPoints}/${stats.committedPoints}</b> pts
              </span>
              ${stats.totalTracked > 0 ? `
                <span class="sc-metric-pill" title="Total time logged">
                  <i class="fa-regular fa-clock"></i>
                  <b>${Utils.formatMinutes(stats.totalTracked)}</b>
                </span>
              ` : ''}
            </div>

            <div class="sprint-completed-progress-wrap" title="${stats.completionPct}% of committed tasks completed">
              <div class="project-progress-track" role="progressbar" aria-label="Completed sprint task progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.completionPct}">
                <div class="project-progress-fill" style="width: ${stats.completionPct}%;"></div>
              </div>
              <strong>${stats.completionPct}%</strong>
            </div>

            <div class="sprint-completed-actions">
              <button type="button" class="btn btn-secondary btn-sm" data-toggle-completed-sprint="${esc(sprint.id)}" title="Toggle sprint details">
                <i class="fa-solid fa-list-check"></i> Details
              </button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="BacklogView.openSprintReportModal('${esc(sprint.id)}')" title="Open Full Sprint Retrospective Report">
                <i class="fa-solid fa-chart-pie"></i> Report
              </button>
              <button type="button" class="btn btn-ghost btn-sm sprint-icon-action" onclick="AppState.reopenSprint('${esc(sprint.id)}')" title="Reopen sprint as Planned">
                <i class="fa-solid fa-rotate-left"></i>
              </button>
              <button type="button" class="btn btn-ghost btn-sm sprint-icon-action" onclick="BacklogView.openEditSprintModal('${esc(sprint.id)}')" title="Edit sprint metadata">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button type="button" class="btn btn-ghost btn-sm sprint-icon-action is-danger" onclick="AppState.deleteSprint('${esc(sprint.id)}')" title="Delete sprint">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- Detailed Expandable Body -->
        <div class="sprint-completed-details" style="display: ${isExpanded ? 'flex' : 'none'};">
          ${sprint.goal ? `
            <div class="sc-goal-banner">
              <i class="fa-solid fa-bullseye"></i>
              <div>
                <span class="sc-goal-label">Sprint Goal</span>
                <p>${esc(sprint.goal)}</p>
              </div>
            </div>
          ` : ''}

          <!-- 4-Card Retrospective KPI Grid -->
          <div class="sc-kpi-grid">
            <div class="sc-kpi-card">
              <span class="sc-kpi-label"><i class="fa-solid fa-circle-check tone-success"></i> Delivery Rate</span>
              <strong class="sc-kpi-value">${stats.completionPct}% <small>(${stats.completedCount} of ${stats.committedCount} issues)</small></strong>
              <span class="sc-kpi-sub">${stats.incompleteCount > 0 ? `${stats.incompleteCount} issue(s) rolled over ${stats.movedToSprint ? `to ${esc(stats.movedToSprint.name)}` : 'to Backlog'}` : '100% of committed scope delivered'}</span>
            </div>

            <div class="sc-kpi-card">
              <span class="sc-kpi-label"><i class="fa-solid fa-fire-flame-curved tone-brand"></i> Velocity & Points</span>
              <strong class="sc-kpi-value">${stats.completedPoints} <small>of ${stats.committedPoints} pts (${stats.pointsPct}%)</small></strong>
              <span class="sc-kpi-sub">${stats.incompletePoints > 0 ? `${stats.incompletePoints} pts carried over` : 'All story points burned'}</span>
            </div>

            <div class="sc-kpi-card">
              <span class="sc-kpi-label"><i class="fa-solid fa-stopwatch tone-violet"></i> Time Logged vs Est.</span>
              <strong class="sc-kpi-value">${Utils.formatMinutes(stats.totalTracked)} <small>${stats.totalEstimate ? `/ ${Utils.formatMinutes(stats.totalEstimate)} est.` : 'logged'}</small></strong>
              <span class="sc-kpi-sub">${stats.totalEstimate > 0 ? `${Math.round((stats.totalTracked / stats.totalEstimate) * 100)}% of estimated effort` : 'Tracked across sprint issues'}</span>
            </div>

            <div class="sc-kpi-card">
              <span class="sc-kpi-label"><i class="fa-solid fa-calendar-check tone-warning"></i> Cycle & Projects</span>
              <strong class="sc-kpi-value">${stats.durationDays} days <small>· ${stats.projectBreakdown.length} project${stats.projectBreakdown.length === 1 ? '' : 's'}</small></strong>
              <span class="sc-kpi-sub">${Utils.formatDate(sprint.startDate)} → ${esc(stats.completedAtLabel)}</span>
            </div>
          </div>

          <!-- Breakdown Chips Bar: Projects, Issue Types & Priorities -->
          ${stats.allTasks.length > 0 ? `
            <div class="sc-breakdown-bar">
              <div class="sc-breakdown-group">
                <span class="sc-breakdown-title">By Project:</span>
                ${stats.projectBreakdown.map(pb => `
                  <span class="sc-breakdown-chip">
                    <span class="sc-dot" style="background:${pb.project.color || '#388bfd'}"></span>
                    <b>${esc(pb.project.name)}</b>: ${pb.done}/${pb.total} (${pb.ptsDone}/${pb.ptsTotal} pts)
                  </span>
                `).join('')}
              </div>

              <div class="sc-breakdown-group">
                <span class="sc-breakdown-title">By Type:</span>
                ${Object.entries(stats.typeCounts).map(([type, count]) => `
                  <span class="sc-breakdown-chip">
                    <span class="type-icon type-${esc(type)}"><i class="fa-solid ${typeIcons[type] || 'fa-square-check'}"></i></span>
                    <b>${count}</b> ${esc(type)}${count === 1 ? '' : 's'}
                  </span>
                `).join('')}
              </div>

              <div class="sc-breakdown-group">
                <span class="sc-breakdown-title">By Priority:</span>
                ${Object.entries(stats.prioCounts).map(([prio, count]) => `
                  <span class="sc-breakdown-chip prio-chip-${esc(prio)}">
                    <b>${count}</b> ${esc(prio)}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Completed Issues List (Segregated by Project & Sorted by Item ID) -->
          <div class="sc-tasks-section">
            <div class="sc-tasks-section-head">
              <h4><i class="fa-solid fa-circle-check" style="color: var(--status-done);"></i> Completed Issues (${stats.completedTasks.length})</h4>
              <span>Segregated by project · Sorted by item ID</span>
            </div>

            ${completedGroups.length > 0 ? `
              <div class="sc-project-groups">
                ${completedGroups.map(group => {
                  const p = group.project;
                  const pColor = p.color || '#388bfd';
                  const grpPoints = group.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0);
                  return `
                    <div class="sc-project-group">
                      <div class="sc-project-group-header" style="--project-accent: ${pColor};">
                        <div class="sc-project-group-left">
                          <span class="sc-dot" style="background: ${pColor};"></span>
                          <strong>${esc(p.name)}</strong>
                          ${p.key ? `<span class="sc-proj-key">${esc(p.key)}</span>` : ''}
                        </div>
                        <span class="sc-proj-meta">${group.tasks.length} issue${group.tasks.length === 1 ? '' : 's'} · ${grpPoints} pts</span>
                      </div>
                      <div class="sc-task-list">
                        ${group.tasks.map(t => this._renderCompletedSprintTaskRow(t, false)).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="sc-empty-box">No completed issues recorded in this sprint.</div>
            `}
          </div>

          <!-- Rolled-Over / Incomplete Issues Section (if any) -->
          ${incompleteGroups.length > 0 ? `
            <div class="sc-tasks-section sc-incomplete-section">
              <div class="sc-tasks-section-head">
                <h4><i class="fa-solid fa-clock-rotate-left" style="color: var(--accent-warning);"></i> Incomplete / Rolled-Over Issues (${stats.incompleteTasks.length})</h4>
                <span>${stats.movedToSprint ? `Moved to ${esc(stats.movedToSprint.name)}` : 'Returned to Backlog / Reassigned'}</span>
              </div>
              <div class="sc-project-groups">
                ${incompleteGroups.map(group => {
                  const p = group.project;
                  const pColor = p.color || '#6B6E76';
                  return `
                    <div class="sc-project-group">
                      <div class="sc-project-group-header" style="--project-accent: ${pColor};">
                        <div class="sc-project-group-left">
                          <span class="sc-dot" style="background: ${pColor};"></span>
                          <strong>${esc(p.name)}</strong>
                          ${p.key ? `<span class="sc-proj-key">${esc(p.key)}</span>` : ''}
                        </div>
                        <span class="sc-proj-meta">${group.tasks.length} issue${group.tasks.length === 1 ? '' : 's'}</span>
                      </div>
                      <div class="sc-task-list">
                        ${group.tasks.map(t => this._renderCompletedSprintTaskRow(t, true)).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </article>
    `;
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
      <div class="sc-task-row ${task.status === 'done' ? 'is-done' : ''}" data-completed-task-open="${esc(task.id)}" title="Click to view full details for ${esc(task.key)}">
        <span class="type-icon type-${esc(task.type || 'task')}"><i class="fa-solid ${typeIcon}"></i></span>
        <span class="sc-task-key">${esc(task.key)}</span>
        <span class="planner-prio prio-${esc(task.priority)}" title="${esc(task.priority)} priority"><i class="${priorityIcon}"></i></span>
        <span class="sc-task-title">${esc(task.title)}</span>

        <div class="sc-task-meta">
          ${subtasks.length ? `<span class="stc-chip" title="Subtasks"><i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}</span>` : ''}
          ${task.trackedTime > 0 || task.estimate > 0 ? `<span class="stc-chip" title="Logged / Estimated time"><i class="fa-regular fa-clock"></i> ${Utils.formatMinutes(task.trackedTime || 0)}${task.estimate ? `/${Utils.formatMinutes(task.estimate)}` : ''}</span>` : ''}
          ${task.storyPoints > 0 ? `<span class="stc-chip" title="Story points"><i class="fa-solid fa-star"></i> ${task.storyPoints} pts</span>` : ''}
          ${task.completedAt ? `<span class="stc-chip" title="Completed date"><i class="fa-solid fa-check"></i> ${Utils.formatDate(task.completedAt)}</span>` : ''}
          ${isRolledOver ? `<span class="stc-chip is-rolled-over" title="Current assignment">${currentSprint ? `Now in ${esc(currentSprint.name)}` : 'In Backlog'}</span>` : ''}
          ${typeof StatusControl !== 'undefined' ? StatusControl.pillHTML(task) : `<span class="badge badge-status-${esc(task.status)}">${esc(task.status)}</span>`}
        </div>
      </div>
    `;
  },

  openSprintReportModal(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const esc = Utils.escapeHTML;
    const sprintTasks = AppState.tasks.filter(t => t.sprintId === sprint.id);
    const stats = this._analyzeCompletedSprint(sprint, sprintTasks);
    const completedGroups = this._groupTasksByProject(stats.completedTasks);
    const incompleteGroups = this._groupTasksByProject(stats.incompleteTasks);

    const bodyHTML = `
      <div class="sprint-report-modal">
        <div class="sprint-report-banner">
          <div>
            <div class="sprint-report-dates">
              <span><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(sprint.startDate)} – ${Utils.formatDate(sprint.endDate)} (${stats.durationDays} days)</span>
              <span>·</span>
              <span><i class="fa-solid fa-flag-checkered"></i> Completed on ${esc(stats.completedAtLabel)}</span>
            </div>
            ${sprint.goal ? `<p class="sprint-report-goal"><i class="fa-solid fa-bullseye"></i> <strong>Goal:</strong> ${esc(sprint.goal)}</p>` : ''}
          </div>
          <div class="sprint-report-score">
            <strong>${stats.completionPct}%</strong>
            <span>Delivery Rate</span>
          </div>
        </div>

        <div class="sc-kpi-grid" style="margin-bottom: 16px;">
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Issues Completed</span>
            <strong class="sc-kpi-value">${stats.completedCount} / ${stats.committedCount}</strong>
            <span class="sc-kpi-sub">${stats.incompleteCount} rolled over</span>
          </div>
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Story Points Burned</span>
            <strong class="sc-kpi-value">${stats.completedPoints} / ${stats.committedPoints} pts</strong>
            <span class="sc-kpi-sub">${stats.pointsPct}% point velocity</span>
          </div>
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Time Logged</span>
            <strong class="sc-kpi-value">${Utils.formatMinutes(stats.totalTracked)}</strong>
            <span class="sc-kpi-sub">${stats.totalEstimate ? `Estimated: ${Utils.formatMinutes(stats.totalEstimate)}` : 'No estimate'}</span>
          </div>
          <div class="sc-kpi-card">
            <span class="sc-kpi-label">Projects Covered</span>
            <strong class="sc-kpi-value">${stats.projectBreakdown.length}</strong>
            <span class="sc-kpi-sub">${stats.allTasks.length} total issues</span>
          </div>
        </div>

        ${stats.projectBreakdown.length > 0 ? `
          <div class="sprint-report-section">
            <h4><i class="fa-solid fa-folder-tree"></i> Project Delivery Breakdown</h4>
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
                      <td>${pb.done} / ${pb.total} issues</td>
                      <td>${pb.ptsDone} / ${pb.ptsTotal} pts</td>
                      <td>${Utils.formatMinutes(pb.tracked)}</td>
                      <td><strong>${pb.pct}%</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <div class="sprint-report-section">
          <h4><i class="fa-solid fa-circle-check" style="color: var(--status-done);"></i> Completed Issues (${stats.completedTasks.length})</h4>
          ${completedGroups.length ? `
            <div class="sc-project-groups">
              ${completedGroups.map(group => `
                <div class="sc-project-group">
                  <div class="sc-project-group-header" style="--project-accent: ${group.project.color || '#388bfd'};">
                    <div class="sc-project-group-left">
                      <span class="sc-dot" style="background: ${group.project.color || '#388bfd'};"></span>
                      <strong>${esc(group.project.name)}</strong>
                      ${group.project.key ? `<span class="sc-proj-key">${esc(group.project.key)}</span>` : ''}
                    </div>
                    <span class="sc-proj-meta">${group.tasks.length} issue${group.tasks.length === 1 ? '' : 's'}</span>
                  </div>
                  <div class="sc-task-list">
                    ${group.tasks.map(t => this._renderCompletedSprintTaskRow(t, false)).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div class="sc-empty-box">No completed issues in this sprint.</div>'}
        </div>

        ${incompleteGroups.length ? `
          <div class="sprint-report-section" style="margin-top: 14px;">
            <h4><i class="fa-solid fa-clock-rotate-left" style="color: var(--accent-warning);"></i> Incomplete / Rolled-Over Issues (${stats.incompleteTasks.length})</h4>
            <div class="sc-project-groups">
              ${incompleteGroups.map(group => `
                <div class="sc-project-group">
                  <div class="sc-project-group-header" style="--project-accent: ${group.project.color || '#6B6E76'};">
                    <div class="sc-project-group-left">
                      <span class="sc-dot" style="background: ${group.project.color || '#6B6E76'};"></span>
                      <strong>${esc(group.project.name)}</strong>
                      ${group.project.key ? `<span class="sc-proj-key">${esc(group.project.key)}</span>` : ''}
                    </div>
                    <span class="sc-proj-meta">${group.tasks.length} issue${group.tasks.length === 1 ? '' : 's'}</span>
                  </div>
                  <div class="sc-task-list">
                    ${group.tasks.map(t => this._renderCompletedSprintTaskRow(t, true)).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    Modal.open({
      title: `<i class="fa-solid fa-chart-pie" style="color: var(--accent-success);"></i> Sprint Retrospective Report: ${esc(sprint.name)}`,
      body: bodyHTML,
      size: 'lg',
      footerButtons: [
        {
          text: 'Reopen Sprint',
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
