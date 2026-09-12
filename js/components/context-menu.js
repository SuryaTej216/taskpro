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

    this.menuEl.innerHTML = `
      <div class="context-menu-item" id="ctx-open">
        <i class="fa-regular fa-folder-open"></i> Open Task
      </div>
      <div class="context-menu-item" id="ctx-focus">
        <i class="fa-solid fa-bullseye"></i> Focus Mode
      </div>
      <div class="context-menu-item" id="ctx-duplicate">
        <i class="fa-regular fa-copy"></i> Duplicate
      </div>
      <div class="context-menu-divider"></div>
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
    const menuWidth = this.menuEl.offsetWidth || 180;
    const menuHeight = this.menuEl.offsetHeight || 220;
    const posX = (x + menuWidth > window.innerWidth) ? (window.innerWidth - menuWidth - 10) : x;
    const posY = (y + menuHeight > window.innerHeight) ? (window.innerHeight - menuHeight - 10) : y;

    this.menuEl.style.left = `${posX}px`;
    this.menuEl.style.top = `${posY}px`;

    // Bind listeners
    document.getElementById('ctx-open').addEventListener('click', () => {
      TaskModal.openDetail(task.id);
    });

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
