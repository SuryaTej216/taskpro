/** Visual dashboard overview. Individual task lists live in Tasks and Daily Planner. */

const DashboardView = {
  render(container) {
    if (!container) return;

    const dayKeys = PlannerView.getDays().map(day => day.key);
    const allTasks = AppState.tasks.filter(task => !task.archived);
    const tasks = allTasks.filter(task => !AppState.selectedProjectId || task.projectId === AppState.selectedProjectId);
    const stats = this.getStats(tasks, allTasks, dayKeys);
    const project = AppState.projects.find(item => item.id === AppState.selectedProjectId);
    const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    container.innerHTML = `
      <div class="view-page planner-page dashboard-page" id="dashboard-page">
        <header class="view-header planner-header dashboard-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-house planner-title-icon"></i> Dashboard</h1>
            <p>${dateLabel} <span class="dashboard-scope-dot">&middot;</span> ${project ? Utils.escapeHTML(project.name) : 'All projects'}</p>
          </div>
          <div class="view-actions dashboard-actions">
            <button type="button" class="btn btn-primary btn-sm" data-dashboard-action="create"><i class="fa-solid fa-plus"></i> New task</button>
          </div>
        </header>

        <section class="planner-day is-today dashboard-overview" aria-label="Dashboard overview">
          <div class="dashboard-hero">
            <div class="dashboard-hero-heading">
              <span class="dashboard-eyebrow">Workspace overview</span>
              <h2>Delivery at a glance</h2>
            </div>
            <div class="dashboard-hero-content">
              <div class="dashboard-completion-visual">
                <svg class="dashboard-donut" viewBox="0 0 120 120" role="img" aria-label="${stats.completion}% of tasks complete">
                  <circle class="dashboard-donut-track" cx="60" cy="60" r="50"></circle>
                  <circle class="dashboard-donut-value" cx="60" cy="60" r="50" style="stroke-dasharray:${(stats.completion / 100 * 314.16).toFixed(1)} 314.16"></circle>
                </svg>
                <div class="dashboard-donut-label"><strong>${stats.completion}%</strong><span>complete</span></div>
              </div>
              <div class="dashboard-hero-stats">
                ${this.renderHighlight('fa-list-check', 'Open tasks', stats.open, 'brand')}
                ${this.renderHighlight('fa-circle-check', 'Completed in 24h', stats.completedRecently, 'success')}
                ${this.renderHighlight('fa-triangle-exclamation', 'Needs attention', stats.attention, stats.attention ? 'danger' : 'success')}
                ${this.renderHighlight('fa-bullseye', 'Focus score', `${stats.focusScore}<small>/99</small>`, 'violet')}
              </div>
              <div class="dashboard-estimate">
                <span class="dashboard-estimate-icon"><i class="fa-regular fa-clock"></i></span>
                <div><span>Open work estimate</span><strong>${stats.estimatedHours}<small>h</small></strong></div>
                <em>${stats.workload}</em>
              </div>
            </div>
          </div>
          <div class="dashboard-visual-grid">
            ${this.renderWorkflowChart(stats)}
            ${this.renderTypeChart(stats)}
            ${this.renderProgressPanel(stats)}
            ${this.renderProjectChart(stats)}
          </div>
          ${this.renderAllMetrics(stats)}
        </section>
      </div>
    `;

    const createButton = container.querySelector('[data-dashboard-action="create"]');
    if (createButton) createButton.addEventListener('click', () => TaskModal.openCreate());
  },

  getStats(tasks, allTasks, dayKeys) {
    const [todayKey, tomorrowKey, nextDayKey] = dayKeys;
    const isOpen = task => task.status !== 'done' && task.status !== 'cancelled';
    const completedTasks = tasks.filter(task => task.status === 'done');
    const openTasks = tasks.filter(isOpen);
    const blockedTasks = tasks.filter(task => task.status === 'blocked');
    const overdueTasks = tasks.filter(task => {
      const dueKey = PlannerView.dueKey(task);
      return isOpen(task) && dueKey && dueKey < todayKey;
    });
    const carryoverTasks = tasks.filter(task => isOpen(task) && task.plannedDate && task.plannedDate < todayKey);
    const criticalTasks = openTasks.filter(task => task.priority === 'critical' || task.priority === 'highest');
    const total = tasks.length;
    const completion = total ? Math.round(completedTasks.length / total * 100) : 0;
    const totalPoints = tasks.reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const donePoints = completedTasks.reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const activePoints = tasks
      .filter(task => task.status === 'inprogress' || task.status === 'inreview')
      .reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0);
    const estimatedHours = Math.round(openTasks.reduce((sum, task) => sum + (Number(task.estimate) || 60), 0) / 60);
    const workload = estimatedHours < 8 ? 'Light' : estimatedHours > 28 ? 'Heavy load' : estimatedHours > 16 ? 'Elevated' : 'Balanced';
    const plannedToday = tasks.filter(task => task.plannedDate === todayKey && task.status !== 'cancelled');
    const todayRemaining = plannedToday.filter(isOpen).reduce((sum, task) =>
      sum + Math.max(0, (Number(task.estimate) || 0) - (Number(task.trackedTime) || 0)), 0);
    const queued = tasks.filter(task => isOpen(task) && task.plannedDate && task.plannedDate >= tomorrowKey && task.plannedDate <= nextDayKey).length;
    const attention = new Set([...blockedTasks, ...overdueTasks, ...carryoverTasks].map(task => task.id)).size;
    const completedRecently = completedTasks.filter(task => {
      const timestamp = task.completedAt ? new Date(task.completedAt).getTime() : (task.updatedAt ? new Date(task.updatedAt).getTime() : 0);
      return timestamp > 0 && Date.now() - timestamp < 24 * 60 * 60 * 1000;
    }).length;
    const streak = Math.min(21, Math.max(3, Math.floor(AppState.activity.length / 2) + 2));
    const focusScore = Math.min(99, Math.max(62, Math.round(68 + completion * 0.22 + streak * 0.7 - overdueTasks.length * 4)));

    const statusCounts = {
      Backlog: tasks.filter(task => task.status === 'backlog').length,
      'To do': tasks.filter(task => task.status === 'todo').length,
      'In progress': tasks.filter(task => task.status === 'inprogress').length,
      'In review': tasks.filter(task => task.status === 'inreview').length,
      Blocked: blockedTasks.length,
      Done: completedTasks.length,
      Cancelled: tasks.filter(task => task.status === 'cancelled').length
    };
    const typeCounts = {
      Stories: tasks.filter(task => task.type === 'story').length,
      Bugs: tasks.filter(task => task.type === 'bug').length,
      Improvements: tasks.filter(task => task.type === 'improvement').length,
      Tasks: tasks.filter(task => !task.type || task.type === 'task').length,
      Epics: tasks.filter(task => task.type === 'epic').length
    };
    const allBugs = tasks.filter(task => task.type === 'bug');
    const openBugs = allBugs.filter(task => task.status !== 'done');
    const quality = allBugs.length ? Math.max(70, Math.round(100 - openBugs.length * 10)) : 100;

    const activeSprint = AppState.sprints.find(sprint =>
      sprint.status === 'active' && (!AppState.selectedProjectId || sprint.projectId === AppState.selectedProjectId || !sprint.projectId)
    );
    let sprintStats = null;
    if (activeSprint) {
      const sprintTasks = tasks.filter(task => task.sprintId === activeSprint.id);
      const sprintDone = sprintTasks.filter(task => task.status === 'done');
      const sprintActive = sprintTasks.filter(task => task.status === 'inprogress' || task.status === 'inreview');
      let schedule = 'Active';
      if (activeSprint.endDate) {
        const daysLeft = Math.ceil((new Date(activeSprint.endDate) - new Date()) / (24 * 60 * 60 * 1000));
        schedule = daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Ends today' : `${Math.abs(daysLeft)} days overdue`;
      }
      sprintStats = {
        sprint: activeSprint,
        done: sprintDone.length,
        total: sprintTasks.length,
        percent: sprintTasks.length ? Math.round(sprintDone.length / sprintTasks.length * 100) : 0,
        active: sprintActive.length,
        donePoints: sprintDone.reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0),
        points: sprintTasks.reduce((sum, task) => sum + (Number(task.storyPoints) || 0), 0),
        schedule
      };
    }

    const selectedProject = AppState.projects.find(item => item.id === AppState.selectedProjectId);
    const portfolio = (selectedProject ? [selectedProject] : AppState.projects).map(project => {
      const projectTasks = allTasks.filter(task => task.projectId === project.id);
      const done = projectTasks.filter(task => task.status === 'done').length;
      return { project, done, total: projectTasks.length, percent: projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0 };
    });

    return {
      total, completed: completedTasks.length, completion, completedRecently, open: openTasks.length,
      totalPoints, donePoints, pointsPercent: totalPoints ? Math.round(donePoints / totalPoints * 100) : 0,
      activePoints, remainingPoints: Math.max(0, totalPoints - donePoints), estimatedHours, workload,
      todayRemaining, queued, attention, blocked: blockedTasks.length, overdue: overdueTasks.length,
      critical: criticalTasks.length, focusScore, streak, openBugs: openBugs.length, bugTotal: allBugs.length,
      quality, statusCounts, typeCounts, sprintStats, portfolio
    };
  },

  renderHighlight(icon, label, value, tone) {
    return `<div class="dashboard-highlight dashboard-highlight-${tone}">
      <span class="dashboard-highlight-icon"><i class="fa-solid ${icon}"></i></span>
      <span class="dashboard-highlight-copy"><span>${label}</span><strong>${value}</strong></span>
    </div>`;
  },

  renderWorkflowChart(stats) {
    const statuses = [
      ['Backlog', stats.statusCounts.Backlog, 'fa-inbox', 'backlog'],
      ['To do', stats.statusCounts['To do'], 'fa-circle-dot', 'todo'],
      ['In progress', stats.statusCounts['In progress'], 'fa-bolt', 'inprogress'],
      ['In review', stats.statusCounts['In review'], 'fa-eye', 'inreview'],
      ['Blocked', stats.statusCounts.Blocked, 'fa-ban', 'blocked'],
      ['Done', stats.statusCounts.Done, 'fa-circle-check', 'done'],
      ['Cancelled', stats.statusCounts.Cancelled, 'fa-circle-xmark', 'cancelled']
    ];
    return `<section class="dashboard-chart-panel dashboard-workflow-panel">
      <div class="dashboard-panel-heading"><span class="dashboard-panel-icon dashboard-panel-icon-blue"><i class="fa-solid fa-chart-column"></i></span><div><h3>Workflow</h3><p>Task status distribution</p></div><strong class="dashboard-panel-total">${stats.total}</strong></div>
      <div class="dashboard-status-grid" role="list" aria-label="Task distribution by status">
        ${statuses.map(([label, count, icon, tone]) => {
          const percent = stats.total ? Math.round(count / stats.total * 100) : 0;
          return `<div class="dashboard-status-tile dashboard-state-${tone}" role="listitem"><div class="dashboard-status-tile-heading"><span class="dashboard-status-tile-icon"><i class="fa-solid ${icon}"></i></span><span>${label}</span></div><div class="dashboard-status-tile-value"><strong>${count}</strong><small>${percent}%</small></div><span class="dashboard-status-tile-track"><i style="width:${percent}%"></i></span></div>`;
        }).join('')}
      </div>
    </section>`;
  },

  renderTypeChart(stats) {
    const types = [
      ['Stories', stats.typeCounts.Stories, 'fa-book-open', 'stories'],
      ['Bugs', stats.typeCounts.Bugs, 'fa-bug', 'bugs'],
      ['Improvements', stats.typeCounts.Improvements, 'fa-wand-magic-sparkles', 'improvements'],
      ['Tasks', stats.typeCounts.Tasks, 'fa-list-check', 'tasks'],
      ['Epics', stats.typeCounts.Epics, 'fa-layer-group', 'epics']
    ];
    return `<section class="dashboard-chart-panel">
      <div class="dashboard-panel-heading"><span class="dashboard-panel-icon dashboard-panel-icon-violet"><i class="fa-solid fa-shapes"></i></span><div><h3>Work mix</h3><p>Tasks by type</p></div></div>
      <div class="dashboard-type-chart" role="list" aria-label="Task distribution by type">${types.map(([label, count, icon, tone]) => {
        const percent = stats.total ? Math.round(count / stats.total * 100) : 0;
        return `<div class="dashboard-type-row dashboard-type-${tone}" role="listitem"><span class="dashboard-type-icon"><i class="fa-solid ${icon}"></i></span><div class="dashboard-type-content"><div class="dashboard-type-meta"><span>${label}</span><strong>${count}<small>${percent}%</small></strong></div><span class="dashboard-type-track"><i style="width:${percent}%"></i></span></div></div>`;
      }).join('')}</div>
    </section>`;
  },

  renderProgressPanel(stats) {
    const sprint = stats.sprintStats;
    return `<section class="dashboard-chart-panel dashboard-progress-panel">
      <div class="dashboard-panel-heading"><span class="dashboard-panel-icon dashboard-panel-icon-green"><i class="fa-solid fa-gauge-high"></i></span><div><h3>Progress</h3><p>Story points${sprint ? ' & active sprint' : ''}</p></div></div>
      <div class="dashboard-progress-block">
        <div class="dashboard-progress-label"><span>Points completed</span><strong>${stats.donePoints}<small> / ${stats.totalPoints}</small></strong></div>
        <div class="dashboard-progress-track"><i style="width:${stats.pointsPercent}%"></i></div>
        <div class="dashboard-progress-foot"><span>${stats.pointsPercent}% complete</span><span>${stats.remainingPoints} remaining</span></div>
      </div>
      <div class="dashboard-progress-pills"><span><i class="dashboard-pill-dot dashboard-tone-brand"></i>${stats.activePoints} in progress</span><span><i class="dashboard-pill-dot dashboard-tone-success"></i>${stats.donePoints} burned</span></div>
      ${sprint ? `<div class="dashboard-sprint-mini"><div class="dashboard-sprint-mini-top"><span><i class="fa-solid fa-flag-checkered"></i> ${Utils.escapeHTML(sprint.sprint.name)}</span><span>${Utils.escapeHTML(sprint.schedule)}</span></div><div class="dashboard-progress-track dashboard-sprint-track"><i style="width:${sprint.percent}%"></i></div><div class="dashboard-progress-foot"><span>${sprint.done} of ${sprint.total} tasks</span><span>${sprint.percent}% complete</span></div>${sprint.sprint.goal ? `<p class="dashboard-sprint-goal">${Utils.escapeHTML(sprint.sprint.goal)}</p>` : ''}</div>` : `<div class="dashboard-sprint-empty"><i class="fa-regular fa-calendar"></i><span>No active sprint</span></div>`}
    </section>`;
  },

  renderProjectChart(stats) {
    const projects = stats.portfolio;
    return `<section class="dashboard-chart-panel dashboard-project-panel">
      <div class="dashboard-panel-heading"><span class="dashboard-panel-icon dashboard-panel-icon-blue"><i class="fa-solid fa-folder-tree"></i></span><div><h3>Projects</h3><p>Completion across your portfolio</p></div><strong class="dashboard-panel-total">${projects.length}</strong></div>
      ${projects.length ? `<div class="dashboard-project-chart">${projects.map(item => {
        const color = /^#[0-9a-f]{3,8}$/i.test(item.project.color || '') ? item.project.color : 'var(--accent-primary)';
        return `<div class="dashboard-project-row"><div class="dashboard-project-row-top"><span class="dashboard-project-name"><i style="--project-color:${color}"></i>${Utils.escapeHTML(item.project.name)}</span><strong>${item.percent}%</strong></div><div class="dashboard-project-track"><i style="width:${item.percent}%;--project-color:${color}"></i></div><span class="dashboard-project-meta">${item.done} of ${item.total} tasks complete</span></div>`;
      }).join('')}</div>` : `<div class="dashboard-chart-empty"><i class="fa-regular fa-folder-open"></i><span>No projects yet</span></div>`}
    </section>`;
  },

  renderAllMetrics(stats) {
    const items = [
      ['Delivery', 'Total tasks', stats.total],
      ['Delivery', 'Completed', stats.completed],
      ['Delivery', 'Completion', `${stats.completion}%`],
      ['Delivery', 'Open tasks', stats.open],
      ['Delivery', 'Completed in 24h', stats.completedRecently],
      ['Delivery', 'Focus score', `${stats.focusScore}/99`],
      ['Delivery', 'Activity streak', `${stats.streak} days`],
      ['Planning', 'Remaining today', Utils.formatMinutes(stats.todayRemaining)],
      ['Planning', 'Queued next 2 days', stats.queued],
      ['Workload', 'Open work estimate', `${stats.estimatedHours}h · ${stats.workload}`],
      ['Story points', 'Completed', `${stats.donePoints}/${stats.totalPoints} (${stats.pointsPercent}%)`],
      ['Story points', 'In progress', stats.activePoints],
      ['Story points', 'Remaining', stats.remainingPoints],
      ['Risk & quality', 'Needs attention', stats.attention],
      ['Risk & quality', 'Blocked', stats.blocked],
      ['Risk & quality', 'Overdue', stats.overdue],
      ['Risk & quality', 'Critical priority', stats.critical],
      ['Risk & quality', 'Open bugs', `${stats.openBugs}/${stats.bugTotal}`],
      ['Risk & quality', 'Quality index', `${stats.quality}%`],
      ...Object.entries(stats.statusCounts).map(([label, value]) => ['Workflow', label, value]),
      ...Object.entries(stats.typeCounts).map(([label, value]) => ['Work types', label, value])
    ];
    if (stats.sprintStats) {
      const sprint = stats.sprintStats;
      items.push(['Active sprint', 'Name', Utils.escapeHTML(sprint.sprint.name)], ['Active sprint', 'Schedule', Utils.escapeHTML(sprint.schedule)], ['Active sprint', 'Tasks', `${sprint.done}/${sprint.total} (${sprint.percent}%)`], ['Active sprint', 'Points burned', `${sprint.donePoints}/${sprint.points}`], ['Active sprint', 'In progress', sprint.active]);
      if (sprint.sprint.goal) items.push(['Active sprint', 'Goal', Utils.escapeHTML(sprint.sprint.goal)]);
    } else items.push(['Active sprint', 'Status', 'No active sprint']);
    stats.portfolio.forEach(item => items.push(['Projects', Utils.escapeHTML(item.project.name), `${item.done}/${item.total} tasks · ${item.percent}%`]));
    if (!stats.portfolio.length) items.push(['Projects', 'Portfolio', 'No projects yet']);

    return `<details class="dashboard-all-metrics"><summary><span><i class="fa-solid fa-chart-pie"></i> All metrics</span><span class="dashboard-details-hint">Full breakdown <i class="fa-solid fa-chevron-down"></i></span></summary><div class="dashboard-metric-table">${items.map(([category, label, value]) => `<div class="dashboard-metric-row"><span>${category}</span><strong>${label}</strong><span>${value}</span></div>`).join('')}</div></details>`;
  }
};
