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

    // 2. Parent task progress update if this is a subtask
    if (updatedTask.parentId) {
      this.updateParentProgress(updatedTask.parentId);
    }

    // 3. Goal progress roll-up
    this.recalculateGoals();
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
