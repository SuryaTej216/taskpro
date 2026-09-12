/**
 * TaskForge - Task Create Modal & Jira-Style Detail Slide-Over Drawer
 */

const TaskModal = {
  isOpen: false,
  currentTaskId: null,
  activeTimerInterval: null,

  /**
   * Opens Quick/Advanced Task Creation Modal
   */
  openCreate(defaultProps = {}) {
    if (AppState.projects.length === 0) {
      Modal.open({
        title: '<i class="fa-solid fa-folder-plus" style="color: var(--accent-primary);"></i> Project Required',
        body: `
          <p style="font-size: 14px; color: var(--text-primary); line-height: 1.5; margin-bottom: 12px;">
            In TaskForge, every task belongs to a project to manage issue keys (e.g. <code>WEB-1</code>) and workflows.
          </p>
          <p style="font-size: 13px; color: var(--text-secondary);">
            Let's create your first project to get started!
          </p>
        `,
        size: 'sm',
        footerButtons: [
          { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
          {
            text: 'Create First Project',
            class: 'btn-primary',
            onClick: () => {
              Modal.close();
              ProjectsView.openCreateModal();
            }
          }
        ]
      });
      return;
    }

    const defaultProj = defaultProps.projectId || AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : '');
    const defaultStatus = defaultProps.status || 'todo';

    const modalBody = `
      <form id="create-task-form">
        <div class="form-group">
          <label class="form-label">Title <span class="required">*</span></label>
          <input type="text" id="task-create-title" class="form-input" placeholder="What needs to be done?" required autofocus>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Project <span class="required">*</span></label>
            <select id="task-create-project" class="form-select">
              ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === defaultProj ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Issue Type</label>
            <select id="task-create-type" class="form-select">
              <option value="task" selected>Task</option>
              <option value="story">Story</option>
              <option value="bug">Bug</option>
              <option value="epic">Epic</option>
              <option value="improvement">Improvement</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="task-create-status" class="form-select">
              <option value="backlog" ${defaultStatus === 'backlog' ? 'selected' : ''}>Backlog</option>
              <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="inprogress" ${defaultStatus === 'inprogress' ? 'selected' : ''}>In Progress</option>
              <option value="inreview" ${defaultStatus === 'inreview' ? 'selected' : ''}>In Review</option>
              <option value="done" ${defaultStatus === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="task-create-priority" class="form-select">
              <option value="critical">Critical</option>
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
              <option value="lowest">Lowest</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="task-create-due" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">Story Points</label>
            <input type="number" id="task-create-points" class="form-input" min="0" max="100" placeholder="e.g. 5">
          </div>
        </div>

        <!-- Collapsible Advanced Settings -->
        <details style="margin-top: 10px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
          <summary style="cursor: pointer; font-weight: 600; font-size: 12px; color: var(--accent-primary); margin-bottom: 10px;">
            Advanced Options (Description, Labels, Estimate)
          </summary>
          
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="task-create-desc" class="form-textarea" placeholder="Add detailed context, criteria, or steps..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Labels (comma-separated)</label>
              <input type="text" id="task-create-labels" class="form-input" placeholder="frontend, urgent, bug">
            </div>
            <div class="form-group">
              <label class="form-label">Estimated Time (minutes)</label>
              <input type="number" id="task-create-estimate" class="form-input" min="0" placeholder="120">
            </div>
          </div>
        </details>
      </form>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-plus-circle" style="color: var(--accent-primary);"></i> Create New Task',
      body: modalBody,
      size: 'lg',
      footerButtons: [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          onClick: () => Modal.close()
        },
        {
          text: 'Create Task',
          class: 'btn-primary',
          onClick: () => {
            const form = document.getElementById('create-task-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const rawLabels = document.getElementById('task-create-labels') ? document.getElementById('task-create-labels').value : '';
            const labelsArray = rawLabels.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);

            const taskData = {
              title: document.getElementById('task-create-title').value,
              projectId: document.getElementById('task-create-project').value,
              type: document.getElementById('task-create-type').value,
              status: document.getElementById('task-create-status').value,
              priority: document.getElementById('task-create-priority').value,
              dueDate: document.getElementById('task-create-due').value ? new Date(document.getElementById('task-create-due').value).toISOString() : null,
              storyPoints: parseInt(document.getElementById('task-create-points').value, 10) || 0,
              description: document.getElementById('task-create-desc') ? document.getElementById('task-create-desc').value : '',
              labels: labelsArray,
              estimate: document.getElementById('task-create-estimate') ? parseInt(document.getElementById('task-create-estimate').value, 10) || 0 : 0
            };

            const created = AppState.createTask(taskData);
            Modal.close();
            Toast.success(`Created task ${created.key}`);
          }
        }
      ]
    });
  },

  /**
   * Opens the full Jira-style Task Detail Slide-over Panel
   * @param {string} taskId 
   */
  openDetail(taskId) {
    this.currentTaskId = taskId;
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;

    const overlay = document.getElementById('task-drawer-overlay');
    const drawer = document.getElementById('task-drawer');
    if (!overlay || !drawer) return;

    this.renderDrawerContent(drawer, task);
    overlay.classList.add('active');
    this.isOpen = true;
  },

  closeDetail() {
    const overlay = document.getElementById('task-drawer-overlay');
    if (overlay) overlay.classList.remove('active');
    this.isOpen = false;
    this.currentTaskId = null;
    if (this.activeTimerInterval) {
      clearInterval(this.activeTimerInterval);
      this.activeTimerInterval = null;
    }
  },

  /**
   * Renders the complete Task Detail UI into drawer
   * @param {HTMLElement} drawer 
   * @param {Object} task 
   */
  renderDrawerContent(drawer, task) {
    const project = AppState.projects.find(p => p.id === task.projectId) || { name: 'Unknown', key: 'PRJ' };
    const taskComments = AppState.comments.filter(c => c.taskId === task.id);
    const taskActivities = AppState.activity.filter(a => a.taskId === task.id);
    const subtasks = AppState.tasks.filter(t => t.parentId === task.id);

    const completedChecklist = task.checklist ? task.checklist.filter(c => c.completed).length : 0;
    const totalChecklist = task.checklist ? task.checklist.length : 0;
    const checkPct = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

    drawer.innerHTML = `
      <!-- Drawer Header -->
      <div style="padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="type-icon type-${task.type}" title="${task.type}"><i class="fa-solid fa-cube"></i></span>
          <span style="font-family: var(--font-mono); font-weight: 700; font-size: 14px; color: var(--text-primary);">${task.key}</span>
          <span style="color: var(--text-muted); font-size: 13px;">in ${Utils.escapeHTML(project.name)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="drawer-btn-focus" class="btn btn-secondary btn-sm" title="Open in Focus Mode">
            <i class="fa-solid fa-bullseye" style="color: var(--accent-danger);"></i> Focus
          </button>
          <button id="drawer-btn-duplicate" class="btn btn-ghost btn-sm" title="Duplicate Task">
            <i class="fa-regular fa-copy"></i>
          </button>
          <button id="drawer-btn-delete" class="btn btn-ghost btn-sm" style="color: var(--accent-danger);" title="Delete Task">
            <i class="fa-regular fa-trash-can"></i>
          </button>
          <button id="drawer-btn-close" class="btn-icon" title="Close (Esc)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- Drawer Body: Two Column Responsive Grid -->
      <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: row; flex-wrap: wrap;">
        
        <!-- Left Main Content Column -->
        <div style="flex: 1; min-width: 320px; padding: 24px; border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Task Title Input -->
          <div>
            <input type="text" id="detail-task-title" value="${Utils.escapeHTML(task.title)}" class="form-input" style="font-size: 18px; font-weight: 700; background: transparent; border-color: transparent; padding: 4px 8px;" placeholder="Task Title...">
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-align-left"></i> Description</label>
            <textarea id="detail-task-desc" class="form-textarea" style="min-height: 100px;" placeholder="Add detailed requirements or notes...">${Utils.escapeHTML(task.description || '')}</textarea>
          </div>

          <!-- Checklist Section -->
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: 600; font-size: 13px;"><i class="fa-regular fa-square-check"></i> Checklist (${completedChecklist}/${totalChecklist})</span>
              <span style="font-size: 12px; font-weight: 600; color: var(--accent-success);">${checkPct}%</span>
            </div>
            
            <div class="progress-bar-container" style="margin-bottom: 12px;">
              <div class="progress-bar-fill" style="width: ${checkPct}%;"></div>
            </div>

            <div id="checklist-items-container" style="display: flex; flex-direction: column; gap: 6px;">
              ${(task.checklist || []).map((item, idx) => `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                  <input type="checkbox" class="chk-item-toggle" data-index="${idx}" ${item.completed ? 'checked' : ''} style="cursor: pointer;">
                  <span style="flex: 1; ${item.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${Utils.escapeHTML(item.text)}</span>
                  <button class="btn btn-ghost btn-sm chk-item-del" data-index="${idx}" style="padding: 2px 6px; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                </div>
              `).join('')}
            </div>

            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <input type="text" id="new-checklist-input" class="form-input" placeholder="Add checklist item..." style="font-size: 12px; padding: 6px 10px;">
              <button id="btn-add-checklist" class="btn btn-secondary btn-sm">Add</button>
            </div>
          </div>

          <!-- Subtasks Section -->
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: 600; font-size: 13px;"><i class="fa-solid fa-network-wired"></i> Subtasks (${subtasks.length})</span>
              <button id="btn-create-subtask" class="btn btn-ghost btn-sm" style="font-size: 11px;"><i class="fa-solid fa-plus"></i> New Subtask</button>
            </div>

            <div id="subtasks-list-container" style="display: flex; flex-direction: column; gap: 6px;">
              ${subtasks.length === 0 ? `<div style="font-size: 12px; color: var(--text-muted);">No subtasks yet. Break down complex work.</div>` : ''}
              ${subtasks.map(st => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--bg-app); border-radius: var(--radius-sm); font-size: 12px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-family: var(--font-mono); font-weight: 600;">${st.key}</span>
                    <span>${Utils.escapeHTML(st.title)}</span>
                  </div>
                  <span class="badge badge-status-${st.status}">${st.status}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Activity & Comments Tabbed Section -->
          <div>
            <div style="display: flex; gap: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 14px;">
              <span id="tab-btn-comments" style="font-weight: 600; font-size: 13px; color: var(--accent-primary); cursor: pointer;"><i class="fa-regular fa-comment"></i> Comments (${taskComments.length})</span>
              <span id="tab-btn-activity" style="font-weight: 600; font-size: 13px; color: var(--text-muted); cursor: pointer;"><i class="fa-solid fa-clock-rotate-left"></i> History (${taskActivities.length})</span>
            </div>

            <!-- Comments Area -->
            <div id="tab-content-comments">
              <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
                ${taskComments.length === 0 ? `<div style="font-size: 12px; color: var(--text-muted);">No comments yet.</div>` : ''}
                ${taskComments.map(c => `
                  <div style="padding: 10px 12px; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                      <span style="font-weight: 600; color: var(--text-primary);">Surya Tej</span>
                      <span>${Utils.formatRelativeDate(c.createdAt)}</span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-primary);">${Utils.escapeHTML(c.text)}</div>
                  </div>
                `).join('')}
              </div>

              <!-- Add Comment Input -->
              <div style="display: flex; gap: 8px;">
                <input type="text" id="detail-new-comment" class="form-input" placeholder="Write a comment..." style="font-size: 13px;">
                <button id="btn-post-comment" class="btn btn-primary btn-sm">Comment</button>
              </div>
            </div>

            <!-- Activity History Area (Hidden by default) -->
            <div id="tab-content-activity" style="display: none; display: flex; flex-direction: column; gap: 8px;">
              ${taskActivities.map(a => `
                <div style="display: flex; gap: 10px; font-size: 12px; color: var(--text-secondary);">
                  <i class="fa-solid fa-circle-dot" style="color: var(--accent-primary); font-size: 8px; margin-top: 5px;"></i>
                  <div style="flex: 1;">
                    <span style="color: var(--text-primary); font-weight: 500;">${Utils.escapeHTML(a.details)}</span>
                    <span style="color: var(--text-muted); font-size: 11px; margin-left: 6px;">${Utils.formatRelativeDate(a.timestamp)}</span>
                  </div>
                </div>
              `).join('')}
            </div>

          </div>

        </div>

        <!-- Right Properties Sidebar Column -->
        <div style="width: 280px; padding: 20px; background: var(--bg-surface); display: flex; flex-direction: column; gap: 16px;">
          
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="detail-task-status" class="form-select">
              <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
              <option value="inreview" ${task.status === 'inreview' ? 'selected' : ''}>In Review</option>
              <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
              <option value="blocked" ${task.status === 'blocked' ? 'selected' : ''}>Blocked</option>
              <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="detail-task-priority" class="form-select">
              <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Critical</option>
              <option value="highest" ${task.priority === 'highest' ? 'selected' : ''}>Highest</option>
              <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="lowest" ${task.priority === 'lowest' ? 'selected' : ''}>Lowest</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Project</label>
            <select id="detail-task-project" class="form-select">
              ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === task.projectId ? 'selected' : ''}>${Utils.escapeHTML(p.name)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="detail-task-due" class="form-input" value="${Utils.toDateInputValue(task.dueDate)}">
          </div>

          <div class="form-group">
            <label class="form-label">Story Points</label>
            <input type="number" id="detail-task-points" class="form-input" min="0" value="${task.storyPoints || 0}">
          </div>

          <!-- Time Tracking Widget -->
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px;">
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 8px;"><i class="fa-solid fa-stopwatch"></i> Time Tracking</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
              <span>Tracked: <strong>${Utils.formatMinutes(task.trackedTime)}</strong></span>
              <span>Est: <strong>${Utils.formatMinutes(task.estimate)}</strong></span>
            </div>
            <div style="display: flex; gap: 6px;">
              <button id="btn-timer-toggle" class="btn btn-secondary btn-sm" style="flex: 1;">
                <i class="fa-solid fa-play"></i> Start Timer
              </button>
              <button id="btn-log-time" class="btn btn-ghost btn-sm" title="Log time manually">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
            </div>
          </div>

          <!-- Recurring Settings -->
          <div class="form-group">
            <label class="form-label">Recurrence</label>
            <select id="detail-task-recurring" class="form-select">
              <option value="">None (One-time)</option>
              <option value="daily" ${task.recurring && task.recurring.frequency === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekly" ${task.recurring && task.recurring.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
              <option value="monthly" ${task.recurring && task.recurring.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
            </select>
          </div>

        </div>

      </div>
    `;

    this.attachDrawerListeners(task);
  },

  /**
   * Binds events to elements inside the task drawer
   * @param {Object} task 
   */
  attachDrawerListeners(task) {
    const taskId = task.id;

    // Close button
    document.getElementById('drawer-btn-close').addEventListener('click', () => this.closeDetail());

    // Duplicate button
    document.getElementById('drawer-btn-duplicate').addEventListener('click', () => {
      this.closeDetail();
      AppState.duplicateTask(taskId);
    });

    // Delete button
    document.getElementById('drawer-btn-delete').addEventListener('click', () => {
      this.closeDetail();
      AppState.deleteTask(taskId, true, true);
    });

    // Focus button
    document.getElementById('drawer-btn-focus').addEventListener('click', () => {
      this.closeDetail();
      window.location.hash = `#/focus?task=${taskId}`;
    });

    // Real-time title update on blur / enter
    const titleInput = document.getElementById('detail-task-title');
    titleInput.addEventListener('change', () => {
      if (titleInput.value.trim()) {
        AppState.updateTask(taskId, { title: titleInput.value.trim() });
      }
    });

    // Description update on change
    const descInput = document.getElementById('detail-task-desc');
    descInput.addEventListener('change', () => {
      AppState.updateTask(taskId, { description: descInput.value });
    });

    // Property dropdown changes
    document.getElementById('detail-task-status').addEventListener('change', (e) => {
      AppState.updateTask(taskId, { status: e.target.value });
    });
    document.getElementById('detail-task-priority').addEventListener('change', (e) => {
      AppState.updateTask(taskId, { priority: e.target.value });
    });
    document.getElementById('detail-task-project').addEventListener('change', (e) => {
      AppState.updateTask(taskId, { projectId: e.target.value });
    });
    document.getElementById('detail-task-due').addEventListener('change', (e) => {
      const val = e.target.value ? new Date(e.target.value).toISOString() : null;
      AppState.updateTask(taskId, { dueDate: val });
    });
    document.getElementById('detail-task-points').addEventListener('change', (e) => {
      AppState.updateTask(taskId, { storyPoints: parseInt(e.target.value, 10) || 0 });
    });
    document.getElementById('detail-task-recurring').addEventListener('change', (e) => {
      const freq = e.target.value;
      AppState.updateTask(taskId, { recurring: freq ? { frequency: freq } : null });
    });

    // Checklist toggling
    document.querySelectorAll('.chk-item-toggle').forEach(chk => {
      chk.addEventListener('change', () => {
        const idx = parseInt(chk.dataset.index, 10);
        const list = [...(task.checklist || [])];
        if (list[idx]) {
          list[idx].completed = chk.checked;
          AppState.updateTask(taskId, { checklist: list });
          const drawer = document.getElementById('task-drawer');
          const updated = AppState.tasks.find(t => t.id === taskId);
          this.renderDrawerContent(drawer, updated);
        }
      });
    });

    // Checklist deletion
    document.querySelectorAll('.chk-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const list = [...(task.checklist || [])];
        list.splice(idx, 1);
        AppState.updateTask(taskId, { checklist: list });
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    // Add Checklist Item
    const addChkBtn = document.getElementById('btn-add-checklist');
    const newChkInput = document.getElementById('new-checklist-input');
    const handleAddChecklist = () => {
      const text = newChkInput.value.trim();
      if (!text) return;
      const list = [...(task.checklist || []), { id: Utils.generateId('chk_'), text, completed: false }];
      AppState.updateTask(taskId, { checklist: list });
      const drawer = document.getElementById('task-drawer');
      const updated = AppState.tasks.find(t => t.id === taskId);
      this.renderDrawerContent(drawer, updated);
    };
    if (addChkBtn && newChkInput) {
      addChkBtn.addEventListener('click', handleAddChecklist);
      newChkInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddChecklist();
        }
      });
    }

    // Add Comment
    const postCommBtn = document.getElementById('btn-post-comment');
    const newCommInput = document.getElementById('detail-new-comment');
    const handlePostComment = () => {
      const text = newCommInput.value.trim();
      if (!text) return;
      AppState.addComment(taskId, text);
      const drawer = document.getElementById('task-drawer');
      const updated = AppState.tasks.find(t => t.id === taskId);
      this.renderDrawerContent(drawer, updated);
    };
    if (postCommBtn && newCommInput) {
      postCommBtn.addEventListener('click', handlePostComment);
      newCommInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handlePostComment();
        }
      });
    }

    // Tab Switching for Comments / Activity
    const tabComments = document.getElementById('tab-btn-comments');
    const tabActivity = document.getElementById('tab-btn-activity');
    const contentComments = document.getElementById('tab-content-comments');
    const contentActivity = document.getElementById('tab-content-activity');

    if (tabComments && tabActivity) {
      tabComments.addEventListener('click', () => {
        tabComments.style.color = 'var(--accent-primary)';
        tabActivity.style.color = 'var(--text-muted)';
        contentComments.style.display = 'block';
        contentActivity.style.display = 'none';
      });
      tabActivity.addEventListener('click', () => {
        tabActivity.style.color = 'var(--accent-primary)';
        tabComments.style.color = 'var(--text-muted)';
        contentComments.style.display = 'none';
        contentActivity.style.display = 'flex';
      });
    }

    // Timer Start / Pause
    const timerBtn = document.getElementById('btn-timer-toggle');
    if (timerBtn) {
      let isRunning = false;
      timerBtn.addEventListener('click', () => {
        isRunning = !isRunning;
        if (isRunning) {
          timerBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Timer';
          timerBtn.className = 'btn btn-primary btn-sm';
          this.activeTimerInterval = setInterval(() => {
            const current = AppState.tasks.find(t => t.id === taskId);
            if (current) {
              AppState.updateTask(taskId, { trackedTime: (current.trackedTime || 0) + 1 });
            }
          }, 60000); // Increment 1 min
          Toast.info('Time tracking started');
        } else {
          timerBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Timer';
          timerBtn.className = 'btn btn-secondary btn-sm';
          if (this.activeTimerInterval) clearInterval(this.activeTimerInterval);
        }
      });
    }
  }
};
