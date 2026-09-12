/**
 * TaskForge - Global Search Engine with Query Syntax Parsing
 */

const SearchEngine = {
  /**
   * Parses query string into syntax tokens and free-text terms
   * e.g., "login project:web priority:high status:inprogress label:frontend"
   * @param {string} query 
   * @returns {Object}
   */
  parseQuery(query) {
    if (!query) return { text: '', tokens: {} };
    
    const tokens = {};
    let text = query;

    const pattern = /(\b(project|status|priority|type|label|tag):(\S+))/gi;
    let match;
    while ((match = pattern.exec(query)) !== null) {
      const key = match[2].toLowerCase();
      const val = match[3].toLowerCase();
      tokens[key === 'tag' ? 'label' : key] = val;
      text = text.replace(match[1], '');
    }

    return {
      text: text.trim().toLowerCase(),
      tokens
    };
  },

  /**
   * Executes search across all tasks, projects, comments, and epics
   * @param {string} query 
   * @returns {Array<Object>}
   */
  search(query) {
    if (!query || !query.trim()) return [];

    const { text, tokens } = this.parseQuery(query);
    const results = [];

    // Search tasks
    AppState.tasks.forEach(task => {
      // Check token constraints
      if (tokens.project) {
        const proj = AppState.projects.find(p => p.id === task.projectId);
        if (!proj || !proj.key.toLowerCase().includes(tokens.project)) return;
      }
      if (tokens.status && !task.status.toLowerCase().includes(tokens.status)) return;
      if (tokens.priority && !task.priority.toLowerCase().includes(tokens.priority)) return;
      if (tokens.type && !task.type.toLowerCase().includes(tokens.type)) return;
      if (tokens.label && (!task.labels || !task.labels.some(l => l.toLowerCase().includes(tokens.label)))) return;

      // Check text match against title, key, description
      if (!text) {
        results.push({ type: 'task', item: task, score: 10 });
        return;
      }

      let score = 0;
      if (task.key.toLowerCase() === text) score += 100;
      else if (task.key.toLowerCase().includes(text)) score += 50;

      if (task.title.toLowerCase().includes(text)) score += 30;
      else if (Utils.fuzzyMatch(text, task.title)) score += 10;

      if (task.description && task.description.toLowerCase().includes(text)) score += 5;

      if (score > 0) {
        results.push({ type: 'task', item: task, score });
      }
    });

    // Search projects
    if (!tokens.status && !tokens.priority && !tokens.type) {
      AppState.projects.forEach(project => {
        if (!text) return;
        let score = 0;
        if (project.key.toLowerCase() === text) score += 100;
        else if (project.key.toLowerCase().includes(text)) score += 40;
        if (project.name.toLowerCase().includes(text)) score += 30;
        if (score > 0) {
          results.push({ type: 'project', item: project, score });
        }
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }
};
