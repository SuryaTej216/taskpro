/**
 * TaskForge - System Documentation & Architecture Guide View
 * An interactive, detailed in-app documentation portal explaining the complete
 * product architecture, data hierarchy, view workflows, shortcuts, and storage model.
 */

const DocsView = {
  activeSection: 'overview',
  searchQuery: '',

  render(container) {
    container.innerHTML = `
      <div class="view-page docs-view-page">
        
        <!-- Documentation Header Banner -->
        <div class="docs-hero-card">
          <div class="docs-hero-content">
            <div class="docs-hero-badge">
              <i class="fa-solid fa-graduation-cap"></i> Complete Product Manual & Architecture
            </div>
            <h1 class="docs-hero-title">TaskForge Documentation</h1>
            <p class="docs-hero-desc">
              Comprehensive architectural guide, feature references, workflow explanations, keyboard shortcuts, 
              and data schemas for the TaskForge browser-local productivity platform.
            </p>
            
            <!-- Quick Feature Highlight Strip -->
            <div class="docs-stats-ribbon">
              <div class="docs-stat-item">
                <span class="stat-number">6</span>
                <span class="stat-label">Productivity Views</span>
              </div>
              <div class="docs-stat-divider"></div>
              <div class="docs-stat-item">
                <span class="stat-number">100%</span>
                <span class="stat-label">Client-Side Local</span>
              </div>
              <div class="docs-stat-divider"></div>
              <div class="docs-stat-item">
                <span class="stat-number">0ms</span>
                <span class="stat-label">Network Latency</span>
              </div>
              <div class="docs-stat-divider"></div>
              <div class="docs-stat-item">
                <span class="stat-number">Web Audio</span>
                <span class="stat-label">Synthesized Chimes</span>
              </div>
              <div class="docs-stat-divider"></div>
              <div class="docs-stat-item">
                <span class="stat-number">Zero</span>
                <span class="stat-label">Build Dependencies</span>
              </div>
            </div>
          </div>

          <!-- Documentation Live Search Filter -->
          <div class="docs-search-bar-wrapper">
            <i class="fa-solid fa-magnifying-glass docs-search-icon"></i>
            <input 
              type="text" 
              id="docs-search-input" 
              class="docs-search-input" 
              placeholder="Search documentation (e.g. 'pomodoro', 'sprints', 'shortcuts', 'schema')..." 
              value="${Utils.escapeHTML(this.searchQuery)}"
            />
            ${this.searchQuery ? `
              <button id="docs-search-clear" class="btn-icon btn-sm" title="Clear filter">
                <i class="fa-solid fa-xmark"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Two-Column Documentation Body -->
        <div class="docs-layout-container">
          
          <!-- Sticky Table of Contents -->
          <aside class="docs-toc-sidebar" aria-label="Documentation Navigation">
            <div class="docs-toc-title">
              <i class="fa-solid fa-bars-staggered"></i> Contents
            </div>
            <nav class="docs-toc-nav" id="docs-toc-list">
              <a href="#doc-overview" class="docs-toc-link ${this.activeSection === 'overview' ? 'active' : ''}" data-target="doc-overview">
                <i class="fa-solid fa-cube"></i> System Architecture
              </a>
              <a href="#doc-hierarchy" class="docs-toc-link ${this.activeSection === 'hierarchy' ? 'active' : ''}" data-target="doc-hierarchy">
                <i class="fa-solid fa-sitemap"></i> Data Hierarchy
              </a>
              <a href="#doc-views" class="docs-toc-link ${this.activeSection === 'views' ? 'active' : ''}" data-target="doc-views">
                <i class="fa-solid fa-layer-group"></i> Feature & View Guide
              </a>
              <div class="docs-toc-sublinks">
                <a href="#doc-view-dashboard" class="docs-toc-sublink">1. Dashboard</a>
                <a href="#doc-view-projects" class="docs-toc-sublink">2. Projects & Portfolio</a>
                <a href="#doc-view-board" class="docs-toc-sublink">3. Kanban Board</a>
                <a href="#doc-view-backlog" class="docs-toc-sublink">4. Sprint Planning</a>
                <a href="#doc-view-list" class="docs-toc-sublink">5. List & Bulk Actions</a>
                <a href="#doc-view-settings" class="docs-toc-sublink">6. Settings & Backup</a>
              </div>
              <a href="#doc-commands" class="docs-toc-link ${this.activeSection === 'commands' ? 'active' : ''}" data-target="doc-commands">
                <i class="fa-solid fa-terminal"></i> Command Palette & Search
              </a>
              <a href="#doc-shortcuts" class="docs-toc-link ${this.activeSection === 'shortcuts' ? 'active' : ''}" data-target="doc-shortcuts">
                <i class="fa-regular fa-keyboard"></i> Keyboard Shortcuts
              </a>
              <a href="#doc-storage" class="docs-toc-link ${this.activeSection === 'storage' ? 'active' : ''}" data-target="doc-storage">
                <i class="fa-solid fa-database"></i> Storage & Privacy
              </a>
              <a href="#doc-automations" class="docs-toc-link ${this.activeSection === 'automations' ? 'active' : ''}" data-target="doc-automations">
                <i class="fa-solid fa-bolt"></i> Local Automation Engine
              </a>
            </nav>

            <div class="docs-quick-action-card">
              <div class="docs-quick-action-title">
                <i class="fa-solid fa-circle-question"></i> Need Quick Help?
              </div>
              <p class="docs-quick-action-text">Press <kbd class="command-item-kbd">?</kbd> anywhere to open shortcut cheatsheet, or <kbd class="command-item-kbd">Ctrl+K</kbd> to launch commands.</p>
              <button class="btn btn-secondary btn-sm" onclick="KeyboardManager.showShortcutCheatSheet()" style="width: 100%; justify-content: center; margin-top: 8px;">
                <i class="fa-regular fa-keyboard"></i> Open Cheatsheet
              </button>
            </div>
          </aside>

          <!-- Documentation Content Stream -->
          <article class="docs-content-body" id="docs-content-body">
            
            <!-- SECTION 1: System Overview & Architecture -->
            <section id="doc-overview" class="docs-section">
              <div class="docs-section-badge"><i class="fa-solid fa-cube"></i> Architecture</div>
              <h2 class="docs-section-title">System Overview & Engineering Architecture</h2>
              <p class="docs-paragraph">
                TaskForge is engineered as an <strong>enterprise-grade, zero-backend, browser-local project management platform</strong>. 
                It delivers the speed, ergonomics, and visual polish of modern tools like Jira, Linear, and ClickUp without requiring remote servers, external databases, telemetry tracking, or heavy build toolchains.
              </p>

              <div class="docs-callout docs-callout-info">
                <div class="docs-callout-icon"><i class="fa-solid fa-shield-halved"></i></div>
                <div class="docs-callout-content">
                  <h4>100% Client-Side Privacy Guarantee</h4>
                  <p>Every project, task, sprint, epic, goal, checklist item, and audit log entry resides exclusively inside your browser's <code>localStorage</code>. Zero telemetry, zero network tracking, and zero cloud dependency.</p>
                </div>
              </div>

              <div class="docs-card-grid docs-card-grid-3">
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-primary);"><i class="fa-solid fa-bolt"></i></div>
                  <h3>Vanilla ES6+ Reactive Core</h3>
                  <p>Built with modular ES6+ JavaScript and an event bus pattern. State updates propagate instantly to all views via subscription listeners with zero rendering overhead.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-success);"><i class="fa-solid fa-database"></i></div>
                  <h3>Centralized StorageService</h3>
                  <p>Namespaced persistent storage layer with automated schema validation, automatic sample data seeding, atomic mutations, JSON backups, and CSV export engines.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-purple);"><i class="fa-solid fa-rotate-left"></i></div>
                  <h3>Historical Undo / Redo</h3>
                  <p>Dedicated undo/redo command stack capturing mutation deltas. Press <kbd class="command-item-kbd">Ctrl+Z</kbd> and <kbd class="command-item-kbd">Ctrl+Y</kbd> to reversibly roll back edits.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-cyan);"><i class="fa-solid fa-music"></i></div>
                  <h3>Web Audio API Sound Engine</h3>
                  <p>Audio synthesized directly in real time using native browser oscillators and gain envelopes. No external MP3 files or network audio requests needed.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-warning);"><i class="fa-solid fa-route"></i></div>
                  <h3>Hash Single-Page Router</h3>
                  <p>Clean hash routing (<code>#/tasks</code>, <code>#/projects</code>, <code>#/dashboard</code>) with deep project context switching and dynamic browser history integration.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--status-done);"><i class="fa-solid fa-chart-pie"></i></div>
                  <h3>Pure SVG Visualizations</h3>
                  <p>Interactive burndown charts, donut graphs, and velocity bars rendered natively in lightweight SVG without heavy 3rd-party chart library bundles.</p>
                </div>
              </div>
            </section>

            <!-- SECTION 2: Data Hierarchy -->
            <section id="doc-hierarchy" class="docs-section">
              <div class="docs-section-badge"><i class="fa-solid fa-sitemap"></i> Data Structure</div>
              <h2 class="docs-section-title">The TaskForge Data Model & Hierarchy</h2>
              <p class="docs-paragraph">
                TaskForge structures your work using a standardized professional work breakdown hierarchy, providing clear traceability from high-level strategic goals down to minute subtask checkboxes.
              </p>

              <!-- Interactive Visual Hierarchy Flow -->
              <div class="docs-hierarchy-diagram">
                <div class="hierarchy-level hierarchy-goal">
                  <div class="hierarchy-pill"><i class="fa-solid fa-flag-checkered"></i> Strategic Goals (OKRs)</div>
                  <span class="hierarchy-desc">Annual or quarterly milestones with automated target progress rollups</span>
                </div>
                <div class="hierarchy-connector"><i class="fa-solid fa-arrow-down"></i></div>
                <div class="hierarchy-level hierarchy-project">
                  <div class="hierarchy-pill"><i class="fa-solid fa-folder-tree"></i> Projects</div>
                  <span class="hierarchy-desc">Workspaces with designated keys (e.g., <code>WEB</code>, <code>AI</code>), colors, and timelines</span>
                </div>
                <div class="hierarchy-connector"><i class="fa-solid fa-arrow-down"></i></div>
                <div class="hierarchy-level hierarchy-epic">
                  <div class="hierarchy-pill"><i class="fa-solid fa-layer-group"></i> Epics</div>
                  <span class="hierarchy-desc">Large initiative umbrellas grouping related features and deliverables</span>
                </div>
                <div class="hierarchy-connector"><i class="fa-solid fa-arrow-down"></i></div>
                <div class="hierarchy-level hierarchy-sprint">
                  <div class="hierarchy-pill"><i class="fa-solid fa-person-running"></i> Sprints</div>
                  <span class="hierarchy-desc">Timeboxed delivery cycles with target point capacities (Active, Planned, Completed)</span>
                </div>
                <div class="hierarchy-connector"><i class="fa-solid fa-arrow-down"></i></div>
                <div class="hierarchy-level hierarchy-task">
                  <div class="hierarchy-pill"><i class="fa-solid fa-list-check"></i> Tasks & User Stories</div>
                  <span class="hierarchy-desc">Atomic work units with status, priority, Fibonacci story points, and dependencies</span>
                </div>
                <div class="hierarchy-connector"><i class="fa-solid fa-arrow-down"></i></div>
                <div class="hierarchy-level hierarchy-subtask">
                  <div class="hierarchy-pill"><i class="fa-solid fa-square-check"></i> Subtasks & Checklists</div>
                  <span class="hierarchy-desc">Micro-step checklist items with live progress percentage computation</span>
                </div>
              </div>

              <!-- Data Schema Table -->
              <h3 style="font-size: 16px; font-weight: 700; margin: 24px 0 12px; color: var(--text-primary);">
                Key Entity Attributes
              </h3>
              <div class="docs-table-wrapper">
                <table class="docs-table">
                  <thead>
                    <tr>
                      <th>Entity</th>
                      <th>Primary Identifiers</th>
                      <th>Key Properties</th>
                      <th>Relationships</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span class="badge" style="background: var(--accent-primary-subtle); color: var(--accent-primary);">Project</span></td>
                      <td><code>id</code>, <code>key</code> (e.g. <code>AI</code>)</td>
                      <td>Name, description, color, category, targetDate, status</td>
                      <td>Contains Epics, Sprints, and Tasks</td>
                    </tr>
                    <tr>
                      <td><span class="badge" style="background: var(--accent-purple-subtle); color: var(--accent-purple);">Epic</span></td>
                      <td><code>id</code>, <code>name</code></td>
                      <td>Color badge, summary, status (Planned/In Progress/Done)</td>
                      <td>Belongs to Project; aggregates multiple Tasks</td>
                    </tr>
                    <tr>
                      <td><span class="badge" style="background: var(--accent-warning-subtle); color: var(--accent-warning);">Sprint</span></td>
                      <td><code>id</code>, <code>name</code></td>
                      <td>Status (<code>planned</code>, <code>active</code>, <code>completed</code>), startDate, endDate, goal</td>
                      <td>Belongs to Project; tracks sprint commit points</td>
                    </tr>
                    <tr>
                      <td><span class="badge" style="background: var(--accent-success-subtle); color: var(--accent-success);">Task</span></td>
                      <td><code>id</code>, <code>key</code> (e.g. <code>AI-104</code>)</td>
                      <td>Title, description, status, priority, storyPoints, dueDate, labels</td>
                      <td>Linked to Project, Epic, Sprint; has Checklist & Links</td>
                    </tr>
                    <tr>
                      <td><span class="badge" style="background: var(--accent-cyan-subtle); color: var(--accent-cyan);">Goal</span></td>
                      <td><code>id</code>, <code>title</code></td>
                      <td>Target metric, current progress, targetDate, category</td>
                      <td>Linked to Projects for automatic progress rollup</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- SECTION 3: Views & Feature Guide -->
            <section id="doc-views" class="docs-section">
              <div class="docs-section-badge"><i class="fa-solid fa-layer-group"></i> Views Guide</div>
              <h2 class="docs-section-title">Complete Feature & View Walkthrough</h2>
              <p class="docs-paragraph">
                TaskForge provides 12 specialized, high-density views tailored for every aspect of individual productivity and project delivery.
              </p>

              <!-- 3.1 Dashboard -->
              <div id="doc-view-dashboard" class="docs-feature-block">
                <div class="docs-feature-header">
                  <div class="docs-feature-title">
                    <i class="fa-solid fa-chart-pie" style="color: var(--accent-primary);"></i>
                    <h3>1. Dashboard</h3>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="Router.navigate('dashboard')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Dashboard
                  </button>
                </div>
                <p class="docs-paragraph">
                  Your daily command center. The Dashboard aggregates vital metrics across your active projects and presents an automated, intelligence-ranked agenda.
                </p>
                <div class="docs-bullet-list">
                  <div class="docs-bullet-item">
                    <strong>Real-time KPI Tiles:</strong> Instantly inspect Total Tasks, Work In Progress, Active Sprints count, and Total Completed throughput.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Smart Work Queue:</strong> An algorithmically prioritized queue ordering tasks by criticality score: <code>Overdue > Critical Priority > In Progress > High Priority</code>.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Today's Daily Focus Top 3:</strong> Pin up to 3 highest-leverage tasks for the day to avoid context-switching overload.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Priority Breakdown:</strong> Dynamic visual ratio bar representing distribution across Critical, High, Medium, and Low tasks.
                  </div>
                </div>
              </div>

              <!-- 2. Projects & Portfolio -->
              <div id="doc-view-projects" class="docs-feature-block">
                <div class="docs-feature-header">
                  <div class="docs-feature-title">
                    <i class="fa-solid fa-folder-tree" style="color: var(--accent-cyan);"></i>
                    <h3>2. Projects & Portfolio</h3>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="Router.navigate('projects')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Projects
                  </button>
                </div>
                <p class="docs-paragraph">
                  Manage multiple concurrent initiatives with distinct keys, branding colors, target timelines, and progress calculations.
                </p>
                <div class="docs-bullet-list">
                  <div class="docs-bullet-item">
                    <strong>Unique Project Key Prefix:</strong> Configures task numbering prefix (e.g. <code>WEB-101</code>, <code>AI-204</code>) identical to Jira and Linear.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Portfolio Progress Meter:</strong> Dynamic completion meters calculating done vs remaining story points and task counts.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Global Project Scope Filtering:</strong> Clicking into any project scopes all other views (Board, Sprint Planning, Calendar, Timeline) to that specific project context.
                  </div>
                </div>
              </div>

              <!-- 3. Kanban Board -->
              <div id="doc-view-board" class="docs-feature-block">
                <div class="docs-feature-header">
                  <div class="docs-feature-title">
                    <i class="fa-solid fa-table-columns" style="color: #58a6ff;"></i>
                    <h3>3. Kanban Board</h3>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="Router.navigate('board')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Kanban Board
                  </button>
                </div>
                <p class="docs-paragraph">
                  Visual flow board with silky-smooth HTML5 native drag-and-drop transitions across delivery stages.
                </p>
                <div class="docs-bullet-list">
                  <div class="docs-bullet-item">
                    <strong>5 Standard Workflow Columns:</strong> <code>Backlog</code> ➔ <code>To Do</code> ➔ <code>In Progress</code> ➔ <code>In Review</code> ➔ <code>Done</code>.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Work-In-Progress (WIP) Limits:</strong> Visual column counter indicators preventing personal bottleneck overload.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Interactive Task Cards:</strong> Display priority badges, story points, epic tags, checklists progress, due date warnings, and assignee avatars.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Quick Filter Pills:</strong> Instant one-click toggles to filter board by "Only My Tasks", "High Priority", "Overdue", or specific Epics.
                  </div>
                </div>
              </div>

              <!-- 4. Sprint Planning -->
              <div id="doc-view-backlog" class="docs-feature-block">
                <div class="docs-feature-header">
                  <div class="docs-feature-title">
                    <i class="fa-solid fa-layer-group" style="color: var(--accent-purple);"></i>
                    <h3>4. Sprint Planning</h3>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="Router.navigate('backlog')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Sprint Planning
                  </button>
                </div>
                <p class="docs-paragraph">
                  Full Scrum sprint planning engine. Create, start, and complete sprints with drag-and-drop task assignment, progress tracking, and velocity metrics.
                </p>
                <div class="docs-bullet-list">
                  <div class="docs-bullet-item">
                    <strong>Sprint Lifecycle Management:</strong> Plan upcoming sprints with dates and goals, start sprints with one click, and complete active sprints with automatic rollover.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Drag-to-Sprint Planning:</strong> Drag tasks between sprint containers to reassign them. Story point totals automatically recalculate.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Sprint Overview Stats:</strong> Real-time stats bar showing total sprints, tasks in sprints, unassigned tasks, and velocity metrics at a glance.
                  </div>
                </div>
              </div>

              <!-- 5. List View -->
              <div id="doc-view-list" class="docs-feature-block">
                <div class="docs-feature-header">
                  <div class="docs-feature-title">
                    <i class="fa-solid fa-list-check" style="color: var(--accent-success);"></i>
                    <h3>5. List View & Bulk Actions</h3>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="Router.navigate('list')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open List View
                  </button>
                </div>
                <p class="docs-paragraph">
                  High-density, spreadsheet-grade tabular view designed for rapid scanning and multi-item batch management.
                </p>
                <div class="docs-bullet-list">
                  <div class="docs-bullet-item">
                    <strong>Interactive Column Sorting:</strong> Sort ascending or descending by Key, Title, Status, Priority, Story Points, or Due Date.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Multi-Select Checkboxes:</strong> Select multiple tasks individually or click "Select All" to perform bulk updates.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Batch Operations Floating Bar:</strong> Change status across 20 tasks simultaneously, bump priorities, or batch delete with one click.
                  </div>
                </div>
              </div>

              <!-- 6. Settings & Data Management -->
              <div id="doc-view-settings" class="docs-feature-block">
                <div class="docs-feature-header">
                  <div class="docs-feature-title">
                    <i class="fa-solid fa-gear" style="color: var(--text-secondary);"></i>
                    <h3>6. Settings & Data Portability</h3>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="Router.navigate('settings')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Settings
                  </button>
                </div>
                <p class="docs-paragraph">
                  Comprehensive control over UI themes, sound synthesizer, and complete local database backups.
                </p>
                <div class="docs-bullet-list">
                  <div class="docs-bullet-item">
                    <strong>Theme Switching:</strong> Instant toggle between Dark Mode and crisp Light Mode with persistent preference.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Audio Effects Toggle:</strong> Enable or mute Web Audio completion and timer alerts.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>Full JSON Backup & Restore:</strong> Export your entire TaskForge database as a single JSON file. Restore onto any computer or browser at any time.
                  </div>
                  <div class="docs-bullet-item">
                    <strong>CSV Task Export:</strong> Download all tasks formatted for Excel, Google Sheets, or external data pipelines.
                  </div>
                </div>
              </div>
            </section>

            <!-- SECTION 4: Command Palette & Search Syntax -->
            <section id="doc-commands" class="docs-section">
              <div class="docs-section-badge"><i class="fa-solid fa-terminal"></i> Command System</div>
              <h2 class="docs-section-title">Command Palette & Advanced Search Syntax</h2>
              <p class="docs-paragraph">
                TaskForge is engineered for power users who prefer keyboard navigation over mouse clicks.
              </p>

              <div class="docs-callout docs-callout-tip">
                <div class="docs-callout-icon"><i class="fa-solid fa-lightbulb"></i></div>
                <div class="docs-callout-content">
                  <h4>Pro-Tip: Command Palette (Ctrl+K)</h4>
                  <p>Press <kbd class="command-item-kbd">Ctrl+K</kbd> or <kbd class="command-item-kbd">Cmd+K</kbd> anywhere in the application to summon the Spotlight command bar. Type action keywords or search tasks in real time.</p>
                </div>
              </div>

              <h3 style="font-size: 16px; font-weight: 700; margin: 24px 0 12px; color: var(--text-primary);">
                Search Query Language & Filters
              </h3>
              <p class="docs-paragraph">
                The global search bar in the top navigation bar supports structured qualifier tokens. You can combine qualifiers with free-text search:
              </p>

              <div class="docs-table-wrapper">
                <table class="docs-table">
                  <thead>
                    <tr>
                      <th>Qualifier</th>
                      <th>Syntax Example</th>
                      <th>What It Filters</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>project:</code></td>
                      <td><code>project:WEB</code> or <code>project:AI</code></td>
                      <td>Limits search results to a specific project key</td>
                    </tr>
                    <tr>
                      <td><code>priority:</code></td>
                      <td><code>priority:critical</code> or <code>priority:high</code></td>
                      <td>Filters tasks matching that exact priority tier</td>
                    </tr>
                    <tr>
                      <td><code>status:</code></td>
                      <td><code>status:todo</code> or <code>status:inprogress</code></td>
                      <td>Filters by workflow column / status stage</td>
                    </tr>
                    <tr>
                      <td><code>tag:</code></td>
                      <td><code>tag:frontend</code> or <code>tag:security</code></td>
                      <td>Matches tasks tagged with that specific label</td>
                    </tr>
                    <tr>
                      <td><code>points:</code></td>
                      <td><code>points:5</code> or <code>points:8</code></td>
                      <td>Finds tasks with specified Fibonacci estimation</td>
                    </tr>
                    <tr>
                      <td><code>assignee:</code></td>
                      <td><code>assignee:me</code></td>
                      <td>Filters tasks assigned to current user</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="docs-code-example">
                <span class="code-comment">// Example combined query:</span>
                <code>project:AI priority:high tag:performance model evaluation</code>
              </div>
            </section>

            <!-- SECTION 5: Keyboard Shortcuts Reference -->
            <section id="doc-shortcuts" class="docs-section">
              <div class="docs-section-badge"><i class="fa-regular fa-keyboard"></i> Shortcuts</div>
              <h2 class="docs-section-title">Global Keyboard Shortcuts Reference</h2>
              <p class="docs-paragraph">
                Every primary workflow action has an instant keyboard shortcut. Shortcuts are automatically suppressed when typing within inputs or text areas to prevent accidental triggers.
              </p>

              <div class="docs-table-wrapper">
                <table class="docs-table">
                  <thead>
                    <tr>
                      <th>Key Combination</th>
                      <th>Action</th>
                      <th>Scope / Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><kbd class="command-item-kbd">C</kbd></td>
                      <td>Quick Create Task Dialog</td>
                      <td>Global (when not focused on text input)</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">Ctrl</kbd> + <kbd class="command-item-kbd">K</kbd></td>
                      <td>Summon Command Palette</td>
                      <td>Global (works from anywhere, including inputs)</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">/</kbd></td>
                      <td>Focus Search & Command Palette</td>
                      <td>Global</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">Ctrl</kbd> + <kbd class="command-item-kbd">Z</kbd></td>
                      <td>Undo Last Action</td>
                      <td>Reverts task moves, deletions, edits</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">Ctrl</kbd> + <kbd class="command-item-kbd">Y</kbd></td>
                      <td>Redo Last Undone Action</td>
                      <td>Re-applies reverted action</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">Ctrl</kbd> + <kbd class="command-item-kbd">B</kbd></td>
                      <td>Toggle Sidebar Collapsed / Expanded</td>
                      <td>Expands viewport for maximum focus</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">T</kbd></td>
                      <td>Toggle Dark / Light Theme</td>
                      <td>Instant theme switch</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">?</kbd></td>
                      <td>Show Keyboard Shortcuts Cheat Sheet</td>
                      <td>Opens shortcut modal helper</td>
                    </tr>
                    <tr>
                      <td><kbd class="command-item-kbd">Esc</kbd></td>
                      <td>Close Active Modal, Drawer, or Menu</td>
                      <td>Global dismiss</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- SECTION 6: Storage, Backup & Privacy -->
            <section id="doc-storage" class="docs-section">
              <div class="docs-section-badge"><i class="fa-solid fa-database"></i> Storage Model</div>
              <h2 class="docs-section-title">Data Storage, Portability & Privacy</h2>
              <p class="docs-paragraph">
                All data is managed locally through a centralized abstraction layer. The key structure is isolated within the browser's origin under the <code>taskforge_*</code> namespace:
              </p>

              <div class="docs-table-wrapper">
                <table class="docs-table">
                  <thead>
                    <tr>
                      <th>LocalStorage Key</th>
                      <th>Stored Data Entity</th>
                      <th>Default Fallback</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>taskforge_tasks</code></td>
                      <td>Complete array of all user tasks, subtasks, checklists, and audit history</td>
                      <td>Seeds 25+ realistic sample tasks on first launch</td>
                    </tr>
                    <tr>
                      <td><code>taskforge_projects</code></td>
                      <td>Configured projects, keys, categories, and colors</td>
                      <td>Seeds 3 demo projects (Website Redesign, AI Assistant, Personal Growth)</td>
                    </tr>
                    <tr>
                      <td><code>taskforge_epics</code></td>
                      <td>Epics groupings and colors</td>
                      <td>Seeds initial high-level feature epics</td>
                    </tr>
                    <tr>
                      <td><code>taskforge_sprints</code></td>
                      <td>Active and planned sprints, goals, and point targets</td>
                      <td>Seeds Sprint 1 (Active) & Sprint 2 (Planned)</td>
                    </tr>
                    <tr>
                      <td><code>taskforge_goals</code></td>
                      <td>Strategic goals and key results</td>
                      <td>Seeds quarterly OKRs</td>
                    </tr>
                    <tr>
                      <td><code>taskforge_settings</code></td>
                      <td>User preferences (Theme, Sound, Focus duration)</td>
                      <td>Default Dark Theme, Sound Enabled</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="docs-callout docs-callout-warning">
                <div class="docs-callout-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="docs-callout-content">
                  <h4>Best Practice: Routine Backups</h4>
                  <p>Because browser local storage can be affected if you perform a complete browser cache wipe, click <strong>Export All Data (JSON)</strong> in Settings periodically to preserve offline copies of your projects.</p>
                </div>
              </div>
            </section>

            <!-- SECTION 7: Local Automation Engine -->
            <section id="doc-automations" class="docs-section">
              <div class="docs-section-badge"><i class="fa-solid fa-bolt"></i> Automations</div>
              <h2 class="docs-section-title">Local Workflow Automation Engine</h2>
              <p class="docs-paragraph">
                TaskForge includes a local rule engine (<code>automation.js</code>) that runs silently on state mutations to automate routine administrative chores:
              </p>
              
              <div class="docs-card-grid docs-card-grid-2">
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-success);"><i class="fa-solid fa-check-double"></i></div>
                  <h3>Auto-Complete on Subtasks</h3>
                  <p>When all checklist subtasks in a task card are checked off, the system automatically prompts or marks the parent task as Completed.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-warning);"><i class="fa-solid fa-arrows-rotate"></i></div>
                  <h3>Recurring Task Rescheduler</h3>
                  <p>Tasks with recurrence cadence (Daily, Weekly, Monthly) automatically generate the next cycle task when resolved.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-cyan);"><i class="fa-solid fa-chart-line"></i></div>
                  <h3>Automatic Goal Rollups</h3>
                  <p>Completing tasks in a linked project immediately updates the parent OKR progress percentage in real time.</p>
                </div>
                <div class="docs-feature-card">
                  <div class="docs-card-icon" style="color: var(--accent-purple);"><i class="fa-solid fa-clock-rotate-left"></i></div>
                  <h3>Audit Activity Logging</h3>
                  <p>Every status transition, estimate revision, and title change is appended to the task's immutable audit log for complete history.</p>
                </div>
              </div>
            </section>

          </article>
        </div>

      </div>
    `;

    this.attachEventListeners(container);
  },

  attachEventListeners(container) {
    // 1. Search filter in docs
    const searchInput = document.getElementById('docs-search-input');
    const clearBtn = document.getElementById('docs-search-clear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.filterContent();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        this.filterContent();
      });
    }

    // 2. TOC link click smooth scroll
    const tocLinks = container.querySelectorAll('.docs-toc-nav a');
    tocLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href').slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          this.setActiveToc(link.dataset.target || targetId);
        }
      });
    });

    // 3. Scroll spy to highlight active TOC link
    const contentArea = container.querySelector('#docs-content-body');
    if (contentArea) {
      window.addEventListener('scroll', () => this.handleScrollSpy(), { passive: true });
    }
  },

  setActiveToc(targetId) {
    document.querySelectorAll('.docs-toc-link').forEach(l => {
      if (l.dataset.target === targetId || l.getAttribute('href') === `#${targetId}`) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });
  },

  handleScrollSpy() {
    const sections = document.querySelectorAll('.docs-section');
    const scrollPos = window.scrollY || window.pageYOffset;

    sections.forEach(sec => {
      const top = sec.offsetTop - 140;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        this.setActiveToc(sec.id);
      }
    });
  },

  filterContent() {
    const query = this.searchQuery;
    const featureBlocks = document.querySelectorAll('.docs-feature-block, .docs-feature-card, .docs-section');

    if (!query) {
      featureBlocks.forEach(el => {
        el.style.display = '';
      });
      return;
    }

    featureBlocks.forEach(el => {
      const text = el.textContent.toLowerCase();
      if (text.includes(query)) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }
};
