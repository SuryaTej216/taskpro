/**
 * TaskForge - Timeline & Gantt View
 * Features: Horizontal schedule rendering from startDate to dueDate, Zoom levels (Day, Week, Month), and milestones
 */

const TimelineView = {
  currentZoom: 'week', // 'day', 'week', 'month'

  render(container) {
    const tasks = AppState.tasks.filter(t => t.startDate && t.dueDate && t.status !== 'cancelled');
    const selectedProject = AppState.projects.find(p => p.id === AppState.selectedProjectId);

    // Filter by project if selected
    const filteredTasks = selectedProject ? tasks.filter(t => t.projectId === selectedProject.id) : tasks;

    // Determine timeline start and end dates
    const now = new Date();
    const timelineStart = new Date(now);
    timelineStart.setDate(timelineStart.getDate() - 10);
    const timelineEnd = new Date(now);
    timelineEnd.setDate(timelineEnd.getDate() + 30);

    const totalDays = Math.round((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24));

    container.innerHTML = `
      <div class="view-page" style="height: 100%; display: flex; flex-direction: column;">
        <!-- View Header -->
        <div class="view-header" style="margin-bottom: 16px;">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-chart-gantt" style="color: var(--accent-primary);"></i> Timeline & Gantt Chart</h1>
            <p>Visualize schedules, identify delivery bottlenecks, and track milestone progression.</p>
          </div>
          <div class="view-actions">
            <div style="display: flex; gap: 4px; background: var(--bg-surface-elevated); padding: 2px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
              <button class="btn btn-sm ${this.currentZoom === 'day' ? 'btn-secondary' : 'btn-ghost'}" onclick="TimelineView.setZoom('day')">Day</button>
              <button class="btn btn-sm ${this.currentZoom === 'week' ? 'btn-secondary' : 'btn-ghost'}" onclick="TimelineView.setZoom('week')">Week</button>
              <button class="btn btn-sm ${this.currentZoom === 'month' ? 'btn-secondary' : 'btn-ghost'}" onclick="TimelineView.setZoom('month')">Month</button>
            </div>
            <button id="btn-timeline-create" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>

        <!-- Timeline Gantt Container -->
        <div style="flex: 1; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden;">
          
          <!-- Timeline Scale Header -->
          <div style="display: flex; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-elevated);">
            <!-- Fixed Left Label Column -->
            <div style="width: 260px; padding: 12px 16px; font-weight: 700; font-size: 12px; color: var(--text-muted); border-right: 1px solid var(--border-subtle); flex-shrink: 0;">
              Task / Initiative
            </div>
            <!-- Horizontal Days Grid -->
            <div style="flex: 1; display: flex; overflow-x: auto;" id="timeline-days-header">
              ${this.renderDaysHeader(timelineStart, totalDays)}
            </div>
          </div>

          <!-- Timeline Rows -->
          <div style="flex: 1; overflow-y: auto; overflow-x: hidden;">
            ${filteredTasks.length === 0 ? `
              <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-calendar-xmark" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No Scheduled Tasks with Start and Due Dates</div>
                <div style="font-size: 13px;">Add start and due dates to your tasks to visualize them on the Gantt timeline.</div>
              </div>
            ` : filteredTasks.map(t => this.renderTimelineRow(t, timelineStart, totalDays)).join('')}
          </div>

        </div>

      </div>
    `;

    const createBtn = container.querySelector('#btn-timeline-create');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());
  },

  renderDaysHeader(startDate, totalDays) {
    let html = '';
    const d = new Date(startDate);
    const dayWidth = 40; // px per day

    for (let i = 0; i < totalDays; i++) {
      const isToday = Utils.isDueToday(d);
      html += `
        <div style="width: ${dayWidth}px; min-width: ${dayWidth}px; padding: 8px 0; text-align: center; font-size: 11px; border-right: 1px solid var(--border-subtle); ${isToday ? 'background: var(--accent-primary-subtle); color: var(--accent-primary); font-weight: 700;' : 'color: var(--text-muted);'}">
          <div>${d.getDate()}</div>
          <div style="font-size: 9px; text-transform: uppercase;">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
        </div>
      `;
      d.setDate(d.getDate() + 1);
    }
    return html;
  },

  renderTimelineRow(task, timelineStart, totalDays) {
    const dayWidth = 40;
    const tStart = new Date(task.startDate);
    const tEnd = new Date(task.dueDate);

    // Calculate left offset and duration in days
    const diffStartDays = Math.max(0, Math.round((tStart - timelineStart) / (1000 * 60 * 60 * 24)));
    const durationDays = Math.max(1, Math.round((tEnd - tStart) / (1000 * 60 * 60 * 24)));

    const leftPx = diffStartDays * dayWidth;
    const widthPx = durationDays * dayWidth;

    let barColor = '#388bfd';
    if (task.status === 'done') barColor = '#3fb950';
    if (task.status === 'inprogress') barColor = '#d29922';
    if (task.priority === 'critical') barColor = '#f85149';

    return `
      <div style="display: flex; border-bottom: 1px solid var(--border-subtle); align-items: center; height: 42px; position: relative;">
        <!-- Left Label -->
        <div style="width: 260px; padding: 0 16px; display: flex; align-items: center; gap: 8px; font-size: 12px; border-right: 1px solid var(--border-subtle); flex-shrink: 0; background: var(--bg-surface); z-index: 10;" onclick="TaskModal.openDetail('${task.id}')" style="cursor: pointer;">
          <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-muted);">${task.key}</span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 500;">${Utils.escapeHTML(task.title)}</span>
        </div>

        <!-- Right Bar Space -->
        <div style="flex: 1; height: 100%; position: relative; background: repeating-linear-gradient(to right, transparent, transparent 39px, var(--border-subtle) 40px);">
          <div style="position: absolute; left: ${leftPx}px; width: ${widthPx}px; height: 24px; top: 9px; background: ${barColor}; border-radius: var(--radius-sm); color: white; display: flex; align-items: center; padding: 0 8px; font-size: 11px; font-weight: 600; overflow: hidden; white-space: nowrap; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" onclick="TaskModal.openDetail('${task.id}')" title="${Utils.escapeHTML(task.title)} (${Utils.formatDate(task.startDate)} - ${Utils.formatDate(task.dueDate)})">
            <span>${Utils.escapeHTML(task.title)}</span>
          </div>
        </div>
      </div>
    `;
  },

  setZoom(zoom) {
    this.currentZoom = zoom;
    Router.renderCurrentRoute();
  }
};
