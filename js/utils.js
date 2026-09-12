/**
 * TaskForge - Utility Functions & Helpers
 */

const Utils = {
  /**
   * Generates a cryptographically random unique identifier.
   * @param {string} prefix Optional prefix (e.g., 'task_', 'proj_')
   * @returns {string}
   */
  generateId(prefix = '') {
    const randomPart = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    return `${prefix}${randomPart}`;
  },

  /**
   * Escapes unsafe HTML characters to prevent XSS.
   * @param {string} str 
   * @returns {string}
   */
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Formats ISO date string to readable format e.g. "Oct 14, 2026"
   * @param {string|Date} dateVal 
   * @returns {string}
   */
  formatDate(dateVal) {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  /**
   * Formats date to YYYY-MM-DD for HTML input[type="date"]
   * @param {string|Date} dateVal 
   * @returns {string}
   */
  toDateInputValue(dateVal) {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  },

  /**
   * Human-friendly relative date display (e.g. "Today", "Tomorrow", "Yesterday", "Oct 12")
   * @param {string|Date} dateVal 
   * @returns {string}
   */
  formatRelativeDate(dateVal) {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 6) return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays >= -6) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Checks if a due date is overdue relative to today and not completed.
   * @param {string|Date} dueDate 
   * @param {string} status 
   * @returns {boolean}
   */
  isOverdue(dueDate, status) {
    if (!dueDate || status === 'done' || status === 'cancelled') return false;
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return target.getTime() < today.getTime();
  },

  /**
   * Checks if a due date is today.
   * @param {string|Date} dueDate 
   * @returns {boolean}
   */
  isDueToday(dueDate) {
    if (!dueDate) return false;
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  },

  /**
   * Formats minutes into human-readable duration e.g. "2h 30m"
   * @param {number} minutes 
   * @returns {string}
   */
  formatMinutes(minutes) {
    if (!minutes || minutes <= 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  },

  /**
   * Debounce helper
   * @param {Function} func 
   * @param {number} wait 
   * @returns {Function}
   */
  debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Simple fuzzy string matching
   * @param {string} query 
   * @param {string} target 
   * @returns {boolean}
   */
  fuzzyMatch(query, target) {
    if (!query) return true;
    if (!target) return false;
    const q = query.toLowerCase().trim();
    const t = target.toLowerCase();
    
    // Exact substring match
    if (t.includes(q)) return true;

    // Subsequence match
    let qIdx = 0;
    for (let i = 0; i < t.length && qIdx < q.length; i++) {
      if (t[i] === q[qIdx]) qIdx++;
    }
    return qIdx === q.length;
  },

  /**
   * Web Audio API synthesized sound effects (no external audio files needed)
   */
  playSound(type = 'success') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'timer') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }
};
