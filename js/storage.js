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
   * Checks if app has been initialized before or if projects are missing; seeds realistic initial demo data.
   */
  initDemoDataIfFirstTime() {
    const initialized = this.get(this.KEYS.INITIALIZED, false);
    const existingProjects = this.get(this.KEYS.PROJECTS, []);
    if (!initialized || existingProjects.length === 0) {
      this.seedDemoData();
      this.set(this.KEYS.INITIALIZED, true);
    }
  },

  /**
   * Seeds realistic demo data with projects, sprints, epics, tasks, and subtasks
   */
  seedDemoData() {
    const now = new Date();
    const isoNow = now.toISOString();

    const sprint1Start = new Date(now);
    sprint1Start.setDate(sprint1Start.getDate() - 5);
    const sprint1End = new Date(now);
    sprint1End.setDate(sprint1End.getDate() + 9);

    const sprint2Start = new Date(sprint1End);
    sprint2Start.setDate(sprint2Start.getDate() + 1);
    const sprint2End = new Date(sprint2Start);
    sprint2End.setDate(sprint2End.getDate() + 14);

    const projects = [
      {
        id: 'proj_web',
        key: 'WEB',
        name: 'Website Redesign',
        description: 'Modernizing corporate web application with responsive UI, design tokens, and agile workflows.',
        status: 'active',
        color: '#388bfd',
        icon: 'fa-globe',
        startDate: sprint1Start.toISOString(),
        targetDate: sprint2End.toISOString(),
        createdAt: isoNow,
        updatedAt: isoNow
      },
      {
        id: 'proj_ai',
        key: 'AI',
        name: 'AI Workflow Assistant',
        description: 'Context-aware intelligence features and automated task prioritization engine.',
        status: 'active',
        color: '#a371f7',
        icon: 'fa-robot',
        startDate: isoNow,
        targetDate: null,
        createdAt: isoNow,
        updatedAt: isoNow
      },
      {
        id: 'proj_sys',
        key: 'SYS',
        name: 'Personal Growth & Systems',
        description: 'Habit engineering, reading lists, knowledge base management, and deep work scheduling.',
        status: 'active',
        color: '#2ea043',
        icon: 'fa-compass',
        startDate: isoNow,
        targetDate: null,
        createdAt: isoNow,
        updatedAt: isoNow
      }
    ];

    const epics = [
      { id: 'epic_ui', projectId: 'proj_web', title: 'Design System & UI Components', color: '#388bfd' },
      { id: 'epic_api', projectId: 'proj_web', title: 'State Management & Offline Storage', color: '#a371f7' },
      { id: 'epic_ml', projectId: 'proj_ai', title: 'NLP Extraction Pipeline', color: '#f59e0b' }
    ];

    const sprints = [
      {
        id: 'sprint_1',
        projectId: 'proj_web',
        name: 'Sprint 1: Core Foundation',
        goal: 'Deliver design tokens, slide-over task drawer with subtask breakdowns, and interactive backlog.',
        startDate: sprint1Start.toISOString(),
        endDate: sprint1End.toISOString(),
        status: 'active'
      },
      {
        id: 'sprint_2',
        projectId: 'proj_web',
        name: 'Sprint 2: Performance & Polish',
        goal: 'Implement drag-and-drop sprint planning, burndown velocity analytics, and multi-select bulk operations.',
        startDate: sprint2Start.toISOString(),
        endDate: sprint2End.toISOString(),
        status: 'planned'
      }
    ];

    const tasks = [
      {
        id: 'task_web1',
        key: 'WEB-1',
        projectId: 'proj_web',
        parentId: null,
        epicId: 'epic_ui',
        sprintId: 'sprint_1',
        type: 'task',
        title: 'Setup responsive application shell and sidebar navigation',
        description: 'Implement dark/light themes, collapsible sidebar, and responsive breakpoints.',
        status: 'done',
        priority: 'high',
        labels: ['frontend', 'shell'],
        dueDate: sprint1Start.toISOString(),
        startDate: sprint1Start.toISOString(),
        estimate: 180,
        trackedTime: 180,
        storyPoints: 5,
        dependencies: [],
        checklist: [
          { id: 'chk_1', text: 'Define CSS custom properties in styles.css', completed: true },
          { id: 'chk_2', text: 'Add sidebar collapse trigger and mobile backdrop', completed: true }
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: isoNow,
        archived: false
      },
      {
        id: 'task_web2',
        key: 'WEB-2',
        projectId: 'proj_web',
        parentId: null,
        epicId: 'epic_ui',
        sprintId: 'sprint_1',
        type: 'story',
        title: 'Implement Jira-style task slide-over drawer with subtasks',
        description: 'Provide quick editing of status, priority, sprint, due date, checklists, and nested subtasks.',
        status: 'inprogress',
        priority: 'critical',
        labels: ['ui', 'core'],
        dueDate: sprint1End.toISOString(),
        startDate: sprint1Start.toISOString(),
        estimate: 360,
        trackedTime: 120,
        storyPoints: 8,
        dependencies: [],
        checklist: [
          { id: 'chk_3', text: 'Create two-column slide-over container', completed: true },
          { id: 'chk_4', text: 'Integrate real-time title and description sync', completed: true },
          { id: 'chk_5', text: 'Support inline checklist additions', completed: true }
        ],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: null,
        archived: false
      },
      // Subtasks for WEB-2
      {
        id: 'task_web3',
        key: 'WEB-3',
        projectId: 'proj_web',
        parentId: 'task_web2',
        epicId: 'epic_ui',
        sprintId: 'sprint_1',
        type: 'subtask',
        title: 'Design subtask list with checkboxes and progress bar',
        description: 'Subtasks inside the drawer should display completion percentage and allow inline toggling.',
        status: 'done',
        priority: 'high',
        labels: ['subtask', 'ui'],
        dueDate: sprint1Start.toISOString(),
        startDate: sprint1Start.toISOString(),
        estimate: 90,
        trackedTime: 90,
        storyPoints: 2,
        dependencies: [],
        checklist: [],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: isoNow,
        archived: false
      },
      {
        id: 'task_web4',
        key: 'WEB-4',
        projectId: 'proj_web',
        parentId: 'task_web2',
        epicId: 'epic_ui',
        sprintId: 'sprint_1',
        type: 'subtask',
        title: 'Add Sprint and Epic selector dropdowns to task properties',
        description: 'Allow changing sprint assignment and parent epic directly from the detail panel sidebar.',
        status: 'inprogress',
        priority: 'high',
        labels: ['subtask', 'sprints'],
        dueDate: sprint1End.toISOString(),
        startDate: sprint1Start.toISOString(),
        estimate: 120,
        trackedTime: 30,
        storyPoints: 3,
        dependencies: [],
        checklist: [],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: null,
        archived: false
      },
      {
        id: 'task_web5',
        key: 'WEB-5',
        projectId: 'proj_web',
        parentId: 'task_web2',
        epicId: 'epic_ui',
        sprintId: 'sprint_1',
        type: 'subtask',
        title: 'Add inline subtask quick-create input row',
        description: 'Provide a clean, fast inline input field to add child subtasks directly inside the drawer.',
        status: 'todo',
        priority: 'medium',
        labels: ['subtask'],
        dueDate: sprint1End.toISOString(),
        startDate: sprint1Start.toISOString(),
        estimate: 60,
        trackedTime: 0,
        storyPoints: 1,
        dependencies: [],
        checklist: [],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: null,
        archived: false
      },
      {
        id: 'task_web6',
        key: 'WEB-6',
        projectId: 'proj_web',
        parentId: null,
        epicId: 'epic_api',
        sprintId: 'sprint_1',
        type: 'task',
        title: 'Connect Sprint Burndown report to active sprint metrics',
        description: 'Calculate daily guideline and remaining story points from tasks allocated to Sprint 1.',
        status: 'todo',
        priority: 'medium',
        labels: ['reporting', 'analytics'],
        dueDate: sprint1End.toISOString(),
        startDate: sprint1Start.toISOString(),
        estimate: 150,
        trackedTime: 0,
        storyPoints: 5,
        dependencies: [],
        checklist: [],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: null,
        archived: false
      },
      {
        id: 'task_web7',
        key: 'WEB-7',
        projectId: 'proj_web',
        parentId: null,
        epicId: 'epic_ui',
        sprintId: 'sprint_2',
        type: 'story',
        title: 'Develop drag-and-drop planning between Sprints and Backlog Pool',
        description: 'Enable HTML5 drag events on backlog items to drop directly into planned sprints.',
        status: 'todo',
        priority: 'high',
        labels: ['backlog', 'sprints'],
        dueDate: sprint2End.toISOString(),
        startDate: sprint2Start.toISOString(),
        estimate: 240,
        trackedTime: 0,
        storyPoints: 5,
        dependencies: [],
        checklist: [],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: null,
        archived: false
      },
      {
        id: 'task_web8',
        key: 'WEB-8',
        projectId: 'proj_web',
        parentId: null,
        epicId: 'epic_api',
        sprintId: null,
        type: 'task',
        title: 'Audit LocalStorage quota limit and backup recovery',
        description: 'Ensure graceful error recovery if JSON backup format has missing keys.',
        status: 'backlog',
        priority: 'low',
        labels: ['security', 'storage'],
        dueDate: null,
        startDate: null,
        estimate: 90,
        trackedTime: 0,
        storyPoints: 2,
        dependencies: [],
        checklist: [],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: null,
        archived: false
      },
      {
        id: 'task_web9',
        key: 'WEB-9',
        projectId: 'proj_web',
        parentId: null,
        epicId: 'epic_ui',
        sprintId: null,
        type: 'bug',
        title: 'Fix mobile table horizontal scrolling in List view',
        description: 'Ensure table-responsive-container has touch-friendly scroll behavior.',
        status: 'backlog',
        priority: 'medium',
        labels: ['bug', 'mobile'],
        dueDate: null,
        startDate: null,
        estimate: 60,
        trackedTime: 0,
        storyPoints: 3,
        dependencies: [],
        checklist: [],
        createdAt: isoNow,
        updatedAt: isoNow,
        completedAt: null,
        archived: false
      }
    ];

    const goals = [
      {
        id: 'goal_1',
        title: 'Launch Redesigned Web Workspace',
        description: 'Complete Sprint 1 and Sprint 2 commitments on schedule.',
        progress: 40,
        status: 'ontrack',
        targetDate: sprint2End.toISOString(),
        projectIds: ['proj_web'],
        taskIds: ['task_web1', 'task_web2', 'task_web7']
      }
    ];

    const activity = [
      { id: 'act_1', taskId: 'task_web1', action: 'completed', details: 'Completed task WEB-1', timestamp: sprint1Start.toISOString() },
      { id: 'act_2', taskId: 'task_web3', action: 'completed', details: 'Completed subtask WEB-3', timestamp: isoNow },
      { id: 'act_3', taskId: 'task_web2', action: 'status_changed', details: 'Status changed to IN PROGRESS', timestamp: isoNow }
    ];

    this.set(this.KEYS.PROJECTS, projects);
    this.set(this.KEYS.EPICS, epics);
    this.set(this.KEYS.SPRINTS, sprints);
    this.set(this.KEYS.TASKS, tasks);
    this.set(this.KEYS.GOALS, goals);
    this.set(this.KEYS.LABELS, ['frontend', 'ui', 'core', 'subtask', 'sprints', 'reporting', 'bug', 'mobile', 'storage']);
    this.set(this.KEYS.COMMENTS, [
      { id: 'comm_1', taskId: 'task_web2', text: 'Subtasks structure is defined. Now wiring up interactive toggles.', createdAt: isoNow }
    ]);
    this.set(this.KEYS.ACTIVITY, activity);
    this.set(this.KEYS.NOTIFICATIONS, [
      { id: 'notif_1', title: 'Sprint 1 is Active', message: 'Core Foundation sprint ends in 9 days.', type: 'info', read: false, createdAt: isoNow }
    ]);
    this.set(this.KEYS.SETTINGS, {
      theme: 'dark',
      soundEffects: true
    });
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
