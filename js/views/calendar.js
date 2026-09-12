/**
 * TaskForge - Calendar View
 * Features: Month & Week views, Due date scheduling, Click date to create task
 */

const CalendarView = {
  currentDate: new Date(),
  currentView: 'month', // 'month', 'week'

  render(container) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const tasks = AppState.tasks.filter(t => t.dueDate && t.status !== 'cancelled');

    container.innerHTML = `
      <div class="view-page" style="height: 100%; display: flex; flex-direction: column;">
        <!-- Calendar Header -->
        <div class="view-header" style="margin-bottom: 16px;">
          <div class="view-title-group">
            <h1><i class="fa-regular fa-calendar-days" style="color: var(--accent-primary);"></i> Calendar Agenda</h1>
            <p>Schedule commitments, balance delivery dates, and plan milestones.</p>
          </div>
          <div class="view-actions">
            <button class="btn btn-secondary btn-sm" onclick="CalendarView.prevMonth()"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="btn btn-secondary btn-sm" onclick="CalendarView.today()">Today</button>
            <button class="btn btn-secondary btn-sm" onclick="CalendarView.nextMonth()"><i class="fa-solid fa-chevron-right"></i></button>
            <span style="font-weight: 700; font-size: 14px; margin: 0 8px;">${monthName}</span>
            <button id="btn-calendar-create" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>

        <!-- Month Grid -->
        <div style="flex: 1; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden;">
          
          <!-- Day of Week Headers -->
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-elevated);">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `
              <div style="padding: 8px; text-align: center; font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--text-muted);">
                ${d}
              </div>
            `).join('')}
          </div>

          <!-- Days Grid -->
          <div style="flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: 1fr; overflow-y: auto;" id="calendar-cells-grid">
            ${this.renderMonthCells(year, month, tasks)}
          </div>

        </div>

      </div>
    `;

    // Attach click listeners to date cells for quick creation
    container.querySelectorAll('.calendar-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.cal-task-pill')) return;
        const dateStr = cell.dataset.date;
        TaskModal.openCreate({ dueDate: dateStr });
      });
    });

    const createBtn = container.querySelector('#btn-calendar-create');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());
  },

  renderMonthCells(year, month, tasks) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let cellsHtml = '';

    // Previous month padding cells
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      cellsHtml += `
        <div class="calendar-cell" style="padding: 6px; border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); opacity: 0.3; background: var(--bg-app);">
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">${dayNum}</div>
        </div>
      `;
    }

    // Current month days
    const now = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isToday = cellDate.getDate() === now.getDate() && cellDate.getMonth() === now.getMonth() && cellDate.getFullYear() === now.getFullYear();
      const dateISO = cellDate.toISOString();

      const dayTasks = tasks.filter(t => {
        const td = new Date(t.dueDate);
        return td.getDate() === d && td.getMonth() === month && td.getFullYear() === year;
      });

      cellsHtml += `
        <div class="calendar-cell" data-date="${dateISO}" style="padding: 6px; border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background var(--transition-fast); display: flex; flex-direction: column; min-height: 90px; ${isToday ? 'background: rgba(56, 139, 253, 0.05);' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 12px; font-weight: ${isToday ? '700' : '500'}; color: ${isToday ? 'var(--accent-primary)' : 'var(--text-secondary)'}; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; ${isToday ? 'background: var(--accent-primary-subtle); border-radius: 50%;' : ''}">
              ${d}
            </span>
            ${dayTasks.length > 0 ? `<span style="font-size: 10px; color: var(--text-muted);">${dayTasks.length}</span>` : ''}
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; overflow-y: auto; flex: 1;">
            ${dayTasks.map(t => {
              const isOverdue = Utils.isOverdue(t.dueDate, t.status);
              return `
                <div class="cal-task-pill" onclick="TaskModal.openDetail('${t.id}')" title="${Utils.escapeHTML(t.title)}" style="padding: 3px 6px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; background: ${isOverdue ? 'var(--accent-danger-subtle)' : 'var(--bg-surface-elevated)'}; color: ${isOverdue ? 'var(--accent-danger)' : 'var(--text-primary)'}; border: 1px solid ${isOverdue ? 'rgba(248, 81, 73, 0.3)' : 'var(--border-default)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">
                  <span style="font-family: var(--font-mono); font-size: 10px; font-weight: 700;">${t.key}</span>
                  <span>${Utils.escapeHTML(t.title)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    return cellsHtml;
  },

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    Router.renderCurrentRoute();
  },

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    Router.renderCurrentRoute();
  },

  today() {
    this.currentDate = new Date();
    Router.renderCurrentRoute();
  }
};
