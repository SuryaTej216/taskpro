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
            <label class="form-label">Story Points</label>
            <input type="number" id="task-create-points" class="form-input" min="0" max="100" placeholder="e.g. 5" value="${isSubtaskDefault ? '1' : ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" id="task-create-start" class="form-input" value="${defaultProps.startDate ? Utils.toDateInputValue(defaultProps.startDate) : ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="task-create-due" class="form-input" value="${defaultProps.dueDate ? Utils.toDateInputValue(defaultProps.dueDate) : ''}">
          </div>
        </div>

        <div class="form-row">
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
              startDate: document.getElementById('task-create-start')?.value ? new Date(document.getElementById('task-create-start').value).toISOString() : null,
              dueDate: document.getElementById('task-create-due')?.value ? new Date(document.getElementById('task-create-due').value).toISOString() : null,
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
              <input type="number" id="bulk-count" class="form-input" min="1" value="3" style="text-align: center;">
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
        story: '<i class="fa-solid fa-book-open" style="color: #0BDA51;"></i>',
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

      const displayItems = items.length > 200 ? items.slice(0, 200) : items;
      previewList.innerHTML = displayItems.map((title, i) => `
        <div style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 12px;">
          ${icon}
          <span style="color: var(--text-muted); font-weight: 700; min-width: 20px;">${i + 1}.</span>
          <span style="color: var(--text-primary); font-weight: 500;">${Utils.escapeHTML(title)}</span>
        </div>
      `).join('') + (items.length > 200 ? `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px;">...and ${items.length - 200} more items will be created</div>` : '');
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
   * Opens the full-page professional Task Detail view
   * @param {string} taskId 
   * @param {boolean} updateUrl
   */
  /**
   * Opens the full-page professional Task Detail view
   * @param {string} taskId 
   * @param {boolean} updateUrl
   */
  openDetail(taskId, updateUrl = true) {
    this.currentTaskId = taskId;
    this.ensureSubscriptions();
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (updateUrl && window.location.hash !== `#/task?id=${taskId}`) {
      this.previousHash = window.location.hash || '#/tasks';
      this.previousRoute = AppState.currentView || 'tasks';
      window.location.hash = `#/task?id=${taskId}`;
    }

    const overlay = document.getElementById('task-drawer-overlay');
    const drawer = document.getElementById('task-drawer');
    if (!overlay || !drawer) return;

    try {
      this.renderDrawerContent(drawer, task);
    } catch (err) {
      console.error('Error rendering task detail content:', err);
    }
    overlay.classList.add('active');
    document.body.classList.add('has-modal-open');
    this.isOpen = true;
  },

  ensureSubscriptions() {
    if (this._hasSubscribed) return;
    this._hasSubscribed = true;

    AppState.subscribe('activity:changed', ({ taskId }) => {
      if (this.isOpen && this.currentTaskId && (!taskId || this.currentTaskId === taskId)) {
        const task = AppState.tasks.find(t => t.id === this.currentTaskId);
        if (task) this.updateActivitySection(task);
      }
    });

    AppState.subscribe('comments:changed', ({ taskId }) => {
      if (this.isOpen && this.currentTaskId && (!taskId || this.currentTaskId === taskId)) {
        const task = AppState.tasks.find(t => t.id === this.currentTaskId);
        if (task) this.updateActivitySection(task);
      }
    });

    AppState.subscribe('tasks:changed', ({ action, task }) => {
      if (this.isOpen && this.currentTaskId) {
        const currentTask = AppState.tasks.find(t => t.id === this.currentTaskId);
        if (currentTask) {
          this.syncTaskHeaderAndAttributes(currentTask);
        }
      }
    });
  },

  getAuditMeta(action) {
    switch (action) {
      case 'created':
        return { icon: 'fa-solid fa-plus', cls: 'audit-marker-created' };
      case 'status_changed':
      case 'completed':
        return { icon: 'fa-solid fa-arrows-spin', cls: 'audit-marker-status' };
      case 'priority_changed':
        return { icon: 'fa-solid fa-flag', cls: 'audit-marker-priority' };
      case 'sprint_changed':
        return { icon: 'fa-solid fa-person-running', cls: 'audit-marker-sprint' };
      case 'time_logged':
        return { icon: 'fa-solid fa-stopwatch', cls: 'audit-marker-time' };
      case 'comment_added':
        return { icon: 'fa-solid fa-comment-dots', cls: 'audit-marker-comment' };
      case 'comment_deleted':
        return { icon: 'fa-regular fa-comment-slash', cls: 'audit-marker-comment' };
      case 'checklist_added':
        return { icon: 'fa-solid fa-list-check', cls: 'audit-marker-subtask' };
      case 'due_changed':
      case 'start_changed':
        return { icon: 'fa-regular fa-calendar', cls: 'audit-marker-due' };
      case 'title_changed':
      case 'desc_changed':
        return { icon: 'fa-solid fa-pen', cls: 'audit-marker-general' };
      default:
        return { icon: 'fa-solid fa-circle-dot', cls: 'audit-marker-general' };
    }
  },

  renderAuditDetailsHTML(a) {
    const details = a.details || '';
    const statusMatch = details.match(/^Status changed from (\w+) to (\w+)$/i);
    if (statusMatch) {
      const fromStatus = statusMatch[1].toLowerCase();
      const toStatus = statusMatch[2].toLowerCase();
      return `
        <div class="audit-details-wrap">
          <span class="audit-details-text">Status changed from</span>
          <span class="badge badge-status-${fromStatus}" style="font-size: 10px; padding: 2px 7px; text-transform: uppercase;">${fromStatus}</span>
          <i class="fa-solid fa-arrow-right" style="font-size: 10px; color: var(--text-muted); margin: 0 2px;"></i>
          <span class="badge badge-status-${toStatus}" style="font-size: 10px; padding: 2px 7px; text-transform: uppercase;">${toStatus}</span>
        </div>
      `;
    }
    const prioMatch = details.match(/^Priority changed from (\w+) to (\w+)$/i);
    if (prioMatch) {
      const fromP = prioMatch[1].toLowerCase();
      const toP = prioMatch[2].toLowerCase();
      return `
        <div class="audit-details-wrap">
          <span class="audit-details-text">Priority changed from</span>
          <span class="badge priority-${fromP}" style="font-size: 11px; font-weight: 600; text-transform: capitalize;">${fromP}</span>
          <i class="fa-solid fa-arrow-right" style="font-size: 10px; color: var(--text-muted); margin: 0 2px;"></i>
          <span class="badge priority-${toP}" style="font-size: 11px; font-weight: 600; text-transform: capitalize;">${toP}</span>
        </div>
      `;
    }
    return `<span class="audit-entry-details">${Utils.escapeHTML(details)}</span>`;
  },

  renderCommentCard(c) {
    return `
      <div class="task-comment-card" data-comment-id="${c.id}">
        <div class="user-avatar-bubble">
          ${Utils.escapeHTML(c.authorInitials || 'ST')}
        </div>
        <div class="task-comment-main">
          <div class="task-comment-header">
            <div class="task-comment-meta">
              <span class="task-comment-author">${Utils.escapeHTML(c.authorName || 'Surya Tej')}</span>
              <span class="task-comment-badge">Author</span>
              <span class="task-comment-time" title="${c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}">
                <i class="fa-regular fa-clock" style="font-size: 10px; margin-right: 2px;"></i>
                ${Utils.formatRelativeDate(c.createdAt)}
              </span>
            </div>
            <div class="task-comment-actions">
              <button type="button" class="task-comment-action-btn btn-copy-comment" data-id="${c.id}" title="Copy comment">
                <i class="fa-regular fa-copy"></i>
              </button>
              <button type="button" class="task-comment-action-btn is-delete btn-del-comment" data-id="${c.id}" title="Delete comment">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
          <div class="task-comment-text">${Utils.escapeHTML(c.text)}</div>
        </div>
      </div>
    `;
  },

  renderAuditItem(a) {
    const meta = this.getAuditMeta(a.action);
    return `
      <div class="audit-entry">
        <div class="audit-entry-marker ${meta.cls}">
          <i class="${meta.icon}"></i>
        </div>
        <div class="audit-entry-body">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${this.renderAuditDetailsHTML(a)}
            <span class="audit-entry-author"><i class="fa-solid fa-user-check" style="font-size: 9px; opacity: 0.6;"></i> Surya Tej</span>
          </div>
          <span class="audit-entry-time" title="${a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}">
            <i class="fa-regular fa-clock" style="font-size: 10px; margin-right: 2px;"></i>
            ${Utils.formatRelativeDate(a.timestamp)}
          </span>
        </div>
      </div>
    `;
  },

  updateActivitySection(task) {
    if (!task) return;
    const taskComments = AppState.comments.filter(c => c.taskId === task.id);
    const taskActivities = AppState.activity.filter(a => a.taskId === task.id);
    const combinedTimeline = [
      ...taskComments.map(c => ({ type: 'comment', data: c, time: new Date(c.createdAt || 0).getTime() })),
      ...taskActivities.map(a => ({ type: 'activity', data: a, time: new Date(a.timestamp || 0).getTime() }))
    ].sort((x, y) => y.time - x.time);

    // Update tab counts
    const countAll = document.querySelector('#tab-btn-all .activity-tab-count');
    if (countAll) countAll.textContent = combinedTimeline.length;

    const countComments = document.querySelector('#tab-btn-comments .activity-tab-count');
    if (countComments) countComments.textContent = taskComments.length;

    const countAudits = document.querySelector('#tab-btn-activity .activity-tab-count');
    if (countAudits) countAudits.textContent = taskActivities.length;

    // Update Panes
    const paneAll = document.getElementById('tab-content-all');
    if (paneAll) {
      paneAll.innerHTML = combinedTimeline.length === 0 ? `
        <div style="font-size: 13px; color: var(--text-muted); padding: 24px; text-align: center; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <i class="fa-solid fa-timeline" style="font-size: 22px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
          No activity recorded yet for this task.
        </div>
      ` : `
        <div class="audit-timeline">
          ${combinedTimeline.map(item => item.type === 'comment' ? this.renderCommentCard(item.data) : this.renderAuditItem(item.data)).join('')}
        </div>
      `;
    }

    const paneComments = document.getElementById('tab-content-comments');
    if (paneComments) {
      paneComments.innerHTML = taskComments.length === 0 ? `
        <div style="font-size: 13px; color: var(--text-muted); padding: 24px; text-align: center; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <i class="fa-regular fa-comments" style="font-size: 22px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
          No discussion comments yet. Use the box above to write the first note.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${taskComments.map(c => this.renderCommentCard(c)).join('')}
        </div>
      `;
    }

    const paneActivity = document.getElementById('tab-content-activity');
    if (paneActivity) {
      paneActivity.innerHTML = taskActivities.length === 0 ? `
        <div style="font-size: 13px; color: var(--text-muted); padding: 24px; text-align: center; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <i class="fa-solid fa-clock-rotate-left" style="font-size: 22px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
          No audit events recorded for this task yet.
        </div>
      ` : `
        <div class="audit-timeline">
          ${taskActivities.map(a => this.renderAuditItem(a)).join('')}
        </div>
      `;
    }

    this.bindCommentActions(task);
  },

  bindCommentActions(task) {
    const drawer = document.getElementById('task-drawer');
    if (!drawer) return;

    drawer.querySelectorAll('.btn-copy-comment').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const commId = btn.dataset.id;
        const comm = AppState.comments.find(c => c.id === commId);
        if (comm && comm.text) {
          navigator.clipboard.writeText(comm.text).then(() => {
            Toast.success('Comment copied to clipboard');
          }).catch(() => {
            Toast.info(comm.text);
          });
        }
      };
    });

    drawer.querySelectorAll('.btn-del-comment').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const commId = btn.dataset.id;
        Modal.confirm('Delete Comment', 'Are you sure you want to delete this comment? This cannot be undone.', () => {
          AppState.deleteComment(commId);
          Toast.success('Comment deleted');
          const updated = AppState.tasks.find(t => t.id === task.id);
          this.updateActivitySection(updated);
        });
      };
    });
  },

  syncTaskHeaderAndAttributes(task) {
    if (!task) return;
    // 1. Sync header status badge
    const headerStatusBadge = document.querySelector('.fullpage-header-left .badge[class*="badge-status-"]');
    if (headerStatusBadge) {
      headerStatusBadge.className = `badge badge-status-${task.status}`;
      headerStatusBadge.textContent = task.status;
    }

    // 2. Sync inspector status dropdown
    const statusSelect = document.getElementById('detail-task-status');
    if (statusSelect && statusSelect.value !== task.status) {
      statusSelect.value = task.status;
    }

    // 3. Sync inspector priority dropdown
    const prioritySelect = document.getElementById('detail-task-priority');
    if (prioritySelect && prioritySelect.value !== task.priority) {
      prioritySelect.value = task.priority;
    }

    // 4. Sync task title input if not currently focused
    const titleInput = document.getElementById('detail-task-title');
    if (titleInput && document.activeElement !== titleInput && titleInput.value !== task.title) {
      titleInput.value = task.title;
    }
  },

  closeDetail(updateUrl = true) {
    if (typeof DropdownUI !== 'undefined') {
      DropdownUI.close();
    }
    const overlay = document.getElementById('task-drawer-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('has-modal-open');
    this.isOpen = false;
    this.currentTaskId = null;
    if (this.activeTimerInterval) {
      clearInterval(this.activeTimerInterval);
      this.activeTimerInterval = null;
    }
    if (this._keyNavHandler) {
      window.removeEventListener('keydown', this._keyNavHandler);
      this._keyNavHandler = null;
    }

    if (updateUrl && window.location.hash.startsWith('#/task')) {
      const targetHash = (this.previousHash && !this.previousHash.startsWith('#/task')) 
        ? this.previousHash 
        : '#/tasks';
      window.location.hash = targetHash;
    }
  },

  /**
   * Renders the complete Full-Page Task Detail UI
   * @param {HTMLElement} drawer 
   * @param {Object} task 
   */
  renderDrawerContent(drawer, task) {
    const project = AppState.projects.find(p => p.id === task.projectId) || { name: 'No Project', key: 'PRJ', color: '#579DFF' };
    const taskComments = AppState.comments.filter(c => c.taskId === task.id);
    const taskActivities = AppState.activity.filter(a => a.taskId === task.id);
    const subtasks = AppState.tasks.filter(t => t.parentId === task.id);
    const parentTask = task.parentId ? AppState.tasks.find(t => t.id === task.parentId) : null;

    const isMerged = !!task.mergeChecklistAndSubtasks;
    const activeActivityTab = this.activeActivityTab || 'all';

    const combinedTimeline = [
      ...taskComments.map(c => ({ type: 'comment', data: c, time: new Date(c.createdAt || 0).getTime() })),
      ...taskActivities.map(a => ({ type: 'activity', data: a, time: new Date(a.timestamp || 0).getTime() }))
    ].sort((x, y) => y.time - x.time);

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

    // Contextual tasks for Next / Prev navigation
    const contextTasks = AppState.selectedProjectId 
      ? AppState.tasks.filter(t => t.projectId === AppState.selectedProjectId)
      : AppState.tasks;
    const taskIndex = contextTasks.findIndex(t => t.id === task.id);
    const totalContextTasks = contextTasks.length;
    const prevTask = taskIndex > 0 ? contextTasks[taskIndex - 1] : null;
    const nextTask = taskIndex >= 0 && taskIndex < totalContextTasks - 1 ? contextTasks[taskIndex + 1] : null;

    // Previous route label for Back button
    const backRouteName = this.previousRoute || (AppState.currentView !== 'task' ? AppState.currentView : 'tasks');
    const backLabel = backRouteName ? (backRouteName.charAt(0).toUpperCase() + backRouteName.slice(1)) : 'Tasks';

    // Layout Mode preference
    const layoutMode = localStorage.getItem('taskforge_task_layout_mode') || 'centered';

    // Due date status badge
    let dueStatusHTML = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const dueMidnight = new Date(due);
      dueMidnight.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueMidnight - now) / (1000 * 60 * 60 * 24));
      if (task.status === 'done') {
        dueStatusHTML = `<span class="badge" style="background: rgba(54, 179, 126, 0.15); color: #36B37E;"><i class="fa-regular fa-calendar-check"></i> Completed (${Utils.formatDate(task.dueDate)})</span>`;
      } else if (diffDays < 0) {
        dueStatusHTML = `<span class="badge" style="background: rgba(248, 81, 73, 0.16); color: #F85149; border: 1px solid rgba(248, 81, 73, 0.35); font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> Overdue by ${Math.abs(diffDays)}d (${Utils.formatDate(task.dueDate)})</span>`;
      } else if (diffDays === 0) {
        dueStatusHTML = `<span class="badge" style="background: rgba(210, 153, 34, 0.2); color: #E3B341; border: 1px solid rgba(210, 153, 34, 0.4); font-weight: 600;"><i class="fa-regular fa-clock"></i> Due Today</span>`;
      } else if (diffDays === 1) {
        dueStatusHTML = `<span class="badge" style="background: rgba(210, 153, 34, 0.15); color: #E3B341;"><i class="fa-regular fa-calendar"></i> Due Tomorrow</span>`;
      } else if (diffDays <= 4) {
        dueStatusHTML = `<span class="badge" style="background: rgba(87, 157, 255, 0.15); color: #579DFF;"><i class="fa-regular fa-calendar"></i> Due in ${diffDays} days</span>`;
      } else {
        dueStatusHTML = `<span class="badge" style="background: var(--bg-surface-elevated); color: var(--text-secondary);"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(task.dueDate)}</span>`;
      }
    }

    // Type definition
    const typeIcons = {
      task: { icon: 'fa-square-check', color: '#579DFF', label: 'Task' },
      story: { icon: 'fa-bookmark', color: '#6554C0', label: 'Story' },
      bug: { icon: 'fa-circle-dot', color: '#F85149', label: 'Bug' },
      epic: { icon: 'fa-bolt', color: '#8777D9', label: 'Epic' },
      improvement: { icon: 'fa-circle-arrow-up', color: '#36B37E', label: 'Improvement' },
      subtask: { icon: 'fa-turn-up fa-rotate-90', color: '#579DFF', label: 'Subtask' }
    };
    const currentType = typeIcons[task.type] || typeIcons.task;

    const labels = Array.isArray(task.labels) ? task.labels : [];

    drawer.innerHTML = `
      <!-- 1. Executive Full-Page Command Header -->
      <div class="fullpage-task-header">
        <div class="fullpage-header-left">
          <button id="drawer-btn-back" class="btn btn-secondary btn-sm" title="Return to previous view (Esc)" style="display: flex; align-items: center; gap: 6px; padding: 5px 12px; font-weight: 600;">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Back to ${backLabel}</span>
            <kbd style="font-size: 10px; background: rgba(255, 255, 255, 0.1); padding: 1px 4px; border-radius: 3px; font-family: var(--font-mono);">Esc</kbd>
          </button>
          
          <div class="fullpage-header-divider"></div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="badge" style="background: ${project.color || '#579DFF'}18; color: ${project.color || '#579DFF'}; border: 1px solid ${project.color || '#579DFF'}44; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${project.color || '#579DFF'};"></span>
              ${Utils.escapeHTML(project.name)}
            </span>
            <span style="color: var(--text-muted); font-size: 13px;">/</span>
            <button id="detail-btn-copy-key" class="btn-copy-chip" title="Click to copy task key">
              <span>${task.key}</span>
              <i class="fa-regular fa-copy" style="font-size: 11px; opacity: 0.7;"></i>
            </button>
            <span class="badge" style="background: ${currentType.color}18; color: ${currentType.color}; border: 1px solid ${currentType.color}44; display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600;">
              <i class="fa-solid ${currentType.icon}"></i> ${currentType.label}
            </span>
            <span class="badge badge-status-${task.status}" style="font-size: 11px; padding: 2px 8px; text-transform: uppercase;">
              ${task.status}
            </span>
          </div>
        </div>

        <div class="fullpage-header-center">
          ${totalContextTasks > 1 ? `
            <div class="task-nav-pager" title="Navigate tasks in list (Alt+Up / Alt+Down)">
              <button id="task-nav-prev" class="btn btn-ghost btn-xs" ${!prevTask ? 'disabled style="opacity: 0.35;"' : ''} title="${prevTask ? `Previous: ${prevTask.key} (Alt+Up)` : 'No previous task'}">
                <i class="fa-solid fa-chevron-up"></i>
              </button>
              <span class="task-nav-counter">${taskIndex >= 0 ? `${taskIndex + 1} of ${totalContextTasks}` : 'Task'}</span>
              <button id="task-nav-next" class="btn btn-ghost btn-xs" ${!nextTask ? 'disabled style="opacity: 0.35;"' : ''} title="${nextTask ? `Next: ${nextTask.key} (Alt+Down)` : 'No next task'}">
                <i class="fa-solid fa-chevron-down"></i>
              </button>
            </div>
          ` : ''}
        </div>

        <div class="fullpage-header-right">
          <button id="drawer-btn-share" class="btn btn-ghost btn-sm" title="Copy direct task URL" style="gap: 5px;">
            <i class="fa-solid fa-link"></i> <span>Share</span>
          </button>

          <button id="drawer-btn-layout-toggle" class="btn btn-ghost btn-sm" title="Toggle Centered Focus / Full Canvas width">
            <i class="fa-solid ${layoutMode === 'fluid' ? 'fa-compress' : 'fa-expand'}"></i>
          </button>

          <button id="drawer-btn-duplicate" class="btn btn-ghost btn-sm" title="Duplicate Task">
            <i class="fa-regular fa-copy"></i>
          </button>

          <button id="drawer-btn-delete" class="btn btn-ghost btn-sm" style="color: #F87171;" title="Delete Task">
            <i class="fa-regular fa-trash-can"></i>
          </button>

          <div class="fullpage-header-divider"></div>

          <button id="drawer-btn-close" class="btn-icon" title="Close (Esc)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- 2. Scrollable Full-Page Workspace Canvas -->
      <div class="fullpage-task-body">
        <div class="fullpage-task-container ${layoutMode === 'fluid' ? 'is-fluid-mode' : 'is-centered-mode'}">
          
          <!-- LEFT FOCUS CANVAS (~68-70%) -->
          <div class="fullpage-main-canvas">
            
            ${parentTask ? `
              <!-- Parent Task Hierarchy Card -->
              <div class="parent-task-banner">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-network-wired" style="color: var(--accent-primary);"></i>
                  <span style="color: var(--text-secondary); font-size: 12px;">Subtask of:</span>
                  <a href="javascript:void(0)" id="drawer-parent-task-link" class="parent-task-link">
                    ${parentTask.key} — ${Utils.escapeHTML(parentTask.title)}
                  </a>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-status-${parentTask.status}" style="font-size: 11px;">${parentTask.status}</span>
                  <span class="badge" style="font-size: 10px; background: var(--bg-surface);">${parentTask.storyPoints || 0} pts</span>
                </div>
              </div>
            ` : ''}

            <!-- Task Title with Inline Edit -->
            <div>
              <textarea id="detail-task-title" class="fullpage-task-title-input" rows="1" placeholder="Task Title...">${Utils.escapeHTML(task.title)}</textarea>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-left: 2px;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  ${dueStatusHTML}
                  ${task.storyPoints !== undefined && task.storyPoints !== null ? `
                    <span class="badge" style="background: var(--bg-surface-elevated); color: var(--accent-primary); font-weight: 600;" title="Story Points">
                      <i class="fa-solid fa-award"></i> ${task.storyPoints} pts
                    </span>
                  ` : ''}
                  ${task.sprintId ? `
                    <span class="badge" style="background: rgba(54, 179, 126, 0.12); color: #36B37E;" title="Assigned Sprint">
                      <i class="fa-solid fa-repeat"></i> ${Utils.escapeHTML((AppState.sprints.find(s => s.id === task.sprintId) || {}).name || 'Sprint')}
                    </span>
                  ` : ''}
                </div>
                <span id="title-save-indicator" style="font-size: 11px; color: var(--accent-success); opacity: 0; transition: opacity 0.3s ease;">
                  <i class="fa-solid fa-check"></i> Saved
                </span>
              </div>
            </div>

            <!-- Productivity Quick Action Bar -->
            <div class="fullpage-action-bar">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-right: 4px;">Quick Actions:</span>
              <button type="button" class="fullpage-action-btn" id="btn-quick-add-subtask">
                <i class="fa-solid fa-plus" style="color: var(--accent-primary);"></i> Subtask
              </button>
              <button type="button" class="fullpage-action-btn" id="btn-quick-add-checklist">
                <i class="fa-regular fa-square-check" style="color: #36B37E;"></i> Checklist Item
              </button>
              <button type="button" class="fullpage-action-btn" id="btn-quick-add-comment">
                <i class="fa-regular fa-comment" style="color: #A371F7;"></i> Add Comment
              </button>
              <button type="button" class="fullpage-action-btn" id="btn-quick-timer">
                <i class="fa-solid fa-stopwatch" style="color: #E3B341;"></i> Focus Timer
              </button>
            </div>

            <!-- Description Workspace with Markdown Controls -->
            <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 18px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <label class="form-label" style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
                  <i class="fa-solid fa-align-left" style="color: var(--accent-primary);"></i> Description &amp; Requirements
                </label>
                <span style="font-size: 11px; color: var(--text-muted);">Markdown supported</span>
              </div>

              <!-- Markdown Format Toolbar -->
              <div class="markdown-toolbar">
                <button type="button" class="markdown-tool-btn md-btn-bold" title="Bold (**text**)"><i class="fa-solid fa-bold"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-italic" title="Italic (*text*)"><i class="fa-solid fa-italic"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-code" title="Inline Code (\`code\`)"><i class="fa-solid fa-code"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-heading" title="Heading (### Text)"><i class="fa-solid fa-heading"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-list" title="Bullet List (- item)"><i class="fa-solid fa-list-ul"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-numlist" title="Numbered List (1. item)"><i class="fa-solid fa-list-ol"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-check" title="Task checkbox (- [ ] item)"><i class="fa-regular fa-square-check"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-quote" title="Quote block (> quote)"><i class="fa-solid fa-quote-left"></i></button>
                <button type="button" class="markdown-tool-btn md-btn-link" title="Link ([title](url))"><i class="fa-solid fa-link"></i></button>
              </div>

              <textarea id="detail-task-desc" class="fullpage-desc-textarea" placeholder="Add detailed specifications, technical design, reproduction steps, or acceptance criteria...">${Utils.escapeHTML(task.description || '')}</textarea>
            </div>

            <!-- Subtasks & Checklist Workspace -->
            ${!isMerged ? `
              <!-- SEPARATE MODE: Part 1 Checklist -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
                      <i class="fa-regular fa-square-check" style="color: var(--accent-primary);"></i> Checklist (${completedChecklist}/${totalChecklist})
                    </span>
                    <span style="font-size: 12px; font-weight: 600; color: ${chkPct === 100 && totalChecklist > 0 ? 'var(--accent-success)' : 'var(--text-muted)'};">
                      ${chkPct}%
                    </span>
                  </div>
                  <button id="btn-toggle-merge-view" class="btn btn-ghost btn-sm" title="Merge Checklist and Subtasks into a unified view" style="font-size: 11px;">
                    <i class="fa-solid fa-arrows-split-up-and-left fa-rotate-90"></i> Switch to Unified View
                  </button>
                </div>

                <!-- Checklist Progress Bar -->
                <div class="drawer-progress-container is-checklist" style="margin-bottom: 14px;">
                  <div class="task-card-progress-track">
                    <div class="task-card-progress-fill is-checklist ${chkPct === 100 && totalChecklist > 0 ? 'is-complete' : ''}" style="width: ${chkPct}%;"></div>
                  </div>
                </div>

                <!-- Checklist Items -->
                <div id="checklist-items-container" style="display: flex; flex-direction: column; gap: 6px;">
                  ${totalChecklist === 0 ? `
                    <div style="font-size: 12px; color: var(--text-muted); padding: 6px 0;">No checklist items yet. Add atomic steps below.</div>
                  ` : checklist.map(item => `
                    <div class="chk-item-row" data-id="${item.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 13px; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <input type="checkbox" class="chk-item-toggle" data-id="${item.id}" ${item.completed ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px; accent-color: var(--accent-success);" title="Mark complete">
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${item.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}" title="${Utils.escapeHTML(item.text)}">
                          ${Utils.escapeHTML(item.text)}
                        </span>
                      </div>
                      <button class="btn btn-ghost btn-sm chk-item-del" data-id="${item.id}" title="Delete item" style="padding: 2px 6px; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                  `).join('')}
                </div>

                <!-- Add Checklist Item Bar (Bulk enabled with no 50 limit) -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="new-checklist-input" class="form-input" placeholder="e.g. Design checklist step {}" style="font-size: 13px; padding: 7px 12px; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                      <label style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">×</label>
                      <input type="number" id="new-checklist-count" class="form-input" min="1" value="1" style="width: 58px; font-size: 12px; padding: 6px 6px; text-align: center;" title="Bulk item count">
                    </div>
                    <button id="btn-add-checklist" class="btn btn-primary btn-sm" style="font-size: 12px; height: 32px; white-space: nowrap;">
                      <i class="fa-solid fa-plus"></i> Add
                    </button>
                  </div>
                  <span style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-lightbulb" style="color: var(--accent-warning);"></i> Bulk creation: use <code style='background:var(--bg-surface-elevated);padding:1px 4px;border-radius:3px;'>{}</code> as number placeholder &amp; set count. E.g. "Check {}" × 5 → Check 1 … Check 5</span>
                </div>
              </div>

              <!-- SEPARATE MODE: Part 2 Subtasks -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
                      <i class="fa-solid fa-network-wired" style="color: var(--accent-primary);"></i> Child Subtasks (${completedSubtasks}/${totalSubtasks})
                    </span>
                    <span style="font-size: 12px; font-weight: 600; color: ${stPct === 100 && totalSubtasks > 0 ? 'var(--accent-success)' : 'var(--text-muted)'};">
                      ${stPct}%
                    </span>
                  </div>
                  <button id="btn-toggle-merge-view-2" class="btn btn-ghost btn-sm" title="Merge Checklist and Subtasks into a unified view" style="font-size: 11px;">
                    <i class="fa-solid fa-arrows-split-up-and-left fa-rotate-90"></i> Switch to Unified View
                  </button>
                </div>

                <!-- Subtasks Progress Bar -->
                <div class="drawer-progress-container is-subtask" style="margin-bottom: 14px;">
                  <div class="task-card-progress-track">
                    <div class="task-card-progress-fill is-subtask ${stPct === 100 && totalSubtasks > 0 ? 'is-complete' : ''}" style="width: ${stPct}%;"></div>
                  </div>
                </div>

                <!-- Subtasks List -->
                <div id="subtasks-items-container" style="display: flex; flex-direction: column; gap: 6px;">
                  ${totalSubtasks === 0 ? `
                    <div style="font-size: 12px; color: var(--text-muted); padding: 6px 0;">No subtasks created yet. Add tracked subtasks below.</div>
                  ` : subtasks.map(st => `
                    <div class="subtask-item-row" data-id="${st.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 13px; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <input type="checkbox" class="subtask-item-toggle" data-id="${st.id}" ${st.status === 'done' ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px; accent-color: var(--accent-success);" title="Mark complete">
                        <span class="subtask-open-link" data-id="${st.id}" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-primary); cursor: pointer;" title="Open subtask detail">${st.key}</span>
                        <span class="subtask-open-link" data-id="${st.id}" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; ${st.status === 'done' ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}" title="${Utils.escapeHTML(st.title)}">
                          ${Utils.escapeHTML(st.title)}
                        </span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge" style="font-size: 10px; padding: 2px 7px; background: var(--bg-surface-active); color: var(--accent-primary); font-weight: 600;" title="Story Points">${st.storyPoints !== undefined && st.storyPoints !== null ? st.storyPoints : 1} pts</span>
                        <span class="badge badge-status-${st.status}" style="font-size: 10px; padding: 2px 7px;">${st.status}</span>
                        <button class="btn btn-ghost btn-sm subtask-item-del" data-id="${st.id}" title="Delete subtask" style="padding: 2px 6px; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- Add Subtask Bar (Bulk enabled with no 50 limit) -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="new-subtask-input" class="form-input" placeholder="e.g. Implement module {}" style="font-size: 13px; padding: 7px 12px; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                      <label style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">×</label>
                      <input type="number" id="new-subtask-count" class="form-input" min="1" value="1" style="width: 58px; font-size: 12px; padding: 6px 6px; text-align: center;" title="Bulk subtask count">
                    </div>
                    <button id="btn-add-subtask" class="btn btn-primary btn-sm" style="font-size: 12px; height: 32px; white-space: nowrap;">
                      <i class="fa-solid fa-plus"></i> Add Subtask
                    </button>
                  </div>
                  <span style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-lightbulb" style="color: var(--accent-warning);"></i> Bulk creation: use <code style='background:var(--bg-surface-elevated);padding:1px 4px;border-radius:3px;'>{}</code> as number placeholder &amp; set count. E.g. "Task {}" × 5 → Task 1 … Task 5</span>
                </div>
              </div>
            ` : `
              <!-- MERGED UNIFIED VIEW -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
                      <i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Unified Checklist &amp; Subtasks (${completedMerged}/${totalMerged})
                    </span>
                    <span style="font-size: 12px; font-weight: 600; color: ${mergedPct === 100 && totalMerged > 0 ? 'var(--accent-success)' : 'var(--text-muted)'};">
                      ${mergedPct}%
                    </span>
                  </div>
                  <button id="btn-toggle-merge-view" class="btn btn-ghost btn-sm" title="Separate into independent sections" style="font-size: 11px;">
                    <i class="fa-solid fa-arrows-split-up-and-left"></i> Switch to Separate Lists
                  </button>
                </div>

                <!-- Unified Progress Bar -->
                <div class="drawer-progress-container is-merged" style="margin-bottom: 14px;">
                  <div class="task-card-progress-track">
                    <div class="task-card-progress-fill is-merged ${mergedPct === 100 && totalMerged > 0 ? 'is-complete' : ''}" style="width: ${mergedPct}%;"></div>
                  </div>
                </div>

                <!-- Unified Items List -->
                <div id="merged-items-container" style="display: flex; flex-direction: column; gap: 6px;">
                  ${totalMerged === 0 ? `
                    <div style="font-size: 12px; color: var(--text-muted); padding: 6px 0;">No items yet. Add subtasks or checklist steps below.</div>
                  ` : clubbedItems.map(item => `
                    <div class="merged-item-row" data-id="${item.id}" data-is-subtask="${item.isSubtask}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 13px; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <input type="checkbox" class="merged-item-toggle" data-id="${item.id}" data-is-subtask="${item.isSubtask}" ${item.completed ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px; accent-color: var(--accent-success);" title="Mark complete">
                        
                        ${item.key ? `
                          <span class="subtask-open-link" data-id="${item.subtaskId || item.id}" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-primary); cursor: pointer;" title="Open subtask detail">${item.key}</span>
                        ` : `
                          <span style="font-size: 11px; color: var(--text-muted); background: var(--bg-surface); padding: 1px 5px; border-radius: 3px;" title="Checklist step"><i class="fa-regular fa-square-check"></i></span>
                        `}
                        
                        <span class="${item.key ? 'subtask-open-link' : ''}" data-id="${item.subtaskId || item.id}" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${item.key ? 'cursor: pointer;' : ''} ${item.completed ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: var(--text-primary);'}" title="${Utils.escapeHTML(item.title)}">
                          ${Utils.escapeHTML(item.title)}
                        </span>
                      </div>

                      <div style="display: flex; align-items: center; gap: 8px;">
                        ${item.isSubtask ? `
                          <span class="badge" style="font-size: 10px; padding: 2px 7px; background: var(--accent-primary-subtle); color: var(--accent-primary);"><i class="fa-solid fa-network-wired"></i> Subtask</span>
                          <span class="badge" style="font-size: 10px; padding: 2px 7px; background: var(--bg-surface-active); color: var(--accent-primary); font-weight: 600;">${item.storyPoints !== undefined && item.storyPoints !== null ? item.storyPoints : 1} pts</span>
                          ${item.status ? `<span class="badge badge-status-${item.status}" style="font-size: 10px; padding: 2px 6px;">${item.status}</span>` : ''}
                        ` : `
                          <span class="badge" style="font-size: 10px; padding: 2px 7px; background: var(--bg-surface-active); color: var(--text-muted);"><i class="fa-regular fa-square-check"></i> Step</span>
                        `}

                        <button class="btn btn-ghost btn-sm merged-item-del" data-id="${item.id}" data-is-subtask="${item.isSubtask}" title="Delete item" style="padding: 2px 6px; color: var(--text-muted);"><i class="fa-solid fa-xmark"></i></button>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- Unified Inline Creator -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                  <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <input type="text" id="merged-new-input" class="form-input" placeholder="e.g. Review component {}" style="font-size: 13px; padding: 7px 12px; flex: 1; min-width: 180px;">
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                      <label style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">×</label>
                      <input type="number" id="merged-new-count" class="form-input" min="1" value="1" style="width: 58px; font-size: 12px; padding: 6px 6px; text-align: center;" title="Bulk item count">
                    </div>
                    <select id="merged-new-type" class="form-select" style="width: auto; padding: 6px 10px; font-size: 12px; height: 34px;">
                      <option value="checklist">Checklist Step</option>
                      <option value="subtask">Tracked Subtask</option>
                    </select>
                    <button id="merged-btn-add" class="btn btn-primary btn-sm" style="font-size: 12px; height: 34px; white-space: nowrap;">
                      <i class="fa-solid fa-plus"></i> Add Item
                    </button>
                  </div>
                  <span style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-lightbulb" style="color: var(--accent-warning);"></i> Bulk creation: use <code style='background:var(--bg-surface-elevated);padding:1px 4px;border-radius:3px;'>{}</code> as number placeholder &amp; set count. E.g. "Item {}" × 4 → Item 1 … Item 4</span>
                </div>

                <!-- Consolidation actions -->
                <div style="display: flex; gap: 12px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap;">
                  <button id="btn-merge-chk-to-subtasks" class="btn btn-ghost btn-xs" style="color: var(--text-muted); font-size: 12px;" title="Convert unlinked checklist items to child subtasks">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Convert Checklist to Subtasks
                  </button>
                  <button id="btn-merge-subtasks-to-chk" class="btn btn-ghost btn-xs" style="color: var(--text-muted); font-size: 12px;" title="Import child subtasks into checklist">
                    <i class="fa-solid fa-arrow-down-to-bracket"></i> Import Subtasks to Checklist
                  </button>
                </div>
              </div>
            `}

            <!-- Activity, Comments & History Hub -->
            <div class="activity-discussion-card">
              
              <!-- Tab Navigation Header -->
              <div class="activity-nav-header">
                <div class="activity-nav-tabs">
                  <button type="button" id="tab-btn-all" class="activity-tab-btn ${activeActivityTab === 'all' ? 'active' : ''}">
                    <i class="fa-solid fa-list-ul"></i>
                    <span>All Activity</span>
                    <span class="activity-tab-count">${combinedTimeline.length}</span>
                  </button>
                  <button type="button" id="tab-btn-comments" class="activity-tab-btn ${activeActivityTab === 'comments' ? 'active' : ''}">
                    <i class="fa-regular fa-comment"></i>
                    <span>Discussion</span>
                    <span class="activity-tab-count">${taskComments.length}</span>
                  </button>
                  <button type="button" id="tab-btn-activity" class="activity-tab-btn ${activeActivityTab === 'activity' ? 'active' : ''}">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <span>History &amp; Audits</span>
                    <span class="activity-tab-count">${taskActivities.length}</span>
                  </button>
                </div>

                <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-shield-halved" style="color: var(--accent-primary);"></i>
                  <span>Live Audit Log</span>
                </div>
              </div>

              <!-- Comment Composer Box (Available for instant discussion) -->
              <div class="comment-composer-box">
                <div class="user-avatar-bubble">ST</div>
                <div class="comment-composer-inner">
                  <textarea id="detail-new-comment" class="comment-composer-textarea" placeholder="Add a comment, share progress notes, or ask a question... (Markdown supported)"></textarea>
                  <div class="comment-composer-footer">
                    <div class="comment-shortcut-hint">
                      <kbd style="font-size: 10px; background: var(--bg-surface); padding: 2px 6px; border-radius: 3px; font-family: var(--font-mono); border: 1px solid var(--border-subtle); color: var(--text-secondary);">Ctrl+Enter</kbd>
                      <span>to post comment</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                      <button type="button" id="btn-cancel-comment" class="btn btn-ghost btn-sm" style="font-size: 12px;">Clear</button>
                      <button type="button" id="btn-post-comment" class="btn btn-primary btn-sm" style="font-size: 12px; padding: 0 14px; gap: 6px;">
                        <i class="fa-solid fa-paper-plane"></i> Post Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PANE 1: ALL ACTIVITY (Chronological Combined Feed) -->
              <div id="tab-content-all" class="activity-tab-pane ${activeActivityTab === 'all' ? 'active' : ''}">
                ${combinedTimeline.length === 0 ? `
                  <div style="font-size: 13px; color: var(--text-muted); padding: 24px; text-align: center; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
                    <i class="fa-solid fa-timeline" style="font-size: 22px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                    No activity recorded yet for this task.
                  </div>
                ` : `
                  <div class="audit-timeline">
                    ${combinedTimeline.map(item => item.type === 'comment' ? this.renderCommentCard(item.data) : this.renderAuditItem(item.data)).join('')}
                  </div>
                `}
              </div>

              <!-- PANE 2: COMMENTS ONLY (Discussion Stream) -->
              <div id="tab-content-comments" class="activity-tab-pane ${activeActivityTab === 'comments' ? 'active' : ''}">
                ${taskComments.length === 0 ? `
                  <div style="font-size: 13px; color: var(--text-muted); padding: 24px; text-align: center; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
                    <i class="fa-regular fa-comments" style="font-size: 22px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                    No discussion comments yet. Use the box above to write the first note.
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${taskComments.map(c => this.renderCommentCard(c)).join('')}
                  </div>
                `}
              </div>

              <!-- PANE 3: HISTORY & AUDITS ONLY (Timeline) -->
              <div id="tab-content-activity" class="activity-tab-pane ${activeActivityTab === 'activity' ? 'active' : ''}">
                ${taskActivities.length === 0 ? `
                  <div style="font-size: 13px; color: var(--text-muted); padding: 24px; text-align: center; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 22px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
                    No audit events recorded for this task yet.
                  </div>
                ` : `
                  <div class="audit-timeline">
                    ${taskActivities.map(a => this.renderAuditItem(a)).join('')}
                  </div>
                `}
              </div>

            </div>

          </div>

          <!-- RIGHT PRODUCTIVITY INSPECTOR (340px Sticky) -->
          <div class="fullpage-inspector-sidebar">
            
            <!-- Properties & Attributes Card -->
            <div class="inspector-card">
              <div class="inspector-card-title">
                <span><i class="fa-solid fa-sliders" style="color: var(--accent-primary);"></i> Attributes &amp; Details</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 14px;">
                
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Status</label>
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

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Priority</label>
                  <select id="detail-task-priority" class="form-select">
                    <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Critical</option>
                    <option value="highest" ${task.priority === 'highest' ? 'selected' : ''}>Highest</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="lowest" ${task.priority === 'lowest' ? 'selected' : ''}>Lowest</option>
                  </select>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Issue Type</label>
                  <select id="detail-task-type" class="form-select">
                    <option value="task" ${task.type === 'task' ? 'selected' : ''}>Task</option>
                    <option value="story" ${task.type === 'story' ? 'selected' : ''}>Story</option>
                    <option value="bug" ${task.type === 'bug' ? 'selected' : ''}>Bug</option>
                    <option value="epic" ${task.type === 'epic' ? 'selected' : ''}>Epic</option>
                    <option value="improvement" ${task.type === 'improvement' ? 'selected' : ''}>Improvement</option>
                    <option value="subtask" ${task.type === 'subtask' ? 'selected' : ''}>Subtask</option>
                  </select>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Project</label>
                  <select id="detail-task-project" class="form-select">
                    ${AppState.projects.map(p => `<option value="${p.id}" ${p.id === task.projectId ? 'selected' : ''}>${Utils.escapeHTML(p.name)} (${p.key})</option>`).join('')}
                  </select>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-repeat" style="color: var(--accent-success);"></i> Sprint</label>
                  <select id="detail-task-sprint" class="form-select">
                    <option value="">None (Backlog Pool)</option>
                    ${AppState.sprints.map(s => `
                      <option value="${s.id}" ${task.sprintId === s.id ? 'selected' : ''}>
                        ${Utils.escapeHTML(s.name)} [${s.status.toUpperCase()}]
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-bolt" style="color: var(--accent-purple);"></i> Epic</label>
                  <select id="detail-task-epic" class="form-select">
                    <option value="">None</option>
                    ${AppState.epics.map(e => `
                      <option value="${e.id}" ${task.epicId === e.id ? 'selected' : ''}>
                        ${Utils.escapeHTML(e.title)}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-row" style="margin: 0; gap: 10px;">
                  <div class="form-group" style="margin: 0; flex: 1;">
                    <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Start Date</label>
                    <input type="date" id="detail-task-start" class="form-input" style="height: 36px; font-size: 12px;" value="${Utils.toDateInputValue(task.startDate)}">
                  </div>
                  <div class="form-group" style="margin: 0; flex: 1;">
                    <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Due Date</label>
                    <input type="date" id="detail-task-due" class="form-input" style="height: 36px; font-size: 12px;" value="${Utils.toDateInputValue(task.dueDate)}">
                  </div>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Story Points ${totalSubtasks > 0 ? '<span style="font-size: 10px; color: var(--text-muted); font-weight: 400;">(Sum of child subtasks)</span>' : ''}</label>
                  <input type="number" id="detail-task-points" class="form-input" min="0" style="height: 36px; font-size: 13px;" value="${task.storyPoints !== undefined && task.storyPoints !== null ? task.storyPoints : (task.type === 'subtask' ? 1 : 0)}" ${totalSubtasks > 0 ? 'readonly title="Automatically calculated from subtasks"' : ''}>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Recurrence</label>
                  <select id="detail-task-recurring" class="form-select">
                    <option value="">None (One-time)</option>
                    <option value="daily" ${task.recurring && task.recurring.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                    <option value="weekly" ${task.recurring && task.recurring.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                    <option value="monthly" ${task.recurring && task.recurring.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                  </select>
                </div>

                <!-- Labels / Tags interactive manager -->
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-tags" style="color: var(--accent-primary);"></i> Labels</label>
                  <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px;">
                    ${labels.length === 0 ? `<span style="font-size: 11px; color: var(--text-muted);">No labels attached</span>` : labels.map(l => `
                      <span class="badge" style="background: var(--bg-surface-elevated); color: var(--text-primary); border: 1px solid var(--border-subtle); display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 2px 8px;">
                        ${Utils.escapeHTML(l)}
                        <i class="fa-solid fa-xmark del-label-btn" data-label="${Utils.escapeHTML(l)}" style="cursor: pointer; opacity: 0.6; font-size: 10px;" title="Remove tag"></i>
                      </span>
                    `).join('')}
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <input type="text" id="detail-new-label-input" class="form-input" placeholder="Add tag..." style="font-size: 12px; height: 32px; padding: 4px 10px; flex: 1;">
                    <button id="detail-btn-add-label" class="btn btn-secondary btn-sm" style="font-size: 11px; height: 32px; padding: 0 10px;">Add</button>
                  </div>
                </div>

              </div>
            </div>

            <!-- Time Tracking Card -->
            <div class="inspector-card">
              <div class="inspector-card-title">
                <span><i class="fa-solid fa-stopwatch" style="color: var(--accent-warning);"></i> Time Tracking</span>
                <button id="btn-log-time" class="btn btn-ghost btn-xs" title="Log time manually" style="color: var(--text-muted); font-size: 11px;">
                  <i class="fa-solid fa-pen-to-square"></i> Log
                </button>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
                <span>Tracked: <strong style="color: var(--accent-primary);">${Utils.formatMinutes(task.trackedTime)}</strong></span>
                <span>Estimate: <strong style="color: var(--text-primary);">${Utils.formatMinutes(task.estimate)}</strong></span>
              </div>

              <!-- Time Track Bar -->
              <div style="height: 6px; background: var(--bg-app); border-radius: 3px; overflow: hidden; margin-bottom: 12px;">
                <div style="width: ${task.estimate ? Math.min(100, Math.round(((task.trackedTime || 0) / task.estimate) * 100)) : 0}%; height: 100%; background: linear-gradient(90deg, #579DFF, #36B37E); border-radius: 3px;"></div>
              </div>

              <button id="btn-timer-toggle" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center; height: 34px;">
                <i class="fa-solid fa-play"></i> Start Live Timer
              </button>
            </div>

            <!-- Task Metadata & Quick Shortcuts -->
            <div class="inspector-card" style="font-size: 12px; color: var(--text-secondary);">
              <div class="inspector-card-title">
                <span><i class="fa-solid fa-circle-info" style="color: var(--text-muted);"></i> Metadata &amp; Keys</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Created:</span>
                  <span style="font-weight: 500;">${Utils.formatDate(task.createdAt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Updated:</span>
                  <span style="font-weight: 500;">${Utils.formatRelativeDate(task.updatedAt || task.createdAt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Shortcuts:</span>
                  <span style="font-family: var(--font-mono); font-size: 11px;">Esc (Exit), Alt+↑/↓</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;

    this.attachDrawerListeners(task);
  },

  /**
   * Binds events to elements inside the full-page task detail view
   * @param {Object} task 
   */
  attachDrawerListeners(task) {
    const taskId = task.id;
    const drawer = document.getElementById('task-drawer');
    const overlay = document.getElementById('task-drawer-overlay');
    const subtasks = AppState.tasks.filter(t => t.parentId === task.id);
    const totalSubtasks = subtasks.length;

    // Contextual tasks for Next / Prev navigation
    const contextTasks = AppState.selectedProjectId 
      ? AppState.tasks.filter(t => t.projectId === AppState.selectedProjectId)
      : AppState.tasks;
    const taskIndex = contextTasks.findIndex(t => t.id === task.id);
    const prevTask = taskIndex > 0 ? contextTasks[taskIndex - 1] : null;
    const nextTask = taskIndex >= 0 && taskIndex < contextTasks.length - 1 ? contextTasks[taskIndex + 1] : null;

    // Back button and Close button
    const backBtn = document.getElementById('drawer-btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.closeDetail());
    }

    const closeBtn = document.getElementById('drawer-btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDetail());
    }

    // Copy key chip
    const copyKeyBtn = document.getElementById('detail-btn-copy-key');
    if (copyKeyBtn) {
      copyKeyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(task.key).then(() => {
          Toast.success(`Copied ${task.key} to clipboard`);
        }).catch(() => {
          Toast.info(`Key: ${task.key}`);
        });
      });
    }

    // Share link button
    const shareBtn = document.getElementById('drawer-btn-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const fullUrl = window.location.origin + window.location.pathname + `#/task?id=${task.id}`;
        navigator.clipboard.writeText(fullUrl).then(() => {
          Toast.success('Direct task link copied to clipboard');
        }).catch(() => {
          Toast.info(fullUrl);
        });
      });
    }

    // Layout Toggle (Fluid vs Centered Focus)
    const layoutToggleBtn = document.getElementById('drawer-btn-layout-toggle');
    if (layoutToggleBtn) {
      layoutToggleBtn.addEventListener('click', () => {
        const container = document.querySelector('.fullpage-task-container');
        if (container) {
          const isFluid = container.classList.contains('is-fluid-mode');
          if (isFluid) {
            container.classList.remove('is-fluid-mode');
            container.classList.add('is-centered-mode');
            localStorage.setItem('taskforge_task_layout_mode', 'centered');
            layoutToggleBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
            layoutToggleBtn.title = 'Switch to Full Fluid Canvas';
          } else {
            container.classList.remove('is-centered-mode');
            container.classList.add('is-fluid-mode');
            localStorage.setItem('taskforge_task_layout_mode', 'fluid');
            layoutToggleBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
            layoutToggleBtn.title = 'Switch to Centered Focus Mode';
          }
        }
      });
    }

    // Task Prev / Next pager navigation
    const prevBtn = document.getElementById('task-nav-prev');
    if (prevBtn && prevTask) {
      prevBtn.addEventListener('click', () => {
        this.openDetail(prevTask.id, true);
      });
    }

    const nextBtn = document.getElementById('task-nav-next');
    if (nextBtn && nextTask) {
      nextBtn.addEventListener('click', () => {
        this.openDetail(nextTask.id, true);
      });
    }

    // Duplicate button
    const dupBtn = document.getElementById('drawer-btn-duplicate');
    if (dupBtn) {
      dupBtn.addEventListener('click', () => {
        const newT = AppState.duplicateTask(taskId);
        if (newT) {
          this.openDetail(newT.id, true);
          Toast.success(`Duplicated as ${newT.key}`);
        }
      });
    }

    // Delete button
    const delBtn = document.getElementById('drawer-btn-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        Modal.confirm('Delete Task', `Are you sure you want to delete ${task.key}? This action cannot be undone.`, () => {
          this.closeDetail();
          AppState.deleteTask(taskId, true, true);
        });
      });
    }

    // Parent Task link navigation
    const parentLink = document.getElementById('drawer-parent-task-link');
    if (parentLink && task.parentId) {
      parentLink.addEventListener('click', () => {
        this.openDetail(task.parentId, true);
      });
    }

    // Title input auto-grow and debounced autosave
    const titleInput = document.getElementById('detail-task-title');
    const saveIndicator = document.getElementById('title-save-indicator');
    if (titleInput) {
      const resizeTitle = () => {
        titleInput.style.height = 'auto';
        titleInput.style.height = `${Math.max(38, titleInput.scrollHeight)}px`;
      };
      resizeTitle();
      titleInput.addEventListener('input', resizeTitle);

      const triggerSave = () => {
        const val = titleInput.value.trim();
        if (val && val !== task.title) {
          AppState.updateTask(taskId, { title: val });
          if (saveIndicator) {
            saveIndicator.style.opacity = '1';
            setTimeout(() => { saveIndicator.style.opacity = '0'; }, 1800);
          }
        }
      };
      titleInput.addEventListener('change', triggerSave);
      titleInput.addEventListener('blur', triggerSave);
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          titleInput.blur();
        }
      });
    }

    // Description auto-grow and autosave
    const descInput = document.getElementById('detail-task-desc');
    if (descInput) {
      const resizeDesc = () => {
        descInput.style.height = 'auto';
        descInput.style.height = `${Math.max(140, descInput.scrollHeight)}px`;
      };
      resizeDesc();
      descInput.addEventListener('input', resizeDesc);
      descInput.addEventListener('change', () => {
        AppState.updateTask(taskId, { description: descInput.value });
      });
    }

    // Markdown toolbar formatting actions
    const insertMarkdown = (prefix, suffix = '') => {
      if (!descInput) return;
      const start = descInput.selectionStart;
      const end = descInput.selectionEnd;
      const text = descInput.value;
      const selected = text.substring(start, end);
      const replacement = prefix + (selected || 'text') + suffix;
      descInput.value = text.substring(0, start) + replacement + text.substring(end);
      descInput.focus();
      descInput.selectionStart = start + prefix.length;
      descInput.selectionEnd = start + prefix.length + (selected ? selected.length : 4);
      AppState.updateTask(taskId, { description: descInput.value });
    };

    document.querySelector('.md-btn-bold')?.addEventListener('click', () => insertMarkdown('**', '**'));
    document.querySelector('.md-btn-italic')?.addEventListener('click', () => insertMarkdown('*', '*'));
    document.querySelector('.md-btn-code')?.addEventListener('click', () => insertMarkdown('`', '`'));
    document.querySelector('.md-btn-heading')?.addEventListener('click', () => insertMarkdown('### '));
    document.querySelector('.md-btn-list')?.addEventListener('click', () => insertMarkdown('- '));
    document.querySelector('.md-btn-numlist')?.addEventListener('click', () => insertMarkdown('1. '));
    document.querySelector('.md-btn-check')?.addEventListener('click', () => insertMarkdown('- [ ] '));
    document.querySelector('.md-btn-quote')?.addEventListener('click', () => insertMarkdown('> '));
    document.querySelector('.md-btn-link')?.addEventListener('click', () => insertMarkdown('[', '](https://)'));

    // Quick Action Bar shortcuts
    document.getElementById('btn-quick-add-subtask')?.addEventListener('click', () => {
      const input = document.getElementById('new-subtask-input') || document.getElementById('merged-new-input');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus(), 200);
      }
    });

    document.getElementById('btn-quick-add-checklist')?.addEventListener('click', () => {
      const input = document.getElementById('new-checklist-input') || document.getElementById('merged-new-input');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus(), 200);
      }
    });

    document.getElementById('btn-quick-add-comment')?.addEventListener('click', () => {
      const tabComments = document.getElementById('tab-btn-comments');
      if (tabComments) tabComments.click();
      const input = document.getElementById('detail-new-comment');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus(), 200);
      }
    });

    document.getElementById('btn-quick-timer')?.addEventListener('click', () => {
      const timerBtn = document.getElementById('btn-timer-toggle');
      if (timerBtn) {
        timerBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        timerBtn.click();
      }
    });

    // Property dropdown changes
    const statusSelect = document.getElementById('detail-task-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        const res = AppState.updateTask(taskId, { status: e.target.value });
        if (!res) {
          e.target.value = task.status;
        } else {
          const updated = AppState.tasks.find(t => t.id === taskId);
          this.syncTaskHeaderAndAttributes(updated);
          this.updateActivitySection(updated);
        }
      });
    }

    const prioritySelect = document.getElementById('detail-task-priority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { priority: e.target.value });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.syncTaskHeaderAndAttributes(updated);
        this.updateActivitySection(updated);
      });
    }

    const typeSelect = document.getElementById('detail-task-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { type: e.target.value });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    }

    const projectSelect = document.getElementById('detail-task-project');
    if (projectSelect) {
      projectSelect.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { projectId: e.target.value });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    }

    const startEl = document.getElementById('detail-task-start');
    if (startEl) {
      startEl.addEventListener('change', (e) => {
        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
        AppState.updateTask(taskId, { startDate: val });
      });
    }

    const dueEl = document.getElementById('detail-task-due');
    if (dueEl) {
      dueEl.addEventListener('change', (e) => {
        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
        AppState.updateTask(taskId, { dueDate: val });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    }

    const storyPointsInput = document.getElementById('detail-task-points');
    if (storyPointsInput && totalSubtasks === 0) {
      storyPointsInput.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { storyPoints: parseInt(e.target.value, 10) || 0 });
      });
    }

    const recurringSelect = document.getElementById('detail-task-recurring');
    if (recurringSelect) {
      recurringSelect.addEventListener('change', (e) => {
        const freq = e.target.value;
        AppState.updateTask(taskId, { recurring: freq ? { frequency: freq } : null });
      });
    }

    const sprintSelect = document.getElementById('detail-task-sprint');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { sprintId: e.target.value || null });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    }

    const epicSelect = document.getElementById('detail-task-epic');
    if (epicSelect) {
      epicSelect.addEventListener('change', (e) => {
        AppState.updateTask(taskId, { epicId: e.target.value || null });
      });
    }

    // Interactive Label management
    const addLabelBtn = document.getElementById('detail-btn-add-label');
    const labelInput = document.getElementById('detail-new-label-input');
    const handleAddLabel = () => {
      const val = labelInput ? labelInput.value.trim().toLowerCase() : '';
      if (!val) return;
      const currentLabels = Array.isArray(task.labels) ? [...task.labels] : [];
      if (!currentLabels.includes(val)) {
        currentLabels.push(val);
        AppState.updateTask(taskId, { labels: currentLabels });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      }
      if (labelInput) labelInput.value = '';
    };

    if (addLabelBtn && labelInput) {
      addLabelBtn.addEventListener('click', handleAddLabel);
      labelInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddLabel();
        }
      });
    }

    document.querySelectorAll('.del-label-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = btn.dataset.label;
        const currentLabels = (task.labels || []).filter(l => l !== tag);
        AppState.updateTask(taskId, { labels: currentLabels });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    // Toggle Merge / Separate View
    document.querySelectorAll('#btn-toggle-merge-view, #btn-toggle-merge-view-2').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.toggleMergeChecklistAndSubtasks(taskId);
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    // Subtask Link Navigation
    document.querySelectorAll('.subtask-open-link').forEach(el => {
      el.addEventListener('click', () => {
        const stId = el.dataset.id;
        const actualId = stId.startsWith('chk_task_') ? stId.replace('chk_', '') : stId;
        this.openDetail(actualId, true);
      });
    });

    // Separate mode checklist items
    document.querySelectorAll('.chk-item-toggle').forEach(chk => {
      chk.addEventListener('change', () => {
        const itemId = chk.dataset.id;
        const isDone = chk.checked;
        const list = (task.checklist || []).map(c => c.id === itemId ? { ...c, completed: isDone } : c);
        AppState.updateTask(taskId, { checklist: list });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    document.querySelectorAll('.chk-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        const list = (task.checklist || []).filter(c => c.id !== itemId);
        AppState.updateTask(taskId, { checklist: list });
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

    // Separate mode subtask items
    document.querySelectorAll('.subtask-item-toggle').forEach(chk => {
      chk.addEventListener('change', () => {
        const stId = chk.dataset.id;
        const isDone = chk.checked;
        AppState.updateTask(stId, { status: isDone ? 'done' : 'todo' });
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    });

    document.querySelectorAll('.subtask-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const stId = btn.dataset.id;
        AppState.deleteTask(stId, true, false);
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

    // Merged items event listeners
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

    const btnChkToSub = document.getElementById('btn-merge-chk-to-subtasks');
    if (btnChkToSub) {
      btnChkToSub.addEventListener('click', () => {
        const count = AppState.mergeChecklistToSubtasks(taskId);
        Toast.success(`Converted ${count} checklist item(s) to subtasks`);
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    }

    const btnSubToChk = document.getElementById('btn-merge-subtasks-to-chk');
    if (btnSubToChk) {
      btnSubToChk.addEventListener('click', () => {
        const count = AppState.mergeSubtasksToChecklist(taskId);
        Toast.success(`Imported ${count} subtask(s) into checklist`);
        const updated = AppState.tasks.find(t => t.id === taskId);
        this.renderDrawerContent(drawer, updated);
      });
    }

    // Comment Posting & Shortcuts
    const postCommBtn = document.getElementById('btn-post-comment');
    const newCommInput = document.getElementById('detail-new-comment');
    const cancelCommBtn = document.getElementById('btn-cancel-comment');

    const handlePostComment = () => {
      if (!newCommInput) return;
      const text = newCommInput.value.trim();
      if (!text) return;
      AppState.addComment(taskId, text);
      Toast.success('Comment posted to discussion');
      newCommInput.value = '';
      const updated = AppState.tasks.find(t => t.id === taskId);
      this.updateActivitySection(updated);
    };

    if (postCommBtn && newCommInput) {
      postCommBtn.addEventListener('click', handlePostComment);
      newCommInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handlePostComment();
        }
      });
    }

    if (cancelCommBtn && newCommInput) {
      cancelCommBtn.addEventListener('click', () => {
        newCommInput.value = '';
      });
    }

    // Comment actions (Copy & Delete)
    this.bindCommentActions(task);

    // Tab Switching for All Activity / Comments / History
    const tabBtns = [
      { btn: document.getElementById('tab-btn-all'), pane: document.getElementById('tab-content-all'), key: 'all' },
      { btn: document.getElementById('tab-btn-comments'), pane: document.getElementById('tab-content-comments'), key: 'comments' },
      { btn: document.getElementById('tab-btn-activity'), pane: document.getElementById('tab-content-activity'), key: 'activity' }
    ];

    tabBtns.forEach(({ btn, pane, key }) => {
      if (btn && pane) {
        btn.addEventListener('click', () => {
          this.activeActivityTab = key;
          tabBtns.forEach(t => {
            if (t.btn) t.btn.classList.toggle('active', t.key === key);
            if (t.pane) t.pane.classList.toggle('active', t.key === key);
          });
        });
      }
    });

    // Time tracking timer Start / Pause
    const timerBtn = document.getElementById('btn-timer-toggle');
    if (timerBtn) {
      let isRunning = !!this.activeTimerInterval;
      if (isRunning) {
        timerBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Live Timer';
        timerBtn.className = 'btn btn-primary btn-sm';
      }
      timerBtn.addEventListener('click', () => {
        isRunning = !isRunning;
        if (isRunning) {
          timerBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Live Timer';
          timerBtn.className = 'btn btn-primary btn-sm';
          this.activeTimerInterval = setInterval(() => {
            const current = AppState.tasks.find(t => t.id === taskId);
            if (current) {
              AppState.updateTask(taskId, { trackedTime: (current.trackedTime || 0) + 1 });
            }
          }, 60000);
          Toast.info('Time tracking started');
        } else {
          timerBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Live Timer';
          timerBtn.className = 'btn btn-secondary btn-sm';
          if (this.activeTimerInterval) {
            clearInterval(this.activeTimerInterval);
            this.activeTimerInterval = null;
          }
        }
      });
    }

    // Manual Log Time button
    const logTimeBtn = document.getElementById('btn-log-time');
    if (logTimeBtn) {
      logTimeBtn.addEventListener('click', () => {
        Modal.prompt('Log Time', 'Enter minutes to log for this task:', (val) => {
          const mins = parseInt(val, 10);
          if (mins && mins > 0) {
            AppState.updateTask(taskId, { trackedTime: (task.trackedTime || 0) + mins });
            const updated = AppState.tasks.find(t => t.id === taskId);
            this.renderDrawerContent(drawer, updated);
            Toast.success(`Logged ${mins} minutes`);
          }
        }, '30');
      });
    }

    // Keyboard shortcuts for full-page task detail navigation
    if (this._keyNavHandler) {
      window.removeEventListener('keydown', this._keyNavHandler);
    }
    this._keyNavHandler = (e) => {
      if (!this.isOpen) return;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === 'Escape') {
        if (!isInput) {
          e.preventDefault();
          this.closeDetail();
        }
      } else if (e.altKey && e.key === 'ArrowUp') {
        if (prevTask) {
          e.preventDefault();
          this.openDetail(prevTask.id, true);
        }
      } else if (e.altKey && e.key === 'ArrowDown') {
        if (nextTask) {
          e.preventDefault();
          this.openDetail(nextTask.id, true);
        }
      }
    };
    window.addEventListener('keydown', this._keyNavHandler);

    if (typeof DropdownUI !== 'undefined' && drawer) {
      DropdownUI.initAll(drawer);
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
   * @param {number} count - Number of items to generate
   * @returns {string[]} Array of generated item strings
   */
  generateBulkItems(template, count) {
    if (!template || !template.trim()) return [];
    const text = template.trim();
    const n = Math.max(1, parseInt(count, 10) || 1);

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
