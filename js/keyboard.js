/**
 * TaskForge - Global Keyboard Shortcuts Dispatcher
 */

const KeyboardManager = {
  init() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  },

  /**
   * Evaluates key events and routes to respective handlers
   * @param {KeyboardEvent} e 
   */
  handleKeyDown(e) {
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.isContentEditable
    );

    // Escape always works regardless of input focus (closes active modals/drawers)
    if (e.key === 'Escape') {
      if (CommandPalette.isOpen) {
        CommandPalette.close();
        return;
      }
      if (TaskModal.isOpen) {
        TaskModal.closeDetail();
        return;
      }
      if (Modal.isOpen) {
        Modal.close();
        return;
      }
      const contextMenu = document.getElementById('custom-context-menu');
      if (contextMenu && contextMenu.style.display === 'block') {
        contextMenu.style.display = 'none';
        return;
      }
      return;
    }

    // Command Palette: Ctrl+K or Cmd+K (works everywhere)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      CommandPalette.toggle();
      return;
    }

    // Undo: Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      if (!isInputFocused) {
        e.preventDefault();
        AppState.undo();
        return;
      }
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
      if (!isInputFocused) {
        e.preventDefault();
        AppState.redo();
        return;
      }
    }

    // Toggle Sidebar: Ctrl+B
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      if (!isInputFocused) {
        e.preventDefault();
        Sidebar.toggle();
        return;
      }
    }

    // If an input/textarea has focus, DO NOT trigger single-key navigation shortcuts
    if (isInputFocused) {
      return;
    }

    // 'C' - Create Task
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      if (e.shiftKey) {
        TaskModal.openBulkCreate();
      } else {
        TaskModal.openCreate();
      }
      return;
    }

    // '/' - Focus Search or Command Palette
    if (e.key === '/') {
      e.preventDefault();
      CommandPalette.open();
      return;
    }

    // '?' - Show Shortcut Help
    if (e.key === '?') {
      e.preventDefault();
      this.showShortcutCheatSheet();
      return;
    }

    // 'T' - Toggle Dark/Light Theme
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      ThemeManager.toggle();
      return;
    }
  },

  /**
   * Displays the keyboard shortcut cheat sheet in the global modal
   */
  showShortcutCheatSheet() {
    const template = document.getElementById('shortcuts-modal-template');
    if (!template) return;
    Modal.open({
      title: '<i class="fa-regular fa-keyboard"></i> Keyboard Shortcuts',
      body: template.innerHTML,
      footerButtons: [
        {
          text: 'Got it',
          class: 'btn-primary',
          onClick: () => Modal.close()
        }
      ]
    });
  }
};
