/**
 * TaskForge - Focus Mode (Pomodoro Timer)
 * Features: Distraction-free single task cockpit, 25m work / 5m break cycles, Web Audio alerts, Session time logging
 */

const FocusView = {
  activeTaskId: null,
  workMinutes: 25,
  breakMinutes: 5,
  remainingSeconds: 25 * 60,
  timerState: 'idle', // 'running', 'paused', 'break'
  timerInterval: null,

  render(container) {
    // Check if query parameter specifies task
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const paramTaskId = params.get('task');
    if (paramTaskId) {
      this.activeTaskId = paramTaskId;
    }

    const tasks = AppState.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const currentTask = AppState.tasks.find(t => t.id === this.activeTaskId) || tasks[0];
    if (currentTask) this.activeTaskId = currentTask.id;

    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    container.innerHTML = `
      <div class="view-page" style="align-items: center; justify-content: center; min-height: 80vh;">
        
        <div style="width: 100%; max-width: 600px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 40px; box-shadow: var(--shadow-lg); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 24px;">
          
          <!-- Mode Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge" style="background: var(--accent-danger-subtle); color: var(--accent-danger); font-size: 12px; padding: 4px 10px;">
                <i class="fa-solid fa-bullseye"></i> Pomodoro Focus
              </span>
              <span style="font-size: 12px; color: var(--text-muted);">
                ${this.timerState === 'break' ? '☕ Rest Cycle' : '🔥 Deep Work Block'}
              </span>
            </div>

            <!-- Task Selector -->
            <select id="focus-task-select" class="form-select" style="max-width: 260px; font-size: 12px; padding: 4px 8px;">
              ${tasks.map(t => `<option value="${t.id}" ${t.id === this.activeTaskId ? 'selected' : ''}>${t.key}: ${Utils.escapeHTML(t.title)}</option>`).join('')}
            </select>
          </div>

          <!-- Active Task Spotlight -->
          ${currentTask ? `
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px 24px; width: 100%;">
              <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--accent-primary); margin-bottom: 4px;">
                ${currentTask.key}
              </div>
              <h2 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
                ${Utils.escapeHTML(currentTask.title)}
              </h2>
              <div style="display: flex; justify-content: center; gap: 12px; font-size: 12px; color: var(--text-muted);">
                <span>Tracked: <strong>${Utils.formatMinutes(currentTask.trackedTime)}</strong></span>
                <span>Estimate: <strong>${Utils.formatMinutes(currentTask.estimate)}</strong></span>
                <span class="badge-priority priority-${currentTask.priority}">${currentTask.priority}</span>
              </div>
            </div>
          ` : `
            <div style="color: var(--text-muted); font-size: 14px;">No active task selected.</div>
          `}

          <!-- Big Countdown Display -->
          <div style="font-family: var(--font-mono); font-size: 72px; font-weight: 700; color: ${this.timerState === 'break' ? 'var(--accent-success)' : 'var(--text-primary)'}; letter-spacing: -2px; line-height: 1;">
            ${timeDisplay}
          </div>

          <!-- Timer Controls -->
          <div style="display: flex; gap: 12px;">
            ${this.timerState === 'running' ? `
              <button id="btn-focus-pause" class="btn btn-secondary btn-lg">
                <i class="fa-solid fa-pause"></i> Pause
              </button>
            ` : `
              <button id="btn-focus-start" class="btn btn-primary btn-lg" style="min-width: 140px;">
                <i class="fa-solid fa-play"></i> Start Focus
              </button>
            `}

            <button id="btn-focus-reset" class="btn btn-ghost btn-lg" title="Reset Session">
              <i class="fa-solid fa-rotate-left"></i> Reset
            </button>

            ${currentTask ? `
              <button id="btn-focus-done" class="btn btn-ghost btn-lg" style="color: var(--accent-success);" title="Mark Task Done">
                <i class="fa-solid fa-check"></i> Complete Task
              </button>
            ` : ''}
          </div>

          <!-- Cycle Toggles -->
          <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 16px; width: 100%; justify-content: center;">
            <button class="btn btn-sm ${this.workMinutes === 25 ? 'btn-secondary' : 'btn-ghost'}" onclick="FocusView.setDuration(25, 5)">25m / 5m (Standard)</button>
            <button class="btn btn-sm ${this.workMinutes === 50 ? 'btn-secondary' : 'btn-ghost'}" onclick="FocusView.setDuration(50, 10)">50m / 10m (Extended)</button>
          </div>

        </div>

      </div>
    `;

    this.attachListeners(container);
  },

  attachListeners(container) {
    const taskSelect = container.querySelector('#focus-task-select');
    if (taskSelect) {
      taskSelect.addEventListener('change', (e) => {
        this.activeTaskId = e.target.value;
        this.render(container);
      });
    }

    const startBtn = container.querySelector('#btn-focus-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startTimer(container));
    }

    const pauseBtn = container.querySelector('#btn-focus-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.pauseTimer(container));
    }

    const resetBtn = container.querySelector('#btn-focus-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetTimer(container));
    }

    const doneBtn = container.querySelector('#btn-focus-done');
    if (doneBtn && this.activeTaskId) {
      doneBtn.addEventListener('click', () => {
        AppState.updateTask(this.activeTaskId, { status: 'done' });
        Toast.success('Task marked as Done!');
        this.resetTimer(container);
      });
    }
  },

  startTimer(container) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerState = 'running';
    Toast.info('Focus session started! Eliminate all distractions.');
    
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;

      // Log 1 minute tracked time every 60 seconds
      if (this.remainingSeconds % 60 === 0 && this.activeTaskId && this.timerState === 'running') {
        const task = AppState.tasks.find(t => t.id === this.activeTaskId);
        if (task) {
          AppState.updateTask(this.activeTaskId, { trackedTime: (task.trackedTime || 0) + 1 });
        }
      }

      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        Utils.playSound('timer');

        if (this.timerState === 'running') {
          this.timerState = 'break';
          this.remainingSeconds = this.breakMinutes * 60;
          Toast.success('Pomodoro completed! Time for a 5-minute break.');
        } else {
          this.timerState = 'idle';
          this.remainingSeconds = this.workMinutes * 60;
          Toast.info('Break finished! Ready for the next sprint?');
        }
      }

      this.render(container);
    }, 1000);

    this.render(container);
  },

  pauseTimer(container) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerState = 'paused';
    this.render(container);
  },

  resetTimer(container) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerState = 'idle';
    this.remainingSeconds = this.workMinutes * 60;
    this.render(container);
  },

  setDuration(work, brk) {
    this.workMinutes = work;
    this.breakMinutes = brk;
    this.resetTimer(document.getElementById('view-container'));
  }
};
