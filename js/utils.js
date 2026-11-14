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

  escapeHtml(str) {
    return this.escapeHTML(str);
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
   * @param {string|number|Date} dateVal 
   * @returns {string}
   */
  toDateInputValue(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && (/^\d{4}-\d{2}-\d{2}$/.test(dateVal) || /T00:00:00(\.000)?Z$/.test(dateVal))) {
      return dateVal.slice(0, 10);
    }
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Formats a Date or timestamp into HH:MM:SS (24-hour local time)
   * @param {string|number|Date} dateVal
   * @returns {string} e.g. "14:05:09"
   */
  formatTimeHMS(dateVal) {
    if (dateVal === null || dateVal === undefined || dateVal === '') return '00:00:00';
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (isNaN(d.getTime())) return '00:00:00';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  },

  /**
   * Formats a date with HH:MM:SS e.g. "Nov 14, 2026 09:30:00"
   * @param {string|number|Date} dateVal
   * @returns {string}
   */
  formatDateTimeHMS(dateVal) {
    if (dateVal === null || dateVal === undefined || dateVal === '') return '';
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${this.formatDate(d)} ${this.formatTimeHMS(d)}`;
  },

  /**
   * Parses an "HH:MM:SS" or "HH:MM" string into { hours, minutes, seconds, formatted }
   * @param {string} timeStr
   * @param {string} fallbackHMS
   * @returns {{ hours: number, minutes: number, seconds: number, formatted: string }}
   */
  parseTimeHMS(timeStr, fallbackHMS = '00:00:00') {
    const raw = String(timeStr || fallbackHMS).trim();
    const parts = raw.split(':').map(n => parseInt(n, 10));
    const fbParts = String(fallbackHMS).split(':').map(n => parseInt(n, 10));
    const hours = Number.isFinite(parts[0]) ? Math.min(23, Math.max(0, parts[0])) : (fbParts[0] || 0);
    const minutes = Number.isFinite(parts[1]) ? Math.min(59, Math.max(0, parts[1])) : (fbParts[1] || 0);
    const seconds = Number.isFinite(parts[2]) ? Math.min(59, Math.max(0, parts[2])) : (fbParts[2] || 0);
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return { hours, minutes, seconds, formatted };
  },

  /**
   * Combines a YYYY-MM-DD date string and an HH:MM:SS time string into a local Date ISO string
   * @param {string} dateStr YYYY-MM-DD
   * @param {string} timeStr HH:MM:SS
   * @param {string} fallbackHMS
   * @returns {string|null}
   */
  combineDateAndTimeISO(dateStr, timeStr, fallbackHMS = '00:00:00') {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) return null;
    const [y, m, d] = String(dateStr).trim().split('-').map(Number);
    const { hours, minutes, seconds } = this.parseTimeHMS(timeStr, fallbackHMS);
    const dt = new Date(y, m - 1, d, hours, minutes, seconds, 0);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
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
