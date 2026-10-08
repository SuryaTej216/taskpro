/**
 * TaskForge - Sprint Planning View
 * Features: Sprint-focused management — create, start, complete sprints with drag-and-drop task assignment
 */

const BacklogView = {
  render(container) {
    const tasks = AppState.tasks;
    const sprints = AppState.sprints;
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
    const completedSprints = projectSprints.filter(s => s.status === 'completed');

    // ── Meaningful Stats ──
    // 1. Active Sprint Progress
    let activeProgress = 0;
    let activeSprintName = '—';
    let activeDaysLeft = '—';
    if (activeSprint) {
      const activeSprintTasks = filteredTasks.filter(t => t.sprintId === activeSprint.id);
      const doneTasks = activeSprintTasks.filter(t => t.status === 'done').length;
      activeProgress = activeSprintTasks.length > 0 ? Math.round((doneTasks / activeSprintTasks.length) * 100) : 0;
      activeSprintName = activeSprint.name;
      if (activeSprint.endDate) {
        const diffDays = Math.ceil((new Date(activeSprint.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        activeDaysLeft = diffDays > 0 ? `${diffDays}d left` : (diffDays === 0 ? 'Ends today' : `${Math.abs(diffDays)}d overdue`);
      }
    }

    // 2. Completion Rate (across all sprints)
    const allSprintTasks = filteredTasks.filter(t => t.sprintId);
    const allDone = allSprintTasks.filter(t => t.status === 'done').length;
    const completionRate = allSprintTasks.length > 0 ? Math.round((allDone / allSprintTasks.length) * 100) : 0;

    // 3. Story Points
    const totalPoints = filteredTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const burnedPoints = filteredTasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0);

    // 4. In-Progress count (actively being worked on)
    const inProgressCount = filteredTasks.filter(t => t.sprintId && (t.status === 'inprogress' || t.status === 'inreview')).length;

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Sprint Planning</h1>
            <p>Create, manage, and track sprints. Assign tasks and monitor velocity across sprint cycles.</p>
          </div>
          <div class="view-actions">
            <button id="btn-create-sprint" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-calendar-plus"></i> Create Sprint
            </button>
            <button id="btn-sprint-create-task" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> New Issue
            </button>
          </div>
        </div>

        <!-- Sprint Overview Stats Bar -->
        <div class="sprint-stats-bar" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
          
          <!-- Active Sprint Progress -->
          <div class="sprint-stat-card" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05)); display: flex; align-items: center; justify-content: center; position: relative;">
              <svg width="36" height="36" viewBox="0 0 36 36" style="transform: rotate(-90deg);">
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-subtle)" stroke-width="3"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent-primary)" stroke-width="3" stroke-dasharray="${87.96 * activeProgress / 100} ${87.96 * (100 - activeProgress) / 100}" stroke-linecap="round"/>
              </svg>
              <span style="position: absolute; font-size: 9px; font-weight: 700; color: var(--accent-primary);">${activeProgress}%</span>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Active Sprint</div>
              <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                ${activeSprint ? `<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${Utils.escapeHTML(activeSprintName)}</span> <span style="color: ${activeDaysLeft.includes('overdue') ? 'var(--accent-danger)' : 'var(--accent-warning)'}; font-weight: 600; flex-shrink: 0;">· ${activeDaysLeft}</span>` : '<span style="color: var(--text-muted);">No active sprint</span>'}
              </div>
            </div>
          </div>

          <!-- Completion Rate -->
          <div class="sprint-stat-card" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05)); display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-chart-pie" style="color: var(--accent-success); font-size: 18px;"></i>
            </div>
            <div>
              <div style="font-size: 22px; font-weight: 700; color: var(--text-primary);">${completionRate}<span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">%</span></div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Completion Rate</div>
            </div>
          </div>

          <!-- Story Points Burned -->
          <div class="sprint-stat-card" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05)); display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-fire-flame-curved" style="color: var(--accent-warning); font-size: 18px;"></i>
            </div>
            <div>
              <div style="font-size: 22px; font-weight: 700; color: var(--text-primary);">${burnedPoints}<span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">/${totalPoints} pts</span></div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Points Burned</div>
            </div>
          </div>

          <!-- In Progress -->
          <div class="sprint-stat-card" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05)); display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-spinner" style="color: var(--accent-purple); font-size: 18px;"></i>
            </div>
            <div>
              <div style="font-size: 22px; font-weight: 700; color: var(--text-primary);">${inProgressCount}</div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">In Progress</div>
            </div>
          </div>

        </div>

        <!-- Sprint Containers -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          
          <!-- 1. Active Sprint Container -->
          ${activeSprint ? this.renderSprintContainer(activeSprint, filteredTasks.filter(t => t.sprintId === activeSprint.id), true, plannedSprints) : `
            <div style="background: var(--bg-surface); border: 2px dashed var(--border-default); border-radius: var(--radius-lg); padding: 40px; text-align: center; color: var(--text-muted);">
              <div style="width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08)); display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-person-running" style="font-size: 24px; color: var(--accent-primary);"></i>
              </div>
              <div style="font-weight: 700; font-size: 16px; color: var(--text-primary); margin-bottom: 6px;">No Active Sprint</div>
              <div style="font-size: 13px; max-width: 400px; margin: 0 auto 16px; line-height: 1.5;">Start a planned sprint to begin tracking progress and velocity across your team's sprint cycle.</div>
              ${plannedSprints.length > 0 ? `
                <button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${plannedSprints[0].id}')">
                  <i class="fa-solid fa-play"></i> Start ${Utils.escapeHTML(plannedSprints[0].name)}
                </button>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="BacklogView.openCreateSprintModal()">
                  <i class="fa-solid fa-plus"></i> Create Your First Sprint
                </button>
              `}
            </div>
          `}

          <!-- 2. Planned Sprints -->
          ${plannedSprints.length > 0 ? `
            <div style="margin-top: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-left: 2px;">
                <i class="fa-solid fa-clipboard-list" style="color: var(--text-secondary); font-size: 13px;"></i>
                <span style="font-weight: 600; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Planned Sprints</span>
                <span class="badge" style="background: var(--bg-app); border: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-muted);">${plannedSprints.length}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 16px;">
                ${plannedSprints.map(s => this.renderSprintContainer(s, filteredTasks.filter(t => t.sprintId === s.id), false)).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 3. Completed Sprints (collapsible) -->
          ${completedSprints.length > 0 ? `
            <div style="margin-top: 4px;">
              <button id="btn-toggle-completed" class="btn btn-ghost btn-sm" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 8px; width: fit-content;">
                <i class="fa-solid fa-chevron-right" id="completed-chevron" style="font-size: 10px; transition: transform 0.2s ease;"></i>
                <i class="fa-solid fa-archive" style="color: var(--text-secondary); font-size: 13px;"></i>
                <span style="font-weight: 600; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Completed Sprints</span>
                <span class="badge" style="background: var(--bg-app); border: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-muted);">${completedSprints.length}</span>
              </button>
              <div id="completed-sprints-list" style="display: none; flex-direction: column; gap: 16px;">
                ${completedSprints.map(s => this.renderCompletedSprintRow(s, filteredTasks.filter(t => t.sprintId === s.id))).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Empty State (no sprints at all) -->
          ${projectSprints.length === 0 ? `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 60px 40px; text-align: center;">
              <div style="width: 72px; height: 72px; margin: 0 auto 20px; border-radius: 50%; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1)); display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-layer-group" style="font-size: 28px; color: var(--accent-primary);"></i>
              </div>
              <div style="font-weight: 700; font-size: 18px; color: var(--text-primary); margin-bottom: 8px;">Start Sprint Planning</div>
              <div style="font-size: 14px; color: var(--text-secondary); max-width: 440px; margin: 0 auto 24px; line-height: 1.6;">
                Sprints are time-boxed iterations that help your team deliver work in focused cycles. Create your first sprint to organize and track tasks.
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="BacklogView.openCreateSprintModal()">
                  <i class="fa-solid fa-calendar-plus"></i> Create First Sprint
                </button>
                <button class="btn btn-secondary" id="btn-sprint-create-task-empty">
                  <i class="fa-solid fa-plus"></i> Create a Task First
                </button>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;

    this.attachListeners(container);
  },

  renderSprintContainer(sprint, sprintTasks, isActive, plannedSprints = []) {
    const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const donePoints = sprintTasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

    // Task status breakdown
    const statusBreakdown = {
      todo: sprintTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length,
      inprogress: sprintTasks.filter(t => t.status === 'inprogress').length,
      inreview: sprintTasks.filter(t => t.status === 'inreview').length,
      done: sprintTasks.filter(t => t.status === 'done').length
    };
    const totalStatusCount = statusBreakdown.todo + statusBreakdown.inprogress + statusBreakdown.inreview + statusBreakdown.done;

    // Days remaining for active sprint
    let daysInfo = '';
    if (isActive && sprint.endDate) {
      const now = new Date();
      const end = new Date(sprint.endDate);
      const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        daysInfo = `<span style="font-size: 11px; color: var(--accent-warning); font-weight: 600;"><i class="fa-regular fa-clock" style="margin-right: 3px;"></i>${diffDays}d remaining</span>`;
      } else if (diffDays === 0) {
        daysInfo = `<span style="font-size: 11px; color: var(--accent-danger); font-weight: 600;"><i class="fa-solid fa-triangle-exclamation" style="margin-right: 3px;"></i>Ends today</span>`;
      } else {
        daysInfo = `<span style="font-size: 11px; color: var(--accent-danger); font-weight: 600;"><i class="fa-solid fa-triangle-exclamation" style="margin-right: 3px;"></i>Overdue by ${Math.abs(diffDays)}d</span>`;
      }
    }

    const accentBorder = isActive ? 'border-left: 3px solid var(--accent-primary);' : '';

    return `
      <div class="sprint-container" data-sprint-id="${sprint.id}" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; transition: border-color var(--transition-fast); ${accentBorder}">
        <!-- Sprint Header -->
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; justify-content: space-between; background: var(--bg-surface-elevated); flex-wrap: wrap; gap: 10px;">
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              ${isActive ? '<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-success); animation: pulse 2s infinite;"></span>' : ''}
              <span style="font-weight: 700; font-size: 15px; color: var(--text-primary);">${Utils.escapeHTML(sprint.name)}</span>
              <span class="badge ${isActive ? 'badge-status-inprogress' : 'badge-status-backlog'}" style="font-size: 10px;">${isActive ? 'ACTIVE' : 'PLANNED'}</span>
              <span style="font-size: 12px; color: var(--text-muted);">${Utils.formatDate(sprint.startDate)} — ${Utils.formatDate(sprint.endDate)}</span>
              ${daysInfo}
            </div>
            ${sprint.goal ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;"><i class="fa-solid fa-bullseye" style="font-size: 10px; margin-right: 4px; color: var(--accent-primary);"></i>Goal: ${Utils.escapeHTML(sprint.goal)}</div>` : ''}
            
            <!-- Progress Bar (for active sprints) -->
            ${isActive ? `
              <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                <div style="flex: 1; height: 6px; background: var(--bg-app); border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-success)); border-radius: 3px; transition: width 0.5s ease;"></div>
                </div>
                <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary); min-width: 32px;">${progress}%</span>
              </div>
            ` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <!-- Status Mini-Badges -->
            ${totalStatusCount > 0 ? `
              <div style="display: flex; align-items: center; gap: 4px; margin-right: 4px;">
                ${statusBreakdown.todo > 0 ? `<span class="badge" style="background: var(--status-todo-bg, rgba(59, 130, 246, 0.12)); color: var(--status-todo, #3b82f6); font-size: 10px; padding: 2px 6px;">${statusBreakdown.todo} To Do</span>` : ''}
                ${statusBreakdown.inprogress > 0 ? `<span class="badge" style="background: var(--status-inprogress-bg, rgba(245, 158, 11, 0.12)); color: var(--status-inprogress, #f59e0b); font-size: 10px; padding: 2px 6px;">${statusBreakdown.inprogress} Active</span>` : ''}
                ${statusBreakdown.inreview > 0 ? `<span class="badge" style="background: var(--status-inreview-bg, rgba(168, 85, 247, 0.12)); color: var(--status-inreview, #a855f7); font-size: 10px; padding: 2px 6px;">${statusBreakdown.inreview} Review</span>` : ''}
                ${statusBreakdown.done > 0 ? `<span class="badge" style="background: var(--status-done-bg, rgba(34, 197, 94, 0.12)); color: var(--status-done, #22c55e); font-size: 10px; padding: 2px 6px;">${statusBreakdown.done} Done</span>` : ''}
              </div>
            ` : ''}

            <span class="badge" style="background: var(--bg-app); border: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px;">
              <i class="fa-solid fa-star" style="font-size: 9px; margin-right: 2px;"></i> ${donePoints}/${totalPoints} pts
            </span>

            <!-- Add Existing Tasks Button -->
            <button class="btn btn-ghost btn-sm btn-add-existing" data-sprint-id="${sprint.id}" title="Add existing tasks to this sprint" style="color: var(--accent-primary);">
              <i class="fa-solid fa-link"></i> Add Existing
            </button>

            <button class="btn btn-ghost btn-sm" onclick="TaskModal.openCreate({ sprintId: '${sprint.id}', projectId: '${sprint.projectId}' })" title="Create new issue in this sprint">
              <i class="fa-solid fa-plus"></i> New
            </button>

            ${isActive ? `
              <button class="btn btn-secondary btn-sm" onclick="BacklogView.completeSprint('${sprint.id}')">
                <i class="fa-solid fa-flag-checkered"></i> Complete
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="BacklogView.startSprint('${sprint.id}')">
                <i class="fa-solid fa-play"></i> Start
              </button>
            `}

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
            <div style="padding: 28px; text-align: center; color: var(--text-muted); font-size: 13px;">
              <i class="fa-solid fa-arrows-to-dot" style="font-size: 20px; display: block; margin-bottom: 8px; color: var(--border-strong);"></i>
              Drag tasks here, click <strong>+ New</strong> to create, or <strong><i class="fa-solid fa-link"></i> Add Existing</strong> to assign tasks to this sprint.
            </div>
          ` : sprintTasks.map(t => this.renderSprintTaskItem(t, sprint.id, isActive)).join('')}
        </div>
      </div>
    `;
  },

  renderCompletedSprintRow(sprint, sprintTasks) {
    const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const donePoints = sprintTasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

    return `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; opacity: 0.75; transition: opacity var(--transition-fast); gap: 12px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px;">
          <i class="fa-solid fa-circle-check" style="color: var(--accent-success);"></i>
          <span style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${Utils.escapeHTML(sprint.name)}</span>
          <span style="font-size: 12px; color: var(--text-muted);">${Utils.formatDate(sprint.startDate)} — ${Utils.formatDate(sprint.endDate)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 12px; color: var(--text-muted);">${sprintTasks.length} issues</span>
          <span style="font-size: 12px; color: var(--text-muted);">${donePoints}/${totalPoints} pts</span>
          <div style="width: 80px; height: 4px; background: var(--bg-app); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${progress}%; background: var(--accent-success); border-radius: 2px;"></div>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: var(--accent-success);">${progress}%</span>
          <button class="btn btn-ghost btn-sm" onclick="AppState.deleteSprint('${sprint.id}')" style="color: var(--accent-danger); padding: 2px 6px;" title="Delete Sprint">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  },

  renderSprintTaskItem(task, currentSprintId, isActiveSprint) {
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

          <!-- Remove from sprint -->
          <button class="btn btn-ghost btn-sm btn-remove-from-sprint" data-task-id="${task.id}" title="Remove from sprint" style="padding: 2px 6px; font-size: 11px; color: var(--text-muted);">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `;
  },

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
          chevron.style.transform = 'rotate(90deg)';
        } else {
          list.style.display = 'none';
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

        AppState.updateTask(taskId, { sprintId: targetSprintId });
        const sprintObj = targetSprintId ? AppState.sprints.find(s => s.id === targetSprintId) : null;
        Toast.success(`Moved ${task.key} to ${sprintObj ? sprintObj.name : 'unassigned'}`);
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
    const selectedProjectId = AppState.selectedProjectId;
    let availableTasks = selectedProjectId
      ? AppState.tasks.filter(t => t.projectId === selectedProjectId)
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

      const selectedProjectId = AppState.selectedProjectId;
      let tasks = selectedProjectId
        ? AppState.tasks.filter(t => t.projectId === selectedProjectId)
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
  }
};
