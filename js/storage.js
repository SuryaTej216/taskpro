/**
 * TaskForge - Storage Service Layer
 * Encapsulates all browser LocalStorage read/write/export/import operations
 */

const StorageService = {
  KEYS: {
    PROJECTS: 'taskforge_projects',
    TASKS: 'taskforge_tasks',
    EPICS: 'taskforge_epics',
    SPRINTS: 'taskforge_sprints',
    LABELS: 'taskforge_labels',
    GOALS: 'taskforge_goals',
    COMMENTS: 'taskforge_comments',
    ACTIVITY: 'taskforge_activity',
    NOTIFICATIONS: 'taskforge_notifications',
    SETTINGS: 'taskforge_settings',
    TIME_ENTRIES: 'taskforge_time_entries',
    TEMPLATES: 'taskforge_templates',
    PREFERENCES: 'taskforge_preferences',
    INITIALIZED: 'taskforge_initialized'
  },

  /**
   * Safely fetches data from LocalStorage
   * @param {string} key 
   * @param {any} defaultValue 
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      return JSON.parse(item);
    } catch (err) {
      console.error(`StorageService: Error parsing key "${key}"`, err);
      return defaultValue;
    }
  },

  /**
   * Writes data to LocalStorage
   * @param {string} key 
   * @param {any} value 
   * @returns {boolean}
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`StorageService: Error writing key "${key}"`, err);
      return false;
    }
  },

  /**
   * Removes a key from LocalStorage
   * @param {string} key 
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`StorageService: Error removing key "${key}"`, err);
    }
  },

  /**
   * Checks if app has been initialized before; initializes empty storage schema.
   */
  initDemoDataIfFirstTime() {
    const initialized = this.get(this.KEYS.INITIALIZED, false);
    if (!initialized) {
      this.initEmptyData();
      this.set(this.KEYS.INITIALIZED, true);
    }
  },

  /**
   * Initializes clean, empty data collections
   */
  initEmptyData() {
    this.set(this.KEYS.PROJECTS, []);
    this.set(this.KEYS.TASKS, []);
    this.set(this.KEYS.EPICS, []);
    this.set(this.KEYS.SPRINTS, []);
    this.set(this.KEYS.LABELS, []);
    this.set(this.KEYS.GOALS, []);
    this.set(this.KEYS.COMMENTS, []);
    this.set(this.KEYS.ACTIVITY, []);
    this.set(this.KEYS.NOTIFICATIONS, []);
    this.set(this.KEYS.SETTINGS, {
      theme: 'dark',
      soundEffects: true
    });
  },

  /**
   * Clears all stored collections to clean empty arrays
   */
  clearAllData() {
    this.initEmptyData();
  },

  /**
   * Complete JSON export of all TaskForge state
   * @returns {string}
   */
  exportAllJSON() {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      projects: this.get(this.KEYS.PROJECTS, []),
      tasks: this.get(this.KEYS.TASKS, []),
      epics: this.get(this.KEYS.EPICS, []),
      sprints: this.get(this.KEYS.SPRINTS, []),
      labels: this.get(this.KEYS.LABELS, []),
      goals: this.get(this.KEYS.GOALS, []),
      comments: this.get(this.KEYS.COMMENTS, []),
      activity: this.get(this.KEYS.ACTIVITY, []),
      settings: this.get(this.KEYS.SETTINGS, {})
    };
    return JSON.stringify(exportData, null, 2);
  },

  /**
   * CSV export of all tasks
   * @returns {string}
   */
  exportTasksCSV() {
    const tasks = this.get(this.KEYS.TASKS, []);
    const headers = ['Key', 'Title', 'Project', 'Type', 'Status', 'Priority', 'StoryPoints', 'DueDate', 'EstimateMins', 'TrackedMins', 'CreatedAt'];
    const rows = tasks.map(t => [
      `"${t.key || ''}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.projectId || ''}"`,
      `"${t.type || ''}"`,
      `"${t.status || ''}"`,
      `"${t.priority || ''}"`,
      t.storyPoints || 0,
      `"${t.dueDate || ''}"`,
      t.estimate || 0,
      t.trackedTime || 0,
      `"${t.createdAt || ''}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  /**
   * Imports JSON data after validation
   * @param {string} jsonString 
   * @param {boolean} merge 
   * @returns {{ success: boolean, message: string }}
   */
  importJSON(jsonString, merge = false) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.tasks || !data.projects) {
        return { success: false, message: 'Invalid backup file format: Missing tasks or projects array.' };
      }

      if (merge) {
        const existingTasks = this.get(this.KEYS.TASKS, []);
        const existingProjects = this.get(this.KEYS.PROJECTS, []);
        
        const taskMap = new Map(existingTasks.map(t => [t.id, t]));
        data.tasks.forEach(t => taskMap.set(t.id, t));
        
        const projMap = new Map(existingProjects.map(p => [p.id, p]));
        data.projects.forEach(p => projMap.set(p.id, p));

        this.set(this.KEYS.TASKS, Array.from(taskMap.values()));
        this.set(this.KEYS.PROJECTS, Array.from(projMap.values()));
      } else {
        this.set(this.KEYS.PROJECTS, data.projects);
        this.set(this.KEYS.TASKS, data.tasks);
        if (data.epics) this.set(this.KEYS.EPICS, data.epics);
        if (data.sprints) this.set(this.KEYS.SPRINTS, data.sprints);
        if (data.labels) this.set(this.KEYS.LABELS, data.labels);
        if (data.goals) this.set(this.KEYS.GOALS, data.goals);
        if (data.comments) this.set(this.KEYS.COMMENTS, data.comments);
        if (data.activity) this.set(this.KEYS.ACTIVITY, data.activity);
        if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);
      }

      return { success: true, message: `Successfully imported ${data.tasks.length} tasks and ${data.projects.length} projects.` };
    } catch (err) {
      return { success: false, message: 'JSON parsing failed: ' + err.message };
    }
  },

  /**
   * Clears all TaskForge data from LocalStorage (Danger Zone)
   */
  wipeAllData() {
    Object.values(this.KEYS).forEach(k => this.remove(k));
  }
};
