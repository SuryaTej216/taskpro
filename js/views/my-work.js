/**
 * TaskForge - My Work View
 * Sections: Today, Upcoming 7 Days, Overdue, and Recently Completed
 */

const MyWorkView = {
  currentGrouping: 'date', // 'date', 'project', 'priority'

  render(container) {
    const tasks = AppState.tasks;

    const overdueTasks = tasks.filter(t => Utils.isOverdue(t.dueDate, t.status));
    const todayTasks = tasks.filter(t => Utils.isDueToday(t.dueDate) && t.status !== 'done' && t.status !== 'cancelled');
    
    // Upcoming 7 days
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingTasks = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done' || t.status === 'cancelled') return false;
      const d = new Date(t.dueDate);
      return d > now && d <= nextWeek && !Utils.isDueToday(t.dueDate);
    });

    // Recently completed
    const recentlyCompleted = tasks.filter(t => t.status === 'done' && t.completedAt).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5);

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-briefcase" style="color: var(--accent-primary);"></i> My Work Agenda</h1>
            <p>Your focused personal cockpit: what requires attention today and ahead.</p>
          </div>
          <div class="view-actions">
            <button id="mywork-btn-create" class="btn btn-primary">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- 1. Overdue Section (Alert if > 0) -->
          ${overdueTasks.length > 0 ? `
            <div style="background: var(--bg-surface); border: 1px solid rgba(248, 81, 73, 0.4); border-radius: var(--radius-lg); overflow: hidden;">
              <div style="padding: 12px 18px; background: rgba(248, 81, 73, 0.08); border-bottom: 1px solid rgba(248, 81, 73, 0.2); display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--accent-danger);">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <span>Overdue Tasks (${overdueTasks.length})</span>
                </div>
                <span style="font-size: 11px; color: var(--accent-danger); font-weight: 600;">Action immediately</span>
              </div>
              <div style="padding: 8px; display: flex; flex-direction: column; gap: 6px;">
                ${overdueTasks.map(t => this.renderWorkItem(t)).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 2. Today's Focus -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;">
            <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px;">
                <i class="fa-solid fa-calendar-day" style="color: var(--accent-primary);"></i>
                <span>Due Today (${todayTasks.length})</span>
              </div>
              <span style="font-size: 12px; color: var(--text-muted);">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <div style="padding: 8px; display: flex; flex-direction: column; gap: 6px;">
              ${todayTasks.length === 0 ? `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
                  <i class="fa-regular fa-sun" style="font-size: 24px; color: var(--accent-warning); margin-bottom: 8px; display: block;"></i>
                  No tasks due today. You are completely ahead of schedule!
                </div>
              ` : todayTasks.map(t => this.renderWorkItem(t)).join('')}
            </div>
          </div>

          <!-- 3. Upcoming Next 7 Days -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;">
            <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px;">
                <i class="fa-solid fa-forward" style="color: var(--accent-purple);"></i>
                <span>Upcoming (Next 7 Days) (${upcomingTasks.length})</span>
              </div>
            </div>
            <div style="padding: 8px; display: flex; flex-direction: column; gap: 6px;">
              ${upcomingTasks.length === 0 ? `
                <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                  No deadlines scheduled for the next 7 days.
                </div>
              ` : upcomingTasks.map(t => this.renderWorkItem(t)).join('')}
            </div>
          </div>

          <!-- 4. Recently Completed -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden;">
            <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px;">
                <i class="fa-solid fa-circle-check" style="color: var(--accent-success);"></i>
                <span>Recently Completed (${recentlyCompleted.length})</span>
              </div>
            </div>
            <div style="padding: 8px; display: flex; flex-direction: column; gap: 6px;">
              ${recentlyCompleted.length === 0 ? `
                <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                  Completed tasks will appear here as your archive of wins.
                </div>
              ` : recentlyCompleted.map(t => this.renderWorkItem(t)).join('')}
            </div>
          </div>

        </div>

      </div>
    `;

    const createBtn = container.querySelector('#mywork-btn-create');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());
  },

  renderWorkItem(task) {
    const isDone = task.status === 'done';
    const project = AppState.projects.find(p => p.id === task.projectId);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all var(--transition-fast);" onclick="TaskModal.openDetail('${task.id}')">
        
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
          <input type="checkbox" ${isDone ? 'checked' : ''} onclick="event.stopPropagation(); AppState.updateTask('${task.id}', { status: this.checked ? 'done' : 'todo' })" style="cursor: pointer; width: 16px; height: 16px;">
          
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: var(--text-primary); ${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${Utils.escapeHTML(task.title)}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              <span style="font-family: var(--font-mono); font-weight: 600;">${task.key}</span>
              ${project ? `<span>• ${Utils.escapeHTML(project.name)}</span>` : ''}
              ${task.dueDate ? `<span>• Due ${Utils.formatRelativeDate(task.dueDate)}</span>` : ''}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge badge-status-${task.status}">${task.status}</span>
          <span class="badge-priority priority-${task.priority}"><i class="fa-solid fa-angles-up"></i></span>
        </div>

      </div>
    `;
  }
};
