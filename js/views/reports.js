/**
 * TaskForge - Reports & Analytics Engine (Perfected)
 * Features: Pure JavaScript SVG charts (Sprint Burndown, Status Donut, Priority Bars, Velocity, Cycle Time)
 * All charts are data-driven from real task data — no hardcoded/static values.
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

    // In-progress count
    const inProgressCount = tasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;

    // Overdue count
    const now = new Date();
    const overdueCount = tasks.filter(t => t.dueDate && t.status !== 'done' && t.status !== 'cancelled' && new Date(t.dueDate) < now).length;

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
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div class="reports-kpi-card">
            <div class="reports-kpi-label">Total Issues Logged</div>
            <div class="reports-kpi-value">${total}</div>
            <div class="reports-kpi-sub">Across all projects</div>
          </div>

          <div class="reports-kpi-card">
            <div class="reports-kpi-label">Resolution Rate</div>
            <div class="reports-kpi-value" style="color: var(--accent-success);">${completionRate}%</div>
            <div class="reports-kpi-sub">${completed} of ${total} tasks resolved</div>
            <div class="reports-kpi-bar">
              <div class="reports-kpi-bar-fill" style="width: ${completionRate}%; background: var(--accent-success);"></div>
            </div>
          </div>

          <div class="reports-kpi-card">
            <div class="reports-kpi-label">Average Cycle Time</div>
            <div class="reports-kpi-value" style="color: var(--accent-purple);">${avgCycleHours > 24 ? Math.round(avgCycleHours / 24) + ' days' : avgCycleHours + ' hrs'}</div>
            <div class="reports-kpi-sub">Creation to resolution</div>
          </div>

          <div class="reports-kpi-card">
            <div class="reports-kpi-label">Points Delivered</div>
            <div class="reports-kpi-value" style="color: var(--accent-primary);">
              ${tasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0)} pts
            </div>
            <div class="reports-kpi-sub">Total velocity output</div>
          </div>

          <div class="reports-kpi-card">
            <div class="reports-kpi-label">In Progress</div>
            <div class="reports-kpi-value" style="color: var(--accent-warning);">${inProgressCount}</div>
            <div class="reports-kpi-sub">Active work items</div>
          </div>

          <div class="reports-kpi-card">
            <div class="reports-kpi-label">Overdue</div>
            <div class="reports-kpi-value" style="color: ${overdueCount > 0 ? 'var(--accent-danger)' : 'var(--accent-success)'};">${overdueCount}</div>
            <div class="reports-kpi-sub">${overdueCount > 0 ? 'Past due date' : 'All on track!'}</div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px;">
          
          <!-- Chart 1: Sprint Burndown -->
          <div class="reports-chart-card">
            <div class="reports-chart-header">
              <span class="reports-chart-title"><i class="fa-solid fa-chart-area" style="color: var(--accent-primary);"></i> Sprint Burndown Chart</span>
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
          <div class="reports-chart-card">
            <div class="reports-chart-header">
              <span class="reports-chart-title"><i class="fa-solid fa-chart-pie" style="color: var(--accent-purple);"></i> Status Breakdown</span>
            </div>
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
              <div style="width: 170px; height: 170px; flex-shrink: 0;">
                ${this.renderStatusDonutSVG(statusCounts, total)}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column; gap: 10px; font-size: 12px; min-width: 160px;">
                ${this.renderDonutLegendItem('Backlog', statusCounts.backlog, total, 'var(--status-backlog)')}
                ${this.renderDonutLegendItem('To Do', statusCounts.todo, total, 'var(--status-todo)')}
                ${this.renderDonutLegendItem('In Progress', statusCounts.inprogress, total, 'var(--status-inprogress)')}
                ${this.renderDonutLegendItem('In Review', statusCounts.inreview, total, 'var(--status-inreview)')}
                ${this.renderDonutLegendItem('Done', statusCounts.done, total, 'var(--status-done)')}
              </div>
            </div>
          </div>

          <!-- Chart 3: Priority Breakdown Bar Chart -->
          <div class="reports-chart-card">
            <div class="reports-chart-header">
              <span class="reports-chart-title"><i class="fa-solid fa-layer-group" style="color: var(--accent-danger);"></i> Issue Priority Distribution</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${this.renderPriorityBar('Critical', priorityCounts.critical, total, 'var(--priority-critical)')}
              ${this.renderPriorityBar('Highest', priorityCounts.highest, total, 'var(--priority-highest)')}
              ${this.renderPriorityBar('High', priorityCounts.high, total, 'var(--priority-high)')}
              ${this.renderPriorityBar('Medium', priorityCounts.medium, total, 'var(--priority-medium)')}
              ${this.renderPriorityBar('Low / Lowest', priorityCounts.low, total, 'var(--priority-low)')}
            </div>
          </div>

          <!-- Chart 4: Weekly Completion Velocity (REAL DATA) -->
          <div class="reports-chart-card">
            <div class="reports-chart-header">
              <span class="reports-chart-title"><i class="fa-solid fa-chart-column" style="color: var(--accent-success);"></i> Weekly Throughput Velocity</span>
            </div>
            <div style="width: 100%; height: 200px;">
              ${this.renderVelocityBarsSVG()}
            </div>
          </div>

          <!-- Chart 5: Cycle Time Distribution -->
          <div class="reports-chart-card">
            <div class="reports-chart-header">
              <span class="reports-chart-title"><i class="fa-solid fa-clock-rotate-left" style="color: var(--accent-cyan);"></i> Cycle Time Distribution</span>
            </div>
            <div style="width: 100%; height: 200px;">
              ${this.renderCycleTimeChartSVG()}
            </div>
          </div>

          <!-- Chart 6: Task Completion Trend Line -->
          <div class="reports-chart-card">
            <div class="reports-chart-header">
              <span class="reports-chart-title"><i class="fa-solid fa-arrow-trend-up" style="color: var(--accent-primary);"></i> Cumulative Completion Trend</span>
            </div>
            <div style="width: 100%; height: 200px;">
              ${this.renderCompletionTrendSVG()}
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

  renderDonutLegendItem(label, count, total, color) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
          <span style="color: var(--text-secondary);">${label}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <strong style="color: var(--text-primary);">${count}</strong>
          <span style="color: var(--text-muted); font-size: 11px;">(${pct}%)</span>
        </div>
      </div>
    `;
  },

  renderBurndownSVG(sprint) {
    if (!sprint) {
      return '<div style="display: flex; height: 100%; min-height: 180px; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;"><i class="fa-solid fa-inbox" style="margin-right: 8px; opacity: 0.5;"></i> No sprints created yet. Create a sprint in Backlog.</div>';
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

    // Timeline calculation
    const start = sprint.startDate ? new Date(sprint.startDate) : new Date(Date.now() - 7 * 86400000);
    const end = sprint.endDate ? new Date(sprint.endDate) : new Date(Date.now() + 7 * 86400000);
    const totalDuration = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, Math.min(totalDuration, Math.round((Date.now() - start) / (1000 * 60 * 60 * 24))));

    const width = 420;
    const height = 190;
    const padding = { top: 24, right: 35, bottom: 36, left: 40 };
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

    // Build actual burndown from daily completion data
    const actualPoints = [{ x: getX(0), y: getY(totalPoints), pts: totalPoints }];

    // Build day-by-day burndown using completedAt timestamps
    const startMs = start.getTime();
    const dayMs = 86400000;
    for (let d = 1; d <= Math.min(daysElapsed, totalDuration); d++) {
      const dayEnd = new Date(startMs + d * dayMs);
      const completedByDay = tasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt) <= dayEnd);
      const donePoints = completedByDay.reduce((sum, t) => sum + (Number(t.storyPoints) || 1), 0);
      const rem = totalPoints - donePoints;
      actualPoints.push({
        x: getX(d / totalDuration),
        y: getY(rem),
        pts: rem
      });
    }

    // If no daily data is available (no completedAt), use simple 2-point
    if (actualPoints.length === 1) {
      const currentDayRatio = Math.min(1, Math.max(0.05, daysElapsed / totalDuration));
      actualPoints.push({
        x: getX(currentDayRatio),
        y: getY(remainingPoints),
        pts: remainingPoints
      });
    }

    // Create smooth path
    const actualPathD = actualPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    // Area fill under actual line
    const lastPt = actualPoints[actualPoints.length - 1];
    const areaPathD = `${actualPathD} L ${lastPt.x} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

    // Grid lines (horizontal)
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const y = getY(maxPoints * pct);
      const label = Math.round(maxPoints * pct);
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="${pct > 0 && pct < 1 ? '3 3' : '0'}" />
        <text x="${padding.left - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${label}</text>
      `;
    }).join('');

    // Key data points to label (first, last, and optionally mid)
    const labelPoints = [actualPoints[0], actualPoints[actualPoints.length - 1]];

    return `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); padding: 0 4px;">
          <span><strong style="color: var(--text-primary);">${sprint.name}</strong> • ${totalPoints} total pts</span>
          <span style="color: var(--accent-success); font-weight: 600;">${completedPoints} pts done (${pctComplete}%) • ${remainingPoints} remaining</span>
        </div>
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
          <!-- Grid lines -->
          ${gridLines}
          <line x1="${padding.left}" y1="${getY(0)}" x2="${width - padding.right}" y2="${getY(0)}" stroke="var(--border-default)" stroke-width="1" />

          <!-- X-axis labels -->
          <text x="${padding.left}" y="${height - 8}" fill="var(--text-muted)" font-size="10">Day 1</text>
          <text x="${width / 2}" y="${height - 8}" fill="var(--text-muted)" font-size="10" text-anchor="middle">Mid-Sprint</text>
          <text x="${width - padding.right}" y="${height - 8}" fill="var(--text-muted)" font-size="10" text-anchor="end">Day ${totalDuration}</text>

          <!-- Ideal guideline line (dashed) -->
          <line x1="${idealX1}" y1="${idealY1}" x2="${idealX2}" y2="${idealY2}" stroke="#6e7681" stroke-width="2" stroke-dasharray="6 4" />

          <!-- Area fill under actual line -->
          <path d="${areaPathD}" fill="rgba(56, 139, 253, 0.08)" />

          <!-- Actual burndown path -->
          <path d="${actualPathD}" fill="none" stroke="#58a6ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Data dots on key points -->
          ${labelPoints.map(pt => `
            <circle cx="${pt.x}" cy="${pt.y}" r="4.5" fill="#58a6ff" stroke="var(--bg-surface)" stroke-width="2" />
            <text x="${pt.x}" y="${pt.y - 10}" fill="#58a6ff" font-size="10" font-weight="600" text-anchor="middle">${pt.pts}p</text>
          `).join('')}
        </svg>
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 4px; font-size: 11px; color: var(--text-muted);">
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 14px; height: 2px; background: #6e7681; display: inline-block;"></span> Ideal Guideline</span>
          <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 14px; height: 3px; background: #58a6ff; display: inline-block; border-radius: 1px;"></span> Actual Remaining</span>
        </div>
      </div>
    `;
  },

  renderStatusDonutSVG(counts, total) {
    if (total === 0) return '<div style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px;">No data</div>';

    // Calculate strokeDasharray segments on circle of radius 40 (circumference = 251.2)
    const C = 251.2;
    let accumulated = 0;
    const slices = [
      { count: counts.done, color: '#4ade80', label: 'Done' },
      { count: counts.inreview, color: '#b88dff', label: 'Review' },
      { count: counts.inprogress, color: '#f0b429', label: 'Progress' },
      { count: counts.todo, color: '#6db8ff', label: 'To Do' },
      { count: counts.backlog, color: '#a1aab4', label: 'Backlog' }
    ];

    let circles = '';
    slices.forEach(s => {
      if (s.count === 0) return;
      const pct = s.count / total;
      const strokeLength = pct * C;
      const offset = C - accumulated;
      circles += `<circle cx="50" cy="50" r="40" fill="none" stroke="${s.color}" stroke-width="14" stroke-dasharray="${strokeLength} ${C}" stroke-dashoffset="${offset}" transform="rotate(-90 50 50)" />`;
      accumulated += strokeLength;
    });

    const donePct = total > 0 ? Math.round((counts.done / total) * 100) : 0;

    return `
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <!-- Subtle background ring -->
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" stroke-width="14" />
        ${circles}
        <text x="50" y="47" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text-primary)">${total}</text>
        <text x="50" y="61" text-anchor="middle" font-size="8" font-weight="500" fill="var(--text-muted)">${donePct}% done</text>
      </svg>
    `;
  },

  renderPriorityBar(label, count, total, color) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 2px; background: ${color}; flex-shrink: 0;"></span>
            ${label}
          </span>
          <span style="font-weight: 600; color: var(--text-muted);">${count} <span style="font-weight: 400; font-size: 11px;">(${pct}%)</span></span>
        </div>
        <div class="progress-bar-container" style="height: 7px;">
          <div class="progress-bar-fill" style="width: ${pct}%; background: ${color}; transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);"></div>
        </div>
      </div>
    `;
  },

  /**
   * Computes real weekly velocity from task completedAt timestamps
   */
  getWeeklyVelocityData() {
    const tasks = AppState.tasks;
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt);

    // Get the last 6 weeks
    const now = new Date();
    const weeks = [];
    for (let i = 5; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 86400000);

      const weekTasks = completedTasks.filter(t => {
        const d = new Date(t.completedAt);
        return d >= weekStart && d < weekEnd;
      });

      const taskCount = weekTasks.length;
      const points = weekTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 1), 0);

      let label;
      if (i === 0) label = 'This Week';
      else if (i === 1) label = 'Last Wk';
      else label = `W-${i}`;

      weeks.push({ label, taskCount, points, isCurrent: i === 0 });
    }

    return weeks;
  },

  renderVelocityBarsSVG() {
    const weeks = this.getWeeklyVelocityData();
    const hasData = weeks.some(w => w.points > 0);

    if (!hasData) {
      return '<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;"><i class="fa-solid fa-chart-column" style="margin-right: 8px; opacity: 0.4;"></i> Complete tasks to see velocity data here.</div>';
    }

    const maxPoints = Math.max(1, ...weeks.map(w => w.points));
    const width = 400;
    const height = 180;
    const barAreaTop = 20;
    const barAreaBottom = 155;
    const barAreaHeight = barAreaBottom - barAreaTop;
    const barCount = weeks.length;
    const barWidth = 38;
    const totalBarSpace = barCount * barWidth;
    const gap = (width - 40 - totalBarSpace) / (barCount + 1);

    // Horizontal grid lines
    const gridLines = [0.25, 0.5, 0.75, 1].map(pct => {
      const y = barAreaBottom - (pct * barAreaHeight);
      const val = Math.round(maxPoints * pct);
      return `
        <line x1="20" y1="${y}" x2="${width - 20}" y2="${y}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 3" />
        <text x="16" y="${y + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">${val}</text>
      `;
    }).join('');

    const bars = weeks.map((w, idx) => {
      const x = 20 + gap + idx * (barWidth + gap);
      const barH = w.points > 0 ? Math.max(4, (w.points / maxPoints) * barAreaHeight) : 0;
      const y = barAreaBottom - barH;
      const fillColor = w.isCurrent ? 'var(--accent-success)' : 'var(--accent-primary)';
      const opacity = w.isCurrent ? '1' : '0.8';

      return `
        <!-- Bar ${idx} -->
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="5" fill="${fillColor}" opacity="${opacity}">
          <animate attributeName="height" from="0" to="${barH}" dur="0.5s" fill="freeze" begin="${idx * 0.08}s" />
          <animate attributeName="y" from="${barAreaBottom}" to="${y}" dur="0.5s" fill="freeze" begin="${idx * 0.08}s" />
        </rect>
        ${w.points > 0 ? `
          <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="${w.isCurrent ? 'var(--accent-success)' : 'var(--text-primary)'}" font-weight="${w.isCurrent ? '700' : '600'}">${w.points}p</text>
        ` : ''}
        <text x="${x + barWidth / 2}" y="${barAreaBottom + 14}" text-anchor="middle" font-size="10" fill="${w.isCurrent ? 'var(--accent-success)' : 'var(--text-muted)'}" font-weight="${w.isCurrent ? '600' : '400'}">${w.label}</text>
        ${w.taskCount > 0 ? `
          <text x="${x + barWidth / 2}" y="${barAreaBottom + 26}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${w.taskCount} task${w.taskCount !== 1 ? 's' : ''}</text>
        ` : ''}
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
        <!-- Baseline -->
        <line x1="20" y1="${barAreaBottom}" x2="${width - 20}" y2="${barAreaBottom}" stroke="var(--border-default)" stroke-width="1" />
        ${gridLines}
        ${bars}
      </svg>
    `;
  },

  /**
   * Cycle Time Distribution - shows how long tasks take to complete (buckets)
   */
  renderCycleTimeChartSVG() {
    const tasks = AppState.tasks;
    const completedWithDates = tasks.filter(t => t.status === 'done' && t.completedAt && t.createdAt);

    if (completedWithDates.length === 0) {
      return '<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;"><i class="fa-solid fa-clock-rotate-left" style="margin-right: 8px; opacity: 0.4;"></i> Complete tasks to see cycle time distribution.</div>';
    }

    // Compute cycle times in hours
    const cycleTimes = completedWithDates.map(t => {
      const diff = (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
      return Math.max(0.5, diff);
    });

    // Bucket into ranges
    const buckets = [
      { label: '< 1h', min: 0, max: 1, count: 0, color: 'var(--accent-success)' },
      { label: '1-4h', min: 1, max: 4, count: 0, color: 'var(--accent-primary)' },
      { label: '4-24h', min: 4, max: 24, count: 0, color: 'var(--accent-cyan)' },
      { label: '1-3d', min: 24, max: 72, count: 0, color: 'var(--accent-warning)' },
      { label: '3-7d', min: 72, max: 168, count: 0, color: 'var(--accent-purple)' },
      { label: '7d+', min: 168, max: Infinity, count: 0, color: 'var(--accent-danger)' }
    ];

    cycleTimes.forEach(h => {
      const bucket = buckets.find(b => h >= b.min && h < b.max);
      if (bucket) bucket.count++;
    });

    const maxCount = Math.max(1, ...buckets.map(b => b.count));
    const width = 400;
    const height = 180;
    const barAreaTop = 16;
    const barAreaBottom = 148;
    const barAreaHeight = barAreaBottom - barAreaTop;
    const barWidth = 42;
    const totalBarSpace = buckets.length * barWidth;
    const gap = (width - 40 - totalBarSpace) / (buckets.length + 1);

    const bars = buckets.map((b, idx) => {
      const x = 20 + gap + idx * (barWidth + gap);
      const barH = b.count > 0 ? Math.max(4, (b.count / maxCount) * barAreaHeight) : 0;
      const y = barAreaBottom - barH;

      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="5" fill="${b.color}" opacity="0.85">
          <animate attributeName="height" from="0" to="${barH}" dur="0.4s" fill="freeze" begin="${idx * 0.06}s" />
          <animate attributeName="y" from="${barAreaBottom}" to="${y}" dur="0.4s" fill="freeze" begin="${idx * 0.06}s" />
        </rect>
        ${b.count > 0 ? `
          <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="11" fill="var(--text-primary)" font-weight="600">${b.count}</text>
        ` : ''}
        <text x="${x + barWidth / 2}" y="${barAreaBottom + 14}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${b.label}</text>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
        <line x1="20" y1="${barAreaBottom}" x2="${width - 20}" y2="${barAreaBottom}" stroke="var(--border-default)" stroke-width="1" />
        ${bars}
      </svg>
    `;
  },

  /**
   * Cumulative Completion Trend - line chart showing total tasks completed over time
   */
  renderCompletionTrendSVG() {
    const tasks = AppState.tasks;
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

    if (completedTasks.length < 2) {
      return '<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;"><i class="fa-solid fa-arrow-trend-up" style="margin-right: 8px; opacity: 0.4;"></i> Complete at least 2 tasks to see trend data.</div>';
    }

    const width = 400;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 32, left: 36 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Build cumulative data points by day
    const firstDate = new Date(completedTasks[0].completedAt);
    const lastDate = new Date(completedTasks[completedTasks.length - 1].completedAt);
    const totalMs = Math.max(86400000, lastDate.getTime() - firstDate.getTime());

    const points = [];
    let cumulative = 0;

    // Group by day
    const dayMap = {};
    completedTasks.forEach(t => {
      const dayKey = new Date(t.completedAt).toISOString().slice(0, 10);
      dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
    });

    const sortedDays = Object.keys(dayMap).sort();
    sortedDays.forEach(day => {
      cumulative += dayMap[day];
      const dayMs = new Date(day).getTime() - firstDate.getTime();
      const x = padding.left + (dayMs / totalMs) * plotW;
      const y = padding.top + plotH - (cumulative / completedTasks.length) * plotH;
      points.push({ x, y, count: cumulative, date: day });
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const lastPt = points[points.length - 1];
    const areaD = `${pathD} L ${lastPt.x} ${padding.top + plotH} L ${points[0].x} ${padding.top + plotH} Z`;

    // Date labels
    const firstLabel = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lastLabel = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
        <!-- Grid -->
        <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${width - padding.right}" y2="${padding.top + plotH}" stroke="var(--border-default)" stroke-width="1" />
        <line x1="${padding.left}" y1="${padding.top + plotH / 2}" x2="${width - padding.right}" y2="${padding.top + plotH / 2}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3 3" />

        <!-- Labels -->
        <text x="${padding.left - 8}" y="${padding.top + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${completedTasks.length}</text>
        <text x="${padding.left - 8}" y="${padding.top + plotH / 2 + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${Math.round(completedTasks.length / 2)}</text>
        <text x="${padding.left - 8}" y="${padding.top + plotH + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">0</text>

        <text x="${padding.left}" y="${height - 6}" fill="var(--text-muted)" font-size="10">${firstLabel}</text>
        <text x="${width - padding.right}" y="${height - 6}" fill="var(--text-muted)" font-size="10" text-anchor="end">${lastLabel}</text>

        <!-- Area -->
        <path d="${areaD}" fill="rgba(56, 139, 253, 0.08)" />

        <!-- Line -->
        <path d="${pathD}" fill="none" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- End dot -->
        <circle cx="${lastPt.x}" cy="${lastPt.y}" r="4.5" fill="var(--accent-primary)" stroke="var(--bg-surface)" stroke-width="2" />
        <text x="${lastPt.x}" y="${lastPt.y - 10}" fill="var(--accent-primary)" font-size="11" font-weight="700" text-anchor="middle">${lastPt.count}</text>
      </svg>
    `;
  }
};
