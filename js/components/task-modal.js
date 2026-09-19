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
    const defaultSprint = defaultProps.sprintId || '';
    const defaultType = defaultProps.type || (defaultProps.parentId ? 'subtask' : 'task');
    const parentTask = defaultProps.parentId ? AppState.tasks.find(t => t.id === defaultProps.parentId) : null;
    const isSubtaskDefault = defaultType === 'subtask' || !!parentTask;

    const modalBody = `
      <form id="create-task-form">
        ${parentTask ? `
          <div style="padding: 8px 12px; background: var(--accent-primary-subtle); border-radius: var(--radius-sm); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; font-size: 12px;">
            <i class="fa-solid fa-network-wired" style="color: var(--accent-primary);"></i>
            <span>Creating Subtask for: <strong>${parentTask.key} - ${Utils.escapeHTML(parentTask.title)}</strong></span>
          </div>
        ` : ''}

        <input type="hidden" id="task-create-parent" value="${defaultProps.parentId || ''}">

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
              <option value="task" ${defaultType === 'task' ? 'selected' : ''}>Task</option>
              <option value="subtask" ${defaultType === 'subtask' ? 'selected' : ''}>Subtask</option>
              <option value="story" ${defaultType === 'story' ? 'selected' : ''}>Story</option>
              <option value="bug" ${defaultType === 'bug' ? 'selected' : ''}>Bug</option>
              <option value="epic" ${defaultType === 'epic' ? 'selected' : ''}>Epic</option>
              <option value="improvement" ${defaultType === 'improvement' ? 'selected' : ''}>Improvement</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Sprint</label>
            <select id="task-create-sprint" class="form-select">
              <option value="">None (Backlog Pool)</option>
              ${AppState.sprints.map(s => `<option value="${s.id}" ${s.id === defaultSprint ? 'selected' : ''}>${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]</option>`).join('')}
            </select>
          </div>

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
        </div>

        <div class="form-row">
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

          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="task-create-due" class="form-input">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Story Points</label>
            <input type="number" id="task-create-points" class="form-input" min="0" max="100" placeholder="e.g. 5" value="${isSubtaskDefault ? '1' : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Estimated Time (minutes)</label>
            <input type="number" id="task-create-estimate" class="form-input" min="0" placeholder="120">
          </div>
        </div>

        <!-- Collapsible Advanced Settings -->
        <details style="margin-top: 10px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
          <summary style="cursor: pointer; font-weight: 600; font-size: 12px; color: var(--accent-primary); margin-bottom: 10px;">
            Advanced Options (Description, Labels)
          </summary>
          
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="task-create-desc" class="form-textarea" placeholder="Add detailed context, criteria, or steps..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Labels (comma-separated)</label>
            <input type="text" id="task-create-labels" class="form-input" placeholder="frontend, urgent, bug">
          </div>
        </details>
      </form>
    `;

    Modal.open({
      title: `<i class="fa-solid ${parentTask ? 'fa-network-wired' : 'fa-plus-circle'}" style="color: var(--accent-primary);"></i> ${parentTask ? 'Create New Subtask' : 'Create New Task'}`,
      body: modalBody,
      size: 'lg',
      footerButtons: [
        {
          text: 'Cancel',
          class: 'btn-secondary',
          onClick: () => Modal.close()
        },
        {
          text: parentTask ? 'Create Subtask' : 'Create Task',
          class: 'btn-primary',
          onClick: () => {
            const form = document.getElementById('create-task-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const rawLabels = document.getElementById('task-create-labels') ? document.getElementById('task-create-labels').value : '';
            const labelsArray = rawLabels.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);

            const parentIdVal = document.getElementById('task-create-parent') ? document.getElementById('task-create-parent').value : null;
            const sprintIdVal = document.getElementById('task-create-sprint') ? document.getElementById('task-create-sprint').value : null;
            const typeVal = document.getElementById('task-create-type').value;
            const isSubtask = typeVal === 'subtask' || !!parentIdVal || !!defaultProps.parentId;
            const pointsVal = document.getElementById('task-create-points') ? document.getElementById('task-create-points').value : '';
            const storyPoints = pointsVal !== '' ? (parseInt(pointsVal, 10) || 0) : (isSubtask ? 1 : 0);

            const taskData = {
              title: document.getElementById('task-create-title').value,
              projectId: document.getElementById('task-create-project').value,
              parentId: parentIdVal || defaultProps.parentId || null,
              sprintId: sprintIdVal || defaultProps.sprintId || null,
              type: typeVal,
              status: document.getElementById('task-create-status').value,
              priority: document.getElementById('task-create-priority').value,
              dueDate: document.getElementById('task-create-due').value ? new Date(document.getElementById('task-create-due').value).toISOString() : null,
              storyPoints: storyPoints,
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

    const typeSelect = document.getElementById('task-create-type');
    const pointsInput = document.getElementById('task-create-points');
    if (typeSelect && pointsInput) {
      typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'subtask' && (!pointsInput.value || pointsInput.value === '0')) {
          pointsInput.value = '1';
        }
      });
    }
  },

  /**
   * Opens the Bulk Create modal for creating multiple tasks/stories/bugs at once
   * with shared common parameters and a title template + count.
   */
  openBulkCreate(defaultProps = {}) {
    if (AppState.projects.length === 0) {
      Modal.open({
        title: '<i class="fa-solid fa-folder-plus" style="color: var(--accent-primary);"></i> Project Required',
        body: '<p style="font-size: 14px; color: var(--text-primary); line-height: 1.5;">You need at least one project before you can bulk create tasks.</p>',
        size: 'sm',
        footerButtons: [
          { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
          { text: 'Create First Project', class: 'btn-primary', onClick: () => { Modal.close(); ProjectsView.openCreateModal(); } }
        ]
      });
      return;
    }

    const defaultProj = defaultProps.projectId || AppState.selectedProjectId || (AppState.projects[0] ? AppState.projects[0].id : '');
    const defaultType = defaultProps.type || 'task';
    const defaultStatus = defaultProps.status || 'todo';

    const modalBody = `
      <form id="bulk-create-form" style="display: flex; flex-direction: column; gap: 16px;">
        
        <div style="display: flex; gap: 6px; background: var(--bg-surface-elevated); border-radius: var(--radius-md); padding: 4px;">
          <button type="button" id="bulk-mode-template" class="btn btn-sm" style="flex: 1; font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: var(--radius-sm); background: var(--accent-primary); color: #fff; border: none; cursor: pointer; transition: all 0.15s ease;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Template + Count
          </button>
          <button type="button" id="bulk-mode-multiline" class="btn btn-sm" style="flex: 1; font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); border: none; cursor: pointer; transition: all 0.15s ease;">
            <i class="fa-solid fa-list-ul"></i> Multi-line (One per line)
          </button>
        </div>

        <div id="bulk-template-section">
          <div style="display: flex; gap: 10px; align-items: flex-end;">
            <div style="flex: 1;">
              <label class="form-label">Title Template <span class="required">*</span></label>
              <input type="text" id="bulk-title-template" class="form-input" placeholder='e.g. "Design page {}" or "Setup module {}"' autofocus>
              <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 3px;">
                Use <code style="background: var(--bg-surface-elevated); padding: 1px 5px; border-radius: 3px; font-size: 11px;">{}</code> as a number placeholder, or it auto-appends.
              </span>
            </div>
            <div style="width: 90px;">
              <label class="form-label">Count</label>
              <input type="number" id="bulk-count" class="form-input" min="1" max="50" value="3" style="text-align: center;">
            </div>
          </div>
        </div>

        <div id="bulk-multiline-section" style="display: none;">
          <label class="form-label">Task Titles (one per line) <span class="required">*</span></label>
          <textarea id="bulk-multiline-input" class="form-textarea" rows="6" placeholder="Enter each task title on a new line:&#10;Design homepage layout&#10;Implement user authentication&#10;Write API documentation&#10;Setup CI/CD pipeline"></textarea>
          <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 3px;">Each non-empty line becomes a separate task.</span>
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--accent-primary); margin-bottom: 10px; letter-spacing: 0.3px; text-transform: uppercase;">
            <i class="fa-solid fa-sliders"></i> Common Parameters (applied to all)
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Project <span class="required">*</span></label>
              <select id="bulk-project" class="form-select">
                ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === defaultProj ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Issue Type</label>
              <select id="bulk-type" class="form-select">
                <option value="task" ${defaultType === 'task' ? 'selected' : ''}>Task</option>
                <option value="story" ${defaultType === 'story' ? 'selected' : ''}>Story</option>
                <option value="bug" ${defaultType === 'bug' ? 'selected' : ''}>Bug</option>
                <option value="epic" ${defaultType === 'epic' ? 'selected' : ''}>Epic</option>
                <option value="improvement" ${defaultType === 'improvement' ? 'selected' : ''}>Improvement</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sprint</label>
              <select id="bulk-sprint" class="form-select">
                <option value="">None (Backlog Pool)</option>
                ${AppState.sprints.map(s => `<option value="${s.id}">${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="bulk-status" class="form-select">
                <option value="backlog" ${defaultStatus === 'backlog' ? 'selected' : ''}>Backlog</option>
                <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
                <option value="inprogress" ${defaultStatus === 'inprogress' ? 'selected' : ''}>In Progress</option>
                <option value="inreview" ${defaultStatus === 'inreview' ? 'selected' : ''}>In Review</option>
                <option value="done" ${defaultStatus === 'done' ? 'selected' : ''}>Done</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="bulk-priority" class="form-select">
                <option value="critical">Critical</option>
                <option value="highest">Highest</option>
                <option value="high">High</option>
                <option value="medium" selected>Medium</option>
                <option value="low">Low</option>
                <option value="lowest">Lowest</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Story Points</label>
              <input type="number" id="bulk-points" class="form-input" min="0" max="100" placeholder="e.g. 3" value="">
            </div>
          </div>

          <details style="margin-top: 6px;">
            <summary style="cursor: pointer; font-weight: 600; font-size: 12px; color: var(--accent-primary); margin-bottom: 8px;">
              More Options (Labels, Due Date, Description)
            </summary>
            <div class="form-row" style="margin-top: 8px;">
              <div class="form-group">
                <label class="form-label">Labels (comma-separated)</label>
                <input type="text" id="bulk-labels" class="form-input" placeholder="frontend, urgent, sprint-3">
              </div>
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" id="bulk-due" class="form-input">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Shared Description</label>
              <textarea id="bulk-description" class="form-textarea" rows="2" placeholder="Common description applied to all created items..."></textarea>
            </div>
          </details>
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-eye"></i> Preview
            <span id="bulk-preview-count" style="font-size: 11px; background: var(--accent-primary-subtle); color: var(--accent-primary); padding: 1px 8px; border-radius: var(--radius-full); font-weight: 700;">0 items</span>
          </div>
          <div id="bulk-preview-list" style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding: 8px; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-size: 12px; color: var(--text-muted); padding: 6px; text-align: center;">
              <i class="fa-solid fa-circle-info"></i> Enter a template and count to see preview
            </div>
          </div>
        </div>
      </form>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Bulk Create Tasks',
      body: modalBody,
      size: 'lg',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        { text: '<i class="fa-solid fa-bolt"></i> Create All', class: 'btn-primary', onClick: () => this._executeBulkCreate() }
      ]
    });

    // Wire up mode switching
    const modeTemplateBtn = document.getElementById('bulk-mode-template');
    const modeMultilineBtn = document.getElementById('bulk-mode-multiline');
    const templateSection = document.getElementById('bulk-template-section');
    const multilineSection = document.getElementById('bulk-multiline-section');
    let currentMode = 'template';

    const setMode = (mode) => {
      currentMode = mode;
      if (mode === 'template') {
        modeTemplateBtn.style.background = 'var(--accent-primary)';
        modeTemplateBtn.style.color = '#fff';
        modeMultilineBtn.style.background = 'transparent';
        modeMultilineBtn.style.color = 'var(--text-secondary)';
        templateSection.style.display = '';
        multilineSection.style.display = 'none';
      } else {
        modeMultilineBtn.style.background = 'var(--accent-primary)';
        modeMultilineBtn.style.color = '#fff';
        modeTemplateBtn.style.background = 'transparent';
        modeTemplateBtn.style.color = 'var(--text-secondary)';
        templateSection.style.display = 'none';
        multilineSection.style.display = '';
      }
      updatePreview();
    };

    modeTemplateBtn.addEventListener('click', () => setMode('template'));
    modeMultilineBtn.addEventListener('click', () => setMode('multiline'));

    // Live preview
    const templateInput = document.getElementById('bulk-title-template');
    const countInput = document.getElementById('bulk-count');
    const multilineInput = document.getElementById('bulk-multiline-input');
    const previewList = document.getElementById('bulk-preview-list');
    const previewCount = document.getElementById('bulk-preview-count');
    const typeSelect = document.getElementById('bulk-type');

    const getTypeIcon = (type) => {
      const icons = {
        task: '<i class="fa-solid fa-check-square" style="color: #4da3ff;"></i>',
        story: '<i class="fa-solid fa-book-open" style="color: #10b981;"></i>',
        bug: '<i class="fa-solid fa-bug" style="color: #ff6b6b;"></i>',
        epic: '<i class="fa-solid fa-bolt" style="color: #e879f9;"></i>',
        improvement: '<i class="fa-solid fa-arrow-up-right-dots" style="color: #f0b429;"></i>'
      };
      return icons[type] || icons.task;
    };

    const updatePreview = () => {
      let items = [];
      if (currentMode === 'template') {
        const tmpl = templateInput ? templateInput.value.trim() : '';
        const cnt = countInput ? parseInt(countInput.value, 10) || 1 : 1;
        if (tmpl) items = this.generateBulkItems(tmpl, cnt);
      } else {
        const txt = multilineInput ? multilineInput.value : '';
        items = txt.split('\n').map(l => l.trim()).filter(Boolean);
      }

      const tp = typeSelect ? typeSelect.value : 'task';
      const icon = getTypeIcon(tp);
      previewCount.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '');

      if (items.length === 0) {
        previewList.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 6px; text-align: center;"><i class="fa-solid fa-circle-info"></i> ' + (currentMode === 'template' ? 'Enter a template and count to see preview' : 'Enter task titles (one per line)') + '</div>';
        return;
      }

      previewList.innerHTML = items.slice(0, 50).map((title, i) => `
        <div style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 12px;">
          ${icon}
          <span style="color: var(--text-muted); font-weight: 700; min-width: 20px;">${i + 1}.</span>
          <span style="color: var(--text-primary); font-weight: 500;">${Utils.escapeHTML(title)}</span>
        </div>
      `).join('');
    };

    if (templateInput) templateInput.addEventListener('input', updatePreview);
    if (countInput) countInput.addEventListener('input', updatePreview);
    if (multilineInput) multilineInput.addEventListener('input', updatePreview);
    if (typeSelect) typeSelect.addEventListener('change', updatePreview);

    this._bulkCurrentMode = () => currentMode;
  },

  /**
   * Executes the bulk creation from the Bulk Create modal
   * @private
   */
  _executeBulkCreate() {
    const currentMode = this._bulkCurrentMode ? this._bulkCurrentMode() : 'template';
    let titles = [];

    if (currentMode === 'template') {
      const templateEl = document.getElementById('bulk-title-template');
      const countEl = document.getElementById('bulk-count');
      const template = templateEl ? templateEl.value.trim() : '';
      const count = countEl ? parseInt(countEl.value, 10) || 1 : 1;
      if (!template) { Toast.warning('Please enter a title template.'); return; }
      titles = this.generateBulkItems(template, count);
    } else {
      const textEl = document.getElementById('bulk-multiline-input');
      const text = textEl ? textEl.value : '';
      titles = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (titles.length === 0) { Toast.warning('Please enter at least one task title.'); return; }
    }

    if (titles.length === 0) { Toast.warning('No tasks to create.'); return; }

    const projectId = document.getElementById('bulk-project')?.value || (AppState.projects[0] ? AppState.projects[0].id : '');
    const type = document.getElementById('bulk-type')?.value || 'task';
    const sprintId = document.getElementById('bulk-sprint')?.value || null;
    const status = document.getElementById('bulk-status')?.value || 'todo';
    const priority = document.getElementById('bulk-priority')?.value || 'medium';
    const pointsEl = document.getElementById('bulk-points');
    const pointsVal = pointsEl ? pointsEl.value : '';
    const storyPoints = pointsVal !== '' ? (parseInt(pointsVal, 10) || 0) : 0;
    const rawLabels = document.getElementById('bulk-labels')?.value || '';
    const labels = rawLabels.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
    const dueEl = document.getElementById('bulk-due');
    const dueDate = dueEl && dueEl.value ? new Date(dueEl.value).toISOString() : null;
    const descEl = document.getElementById('bulk-description');
    const description = descEl ? descEl.value : '';

    const created = [];
    titles.forEach(title => {
      const task = AppState.createTask({
        title, projectId, type, sprintId, status, priority,
        storyPoints, labels: [...labels], dueDate, description
      });
      created.push(task);
    });

    Modal.close();
    Toast.success(`${created.length} ${type}${created.length !== 1 ? 's' : ''} created successfully!`);
    if (window.Router && Router.renderCurrentRoute) Router.renderCurrentRoute();
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
    const parentTask = task.parentId ? AppState.tasks.find(t => t.id === task.parentId) : null;

    const isMerged = !!task.mergeChecklistAndSubtasks;

    const checklist = Array.isArray(task.checklist) ? task.checklist : [];
    const totalChecklist = checklist.length;
    const completedChecklist = checklist.filter(c => c.completed).length;
    const chkPct = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(t => t.status === 'done').length;
    const stPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    const clubbedItems = AppState.getClubbedItems(task.id);
    const totalMerged = clubbedItems.length;
    const completedMerged = clubbedItems.filter(i => i.completed).length;
    const mergedPct = totalMerged > 0 ? Math.round((completedMerged / totalMerged) * 100) : 0;

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

      ${parentTask ? `
        <!-- Parent Task Banner -->
        <div style="padding: 8px 20px; background: var(--accent-primary-subtle); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-network-wired" style="color: var(--accent-primary);"></i>
            <span style="color: var(--text-secondary);">Subtask of:</span>
            <a href="javascript:void(0)" id="drawer-parent-task-link" style="color: var(--accent-primary); font-weight: 600; text-decoration: underline;">
              ${parentTask.key} — ${Utils.escapeHTML(parentTask.title)}
            </a>
          </div>
          <span class="badge badge-status-${parentTask.status}" style="font-size: 10px; padding: 1px 6px;">${parentTask.status}</span>
        </div>
      ` : ''}

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

          ${!isMerged ? `
            <!-- PART 1: CHECKLIST SECTION (SEPARATE) -->
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; font-size: 13px;">
                    <i class="fa-regular fa-square-check" style="color: var(--accent-primary);"></i> Part 1: Checklist (${completedChecklist}/${totalChecklist})
                  </span>
                  <span style="font-size: 12px; font-weight: 600; color: ${chkPct === 100 && totalChecklist > 0 ? 'var(--accent-success)' : 'var(--text-muted)'};">
                    ${chkPct}%
                  </span>
                </div>
                <button id="btn-toggle-merge-view" class="btn-toggle-merge" title="Merge Checklist and Subtasks into a single view">
                  <i class="fa-solid fa-arrows-split-up-and-left fa-rotate-90"></i> Merge Lists
                </button>
              </div>

              <!-- Checklist Progress Bar -->
              <div class="progress-bar-container" style="margin-bottom: 12px; height: 5px;">
                <div class="progress-bar-fill" style="width: ${chkPct}%; background: ${chkPct === 100 && totalChecklist > 0 ? 'var(--accent-success)' : 'var(--accent-primary)'};"></div>
              </div>

              <!-- Checklist Items List -->
              <div id="checklist-items-container" style="display: flex; flex-direction: column; gap: 6px;">
                ${totalChecklist === 0 ? `
                  <div style="font-size: 12px; color: var(--text-muted); padding: 4px 0;">No checklist items yet. Add quick steps below.</div>
                ` : checklist.map(item => `
                  <div class="chk-item-row" data-id="${item.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 12px; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                      <input type="checkbox" class="chk-item-toggle" data-id="${item.id}" ${item.completed ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px; accent-color: var(--accent-success);" title="Mark complete">
                      <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${item.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}" title="${Utils.escapeHTML(item.text)}">
                        ${Utils.escapeHTML(item.text)}
                      </span>
                    </div>
                    <button class="btn btn-ghost btn-sm chk-item-del" data-id="${item.id}" title="Delete item" style="padding: 2px 6px; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                  </div>
                `).join('')}
              </div>

              <!-- Add Checklist Item Bar (bulk: use {} placeholder + count) -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input type="text" id="new-checklist-input" class="form-input" placeholder="e.g. Design task {}" style="font-size: 12px; padding: 6px 10px; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                    <label style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">×</label>
                    <input type="number" id="new-checklist-count" class="form-input" min="1" max="50" value="1" style="width: 52px; font-size: 12px; padding: 6px 6px; text-align: center;">
                  </div>
                  <button id="btn-add-checklist" class="btn btn-primary btn-sm" style="font-size: 11px; height: 30px; white-space: nowrap;">
                    <i class="fa-solid fa-plus"></i> Add
                  </button>
                </div>
                <span style="font-size: 10px; color: var(--text-muted);"><i class="fa-solid fa-lightbulb" style="color: var(--accent-warning);"></i> Bulk: use <code style='background:var(--bg-surface-active);padding:1px 4px;border-radius:3px;'>{}</code> as placeholder &amp; set count. E.g. "Step {}" × 3 → Step 1, Step 2, Step 3</span>
              </div>
            </div>

            <!-- PART 2: SUBTASKS (SUBLIST) SECTION (SEPARATE) -->
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; font-size: 13px;">
                    <i class="fa-solid fa-network-wired" style="color: var(--accent-primary);"></i> Part 2: Subtasks (${completedSubtasks}/${totalSubtasks})
                  </span>
                  <span style="font-size: 12px; font-weight: 600; color: ${stPct === 100 && totalSubtasks > 0 ? 'var(--accent-success)' : 'var(--text-muted)'};">
                    ${stPct}%
                  </span>
                </div>
                <button id="btn-toggle-merge-view-2" class="btn-toggle-merge" title="Merge Checklist and Subtasks into a single view">
                  <i class="fa-solid fa-arrows-split-up-and-left fa-rotate-90"></i> Merge Lists
                </button>
              </div>

              <!-- Subtasks Progress Bar -->
              <div class="progress-bar-container" style="margin-bottom: 12px; height: 5px;">
                <div class="progress-bar-fill" style="width: ${stPct}%; background: ${stPct === 100 && totalSubtasks > 0 ? 'var(--accent-success)' : 'var(--accent-primary)'};"></div>
              </div>

              <!-- Subtasks List -->
              <div id="subtasks-items-container" style="display: flex; flex-direction: column; gap: 6px;">
                ${totalSubtasks === 0 ? `
                  <div style="font-size: 12px; color: var(--text-muted); padding: 4px 0;">No subtasks yet. Add child subtasks below.</div>
                ` : subtasks.map(st => `
                  <div class="subtask-item-row" data-id="${st.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 12px; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                      <input type="checkbox" class="subtask-item-toggle" data-id="${st.id}" ${st.status === 'done' ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px; accent-color: var(--accent-success);" title="Mark complete">
                      <span class="subtask-open-link" data-id="${st.id}" style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-primary); cursor: pointer;" title="Open subtask detail">${st.key}</span>
                      <span class="subtask-open-link" data-id="${st.id}" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; ${st.status === 'done' ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}" title="${Utils.escapeHTML(st.title)}">
                        ${Utils.escapeHTML(st.title)}
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="badge" style="font-size: 9px; padding: 1px 6px; background: var(--bg-surface-active); color: var(--accent-primary); font-weight: 600;" title="Story Points">${st.storyPoints !== undefined && st.storyPoints !== null ? st.storyPoints : 1} pts</span>
                      <span class="badge badge-status-${st.status}" style="font-size: 9px; padding: 1px 5px;">${st.status}</span>
                      <button class="btn btn-ghost btn-sm subtask-item-del" data-id="${st.id}" title="Delete subtask" style="padding: 2px 6px; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Add Subtask Bar (bulk: use {} placeholder + count) -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input type="text" id="new-subtask-input" class="form-input" placeholder="e.g. Implement feature {}" style="font-size: 12px; padding: 6px 10px; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                    <label style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">×</label>
                    <input type="number" id="new-subtask-count" class="form-input" min="1" max="50" value="1" style="width: 52px; font-size: 12px; padding: 6px 6px; text-align: center;">
                  </div>
                  <button id="btn-add-subtask" class="btn btn-primary btn-sm" style="font-size: 11px; height: 30px; white-space: nowrap;">
                    <i class="fa-solid fa-plus"></i> Add
                  </button>
                </div>
                <span style="font-size: 10px; color: var(--text-muted);"><i class="fa-solid fa-lightbulb" style="color: var(--accent-warning);"></i> Bulk: use <code style='background:var(--bg-surface-active);padding:1px 4px;border-radius:3px;'>{}</code> as placeholder &amp; set count. E.g. "Task {}" × 5 → Task 1, Task 2 … Task 5</span>
              </div>
            </div>
          ` : `
            <!-- MERGED CHECKLIST & SUBTASKS SECTION -->
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; font-size: 13px;">
                    <i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Merged Checklist & Subtasks (${completedMerged}/${totalMerged})
                  </span>
                  <span style="font-size: 12px; font-weight: 600; color: ${mergedPct === 100 && totalMerged > 0 ? 'var(--accent-success)' : 'var(--text-muted)'};">
                    ${mergedPct}%
                  </span>
                </div>
                <button id="btn-toggle-merge-view" class="btn-toggle-merge" title="Separate into two independent sections">
                  <i class="fa-solid fa-arrows-split-up-and-left"></i> Separate into 2 Lists
                </button>
              </div>

              <!-- Progress Bar -->
              <div class="progress-bar-container" style="margin-bottom: 12px; height: 5px;">
                <div class="progress-bar-fill" style="width: ${mergedPct}%; background: ${mergedPct === 100 && totalMerged > 0 ? 'var(--accent-success)' : 'var(--accent-primary)'};"></div>
              </div>

              <!-- Merged Items List -->
              <div id="merged-items-container" style="display: flex; flex-direction: column; gap: 6px;">
                ${totalMerged === 0 ? `
                  <div style="font-size: 12px; color: var(--text-muted); padding: 4px 0;">No items yet. Add subtasks or checklist items below.</div>
                ` : clubbedItems.map(item => `
                  <div class="merged-item-row" data-id="${item.id}" data-is-subtask="${item.isSubtask}" style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 12px; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                      <input type="checkbox" class="merged-item-toggle" data-id="${item.id}" data-is-subtask="${item.isSubtask}" ${item.completed ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px; accent-color: var(--accent-success);" title="Mark complete">
                      
                      ${item.key ? `
                        <span class="subtask-open-link" data-id="${item.subtaskId || item.id}" style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-primary); cursor: pointer;" title="Open subtask detail">${item.key}</span>
                      ` : `
                        <span style="font-size: 10px; color: var(--text-muted); background: var(--bg-surface-elevated); padding: 1px 5px; border-radius: 3px;" title="Checklist item"><i class="fa-regular fa-square-check"></i></span>
                      `}
                      
                      <span class="${item.key ? 'subtask-open-link' : ''}" data-id="${item.subtaskId || item.id}" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${item.key ? 'cursor: pointer;' : ''} ${item.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}" title="${Utils.escapeHTML(item.title)}">
                        ${Utils.escapeHTML(item.title)}
                      </span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px;">
                      ${item.isSubtask ? `
                        <span class="badge" style="font-size: 9px; padding: 1px 6px; background: var(--accent-primary-subtle); color: var(--accent-primary);" title="Tracked Subtask"><i class="fa-solid fa-network-wired"></i> Subtask</span>
                        <span class="badge" style="font-size: 9px; padding: 1px 6px; background: var(--bg-surface-active); color: var(--accent-primary); font-weight: 600;" title="Story Points">${item.storyPoints !== undefined && item.storyPoints !== null ? item.storyPoints : 1} pts</span>
                        ${item.status ? `<span class="badge badge-status-${item.status}" style="font-size: 9px; padding: 1px 5px;">${item.status}</span>` : ''}
                      ` : `
                        <span class="badge" style="font-size: 9px; padding: 1px 6px; background: var(--bg-surface-active); color: var(--text-muted);" title="Checklist step"><i class="fa-regular fa-square-check"></i> Checklist</span>
                      `}

                      <button class="btn btn-ghost btn-sm merged-item-del" data-id="${item.id}" data-is-subtask="${item.isSubtask}" title="Delete item" style="padding: 2px 6px; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Merged Inline Creator Bar (bulk: use {} placeholder + count) -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <input type="text" id="merged-new-input" class="form-input" placeholder="e.g. Review item {}" style="font-size: 12px; padding: 6px 10px; flex: 1; min-width: 160px;">
                  <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                    <label style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">×</label>
                    <input type="number" id="merged-new-count" class="form-input" min="1" max="50" value="1" style="width: 52px; font-size: 12px; padding: 6px 6px; text-align: center;">
                  </div>
                  <select id="merged-new-type" class="form-select" style="width: auto; padding: 4px 8px; font-size: 11px; height: 30px;">
                    <option value="checklist">Checklist</option>
                    <option value="subtask">Subtask</option>
                  </select>
                  <button id="merged-btn-add" class="btn btn-primary btn-sm" style="font-size: 11px; height: 30px; white-space: nowrap;">
                    <i class="fa-solid fa-plus"></i> Add
                  </button>
                </div>
                <span style="font-size: 10px; color: var(--text-muted);"><i class="fa-solid fa-lightbulb" style="color: var(--accent-warning);"></i> Bulk: use <code style='background:var(--bg-surface-active);padding:1px 4px;border-radius:3px;'>{}</code> as placeholder &amp; set count. E.g. "Item {}" × 4 → Item 1, Item 2, Item 3, Item 4</span>
              </div>

              <!-- Utility Actions -->
              <div style="display: flex; gap: 12px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap;">
                <button id="btn-merge-chk-to-subtasks" class="btn btn-ghost btn-xs" style="color: var(--text-muted); font-size: 11px;" title="Convert unlinked checklist items to child subtasks">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Convert Checklist to Subtasks
                </button>
                <button id="btn-merge-subtasks-to-chk" class="btn btn-ghost btn-xs" style="color: var(--text-muted); font-size: 11px;" title="Import child subtasks into checklist">
                  <i class="fa-solid fa-arrow-down-to-bracket"></i> Import Subtasks to Checklist
                </button>
              </div>
            </div>
          `}

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

          <!-- Sprint Property -->
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-person-running" style="color: var(--accent-warning);"></i> Sprint</label>
            <select id="detail-task-sprint" class="form-select">
              <option value="">None (Backlog Pool)</option>
              ${AppState.sprints.map(s => `
                <option value="${s.id}" ${task.sprintId === s.id ? 'selected' : ''}>
                  ${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Epic Property -->
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-bolt" style="color: var(--accent-purple);"></i> Epic</label>
            <select id="detail-task-epic" class="form-select">
              <option value="">None</option>
              ${AppState.epics.map(e => `
                <option value="${e.id}" ${task.epicId === e.id ? 'selected' : ''}>
                  ${Utils.escapeHTML(e.title)}
                </option>
              `).join('')}
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
            <input type="number" id="detail-task-points" class="form-input" min="0" value="${task.storyPoints !== undefined && task.storyPoints !== null ? task.storyPoints : (task.type === 'subtask' ? 1 : 0)}">
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

    // Parent Task link navigation
    const parentLink = document.getElementById('drawer-parent-task-link');
    if (parentLink && task.parentId) {
      parentLink.addEventListener('click', () => {
        this.openDetail(task.parentId);
      });
    }

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
      const res = AppState.updateTask(taskId, { status: e.target.value });
      if (!res) {
        e.target.value = task.status;
      }
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

    // Sprint Property Change
    const sprintSelect = document.getElementById('detail-task-sprint');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { sprintId: e.target.value || null });
      });
    }

    // Epic Property Change
    const epicSelect = document.getElementById('detail-task-epic');
    if (epicSelect) {
      epicSelect.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { epicId: e.target.value || null });
      });
    }

    // --- Toggle Merge / Separate View ---
    document.querySelectorAll('#btn-toggle-merge-view, #btn-toggle-merge-view-2').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.toggleMergeChecklistAndSubtasks(taskId);
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    // --- Subtask Link Navigation ---
    document.querySelectorAll('.subtask-open-link').forEach(el => {
      el.addEventListener('click', () => {
        const stId = el.dataset.id;
        const actualId = stId.startsWith('chk_task_') ? stId.replace('chk_', '') : stId;
        this.openDetail(actualId);
      });
    });

    // --- SEPARATE MODE: Checklist Event Listeners ---
    document.querySelectorAll('.chk-item-toggle').forEach(chk => {
      chk.addEventListener('change', () => {
        const itemId = chk.dataset.id;
        const isDone = chk.checked;
        const list = (task.checklist || []).map(c => c.id === itemId ? { ...c, completed: isDone } : c);
        AppState.updateTask(taskId, { checklist: list });
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    document.querySelectorAll('.chk-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        const list = (task.checklist || []).filter(c => c.id !== itemId);
        AppState.updateTask(taskId, { checklist: list });
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    const addChkBtn = document.getElementById('btn-add-checklist');
    const newChkInput = document.getElementById('new-checklist-input');
    const newChkCount = document.getElementById('new-checklist-count');
    const handleAddChecklist = () => {
      const template = newChkInput ? newChkInput.value.trim() : '';
      if (!template) return;
      const count = newChkCount ? parseInt(newChkCount.value, 10) || 1 : 1;
      const items = this.generateBulkItems(template, count);
      if (items.length === 0) return;
      const list = [...(task.checklist || [])];
      items.forEach(text => {
        list.push({
          id: Utils.generateId('chk_'),
          text,
          completed: false
        });
      });
      AppState.updateTask(taskId, { checklist: list });
      Toast.success(items.length > 1 ? `${items.length} checklist items added` : 'Checklist item added');
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

    // --- SEPARATE MODE: Subtasks Event Listeners ---
    document.querySelectorAll('.subtask-item-toggle').forEach(chk => {
      chk.addEventListener('change', () => {
        const stId = chk.dataset.id;
        const isDone = chk.checked;
        AppState.updateTask(stId, { status: isDone ? 'done' : 'todo' });
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    document.querySelectorAll('.subtask-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const stId = btn.dataset.id;
        AppState.deleteTask(stId, true, false);
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    const addStBtn = document.getElementById('btn-add-subtask');
    const newStInput = document.getElementById('new-subtask-input');
    const newStCount = document.getElementById('new-subtask-count');
    const handleAddSubtask = () => {
      const template = newStInput ? newStInput.value.trim() : '';
      if (!template) return;
      const count = newStCount ? parseInt(newStCount.value, 10) || 1 : 1;
      const items = this.generateBulkItems(template, count);
      if (items.length === 0) return;
      let lastCreated = null;
      items.forEach(title => {
        lastCreated = AppState.createTask({
          title,
          parentId: taskId,
          projectId: task.projectId,
          sprintId: task.sprintId,
          epicId: task.epicId,
          type: 'subtask',
          status: 'todo',
          priority: task.priority || 'medium',
          storyPoints: 1
        });
      });
      Toast.success(items.length > 1 ? `${items.length} subtasks created` : `Subtask ${lastCreated.key} created`);
      const drawer = document.getElementById('task-drawer');
      const updated = AppState.tasks.find(t => t.id === taskId);
      this.renderDrawerContent(drawer, updated);
    };
    if (addStBtn && newStInput) {
      addStBtn.addEventListener('click', handleAddSubtask);
      newStInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddSubtask();
        }
      });
    }

    // --- MERGED MODE: Items Event Listeners ---
    document.querySelectorAll('.merged-item-toggle').forEach(chk => {
      chk.addEventListener('change', () => {
        const itemId = chk.dataset.id;
        const isSubtask = chk.dataset.isSubtask === 'true';
        const isDone = chk.checked;

        if (isSubtask) {
          const actualId = itemId.startsWith('chk_task_') ? itemId.replace('chk_', '') : itemId;
          AppState.updateTask(actualId, { status: isDone ? 'done' : 'todo' });
        }

        if (Array.isArray(task.checklist)) {
          let chkChanged = false;
          const updatedList = task.checklist.map(c => {
            if (c.id === itemId || c.subtaskId === itemId || ('chk_' + c.subtaskId) === itemId) {
              chkChanged = true;
              return { ...c, completed: isDone };
            }
            return c;
          });
          if (chkChanged) {
            AppState.updateTask(taskId, { checklist: updatedList });
          }
        }

        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    document.querySelectorAll('.merged-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        const isSubtask = btn.dataset.isSubtask === 'true';

        if (isSubtask) {
          const actualId = itemId.startsWith('chk_task_') ? itemId.replace('chk_', '') : itemId;
          AppState.deleteTask(actualId, true, false);
        }

        if (Array.isArray(task.checklist)) {
          const updatedList = task.checklist.filter(c => !(c.id === itemId || c.subtaskId === itemId || ('chk_' + c.subtaskId) === itemId));
          if (updatedList.length !== task.checklist.length) {
            AppState.updateTask(taskId, { checklist: updatedList });
          }
        }

        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    const addMergedBtn = document.getElementById('merged-btn-add');
    const newMergedInput = document.getElementById('merged-new-input');
    const newMergedCount = document.getElementById('merged-new-count');
    const newMergedType = document.getElementById('merged-new-type');

    const handleAddMerged = () => {
      const template = newMergedInput ? newMergedInput.value.trim() : '';
      if (!template) return;
      const count = newMergedCount ? parseInt(newMergedCount.value, 10) || 1 : 1;
      const items = this.generateBulkItems(template, count);
      if (items.length === 0) return;
      const itemType = newMergedType ? newMergedType.value : 'checklist';

      if (itemType === 'subtask') {
        items.forEach(title => {
          AppState.createTask({
            title,
            parentId: taskId,
            projectId: task.projectId,
            sprintId: task.sprintId,
            epicId: task.epicId,
            type: 'subtask',
            status: 'todo',
            priority: task.priority || 'medium',
            storyPoints: 1
          });
        });
        Toast.success(items.length > 1 ? `${items.length} subtasks created` : 'Subtask created');
      } else {
        const list = [...(task.checklist || [])];
        items.forEach(text => {
          list.push({
            id: Utils.generateId('chk_'),
            text,
            completed: false
          });
        });
        AppState.updateTask(taskId, { checklist: list });
        Toast.success(items.length > 1 ? `${items.length} checklist items added` : 'Checklist item added');
      }

      newMergedInput.value = '';
      const drawer = document.getElementById('task-drawer');
      const updated = AppState.tasks.find(t => t.id === taskId);
      this.renderDrawerContent(drawer, updated);
    };

    if (addMergedBtn && newMergedInput) {
      addMergedBtn.addEventListener('click', handleAddMerged);
      newMergedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddMerged();
        }
      });
    }

    // Merged data consolidation buttons
    const btnChkToSub = document.getElementById('btn-merge-chk-to-subtasks');
    if (btnChkToSub) {
      btnChkToSub.addEventListener('click', () => {
        const count = AppState.mergeChecklistToSubtasks(taskId);
        Toast.success(`Converted ${count} checklist item(s) to subtasks`);
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    }

    const btnSubToChk = document.getElementById('btn-merge-subtasks-to-chk');
    if (btnSubToChk) {
      btnSubToChk.addEventListener('click', () => {
        const count = AppState.mergeSubtasksToChecklist(taskId);
        Toast.success(`Imported ${count} subtask(s) into checklist`);
        const drawer = document.getElementById('task-drawer');
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
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
  },

  /**
   * Generates an array of item names from a template and count.
   * If the template contains '{}', it replaces it with the number (1, 2, 3...).
   * If count is 1, returns the template as-is (with {} removed if present).
   * 
   * Examples:
   *   generateBulkItems("Design task {}", 3)  → ["Design task 1", "Design task 2", "Design task 3"]
   *   generateBulkItems("Module {} setup", 4) → ["Module 1 setup", "Module 2 setup", "Module 3 setup", "Module 4 setup"]
   *   generateBulkItems("Buy groceries", 1)   → ["Buy groceries"]
   *   generateBulkItems("Task", 5)            → ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"]
   * 
   * @param {string} template - The text template, optionally containing '{}'
   * @param {number} count - Number of items to generate (1-50)
   * @returns {string[]} Array of generated item strings
   */
  generateBulkItems(template, count) {
    if (!template || !template.trim()) return [];
    const text = template.trim();
    const n = Math.min(50, Math.max(1, count || 1));

    // If count is 1, just return the template (clean up any stray {})
    if (n === 1) {
      return [text.replace(/\{\}/g, '').replace(/\s{2,}/g, ' ').trim() || text];
    }

    // If template contains {}, replace with number
    const hasPlaceholder = text.includes('{}');
    const items = [];
    for (let i = 1; i <= n; i++) {
      if (hasPlaceholder) {
        items.push(text.replace(/\{\}/g, String(i)));
      } else {
        // No placeholder — append number at the end
        items.push(`${text} ${i}`);
      }
    }
    return items;
  }
};
