/**
 * TaskForge - Browser-Local Workflow Automations
 * Handles automated progress rollups, recurring task generation, and overdue alerts.
 */

const Automations = {
  /**
   * Called whenever a task is updated in AppState
   * @param {Object} updatedTask 
   * @param {Object} oldTask 
   */
  onTaskUpdated(updatedTask, oldTask) {
    // 1. Recurring task generation on completion
    if (updatedTask.status === 'done' && oldTask.status !== 'done') {
      this.handleRecurringTask(updatedTask);
      Toast.success(`Completed ${updatedTask.key}! Great work.`);
    }

    // 2. Parent task progress and checklist sync if this is a subtask
    if (updatedTask.parentId) {
      this.syncSubtaskToParentChecklist(updatedTask);
      this.updateParentProgress(updatedTask.parentId);
    } else if (updatedTask.checklist && (!oldTask.checklist || JSON.stringify(updatedTask.checklist) !== JSON.stringify(oldTask.checklist))) {
      this.syncParentChecklistToSubtasks(updatedTask);
    }

    // 3. Goal progress roll-up
    this.recalculateGoals();
  },

  /**
   * Syncs child subtask completion state back into parent task's checklist
   * @param {Object} subtask 
   */
  syncSubtaskToParentChecklist(subtask) {
    if (!subtask.parentId) return;
    const parent = AppState.tasks.find(t => t.id === subtask.parentId);
    if (!parent || parent.syncChecklistSubtasks === false) return;
    if (!Array.isArray(parent.checklist) || parent.checklist.length === 0) return;

    const norm = (s) => (s || '').trim().toLowerCase();
    const isDone = subtask.status === 'done';
    let changed = false;
    const list = parent.checklist.map(item => {
      if (item.subtaskId === subtask.id || norm(item.text) === norm(subtask.title)) {
        if (item.completed !== isDone || !item.subtaskId) {
          changed = true;
          return { ...item, completed: isDone, subtaskId: subtask.id };
        }
      }
      return item;
    });

    if (changed) {
      const pIdx = AppState.tasks.findIndex(t => t.id === parent.id);
      if (pIdx !== -1) {
        AppState.tasks[pIdx].checklist = list;
        StorageService.set(StorageService.KEYS.TASKS, AppState.tasks);
        AppState.emit('tasks:changed', { action: 'update', task: AppState.tasks[pIdx] });
      }
    }
  },

  /**
   * Syncs parent task's checklist items to child subtasks
   * @param {Object} parentTask 
   */
  syncParentChecklistToSubtasks(parentTask) {
    if (parentTask.syncChecklistSubtasks === false) return;
    if (!Array.isArray(parentTask.checklist)) return;

    const childSubtasks = AppState.tasks.filter(t => t.parentId === parentTask.id);
    if (childSubtasks.length === 0) return;

    const norm = (s) => (s || '').trim().toLowerCase();
    parentTask.checklist.forEach(item => {
      let st = null;
      if (item.subtaskId) {
        st = childSubtasks.find(t => t.id === item.subtaskId);
      }
      if (!st) {
        st = childSubtasks.find(t => norm(t.title) === norm(item.text));
      }

      if (st) {
        const shouldBeDone = item.completed;
        const isDone = st.status === 'done';
        if (shouldBeDone !== isDone) {
          AppState.updateTask(st.id, { status: shouldBeDone ? 'done' : 'todo' });
        }
      }
    });
  },

  /**
   * Generates next occurrence if task has recurring configuration
   * @param {Object} task 
   */
  handleRecurringTask(task) {
    if (!task.recurring || !task.recurring.frequency) return;

    const freq = task.recurring.frequency; // 'daily', 'weekly', 'monthly'
    const nextDate = new Date();

    if (freq === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (freq === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (freq === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const nextTask = {
      projectId: task.projectId,
      epicId: task.epicId,
      type: task.type,
      title: task.title,
      description: task.description,
      status: 'todo',
      priority: task.priority,
      labels: [...(task.labels || [])],
      dueDate: nextDate.toISOString(),
      estimate: task.estimate,
      storyPoints: task.storyPoints,
      recurring: { ...task.recurring }
    };

    setTimeout(() => {
      const created = AppState.createTask(nextTask);
      Toast.info(`Generated next recurring occurrence: ${created.key}`);
    }, 500);
  },

  /**
   * Recalculates parent task subtask progress bar
   * @param {string} parentId 
   */
  updateParentProgress(parentId) {
    const parent = AppState.tasks.find(t => t.id === parentId);
    if (!parent) return;

    const subtasks = AppState.tasks.filter(t => t.parentId === parentId);
    if (subtasks.length === 0) return;

    const completed = subtasks.filter(t => t.status === 'done').length;
    const allDone = completed === subtasks.length;

    // If all subtasks done, offer or auto-complete parent
    if (allDone && parent.status !== 'done') {
      AppState.updateTask(parent.id, { status: 'inreview' });
      Toast.info(`All subtasks done for ${parent.key}. Moved to IN REVIEW.`);
    }
  },

  /**
   * Recalculates goal completion percentages based on linked tasks/projects
   */
  recalculateGoals() {
    let changed = false;
    AppState.goals.forEach(goal => {
      const linkedTasks = AppState.tasks.filter(t => 
        (goal.projectIds && goal.projectIds.includes(t.projectId)) ||
        (goal.taskIds && goal.taskIds.includes(t.id))
      );

      if (linkedTasks.length > 0) {
        const doneTasks = linkedTasks.filter(t => t.status === 'done').length;
        const newProgress = Math.round((doneTasks / linkedTasks.length) * 100);
        if (goal.progress !== newProgress) {
          goal.progress = newProgress;
          changed = true;
        }
      }
    });

    if (changed) {
      StorageService.set(StorageService.KEYS.GOALS, AppState.goals);
      AppState.emit('goals:changed');
    }
  },

  /**
   * Checks for overdue tasks and triggers in-app notification
   */
  checkOverdueAndAlert() {
    const overdueTasks = AppState.tasks.filter(t => Utils.isOverdue(t.dueDate, t.status));
    const unnotified = overdueTasks.filter(t => {
      return !AppState.notifications.some(n => n.taskId === t.id && n.type === 'warning');
    });

    unnotified.forEach(task => {
      Notifications.addNotification({
        title: 'Task Overdue',
        message: `${task.key} "${task.title}" has passed its due date.`,
        type: 'warning',
        taskId: task.id
      });
    });
  }
};
