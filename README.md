# TaskForge — Premium Personal Jira-like Task Management System

A high-performance, production-quality, browser-local project and task management system built entirely with modern HTML5, CSS3, and modular ES6+ JavaScript. Inspired by the ergonomics and capabilities of Jira, Linear, ClickUp, and Notion, **TaskForge** runs 100% locally in the browser with zero external servers, databases, or build steps required.

---

## 🚀 Getting Started

Simply open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari, Brave):

```bash
# Option A: Double-click or open directly from your file manager
open index.html # On macOS
start index.html # On Windows

# Option B: Run a lightweight static server (optional)
npx serve .
# or
python -m http.server 8080
```

On first launch, TaskForge automatically seeds realistic initial demo projects (*Website Redesign*, *AI Workflow Assistant*, *Personal Growth & Systems*) and 25+ realistic tasks complete with sprints, epics, priorities, estimates, checklists, and audit history. Your data is 100% persisted to browser `localStorage` and never overwritten.

---

## 📁 Architecture & File Structure

```
TaskPro1/
├── index.html                      # Semantic application shell, dialogs & drawer
├── README.md                       # Product documentation and specification guide
├── project.md                      # Complete system specification
├── css/
│   ├── styles.css                  # Design tokens, theme variables (Dark/Light), layout
│   ├── components.css              # Cards, badges, buttons, modals, toasts, dropdowns
│   └── responsive.css              # Breakpoints for desktop (1440px+), tablet, and mobile
└── js/
    ├── utils.js                    # Sanitization, relative dates, fuzzy search, Web Audio
    ├── storage.js                  # Central StorageService, schemas, JSON/CSV export/import
    ├── state.js                    # Reactive AppState, mutation methods, event bus, undo/redo
    ├── automation.js               # Local workflow automations, recurring tasks, goal rollups
    ├── notifications.js            # In-app notification center & alerts
    ├── router.js                   # Hash-based SPA router with deep links (#/board, etc.)
    ├── search.js                   # Query syntax parser (project:, priority:, status:, etc.)
    ├── filters.js                  # Multi-attribute filter builder & saved custom views
    ├── keyboard.js                 # Global keyboard shortcut manager
    ├── components/
    │   ├── toast.js                # Non-blocking animated toasts
    │   ├── modal.js                # Universal modal dialog controller
    │   ├── task-card.js            # Kanban task card with HTML5 drag-and-drop
    │   ├── task-modal.js           # Jira-style task creation & detail slide-over drawer
    │   ├── sidebar.js              # Collapsible sidebar with active indicators
    │   ├── command-palette.js      # Spotlight-style Ctrl+K command bar
    │   └── context-menu.js         # Right-click context menu on tasks
    ├── views/
    │   ├── dashboard.js            # Summary KPIs, Smart Work Queue, Daily Focus top 3
    │   ├── my-work.js              # Agenda: Today, Upcoming 7 Days, Overdue, Wins
    │   ├── projects.js             # Project gallery, creation, and portfolio tracking
    │   ├── board.js                # Interactive Kanban board with drag-and-drop columns
    │   ├── backlog.js              # Sprints (Active, Planned), Backlog pool, Epics panel
    │   ├── timeline.js             # Gantt timeline view with Day/Week/Month zoom
    │   ├── calendar.js             # Month/Week calendar with click-to-schedule
    │   ├── list.js                 # High-density sortable data grid with bulk operations
    │   ├── reports.js              # Pure JS SVG charts (Burndown, Donut, Velocity, Cycle Time)
    │   ├── goals.js                # Strategic Goals / OKRs with automated rollups
    │   ├── focus.js                # Pomodoro Focus Mode with audio alerts and session logging
    │   └── settings.js             # Theme switcher, JSON/CSV exports, backup restore
    └── app.js                      # Application bootstrap and lifecycle coordinator
```

---

## ⚡ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| <kbd>C</kbd> | Open Create Task modal |
| <kbd>/</kbd> | Open Global Search |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Command Palette |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo last action |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo last undone action |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Toggle Sidebar collapsed / expanded |
| <kbd>T</kbd> | Toggle Dark / Light theme |
| <kbd>?</kbd> | Open Keyboard Shortcuts Cheat Sheet |
| <kbd>Esc</kbd> | Close any open modal, drawer, or palette |

*Note: Shortcuts are intelligently disabled when typing in inputs or textareas.*

---

## 🗄️ LocalStorage Schema

All keys are namespaced under `taskforge_*` to prevent collisions:

| Key | Description | Type |
| :--- | :--- | :--- |
| `taskforge_tasks` | Complete task records with checklists, dependencies, and estimates | `Array<Task>` |
| `taskforge_projects` | Projects with keys, colors, start/target dates, and metadata | `Array<Project>` |
| `taskforge_epics` | High-level organizational epics | `Array<Epic>` |
| `taskforge_sprints` | Sprints with status (`active`, `planned`, `completed`) and goals | `Array<Sprint>` |
| `taskforge_labels` | Color-coded tags (`frontend`, `backend`, `bug`, etc.) | `Array<Label>` |
| `taskforge_goals` | Strategic OKRs with automated progress percentage calculations | `Array<Goal>` |
| `taskforge_comments` | User comments thread associated with tasks | `Array<Comment>` |
| `taskforge_activity` | Full audit log of all status, priority, and date changes | `Array<Activity>` |
| `taskforge_notifications` | In-app alerts for overdue tasks, due dates, and sprint milestones | `Array<Notification>` |
| `taskforge_settings` | Theme (`dark`/`light`), sound effects, and preferences | `Object` |
| `taskforge_initialized` | Flag to prevent overwriting user data after first load | `boolean` |

---

## 💎 Premium Capabilities Included

1. **Smart Work Queue**: A deterministic local scoring algorithm that ranks task urgency based on priority weight, deadline proximity, blockers, and age to recommend the single most impactful next task with an explainable rationale.
2. **Daily Focus**: Automatically surfaces the top 3 must-win priorities for today.
3. **Pomodoro Focus Mode**: A distraction-free 25m/5m interval timer with synthesized audio chimes via Web Audio API that automatically logs tracked minutes directly to task records.
4. **Interactive SVG Analytics**: Sprint burndown charts, status distribution donuts, priority stacked bars, velocity trends, and cycle time calculations without external chart dependencies.
5. **Data Portability**: Complete single-click JSON full backup export, JSON restore with merge/replace choices, and CSV export for spreadsheets.
