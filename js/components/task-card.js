/**
 * TaskForge - Task Card Component (Kanban & Compact List Cards)
 */

const TaskCard = {
  /**
   * Generates DOM Element for a Kanban Task Card
   * @param {Object} task 
   * @returns {HTMLElement}
   */
  render(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('draggable', 'true');
    card.dataset.taskId = task.id;

    const isOverdue = Utils.isOverdue(task.dueDate, task.status);
    const completedChecklist = task.checklist ? task.checklist.filter(c => c.completed).length : 0;
    const totalChecklist = task.checklist ? task.checklist.length : 0;

    // Issue Type Icons
    let typeIcon = 'fa-square-check';
    if (task.type === 'bug') typeIcon = 'fa-circle-dot';
    if (task.type === 'story') typeIcon = 'fa-bookmark';
    if (task.type === 'epic') typeIcon = 'fa-bolt';
    if (task.type === 'improvement') typeIcon = 'fa-arrow-up-right-dots';

    // Priority Icon & Class
    let priorityIcon = 'fa-angles-up';
    if (task.priority === 'low' || task.priority === 'lowest') priorityIcon = 'fa-angles-down';
    if (task.priority === 'medium') priorityIcon = 'fa-bars';

    card.innerHTML = `
      <div class="task-card-header">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="type-icon type-${task.type || 'task'}" title="${task.type || 'task'}">
            <i class="fa-solid ${typeIcon}"></i>
          </span>
          <span class="task-card-key">${task.key}</span>
        </div>
        <span class="badge-priority priority-${task.priority}" title="Priority: ${task.priority}">
          <i class="fa-solid ${priorityIcon}"></i>
        </span>
      </div>

      <div class="task-card-title">${Utils.escapeHTML(task.title)}</div>

      ${task.labels && task.labels.length > 0 ? `
        <div class="task-card-labels">
          ${task.labels.map(l => `<span class="tag-label">${Utils.escapeHTML(l)}</span>`).join('')}
        </div>
      ` : ''}

      ${totalChecklist > 0 ? `
        <div style="margin-top: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-bottom: 3px;">
            <span><i class="fa-regular fa-square-check"></i> ${completedChecklist}/${totalChecklist}</span>
            <span>${Math.round((completedChecklist / totalChecklist) * 100)}%</span>
          </div>
          <div class="progress-bar-container" style="height: 4px;">
            <div class="progress-bar-fill" style="width: ${(completedChecklist / totalChecklist) * 100}%;"></div>
          </div>
        </div>
      ` : ''}

      <div class="task-card-footer">
        <div class="task-card-meta">
          ${task.dueDate ? `
            <div class="card-due-date ${isOverdue ? 'overdue' : ''}" title="Due Date: ${Utils.formatDate(task.dueDate)}">
              <i class="fa-regular fa-clock"></i>
              <span>${Utils.formatRelativeDate(task.dueDate)}</span>
            </div>
          ` : ''}
          ${task.trackedTime > 0 ? `
            <span style="font-size: 11px;" title="Time Tracked: ${Utils.formatMinutes(task.trackedTime)}">
              <i class="fa-solid fa-stopwatch"></i> ${Utils.formatMinutes(task.trackedTime)}
            </span>
          ` : ''}
        </div>

        ${task.storyPoints > 0 ? `
          <span class="card-story-points" title="Story Points">${task.storyPoints}</span>
        ` : ''}
      </div>
    `;

    // 1. Drag Events
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.board-column-body').forEach(col => col.classList.remove('drag-over'));
    });

    // 2. Click to open Task Detail Drawer
    card.addEventListener('click', (e) => {
      // Don't open if clicked button or checkbox
      if (e.target.closest('button')) return;
      TaskModal.openDetail(task.id);
    });

    // 3. Right click context menu
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ContextMenu.open(e.clientX, e.clientY, task);
    });

    return card;
  }
};
