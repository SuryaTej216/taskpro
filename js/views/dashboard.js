/**
 * TaskForge - Personal Command Center
 * 
 * Features:
 * - Executive Hero Banner with live health pulse, greeting, workspace scope switcher, and rapid action tools
 * - Dynamic Workspace Scoping: view all projects or deep dive into any project context
 * - 5-Metric Connected Executive KPI Grid: Delivery Velocity, Points Burnup, Watchdog Risks, Workload Capacity, Quality Health
 * - Interactive Workflow Pipeline Ribbon: 5 lifecycle stages with 1-click stage navigation
 * - Active Sprint Telemetry: Sprint goal, days countdown, story points burndown, and planning link
 * - AI Smart Work Queue ("Next Best Action"): Multi-factor priority dispatcher with inline Pomodoro focus launch
 * - Must-Win Daily Focus Checklist: Interactive circular check-off with WebAudio chime and celebratory feedback
 * - Work Taxonomy & Quality Radar: Stories, Bugs, Improvements, Tasks, and Epics distribution with 1-click filtering
 * - Portfolio Trajectory Matrix: Real-time progress rollup across initiatives
 * - Execution Risk Sentinel: Rapid resolution links for overdue items and blockers
 * - Personal Quick Scratchpad: Auto-saving local notes with copy and clear tools
 * - Real-Time Audit Activity Feed: Live event stream with relative timestamps
 * - 1-Click Daily Standup Generator: Markdown summary of completed work, active focus, and blockers
 */

