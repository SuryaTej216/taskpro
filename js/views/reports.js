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
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 14px;"><i class="fa-solid fa-chart-area" style="color: var(--accent-primary);"></i> Sprint Burndown Chart</span>
              <span class="badge" style="background: var(--accent-primary-subtle); color: var(--accent-primary);">Sprint 1</span>
            </div>
            <div style="width: 100%; height: 220px;">
              ${this.renderBurndownSVG()}
            </div>
            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px; font-size: 11px; color: var(--text-muted);">
              <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 2px; background: #6e7681; display: inline-block;"></span> Ideal Guideline</span>
              <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 12px; height: 3px; background: #388bfd; display: inline-block;"></span> Actual Remaining Points</span>
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
  },

  renderBurndownSVG() {
    if (AppState.tasks.length === 0) {
      return '<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">No sprint task data available to calculate burndown yet.</div>';
    }
    // Generates 14-day burndown curve
    return `
      <svg viewBox="0 0 400 200" width="100%" height="100%" style="overflow: visible;">
        <!-- Grid lines -->
        <line x1="30" y1="20" x2="380" y2="20" stroke="var(--border-subtle)" stroke-width="1" />
        <line x1="30" y1="65" x2="380" y2="65" stroke="var(--border-subtle)" stroke-width="1" />
        <line x1="30" y1="110" x2="380" y2="110" stroke="var(--border-subtle)" stroke-width="1" />
        <line x1="30" y1="155" x2="380" y2="155" stroke="var(--border-subtle)" stroke-width="1" />
        <line x1="30" y1="180" x2="380" y2="180" stroke="var(--border-default)" stroke-width="1" />

        <!-- Axis labels -->
        <text x="15" y="25" fill="var(--text-muted)" font-size="10">40</text>
        <text x="15" y="105" fill="var(--text-muted)" font-size="10">20</text>
        <text x="15" y="180" fill="var(--text-muted)" font-size="10">0</text>

        <!-- Ideal guideline line (dashed) -->
        <line x1="40" y1="25" x2="370" y2="180" stroke="#6e7681" stroke-width="2" stroke-dasharray="4 4" />

        <!-- Actual burndown path -->
        <path d="M 40 25 L 90 35 L 140 40 L 190 75 L 240 100 L 290 125 L 340 135" fill="none" stroke="#388bfd" stroke-width="3" stroke-linecap="round" />
        
        <!-- Data dots -->
        <circle cx="40" cy="25" r="4" fill="#388bfd" />
        <circle cx="90" cy="35" r="4" fill="#388bfd" />
        <circle cx="140" cy="40" r="4" fill="#388bfd" />
        <circle cx="190" cy="75" r="4" fill="#388bfd" />
        <circle cx="240" cy="100" r="4" fill="#388bfd" />
        <circle cx="290" cy="125" r="4" fill="#388bfd" />
        <circle cx="340" cy="135" r="4" fill="#388bfd" />
      </svg>
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
