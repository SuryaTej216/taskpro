/**
 * TaskForge - Kanban Board View
 * Features: Native HTML5 Drag and Drop across status columns, Story Points rollup, Quick Filter Bar
 */

const BoardView = {
  columns: [
    { id: 'backlog', title: 'Backlog', icon: 'fa-box-archive' },
    { id: 'todo', title: 'To Do', icon: 'fa-circle' },
    { id: 'inprogress', title: 'In Progress', icon: 'fa-circle-play' },
    { id: 'inreview', title: 'In Review', icon: 'fa-eye' },
    { id: 'done', title: 'Done', icon: 'fa-circle-check' }
  ],

  render(container) {
    const activeTasks = FilterManager.filterTasks(AppState.tasks);
    const selectedProject = AppState.projects.find(p => p.id === AppState.selectedProjectId);

    container.innerHTML = `
      <div class="view-page" style="display: flex; flex-direction: column; height: 100%;">
        
        <!-- Board Header & Quick Filters -->
        <div class="view-header" style="margin-bottom: 16px;">
          <div class="view-title-group">
            <h1>
              <i class="fa-solid fa-table-columns" style="color: var(--accent-primary);"></i>
              <span>${selectedProject ? Utils.escapeHTML(selectedProject.name) : 'All Projects'} Board</span>
            </h1>
            <p>Drag and drop cards across lifecycle states to update workflow progress.</p>
          </div>

          <div class="view-actions">
            <!-- Sprint Filter Quick Select -->
            <select id="board-sprint-filter" class="form-select" style="width: auto; padding: 6px 12px; font-size: 12px;">
              <option value="">All Sprints</option>
              ${AppState.sprints.map(s => `
                <option value="${s.id}" ${AppState.activeFilters.sprintId === s.id ? 'selected' : ''}>
                  ${s.status === 'active' ? '⚡ ' : ''}${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]
                </option>
              `).join('')}
            </select>

            <!-- Project Filter Quick Select -->
            <select id="board-project-filter" class="form-select" style="width: auto; padding: 6px 12px; font-size: 12px;">
              <option value="">All Projects</option>
              ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === AppState.selectedProjectId ? 'selected' : ''}>${Utils.escapeHTML(p.name)}</option>`).join('')}
            </select>

            <!-- Priority Quick Select -->
            <select id="board-priority-filter" class="form-select" style="width: auto; padding: 6px 12px; font-size: 12px;">
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button id="board-btn-create" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>

        <!-- Saved Views Quick Pills -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">Views:</span>
          ${FilterManager.savedViews.map(sv => `
            <button class="btn btn-sm ${FilterManager.activeViewId === sv.id ? 'btn-secondary' : 'btn-ghost'}" onclick="FilterManager.applySavedView('${sv.id}')" style="font-size: 12px;">
              <i class="fa-solid ${sv.icon}"></i> ${sv.name}
            </button>
          `).join('')}
        </div>

        <!-- Kanban Columns Container -->
        <div class="board-container" id="kanban-columns-container">
          ${this.columns.map(col => {
            const colTasks = activeTasks.filter(t => t.status === col.id);
            const totalPoints = colTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
            return `
              <div class="board-column" data-status="${col.id}">
                <div class="board-column-header">
                  <div class="board-column-title">
                    <i class="fa-solid ${col.icon}"></i>
                    <span>${col.title}</span>
                    <span class="column-task-count">${colTasks.length}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${totalPoints > 0 ? `<span class="badge" title="Total Story Points" style="background: var(--bg-surface-elevated); color: var(--text-muted); font-size: 10px;">${totalPoints} pts</span>` : ''}
                    <button class="btn btn-ghost btn-sm col-quick-add" data-status="${col.id}" title="Add task to ${col.title}" style="padding: 2px 6px;">
                      <i class="fa-solid fa-plus"></i>
                    </button>
                  </div>
                </div>
                <div class="board-column-body" data-status="${col.id}">
                  <!-- Cards appended dynamically -->
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    this.attachListeners(container, activeTasks);
  },

  attachListeners(container, activeTasks) {
    // 1. Populate cards into column bodies
    this.columns.forEach(col => {
      const body = container.querySelector(`.board-column-body[data-status="${col.id}"]`);
      if (!body) return;

      const colTasks = activeTasks.filter(t => t.status === col.id);
      if (colTasks.length === 0) {
        body.innerHTML = `
          <div style="padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: 12px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); margin-top: 4px;">
            No tasks in ${col.title}
          </div>
        `;
      } else {
        colTasks.forEach(task => {
          const cardEl = TaskCard.render(task);
          body.appendChild(cardEl);
        });
      }

      // 2. Drag over / drop listeners on columns
      body.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        body.classList.add('drag-over');
      });

      body.addEventListener('dragleave', () => {
        body.classList.remove('drag-over');
      });

      body.addEventListener('drop', (e) => {
        e.preventDefault();
        body.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
          const task = AppState.tasks.find(t => t.id === taskId);
          if (task && task.status !== col.id) {
            const res = AppState.updateTask(taskId, { status: col.id });
            if (res) {
              Toast.info(`Moved ${task.key} to ${col.title}`);
            } else {
              this.render(container);
            }
          }
        }
      });
    });

    // 3. Quick create buttons in column headers
    container.querySelectorAll('.col-quick-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status;
        TaskModal.openCreate({ status });
      });
    });

    // 4. Header create button
    const createBtn = container.querySelector('#board-btn-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => TaskModal.openCreate());
    }

    // 5. Sprint filter change
    const sprintSelect = container.querySelector('#board-sprint-filter');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', (e) => {
        AppState.activeFilters.sprintId = e.target.value || null;
        this.render(container);
      });
    }

    // 6. Project filter change
    const projSelect = container.querySelector('#board-project-filter');
    if (projSelect) {
      projSelect.addEventListener('change', (e) => {
        AppState.selectedProjectId = e.target.value || null;
        this.render(container);
      });
    }

    // 7. Priority filter change
    const prioSelect = container.querySelector('#board-priority-filter');
    if (prioSelect) {
      prioSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        AppState.activeFilters.priority = val ? [val] : [];
        this.render(container);
      });
    }
  }
};
