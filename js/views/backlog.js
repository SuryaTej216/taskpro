/**
 * TaskForge - Backlog & Sprint Planning View
 * Features: Sprints (Active, Planned), Backlog Pool, Story Points sums, Sprint start/complete actions
 */

const BacklogView = {
  render(container) {
    const tasks = AppState.tasks;
    const sprints = AppState.sprints;
    const epics = AppState.epics;
    const selectedProjectId = AppState.selectedProjectId;

    // Filter by selected project if active
    const projectSprints = selectedProjectId ? sprints.filter(s => s.projectId === selectedProjectId) : sprints;
    let filteredTasks = selectedProjectId ? tasks.filter(t => t.projectId === selectedProjectId) : tasks;

    // Filter by selected epic if active
    if (AppState.activeFilters.epicId) {
      filteredTasks = filteredTasks.filter(t => t.epicId === AppState.activeFilters.epicId);
    }

    const activeSprint = projectSprints.find(s => s.status === 'active');
    const plannedSprints = projectSprints.filter(s => s.status === 'planned');
    const backlogTasks = filteredTasks.filter(t => !t.sprintId);

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Backlog & Sprint Planning</h1>
            <p>Plan sprints, organize user stories, and drag tasks across sprint containers.</p>
          </div>
          <div class="view-actions">
            <button id="btn-create-sprint" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-calendar-plus"></i> Create Sprint
            </button>
            <button id="btn-backlog-create-task" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> New Issue
            </button>
          </div>
        </div>

        <!-- Main Content: Epics Sidebar + Sprint Pools -->
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          
          <!-- Epics Side Panel -->
          <div style="width: 240px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; align-self: flex-start;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 700; font-size: 13px;"><i class="fa-solid fa-bolt" style="color: var(--accent-purple);"></i> Epics</span>
              <button id="btn-add-epic" class="btn btn-ghost btn-sm" title="New Epic" style="padding: 2px 6px;"><i class="fa-solid fa-plus"></i></button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="nav-item ${!AppState.activeFilters.epicId ? 'active' : ''}" onclick="AppState.activeFilters.epicId = null; AppState.emit('filters:changed');" style="padding: 6px 10px; font-size: 12px; cursor: pointer;">
                <span>All Epics</span>
              </div>
              ${epics.map(ep => {
                const count = tasks.filter(t => t.epicId === ep.id).length;
                return `
                  <div class="nav-item ${AppState.activeFilters.epicId === ep.id ? 'active' : ''}" onclick="AppState.activeFilters.epicId = '${ep.id}'; AppState.emit('filters:changed');" style="padding: 6px 10px; font-size: 12px; display: flex; justify-content: space-between; cursor: pointer;">
                    <span style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span style="width: 8px; height: 8px; border-radius: 2px; background: ${ep.color || '#a371f7'}; flex-shrink: 0;"></span>
                      ${Utils.escapeHTML(ep.title)}
                    </span>
                    <span class="badge-count">${count}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Sprints & Backlog Container -->
          <div style="flex: 1; min-width: 480px; display: flex; flex-direction: column; gap: 20px;">
            
            <!-- 1. Active Sprint Container -->
            ${activeSprint ? this.renderSprintContainer(activeSprint, filteredTasks.filter(t => t.sprintId === activeSprint.id), true) : `
              <div style="background: var(--bg-surface); border: 1px dashed var(--border-default); border-radius: var(--radius-lg); padding: 24px; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-person-running" style="font-size: 24px; margin-bottom: 8px; display: block; color: var(--border-strong);"></i>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No Active Sprint</div>
                <div style="font-size: 13px; margin-bottom: 12px;">Start one of your planned sprints below to begin tracking sprint burndown and velocity.</div>
                ${plannedSprints.length > 0 ? `
                  <button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${plannedSprints[0].id}')">
                    <i class="fa-solid fa-play"></i> Start ${Utils.escapeHTML(plannedSprints[0].name)}
                  </button>
                ` : `
                  <button class="btn btn-secondary btn-sm" onclick="BacklogView.openCreateSprintModal()">
                    <i class="fa-solid fa-plus"></i> Create First Sprint
                  </button>
                `}
              </div>
            `}

            <!-- 2. Planned Sprints -->
            ${plannedSprints.map(s => this.renderSprintContainer(s, filteredTasks.filter(t => t.sprintId === s.id), false)).join('')}

            <!-- 3. Backlog Pool Container -->
            <div class="sprint-container backlog-pool-container" data-sprint-id="" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; transition: border-color var(--transition-fast);">
              <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <i class="fa-solid fa-box-archive" style="color: var(--text-secondary);"></i>
                  <span style="font-weight: 700; font-size: 14px;">Backlog Pool</span>
                  <span class="column-task-count">${backlogTasks.length} issues</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn btn-ghost btn-sm" onclick="TaskModal.openCreate({ status: 'backlog', sprintId: '' })">
                    <i class="fa-solid fa-plus"></i> Add issue
                  </button>
                </div>
              </div>

              <div class="sprint-drop-zone backlog-items-list" data-sprint-id="" style="padding: 8px; display: flex; flex-direction: column; gap: 6px; min-height: 80px; transition: background var(--transition-fast);">
                ${backlogTasks.length === 0 ? `
                  <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
                    Backlog is empty. Drag tasks here to move them out of sprints!
                  </div>
                ` : backlogTasks.map(t => this.renderBacklogItem(t, null, activeSprint, plannedSprints)).join('')}
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    this.attachListeners(container);
  },

  renderSprintContainer(sprint, sprintTasks, isActive) {
    const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const donePoints = sprintTasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

    return `
      <div class="sprint-container" data-sprint-id="${sprint.id}" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; transition: border-color var(--transition-fast);">
        <!-- Sprint Header -->
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); flex-wrap: wrap; gap: 10px;">
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${Utils.escapeHTML(sprint.name)}</span>
              <span class="badge ${isActive ? 'badge-status-inprogress' : 'badge-status-backlog'}">${sprint.status.toUpperCase()}</span>
              <span style="font-size: 12px; color: var(--text-muted);">${Utils.formatDate(sprint.startDate)} — ${Utils.formatDate(sprint.endDate)}</span>
            </div>
            ${sprint.goal ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;"><i class="fa-solid fa-bullseye" style="font-size: 10px; margin-right: 4px;"></i>Goal: ${Utils.escapeHTML(sprint.goal)}</div>` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" style="background: var(--bg-app); border: 1px solid var(--border-subtle); color: var(--text-muted);">
              ${donePoints}/${totalPoints} pts (${progress}%)
            </span>

            <button class="btn btn-ghost btn-sm" onclick="TaskModal.openCreate({ sprintId: '${sprint.id}', projectId: '${sprint.projectId}' })" title="Add issue to this sprint">
              <i class="fa-solid fa-plus"></i> Add Issue
            </button>

            ${isActive ? `
              <button class="btn btn-secondary btn-sm" onclick="BacklogView.completeSprint('${sprint.id}')">
                <i class="fa-solid fa-flag-checkered"></i> Complete Sprint
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${sprint.id}')">
                <i class="fa-solid fa-play"></i> Start Sprint
              </button>
            `}

            <!-- Sprint Options Menu -->
            <button class="btn btn-ghost btn-sm" onclick="BacklogView.openEditSprintModal('${sprint.id}')" title="Edit Sprint">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="AppState.deleteSprint('${sprint.id}')" style="color: var(--accent-danger);" title="Delete Sprint">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>

        <!-- Sprint Task Rows & Drop Zone -->
        <div class="sprint-drop-zone" data-sprint-id="${sprint.id}" style="padding: 8px; display: flex; flex-direction: column; gap: 6px; min-height: 80px; transition: background var(--transition-fast);">
          ${sprintTasks.length === 0 ? `
            <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
              Plan tasks into this sprint by dragging cards here or clicking "+ Add Issue".
            </div>
          ` : sprintTasks.map(t => this.renderBacklogItem(t, sprint.id)).join('')}
        </div>
      </div>
    `;
  },

  renderBacklogItem(task, currentSprintId, activeSprint = null, plannedSprints = []) {
    let typeIcon = 'fa-square-check';
    if (task.type === 'bug') typeIcon = 'fa-circle-dot';
    if (task.type === 'story') typeIcon = 'fa-bookmark';
    if (task.type === 'epic') typeIcon = 'fa-bolt';
    if (task.type === 'subtask') typeIcon = 'fa-network-wired';

    const subtasks = AppState.tasks.filter(t => t.parentId === task.id);
    const completedSubtasks = subtasks.filter(st => st.status === 'done').length;

    return `
      <div class="backlog-item-row" draggable="true" data-task-id="${task.id}" data-current-sprint="${currentSprintId || ''}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-size: 13px; cursor: grab; transition: all var(--transition-fast); gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
          <i class="fa-solid fa-grip-vertical" style="color: var(--border-strong); cursor: grab; font-size: 11px;"></i>
          <span class="type-icon type-${task.type}"><i class="fa-solid ${typeIcon}"></i></span>
          <span style="font-family: var(--font-mono); font-weight: 600; font-size: 12px; color: var(--text-muted); cursor: pointer;" onclick="TaskModal.openDetail('${task.id}')">${task.key}</span>
          <span style="color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; flex: 1;" onclick="TaskModal.openDetail('${task.id}')">${Utils.escapeHTML(task.title)}</span>
          
          ${subtasks.length > 0 ? `
            <span class="badge" title="Subtasks: ${completedSubtasks}/${subtasks.length} completed" style="background: var(--bg-app); border: 1px solid var(--border-subtle); font-size: 10px; color: ${completedSubtasks === subtasks.length ? 'var(--accent-success)' : 'var(--text-muted)'};">
              <i class="fa-solid fa-network-wired"></i> ${completedSubtasks}/${subtasks.length}
            </span>
          ` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
          <span class="badge badge-status-${task.status}">${task.status}</span>
          <span class="badge-priority priority-${task.priority}"><i class="fa-solid fa-angles-up"></i></span>
          ${task.storyPoints > 0 ? `<span class="card-story-points" title="Story Points">${task.storyPoints}</span>` : ''}

          <!-- Quick Move Controls -->
          ${currentSprintId ? `
            <button class="btn btn-ghost btn-sm btn-quick-backlog" data-task-id="${task.id}" title="Move back to Backlog Pool" style="padding: 2px 6px; font-size: 11px;">
              <i class="fa-solid fa-arrow-down"></i> Backlog
            </button>
          ` : (activeSprint ? `
            <button class="btn btn-ghost btn-sm btn-quick-sprint" data-task-id="${task.id}" data-sprint-id="${activeSprint.id}" title="Move to active sprint (${Utils.escapeHTML(activeSprint.name)})" style="padding: 2px 6px; font-size: 11px;">
              <i class="fa-solid fa-arrow-up"></i> Active Sprint
            </button>
          ` : '')}
        </div>
      </div>
    `;
  },

  attachListeners(container) {
    const createBtn = container.querySelector('#btn-backlog-create-task');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());

    const createSprintBtn = container.querySelector('#btn-create-sprint');
    if (createSprintBtn) createSprintBtn.addEventListener('click', () => this.openCreateSprintModal());

    const addEpicBtn = container.querySelector('#btn-add-epic');
    if (addEpicBtn) addEpicBtn.addEventListener('click', () => this.openCreateEpicModal());

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
        const sprintObj = targetSprintId ? AppState.sprints.find(s => s.id === targetSprintId) : null;
        Toast.success(`Moved ${task.key} to ${sprintObj ? sprintObj.name : 'Backlog Pool'}`);
      });
    });

    // 2. Quick Move Buttons
    container.querySelectorAll('.btn-quick-backlog').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        AppState.updateTask(taskId, { sprintId: null });
        Toast.info('Moved task to Backlog Pool');
      });
    });

    container.querySelectorAll('.btn-quick-sprint').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        const sprintId = btn.dataset.sprintId;
        AppState.updateTask(taskId, { sprintId });
        Toast.success('Moved task to Active Sprint');
      });
    });
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
      `Sprint "${sprint.name}" contains ${incomplete.length} uncompleted issues. Would you like to complete this sprint and move remaining issues to ${nextPlanned ? `"${nextPlanned.name}"` : 'the Backlog pool'}?`,
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
          <label class="form-label">Project <span class="required">*</span></label>
          <select id="sprint-project" class="form-select">
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
              projectId: document.getElementById('sprint-project').value,
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

  openCreateEpicModal() {
    const modalBody = `
      <form id="create-epic-form">
        <div class="form-group">
          <label class="form-label">Epic Title <span class="required">*</span></label>
          <input type="text" id="epic-title" class="form-input" placeholder="e.g. Design System & UI Components" required>
        </div>
        <div class="form-group">
          <label class="form-label">Color Badge</label>
          <input type="color" id="epic-color" value="#a371f7" style="height: 38px; width: 60px; border: none; background: transparent; cursor: pointer;">
        </div>
      </form>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-bolt" style="color: var(--accent-purple);"></i> Create Epic',
      body: modalBody,
      size: 'sm',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Save Epic',
          class: 'btn-primary',
          onClick: () => {
            const title = document.getElementById('epic-title').value.trim();
            if (!title) return;
            const newEpic = {
              id: Utils.generateId('epic_'),
              projectId: AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : 'proj_web'),
              title,
              color: document.getElementById('epic-color').value
            };
            AppState.epics.push(newEpic);
            StorageService.set(StorageService.KEYS.EPICS, AppState.epics);
            AppState.emit('epics:changed');
            Modal.close();
            Toast.success(`Created Epic: ${newEpic.title}`);
          }
        }
      ]
    });
  }
};
