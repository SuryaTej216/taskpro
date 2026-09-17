/**
 * TaskForge - List & Data Table View
 * Features: High-density sortable data grid, Multi-select checkboxes, Floating Bulk Actions Toolbar
 */

const ListView = {
  selectedTaskIds: new Set(),
  sortField: 'key',
  sortAsc: true,

  render(container) {
    let tasks = FilterManager.filterTasks(AppState.tasks);

    // Apply sorting
    tasks.sort((a, b) => {
      let valA = a[this.sortField] || '';
      let valB = b[this.sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });

    const isAllSelected = tasks.length > 0 && tasks.every(t => this.selectedTaskIds.has(t.id));

    container.innerHTML = `
      <div class="view-page" style="display: flex; flex-direction: column; height: 100%;">
        <!-- View Header -->
        <div class="view-header" style="margin-bottom: 16px;">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-list-check" style="color: var(--accent-primary);"></i> Data Grid & Bulk Operations</h1>
            <p>High-density tabular view with sorting, filtering, and bulk workflow updates.</p>
          </div>
          <div class="view-actions">
            <button id="btn-list-create" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-plus"></i> New Task
            </button>
          </div>
        </div>

        <!-- Table Responsive Container -->
        <div class="table-responsive-container" style="flex: 1; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-default); background: var(--bg-surface-elevated); color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase;">
                <th style="padding: 10px 14px; width: 40px; text-align: center;">
                  <input type="checkbox" id="chk-select-all" ${isAllSelected ? 'checked' : ''} style="cursor: pointer;">
                </th>
                <th style="padding: 10px 14px; width: 100px; cursor: pointer;" onclick="ListView.sortBy('key')">
                  Key <i class="fa-solid fa-sort"></i>
                </th>
                <th style="padding: 10px 14px; width: 90px; cursor: pointer;" onclick="ListView.sortBy('type')">
                  Type <i class="fa-solid fa-sort"></i>
                </th>
                <th style="padding: 10px 14px; cursor: pointer;" onclick="ListView.sortBy('title')">
                  Title <i class="fa-solid fa-sort"></i>
                </th>
                <th style="padding: 10px 14px; width: 120px; cursor: pointer;" onclick="ListView.sortBy('status')">
                  Status <i class="fa-solid fa-sort"></i>
                </th>
                <th style="padding: 10px 14px; width: 110px; cursor: pointer;" onclick="ListView.sortBy('priority')">
                  Priority <i class="fa-solid fa-sort"></i>
                </th>
                <th style="padding: 10px 14px; width: 130px; cursor: pointer;" onclick="ListView.sortBy('dueDate')">
                  Due Date <i class="fa-solid fa-sort"></i>
                </th>
                <th style="padding: 10px 14px; width: 70px; text-align: center; cursor: pointer;" onclick="ListView.sortBy('storyPoints')">
                  Pts <i class="fa-solid fa-sort"></i>
                </th>
                <th style="padding: 10px 14px; width: 70px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.length === 0 ? `
                <tr>
                  <td colspan="9" style="padding: 48px 20px; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-list-check" style="font-size: 32px; margin-bottom: 8px; display: block; color: var(--border-strong);"></i>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No Tasks Yet</div>
                    <div style="font-size: 12px; margin-bottom: 12px;">Create tasks to track priorities, story points, and status across your workflow.</div>
                    <button class="btn btn-primary btn-sm" onclick="TaskModal.openCreate()">
                      <i class="fa-solid fa-plus"></i> Create Your First Task
                    </button>
                  </td>
                </tr>
              ` : tasks.map(t => {
      const isSelected = this.selectedTaskIds.has(t.id);
      const parentTask = t.parentId ? AppState.tasks.find(p => p.id === t.parentId) : null;
      const sprint = t.sprintId ? AppState.sprints.find(s => s.id === t.sprintId) : null;
      return `
                  <tr class="table-row ${isSelected ? 'row-selected' : ''}" style="border-bottom: 1px solid var(--border-subtle); transition: background var(--transition-fast); ${isSelected ? 'background: var(--accent-primary-subtle);' : ''}">
                    <td style="padding: 10px 14px; text-align: center;">
                      <input type="checkbox" class="chk-task-row" data-id="${t.id}" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
                    </td>
                    <td style="padding: 10px 14px; font-family: var(--font-mono); font-weight: 600; color: var(--text-muted); cursor: pointer;" onclick="TaskModal.openDetail('${t.id}')">
                      ${t.key}
                    </td>
                    <td style="padding: 10px 14px;">
                      <span class="badge" style="background: var(--bg-surface-elevated); color: var(--text-secondary); text-transform: capitalize;">${t.type}</span>
                    </td>
                    <td style="padding: 10px 14px; font-weight: 500; color: var(--text-primary); cursor: pointer;" onclick="TaskModal.openDetail('${t.id}')">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span>${Utils.escapeHTML(t.title)}</span>
                        ${parentTask ? `<span class="badge" style="background: var(--accent-primary-subtle); color: var(--accent-primary); font-size: 10px;">↳ ${parentTask.key}</span>` : ''}
                        ${sprint ? `<span class="badge" style="background: var(--bg-surface-elevated); color: var(--text-muted); font-size: 10px;"><i class="fa-solid fa-person-running"></i> ${Utils.escapeHTML(sprint.name)}</span>` : ''}
                      </div>
                    </td>
                    <td style="padding: 10px 14px;">
                      <span class="badge badge-status-${t.status}">${t.status}</span>
                    </td>
                    <td style="padding: 10px 14px;">
                      <span class="badge-priority priority-${t.priority}">${t.priority}</span>
                    </td>
                    <td style="padding: 10px 14px; color: ${Utils.isOverdue(t.dueDate, t.status) ? 'var(--accent-danger)' : 'var(--text-secondary)'}; font-size: 12px;">
                      ${t.dueDate ? Utils.formatDate(t.dueDate) : '—'}
                    </td>
                    <td style="padding: 10px 14px; text-align: center; font-weight: 600;">
                      ${t.storyPoints || 0}
                    </td>
                    <td style="padding: 10px 14px; text-align: right;">
                      <button class="btn btn-ghost btn-sm" onclick="TaskModal.openDetail('${t.id}')" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                    </td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Floating Bulk Actions Toolbar (shown when >= 1 task selected) -->
        <div id="bulk-toolbar" style="display: ${this.selectedTaskIds.size > 0 ? 'flex' : 'none'}; position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: var(--bg-surface-elevated); border: 1px solid var(--border-strong); border-radius: var(--radius-full); padding: 8px 18px; box-shadow: var(--shadow-overlay); z-index: 500; align-items: center; gap: 14px; color: var(--text-primary);">
          <span style="font-weight: 600; font-size: 13px;">${this.selectedTaskIds.size} selected</span>
          <div style="height: 18px; width: 1px; background: var(--border-default);"></div>
          
          <!-- Bulk Sprint Dropdown -->
          <select id="bulk-sprint-select" class="form-select" style="width: auto; padding: 4px 8px; font-size: 12px; border-radius: var(--radius-full);">
            <option value="">Assign to Sprint...</option>
            <option value="__backlog__">Backlog Pool (No Sprint)</option>
            ${AppState.sprints.map(s => `<option value="${s.id}">${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]</option>`).join('')}
          </select>

          <!-- Bulk Status Dropdown -->
          <select id="bulk-status-select" class="form-select" style="width: auto; padding: 4px 8px; font-size: 12px; border-radius: var(--radius-full);">
            <option value="">Change Status...</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="inreview">In Review</option>
            <option value="done">Done</option>
          </select>

          <!-- Bulk Priority Dropdown -->
          <select id="bulk-priority-select" class="form-select" style="width: auto; padding: 4px 8px; font-size: 12px; border-radius: var(--radius-full);">
            <option value="">Change Priority...</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <!-- Bulk Delete Button -->
          <button id="btn-bulk-delete" class="btn btn-danger btn-sm" style="border-radius: var(--radius-full);">
            <i class="fa-regular fa-trash-can"></i> Delete
          </button>

          <!-- Clear Selection -->
          <button id="btn-bulk-clear" class="btn btn-ghost btn-sm" style="border-radius: var(--radius-full);">
            Cancel
          </button>
        </div>

      </div>
    `;

    this.attachListeners(container, tasks);
  },

  attachListeners(container, tasks) {
    // Select all checkbox
    const selectAllChk = container.querySelector('#chk-select-all');
    if (selectAllChk) {
      selectAllChk.addEventListener('change', (e) => {
        if (e.target.checked) {
          tasks.forEach(t => this.selectedTaskIds.add(t.id));
        } else {
          this.selectedTaskIds.clear();
        }
        this.render(container);
      });
    }

    // Row checkboxes
    container.querySelectorAll('.chk-task-row').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = chk.dataset.id;
        if (e.target.checked) {
          this.selectedTaskIds.add(id);
        } else {
          this.selectedTaskIds.delete(id);
        }
        this.render(container);
      });
    });

    // Bulk Sprint Change
    const sprintSelect = container.querySelector('#bulk-sprint-select');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        const sprintId = val === '__backlog__' ? null : val;
        const count = this.selectedTaskIds.size;
        this.selectedTaskIds.forEach(id => {
          AppState.updateTask(id, { sprintId });
        });
        Toast.success(`Assigned ${count} tasks to ${sprintId ? 'sprint' : 'backlog pool'}.`);
        this.selectedTaskIds.clear();
        this.render(container);
      });
    }

    // Bulk Status Change
    const statusSelect = container.querySelector('#bulk-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        this.selectedTaskIds.forEach(id => {
          AppState.updateTask(id, { status: val });
        });
        Toast.success(`Updated status for ${this.selectedTaskIds.size} tasks.`);
        this.selectedTaskIds.clear();
        this.render(container);
      });
    }

    // Bulk Priority Change
    const prioSelect = container.querySelector('#bulk-priority-select');
    if (prioSelect) {
      prioSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        this.selectedTaskIds.forEach(id => {
          AppState.updateTask(id, { priority: val });
        });
        Toast.success(`Updated priority for ${this.selectedTaskIds.size} tasks.`);
        this.selectedTaskIds.clear();
        this.render(container);
      });
    }

    // Bulk Delete
    const delBtn = container.querySelector('#btn-bulk-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        const count = this.selectedTaskIds.size;
        Modal.confirm('Bulk Delete Tasks', `Are you sure you want to delete ${count} selected tasks?`, () => {
          this.selectedTaskIds.forEach(id => AppState.deleteTask(id, false, false));
          this.selectedTaskIds.clear();
          Toast.warning(`Deleted ${count} tasks.`);
          this.render(container);
        });
      });
    }

    // Clear bulk selection
    const cancelBtn = container.querySelector('#btn-bulk-clear');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.selectedTaskIds.clear();
        this.render(container);
      });
    }

    const createBtn = container.querySelector('#btn-list-create');
    if (createBtn) createBtn.addEventListener('click', () => TaskModal.openCreate());
  },

  sortBy(field) {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    Router.renderCurrentRoute();
  }
};
