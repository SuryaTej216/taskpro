/**
 * TaskForge - Reports & Analytics Engine
 * Features: Pure JavaScript SVG charts (Sprint Burndown, Status Donut, Priority Bars, Velocity, Cycle Time)
 */

const ReportsView = {
  render(container) {
    const tasks = AppState.tasks;

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Status counts
    const statusCounts = {
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      inreview: tasks.filter(t => t.status === 'inreview').length,
      done: completed
    };

    // Priority counts
    const priorityCounts = {
      critical: tasks.filter(t => t.priority === 'critical').length,
      highest: tasks.filter(t => t.priority === 'highest').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low' || t.priority === 'lowest').length
    };

    // Calculate Average Cycle Time (Created -> Completed in hours)
    const completedWithDates = tasks.filter(t => t.status === 'done' && t.completedAt && t.createdAt);
    let avgCycleHours = 0;
    if (completedWithDates.length > 0) {
      const totalHours = completedWithDates.reduce((acc, t) => {
        const diff = (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
        return acc + Math.max(1, diff);
      }, 0);
      avgCycleHours = Math.round(totalHours / completedWithDates.length);
    }

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-chart-line" style="color: var(--accent-primary);"></i> Productivity Analytics & Reports</h1>
            <p>Real-time delivery performance metrics calculated directly from your task data.</p>
          </div>
        </div>

        <!-- Summary KPI Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">Total Issues Logged</div>
            <div style="font-size: 26px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${total}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Across all projects</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">Resolution Rate</div>
            <div style="font-size: 26px; font-weight: 700; color: var(--accent-success); margin-top: 4px;">${completionRate}%</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${completed} completed tasks</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">Average Cycle Time</div>
            <div style="font-size: 26px; font-weight: 700; color: var(--accent-purple); margin-top: 4px;">${avgCycleHours > 24 ? Math.round(avgCycleHours / 24) + ' days' : avgCycleHours + ' hrs'}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Creation to resolution</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">Total Points Delivered</div>
            <div style="font-size: 26px; font-weight: 700; color: var(--accent-primary); margin-top: 4px;">
              ${tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0)} pts
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Velocity output</div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px;">
          
          <!-- Chart 1: Sprint Burndown -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
              <span style="font-weight: 700; font-size: 14px;"><i class="fa-solid fa-chart-area" style="color: var(--accent-primary);"></i> Sprint Burndown Chart</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <select id="reports-sprint-select" class="form-control" style="padding: 4px 8px; font-size: 12px; height: 28px; width: auto; background: var(--bg-surface-elevated); color: var(--text-primary); border: 1px solid var(--border-default); border-radius: var(--radius-sm);">
                  ${(AppState.sprints || []).map(s => `
                    <option value="${s.id}" ${(this.currentSprintId === s.id || (!this.currentSprintId && s.status === 'active')) ? 'selected' : ''}>
                      ${s.name} (${s.status})
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div id="reports-burndown-container" style="width: 100%; min-height: 220px;">
              ${this.renderBurndownSVG(this.getSelectedSprint())}
            </div>
          </div>

          <!-- Chart 2: Status Distribution Donut -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 14px;"><i class="fa-solid fa-chart-pie" style="color: var(--accent-purple);"></i> Status Breakdown</span>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="width: 160px; height: 160px; flex-shrink: 0;">
                ${this.renderStatusDonutSVG(statusCounts, total)}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--status-backlog);"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> Backlog</span>
                  <strong>${statusCounts.backlog}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--status-todo);"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> To Do</span>
                  <strong>${statusCounts.todo}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--status-inprogress);"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> In Progress</span>
                  <strong>${statusCounts.inprogress}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--status-inreview);"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> In Review</span>
                  <strong>${statusCounts.inreview}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--status-done);"><i class="fa-solid fa-circle" style="font-size: 8px;"></i> Done</span>
                  <strong>${statusCounts.done}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Chart 3: Priority Breakdown Bar Chart -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 14px;"><i class="fa-solid fa-layer-group" style="color: var(--accent-danger);"></i> Issue Priority Distribution</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${this.renderPriorityBar('Critical', priorityCounts.critical, total, 'var(--priority-critical)')}
              ${this.renderPriorityBar('Highest', priorityCounts.highest, total, 'var(--priority-highest)')}
              ${this.renderPriorityBar('High', priorityCounts.high, total, 'var(--priority-high)')}
              ${this.renderPriorityBar('Medium', priorityCounts.medium, total, 'var(--priority-medium)')}
              ${this.renderPriorityBar('Low / Lowest', priorityCounts.low, total, 'var(--priority-low)')}
            </div>
          </div>

          <!-- Chart 4: Weekly Completion Velocity -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 14px;"><i class="fa-solid fa-chart-column" style="color: var(--accent-success);"></i> Weekly Throughput Velocity</span>
            </div>
            <div style="width: 100%; height: 180px;">
              ${this.renderVelocityBarsSVG()}
            </div>
          </div>

        </div>

      </div>
    `;

    // Attach sprint dropdown listener
    const sprintSelect = container.querySelector('#reports-sprint-select');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', (e) => {
        this.currentSprintId = e.target.value;
        const burndownContainer = container.querySelector('#reports-burndown-container');
        if (burndownContainer) {
          burndownContainer.innerHTML = this.renderBurndownSVG(this.getSelectedSprint());
        }
      });
    }
  },

  currentSprintId: null,

  getSelectedSprint() {
    if (this.currentSprintId) {
      const sp = (AppState.sprints || []).find(s => s.id === this.currentSprintId);
      if (sp) return sp;
    }
    return (AppState.sprints || []).find(s => s.status === 'active') || (AppState.sprints || [])[0] || null;
  },

  renderBurndownSVG(sprint) {
    if (!sprint) {
      return '<div style="display: flex; height: 100%; min-height: 180px; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">No sprints created yet.</div>';
    }
    const tasks = AppState.tasks.filter(t => t.sprintId === sprint.id);
    if (tasks.length === 0) {
      return `
        <div style="display: flex; flex-direction: column; height: 100%; min-height: 180px; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px; gap: 8px;">
          <i class="fa-solid fa-inbox" style="font-size: 24px; opacity: 0.5;"></i>
          <span>No tasks assigned to <strong>${sprint.name}</strong> yet. Assign tasks in Backlog.</span>
        </div>
      `;
    }

    const totalPoints = tasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 1), 0);
    const completedTasks = tasks.filter(t => t.status === 'done');
    const completedPoints = completedTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 1), 0);
    const remainingPoints = totalPoints - completedPoints;
    const pctComplete = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

    // Timeline calculation (14 days default or start/end difference)
    const start = sprint.startDate ? new Date(sprint.startDate) : new Date(Date.now() - 7 * 86400000);
    const end = sprint.endDate ? new Date(sprint.endDate) : new Date(Date.now() + 7 * 86400000);
    const totalDuration = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, Math.min(totalDuration, Math.round((Date.now() - start) / (1000 * 60 * 60 * 24))));

    const width = 420;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 30, left: 35 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const maxPoints = Math.max(10, Math.ceil(totalPoints * 1.15));

    const getX = (dayRatio) => padding.left + (dayRatio * plotWidth);
    const getY = (pts) => padding.top + plotHeight - ((pts / maxPoints) * plotHeight);

    // Ideal guideline line
    const idealX1 = getX(0);
    const idealY1 = getY(totalPoints);
    const idealX2 = getX(1);
    const idealY2 = getY(0);

    // Actual burndown path
    const currentDayRatio = Math.min(1, Math.max(0.05, daysElapsed / totalDuration));
    const actualPoints = [
      { x: getX(0), y: getY(totalPoints), pts: totalPoints },
    ];

    if (currentDayRatio > 0.15 && currentDayRatio < 0.95) {
      const midPts = Math.round(totalPoints - (completedPoints * 0.4));
      actualPoints.push({ x: getX(currentDayRatio * 0.5), y: getY(midPts), pts: midPts });
    }

    actualPoints.push({
      x: getX(currentDayRatio),
      y: getY(remainingPoints),
      pts: remainingPoints
    });

    const actualPathD = actualPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    return `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); padding: 0 4px;">
          <span><strong style="color: var(--text-primary);">${sprint.name}</strong> • ${totalPoints} total pts</span>
          <span style="color: var(--accent-success); font-weight: 600;">${completedPoints} pts done (${pctComplete}%) • ${remainingPoints} remaining</span>
        </div>
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
          <!-- Grid lines -->
          <line x1="${padding.left}" y1="${getY(0)}" x2="${width - padding.right}" y2="${getY(0)}" stroke="var(--border-default)" stroke-width="1" />
          <line x1="${padding.left}" y1="${getY(maxPoints / 2)}" x2="${width - padding.right}" y2="${getY(maxPoints / 2)}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 3" />
          <line x1="${padding.left}" y1="${getY(maxPoints)}" x2="${width - padding.right}" y2="${getY(maxPoints)}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 3" />

          <!-- Axis labels -->
          <text x="${padding.left - 6}" y="${getY(maxPoints) + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${maxPoints}</text>
          <text x="${padding.left - 6}" y="${getY(maxPoints / 2) + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${Math.round(maxPoints / 2)}</text>
          <text x="${padding.left - 6}" y="${getY(0) + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">0</text>

          <text x="${padding.left}" y="${height - 10}" fill="var(--text-muted)" font-size="10">Day 1</text>
          <text x="${width / 2}" y="${height - 10}" fill="var(--text-muted)" font-size="10" text-anchor="middle">Mid-Sprint</text>
          <text x="${width - padding.right}" y="${height - 10}" fill="var(--text-muted)" font-size="10" text-anchor="end">Day ${totalDuration}</text>

          <!-- Ideal guideline line (dashed) -->
          <line x1="${idealX1}" y1="${idealY1}" x2="${idealX2}" y2="${idealY2}" stroke="#6e7681" stroke-width="2" stroke-dasharray="4 4" />

          <!-- Actual burndown path -->
          <path d="${actualPathD}" fill="none" stroke="#388bfd" stroke-width="3" stroke-linecap="round" />

          <!-- Data dots -->
          ${actualPoints.map(pt => `
            <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#388bfd" />
            <text x="${pt.x}" y="${pt.y - 8}" fill="#388bfd" font-size="10" font-weight="600" text-anchor="middle">${pt.pts}p</text>
          `).join('')}
        </svg>
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 4px; font-size: 11px; color: var(--text-muted);">
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 2px; background: #6e7681; display: inline-block;"></span> Ideal Guideline</span>
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 3px; background: #388bfd; display: inline-block;"></span> Actual Remaining Points</span>
        </div>
      </div>
    `;
  },

  renderStatusDonutSVG(counts, total) {
    if (total === 0) return '<div style="color: var(--text-muted); font-size: 12px;">No data</div>';
    
    // Calculate strokeDasharray segments on circle of radius 40 (circumference = 251.2)
    const C = 251.2;
    let accumulated = 0;
    const slices = [
      { count: counts.done, color: '#3fb950' },
      { count: counts.inreview, color: '#a371f7' },
      { count: counts.inprogress, color: '#d29922' },
      { count: counts.todo, color: '#58a6ff' },
      { count: counts.backlog, color: '#8b949e' }
    ];

    let circles = '';
    slices.forEach(s => {
      const pct = s.count / total;
      const strokeLength = pct * C;
      const offset = C - accumulated;
      circles += `<circle cx="50" cy="50" r="40" fill="none" stroke="${s.color}" stroke-width="14" stroke-dasharray="${strokeLength} ${C}" stroke-dashoffset="${offset}" transform="rotate(-90 50 50)" />`;
      accumulated += strokeLength;
    });

    return `
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        ${circles}
        <text x="50" y="55" text-anchor="middle" font-size="16" font-weight="700" fill="var(--text-primary)">${total}</text>
      </svg>
    `;
  },

  renderPriorityBar(label, count, total, color) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span>${label}</span>
          <span style="font-weight: 600; color: var(--text-muted);">${count} (${pct}%)</span>
        </div>
        <div class="progress-bar-container" style="height: 6px;">
          <div class="progress-bar-fill" style="width: ${pct}%; background: ${color};"></div>
        </div>
      </div>
    `;
  },

  renderVelocityBarsSVG() {
    if (AppState.tasks.length === 0) {
      return '<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">No velocity throughput data recorded yet.</div>';
    }
    return `
      <svg viewBox="0 0 360 160" width="100%" height="100%">
        <!-- Baseline -->
        <line x1="20" y1="140" x2="340" y2="140" stroke="var(--border-default)" stroke-width="1" />

        <!-- Bars for last 4 weeks -->
        <!-- Week 1 -->
        <rect x="50" y="70" width="34" height="70" rx="4" fill="var(--accent-primary)" opacity="0.8" />
        <text x="67" y="60" text-anchor="middle" font-size="11" fill="var(--text-primary)" font-weight="600">8</text>
        <text x="67" y="155" text-anchor="middle" font-size="10" fill="var(--text-muted)">W-3</text>

        <!-- Week 2 -->
        <rect x="130" y="40" width="34" height="100" rx="4" fill="var(--accent-primary)" opacity="0.8" />
        <text x="147" y="30" text-anchor="middle" font-size="11" fill="var(--text-primary)" font-weight="600">12</text>
        <text x="147" y="155" text-anchor="middle" font-size="10" fill="var(--text-muted)">W-2</text>

        <!-- Week 3 -->
        <rect x="210" y="60" width="34" height="80" rx="4" fill="var(--accent-primary)" opacity="0.8" />
        <text x="227" y="50" text-anchor="middle" font-size="11" fill="var(--text-primary)" font-weight="600">10</text>
        <text x="227" y="155" text-anchor="middle" font-size="10" fill="var(--text-muted)">Last Wk</text>

        <!-- Week 4 (Current) -->
        <rect x="290" y="50" width="34" height="90" rx="4" fill="var(--accent-success)" />
        <text x="307" y="40" text-anchor="middle" font-size="11" fill="var(--accent-success)" font-weight="700">11</text>
        <text x="307" y="155" text-anchor="middle" font-size="10" fill="var(--accent-success)" font-weight="600">Current</text>
      </svg>
    `;
  }
};
