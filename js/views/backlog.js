/**
 * TaskForge - Backlog & Sprint Planning View
 * Features: Sprints (Active, Planned), Backlog Pool, Story Points sums, Sprint start/complete actions
 */

const BacklogView = {
  render(container) {
    const tasks = AppState.tasks;
    const sprints = AppState.sprints;
    const epics = AppState.epics;

    const activeSprint = sprints.find(s => s.status === 'active');
    const plannedSprints = sprints.filter(s => s.status === 'planned');
    const backlogTasks = tasks.filter(t => !t.sprintId);

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Backlog & Sprint Planning</h1>
            <p>Plan sprints, organize user stories, and triage the product backlog.</p>
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
              <div class="nav-item ${!AppState.activeFilters.epicId ? 'active' : ''}" onclick="AppState.activeFilters.epicId = null; AppState.emit('filters:changed');" style="padding: 6px 10px; font-size: 12px;">
                <span>All Epics</span>
              </div>
              ${epics.map(ep => {
                const count = tasks.filter(t => t.epicId === ep.id).length;
                return `
                  <div class="nav-item ${AppState.activeFilters.epicId === ep.id ? 'active' : ''}" onclick="AppState.activeFilters.epicId = '${ep.id}'; AppState.emit('filters:changed');" style="padding: 6px 10px; font-size: 12px; display: flex; justify-content: space-between;">
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
            ${activeSprint ? this.renderSprintContainer(activeSprint, tasks.filter(t => t.sprintId === activeSprint.id), true) : `
              <div style="background: var(--bg-surface); border: 1px dashed var(--border-default); border-radius: var(--radius-lg); padding: 24px; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-person-running" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No Active Sprint</div>
                <div style="font-size: 13px;">Start one of your planned sprints below to begin tracking sprint burndown and velocity.</div>
              </div>
            `}

            <!-- 2. Planned Sprints -->
            ${plannedSprints.map(s => this.renderSprintContainer(s, tasks.filter(t => t.sprintId === s.id), false)).join('')}

            <!-- 3. Backlog Pool Container -->
            <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;">
              <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <i class="fa-solid fa-box-archive" style="color: var(--text-secondary);"></i>
                  <span style="font-weight: 700; font-size: 14px;">Backlog Pool</span>
                  <span class="column-task-count">${backlogTasks.length} issues</span>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="TaskModal.openCreate({ status: 'backlog' })">
                  <i class="fa-solid fa-plus"></i> Add issue
                </button>
              </div>

              <div id="backlog-items-list" style="padding: 8px; display: flex; flex-direction: column; gap: 6px;">
                ${backlogTasks.length === 0 ? `
                  <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
                    Backlog is empty. All tasks are planned or completed!
                  </div>
                ` : backlogTasks.map(t => this.renderBacklogItem(t)).join('')}
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
      <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;">
        <!-- Sprint Header -->
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${Utils.escapeHTML(sprint.name)}</span>
              <span class="badge ${isActive ? 'badge-status-inprogress' : 'badge-status-backlog'}">${sprint.status.toUpperCase()}</span>
              <span style="font-size: 12px; color: var(--text-muted);">${Utils.formatDate(sprint.startDate)} — ${Utils.formatDate(sprint.endDate)}</span>
            </div>
            ${sprint.goal ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Goal: ${Utils.escapeHTML(sprint.goal)}</div>` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" style="background: var(--bg-app); border: 1px solid var(--border-subtle); color: var(--text-muted);">
              ${donePoints}/${totalPoints} pts (${progress}%)
            </span>
            ${isActive ? `
              <button class="btn btn-secondary btn-sm" onclick="BacklogView.completeSprint('${sprint.id}')">
                <i class="fa-solid fa-flag-checkered"></i> Complete Sprint
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${sprint.id}')">
                <i class="fa-solid fa-play"></i> Start Sprint
              </button>
            `}
          </div>
        </div>

        <!-- Sprint Task Rows -->
        <div style="padding: 8px; display: flex; flex-direction: column; gap: 6px;">
          ${sprintTasks.length === 0 ? `
            <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
              Plan tasks into this sprint by dragging or editing task properties.
            </div>
          ` : sprintTasks.map(t => this.renderBacklogItem(t)).join('')}
        </div>
      </div>
    `;
  },

  renderBacklogItem(task) {
    let typeIcon = 'fa-square-check';
    if (task.type === 'bug') typeIcon = 'fa-circle-dot';
    if (task.type === 'story') typeIcon = 'fa-bookmark';
    if (task.type === 'epic') typeIcon = 'fa-bolt';

    return `
      <div class="backlog-item-row" data-task-id="${task.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all var(--transition-fast);" onclick="TaskModal.openDetail('${task.id}')">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
          <span class="type-icon type-${task.type}"><i class="fa-solid ${typeIcon}"></i></span>
          <span style="font-family: var(--font-mono); font-weight: 600; font-size: 12px; color: var(--text-muted);">${task.key}</span>
          <span style="color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${Utils.escapeHTML(task.title)}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge badge-status-${task.status}">${task.status}</span>
          <span class="badge-priority priority-${task.priority}"><i class="fa-solid fa-angles-up"></i></span>
          ${task.storyPoints > 0 ? `<span class="card-story-points">${task.storyPoints}</span>` : ''}
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
  },

  startSprint(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    // Check if another sprint is active
    const active = AppState.sprints.find(s => s.status === 'active');
    if (active) {
      Toast.warning('Another sprint is already active. Complete it first.');
      return;
    }

    sprint.status = 'active';
    StorageService.set(StorageService.KEYS.SPRINTS, AppState.sprints);
    AppState.emit('sprints:changed');
    Toast.success(`Started sprint "${sprint.name}"!`);
  },

  completeSprint(sprintId) {
    const sprint = AppState.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const sprintTasks = AppState.tasks.filter(t => t.sprintId === sprintId);
    const incomplete = sprintTasks.filter(t => t.status !== 'done');

    Modal.confirm(
      'Complete Sprint',
      `Sprint "${sprint.name}" contains ${incomplete.length} uncompleted issues. Move them to the next planned sprint or backlog pool?`,
      () => {
        sprint.status = 'completed';
        // Move uncompleted tasks to backlog
        incomplete.forEach(t => {
          t.sprintId = null;
        });
        StorageService.set(StorageService.KEYS.SPRINTS, AppState.sprints);
        StorageService.set(StorageService.KEYS.TASKS, AppState.tasks);
        AppState.emit('sprints:changed');
        AppState.emit('tasks:changed');
        Toast.success(`Completed sprint "${sprint.name}"!`);
      }
    );
  },

  openCreateSprintModal() {
    const modalBody = `
      <form id="create-sprint-form">
        <div class="form-group">
          <label class="form-label">Sprint Name <span class="required">*</span></label>
          <input type="text" id="sprint-name" class="form-input" placeholder="Sprint 3: Performance & Polish" required>
        </div>
        <div class="form-group">
          <label class="form-label">Sprint Goal</label>
          <textarea id="sprint-goal" class="form-textarea" placeholder="What is the primary deliverable for this cycle?"></textarea>
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

            const newSprint = {
              id: Utils.generateId('sprint_'),
              projectId: AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : 'proj_web'),
              name,
              goal: document.getElementById('sprint-goal').value.trim(),
              startDate: document.getElementById('sprint-start').value ? new Date(document.getElementById('sprint-start').value).toISOString() : new Date().toISOString(),
              endDate: document.getElementById('sprint-end').value ? new Date(document.getElementById('sprint-end').value).toISOString() : new Date().toISOString(),
              status: 'planned'
            };

            AppState.sprints.push(newSprint);
            StorageService.set(StorageService.KEYS.SPRINTS, AppState.sprints);
            AppState.emit('sprints:changed');
            Modal.close();
            Toast.success(`Created sprint "${newSprint.name}"`);
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
