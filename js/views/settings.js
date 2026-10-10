/**
 * TaskForge - Settings & Data Management View
 * Features: Appearance theme selector, sound effects toggle, JSON backup export/import, CSV export, and Danger Zone
 */

const SettingsView = {
  render(container) {
    const settings = AppState.settings;
    const stats = StorageService.getStorageStats();

    container.innerHTML = `
      <div class="view-page">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1><i class="fa-solid fa-gear" style="color: var(--accent-primary);"></i> Settings & Preferences</h1>
            <p>Configure theme preferences, audio alerts, and manage browser-local data portability & storage limits.</p>
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

          <!-- 3. Workflow & Automation Section -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                  <i class="fa-solid fa-arrows-rotate" style="color: var(--accent-primary);"></i> Auto-sync Checklist & Subtasks
                </h3>
                <p style="font-size: 13px; color: var(--text-secondary);">
                  Automatically synchronize task checklist items with child subtasks and mirror completion status bidirectionally by default.
                </p>
              </div>
              <input type="checkbox" id="settings-sync-toggle" ${settings.autoSyncChecklistSubtasks !== false ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
            </div>
          </div>

          <!-- 4. Local Storage Usage & Limit Section -->
          <div id="settings-storage-section" style="background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: rgba(87, 157, 255, 0.12); display: flex; align-items: center; justify-content: center; color: var(--accent-primary); font-size: 16px;">
                  <i class="fa-solid fa-hard-drive"></i>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">Local Storage Usage & Limit</h3>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Browser origin storage quota and live capacity breakdown</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge" style="background: ${stats.statusColor}18; color: ${stats.statusColor}; border: 1px solid ${stats.statusColor}44; font-weight: 600; padding: 4px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">
                  <span style="width: 7px; height: 7px; border-radius: 50%; background: ${stats.statusColor}; animation: pulseGreen 2.5s infinite;"></span>
                  ${stats.statusText} (${stats.percentFree}% Free)
                </span>
                <button class="btn btn-secondary btn-sm" onclick="SettingsView.refreshStorage()" title="Recalculate storage footprint" style="height: 30px; font-size: 12px;">
                  <i class="fa-solid fa-rotate"></i> Refresh
                </button>
              </div>
            </div>

            <!-- Progress Meter -->
            <div style="margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <div>
                  <span style="font-size: 20px; font-weight: 700; color: var(--text-primary);">${stats.formattedTotal}</span>
                  <span style="font-size: 13px; color: var(--text-muted); margin-left: 6px;">used of <strong style="color: var(--text-primary);">${stats.formattedQuota}</strong> limit</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: ${stats.statusColor};">
                  ${stats.percentUsed}% Quota Used
                </div>
              </div>
              <div style="height: 12px; background: var(--bg-app); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-subtle); position: relative;">
                <div style="width: ${Math.max(1, stats.percentUsed)}%; height: 100%; background: linear-gradient(90deg, #579DFF 0%, #36B37E 100%); border-radius: 6px; transition: width 0.4s ease; box-shadow: 0 0 8px rgba(87, 157, 255, 0.4);"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                <span>0 KB</span>
                <span>Available: <strong style="color: var(--accent-success);">${stats.formattedRemaining}</strong></span>
                <span>Max Quota: 5.00 MB</span>
              </div>
            </div>

            <!-- 3 Stat Blocks Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;">
              <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px;">
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">
                  <i class="fa-solid fa-database" style="color: #579DFF;"></i> Used Storage
                </div>
                <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">${stats.formattedTotal}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${stats.percentUsed}% of total quota</div>
              </div>

              <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px;">
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">
                  <i class="fa-solid fa-circle-check" style="color: #36B37E;"></i> Free Space
                </div>
                <div style="font-size: 18px; font-weight: 700; color: var(--accent-success);">${stats.formattedRemaining}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${stats.percentFree}% remaining headroom</div>
              </div>

              <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px;">
                <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">
                  <i class="fa-solid fa-shield-halved" style="color: #A371F7;"></i> Quota Limit
                </div>
                <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">${stats.formattedQuota}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Browser origin LocalStorage cap</div>
              </div>
            </div>

            <!-- Breakdown Accordion / List -->
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-layer-group" style="color: var(--accent-primary);"></i> Storage Footprint by Entity</span>
                <span style="font-size: 11px; font-weight: 500; color: var(--text-muted);">${stats.items.length} cached keys</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${stats.items.map(item => {
                  const itemPct = stats.taskforgeBytes > 0 ? ((item.bytes / stats.taskforgeBytes) * 100).toFixed(1) : 0;
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 12px; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <span style="width: 26px; height: 26px; border-radius: 6px; background: ${item.color}15; color: ${item.color}; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
                          <i class="${item.icon}"></i>
                        </span>
                        <div style="min-width: 0; flex: 1;">
                          <div style="font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.label}</div>
                          <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${item.key}${item.count !== null ? ` · ${item.count} items` : ''}</div>
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                        <div style="width: 70px; height: 6px; background: var(--bg-app); border-radius: 3px; overflow: hidden;" title="${itemPct}% of TaskForge storage">
                          <div style="width: ${Math.max(2, itemPct)}%; height: 100%; background: ${item.color}; border-radius: 3px;"></div>
                        </div>
                        <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); min-width: 55px; text-align: right;">${item.formattedBytes}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Optimization & Info Callout -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted);">
                <i class="fa-solid fa-circle-info" style="color: var(--accent-primary);"></i>
                <span>Browser origin quota: <strong>5.00 MB</strong> (5,242,880 bytes). Data resides exclusively on your device.</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-ghost btn-xs" onclick="SettingsView.pruneActivityLog()" title="Purge older audit entries to free up space" style="font-size: 11px; color: var(--text-muted);">
                  <i class="fa-solid fa-broom"></i> Compact Activity History
                </button>
              </div>
            </div>
          </div>

          <!-- 5. Data Portability Section (JSON & CSV) -->
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

          <!-- 6. Danger Zone -->
          <div style="background: var(--bg-surface); border: 1px solid rgba(248, 81, 73, 0.4); border-radius: var(--radius-lg); padding: 20px;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--accent-danger); margin-bottom: 16px;">
              <i class="fa-solid fa-triangle-exclamation"></i> Danger Zone
            </h3>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">Restore Sample Demo Data</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">Reload the default demonstration projects, epics, sprints, and tasks for exploration.</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="SettingsView.restoreDemoData()">
                  <i class="fa-solid fa-rotate-left"></i> Restore Demo Data
                </button>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <div>
                  <div style="font-weight: 600; font-size: 13px; color: var(--accent-danger);">Wipe All Local Storage Data</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">Permanently clears all tasks, projects, sprints, and metrics from LocalStorage to start with a clean empty slate.</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="SettingsView.wipeData()">
                  <i class="fa-solid fa-trash-can"></i> Wipe Local Storage
                </button>
              </div>
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

    // Bind sync toggle
    const syncToggle = container.querySelector('#settings-sync-toggle');
    if (syncToggle) {
      syncToggle.addEventListener('change', (e) => {
        AppState.settings.autoSyncChecklistSubtasks = e.target.checked;
        StorageService.set(StorageService.KEYS.SETTINGS, AppState.settings);
        Toast.info(`Checklist & subtask auto-sync default ${e.target.checked ? 'enabled' : 'disabled'}`);
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
    Modal.confirm('Wipe All Local Storage Data', 'Are you absolutely sure? All tasks, projects, sprints, comments, and activity logs will be PERMANENTLY deleted from your browser. Storage will be reset to a clean empty slate.', () => {
      AppState.wipeAndReset();
      if (typeof TaskModal !== 'undefined' && TaskModal.isOpen) {
        TaskModal.closeDetail(false);
      }
      if (typeof Router !== 'undefined') {
        Router.renderCurrentRoute();
      }
      Toast.warning('Local storage wiped: All data has been cleared.');
    });
  },

  restoreDemoData() {
    Modal.confirm('Restore Sample Demo Data', 'This will reload the initial demonstration projects, sprints, tasks, and activity logs.', () => {
      StorageService.seedDemoData();
      StorageService.set(StorageService.KEYS.INITIALIZED, true);
      AppState.init();
      if (typeof Sidebar !== 'undefined') {
        Sidebar.render();
        if (typeof Sidebar.updateStorageWidget === 'function') {
          Sidebar.updateStorageWidget();
        }
      }
      if (typeof Router !== 'undefined') {
        Router.renderCurrentRoute();
      }
      Toast.success('Sample demo data restored successfully.');
    });
  },

  refreshStorage() {
    const stats = StorageService.getStorageStats();
    if (AppState.currentView === 'settings') {
      Router.renderCurrentRoute();
    }
    Toast.success(`Storage refreshed: ${stats.formattedTotal} of ${stats.formattedQuota} (${stats.percentUsed}% used)`);
  },

  pruneActivityLog() {
    Modal.confirm('Compact Activity History', 'Keep only the 50 most recent activity entries and purge older logs to reclaim local storage space?', () => {
      if (AppState.activity.length > 50) {
        const removed = AppState.activity.length - 50;
        AppState.activity = AppState.activity.slice(0, 50);
        StorageService.set(StorageService.KEYS.ACTIVITY, AppState.activity);
        AppState.emit('activity:changed');
        if (AppState.currentView === 'settings') {
          Router.renderCurrentRoute();
        }
        Toast.success(`Compacted activity log: Freed ${removed} historical entries.`);
      } else {
        Toast.info('Activity history is already compact (50 or fewer entries).');
      }
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
      toggleBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      toggleBtn.title = theme === 'dark' ? 'Switch to Light Mode (T)' : 'Switch to Dark Mode (T)';
    }

    if (AppState.currentView === 'settings') {
      Router.renderCurrentRoute();
    }
  }
};
