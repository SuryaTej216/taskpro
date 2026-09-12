/**
 * TaskForge - Settings & Data Management View
 * Features: Appearance theme selector, sound effects toggle, JSON backup export/import, CSV export, and Danger Zone
 */

const SettingsView = {
  render(container) {
    const settings = AppState.settings;

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-gear" style="color: var(--accent-primary);"></i> Settings & Preferences</h1>
            <p>Configure theme preferences, audio alerts, and manage browser-local data portability.</p>
          </div>
        </div>

        <div style="max-width: 760px; display: flex; flex-direction: column; gap: 24px;">
          
          <!-- 1. Appearance Section -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-palette"></i> Appearance & Theme
            </h3>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="btn ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" onclick="ThemeManager.setTheme('dark')">
                <i class="fa-solid fa-moon"></i> Dark Theme
              </button>
              <button class="btn ${settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" onclick="ThemeManager.setTheme('light')">
                <i class="fa-solid fa-sun"></i> Light Theme
              </button>
            </div>
          </div>

          <!-- 2. Sound Effects Section -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                  <i class="fa-solid fa-volume-high"></i> Audio Feedback (Web Audio API)
                </h3>
                <p style="font-size: 13px; color: var(--text-secondary);">
                  Play harmonic synthesized chimes upon task completion and Pomodoro timer intervals.
                </p>
              </div>
              <input type="checkbox" id="settings-sound-toggle" ${settings.soundEffects !== false ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
            </div>
          </div>

          <!-- 3. Data Portability Section (JSON & CSV) -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
              <i class="fa-solid fa-database"></i> Data Portability & Backup
            </h3>
            <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
              All data is stored directly in your local browser storage. Export regular backups to prevent accidental browser cache clearances.
            </p>

            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <button class="btn btn-secondary" onclick="SettingsView.downloadBackup()">
                <i class="fa-solid fa-file-export"></i> Export All Data (JSON)
              </button>
              <button class="btn btn-secondary" onclick="SettingsView.downloadCSV()">
                <i class="fa-solid fa-file-csv"></i> Export Tasks to CSV
              </button>
              <button class="btn btn-secondary" onclick="SettingsView.openImportModal()">
                <i class="fa-solid fa-file-import"></i> Restore from JSON Backup
              </button>
            </div>
          </div>

          <!-- 4. Danger Zone -->
          <div style="background: var(--bg-surface); border: 1px solid rgba(248, 81, 73, 0.4); border-radius: var(--radius-lg); padding: 20px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--accent-danger); margin-bottom: 12px;">
              <i class="fa-solid fa-triangle-exclamation"></i> Danger Zone
            </h3>

            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 600; font-size: 13px; color: var(--accent-danger);">Wipe All Application Data</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Permanently clears all tasks, projects, sprints, and metrics from LocalStorage to start with a fresh slate.</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="SettingsView.wipeData()">
                Wipe Local Storage
              </button>
            </div>
          </div>

        </div>

      </div>
    `;

    // Bind sound toggle
    const soundToggle = container.querySelector('#settings-sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        AppState.settings.soundEffects = e.target.checked;
        StorageService.set(StorageService.KEYS.SETTINGS, AppState.settings);
        Toast.info(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }
  },

  downloadBackup() {
    const jsonStr = StorageService.exportAllJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskforge-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Backup downloaded successfully.');
  },

  downloadCSV() {
    const csvStr = StorageService.exportTasksCSV();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskforge-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Tasks CSV exported successfully.');
  },

  openImportModal() {
    const modalBody = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <p style="font-size: 13px; color: var(--text-secondary);">Select a previously exported TaskForge JSON backup file to restore:</p>
        <input type="file" id="import-file-input" accept=".json" class="form-input">
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="import-merge-chk" style="cursor: pointer;">
          <label for="import-merge-chk" style="font-size: 12px; cursor: pointer;">Merge with existing data instead of replacing</label>
        </div>
      </div>
    `;

    Modal.open({
      title: '<i class="fa-solid fa-file-import" style="color: var(--accent-primary);"></i> Restore JSON Backup',
      body: modalBody,
      size: 'md',
      footerButtons: [
        { text: 'Cancel', class: 'btn-secondary', onClick: () => Modal.close() },
        {
          text: 'Restore',
          class: 'btn-primary',
          onClick: () => {
            const fileInput = document.getElementById('import-file-input');
            const mergeChk = document.getElementById('import-merge-chk');
            if (!fileInput.files || fileInput.files.length === 0) {
              Toast.warning('Please select a JSON file first.');
              return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
              const res = StorageService.importJSON(e.target.result, mergeChk.checked);
              if (res.success) {
                AppState.init();
                Modal.close();
                Router.renderCurrentRoute();
                Toast.success(res.message);
              } else {
                Toast.error(res.message);
              }
            };
            reader.readAsText(file);
          }
        }
      ]
    });
  },

  wipeData() {
    Modal.confirm('Wipe All Data', 'Are you absolutely sure? All tasks, projects, and sprint data will be PERMANENTLY deleted from your browser.', () => {
      StorageService.wipeAllData();
      AppState.init();
      Router.renderCurrentRoute();
      Toast.warning('All application data cleared.');
    });
  }
};

const ThemeManager = {
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppState.settings.theme = theme;
    StorageService.set(StorageService.KEYS.SETTINGS, AppState.settings);
    
    // Update theme toggle icon
    const toggleBtn = document.getElementById('topbar-theme-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    }

    if (AppState.currentView === 'settings') {
      Router.renderCurrentRoute();
    }
  }
};
