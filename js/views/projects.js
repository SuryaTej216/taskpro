/**
 * TaskForge - Projects Management View
 * Features: Project Gallery Cards, Progress Rollup, Create/Edit Project Modals
 */

const ProjectsView = {
  render(container) {
    const projects = AppState.projects;
    const tasks = AppState.tasks;
    const portfolioTasks = tasks.filter(t => !t.archived && t.status !== 'cancelled');
    const doneTasks = portfolioTasks.filter(t => t.status === 'done').length;
    const openTasks = portfolioTasks.filter(t => t.status !== 'done').length;
    const completion = portfolioTasks.length ? Math.round((doneTasks / portfolioTasks.length) * 100) : 0;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const ringC = 2 * Math.PI * 22;
    const ringOffset = ringC * (1 - completion / 100);

    container.innerHTML = `
      <div class="view-page projects-page">
        <header class="view-header projects-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-folder-tree projects-title-icon"></i> Projects</h1>
            <p>Manage all your initiatives, portfolios, and personal workspaces.</p>
          </div>
          <div class="view-actions">
            <button id="btn-create-project" class="btn btn-primary">
              <i class="fa-solid fa-plus"></i> New Project
            </button>
          </div>
        </header>

        <section class="planner-summary projects-summary" aria-label="Portfolio summary">
          <div class="planner-kpi planner-kpi-progress">
            <svg class="planner-ring" viewBox="0 0 52 52" aria-hidden="true">
              <circle class="planner-ring-track" cx="26" cy="26" r="22"></circle>
              <circle class="planner-ring-fill" cx="26" cy="26" r="22"
                style="stroke-dasharray: ${ringC.toFixed(2)}; stroke-dashoffset: ${ringOffset.toFixed(2)};"></circle>
            </svg>
            <div class="planner-kpi-ring-label">${completion}%</div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Portfolio progress</span>
              <span class="planner-kpi-value">${doneTasks} <small>of ${portfolioTasks.length} done</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-blue"><i class="fa-solid fa-folder-tree"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Projects</span>
              <span class="planner-kpi-value">${projects.length} <small>total</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon kpi-purple"><i class="fa-solid fa-bolt"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Active projects</span>
              <span class="planner-kpi-value">${activeProjects} <small>in progress</small></span>
            </div>
          </div>
          <div class="planner-kpi">
            <div class="planner-kpi-icon ${openTasks ? 'kpi-red' : 'kpi-green'}"><i class="fa-solid ${openTasks ? 'fa-list-check' : 'fa-circle-check'}"></i></div>
            <div class="planner-kpi-text">
              <span class="planner-kpi-title">Open tasks</span>
              <span class="planner-kpi-value">${openTasks} <small>${openTasks ? 'across projects' : 'all clear'}</small></span>
            </div>
          </div>
        </section>

        <section class="projects-section" aria-label="Projects">
          <div class="projects-section-head">
            <h2>All projects</h2>
            <span>${projects.length} project${projects.length === 1 ? '' : 's'}</span>
          </div>
          ${projects.length === 0 ? `
            <div class="projects-empty">
              <div class="projects-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
              <h3>No projects yet</h3>
              <p>Create a project to organize tasks, track progress, and bring related work together.</p>
              <span>Use <strong>New Project</strong> in the top-right corner to get started.</span>
            </div>
          ` : `
            <div class="projects-grid">
              ${projects.map(proj => {
                const projectTasks = tasks.filter(t => t.projectId === proj.id && !t.archived && t.status !== 'cancelled');
                const projectDone = projectTasks.filter(t => t.status === 'done').length;
                const projectOpen = projectTasks.length - projectDone;
                const progress = projectTasks.length ? Math.round((projectDone / projectTasks.length) * 100) : 0;
                const accent = /^#[\da-f]{3,8}$/i.test(proj.color || '') ? proj.color : '#579DFF';
                const status = String(proj.status || 'planning').toLowerCase();
                const statusLabel = status.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

                return `
                  <article class="project-card ${projectTasks.length && progress === 100 ? 'is-complete' : ''}" style="--project-accent: ${accent};">
                    <header class="project-card-head">
                      <div class="project-heading">
                        <h3>${Utils.escapeHTML(proj.name)}</h3>
                        <div class="project-key">${Utils.escapeHTML(proj.key)}</div>
                      </div>
                      <span class="project-status status-${Utils.escapeHTML(status)}">${Utils.escapeHTML(statusLabel)}</span>
                    </header>

                    <div class="project-card-progress" title="${progress}% complete">
                      <div class="project-progress-label">
                        <span>Task progress</span>
                        <strong>${projectTasks.length ? `${projectDone} of ${projectTasks.length} · ${progress}%` : 'No tasks yet'}</strong>
                      </div>
                      <div class="project-progress-track" role="progressbar" aria-label="Task progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
                        <div class="project-progress-fill" style="width: ${progress}%;"></div>
                      </div>
                    </div>

                    <div class="project-card-meta">
                      <span><i class="fa-solid fa-list-check"></i> ${projectOpen} open task${projectOpen === 1 ? '' : 's'}</span>
                      <span>${proj.targetDate
                        ? `<i class="fa-regular fa-calendar"></i> Target ${Utils.escapeHTML(Utils.formatDate(proj.targetDate))}`
                        : '<i class="fa-regular fa-calendar"></i> No target date'}</span>
                    </div>

                    <p class="project-description">${Utils.escapeHTML(proj.description || 'Add a description to clarify this project’s goal.')}</p>

                    <footer class="project-card-footer">
                      <div class="project-card-actions">
                        <a href="#/tasks?project=${encodeURIComponent(proj.id)}" class="btn btn-secondary btn-sm" title="Open project tasks">
                          <i class="fa-solid fa-table-columns"></i> Tasks
                        </a>
                        <button type="button" class="btn btn-ghost btn-sm" data-project-action="edit" data-project-id="${Utils.escapeHTML(proj.id)}" title="Edit project" aria-label="Edit ${Utils.escapeHTML(proj.name)}">
                          <i class="fa-solid fa-pen"></i>
                        </button>
                      </div>
                    </footer>
                  </article>
                `;
              }).join('')}
            </div>
          `}
        </section>
      </div>
    `;

    const createBtn = container.querySelector('#btn-create-project');
    if (createBtn) createBtn.addEventListener('click', () => this.openCreateModal());

    container.querySelectorAll('[data-project-action="edit"]').forEach(button => {
      button.addEventListener('click', () => this.openEditModal(button.dataset.projectId));
    });
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
