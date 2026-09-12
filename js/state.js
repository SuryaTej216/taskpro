/**
 * TaskForge - Reactive Central Application State & Undo/Redo Engine
 */

const AppState = {
  // In-memory data collections
  projects: [],
  tasks: [],
  epics: [],
  sprints: [],
  labels: [],
  goals: [],
  comments: [],
  activity: [],
  notifications: [],
  settings: {},

  // UI state
  currentView: 'dashboard',
  selectedProjectId: null, // null means "All Projects"
  selectedTaskId: null,
  searchQuery: '',
  activeFilters: {
    status: [],
    priority: [],
    type: [],
    labels: [],
    sprintId: null
  },

  // Undo / Redo Stacks
  undoStack: [],
  redoStack: [],
  maxHistorySize: 30,

  // Event Listeners (Pub/Sub)
  listeners: {},

  /**
   * Initializes state from StorageService
   */
  init() {
    StorageService.initDemoDataIfFirstTime();

    this.projects = StorageService.get(StorageService.KEYS.PROJECTS, []);
    this.tasks = StorageService.get(StorageService.KEYS.TASKS, []);
    this.epics = StorageService.get(StorageService.KEYS.EPICS, []);
    this.sprints = StorageService.get(StorageService.KEYS.SPRINTS, []);
    this.labels = StorageService.get(StorageService.KEYS.LABELS, []);
    this.goals = StorageService.get(StorageService.KEYS.GOALS, []);
    this.comments = StorageService.get(StorageService.KEYS.COMMENTS, []);
    this.activity = StorageService.get(StorageService.KEYS.ACTIVITY, []);
    this.notifications = StorageService.get(StorageService.KEYS.NOTIFICATIONS, []);
    this.settings = StorageService.get(StorageService.KEYS.SETTINGS, {
      theme: 'dark',
      soundEffects: true
    });

    // Apply saved theme
    document.documentElement.setAttribute('data-theme', this.settings.theme || 'dark');
  },

  /**
   * Subscribes to state change events
   * @param {string} event 
   * @param {Function} callback 
   */
  subscribe(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  /**
   * Emits an event to all subscribers
   * @param {string} event 
   * @param {any} data 
   */
  emit(event, data = {}) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for "${event}"`, err);
        }
      });
    }
  },

  /**
   * Saves current state snapshot to undo stack
   * @param {string} description 
   */
  recordUndoAction(description, reverseFn, forwardFn) {
    this.undoStack.push({ description, reverseFn, forwardFn });
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
    this.emit('history:changed', { canUndo: this.canUndo(), canRedo: this.canRedo() });
  },

  canUndo() { return this.undoStack.length > 0; },
  canRedo() { return this.redoStack.length > 0; },

  undo() {
    if (!this.canUndo()) return;
    const action = this.undoStack.pop();
    action.reverseFn();
    this.redoStack.push(action);
    this.emit('history:changed', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    Toast.info(`Undo: ${action.description}`);
  },

  redo() {
    if (!this.canRedo()) return;
    const action = this.redoStack.pop();
    action.forwardFn();
    this.undoStack.push(action);
    this.emit('history:changed', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    Toast.info(`Redo: ${action.description}`);
  },

  // -------------------------------------------------------------
  // TASK MUTATIONS
  // -------------------------------------------------------------

  /**
   * Generates next task key e.g. "WEB-7"
   * @param {string} projectId 
   * @returns {string}
   */
  getNextTaskKey(projectId) {
    const project = this.projects.find(p => p.id === projectId) || this.projects[0];
    const prefix = project ? project.key : 'TASK';
    const projectTasks = this.tasks.filter(t => t.projectId === projectId || (t.key && t.key.startsWith(prefix)));
    let highestNum = 0;
    projectTasks.forEach(t => {
      if (t.key) {
        const parts = t.key.split('-');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > highestNum) highestNum = num;
      }
    });
    return `${prefix}-${highestNum + 1}`;
  },

  /**
   * Creates a new task
   * @param {Object} taskData 
   * @returns {Object}
   */
  createTask(taskData) {
    const now = new Date().toISOString();
    const newTask = {
      id: Utils.generateId('task_'),
      key: taskData.key || this.getNextTaskKey(taskData.projectId),
      projectId: taskData.projectId || (this.projects[0] ? this.projects[0].id : 'proj_default'),
      parentId: taskData.parentId || null,
      epicId: taskData.epicId || null,
      sprintId: taskData.sprintId || null,
      type: taskData.type || 'task',
      title: taskData.title.trim(),
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      labels: Array.isArray(taskData.labels) ? taskData.labels : [],
      dueDate: taskData.dueDate || null,
      startDate: taskData.startDate || null,
      estimate: parseInt(taskData.estimate, 10) || 0,
      trackedTime: parseInt(taskData.trackedTime, 10) || 0,
      storyPoints: parseInt(taskData.storyPoints, 10) || 0,
      dependencies: Array.isArray(taskData.dependencies) ? taskData.dependencies : [],
      checklist: Array.isArray(taskData.checklist) ? taskData.checklist : [],
      createdAt: now,
      updatedAt: now,
      completedAt: taskData.status === 'done' ? now : null,
      archived: false
    };

    this.tasks.push(newTask);
    StorageService.set(StorageService.KEYS.TASKS, this.tasks);

    this.addActivityLog(newTask.id, 'created', `Created task ${newTask.key}`);
    
    // Undo support
    this.recordUndoAction(
      `Create task ${newTask.key}`,
      () => this.deleteTask(newTask.id, false, false),
      () => {
        this.tasks.push(newTask);
        StorageService.set(StorageService.KEYS.TASKS, this.tasks);
        this.emit('tasks:changed', { action: 'create', task: newTask });
      }
    );

    this.emit('tasks:changed', { action: 'create', task: newTask });
    if (this.settings.soundEffects) Utils.playSound('success');
    return newTask;
  },

  /**
   * Updates an existing task
   * @param {string} taskId 
   * @param {Object} updates 
   * @returns {Object|null}
   */
  updateTask(taskId, updates) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;

    const oldTask = { ...this.tasks[taskIndex] };
    const now = new Date().toISOString();
    
    // Automatically record completion timestamp if transitioned to done
    if (updates.status && updates.status === 'done' && oldTask.status !== 'done') {
      updates.completedAt = now;
      if (this.settings.soundEffects) Utils.playSound('success');
    } else if (updates.status && updates.status !== 'done' && oldTask.status === 'done') {
      updates.completedAt = null;
    }

    const updatedTask = {
      ...oldTask,
      ...updates,
      updatedAt: now
    };

    this.tasks[taskIndex] = updatedTask;
    StorageService.set(StorageService.KEYS.TASKS, this.tasks);

    // Record activity
    if (updates.status && updates.status !== oldTask.status) {
      this.addActivityLog(taskId, 'status_changed', `Status changed to ${updates.status.toUpperCase()}`);
    }
    if (updates.priority && updates.priority !== oldTask.priority) {
      this.addActivityLog(taskId, 'priority_changed', `Priority changed to ${updates.priority.toUpperCase()}`);
    }

    // Trigger local automations
    if (window.Automations) {
      Automations.onTaskUpdated(updatedTask, oldTask);
    }

    this.emit('tasks:changed', { action: 'update', task: updatedTask, oldTask });
    return updatedTask;
  },

  /**
   * Deletes a task
   * @param {string} taskId 
   * @param {boolean} recordUndo 
   * @param {boolean} askConfirm 
   */
  deleteTask(taskId, recordUndo = true, askConfirm = false) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const performDelete = () => {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      StorageService.set(StorageService.KEYS.TASKS, this.tasks);

      if (recordUndo) {
        this.recordUndoAction(
          `Delete task ${task.key}`,
          () => {
            this.tasks.push(task);
            StorageService.set(StorageService.KEYS.TASKS, this.tasks);
            this.emit('tasks:changed', { action: 'restore', task });
          },
          () => this.deleteTask(taskId, false, false)
        );
      }

      this.emit('tasks:changed', { action: 'delete', taskId });
      Toast.info(`Deleted ${task.key}`);
    };

    if (askConfirm) {
      Modal.confirm(
        'Delete Task',
        `Are you sure you want to delete task ${task.key} ("${Utils.escapeHTML(task.title)}")?`,
        performDelete
      );
    } else {
      performDelete();
    }
  },

  /**
   * Duplicates a task according to section 65 of project.md
   * @param {string} taskId 
   * @returns {Object|null}
   */
  duplicateTask(taskId) {
    const original = this.tasks.find(t => t.id === taskId);
    if (!original) return null;

    const dupData = {
      projectId: original.projectId,
      type: original.type,
      title: `${original.title} (Copy)`,
      description: original.description,
      status: 'todo',
      priority: original.priority,
      labels: [...original.labels],
      checklist: original.checklist ? original.checklist.map(c => ({ id: Utils.generateId('chk_'), text: c.text, completed: false })) : [],
      estimate: original.estimate,
      storyPoints: original.storyPoints
    };

    const copy = this.createTask(dupData);
    Toast.success(`Duplicated to ${copy.key}`);
    return copy;
  },

  // -------------------------------------------------------------
  // PROJECT MUTATIONS
  // -------------------------------------------------------------

  createProject(projData) {
    const now = new Date().toISOString();
    const newProj = {
      id: Utils.generateId('proj_'),
      key: (projData.key || 'PRJ').toUpperCase().trim(),
      name: projData.name.trim(),
      description: projData.description || '',
      status: projData.status || 'active',
      color: projData.color || '#388bfd',
      icon: projData.icon || 'fa-folder',
      startDate: projData.startDate || now,
      targetDate: projData.targetDate || null,
      createdAt: now,
      updatedAt: now
    };

    this.projects.push(newProj);
    StorageService.set(StorageService.KEYS.PROJECTS, this.projects);
    this.emit('projects:changed', { action: 'create', project: newProj });
    Toast.success(`Project ${newProj.name} created.`);
    return newProj;
  },

  updateProject(projectId, updates) {
    const idx = this.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;

    this.projects[idx] = {
      ...this.projects[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    StorageService.set(StorageService.KEYS.PROJECTS, this.projects);
    this.emit('projects:changed', { action: 'update', project: this.projects[idx] });
    return this.projects[idx];
  },

  deleteProject(projectId) {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;

    Modal.confirm(
      'Delete Project',
      `Delete project "${proj.name}" and all its tasks? This action cannot be easily undone.`,
      () => {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.tasks = this.tasks.filter(t => t.projectId !== projectId);
        StorageService.set(StorageService.KEYS.PROJECTS, this.projects);
        StorageService.set(StorageService.KEYS.TASKS, this.tasks);
        if (this.selectedProjectId === projectId) {
          this.selectedProjectId = null;
        }
        this.emit('projects:changed', { action: 'delete', projectId });
        this.emit('tasks:changed', { action: 'bulk_delete' });
        Toast.warning(`Deleted project ${proj.name}`);
      }
    );
  },

  // -------------------------------------------------------------
  // COMMENTS & ACTIVITY LOG
  // -------------------------------------------------------------

  addComment(taskId, text) {
    if (!text || !text.trim()) return null;
    const newComment = {
      id: Utils.generateId('comm_'),
      taskId,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    this.comments.push(newComment);
    StorageService.set(StorageService.KEYS.COMMENTS, this.comments);
    this.addActivityLog(taskId, 'comment_added', 'Added a comment');
    this.emit('comments:changed', { taskId });
    return newComment;
  },

  deleteComment(commentId) {
    const comm = this.comments.find(c => c.id === commentId);
    if (!comm) return;
    this.comments = this.comments.filter(c => c.id !== commentId);
    StorageService.set(StorageService.KEYS.COMMENTS, this.comments);
    this.emit('comments:changed', { taskId: comm.taskId });
  },

  addActivityLog(taskId, action, details) {
    const entry = {
      id: Utils.generateId('act_'),
      taskId,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.activity.unshift(entry);
    if (this.activity.length > 500) this.activity.pop();
    StorageService.set(StorageService.KEYS.ACTIVITY, this.activity);
    this.emit('activity:changed', { taskId });
  }
};