const DashboardView = {
  /**
   * Main render function
   * @param {HTMLElement} container 
   */
  render(container) {
    if (!container) return;

    const allTasks = AppState.tasks;
    const projects = AppState.projects;
    const selectedProjectId = AppState.selectedProjectId;
    const currentProject = projects.find(p => p.id === selectedProjectId) || null;

    // Filter tasks based on selected workspace scope
    const scopedTasks = selectedProjectId
      ? allTasks.filter(t => t.projectId === selectedProjectId)
      : allTasks;

    // Active Sprint (scoped to project or global)
    const activeSprint = AppState.sprints.find(s => 
      s.status === 'active' && (!selectedProjectId || s.projectId === selectedProjectId || !s.projectId)
    );

    // 1. Core Metrics & Counts
    const total = scopedTasks.length;
    const open = scopedTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
    const inProgress = scopedTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;
    const completed = scopedTasks.filter(t => t.status === 'done').length;
    const overdueTasks = scopedTasks.filter(t => Utils.isOverdue(t.dueDate, t.status));
    const criticalTasks = scopedTasks.filter(t => (t.priority === 'critical' || t.priority === 'highest') && t.status !== 'done');
    const blockedTasks = scopedTasks.filter(t => t.status === 'blocked');
    const cancelledTasks = scopedTasks.filter(t => t.status === 'cancelled');
    const inReviewTasks = scopedTasks.filter(t => t.status === 'inreview');

    // 2. Story Points Burnup
    const totalPoints = scopedTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const donePoints = scopedTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const activePoints = scopedTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const pointsPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

    // 3. Completion Rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tasks completed in last 24h
    const nowTs = Date.now();
    const completedRecently = scopedTasks.filter(t => {
      if (t.status !== 'done') return false;
      const cDate = t.completedAt ? new Date(t.completedAt).getTime() : (t.updatedAt ? new Date(t.updatedAt).getTime() : 0);
      return (nowTs - cDate) < 24 * 3600 * 1000;
    }).length;

    // 4. Workload Estimation
    const activeTasksList = scopedTasks.filter(t => t.status !== 'done');
    const totalEstHours = Math.round(activeTasksList.reduce((acc, t) => acc + (t.estimate || 60), 0) / 60);
    let workloadLevel = 'Optimal';
    let workloadColor = '#0BDA51';
    let workloadFillPct = 40;

    if (totalEstHours < 8) {
      workloadLevel = 'Light';
      workloadColor = '#0BDA51';
      workloadFillPct = 25;
    } else if (totalEstHours > 28) {
      workloadLevel = 'Heavy Load';
      workloadColor = '#EF4444';
      workloadFillPct = 95;
    } else if (totalEstHours > 16) {
      workloadLevel = 'Elevated';
      workloadColor = '#E06C00';
      workloadFillPct = 75;
    } else {
      workloadLevel = 'Balanced';
      workloadColor = '#0BDA51';
      workloadFillPct = 50;
    }

    // 5. Taxonomy & Quality Breakdown
    const bugTasks = scopedTasks.filter(t => t.type === 'bug' && t.status !== 'done');
    const allBugs = scopedTasks.filter(t => t.type === 'bug');
    const storyTasks = scopedTasks.filter(t => t.type === 'story');
    const improvementTasks = scopedTasks.filter(t => t.type === 'improvement');
    const standardTasks = scopedTasks.filter(t => !t.type || t.type === 'task');
    const epicTasks = scopedTasks.filter(t => t.type === 'epic');

    const qualityIndex = allBugs.length === 0 
      ? 100 
      : Math.max(70, Math.round(100 - (bugTasks.length * 10)));

    // 6. Dynamic Greeting & Date
    const now = new Date();
    const hour = now.getHours();
    let greeting = 'Good morning';
    let greetingIcon = 'fa-sun';
    if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
      greetingIcon = 'fa-cloud-sun';
    } else if (hour >= 17) {
      greeting = 'Good evening';
      greetingIcon = 'fa-moon';
    }

    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormatted = now.toLocaleDateString(undefined, dateOptions);

    // 7. Activity Streak & Focus Score
    const streakDays = Math.min(21, Math.max(3, Math.floor(AppState.activity.length / 2) + 2));
    const focusScore = Math.min(99, Math.max(62, Math.round(68 + (completionRate * 0.22) + (streakDays * 0.7) - (overdueTasks.length * 4))));

    // 8. Lifecycle Stage Distribution
    const statusCounts = {
      backlog: scopedTasks.filter(t => t.status === 'backlog').length,
      todo: scopedTasks.filter(t => t.status === 'todo').length,
      inprogress: scopedTasks.filter(t => t.status === 'inprogress').length,
      inreview: scopedTasks.filter(t => t.status === 'inreview').length,
      blocked: blockedTasks.length,
      done: completed,
      cancelled: cancelledTasks.length
    };

    const stages = [
      { id: 'backlog', label: 'Backlog', icon: 'fa-inbox', color: '#64748B', count: statusCounts.backlog },
      { id: 'todo', label: 'To Do', icon: 'fa-circle-dot', color: '#1868DB', count: statusCounts.todo },
      { id: 'inprogress', label: 'In Progress', icon: 'fa-bolt-lightning', color: '#E06C00', count: statusCounts.inprogress },
      { id: 'inreview', label: 'In Review', icon: 'fa-eye', color: '#AF59E1', count: statusCounts.inreview },
      { id: 'blocked', label: 'Blocked', icon: 'fa-ban', color: '#EF4444', count: statusCounts.blocked },
      { id: 'done', label: 'Done', icon: 'fa-circle-check', color: '#0BDA51', count: statusCounts.done },
      { id: 'cancelled', label: 'Cancelled', icon: 'fa-circle-xmark', color: '#6B7280', count: statusCounts.cancelled }
    ];

    // 9. Active Sprint Telemetry Details
    let sprintTelemetry = null;
    if (activeSprint) {
      const sprintTasks = scopedTasks.filter(t => t.sprintId === activeSprint.id);
      const sprintDone = sprintTasks.filter(t => t.status === 'done');
      const sprintActive = sprintTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview');
      const sprintTodo = sprintTasks.filter(t => t.status === 'todo' || t.status === 'backlog');
      const sprintTotalPts = sprintTasks.reduce((acc, t) => acc + (Number(t.storyPoints) || 0), 0);
      const sprintBurnedPts = sprintDone.reduce((acc, t) => acc + (Number(t.storyPoints) || 0), 0);
      const sprintPct = sprintTasks.length > 0 ? Math.round((sprintDone.length / sprintTasks.length) * 100) : 0;
      
      let daysRemainingText = 'Active';
      if (activeSprint.endDate) {
        const diffDays = Math.ceil((new Date(activeSprint.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        daysRemainingText = diffDays > 0 ? `${diffDays} days left` : (diffDays === 0 ? 'Ends today' : `${Math.abs(diffDays)}d overdue`);
      }

      sprintTelemetry = {
        sprint: activeSprint,
        totalTasks: sprintTasks.length,
        doneCount: sprintDone.length,
        activeCount: sprintActive.length,
        todoCount: sprintTodo.length,
        totalPts: sprintTotalPts,
        burnedPts: sprintBurnedPts,
        pct: sprintPct,
        daysText: daysRemainingText
      };
    }

    // 10. AI Smart Dispatcher & Daily Focus
    const recommended = this.getSmartQueueRecommendation(scopedTasks);
    const dailyFocus = this.getDailyFocusTasks(scopedTasks);

    // 11. Saved Scratchpad Notes
    const savedNotes = localStorage.getItem('taskforge_personal_notes') || '';

    container.innerHTML = `
      <div class="view-page">
        <div class="dash-page">
          
          <!-- 1. Executive Hero & Context Banner -->
          <div class="dash-hero-banner">
            <div class="dash-hero-identity">
              <div class="dash-hero-avatar-wrap">
                <div class="dash-hero-avatar" title="Surya Tej">ST</div>
                <span class="dash-hero-avatar-pulse" title="System Connected & Active"></span>
              </div>
              <div class="dash-hero-text">
                <h1>
                  <span>Personal Command Center</span>
                  <span class="dash-hero-pulse-pill">
                    <i class="fa-solid ${greetingIcon}" style="color: #f59e0b; font-size: 10px;"></i>
                    <span>${greeting}, Surya Tej</span>
                  </span>
                </h1>
                <div class="dash-hero-subtitle">
                  <span>Executive operational telemetry, delivery velocity, and sprint execution cockpit.</span>
                  <span>•</span>
                  <span style="color: #0BDA51; font-weight: 600;"><i class="fa-solid fa-signal" style="font-size: 10px;"></i> LocalDB Online</span>
                </div>
              </div>
            </div>

            <div class="dash-hero-controls">
              <!-- Workspace Scope Switcher -->
              <div class="dash-scope-selector" title="Switch Command Center Workspace Scope">
                <i class="fa-solid fa-diagram-project" style="color: var(--accent-primary); font-size: 11px;"></i>
                <select id="dash-scope-select">
                  <option value="" ${!selectedProjectId ? 'selected' : ''}>All Workspaces (${allTasks.length} tasks)</option>
                  ${projects.map(p => {
                    const pCount = allTasks.filter(t => t.projectId === p.id).length;
                    return `<option value="${p.id}" ${selectedProjectId === p.id ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${pCount})</option>`;
                  }).join('')}
                </select>
              </div>

              <!-- Date Badge -->
              <span class="dash-date-badge">
                <i class="fa-regular fa-calendar" style="color: var(--accent-primary);"></i>
                <span>${dateFormatted}</span>
              </span>

              <!-- Action Toolbelt -->
              <button type="button" id="dash-btn-standup" class="btn btn-secondary btn-sm" title="Compile and copy Daily Standup to clipboard">
                <i class="fa-solid fa-clipboard-check"></i>
                <span>Copy Standup</span>
              </button>
              <button type="button" id="dash-btn-focus-mode" class="btn btn-secondary btn-sm" title="Launch Pomodoro Focus Cockpit">
                <i class="fa-solid fa-stopwatch"></i>
                <span>Focus Cockpit</span>
              </button>
              <button type="button" id="dash-btn-create" class="btn btn-primary btn-sm" title="Create New Task (C)">
                <i class="fa-solid fa-plus"></i>
                <span>New Task</span>
                <kbd class="board-kbd-hint">C</kbd>
              </button>
            </div>
          </div>

          <!-- 2. Five-Metric Connected Executive KPI Grid -->
          <div class="dash-kpi-grid">
            
            <!-- KPI 1: Delivery Velocity -->
            <div class="dash-kpi-card" id="dash-kpi-delivery" title="View completed tasks in Tasks view">
              <div class="dash-kpi-top">
                <span class="dash-kpi-label">Sprint Delivery</span>
                <div class="dash-kpi-icon-wrap" style="background: rgba(11, 218, 81, 0.12); color: #0BDA51;">
                  <i class="fa-solid fa-circle-check"></i>
                </div>
              </div>
              <div class="dash-kpi-main">
                <div class="dash-kpi-value" style="color: #0BDA51;">${completionRate}%</div>
                <span class="dash-kpi-pill" style="background: rgba(11, 218, 81, 0.12); color: #0BDA51;">
                  ${completed} of ${total} done
                </span>
              </div>
              <div class="dash-kpi-meta">
                <span>${completedRecently > 0 ? `+${completedRecently} completed today` : 'Steady velocity'}</span>
                <span class="dash-kpi-subtext">${open} remaining</span>
              </div>
              <div class="dash-kpi-track">
                <div class="dash-kpi-track-fill" style="width: ${completionRate}%; background: #0BDA51;"></div>
              </div>
            </div>

            <!-- KPI 2: Story Points Burnup -->
            <div class="dash-kpi-card" id="dash-kpi-points" title="View story points burnup in Sprint Planning">
              <div class="dash-kpi-top">
                <span class="dash-kpi-label">Points Burnup</span>
                <div class="dash-kpi-icon-wrap" style="background: rgba(175, 89, 225, 0.12); color: #AF59E1;">
                  <i class="fa-solid fa-diamond"></i>
                </div>
              </div>
              <div class="dash-kpi-main">
                <div class="dash-kpi-value" style="color: #AF59E1;">${donePoints}</div>
                <span class="dash-kpi-pill" style="background: rgba(175, 89, 225, 0.12); color: #AF59E1;">
                  of ${totalPoints} pts (${pointsPct}%)
                </span>
              </div>
              <div class="dash-kpi-meta">
                <span>${activePoints} pts in flight</span>
                <span class="dash-kpi-subtext">${totalPoints - donePoints} pts left</span>
              </div>
              <div class="dash-kpi-track">
                <div class="dash-kpi-track-fill" style="width: ${pointsPct}%; background: #AF59E1;"></div>
              </div>
            </div>

            <!-- KPI 3: Execution Risk Sentinel -->
            <div class="dash-kpi-card" id="dash-kpi-watchdog" title="Inspect overdue, blocked & critical items">
              <div class="dash-kpi-top">
                <span class="dash-kpi-label">Risk Sentinel</span>
                <div class="dash-kpi-icon-wrap" style="background: ${blockedTasks.length > 0 || overdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.14)' : (criticalTasks.length > 0 ? 'rgba(224, 108, 0, 0.14)' : 'rgba(11, 218, 81, 0.12)')}; color: ${blockedTasks.length > 0 || overdueTasks.length > 0 ? '#EF4444' : (criticalTasks.length > 0 ? '#E06C00' : '#0BDA51')};">
                  <i class="fa-solid ${blockedTasks.length > 0 ? 'fa-ban' : (overdueTasks.length > 0 ? 'fa-triangle-exclamation' : (criticalTasks.length > 0 ? 'fa-circle-exclamation' : 'fa-shield-halved'))}"></i>
                </div>
              </div>
              <div class="dash-kpi-main">
                <div class="dash-kpi-value" style="color: ${blockedTasks.length > 0 || overdueTasks.length > 0 ? '#EF4444' : (criticalTasks.length > 0 ? '#E06C00' : 'var(--text-primary)')};">
                  ${overdueTasks.length + criticalTasks.length + blockedTasks.length}
                </div>
                <span class="dash-kpi-pill" style="background: ${blockedTasks.length > 0 || overdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.12)' : (criticalTasks.length > 0 ? 'rgba(224, 108, 0, 0.12)' : 'rgba(11, 218, 81, 0.12)')}; color: ${blockedTasks.length > 0 || overdueTasks.length > 0 ? '#EF4444' : (criticalTasks.length > 0 ? '#E06C00' : '#0BDA51')};">
                  ${blockedTasks.length > 0 ? `${blockedTasks.length} blocked` : (overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : (criticalTasks.length > 0 ? `${criticalTasks.length} critical` : 'All on track'))}
                </span>
              </div>
              <div class="dash-kpi-meta">
                <span>${blockedTasks.length > 0 ? 'Active blockers present' : (overdueTasks.length > 0 ? 'Requires attention' : (criticalTasks.length > 0 ? 'High priority items' : 'Zero blockers'))}</span>
                <span class="dash-kpi-subtext">${inReviewTasks.length} in review</span>
              </div>
              <div class="dash-kpi-track">
                <div class="dash-kpi-track-fill" style="width: ${blockedTasks.length > 0 || overdueTasks.length > 0 ? 100 : (criticalTasks.length > 0 ? 60 : 0)}%; background: ${blockedTasks.length > 0 || overdueTasks.length > 0 ? '#EF4444' : '#E06C00'};"></div>
              </div>
            </div>

            <!-- KPI 4: Workload & Capacity -->
            <div class="dash-kpi-card" id="dash-kpi-workload" title="View focus cockpit and workload load">
              <div class="dash-kpi-top">
                <span class="dash-kpi-label">Workload & Focus</span>
                <div class="dash-kpi-icon-wrap" style="background: rgba(87, 157, 255, 0.12); color: ${workloadColor};">
                  <i class="fa-solid fa-gauge-high"></i>
                </div>
              </div>
              <div class="dash-kpi-main">
                <div class="dash-kpi-value" style="color: ${workloadColor}; font-size: 22px;">${workloadLevel}</div>
                <span class="dash-kpi-pill" style="background: rgba(87, 157, 255, 0.12); color: var(--accent-primary);">
                  ~${totalEstHours}h active load
                </span>
              </div>
              <div class="dash-kpi-meta">
                <span>Focus Score: <strong>${focusScore}/100</strong></span>
                <span class="dash-kpi-subtext">${streakDays}d streak 🔥</span>
              </div>
              <div class="dash-kpi-track">
                <div class="dash-kpi-track-fill" style="width: ${workloadFillPct}%; background: ${workloadColor};"></div>
              </div>
            </div>

            <!-- KPI 5: Quality & Work Types -->
            <div class="dash-kpi-card" id="dash-kpi-quality" title="View bug tracker and quality index">
              <div class="dash-kpi-top">
                <span class="dash-kpi-label">Quality Telemetry</span>
                <div class="dash-kpi-icon-wrap" style="background: ${bugTasks.length > 0 ? 'rgba(226, 72, 61, 0.12)' : 'rgba(11, 218, 81, 0.12)'}; color: ${bugTasks.length > 0 ? '#E2483D' : '#0BDA51'};">
                  <i class="fa-solid ${bugTasks.length > 0 ? 'fa-bug' : 'fa-award'}"></i>
                </div>
              </div>
              <div class="dash-kpi-main">
                <div class="dash-kpi-value" style="color: ${bugTasks.length > 0 ? '#E2483D' : '#0BDA51'};">${qualityIndex}%</div>
                <span class="dash-kpi-pill" style="background: ${bugTasks.length > 0 ? 'rgba(226, 72, 61, 0.12)' : 'rgba(11, 218, 81, 0.12)'}; color: ${bugTasks.length > 0 ? '#E2483D' : '#0BDA51'};">
                  ${bugTasks.length} open bugs
                </span>
              </div>
              <div class="dash-kpi-meta">
                <span>${improvementTasks.length} improvements</span>
                <span class="dash-kpi-subtext">${storyTasks.length} user stories</span>
              </div>
              <div class="dash-kpi-track">
                <div class="dash-kpi-track-fill" style="width: ${qualityIndex}%; background: ${bugTasks.length > 0 ? '#E2483D' : '#0BDA51'};"></div>
              </div>
            </div>

          </div>

          <!-- 3. Full-Width Workflow Pipeline & Stage Ribbon -->
          <div class="dash-pipeline-card">
            <div class="dash-pipeline-head">
              <div class="dash-pipeline-title-group">
                <i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i>
                <span>Lifecycle Pipeline Distribution</span>
              </div>
              <div class="dash-pipeline-stats">
                <span><i class="fa-solid fa-database" style="color: #64748B;"></i> <strong>${total}</strong> Total</span>
                <span>•</span>
                <span><i class="fa-solid fa-bolt" style="color: #E06C00;"></i> <strong>${inProgress}</strong> Active</span>
                <span>•</span>
                <span><i class="fa-solid fa-circle-check" style="color: #0BDA51;"></i> <strong>${completed}</strong> Done (${completionRate}%)</span>
              </div>
            </div>

            <!-- Proportional Stage Bar -->
            <div class="dash-pipeline-bar" title="Interactive Workflow Stage Distribution">
              ${total > 0 ? `
                <div class="dash-pipeline-seg" style="width: ${(statusCounts.backlog / total) * 100}%; background: #64748B;" title="Backlog: ${statusCounts.backlog}"></div>
                <div class="dash-pipeline-seg" style="width: ${(statusCounts.todo / total) * 100}%; background: #1868DB;" title="To Do: ${statusCounts.todo}"></div>
                <div class="dash-pipeline-seg" style="width: ${(statusCounts.inprogress / total) * 100}%; background: #E06C00;" title="In Progress: ${statusCounts.inprogress}"></div>
                <div class="dash-pipeline-seg" style="width: ${(statusCounts.inreview / total) * 100}%; background: #AF59E1;" title="In Review: ${statusCounts.inreview}"></div>
                <div class="dash-pipeline-seg" style="width: ${(statusCounts.blocked / total) * 100}%; background: #EF4444;" title="Blocked: ${statusCounts.blocked}"></div>
                <div class="dash-pipeline-seg" style="width: ${(statusCounts.done / total) * 100}%; background: #0BDA51;" title="Done: ${statusCounts.done}"></div>
                <div class="dash-pipeline-seg" style="width: ${(statusCounts.cancelled / total) * 100}%; background: #6B7280;" title="Cancelled: ${statusCounts.cancelled}"></div>
              ` : `
                <div class="dash-pipeline-seg" style="width: 100%; background: var(--surface-sunken);"></div>
              `}
            </div>

            <!-- Clickable Stage Chips -->
            <div class="dash-pipeline-stages">
              ${stages.map(stage => `
                <div class="dash-pipeline-chip" data-stage="${stage.id}" title="Filter Tasks by ${stage.label}">
                  <div class="dash-pipeline-chip-left">
                    <i class="fa-solid ${stage.icon}" style="color: ${stage.color}; font-size: 11px;"></i>
                    <span>${stage.label}</span>
                  </div>
                  <span class="dash-pipeline-chip-count" style="color: ${stage.color};">${stage.count}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 4. Two-Column Strategic Execution Cockpit (60% / 40%) -->
          <div class="dash-cockpit-layout">
            
            <!-- LEFT COLUMN: Strategic Execution Engine -->
            <div class="dash-column">
              
              <!-- 4A: Active Sprint Telemetry Card (if active sprint exists) -->
              ${sprintTelemetry ? `
                <div class="dash-sprint-card">
                  <div class="dash-sprint-top">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="dash-sprint-badge">
                        <i class="fa-solid fa-bolt-lightning"></i> ACTIVE SPRINT
                      </span>
                      <span class="dash-sprint-name">${Utils.escapeHTML(sprintTelemetry.sprint.name)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span class="dash-sprint-timer">
                        <i class="fa-regular fa-clock" style="color: #1868DB;"></i>
                        <span>${sprintTelemetry.daysText}</span>
                      </span>
                      <a href="#/backlog" class="btn btn-ghost btn-sm" style="padding: 2px 8px; font-size: 11.5px;">
                        <span>Sprint Planning</span>
                        <i class="fa-solid fa-arrow-right" style="font-size: 10px;"></i>
                      </a>
                    </div>
                  </div>

                  ${sprintTelemetry.sprint.goal ? `
                    <div class="dash-sprint-goal">
                      <i class="fa-solid fa-bullseye" style="color: #1868DB; margin-right: 4px;"></i>
                      <span><strong>Sprint Goal:</strong> ${Utils.escapeHTML(sprintTelemetry.sprint.goal)}</span>
                    </div>
                  ` : ''}

                  <!-- Sprint Metrics Strip -->
                  <div class="dash-sprint-metrics">
                    <div>
                      <div class="dash-sprint-metric-num" style="color: #0BDA51;">${sprintTelemetry.doneCount} / ${sprintTelemetry.totalTasks}</div>
                      <div class="dash-sprint-metric-lbl">Tasks Done (${sprintTelemetry.pct}%)</div>
                    </div>
                    <div>
                      <div class="dash-sprint-metric-num" style="color: #AF59E1;">${sprintTelemetry.burnedPts} / ${sprintTelemetry.totalPts}</div>
                      <div class="dash-sprint-metric-lbl">Story Points Burned</div>
                    </div>
                    <div>
                      <div class="dash-sprint-metric-num" style="color: #E06C00;">${sprintTelemetry.activeCount}</div>
                      <div class="dash-sprint-metric-lbl">In Flight Workflows</div>
                    </div>
                  </div>

                  <div class="dash-kpi-track" style="height: 5px;">
                    <div class="dash-kpi-track-fill" style="width: ${sprintTelemetry.pct}%; background: #1868DB;"></div>
                  </div>
                </div>
              ` : `
                <div class="dash-sprint-card" style="border-left-color: #64748B;">
                  <div class="dash-sprint-top">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="dash-sprint-badge" style="background: rgba(100, 116, 139, 0.12); color: #64748B;">
                        <i class="fa-solid fa-calendar-xmark"></i> SPRINT CADENCE
                      </span>
                      <span class="dash-sprint-name">No Active Sprint Running</span>
                    </div>
                    <a href="#/backlog" class="btn btn-secondary btn-sm" style="font-size: 11.5px;">
                      <i class="fa-solid fa-play"></i> Start or Plan Sprint
                    </a>
                  </div>
                  <div class="dash-sprint-goal">
                    Plan your next iteration, assign user stories, and estimate story points in the Sprint Planning backlog.
                  </div>
                </div>
              `}

              <!-- 4B: AI Smart Work Queue ("Next Best Action") -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(175, 89, 225, 0.12); color: #AF59E1;">
                      <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Smart Work Queue</h2>
                      <span class="dash-panel-subtitle">Intelligent priority engine based on deadline urgency, priority score, and momentum</span>
                    </div>
                  </div>
                  <span class="badge" style="background: rgba(175, 89, 225, 0.15); color: #AF59E1; font-weight: 700; font-size: 11px;">
                    AI Dispatcher
                  </span>
                </div>

                ${recommended ? `
                  <div class="dash-spotlight-card">
                    <div class="dash-spotlight-top">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge-key" style="font-size: 11px; padding: 2px 7px;">${recommended.task.key}</span>
                        ${typeof ListView !== 'undefined' ? ListView.getTypeBadgeHTML(recommended.task.type) : ''}
                        <span class="badge-priority priority-${recommended.task.priority}" style="font-size: 11px;">${recommended.task.priority.toUpperCase()}</span>
                      </div>
                      ${recommended.project ? `
                        <div style="display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-secondary);">
                          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${recommended.project.color || '#579DFF'};"></span>
                          <span>${Utils.escapeHTML(recommended.project.name)}</span>
                        </div>
                      ` : ''}
                    </div>

                    <div class="dash-spotlight-title" onclick="TaskModal.openDetail('${recommended.task.id}')">
                      ${Utils.escapeHTML(recommended.task.title)}
                    </div>

                    ${recommended.task.description ? `
                      <div class="dash-spotlight-desc">
                        ${Utils.escapeHTML(recommended.task.description)}
                      </div>
                    ` : ''}

                    <div class="dash-spotlight-rationale">
                      <i class="fa-solid fa-lightbulb" style="color: #f59e0b;"></i>
                      <span><strong>Why this task?</strong> ${Utils.escapeHTML(recommended.reason)}</span>
                    </div>

                    <div class="dash-spotlight-actions">
                      <button type="button" class="btn btn-primary btn-sm dash-btn-start-focus" data-task-id="${recommended.task.id}">
                        <i class="fa-solid fa-play"></i>
                        <span>Start Focus Block</span>
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm dash-btn-mark-done" data-task-id="${recommended.task.id}">
                        <i class="fa-regular fa-circle-check" style="color: #0BDA51;"></i>
                        <span>Mark as Done</span>
                      </button>
                      <button type="button" class="btn btn-ghost btn-sm" onclick="TaskModal.openDetail('${recommended.task.id}')">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        <span>Details</span>
                      </button>
                    </div>
                  </div>
                ` : `
                  <div class="empty-state" style="padding: 24px 16px;">
                    <i class="fa-solid fa-check-double empty-state-icon" style="color: #0BDA51;"></i>
                    <div class="empty-state-title">Inbox Zero Achieved!</div>
                    <div class="empty-state-desc">You have no active pending tasks in this workspace scope. Create a new task or take a well-deserved break!</div>
                  </div>
                `}
              </div>

              <!-- 4C: Today's Must-Win Daily Focus Checklist -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(239, 68, 68, 0.12); color: #EF4444;">
                      <i class="fa-solid fa-crosshairs"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Must-Win Daily Focus</h2>
                      <span class="dash-panel-subtitle">Immediate high-impact agenda — check off directly to complete</span>
                    </div>
                  </div>
                  <span class="badge" style="background: rgba(239, 68, 68, 0.12); color: #EF4444; font-weight: 700; font-size: 11px;">
                    ${dailyFocus.filter(t => t.status === 'done').length} of ${dailyFocus.length} Completed
                  </span>
                </div>

                <div class="dash-focus-table">
                  ${dailyFocus.length === 0 ? `
                    <div class="empty-state" style="padding: 24px 16px;">
                      <i class="fa-solid fa-calendar-check empty-state-icon"></i>
                      <div class="empty-state-title">No immediate priorities</div>
                      <div class="empty-state-desc">Add tasks with High or Critical priority to populate your daily focus agenda.</div>
                    </div>
                  ` : dailyFocus.map((t, idx) => {
                    const isDone = t.status === 'done';
                    const proj = projects.find(p => p.id === t.projectId);
                    return `
                      <div class="dash-focus-row ${isDone ? 'is-done' : ''}" data-task-id="${t.id}">
                        <button type="button" class="dash-focus-checkbox" data-task-id="${t.id}" title="${isDone ? 'Mark Incomplete' : 'Mark Complete'}">
                          <i class="fa-solid fa-check"></i>
                        </button>
                        <div class="dash-focus-order">${idx + 1}</div>
                        <div class="dash-focus-main">
                          <div class="dash-focus-text" onclick="TaskModal.openDetail('${t.id}')">
                            ${Utils.escapeHTML(t.title)}
                          </div>
                          <div class="dash-focus-tags">
                            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-primary);">${t.key}</span>
                            ${typeof ListView !== 'undefined' ? ListView.getTypeBadgeHTML(t.type) : ''}
                            <span class="badge-priority priority-${t.priority}" style="font-size: 10px; padding: 1px 6px;">${t.priority.toUpperCase()}</span>
                            ${proj ? `
                              <span>•</span>
                              <span style="display: flex; align-items: center; gap: 4px;">
                                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${proj.color || '#579DFF'};"></span>
                                <span>${Utils.escapeHTML(proj.name)}</span>
                              </span>
                            ` : ''}
                            ${t.dueDate ? `
                              <span>•</span>
                              <span style="${Utils.isOverdue(t.dueDate, t.status) ? 'color: #EF4444; font-weight: 600;' : ''}">
                                <i class="fa-regular fa-clock" style="font-size: 10px;"></i> ${Utils.formatRelativeDate(t.dueDate)}
                              </span>
                            ` : ''}
                            ${t.storyPoints ? `<span>• <strong>${t.storyPoints}</strong> pts</span>` : ''}
                          </div>
                        </div>
                        <button type="button" class="btn btn-ghost btn-sm btn-icon" onclick="TaskModal.openDetail('${t.id}')" title="Task Details">
                          <i class="fa-solid fa-chevron-right" style="font-size: 11px;"></i>
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 4D: Work Taxonomy & Issue Types Breakdown -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(56, 139, 253, 0.12); color: #388BFD;">
                      <i class="fa-solid fa-shapes"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Work Taxonomy & Issue Types</h2>
                      <span class="dash-panel-subtitle">Interactive breakdown across work types — click to filter</span>
                    </div>
                  </div>
                  <a href="#/tasks" class="btn btn-ghost btn-sm">All Tasks</a>
                </div>

                <div class="dash-taxonomy-grid">
                  <div class="dash-taxonomy-card" data-type="story" title="Filter User Stories">
                    <div class="dash-taxonomy-info">
                      <i class="fa-solid fa-bookmark" style="color: #0BDA51;"></i>
                      <span>Stories</span>
                    </div>
                    <span class="dash-taxonomy-count" style="color: #0BDA51;">${storyTasks.length}</span>
                  </div>

                  <div class="dash-taxonomy-card" data-type="bug" title="Filter Bugs">
                    <div class="dash-taxonomy-info">
                      <i class="fa-solid fa-bug" style="color: #E2483D;"></i>
                      <span>Bugs</span>
                    </div>
                    <span class="dash-taxonomy-count" style="color: #E2483D;">${allBugs.length}</span>
                  </div>

                  <div class="dash-taxonomy-card" data-type="improvement" title="Filter Improvements">
                    <div class="dash-taxonomy-info">
                      <i class="fa-solid fa-arrow-up-right-dots" style="color: #AF59E1;"></i>
                      <span>Improvements</span>
                    </div>
                    <span class="dash-taxonomy-count" style="color: #AF59E1;">${improvementTasks.length}</span>
                  </div>

                  <div class="dash-taxonomy-card" data-type="task" title="Filter Standard Tasks">
                    <div class="dash-taxonomy-info">
                      <i class="fa-solid fa-circle-check" style="color: #1868DB;"></i>
                      <span>Tasks</span>
                    </div>
                    <span class="dash-taxonomy-count" style="color: #1868DB;">${standardTasks.length}</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- RIGHT COLUMN: Portfolio & Operational Utilities -->
            <div class="dash-column">
              
              <!-- 4E: Execution Watchdog / Sentinel Detail -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(239, 68, 68, 0.12); color: #EF4444;">
                      <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Sentinel Risk Watchdog</h2>
                      <span class="dash-panel-subtitle">Immediate attention items and deliverable blockers</span>
                    </div>
                  </div>
                  <span class="badge" style="background: ${overdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(11, 218, 81, 0.12)'}; color: ${overdueTasks.length > 0 ? '#EF4444' : '#0BDA51'}; font-weight: 700; font-size: 11px;">
                    ${overdueTasks.length > 0 ? `${overdueTasks.length} Attention Needed` : 'All On Track'}
                  </span>
                </div>

                <div class="dash-sentinel-list">
                  <div class="dash-sentinel-item" data-filter="overdue" title="Click to view overdue tasks">
                    <div class="dash-sentinel-item-left">
                      <i class="fa-solid fa-clock-rotate-left" style="color: #EF4444;"></i>
                      <span>Overdue Deliverables</span>
                    </div>
                    <span class="badge" style="background: ${overdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-sunken)'}; color: ${overdueTasks.length > 0 ? '#EF4444' : 'var(--text-muted)'}; font-weight: 700;">
                      ${overdueTasks.length}
                    </span>
                  </div>

                  <div class="dash-sentinel-item" data-filter="critical" title="Click to view critical priority items">
                    <div class="dash-sentinel-item-left">
                      <i class="fa-solid fa-angles-up" style="color: #E06C00;"></i>
                      <span>Critical & Blocker Items</span>
                    </div>
                    <span class="badge" style="background: ${criticalTasks.length > 0 ? 'rgba(224, 108, 0, 0.15)' : 'var(--surface-sunken)'}; color: ${criticalTasks.length > 0 ? '#E06C00' : 'var(--text-muted)'}; font-weight: 700;">
                      ${criticalTasks.length}
                    </span>
                  </div>

                  <div class="dash-sentinel-item" data-filter="blocked" title="Click to view blocked tasks">
                    <div class="dash-sentinel-item-left">
                      <i class="fa-solid fa-ban" style="color: #EF4444;"></i>
                      <span>Blocked Workflows</span>
                    </div>
                    <span class="badge" style="background: ${blockedTasks.length > 0 ? 'rgba(239, 68, 68, 0.18)' : 'var(--surface-sunken)'}; color: ${blockedTasks.length > 0 ? '#EF4444' : 'var(--text-muted)'}; font-weight: 700;">
                      ${blockedTasks.length}
                    </span>
                  </div>

                  <div class="dash-sentinel-item" data-filter="inreview" title="Click to view items awaiting sign-off">
                    <div class="dash-sentinel-item-left">
                      <i class="fa-solid fa-eye" style="color: #AF59E1;"></i>
                      <span>In Review (Ready for Approval)</span>
                    </div>
                    <span class="badge" style="background: ${inReviewTasks.length > 0 ? 'rgba(175, 89, 225, 0.15)' : 'var(--surface-sunken)'}; color: ${inReviewTasks.length > 0 ? '#AF59E1' : 'var(--text-muted)'}; font-weight: 700;">
                      ${inReviewTasks.length}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 4F: Active Projects Portfolio Matrix -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(56, 139, 253, 0.12); color: #388BFD;">
                      <i class="fa-solid fa-folder-tree"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Portfolio Trajectory</h2>
                      <span class="dash-panel-subtitle">Initiatives status and completion rollups</span>
                    </div>
                  </div>
                  <a href="#/projects" class="btn btn-ghost btn-sm">Projects</a>
                </div>

                <div class="dash-project-track">
                  ${projects.length === 0 ? `
                    <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">
                      No active projects found.
                    </div>
                  ` : projects.map(p => {
                    const pTasks = allTasks.filter(t => t.projectId === p.id);
                    const pDone = pTasks.filter(t => t.status === 'done').length;
                    const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
                    return `
                      <div class="dash-project-row" data-project-id="${p.id}" style="cursor: pointer;" title="Scope command center to ${Utils.escapeHTML(p.name)}">
                        <div class="dash-project-title-bar">
                          <span style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary);">
                            <span class="dash-project-dot" style="background: ${p.color || '#579DFF'};"></span>
                            <span>${Utils.escapeHTML(p.name)}</span>
                          </span>
                          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">
                            ${pPct}% (${pDone}/${pTasks.length})
                          </span>
                        </div>
                        <div class="dash-project-progress-bar">
                          <div class="dash-project-progress-fill" style="width: ${pPct}%; background: ${p.color || '#579DFF'};"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 4G: Personal Quick Scratchpad -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b;">
                      <i class="fa-solid fa-note-sticky"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Personal Scratchpad</h2>
                      <span class="dash-panel-subtitle">Instant memo pad & meeting thoughts</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px;">
                    <button type="button" id="dash-btn-copy-notes" class="btn btn-ghost btn-sm btn-icon" title="Copy notes to clipboard">
                      <i class="fa-regular fa-copy"></i>
                    </button>
                    <button type="button" id="dash-btn-clear-notes" class="btn btn-ghost btn-sm btn-icon" title="Clear notes">
                      <i class="fa-regular fa-trash-can"></i>
                    </button>
                  </div>
                </div>

                <textarea id="dash-scratchpad-input" class="dash-memo-textarea" placeholder="Jot down quick thoughts, meeting notes, blockers, scratchpad items...">${Utils.escapeHTML(savedNotes)}</textarea>
                
                <div class="dash-memo-footer">
                  <span id="dash-scratchpad-char-count">${savedNotes.length} characters</span>
                  <span><i class="fa-solid fa-floppy-disk"></i> Auto-saved locally</span>
                </div>
              </div>

              <!-- 4H: Real-Time Audit Activity Feed -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(14, 165, 233, 0.12); color: #0EA5E9;">
                      <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Audit Activity Feed</h2>
                      <span class="dash-panel-subtitle">Real-time log of team & workspace updates</span>
                    </div>
                  </div>
                </div>

                <div class="dash-feed-stream">
                  ${AppState.activity.length === 0 ? `
                    <div style="padding: 20px 10px; text-align: center; color: var(--text-muted); font-size: 12px;">
                      No activity history logged yet. Actions and updates will stream here.
                    </div>
                  ` : AppState.activity.slice(0, 8).map(a => `
                    <div class="dash-feed-item">
                      <div class="dash-feed-icon-wrap">
                        <i class="fa-solid fa-bolt"></i>
                      </div>
                      <div class="dash-feed-content">
                        <div class="dash-feed-text">${Utils.escapeHTML(a.details)}</div>
                        <div class="dash-feed-time">${Utils.formatRelativeDate(a.timestamp)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    `;

    // 5. Attach event listeners
    this.attachEventListeners(container);
  },

  /**
   * Binds interactive buttons, scratchpad auto-save, scope switching, and click-to-filter triggers
   */
  attachEventListeners(container) {
    if (!container) return;

    // 1. Workspace Scope Switcher Dropdown
    const scopeSelect = container.querySelector('#dash-scope-select');
    if (scopeSelect) {
      scopeSelect.addEventListener('change', (e) => {
        const newProjId = e.target.value || null;
        AppState.selectedProjectId = newProjId;
        if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
          Router.updateTopbarProjectPicker();
        }
        Toast.info(newProjId ? 'Scoped Command Center to selected project' : 'Command Center reset to All Workspaces');
        this.render(container);
      });
    }

    // 2. Quick Task Create Button
    const createBtn = container.querySelector('#dash-btn-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => TaskModal.openCreate());
    }

    // 3. Focus Cockpit Button
    const focusBtn = container.querySelector('#dash-btn-focus-mode');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        Router.navigate('focus');
      });
    }

    // 4. Copy Standup Button
    const standupBtn = container.querySelector('#dash-btn-standup');
    if (standupBtn) {
      standupBtn.addEventListener('click', () => this.generateAndCopyStandup());
    }

    // 5. KPI Cards Click-Through Navigation
    const kpiDelivery = container.querySelector('#dash-kpi-delivery');
    if (kpiDelivery) {
      kpiDelivery.addEventListener('click', () => this.navigateToStage('done'));
    }

    const kpiPoints = container.querySelector('#dash-kpi-points');
    if (kpiPoints) {
      kpiPoints.addEventListener('click', () => Router.navigate('backlog'));
    }

    const kpiWatchdog = container.querySelector('#dash-kpi-watchdog');
    if (kpiWatchdog) {
      kpiWatchdog.addEventListener('click', () => this.navigateToFilter('overdue'));
    }

    const kpiWorkload = container.querySelector('#dash-kpi-workload');
    if (kpiWorkload) {
      kpiWorkload.addEventListener('click', () => Router.navigate('focus'));
    }

    const kpiQuality = container.querySelector('#dash-kpi-quality');
    if (kpiQuality) {
      kpiQuality.addEventListener('click', () => this.navigateToFilter('bugs'));
    }

    // 6. Lifecycle Pipeline Stage Chips Click
    container.querySelectorAll('.dash-pipeline-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const stage = chip.dataset.stage;
        if (stage) this.navigateToStage(stage);
      });
    });

    // 7. Work Taxonomy Cards Click
    container.querySelectorAll('.dash-taxonomy-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        if (type) this.navigateToType(type);
      });
    });

    // 8. Sentinel Items Click
    container.querySelectorAll('.dash-sentinel-item').forEach(item => {
      item.addEventListener('click', () => {
        const filter = item.dataset.filter;
        if (filter === 'overdue') this.navigateToFilter('overdue');
        else if (filter === 'critical') this.navigateToFilter('critical');
        else if (filter === 'inreview') this.navigateToStage('inreview');
      });
    });

    // 9. Portfolio Matrix Project Rows Click
    container.querySelectorAll('.dash-project-row').forEach(row => {
      row.addEventListener('click', () => {
        const projId = row.dataset.projectId;
        if (projId) {
          AppState.selectedProjectId = projId;
          if (window.Router && typeof Router.updateTopbarProjectPicker === 'function') {
            Router.updateTopbarProjectPicker();
          }
          this.render(container);
          Toast.info('Switched workspace view');
        }
      });
    });

    // 10. Start Focus on Recommended Task
    container.querySelectorAll('.dash-btn-start-focus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        if (taskId) {
          Router.navigate('focus', { task: taskId });
        }
      });
    });

    // 11. Mark Done on Recommended Task
    container.querySelectorAll('.dash-btn-mark-done').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        if (taskId) {
          AppState.updateTask(taskId, { status: 'done' });
          if (typeof Utils.playSound === 'function') Utils.playSound('success');
          Toast.success('Task marked as Done! Great progress. 🚀');
          this.render(container);
        }
      });
    });

    // 12. Check-off buttons on Daily Focus List
    container.querySelectorAll('.dash-focus-checkbox').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
          const nextStatus = task.status === 'done' ? 'todo' : 'done';
          AppState.updateTask(taskId, { status: nextStatus });
          if (nextStatus === 'done') {
            if (typeof Utils.playSound === 'function') Utils.playSound('success');
            Toast.success(`Completed ${task.key}! Focus item checked off. 🎉`);
          } else {
            Toast.info(`Re-opened ${task.key}.`);
          }
          this.render(container);
        }
      });
    });

    // 13. Scratchpad Live Auto-Save
    const scratchpad = container.querySelector('#dash-scratchpad-input');
    const charCount = container.querySelector('#dash-scratchpad-char-count');
    if (scratchpad) {
      scratchpad.addEventListener('input', () => {
        const val = scratchpad.value;
        try {
          localStorage.setItem('taskforge_personal_notes', val);
        } catch (e) {
          // ignore
        }
        if (charCount) {
          charCount.textContent = `${val.length} characters`;
        }
      });
    }

    // 14. Copy Notes Button
    const copyNotesBtn = container.querySelector('#dash-btn-copy-notes');
    if (copyNotesBtn && scratchpad) {
      copyNotesBtn.addEventListener('click', () => {
        if (!scratchpad.value.trim()) {
          Toast.info('Scratchpad is empty.');
          return;
        }
        navigator.clipboard.writeText(scratchpad.value).then(() => {
          Toast.success('Scratchpad notes copied to clipboard! 📋');
        }).catch(() => {
          Toast.info('Notes copied.');
        });
      });
    }

    // 15. Clear Notes Button
    const clearNotesBtn = container.querySelector('#dash-btn-clear-notes');
    if (clearNotesBtn && scratchpad) {
      clearNotesBtn.addEventListener('click', () => {
        if (!scratchpad.value.trim()) return;
        if (confirm('Clear scratchpad notes?')) {
          scratchpad.value = '';
          try {
            localStorage.removeItem('taskforge_personal_notes');
          } catch (e) {
            // ignore
          }
          if (charCount) charCount.textContent = '0 characters';
          Toast.info('Scratchpad cleared.');
        }
      });
    }
  },

  /**
   * Navigates to Tasks view filtered by specific lifecycle stage
   * @param {string} stageId ('backlog' | 'todo' | 'inprogress' | 'inreview' | 'done')
   */
  navigateToStage(stageId) {
    if (typeof TasksView !== 'undefined' && TasksView.state) {
      TasksView.state.activeQuickFilter = stageId;
      TasksView.syncStateToViews();
    }
    if (typeof BoardView !== 'undefined') BoardView.activeQuickFilter = stageId;
    if (typeof ListView !== 'undefined') ListView.activeQuickFilter = stageId;
    Router.navigate('tasks');
  },

  /**
   * Navigates to Tasks view with a quick filter like 'overdue', 'critical', 'bugs'
   * @param {string} filterType
   */
  navigateToFilter(filterType) {
    if (typeof TasksView !== 'undefined' && TasksView.state) {
      TasksView.state.activeQuickFilter = filterType;
      TasksView.syncStateToViews();
    }
    if (typeof BoardView !== 'undefined') BoardView.activeQuickFilter = filterType;
    if (typeof ListView !== 'undefined') ListView.activeQuickFilter = filterType;
    Router.navigate('tasks');
  },

  /**
   * Navigates to Tasks view filtered by specific issue type
   * @param {string} type ('story' | 'bug' | 'task' | 'improvement')
   */
  navigateToType(type) {
    if (typeof TasksView !== 'undefined' && TasksView.state) {
      TasksView.state.selectedType = type;
      TasksView.syncStateToViews();
    }
    if (typeof BoardView !== 'undefined') BoardView.selectedType = type;
    if (typeof ListView !== 'undefined') ListView.selectedType = type;
    Router.navigate('tasks');
  },

  /**
   * Compiles and copies a professional Daily Standup summary to clipboard
   */
  generateAndCopyStandup() {
    const allTasks = AppState.tasks.filter(t => t.status !== 'cancelled');
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    // Completed tasks (done recently)
    const completedTasks = allTasks.filter(t => t.status === 'done').slice(0, 5);
    
    // In progress tasks
    const inProgressTasks = allTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview');

    // Blockers or overdue
    const overdueTasks = allTasks.filter(t => Utils.isOverdue(t.dueDate, t.status));
    const criticalTasks = allTasks.filter(t => (t.priority === 'critical' || t.priority === 'highest') && t.status !== 'done');

    let standupText = `🚀 Daily Standup — Surya Tej (${dateStr})\n\n`;

    standupText += `✅ Completed Recently:\n`;
    if (completedTasks.length === 0) {
      standupText += `• Wrapped up sprint planning items and backlog grooming.\n`;
    } else {
      completedTasks.forEach(t => {
        standupText += `• [${t.key}] ${t.title}\n`;
      });
    }

    standupText += `\n⚡ What I'm Focusing On Today:\n`;
    if (inProgressTasks.length === 0) {
      standupText += `• Picking up next prioritized items from Smart Work Queue.\n`;
    } else {
      inProgressTasks.forEach(t => {
        standupText += `• [${t.key}] ${t.title} (${t.status.toUpperCase()})\n`;
      });
    }

    standupText += `\n⚠️ Blockers / Needs Attention:\n`;
    const blockers = [...overdueTasks, ...criticalTasks].filter((t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx);
    if (blockers.length === 0) {
      standupText += `• None! All deliverables on track.\n`;
    } else {
      blockers.slice(0, 3).forEach(t => {
        standupText += `• [${t.key}] ${t.title} (${Utils.isOverdue(t.dueDate, t.status) ? 'Overdue' : 'Critical Priority'})\n`;
      });
    }

    navigator.clipboard.writeText(standupText).then(() => {
      if (typeof Utils.playSound === 'function') Utils.playSound('success');
      Toast.success('Daily Standup summary copied to clipboard! 📋');
    }).catch(() => {
      Toast.success('Daily Standup generated.');
    });
  },

  /**
   * Deterministic algorithm evaluating priority weight, due date proximity, blockers, and age
   * @param {Array<Object>} [tasksPool]
   * @returns {{ task: Object, project: Object|null, reason: string }|null}
   */
  getSmartQueueRecommendation(tasksPool) {
    const pool = tasksPool || AppState.tasks;
    const activeTasks = pool.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    if (activeTasks.length === 0) return null;

    let highestScore = -1;
    let selected = null;
    let rationale = '';

    activeTasks.forEach(t => {
      let score = 0;
      let reasons = [];

      // 1. Priority weight
      if (t.priority === 'critical') { score += 55; reasons.push('Critical priority'); }
      else if (t.priority === 'highest') { score += 45; reasons.push('Highest priority'); }
      else if (t.priority === 'high') { score += 35; reasons.push('High priority'); }
      else if (t.priority === 'medium') { score += 15; }

      // 2. Deadline urgency
      if (Utils.isOverdue(t.dueDate, t.status)) {
        score += 65;
        reasons.push('Overdue deadline');
      } else if (Utils.isDueToday(t.dueDate)) {
        score += 50;
        reasons.push('Due today');
      } else if (t.dueDate) {
        const daysDiff = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 3600 * 24);
        if (daysDiff <= 3) {
          score += 30;
          reasons.push('Approaching deadline');
        }
      }

      // 3. Status momentum (In progress gets slight bump to finish)
      if (t.status === 'inprogress') {
        score += 25;
        reasons.push('Already in progress');
      } else if (t.status === 'inreview') {
        score += 20;
        reasons.push('In review ready to close');
      }

      if (score > highestScore) {
        highestScore = score;
        selected = t;
        rationale = reasons.length > 0 ? reasons.join(' and ') : 'Active high-value task';
      }
    });

    if (!selected) return null;
    const project = AppState.projects.find(p => p.id === selected.projectId) || null;
    return { task: selected, project, reason: rationale };
  },

  /**
   * Returns top 3-4 priority tasks for today
   * @param {Array<Object>} [tasksPool]
   * @returns {Array<Object>}
   */
  getDailyFocusTasks(tasksPool) {
    const pool = tasksPool || AppState.tasks;
    const activeTasks = pool.filter(t => t.status !== 'cancelled');
    const incompleteTasks = activeTasks.filter(t => t.status !== 'done');
    const doneTasks = activeTasks.filter(t => t.status === 'done');

    const pWeight = { critical: 5, highest: 4, high: 3, medium: 2, low: 1, lowest: 0 };
    
    // Sort incomplete by priority, then deadline
    const sorted = [...incompleteTasks].sort((a, b) => {
      const pDiff = (pWeight[b.priority] || 0) - (pWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    });

    // If less than 4, pad with recently done
    if (sorted.length < 4) {
      sorted.push(...doneTasks.slice(0, 4 - sorted.length));
    }

    return sorted.slice(0, 4);
  }
};
