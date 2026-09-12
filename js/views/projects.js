/**
 * TaskForge - Projects Management View
 * Features: Project Gallery Cards, Progress Rollup, Create/Edit Project Modals
 */

const ProjectsView = {
  render(container) {
    const projects = AppState.projects;
    const tasks = AppState.tasks;

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-folder-tree" style="color: var(--accent-primary);"></i> Projects</h1>
            <p>Manage all your initiatives, portfolios, and personal workspaces.</p>
          </div>
          <div class="view-actions">
            <button id="btn-create-project" class="btn btn-primary">
              <i class="fa-solid fa-plus"></i> New Project
            </button>
          </div>
        </div>

        <!-- Project Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
          ${projects.length === 0 ? `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-default); border-radius: var(--radius-lg);">
              <i class="fa-solid fa-folder-open empty-state-icon" style="color: var(--accent-primary); font-size: 48px;"></i>
              <div class="empty-state-title" style="font-size: 18px; margin-top: 8px;">No Projects Yet</div>
              <div class="empty-state-desc" style="max-width: 400px; margin-bottom: 20px;">
                Create your first project to start tracking epics, user stories, sprints, and tasks in a structured workspace.
              </div>
              <button class="btn btn-primary" onclick="ProjectsView.openCreateModal()">
                <i class="fa-solid fa-plus"></i> Create Your First Project
              </button>
            </div>
          ` : projects.map(proj => {
            const projTasks = tasks.filter(t => t.projectId === proj.id);
            const doneTasks = projTasks.filter(t => t.status === 'done').length;
            const progress = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0;
            const openTasks = projTasks.length - doneTasks;

            return `
              <div class="project-card" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: all var(--transition-fast); box-shadow: var(--shadow-sm);">
                
                <div>
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: ${proj.color || '#388bfd'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
                        <i class="fa-solid ${proj.icon || 'fa-folder'}"></i>
                      </div>
                      <div>
                        <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); line-height: 1.3;">${Utils.escapeHTML(proj.name)}</h3>
                        <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--text-muted);">${proj.key}</span>
                      </div>
                    </div>

                    <span class="badge badge-status-${proj.status}">${proj.status}</span>
                  </div>

                  <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${Utils.escapeHTML(proj.description || 'No description provided.')}
                  </p>
                </div>

                <div>
                  <!-- Progress Bar -->
                  <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">
                      <span>Completion</span>
                      <span style="font-weight: 600; color: var(--text-primary);">${progress}%</span>
                    </div>
                    <div class="progress-bar-container">
                      <div class="progress-bar-fill" style="width: ${progress}%; background: ${proj.color || 'var(--accent-primary)'};"></div>
                    </div>
                  </div>

                  <!-- Footer Meta & Actions -->
                  <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 12px; font-size: 12px;">
                    <div style="color: var(--text-muted);">
                      <span><strong>${openTasks}</strong> open</span> • <span><strong>${doneTasks}</strong> done</span>
                    </div>

                    <div style="display: flex; gap: 6px;">
                      <a href="#/board?project=${proj.id}" class="btn btn-secondary btn-sm" title="Open Board">
                        <i class="fa-solid fa-table-columns"></i> Board
                      </a>
                      <button class="btn btn-ghost btn-sm" onclick="ProjectsView.openEditModal('${proj.id}')" title="Edit Project">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    // Attach create listener
    const createBtn = container.querySelector('#btn-create-project');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.openCreateModal());
    }
  },

  openCreateModal() {
    const modalBody = `
      <form id="create-project-form">
        <div class="form-group">
          <label class="form-label">Project Name <span class="required">*</span></label>
          <input type="text" id="proj-create-name" class="form-input" placeholder="e.g. Mobile Application V2" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Project Key (Prefix) <span class="required">*</span></label>
            <input type="text" id="proj-create-key" class="form-input" placeholder="MOB" maxlength="6" style="text-transform: uppercase;" required>
          </div>
          <div class="form-group">
            <label class="form-label">Color Theme</label>
            <input type="color" id="proj-create-color" value="#388bfd" style="height: 38px; width: 60px; border: none; background: transparent; cursor: pointer;">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="proj-create-desc" class="form-textarea" placeholder="Core objectives, scopes, and target results..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" id="proj-create-start" class="form-input" value="${Utils.toDateInputValue(new Date())}">
          </div>
          <div class="form-group">
            <label class="form-label">Target Completion Date</label>
            <input type="date" id="proj-create-target" class="form-input">
          </div>
        </div>
      </form>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-folder-plus" style="color: var(--accent-primary);"></i> Create New Project',
      body: modalBody,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Create Project',
          class: 'btn-primary',
          onClick: () => {
            const name = document.getElementById('proj-create-name').value.trim();
            const key = document.getElementById('proj-create-key').value.trim().toUpperCase();
            if (!name || !key) return;

            const proj = AppState.createProject({
              name,
              key,
              color: document.getElementById('proj-create-color').value,
              description: document.getElementById('proj-create-desc').value.trim(),
              startDate: document.getElementById('proj-create-start').value ? new Date(document.getElementById('proj-create-start').value).toISOString() : new Date().toISOString(),
              targetDate: document.getElementById('proj-create-target').value ? new Date(document.getElementById('proj-create-target').value).toISOString() : null
            });

            Modal.close();
            Router.renderCurrentRoute();
          }
        }
      ]
    });
  },

  openEditModal(projectId) {
    const proj = AppState.projects.find(p => p.id === projectId);
    if (!proj) return;

    const modalBody = `
      <form id="edit-project-form">
        <div class="form-group">
          <label class="form-label">Project Name</label>
          <input type="text" id="proj-edit-name" class="form-input" value="${Utils.escapeHTML(proj.name)}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="proj-edit-desc" class="form-textarea">${Utils.escapeHTML(proj.description || '')}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="proj-edit-status" class="form-select">
              <option value="active" ${proj.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="planning" ${proj.status === 'planning' ? 'selected' : ''}>Planning</option>
              <option value="on-hold" ${proj.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
              <option value="completed" ${proj.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="archived" ${proj.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <input type="color" id="proj-edit-color" value="${proj.color || '#388bfd'}" style="height: 38px; width: 60px; border: none; background: transparent; cursor: pointer;">
          </div>
        </div>
      </form>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-pen" style="color: var(--accent-primary);"></i> Edit Project',
      body: modalBody,
      size: 'md',
      footerButtons: [
        {
          text: 'Delete Project',
          class: 'btn-danger',
          onClick: () => {
            Modal.close();
            AppState.deleteProject(projectId);
          }
        },
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Save Changes',
          class: 'btn-primary',
          onClick: () => {
            const name = document.getElementById('proj-edit-name').value.trim();
            if (!name) return;

            AppState.updateProject(projectId, {
              name,
              description: document.getElementById('proj-edit-desc').value.trim(),
              status: document.getElementById('proj-edit-status').value,
              color: document.getElementById('proj-edit-color').value
            });

            Modal.close();
            Router.renderCurrentRoute();
            Toast.success('Project updated.');
          }
        }
      ]
    });
  }
};
