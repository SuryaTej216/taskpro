/**
 * TaskForge - Custom Context Menu (Right-Click Controls)
 */

const ContextMenu = {
  menuEl: null,
  activeTask: null,

  init() {
    this.menuEl = document.getElementById('custom-context-menu');

    document.addEventListener('click', () => {
      this.close();
    });

    window.addEventListener('resize', () => {
      this.close();
    });
  },

  open(x, y, task) {
    if (!this.menuEl) this.init();
    this.activeTask = task;

    const activeSprint = AppState.sprints.find(s => s.status === 'active');
    const isInSprint = !!task.sprintId;

    this.menuEl.innerHTML = `
      <div class="context-menu-item" id="ctx-open">
        <i class="fa-regular fa-folder-open"></i> Open Task
      </div>
      <div class="context-menu-item" id="ctx-subtask">
        <i class="fa-solid fa-network-wired"></i> Add Subtask
      </div>
      <div class="context-menu-item" id="ctx-sync">
        <i class="fa-solid fa-arrows-rotate"></i> Sync Checklist & Subtasks
      </div>
      <div class="context-menu-item" id="ctx-focus">
        <i class="fa-solid fa-bullseye"></i> Focus Mode
      </div>
      <div class="context-menu-item" id="ctx-duplicate">
        <i class="fa-regular fa-copy"></i> Duplicate
      </div>
      <div class="context-menu-divider"></div>
      ${activeSprint && !isInSprint ? `
        <div class="context-menu-item" id="ctx-sprint-add">
          <i class="fa-solid fa-person-running"></i> Move to Active Sprint
        </div>
      ` : (isInSprint ? `
        <div class="context-menu-item" id="ctx-sprint-remove">
          <i class="fa-solid fa-box-archive"></i> Move to Backlog Pool
        </div>
      ` : '')}
      <div class="context-menu-item" id="ctx-status-todo">
        <i class="fa-regular fa-circle"></i> Move to To Do
      </div>
      <div class="context-menu-item" id="ctx-status-progress">
        <i class="fa-regular fa-circle-play"></i> Move to In Progress
      </div>
      <div class="context-menu-item" id="ctx-status-done">
        <i class="fa-regular fa-circle-check"></i> Move to Done
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" id="ctx-delete">
        <i class="fa-regular fa-trash-can"></i> Delete
      </div>
    `;

    // Position correctly within viewport boundaries
    this.menuEl.style.display = 'block';
    const menuWidth = this.menuEl.offsetWidth || 190;
    const menuHeight = this.menuEl.offsetHeight || 260;
    const posX = (x + menuWidth > window.innerWidth) ? (window.innerWidth - menuWidth - 10) : x;
    const posY = (y + menuHeight > window.innerHeight) ? (window.innerHeight - menuHeight - 10) : y;

    this.menuEl.style.left = `${posX}px`;
    this.menuEl.style.top = `${posY}px`;

    // Bind listeners
    document.getElementById('ctx-open').addEventListener('click', () => {
      TaskModal.openDetail(task.id);
    });

    const ctxSubtask = document.getElementById('ctx-subtask');
    if (ctxSubtask) {
      ctxSubtask.addEventListener('click', () => {
        TaskModal.openCreate({ parentId: task.id, projectId: task.projectId });
      });
    }

    const ctxSync = document.getElementById('ctx-sync');
    if (ctxSync) {
      ctxSync.addEventListener('click', () => {
        const res = AppState.syncTaskChecklistAndSubtasks(task.id);
        Toast.success(`Synced ${task.key}! (${res.createdSubtasks} subtasks, ${res.createdChecklistItems} checklist items)`);
      });
    }

    const ctxSprintAdd = document.getElementById('ctx-sprint-add');
    if (ctxSprintAdd && activeSprint) {
      ctxSprintAdd.addEventListener('click', () => {
        AppState.updateTask(task.id, { sprintId: activeSprint.id });
        Toast.success(`Moved ${task.key} to ${activeSprint.name}`);
      });
    }

    const ctxSprintRemove = document.getElementById('ctx-sprint-remove');
    if (ctxSprintRemove) {
      ctxSprintRemove.addEventListener('click', () => {
        AppState.updateTask(task.id, { sprintId: null });
        Toast.info(`Moved ${task.key} to Backlog Pool`);
      });
    }

    document.getElementById('ctx-focus').addEventListener('click', () => {
      window.location.hash = `#/focus?task=${task.id}`;
    });

    document.getElementById('ctx-duplicate').addEventListener('click', () => {
      AppState.duplicateTask(task.id);
    });

    document.getElementById('ctx-status-todo').addEventListener('click', () => {
      AppState.updateTask(task.id, { status: 'todo' });
    });

    document.getElementById('ctx-status-progress').addEventListener('click', () => {
      AppState.updateTask(task.id, { status: 'inprogress' });
    });

    document.getElementById('ctx-status-done').addEventListener('click', () => {
      AppState.updateTask(task.id, { status: 'done' });
    });

    document.getElementById('ctx-delete').addEventListener('click', () => {
      AppState.deleteTask(task.id, true, true);
    });
  },

  close() {
    if (this.menuEl) {
      this.menuEl.style.display = 'none';
      this.activeTask = null;
    }
  }
};
