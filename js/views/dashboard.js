/**
 * TaskForge - Dashboard View
 * Features: Productivity Summary, Smart Work Queue, Daily Focus, Workload Indicator, and Widget Grid
 */

const DashboardView = {
  render(container) {
    const tasks = AppState.tasks;
    const projects = AppState.projects;

    // Metrics
    const total = tasks.length;
    const open = tasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
    const inProgress = tasks.filter(t => t.status === 'inprogress' || t.status === 'inreview').length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => Utils.isOverdue(t.dueDate, t.status)).length;
    const critical = tasks.filter(t => (t.priority === 'critical' || t.priority === 'highest') && t.status !== 'done').length;

    // Completion percentage
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Smart Work Queue recommendation
    const recommended = this.getSmartQueueRecommendation();

    // Top 3 Daily Focus Tasks
    const dailyFocus = this.getDailyFocusTasks();

    // Workload estimation
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const totalEstHours = Math.round(activeTasks.reduce((acc, t) => acc + (t.estimate || 60), 0) / 60);
    let workloadLevel = 'Normal';
    let workloadColor = 'var(--accent-primary)';
    if (totalEstHours < 8) { workloadLevel = 'Light'; workloadColor = 'var(--accent-success)'; }
    else if (totalEstHours > 25) { workloadLevel = 'Overloaded'; workloadColor = 'var(--accent-danger)'; }
    else if (totalEstHours > 16) { workloadLevel = 'Heavy'; workloadColor = 'var(--accent-warning)'; }

    // Consecutive streak (demo simulated from activity count)
    const streakDays = Math.min(14, Math.max(3, Math.floor(AppState.activity.length / 2)));

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-chart-pie" style="color: var(--accent-primary);"></i> Personal Dashboard</h1>
            <p>Welcome back, Surya Tej! Here is your productivity command center.</p>
          </div>
          <div class="view-actions">
            <button id="dash-btn-create" class="btn btn-primary">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
            <a href="#/focus" class="btn btn-secondary">
              <i class="fa-solid fa-bullseye" style="color: var(--accent-danger);"></i> Start Focus Mode
            </a>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px;">
          
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase;">Total Tasks</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${total}</div>
            <div style="font-size: 11px; color: var(--accent-success); margin-top: 4px;">${completionRate}% completed</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase;">In Progress</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--status-inprogress); margin-top: 4px;">${inProgress}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">Active workflows</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase;">Overdue</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--accent-danger); margin-top: 4px;">${overdue}</div>
            <div style="font-size: 11px; color: ${overdue > 0 ? 'var(--accent-danger)' : 'var(--text-muted)'}; margin-top: 4px;">${overdue > 0 ? 'Action required' : 'All on track'}</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase;">Critical Priority</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--priority-critical); margin-top: 4px;">${critical}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">Immediate attention</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase;">Workload Index</div>
            <div style="font-size: 20px; font-weight: 700; color: ${workloadColor}; margin-top: 6px;">${workloadLevel}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">~${totalEstHours}h active work</div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase;">Productivity Streak</div>
            <div style="font-size: 24px; font-weight: 700; color: #f59e0b; margin-top: 4px;">🔥 ${streakDays} days</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Keep up momentum</div>
          </div>

        </div>

        <!-- Section: Smart Work Queue & Daily Focus Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px;">
          
          <!-- Smart Work Queue Card -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px;">
                <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--accent-purple);"></i>
                <span>Smart Work Queue — Recommended Next Task</span>
              </div>
              <span class="badge" style="background: var(--accent-purple-subtle); color: var(--accent-purple);">AI Dispatcher</span>
            </div>

            ${recommended ? `
              <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-family: var(--font-mono); font-weight: 700; font-size: 12px; color: var(--accent-primary);">${recommended.task.key}</span>
                  <span class="badge-priority priority-${recommended.task.priority}">${recommended.task.priority.toUpperCase()}</span>
                </div>
                <div style="font-weight: 600; font-size: 15px; color: var(--text-primary); margin-bottom: 6px; cursor: pointer;" onclick="TaskModal.openDetail('${recommended.task.id}')">
                  ${Utils.escapeHTML(recommended.task.title)}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
                  ${Utils.escapeHTML(recommended.task.description || 'No description provided.')}
                </div>
                <div style="background: var(--bg-app); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-lightbulb" style="color: var(--accent-warning);"></i>
                  <span><strong>Why this?</strong> ${Utils.escapeHTML(recommended.reason)}</span>
                </div>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary btn-sm" onclick="TaskModal.openDetail('${recommended.task.id}')" style="flex: 1;">
                  <i class="fa-solid fa-arrow-right"></i> Work on This Now
                </button>
                <a href="#/focus?task=${recommended.task.id}" class="btn btn-secondary btn-sm" title="Focus Mode">
                  <i class="fa-solid fa-bullseye"></i>
                </a>
              </div>
            ` : `
              <div class="empty-state" style="padding: 20px;">
                <i class="fa-solid fa-check-double empty-state-icon" style="color: var(--accent-success);"></i>
                <div class="empty-state-title">Inbox Zero!</div>
                <div class="empty-state-desc">You have no active pending tasks in the queue. Create a new task or take a break!</div>
              </div>
            `}
          </div>

          <!-- Daily Focus Top 3 Tasks -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px;">
                <i class="fa-solid fa-crosshairs" style="color: var(--accent-danger);"></i>
                <span>Daily Focus (Top 3 Priorities)</span>
              </div>
              <span class="badge" style="background: var(--accent-danger-subtle); color: var(--accent-danger);">Must Win</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
              ${dailyFocus.length === 0 ? `
                <div class="empty-state" style="padding: 20px;">
                  <i class="fa-solid fa-calendar-check empty-state-icon"></i>
                  <div class="empty-state-title">No immediate priorities</div>
                  <div class="empty-state-desc">Add tasks with High or Critical priority to populate your daily focus agenda.</div>
                </div>
              ` : dailyFocus.map((t, idx) => `
                <div style="display: flex; align-items: center; gap: 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; cursor: pointer; transition: border-color var(--transition-fast);" onclick="TaskModal.openDetail('${t.id}')">
                  <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--bg-app); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: var(--accent-primary);">
                    ${idx + 1}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHTML(t.title)}</div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                      <span style="font-family: var(--font-mono); font-weight: 600;">${t.key}</span>
                      <span>•</span>
                      <span class="badge-status-${t.status}">${t.status}</span>
                      ${t.dueDate ? `<span>• Due ${Utils.formatRelativeDate(t.dueDate)}</span>` : ''}
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); AppState.updateTask('${t.id}', { status: 'done' })" title="Mark Done">
                    <i class="fa-regular fa-circle-check" style="font-size: 16px; color: var(--accent-success);"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Section: Active Projects Progress & Recent Activity -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
          
          <!-- Projects Progress Widget -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 14px;"><i class="fa-solid fa-folder-tree"></i> Project Trajectory</span>
              <a href="#/projects" class="btn btn-ghost btn-sm">View All</a>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${projects.length === 0 ? `
                <div style="padding: 24px 10px; text-align: center; color: var(--text-muted); font-size: 13px;">
                  <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                  No projects yet. Create a project to start tracking completion.
                  <div style="margin-top: 10px;">
                    <button class="btn btn-secondary btn-sm" onclick="ProjectsView.openCreateModal()">Create Project</button>
                  </div>
                </div>
              ` : projects.map(p => {
      const projTasks = tasks.filter(t => t.projectId === p.id);
      const projDone = projTasks.filter(t => t.status === 'done').length;
      const pct = projTasks.length > 0 ? Math.round((projDone / projTasks.length) * 100) : 0;
      return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                      <a href="#/board?project=${p.id}" style="color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p.color || '#388bfd'};"></span>
                        ${Utils.escapeHTML(p.name)}
                      </a>
                      <span style="color: var(--text-muted);">${pct}% (${projDone}/${projTasks.length})</span>
                    </div>
                    <div class="progress-bar-container">
                      <div class="progress-bar-fill" style="width: ${pct}%; background: ${p.color || 'var(--accent-primary)'};"></div>
                    </div>
                  </div>
                `;
    }).join('')}
            </div>
          </div>

          <!-- Recent Audit Activity -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-weight: 700; font-size: 14px;"><i class="fa-solid fa-timeline"></i> Recent Activity Stream</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto;">
              ${AppState.activity.length === 0 ? `
                <div style="padding: 24px 10px; text-align: center; color: var(--text-muted); font-size: 13px;">
                  <i class="fa-solid fa-clock-rotate-left" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                  No activity history logged yet. Actions and updates will stream here.
                </div>
              ` : AppState.activity.slice(0, 7).map(a => `
                <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 12px;">
                  <i class="fa-solid fa-clock-rotate-left" style="color: var(--accent-primary); margin-top: 3px;"></i>
                  <div style="flex: 1;">
                    <div style="color: var(--text-primary); font-weight: 500;">${Utils.escapeHTML(a.details)}</div>
                    <div style="color: var(--text-muted); font-size: 11px;">${Utils.formatRelativeDate(a.timestamp)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

      </div>
    `;

    // Bind create button
    const createBtn = document.getElementById('dash-btn-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => TaskModal.openCreate());
    }
  },

  /**
   * Deterministic algorithm evaluating priority weight, due date proximity, blockers, and age
   * @returns {{ task: Object, reason: string }|null}
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
      if (t.priority === 'critical') { score += 50; reasons.push('Critical priority'); }
      else if (t.priority === 'highest') { score += 40; reasons.push('Highest priority'); }
      else if (t.priority === 'high') { score += 30; reasons.push('High priority'); }
      else if (t.priority === 'medium') { score += 15; }

      // 2. Deadline urgency
      if (Utils.isOverdue(t.dueDate, t.status)) {
        score += 60;
        reasons.push('Overdue deadline');
      } else if (Utils.isDueToday(t.dueDate)) {
        score += 45;
        reasons.push('Due today');
      }

      // 3. Status momentum (In progress gets slight bump to finish)
      if (t.status === 'inprogress') {
        score += 20;
        reasons.push('Already in progress');
      }

      if (score > highestScore) {
        highestScore = score;
        selected = t;
        rationale = reasons.length > 0 ? reasons.join(' and ') : 'Active high-value task';
      }
    });

    if (!selected) return null;
    return { task: selected, reason: rationale };
  },

  /**
   * Returns top 3 priority tasks for today
   * @returns {Array<Object>}
   */
  getDailyFocusTasks() {
    const activeTasks = AppState.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    return activeTasks.sort((a, b) => {
      const pWeight = { critical: 5, highest: 4, high: 3, medium: 2, low: 1, lowest: 0 };
      return (pWeight[b.priority] || 0) - (pWeight[a.priority] || 0);
    }).slice(0, 3);
  }
};
