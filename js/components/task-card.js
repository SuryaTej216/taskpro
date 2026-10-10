/**
 * TaskForge - Task Card Component (Kanban & Compact Board Cards)
 * Colors keyed strictly to Type of Work (Bug, Story, Task, Improvement, Epic, Subtask),
 * with exact same issue type badges as in List view, semantic edge indicator, and hover micro-actions.
 */

const TaskCard = {
  /**
   * Generates vibrant Atlassian Design System issue lozenge badge matching List View
   * @param {string} type 
   * @returns {string}
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
   * Generates DOM Element for a Kanban Task Card
   * @param {Object} task 
   * @param {Object} [options]
   * @param {boolean} [options.isCompact=false]
   * @returns {HTMLElement}
   */
  render(task, options = {}) {
    const isCompact = !!options.isCompact;
    const type = (task.type || 'task').toLowerCase();

    // Type of Work Colors (matching List View badges)
    const workTypeColors = {
      bug: { color: '#EF4444', darkColor: '#F87462', label: 'Bug' },
      story: { color: '#10B981', darkColor: '#57F287', label: 'Story' },
      task: { color: '#3B82F6', darkColor: '#579DFF', label: 'Task' },
      improvement: { color: '#00A3BF', darkColor: '#6CC3E0', label: 'Improvement' },
      epic: { color: '#8B5CF6', darkColor: '#D8A0F7', label: 'Epic' },
      subtask: { color: '#64748B', darkColor: '#94A3B8', label: 'Subtask' }
    };

    const typeConfig = workTypeColors[type] || workTypeColors.task;

    const card = document.createElement('div');
    card.className = `task-card is-worktype-${type} ${isCompact ? 'is-compact' : ''} priority-${task.priority || 'medium'}`;
    card.setAttribute('draggable', 'true');
    card.dataset.taskId = task.id;
    card.dataset.status = task.status;
    card.dataset.type = type;
    card.dataset.priority = task.priority || 'medium';
    card.style.setProperty('--worktype-color', typeConfig.color);

    const isOverdue = Utils.isOverdue(task.dueDate, task.status);
    const isDueToday = Utils.isDueToday(task.dueDate);
    const isSubtask = type === 'subtask' || !!task.parentId;
    const parentTask = task.parentId ? AppState.tasks.find(t => t.id === task.parentId) : null;
    const epic = task.epicId ? AppState.epics.find(e => e.id === task.epicId) : null;

    const rawLabels = Array.isArray(task.labels) ? task.labels : [];
    // Filter out redundant 'subtask' from user tag pills so it doesn't render as a generic unstyled tag
    const filteredLabels = rawLabels.filter(l => l && String(l).trim().toLowerCase() !== 'subtask');
    const hasTags = (epic || isSubtask || filteredLabels.length > 0) && !isCompact;

    const checklist = Array.isArray(task.checklist) ? task.checklist : [];
    const chkTotal = checklist.length;
    const chkDone = checklist.filter(c => c.completed).length;

    const subtasks = AppState.tasks.filter(t => t.parentId === task.id);
    const stTotal = subtasks.length;
    const stDone = subtasks.filter(t => t.status === 'done').length;

    const totalCount = chkTotal + stTotal;
    const totalDone = chkDone + stDone;
    const isAllDone = totalCount > 0 && totalDone === totalCount;
    const isMerged = !!task.mergeChecklistAndSubtasks;

    // Priority Configuration
    const priority = (task.priority || 'medium').toLowerCase();
    let priorityConfig = { icon: 'fa-solid fa-minus', label: 'Medium', className: 'prio-medium' };
    if (priority === 'critical') {
      priorityConfig = { icon: 'fa-solid fa-angles-up', label: 'Critical', className: 'prio-critical' };
    } else if (priority === 'highest') {
      priorityConfig = { icon: 'fa-solid fa-angle-up', label: 'Highest', className: 'prio-highest' };
    } else if (priority === 'high') {
      priorityConfig = { icon: 'fa-solid fa-angle-up', label: 'High', className: 'prio-high' };
    } else if (priority === 'low') {
      priorityConfig = { icon: 'fa-solid fa-angle-down', label: 'Low', className: 'prio-low' };
    } else if (priority === 'lowest') {
      priorityConfig = { icon: 'fa-solid fa-angles-down', label: 'Lowest', className: 'prio-lowest' };
    }

    // Next Status for 1-click Advance button
    const advanceMap = {
      backlog: 'todo',
      todo: 'inprogress',
      inprogress: 'inreview',
      inreview: 'done',
      blocked: 'inprogress',
      cancelled: 'todo'
    };
    const nextStatus = advanceMap[task.status] || null;
    const nextStatusLabels = {
      todo: task.status === 'cancelled' ? 'Restore (To Do)' : 'To Do',
      inprogress: task.status === 'blocked' ? 'Unblock (In Progress)' : 'In Progress',
      inreview: 'In Review',
      done: 'Done'
    };

    card.innerHTML = `
      <!-- Left Semantic Work-Type Accent Bar -->
      <div class="task-card-accent-bar type-edge-${type}" title="Type of Work: ${typeConfig.label}"></div>

      <!-- Main Card Body -->
      <div class="task-card-inner">
        
        <!-- Header: Exact List-Style Work Type Badge, Key, Parent Link, Priority & Hover Actions -->
        <div class="task-card-header">
          <div class="task-card-identifiers">
            ${this.getTypeBadgeHTML(type)}
            <span class="task-card-key" title="Task Key ${task.key}">${task.key}</span>
            ${parentTask ? `
              <span class="task-card-parent-link" data-parent-id="${parentTask.id}" title="Parent Task: ${parentTask.key} — ${Utils.escapeHTML(parentTask.title)}">
                <i class="fa-solid fa-turn-up fa-rotate-90"></i> ${parentTask.key}
              </span>
            ` : ''}
          </div>

          <!-- Quick Action Buttons (shown on hover) -->
          <div class="task-card-quick-actions">
            ${nextStatus ? `
              <button type="button" class="btn-card-action btn-card-advance" title="Advance to ${nextStatusLabels[nextStatus] || nextStatus}" data-action="advance-status">
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            ` : ''}
            <button type="button" class="btn-card-action btn-card-edit" title="Edit task" data-action="open-detail">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-card-action btn-card-more" title="More options" data-action="open-menu">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </div>

          <!-- Priority Lozenge -->
          <span class="task-card-priority-badge ${priorityConfig.className}" title="Priority: ${priorityConfig.label}">
            <i class="${priorityConfig.icon}"></i>
          </span>
        </div>

        <!-- Title -->
        <div class="task-card-title" title="${Utils.escapeHTML(task.title)}">
          ${Utils.escapeHTML(task.title)}
        </div>

        <!-- Epic, Subtask Label & User Tags -->
        ${hasTags ? `
          <div class="task-card-tags-row">
            ${epic ? `
              <span class="task-card-epic-pill" title="Epic: ${Utils.escapeHTML(epic.title)}">
                <span class="epic-dot" style="background: ${epic.color || '#a371f7'};"></span>
                <span>${Utils.escapeHTML(epic.title)}</span>
              </span>
            ` : ''}
            ${isSubtask ? `
              <span class="task-card-subtask-pill" title="${parentTask ? `Subtask of ${parentTask.key}: ${Utils.escapeHTML(parentTask.title)}` : 'Subtask Issue'}">
                <i class="fa-solid fa-code-branch"></i> Subtask
              </span>
            ` : ''}
            ${filteredLabels.map(l => `
              <span class="tag-label" title="Label: ${Utils.escapeHTML(l)}">${Utils.escapeHTML(l)}</span>
            `).join('')}
          </div>
        ` : ''}

        <!-- Progress Bars (Checklist / Subtasks) -->
        ${totalCount > 0 && !isCompact ? `
          <div class="task-card-progress-section" title="Progress: ${totalDone} of ${totalCount} items completed">
            ${isMerged ? `
              <div class="task-card-progress-block is-merged ${isAllDone ? 'is-complete' : ''}">
                <div class="task-card-progress-header">
                  <div class="progress-header-left">
                    <span class="progress-type-badge type-merged">
                      <i class="fa-solid fa-layer-group"></i> Items
                    </span>
                    <span class="progress-count-pill">${totalDone}/${totalCount}</span>
                  </div>
                  <span class="progress-pct-badge ${isAllDone ? 'is-complete' : ''}">
                    ${isAllDone ? '<i class="fa-solid fa-check"></i> 100%' : `${Math.round((totalDone / totalCount) * 100)}%`}
                  </span>
                </div>
                <div class="task-card-progress-track">
                  <div class="task-card-progress-fill is-merged ${isAllDone ? 'is-complete' : ''}" style="width: ${(totalDone / totalCount) * 100}%;"></div>
                </div>
              </div>
            ` : `
              ${chkTotal > 0 ? `
                <div class="task-card-progress-block is-checklist ${chkDone === chkTotal ? 'is-complete' : ''}">
                  <div class="task-card-progress-header">
                    <div class="progress-header-left">
                      <span class="progress-type-badge type-checklist">
                        <i class="fa-regular fa-square-check"></i> Checklist
                      </span>
                      <span class="progress-count-pill">${chkDone}/${chkTotal}</span>
                    </div>
                    <span class="progress-pct-badge ${chkDone === chkTotal ? 'is-complete' : ''}">
                      ${chkDone === chkTotal ? '<i class="fa-solid fa-check"></i> 100%' : `${Math.round((chkDone / chkTotal) * 100)}%`}
                    </span>
                  </div>
                  <div class="task-card-progress-track">
                    <div class="task-card-progress-fill is-checklist ${chkDone === chkTotal ? 'is-complete' : ''}" style="width: ${(chkDone / chkTotal) * 100}%;"></div>
                  </div>
                </div>
              ` : ''}
              ${stTotal > 0 ? `
                <div class="task-card-progress-block is-subtask ${stDone === stTotal ? 'is-complete' : ''}">
                  <div class="task-card-progress-header">
                    <div class="progress-header-left">
                      <span class="progress-type-badge type-subtask">
                        <i class="fa-solid fa-network-wired"></i> Subtasks
                      </span>
                      <span class="progress-count-pill">${stDone}/${stTotal}</span>
                    </div>
                    <span class="progress-pct-badge ${stDone === stTotal ? 'is-complete' : ''}">
                      ${stDone === stTotal ? '<i class="fa-solid fa-check"></i> 100%' : `${Math.round((stDone / stTotal) * 100)}%`}
                    </span>
                  </div>
                  <div class="task-card-progress-track">
                    <div class="task-card-progress-fill is-subtask ${stDone === stTotal ? 'is-complete' : ''}" style="width: ${(stDone / stTotal) * 100}%;"></div>
                  </div>
                </div>
              ` : ''}
            `}
          </div>
        ` : ''}

        <!-- Card Footer: Due Date, Time, Points -->
        <div class="task-card-footer">
          <div class="task-card-meta-left">
            ${isCompact && totalCount > 0 ? `
              <div class="card-compact-progress-pill ${isAllDone ? 'is-complete' : ''}" title="${isMerged ? 'Items' : (chkTotal > 0 ? 'Checklist' : 'Subtasks')} ${totalDone}/${totalCount}">
                <i class="${isAllDone ? 'fa-solid fa-circle-check' : (chkTotal > 0 ? 'fa-regular fa-square-check' : 'fa-solid fa-network-wired')}"></i>
                <span>${totalDone}/${totalCount}</span>
              </div>
            ` : ''}
            ${task.dueDate ? `
              <div class="card-due-pill ${isOverdue ? 'is-overdue' : ''} ${isDueToday ? 'is-today' : ''}" title="Due: ${Utils.formatDate(task.dueDate)}">
                <i class="${isOverdue ? 'fa-solid fa-triangle-exclamation' : (isDueToday ? 'fa-solid fa-calendar-day' : 'fa-regular fa-clock')}"></i>
                <span>${Utils.formatRelativeDate(task.dueDate)}</span>
              </div>
            ` : ''}

            ${task.trackedTime > 0 ? `
              <div class="card-time-pill" title="Time Tracked: ${Utils.formatMinutes(task.trackedTime)}">
                <i class="fa-solid fa-stopwatch"></i>
                <span>${Utils.formatMinutes(task.trackedTime)}</span>
              </div>
            ` : ''}
          </div>

          <div class="task-card-meta-right">
            ${task.storyPoints > 0 ? `
              <span class="card-points-badge" title="${task.storyPoints} Story Points">
                <i class="fa-solid fa-diamond card-points-icon"></i>
                <span>${task.storyPoints}</span>
              </span>
            ` : ''}
          </div>
        </div>

      </div>
    `;

    // 1. Drag & Drop Event Listeners
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';

      try {
        const dragImg = card.cloneNode(true);
        dragImg.style.width = `${card.offsetWidth}px`;
        dragImg.style.opacity = '0.92';
        dragImg.style.position = 'absolute';
        dragImg.style.top = '-9999px';
        dragImg.style.left = '-9999px';
        dragImg.style.transform = 'rotate(2deg) scale(1.02)';
        dragImg.style.boxShadow = '0 14px 28px rgba(0, 0, 0, 0.25)';
        document.body.appendChild(dragImg);
        e.dataTransfer.setDragImage(dragImg, 20, 20);
        setTimeout(() => dragImg.remove(), 0);
      } catch (err) {
        // Fallback
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.board-column-body').forEach(col => {
        col.classList.remove('drag-over');
      });
      document.querySelectorAll('.board-drop-indicator').forEach(el => el.remove());
    });

    // 2. Micro-Action Clicks
    const advanceBtn = card.querySelector('[data-action="advance-status"]');
    if (advanceBtn && nextStatus) {
      advanceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AppState.updateTask(task.id, { status: nextStatus });
        Toast.success(`Advanced ${task.key} to ${nextStatusLabels[nextStatus] || nextStatus}`);
      });
    }

    const editBtn = card.querySelector('[data-action="open-detail"]');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        TaskModal.openDetail(task.id);
      });
    }

    const moreBtn = card.querySelector('[data-action="open-menu"]');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = moreBtn.getBoundingClientRect();
        ContextMenu.open(rect.left, rect.bottom + 4, task);
      });
    }

    // Click on Parent Link to open parent task drawer
    const parentLink = card.querySelector('.task-card-parent-link');
    if (parentLink && parentTask) {
      parentLink.addEventListener('click', (e) => {
        e.stopPropagation();
        TaskModal.openDetail(parentTask.id);
      });
    }

    // 3. Click to open Task Detail Drawer
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.btn-card-action') || e.target.closest('.task-card-parent-link')) return;
      TaskModal.openDetail(task.id);
    });

    // 4. Right-click Context Menu
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ContextMenu.open(e.clientX, e.clientY, task);
    });

    return card;
  }
};
