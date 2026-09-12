/**
 * TaskForge - Strategic Goals & OKRs View
 * Features: High-level objectives with automated progress calculation from linked initiatives
 */

const GoalsView = {
  render(container) {
    const goals = AppState.goals;

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-flag-checkered" style="color: var(--accent-primary);"></i> Strategic Goals & OKRs</h1>
            <p>Connect high-level objectives with daily execution and automated milestone tracking.</p>
          </div>
          <div class="view-actions">
            <button id="btn-create-goal" class="btn btn-primary">
              <i class="fa-solid fa-plus"></i> New Goal
            </button>
          </div>
        </div>

        <!-- Goals Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
          ${goals.length === 0 ? `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border-default); border-radius: var(--radius-lg);">
              <i class="fa-solid fa-flag-checkered empty-state-icon" style="color: var(--accent-primary); font-size: 48px;"></i>
              <div class="empty-state-title" style="font-size: 18px; margin-top: 8px;">No Strategic Goals Yet</div>
              <div class="empty-state-desc" style="max-width: 400px; margin-bottom: 20px;">
                Define high-level OKRs and track completion automatically as you resolve linked project tasks.
              </div>
              <button class="btn btn-primary" onclick="GoalsView.openCreateModal()">
                <i class="fa-solid fa-plus"></i> Create First Goal
              </button>
            </div>
          ` : goals.map(goal => {
            const linkedTasks = AppState.tasks.filter(t => (goal.projectIds && goal.projectIds.includes(t.projectId)));
            const doneTasks = linkedTasks.filter(t => t.status === 'done').length;

            return `
              <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
                <div>
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;">
                    <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); line-height: 1.3;">
                      ${Utils.escapeHTML(goal.title)}
                    </h3>
                    <span class="badge" style="background: var(--accent-primary-subtle); color: var(--accent-primary);">
                      ${goal.progress}%
                    </span>
                  </div>

                  <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 16px;">
                    ${Utils.escapeHTML(goal.description || '')}
                  </p>
                </div>

                <div>
                  <!-- Progress Bar -->
                  <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">
                      <span>Execution Progress</span>
                      <span style="font-weight: 600; color: var(--accent-success);">${goal.progress}%</span>
                    </div>
                    <div class="progress-bar-container">
                      <div class="progress-bar-fill" style="width: ${goal.progress}%;"></div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 12px; font-size: 12px; color: var(--text-muted);">
                    <div>
                      <i class="fa-regular fa-clock"></i> Target: ${Utils.formatDate(goal.targetDate)}
                    </div>
                    <div>
                      <span>${doneTasks}/${linkedTasks.length} tasks resolved</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    const createBtn = container.querySelector('#btn-create-goal');
    if (createBtn) createBtn.addEventListener('click', () => this.openCreateModal());
  },

  openCreateModal() {
    const modalBody = `
      <form id="create-goal-form">
        <div class="form-group">
          <label class="form-label">Goal Title <span class="required">*</span></label>
          <input type="text" id="goal-create-title" class="form-input" placeholder="e.g. Launch TaskForge 1.0 Commercial Grade Experience" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="goal-create-desc" class="form-textarea" placeholder="What key results define success for this objective?"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Target Completion Date</label>
            <input type="date" id="goal-create-target" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">Initial Progress (%)</label>
            <input type="number" id="goal-create-progress" class="form-input" min="0" max="100" value="0">
          </div>
        </div>
      </form>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-flag" style="color: var(--accent-primary);"></i> Create Strategic Goal',
      body: modalBody,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Create Goal',
          class: 'btn-primary',
          onClick: () => {
            const title = document.getElementById('goal-create-title').value.trim();
            if (!title) return;

            const newGoal = {
              id: Utils.generateId('goal_'),
              title,
              description: document.getElementById('goal-create-desc').value.trim(),
              targetDate: document.getElementById('goal-create-target').value ? new Date(document.getElementById('goal-create-target').value).toISOString() : null,
              progress: parseInt(document.getElementById('goal-create-progress').value, 10) || 0,
              projectIds: AppState.projects.map(p => p.id)
            };

            AppState.goals.push(newGoal);
            StorageService.set(StorageService.KEYS.GOALS, AppState.goals);
            AppState.emit('goals:changed');
            Modal.close();
            Router.renderCurrentRoute();
            Toast.success(`Created Goal: "${newGoal.title}"`);
          }
        }
      ]
    });
  }
};
