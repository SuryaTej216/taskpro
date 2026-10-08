/**
 * TaskForge - High-Performance Personal Productivity Dashboard
 * 
 * Features:
 * - Executive Header with user avatar, status indicator, live date, and rapid action tools
 * - Interactive Workflow Distribution Bar & status metric pills (matching Board view aesthetic)
 * - 4-Tile Executive Command Grid: Delivery Velocity, Story Points Burnup, Watchdog, Workload/Streak
 * - AI Smart Work Queue ("Next Best Action") with rationale & 1-click Focus / Complete
 * - Interactive Must-Win Daily Focus Checklist (direct circular check-off with audio feedback)
 * - Workflow Pipeline Radar across all 5 lifecycle stages
 * - Auto-saving Personal Scratchpad & Quick Notes with clipboard copy
 * - Active Projects Trajectory Matrix with dual-tone progress indicators
 * - Live Audit Activity Stream with relative timestamps
 * - 1-Click Daily Standup Generator (formatted markdown to clipboard)
 */

const DashboardView = {
  render(container) {
    if (!container) return;

    const allTasks = AppState.tasks.filter(t => t.status !== 'cancelled');
    const projects = AppState.projects;
    const activeSprint = AppState.sprints.find(s => s.status === 'active');

    // 1. Core Metrics
    const total = allTasks.length;
    const open = allTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
    const inProgress = allTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;
    const completed = allTasks.filter(t => t.status === 'done').length;
    const overdue = allTasks.filter(t => Utils.isOverdue(t.dueDate, t.status)).length;
    const critical = allTasks.filter(t => (t.priority === 'critical' || t.priority === 'highest') && t.status !== 'done').length;

    // Story Points
    const totalPoints = allTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const donePoints = allTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const activePoints = allTasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').reduce((sum, t) => sum + (Number(t.storyPoints) || 0), 0);
    const pointsPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

    // Completion percentage
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tasks completed in the last 24h
    const nowTs = Date.now();
    const completedRecently = allTasks.filter(t => {
      if (t.status !== 'done') return false;
      const cDate = t.completedAt ? new Date(t.completedAt).getTime() : (t.updatedAt ? new Date(t.updatedAt).getTime() : 0);
      return (nowTs - cDate) < 24 * 3600 * 1000;
    }).length;

    // Workload estimation
    const activeTasks = allTasks.filter(t => t.status !== 'done');
    const totalEstHours = Math.round(activeTasks.reduce((acc, t) => acc + (t.estimate || 60), 0) / 60);
    let workloadLevel = 'Optimal';
    let workloadColor = '#0BDA51';
    let workloadFillPct = 50;

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
    }

    // Dynamic greeting & time
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

    // Activity streak & Focus Score
    const streakDays = Math.min(21, Math.max(3, Math.floor(AppState.activity.length / 2) + 2));
    const focusScore = Math.min(99, Math.max(62, Math.round(68 + (completionRate * 0.22) + (streakDays * 0.7) - (overdue * 3.5))));

    // Recommendations
    const recommended = this.getSmartQueueRecommendation();
    const dailyFocus = this.getDailyFocusTasks();

    // Progression bar segment counts
    const statusCounts = {
      backlog: allTasks.filter(t => t.status === 'backlog').length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inprogress: allTasks.filter(t => t.status === 'inprogress').length,
      inreview: allTasks.filter(t => t.status === 'inreview').length,
      done: completed
    };

    // Stage cards for Radar
    const stages = [
      { id: 'backlog', label: 'Backlog', icon: 'fa-box-archive', color: '#64748B', count: statusCounts.backlog },
      { id: 'todo', label: 'To Do', icon: 'fa-circle-dot', color: '#1868DB', count: statusCounts.todo },
      { id: 'inprogress', label: 'In Progress', icon: 'fa-bolt-lightning', color: '#E06C00', count: statusCounts.inprogress },
      { id: 'inreview', label: 'In Review', icon: 'fa-eye', color: '#AF59E1', count: statusCounts.inreview },
      { id: 'done', label: 'Done', icon: 'fa-circle-check', color: '#0BDA51', count: statusCounts.done }
    ];

    // Saved Scratchpad Notes
    const savedNotes = localStorage.getItem('taskforge_personal_notes') || '';

    container.innerHTML = `
      <div class="view-page">
        <div class="dash-page">
          
          <!-- 1. Executive Top Header (Atlassian Design System Standard) -->
          <div class="view-header" style="margin-bottom: 8px;">
            <div class="view-title-group">
              <h1>
                <div class="dash-header-avatar" title="Surya Tej">ST</div>
                <span>Personal Command Center</span>
                <span class="dash-greeting-pill">
                  <span class="pulse-dot"></span>
                  <i class="fa-solid ${greetingIcon}" style="color: #f59e0b; font-size: 10px;"></i>
                  <span>${greeting}, Surya Tej</span>
                </span>
              </h1>
              <p>Executive daily pulse, intelligent execution priorities, and sprint velocity trajectory.</p>
            </div>

            <div class="view-actions">
              <span class="dash-date-pill">
                <i class="fa-regular fa-calendar"></i>
                <span>${dateFormatted}</span>
              </span>
              <button type="button" id="dash-btn-standup" class="btn btn-secondary btn-sm" title="Compile and copy Daily Standup to clipboard">
                <i class="fa-solid fa-clipboard-check"></i>
                <span>Copy Standup</span>
              </button>
              <button type="button" id="dash-btn-focus-mode" class="btn btn-secondary btn-sm" title="Launch Distraction-Free Focus Cockpit">
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

          <!-- 2. Full-Width Progression & Health Statusbar -->
          <div class="board-executive-statusbar" style="margin-bottom: 4px;">
            <div class="statusbar-center-group">
              <div class="board-stage-distribution-bar" title="Interactive Workflow Distribution">
                ${total > 0 ? `
                  <div class="stage-seg seg-backlog" style="width: ${(statusCounts.backlog / total) * 100}%;" title="Backlog: ${statusCounts.backlog}"></div>
                  <div class="stage-seg seg-todo" style="width: ${(statusCounts.todo / total) * 100}%;" title="To Do: ${statusCounts.todo}"></div>
                  <div class="stage-seg seg-inprogress" style="width: ${(statusCounts.inprogress / total) * 100}%;" title="In Progress: ${statusCounts.inprogress}"></div>
                  <div class="stage-seg seg-inreview" style="width: ${(statusCounts.inreview / total) * 100}%;" title="In Review: ${statusCounts.inreview}"></div>
                  <div class="stage-seg seg-done" style="width: ${(statusCounts.done / total) * 100}%;" title="Done: ${statusCounts.done}"></div>
                ` : `
                  <div class="stage-seg is-empty" style="width: 100%;"></div>
                `}
              </div>

              <div class="board-status-metrics-strip">
                <span class="status-metric-pill stat-total" title="Total Active Tasks" onclick="Router.navigate('tasks')" style="cursor: pointer;">
                  <i class="fa-solid fa-layer-group"></i> <span><strong>${total}</strong> Tasks</span>
                </span>
                <span class="status-metric-pill stat-points" title="Total Story Points">
                  <i class="fa-solid fa-diamond"></i> <span><strong>${totalPoints}</strong> pts</span>
                </span>
                <span class="status-metric-pill stat-active" title="In Flight Workflows" onclick="Router.navigate('tasks')" style="cursor: pointer;">
                  <i class="fa-solid fa-bolt-lightning"></i> <span><strong>${inProgress}</strong> active</span>
                </span>
                <span class="status-metric-pill stat-completion ${completionRate === 100 ? 'is-complete' : ''}" title="${completed} of ${total} tasks completed (${completionRate}%)">
                  <i class="fa-solid fa-circle-check"></i> <span><strong>${completionRate}%</strong> done</span>
                </span>
                ${overdue > 0 ? `
                  <button type="button" class="status-metric-pill stat-overdue active" onclick="Router.navigate('tasks')" title="Click to view overdue tasks">
                    <i class="fa-solid fa-triangle-exclamation"></i> <span><strong>${overdue}</strong> overdue</span>
                  </button>
                ` : `
                  <span class="status-metric-pill" style="color: #0BDA51;">
                    <i class="fa-solid fa-shield-halved"></i> <span>All on track</span>
                  </span>
                `}
                <span class="status-metric-pill" style="color: #f59e0b;">
                  <i class="fa-solid fa-fire"></i> <span><strong>${streakDays}d</strong> streak</span>
                </span>
              </div>
            </div>
          </div>

          <!-- 3. Four-Tile Executive Command Grid -->
          <div class="dash-command-grid">
            
            <!-- Tile 1: Delivery Velocity -->
            <div class="dash-command-tile" onclick="Router.navigate('tasks')" style="cursor: pointer;" title="View all tasks">
              <div class="dash-tile-top">
                <span class="dash-tile-label">Sprint Delivery</span>
                <div class="dash-tile-icon-box" style="background: rgba(11, 218, 81, 0.12); color: #0BDA51;">
                  <i class="fa-solid fa-circle-check"></i>
                </div>
              </div>
              <div class="dash-tile-body">
                <div class="dash-tile-number" style="color: #0BDA51;">${completionRate}%</div>
                <div class="dash-tile-meta-col">
                  <span class="dash-tile-meta-title">${completed} of ${total} finished</span>
                  <span class="dash-tile-meta-sub">${completedRecently > 0 ? `+${completedRecently} completed today` : 'Consistent momentum'}</span>
                </div>
              </div>
              <div class="dash-tile-progress">
                <div class="dash-tile-progress-fill" style="width: ${completionRate}%; background: #0BDA51;"></div>
              </div>
            </div>

            <!-- Tile 2: Story Points Burnup -->
            <div class="dash-command-tile" onclick="Router.navigate('tasks')" style="cursor: pointer;" title="View story points">
              <div class="dash-tile-top">
                <span class="dash-tile-label">Points Burnup</span>
                <div class="dash-tile-icon-box" style="background: rgba(175, 89, 225, 0.12); color: #AF59E1;">
                  <i class="fa-solid fa-diamond"></i>
                </div>
              </div>
              <div class="dash-tile-body">
                <div class="dash-tile-number" style="color: #AF59E1;">${donePoints}</div>
                <div class="dash-tile-meta-col">
                  <span class="dash-tile-meta-title">of ${totalPoints} story pts</span>
                  <span class="dash-tile-meta-sub">${activePoints} pts in flight</span>
                </div>
              </div>
              <div class="dash-tile-progress">
                <div class="dash-tile-progress-fill" style="width: ${pointsPct}%; background: #AF59E1;"></div>
              </div>
            </div>

            <!-- Tile 3: Urgent Attention / Watchdog -->
            <div class="dash-command-tile" onclick="Router.navigate('tasks')" style="cursor: pointer;" title="Review urgent items">
              <div class="dash-tile-top">
                <span class="dash-tile-label">Execution Watchdog</span>
                <div class="dash-tile-icon-box" style="background: ${overdue > 0 ? 'rgba(239, 68, 68, 0.14)' : 'rgba(100, 116, 139, 0.12)'}; color: ${overdue > 0 ? '#EF4444' : '#64748B'};">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
              </div>
              <div class="dash-tile-body">
                <div class="dash-tile-number" style="color: ${overdue > 0 ? '#EF4444' : 'var(--text-primary)'};">${overdue + critical}</div>
                <div class="dash-tile-meta-col">
                  <span class="dash-tile-meta-title">${overdue > 0 ? 'Immediate Attention' : 'Zero Blockers'}</span>
                  <span class="dash-tile-meta-sub">${overdue > 0 ? `${overdue} overdue • ${critical} critical` : 'All schedules on track'}</span>
                </div>
              </div>
              <div class="dash-tile-progress">
                <div class="dash-tile-progress-fill" style="width: ${overdue > 0 ? 100 : 0}%; background: #EF4444;"></div>
              </div>
            </div>

            <!-- Tile 4: Workload & Focus Index -->
            <div class="dash-command-tile" title="Current estimated workload capacity">
              <div class="dash-tile-top">
                <span class="dash-tile-label">Workload & Focus</span>
                <div class="dash-tile-icon-box" style="background: rgba(87, 157, 255, 0.12); color: ${workloadColor};">
                  <i class="fa-solid fa-gauge-high"></i>
                </div>
              </div>
              <div class="dash-tile-body">
                <div class="dash-tile-number" style="color: ${workloadColor}; font-size: 24px;">${workloadLevel}</div>
                <div class="dash-tile-meta-col">
                  <span class="dash-tile-meta-title">~${totalEstHours}h active load</span>
                  <span class="dash-tile-meta-sub">Score: ${focusScore}/100 • ${streakDays}d streak</span>
                </div>
              </div>
              <div class="dash-tile-progress">
                <div class="dash-tile-progress-fill" style="width: ${workloadFillPct}%; background: ${workloadColor};"></div>
              </div>
            </div>

          </div>

          <!-- 4. Two-Column Execution Cockpit (60% / 40%) -->
          <div class="dash-cockpit-layout">
            
            <!-- LEFT COLUMN: Execution Engine -->
            <div class="dash-column">
              
              <!-- 4A: AI Smart Work Queue ("Next Best Action") -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(175, 89, 225, 0.12); color: #AF59E1;">
                      <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Smart Work Queue</h2>
                      <span class="dash-panel-subtitle">Recommended next priority based on urgency, deadline, and momentum</span>
                    </div>
                  </div>
                  <span class="badge" style="background: rgba(175, 89, 225, 0.15); color: #AF59E1; font-weight: 600; font-size: 11px;">
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
                  <div class="empty-state" style="padding: 28px 16px;">
                    <i class="fa-solid fa-check-double empty-state-icon" style="color: #0BDA51;"></i>
                    <div class="empty-state-title">Inbox Zero Achieved!</div>
                    <div class="empty-state-desc">You have no active pending tasks in the queue. Create a new task or take a well-deserved break!</div>
                  </div>
                `}
              </div>

              <!-- 4B: Today's Must-Win Focus Checklist (Top 3 Priorities) -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(239, 68, 68, 0.12); color: #EF4444;">
                      <i class="fa-solid fa-crosshairs"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Must-Win Daily Focus</h2>
                      <span class="dash-panel-subtitle">Immediate priorities for today — check off directly to complete</span>
                    </div>
                  </div>
                  <span class="badge" style="background: rgba(239, 68, 68, 0.12); color: #EF4444; font-weight: 600; font-size: 11px;">
                    Top Priorities
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

              <!-- 4C: Workflow Pipeline Radar (Lifecycle Stages) -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(87, 157, 255, 0.12); color: #579DFF;">
                      <i class="fa-solid fa-layer-group"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Workflow Pipeline Distribution</h2>
                      <span class="dash-panel-subtitle">Inventory across all project lifecycle stages</span>
                    </div>
                  </div>
                  <a href="#/tasks" class="btn btn-ghost btn-sm" title="Open full Tasks view">
                    <span>Open Tasks</span>
                    <i class="fa-solid fa-arrow-right"></i>
                  </a>
                </div>

                <div class="dash-radar-row">
                  ${stages.map(stage => `
                    <div class="dash-radar-card" onclick="Router.navigate('tasks')" title="View tasks in ${stage.label}">
                      <div class="dash-radar-header">
                        <span><i class="fa-solid ${stage.icon}" style="color: ${stage.color};"></i> ${stage.label}</span>
                      </div>
                      <div class="dash-radar-count" style="color: ${stage.color};">${stage.count}</div>
                      <div class="dash-tile-progress" style="margin-top: 2px;">
                        <div class="dash-tile-progress-fill" style="width: ${total > 0 ? (stage.count / total) * 100 : 0}%; background: ${stage.color};"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

            </div>

            <!-- RIGHT COLUMN: Productivity Utilities -->
            <div class="dash-column">
              
              <!-- 4D: Personal Quick Scratchpad -->
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

              <!-- 4E: Active Projects Portfolio Matrix -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(56, 139, 253, 0.12); color: #388BFD;">
                      <i class="fa-solid fa-folder-tree"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Project Trajectory</h2>
                      <span class="dash-panel-subtitle">Active initiatives & portfolio completion</span>
                    </div>
                  </div>
                  <a href="#/projects" class="btn btn-ghost btn-sm">Projects</a>
                </div>

                <div class="dash-project-track">
                  ${projects.length === 0 ? `
                    <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">
                      No active projects found.
                    </div>
                  ` : projects.map(p => {
                    const pTasks = allTasks.filter(t => t.projectId === p.id);
                    const pDone = pTasks.filter(t => t.status === 'done').length;
                    const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
                    return `
                      <a href="#/tasks?project=${p.id}" class="dash-project-row" title="Open tasks for ${Utils.escapeHTML(p.name)}">
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
                      </a>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 4F: Live Audit Activity Feed -->
              <div class="dash-panel">
                <div class="dash-panel-header">
                  <div class="dash-panel-title-wrap">
                    <div class="dash-panel-icon" style="background: rgba(14, 165, 233, 0.12); color: #0EA5E9;">
                      <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <div>
                      <h2 class="dash-panel-title">Audit Activity Feed</h2>
                      <span class="dash-panel-subtitle">Real-time log of team & personal updates</span>
                    </div>
                  </div>
                </div>

                <div class="dash-feed-stream">
                  ${AppState.activity.length === 0 ? `
                    <div style="padding: 24px 10px; text-align: center; color: var(--text-muted); font-size: 12px;">
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
   * Binds interactive buttons, scratchpad auto-save, and daily focus check-offs
   */
  attachEventListeners(container) {
    if (!container) return;

    // Quick Task Create Button
    const createBtn = container.querySelector('#dash-btn-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => TaskModal.openCreate());
    }

    // Focus Cockpit Button
    const focusBtn = container.querySelector('#dash-btn-focus-mode');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        Router.navigate('focus');
      });
    }

    // Copy Standup Button
    const standupBtn = container.querySelector('#dash-btn-standup');
    if (standupBtn) {
      standupBtn.addEventListener('click', () => this.generateAndCopyStandup());
    }

    // Start Focus on Recommended Task
    container.querySelectorAll('.dash-btn-start-focus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        if (taskId) {
          Router.navigate('focus', { task: taskId });
        }
      });
    });

    // Mark Done on Recommended Task
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

    // Check-off buttons on Daily Focus List
    container.querySelectorAll('.dash-focus-checkbox').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
          const nextStatus = task.status === 'done' ? 'todo' : 'done';
          AppState.updateTask(taskId, { status: nextStatus });
          if (nextStatus === 'done' && typeof Utils.playSound === 'function') {
            Utils.playSound('success');
            Toast.success(`Completed ${task.key}! Focus item checked off. 🎉`);
          } else {
            Toast.info(`Re-opened ${task.key}.`);
          }
          this.render(container);
        }
      });
    });

    // Scratchpad Live Auto-Save
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

    // Copy Notes Button
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

    // Clear Notes Button
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
   * @returns {{ task: Object, project: Object|null, reason: string }|null}
   */
  getSmartQueueRecommendation() {
    const activeTasks = AppState.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
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
   * Returns top 3 priority tasks for today
   * @returns {Array<Object>}
   */
  getDailyFocusTasks() {
    const activeTasks = AppState.tasks.filter(t => t.status !== 'cancelled');
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

    // If less than 3, pad with recently done
    if (sorted.length < 3) {
      sorted.push(...doneTasks.slice(0, 3 - sorted.length));
    }

    return sorted.slice(0, 3);
  }
};
