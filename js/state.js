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
      soundEffects: true,
      autoSyncChecklistSubtasks: true
    });
    if (this.settings.autoSyncChecklistSubtasks === undefined) {
      this.settings.autoSyncChecklistSubtasks = true;
    }

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
      mergeChecklistAndSubtasks: taskData.mergeChecklistAndSubtasks !== undefined ? !!taskData.mergeChecklistAndSubtasks : false,
      createdAt: now,
      updatedAt: now,
      completedAt: taskData.status === 'done' ? now : null,
      archived: false
    };

    this.tasks.push(newTask);
    StorageService.set(StorageService.KEYS.TASKS, this.tasks);

    this.addActivityLog(newTask.id, 'created', `Created task ${newTask.key}`);
    
    // Automation trigger for subtask
    if (newTask.parentId && window.Automations) {
      Automations.updateParentProgress(newTask.parentId);
    }

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
    if (updates.sprintId !== undefined && updates.sprintId !== oldTask.sprintId) {
      const sprint = this.sprints.find(s => s.id === updates.sprintId);
      const sprintName = sprint ? sprint.name : 'Backlog';
      this.addActivityLog(taskId, 'sprint_changed', `Moved to ${sprintName}`);
    }

    // Trigger local automations
    if (window.Automations) {
      Automations.onTaskUpdated(updatedTask, oldTask);
    }

    this.emit('tasks:changed', { action: 'update', task: updatedTask, oldTask });
    return updatedTask;
  },

  /**
   * Deletes a task and its subtasks
   * @param {string} taskId 
   * @param {boolean} recordUndo 
   * @param {boolean} askConfirm 
   */
  deleteTask(taskId, recordUndo = true, askConfirm = false) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const performDelete = () => {
      // Find subtasks of this task
      const childSubtasks = this.tasks.filter(t => t.parentId === taskId);
      const allToDeleteIds = new Set([taskId, ...childSubtasks.map(c => c.id)]);

      this.tasks = this.tasks.filter(t => !allToDeleteIds.has(t.id));
      StorageService.set(StorageService.KEYS.TASKS, this.tasks);

      // If deleted task was a subtask, recalculate parent progress
      if (task.parentId && window.Automations) {
        Automations.updateParentProgress(task.parentId);
      }

      if (recordUndo) {
        this.recordUndoAction(
          `Delete task ${task.key}`,
          () => {
            this.tasks.push(task, ...childSubtasks);
            StorageService.set(StorageService.KEYS.TASKS, this.tasks);
            this.emit('tasks:changed', { action: 'restore', task });
          },
          () => this.deleteTask(taskId, false, false)
        );
      }

      this.emit('tasks:changed', { action: 'delete', taskId });
      Toast.info(`Deleted ${task.key}${childSubtasks.length > 0 ? ` and ${childSubtasks.length} subtask(s)` : ''}`);
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

  /**
   * Synchronizes a task's checklist items with its child subtasks
   * Converts unlinked checklist items into child subtasks,
   * imports unlinked child subtasks into checklist, and harmonizes completion states.
   * @param {string} taskId 
   * @returns {{ createdSubtasks: number, createdChecklistItems: number, updatedStates: number }}
   */
  syncTaskChecklistAndSubtasks(taskId) {
    const parent = this.tasks.find(t => t.id === taskId);
    if (!parent) return { createdSubtasks: 0, createdChecklistItems: 0, updatedStates: 0 };

    let createdSubtasks = 0;
    let createdChecklistItems = 0;
    let updatedStates = 0;

    const childSubtasks = this.tasks.filter(t => t.parentId === taskId);
    const checklist = Array.isArray(parent.checklist) ? [...parent.checklist] : [];

    // Helper to normalize strings for comparison
    const norm = (s) => (s || '').trim().toLowerCase();

    // 1. Match checklist items with child subtasks
    checklist.forEach(item => {
      let matchedSubtask = null;
      if (item.subtaskId) {
        matchedSubtask = childSubtasks.find(st => st.id === item.subtaskId);
      }
      if (!matchedSubtask) {
        matchedSubtask = childSubtasks.find(st => norm(st.title) === norm(item.text));
      }

      if (matchedSubtask) {
        item.subtaskId = matchedSubtask.id;

        // Reconcile status: if either is done, sync to done; otherwise todo
        const isDone = item.completed || matchedSubtask.status === 'done';
        if (item.completed !== isDone) {
          item.completed = isDone;
          updatedStates++;
        }
        if ((matchedSubtask.status === 'done') !== isDone) {
          const nextStatus = isDone ? 'done' : 'todo';
          this.updateTask(matchedSubtask.id, { status: nextStatus });
          updatedStates++;
        }
      } else {
        // Create new child subtask for this checklist item
        const newSubtask = this.createTask({
          projectId: parent.projectId,
          parentId: parent.id,
          sprintId: parent.sprintId,
          type: 'subtask',
          title: item.text,
          status: item.completed ? 'done' : 'todo',
          priority: parent.priority || 'medium'
        });
        item.subtaskId = newSubtask.id;
        childSubtasks.push(newSubtask);
        createdSubtasks++;
      }
    });

    // 2. Check for child subtasks not yet in checklist
    childSubtasks.forEach(st => {
      let matchedItem = checklist.find(c => c.subtaskId === st.id || norm(c.text) === norm(st.title));
      if (!matchedItem) {
        const newItem = {
          id: Utils.generateId('chk_'),
          text: st.title,
          completed: st.status === 'done',
          subtaskId: st.id
        };
        checklist.push(newItem);
        createdChecklistItems++;
      }
    });

    // Update parent task checklist and sync property
    this.updateTask(taskId, {
      checklist: checklist,
      syncChecklistSubtasks: true
    });

    if (window.Automations) {
      Automations.updateParentProgress(taskId);
    }

    this.emit('tasks:changed', { action: 'sync', taskId });
    return { createdSubtasks, createdChecklistItems, updatedStates };
  },

  /**
   * Retrieves unified clubbed list of subtasks and checklist items for a task
   * @param {string} taskId 
   * @returns {Array<Object>}
   */
  getClubbedItems(taskId) {
    const parent = this.tasks.find(t => t.id === taskId);
    if (!parent) return [];

    const childSubtasks = this.tasks.filter(t => t.parentId === taskId);
    const checklist = Array.isArray(parent.checklist) ? parent.checklist : [];

    const norm = (s) => (s || '').trim().toLowerCase();
    const clubbed = [];
    const visitedSubtaskIds = new Set();

    // 1. Process checklist items
    checklist.forEach(item => {
      let linkedSubtask = null;
      if (item.subtaskId) {
        linkedSubtask = childSubtasks.find(st => st.id === item.subtaskId);
      }
      if (!linkedSubtask) {
        linkedSubtask = childSubtasks.find(st => !visitedSubtaskIds.has(st.id) && norm(st.title) === norm(item.text));
      }

      if (linkedSubtask) {
        visitedSubtaskIds.add(linkedSubtask.id);
        clubbed.push({
          id: item.id || ('chk_' + linkedSubtask.id),
          subtaskId: linkedSubtask.id,
          key: linkedSubtask.key,
          title: linkedSubtask.title || item.text,
          completed: linkedSubtask.status === 'done' || !!item.completed,
          isSubtask: true,
          status: linkedSubtask.status
        });
      } else {
        clubbed.push({
          id: item.id || Utils.generateId('chk_'),
          subtaskId: null,
          key: null,
          title: item.text,
          completed: !!item.completed,
          isSubtask: false,
          status: item.completed ? 'done' : 'todo'
        });
      }
    });

    // 2. Any child subtasks not matched to checklist
    childSubtasks.forEach(st => {
      if (!visitedSubtaskIds.has(st.id)) {
        visitedSubtaskIds.add(st.id);
        clubbed.push({
          id: 'chk_' + st.id,
          subtaskId: st.id,
          key: st.key,
          title: st.title,
          completed: st.status === 'done',
          isSubtask: true,
          status: st.status
        });
      }
    });

    return clubbed;
  },

  /**
   * Toggles whether checklist and subtasks are shown merged or separate
   * @param {string} taskId 
   * @returns {boolean}
   */
  toggleMergeChecklistAndSubtasks(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;
    const nextVal = !task.mergeChecklistAndSubtasks;
    this.updateTask(taskId, { mergeChecklistAndSubtasks: nextVal });
    return nextVal;
  },

  /**
   * Converts all unlinked checklist items into child subtasks
   * @param {string} taskId 
   * @returns {number}
   */
  mergeChecklistToSubtasks(taskId) {
    const parent = this.tasks.find(t => t.id === taskId);
    if (!parent || !Array.isArray(parent.checklist) || parent.checklist.length === 0) return 0;
    const childSubtasks = this.tasks.filter(t => t.parentId === taskId);
    const norm = (s) => (s || '').trim().toLowerCase();
    let count = 0;
    const updatedChecklist = parent.checklist.map(chk => {
      let matched = childSubtasks.find(st => st.id === chk.subtaskId || norm(st.title) === norm(chk.text));
      if (!matched) {
        matched = this.createTask({
          title: chk.text,
          parentId: taskId,
          projectId: parent.projectId,
          sprintId: parent.sprintId,
          type: 'subtask',
          status: chk.completed ? 'done' : 'todo'
        });
        count++;
      }
      return { ...chk, subtaskId: matched.id };
    });
    this.updateTask(taskId, { checklist: updatedChecklist });
    return count;
  },

  /**
   * Imports all child subtasks into checklist items
   * @param {string} taskId 
   * @returns {number}
   */
  mergeSubtasksToChecklist(taskId) {
    const parent = this.tasks.find(t => t.id === taskId);
    if (!parent) return 0;
    const childSubtasks = this.tasks.filter(t => t.parentId === taskId);
    const checklist = Array.isArray(parent.checklist) ? [...parent.checklist] : [];
    const norm = (s) => (s || '').trim().toLowerCase();
    let count = 0;
    childSubtasks.forEach(st => {
      let matched = checklist.find(chk => chk.subtaskId === st.id || norm(chk.text) === norm(st.title));
      if (!matched) {
        checklist.push({
          id: Utils.generateId('chk_'),
          text: st.title,
          completed: st.status === 'done',
          subtaskId: st.id
        });
        count++;
      }
    });
    this.updateTask(taskId, { checklist });
    return count;
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
  // SPRINT MUTATIONS
  // -------------------------------------------------------------

  createSprint(sprintData) {
    const newSprint = {
      id: Utils.generateId('sprint_'),
      projectId: sprintData.projectId || this.selectedProjectId || (this.projects[0] ? this.projects[0].id : 'proj_web'),
      name: sprintData.name.trim(),
      goal: sprintData.goal ? sprintData.goal.trim() : '',
      startDate: sprintData.startDate || new Date().toISOString(),
      endDate: sprintData.endDate || new Date().toISOString(),
      status: sprintData.status || 'planned'
    };

    this.sprints.push(newSprint);
    StorageService.set(StorageService.KEYS.SPRINTS, this.sprints);
    this.emit('sprints:changed', { action: 'create', sprint: newSprint });
    Toast.success(`Created sprint "${newSprint.name}"`);
    return newSprint;
  },

  updateSprint(sprintId, updates) {
    const idx = this.sprints.findIndex(s => s.id === sprintId);
    if (idx === -1) return null;

    this.sprints[idx] = {
      ...this.sprints[idx],
      ...updates
    };

    StorageService.set(StorageService.KEYS.SPRINTS, this.sprints);
    this.emit('sprints:changed', { action: 'update', sprint: this.sprints[idx] });
    return this.sprints[idx];
  },

  deleteSprint(sprintId, returnTasksToBacklog = true, askConfirm = true) {
    const sprint = this.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const performDelete = () => {
      this.sprints = this.sprints.filter(s => s.id !== sprintId);
      StorageService.set(StorageService.KEYS.SPRINTS, this.sprints);

      if (returnTasksToBacklog) {
        let count = 0;
        this.tasks.forEach(t => {
          if (t.sprintId === sprintId) {
            t.sprintId = null;
            count++;
          }
        });
        if (count > 0) {
          StorageService.set(StorageService.KEYS.TASKS, this.tasks);
          this.emit('tasks:changed', { action: 'bulk_update' });
        }
      }

      this.emit('sprints:changed', { action: 'delete', sprintId });
      Toast.info(`Deleted sprint "${sprint.name}"`);
    };

    if (askConfirm) {
      Modal.confirm(
        'Delete Sprint',
        `Are you sure you want to delete sprint "${sprint.name}"? Tasks in this sprint will return to the backlog pool.`,
        performDelete
      );
    } else {
      performDelete();
    }
  },

  startSprint(sprintId) {
    const sprint = this.sprints.find(s => s.id === sprintId);
    if (!sprint) return false;

    // Check if another sprint is currently active
    const active = this.sprints.find(s => s.status === 'active' && s.id !== sprintId);
    if (active) {
      Toast.warning(`Another sprint ("${active.name}") is currently active. Complete it first.`);
      return false;
    }

    sprint.status = 'active';
    StorageService.set(StorageService.KEYS.SPRINTS, this.sprints);
    this.emit('sprints:changed', { action: 'start', sprint });
    Toast.success(`Started sprint "${sprint.name}"!`);
    return true;
  },

  completeSprint(sprintId, moveToNextSprintId = null) {
    const sprint = this.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    const sprintTasks = this.tasks.filter(t => t.sprintId === sprintId);
    const incomplete = sprintTasks.filter(t => t.status !== 'done');

    sprint.status = 'completed';

    // Move incomplete tasks to next sprint or backlog
    incomplete.forEach(t => {
      t.sprintId = moveToNextSprintId || null;
    });

    StorageService.set(StorageService.KEYS.SPRINTS, this.sprints);
    StorageService.set(StorageService.KEYS.TASKS, this.tasks);
    this.emit('sprints:changed', { action: 'complete', sprint });
    this.emit('tasks:changed', { action: 'bulk_update' });
    Toast.success(`Completed sprint "${sprint.name}"!`);
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
