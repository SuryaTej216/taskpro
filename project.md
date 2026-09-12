# MASTER PROMPT — PREMIUM INDIVIDUAL JIRA-LIKE TASK MANAGEMENT APP

## ROLE

You are a Senior Product Engineer, UI/UX Designer, Frontend Architect,
JavaScript Engineer, Product Manager, and QA Engineer.

Your job is to design and build a production-quality,
premium Individual Task Management application inspired by
the best capabilities of Jira, Linear, ClickUp, Notion, Trello,
Asana, and modern productivity systems.

IMPORTANT:

This is an INDIVIDUAL / SINGLE-USER application.

The application must run entirely in the browser.

============================================================
# 1. TECHNOLOGY CONSTRAINTS
============================================================

Frontend:

- HTML5
- CSS3
- Vanilla JavaScript ES6+
- Bootstrap 5 OR Tailwind CSS
- Font Awesome / Lucide icons if useful

Storage:

- Browser LocalStorage ONLY

DO NOT USE:

- React
- Angular
- Vue
- Node.js
- Express
- Java
- Python backend
- PHP
- MySQL
- PostgreSQL
- MongoDB
- Firebase
- Supabase
- Docker
- Redis
- External backend
- Authentication server
- Build tools requiring installation

The application must work by opening:

index.html

directly in a modern browser.

No server should be required.

============================================================
# 2. PRODUCT VISION
============================================================

Build:

"TaskForge"

A premium personal Jira-like project and task management system.

The application should feel like a serious professional
work-management product rather than a simple Todo application.

Target users:

- Software developers
- Students
- Managers
- Product managers
- Engineers
- Freelancers
- Individual professionals
- People managing multiple projects

The product should provide:

Projects → Epics → Stories → Tasks → Subtasks

with powerful organization, planning, tracking,
search, filtering, reporting, productivity analytics,
and personal workflow management.

============================================================
# 3. DESIGN PRINCIPLES
============================================================

The UI must be:

- Premium
- Modern
- Minimal
- Professional
- Responsive
- Fast
- Accessible
- Keyboard-friendly
- Desktop-first but mobile responsive
- Information-dense without looking cluttered

Use design inspiration from:

- Jira
- Linear
- Notion
- ClickUp
- Asana
- Trello

DO NOT directly copy proprietary branding,
logos, or exact visual designs.

Create an original interface.

============================================================
# 4. APPLICATION SHELL
============================================================

Create a professional application shell.

LEFT SIDEBAR:

- Logo
- Dashboard
- My Work
- Inbox
- Projects
- Board
- Backlog
- Timeline
- Calendar
- List
- Reports
- Goals
- Labels
- Priorities
- Search
- Settings

Sidebar features:

- Collapse / expand
- Tooltips when collapsed
- Active navigation indicator
- Project shortcuts
- Recently viewed projects

TOP NAVIGATION:

- Global search
- Create Task button
- Quick Create
- Notifications
- Command palette
- Theme switcher
- User/profile menu

MAIN CONTENT:

Dynamic view area.

============================================================
# 5. DASHBOARD
============================================================

Create a premium personal dashboard.

Display:

## Productivity Summary

- Total tasks
- Open tasks
- In progress
- Completed
- Overdue
- Due today
- Due this week
- Blocked
- High priority

## Progress

- Daily completion rate
- Weekly completion rate
- Monthly completion rate
- Project completion percentage
- Goal completion percentage

## Widgets

Create configurable widgets:

- My tasks
- Today's tasks
- Upcoming deadlines
- Overdue tasks
- Recently completed
- Recently updated
- Priority tasks
- Blocked tasks
- Project progress
- Productivity streak
- Workload
- Completion chart
- Priority distribution
- Status distribution

Allow widgets to be rearranged if practical.

============================================================
# 6. PROJECT MANAGEMENT
============================================================

Projects must support:

- Project name
- Description
- Project key
- Icon
- Color
- Status
- Start date
- Target date
- Progress
- Project owner
- Labels
- Goals
- Notes

Project statuses:

- Planning
- Active
- On Hold
- Completed
- Archived

Each project should have:

- Overview
- Board
- Backlog
- List
- Timeline
- Calendar
- Reports

============================================================
# 7. ISSUE / TASK SYSTEM
============================================================

Support these issue types:

- Epic
- Story
- Task
- Bug
- Improvement
- Subtask
- Milestone

Every task must support:

- Task ID
- Task key
- Title
- Description
- Rich text description
- Project
- Issue type
- Status
- Priority
- Labels
- Assignee
- Reporter
- Parent task
- Epic
- Sprint
- Start date
- Due date
- Estimated time
- Remaining time
- Actual time
- Story points
- Dependencies
- Blockers
- Checklist
- Subtasks
- Attachments metadata
- Comments
- Activity history
- Created date
- Updated date
- Completed date

============================================================
# 8. TASK STATUS WORKFLOW
============================================================

Default workflow:

BACKLOG
    ↓
TODO
    ↓
IN PROGRESS
    ↓
IN REVIEW
    ↓
DONE

Additional states:

- BLOCKED
- CANCELLED

Allow the user to customize statuses.

Each status should have:

- Name
- Color
- Category
- Order

============================================================
# 9. PRIORITY SYSTEM
============================================================

Support:

- Critical
- Highest
- High
- Medium
- Low
- Lowest

Display priorities visually.

Allow sorting by priority.

============================================================
# 10. TASK CREATION
============================================================

Create a beautiful task creation modal.

Quick Create:

Title
Project
Issue type
Priority
Status
Due date

Advanced Create:

Description
Labels
Parent
Epic
Sprint
Dependencies
Estimate
Story points
Checklist
Recurring settings

Support keyboard shortcut:

C

for Create Task.

============================================================
# 11. TASK DETAIL PANEL
============================================================

Clicking a task should open a large detail panel.

Layout:

------------------------------------------------
TASK KEY + TYPE + STATUS
------------------------------------------------

Title

Description

------------------------------------------------
Properties
------------------------------------------------

Priority
Status
Project
Epic
Sprint
Labels
Due date
Estimate
Story points

------------------------------------------------
Subtasks
------------------------------------------------

Checklist / subtasks

------------------------------------------------
Dependencies
------------------------------------------------

Blocked by
Blocks

------------------------------------------------
Comments
------------------------------------------------

Comment editor

------------------------------------------------
Activity
------------------------------------------------

Full task history.

Allow editing inline.

============================================================
# 12. SUBTASKS
============================================================

Support:

Parent task
    ├── Subtask 1
    ├── Subtask 2
    └── Subtask 3

Display:

- Completion percentage
- Progress bar
- Completed subtasks
- Remaining subtasks

Parent task progress should automatically update.

============================================================
# 13. CHECKLISTS
============================================================

Every task may have a checklist.

Features:

- Add item
- Complete item
- Delete item
- Reorder item
- Progress percentage

Example:

[✓] Requirement analysis
[✓] Database design
[ ] API implementation
[ ] Testing
[ ] Documentation

============================================================
# 14. LABELS
============================================================

Create labels such as:

frontend
backend
bug
urgent
learning
personal
work
study
deployment
security

Features:

- Create label
- Edit label
- Delete label
- Label color
- Filter by label

============================================================
# 15. BOARD VIEW
============================================================

Create a Jira/Linear-style Kanban board.

Columns:

Backlog
Todo
In Progress
Review
Done

Features:

- Drag and drop tasks
- Drag between columns
- Reorder tasks
- Task cards
- Priority indicator
- Due date
- Labels
- Subtask progress
- Story points

Dragging a task must update LocalStorage immediately.

============================================================
# 16. BACKLOG
============================================================

Create a backlog view.

Features:

- Epics
- Stories
- Tasks
- Bugs
- Subtasks

Allow:

- Drag ordering
- Convert task to story
- Move to sprint
- Create sprint
- Edit task
- Delete task
- Bulk select

============================================================
# 17. SPRINT MANAGEMENT
============================================================

Support:

- Sprint name
- Sprint goal
- Start date
- End date
- Status

Statuses:

- Planned
- Active
- Completed

Sprint dashboard:

- Planned points
- Completed points
- Remaining points
- Completion percentage
- Tasks completed
- Tasks remaining

Create a burndown chart.

============================================================
# 18. TIMELINE / GANTT
============================================================

Create a timeline view.

Display:

Projects
Epics
Tasks
Milestones

Each task should appear according to:

Start date → Due date

Features:

- Zoom
- Day
- Week
- Month
- Quarter

Show dependencies visually where practical.

============================================================
# 19. CALENDAR
============================================================

Create calendar views:

- Month
- Week
- Day

Display tasks by due date.

Features:

- Click date → create task
- Drag task to change due date
- Overdue highlighting
- Today indicator
- Task priority

============================================================
# 20. LIST VIEW
============================================================

Create a powerful table/list view.

Columns:

- Key
- Type
- Title
- Status
- Priority
- Project
- Sprint
- Labels
- Due date
- Story points
- Progress

Features:

- Sort columns
- Filter columns
- Resize columns if practical
- Multi-select
- Bulk edit
- Bulk delete
- Bulk status change
- Bulk priority change

============================================================
# 21. GLOBAL SEARCH
============================================================

Create a powerful search engine.

Search across:

- Tasks
- Projects
- Epics
- Labels
- Comments

Search examples:

"login"

"bug"

"high priority"

"overdue"

"project:website"

"status:in-progress"

"priority:high"

"label:frontend"

Support fuzzy matching where practical.

Highlight matching text.

============================================================
# 22. ADVANCED FILTERING
============================================================

Provide filter builder.

Filters:

Project
Status
Priority
Issue type
Sprint
Epic
Label
Due date
Created date
Updated date
Story points

Support AND / OR logic where practical.

Allow saving filters as:

"Views"

Examples:

My Critical Tasks
Overdue Tasks
This Week
Bugs
Learning Tasks

============================================================
# 23. COMMAND PALETTE
============================================================

Implement:

Ctrl + K

Command palette.

Commands:

Create task
Search
Open dashboard
Open projects
Open board
Open backlog
Open calendar
Open reports
Toggle dark mode
Export data
Import data
Settings

Use keyboard navigation.

============================================================
# 24. KEYBOARD SHORTCUTS
============================================================

Support:

C = Create task
/
= Search
Ctrl + K = Command palette
Esc = Close modal
Enter = Submit
E = Edit selected task
Delete = Delete selected task
? = Show shortcuts

Do not trigger shortcuts while typing in inputs/textareas.

============================================================
# 25. NOTIFICATIONS / INBOX
============================================================

Create a personal notification center.

Notifications:

- Task due soon
- Task overdue
- Task completed
- Dependency blocked
- Sprint ending
- Goal deadline
- Recently changed task

Allow:

- Mark as read
- Mark all as read
- Delete notification

============================================================
# 26. COMMENTS
============================================================

Tasks support comments.

Each comment:

- ID
- Text
- Timestamp
- Edited state

Features:

- Add comment
- Edit comment
- Delete comment
- Timestamp

============================================================
# 27. ACTIVITY HISTORY
============================================================

Every task should maintain activity history.

Examples:

Task created
Status changed
Priority changed
Due date changed
Label added
Label removed
Comment added
Subtask completed
Task completed

Display chronological history.

============================================================
# 28. DEPENDENCIES
============================================================

Support:

Task A blocks Task B.

Relationships:

- Blocks
- Blocked by
- Related to

Prevent invalid dependency loops where practical.

Display blocked tasks prominently.

============================================================
# 29. RECURRING TASKS
============================================================

Support recurring tasks:

Daily
Weekly
Monthly
Custom

Examples:

Daily coding practice
Weekly report
Monthly review

When a recurring task is completed,
generate the next occurrence automatically.

============================================================
# 30. GOALS
============================================================

Create a Goals system.

Goal:

- Name
- Description
- Deadline
- Progress
- Related projects
- Related tasks

Display:

Goal progress

Task completion contribution

============================================================
# 31. PRODUCTIVITY ANALYTICS
============================================================

Create Reports.

Reports:

### Task Completion

- Tasks created
- Tasks completed
- Completion rate

### Status Distribution

Pie/donut chart.

### Priority Distribution

Chart.

### Project Progress

Chart.

### Weekly Productivity

Bar chart.

### Completion Trend

Line chart.

### Overdue Analysis

Overdue tasks by project and priority.

### Cycle Time

Average time from:

Created → Completed

Use pure JavaScript and lightweight
browser-compatible chart implementation.

============================================================
# 32. MY WORK
============================================================

Create a personalized "My Work" page.

Sections:

Today
Upcoming
Overdue
Recently completed

Allow grouping by:

- Date
- Project
- Priority
- Status

============================================================
# 33. FOCUS MODE
============================================================

Create Focus Mode.

Features:

- Select one task
- Minimal interface
- Start timer
- Pause
- Stop
- Track session duration

Use:

Pomodoro

25 min work
5 min break

Allow custom duration.

Persist sessions in LocalStorage.

============================================================
# 34. TIME TRACKING
============================================================

Each task should support:

Start timer
Pause timer
Stop timer
Manual time entry

Display:

Estimated time
Tracked time
Remaining time

Persist all time data.

============================================================
# 35. TASK TEMPLATES
============================================================

Allow creating templates.

Examples:

Bug Template
Feature Template
Learning Template
Project Template
Meeting Template

Template fields can include:

Title
Description
Priority
Labels
Checklist
Subtasks

============================================================
# 36. BULK OPERATIONS
============================================================

Allow selecting multiple tasks.

Actions:

- Delete
- Change status
- Change priority
- Add label
- Remove label
- Move project
- Move sprint
- Archive

Always ask for confirmation before destructive operations.

============================================================
# 37. UNDO / REDO
============================================================

Implement application-level:

Undo
Redo

for important actions.

Maintain a history stack.

Support:

Ctrl + Z
Ctrl + Y

Do not interfere with normal browser text editing.

============================================================
# 38. ARCHIVE
============================================================

Tasks and projects can be archived.

Archived items should:

- Not appear in normal views
- Remain searchable
- Be restorable
- Be permanently deletable with confirmation

============================================================
# 39. IMPORT / EXPORT
============================================================

Because the application uses LocalStorage,
create robust data portability.

Export:

JSON

Also support CSV export for tasks.

Import:

JSON

Before importing:

- Validate structure
- Show preview
- Confirm replacement/merge

Provide:

Export All Data
Import Data
Backup Data

============================================================
# 40. LOCAL STORAGE ARCHITECTURE
============================================================

Create a structured storage layer.

Use keys such as:

taskforge_projects
taskforge_tasks
taskforge_epics
taskforge_sprints
taskforge_labels
taskforge_goals
taskforge_comments
taskforge_notifications
taskforge_activity
taskforge_settings
taskforge_time_entries
taskforge_templates
taskforge_preferences

DO NOT manipulate LocalStorage randomly throughout the application.

Create a central storage/service layer.

Example architecture:

storage.js

StorageService

Methods:

get()
set()
remove()
update()
clear()
export()
import()

============================================================
# 41. DATA MODEL
============================================================

Create normalized JavaScript data structures.

Example:

Project:

{
  id,
  key,
  name,
  description,
  status,
  color,
  icon,
  startDate,
  targetDate,
  createdAt,
  updatedAt
}

Task:

{
  id,
  key,
  projectId,
  parentId,
  epicId,
  sprintId,
  type,
  title,
  description,
  status,
  priority,
  labels,
  dueDate,
  startDate,
  estimate,
  trackedTime,
  storyPoints,
  dependencies,
  checklist,
  createdAt,
  updatedAt,
  completedAt,
  archived
}

Use IDs instead of duplicating entire objects.

============================================================
# 42. SAMPLE DATA
============================================================

On first launch only,
populate realistic demo data.

Create:

3 projects

Example:

WEB
AI
PERSONAL

Create:

20–30 tasks

Include:

- Different priorities
- Different statuses
- Overdue tasks
- Completed tasks
- Bugs
- Stories
- Epics
- Subtasks
- Labels
- Sprint data

After first initialization,
never overwrite user data.

============================================================
# 43. DARK MODE
============================================================

Support:

Light Mode
Dark Mode
System Mode

Persist selected theme.

Design dark mode professionally.

Avoid pure black backgrounds everywhere.

============================================================
# 44. RESPONSIVE DESIGN
============================================================

Desktop:

Full sidebar
Multi-column layouts
Dense tables

Tablet:

Collapsible sidebar

Mobile:

Bottom navigation or mobile sidebar
Cards instead of dense tables
Responsive task detail

Ensure:

320px+
768px+
1024px+
1440px+

work correctly.

============================================================
# 45. ACCESSIBILITY
============================================================

Implement:

- Semantic HTML
- ARIA labels where necessary
- Keyboard navigation
- Visible focus states
- Accessible modal behavior
- Good contrast
- Tooltips
- Screen-reader-friendly labels

============================================================
# 46. PERFORMANCE
============================================================

Application should remain responsive with:

1,000+ tasks

Avoid unnecessary DOM re-rendering.

Use:

- Event delegation
- Efficient filtering
- Debounced search
- Modular rendering
- Pagination/virtualization if necessary

============================================================
# 47. ERROR HANDLING
============================================================

Never allow the application to silently fail.

Handle:

- Corrupt LocalStorage
- Invalid imported JSON
- Missing task references
- Missing project references
- Duplicate IDs
- Invalid dates

Show user-friendly error messages.

Never expose raw JavaScript errors to the user.

============================================================
# 48. CONFIRMATION SYSTEM
============================================================

Destructive operations require confirmation:

Delete task
Delete project
Clear all data
Permanent delete
Import replacement

Use professional confirmation dialogs.

============================================================
# 49. SETTINGS
============================================================

Settings page:

General
Appearance
Task defaults
Statuses
Priorities
Labels
Keyboard shortcuts
Notifications
Data management
Import/export
Reset demo data

Danger Zone:

Clear application data

Require confirmation.

============================================================
# 50. EMPTY STATES
============================================================

Every page must have meaningful empty states.

Example:

"No tasks yet"

"Create your first task to start tracking your work."

Include CTA buttons.

Do NOT show blank screens.

============================================================
# 51. TOAST SYSTEM
============================================================

Implement reusable toast notifications.

Examples:

Task created
Task updated
Task deleted
Task moved
Export successful
Import successful

Toast types:

Success
Info
Warning
Error

============================================================
# 52. MODAL SYSTEM
============================================================

Create reusable modal component.

Support:

- Task modal
- Project modal
- Sprint modal
- Label modal
- Confirmation modal
- Import modal
- Export modal
- Shortcut modal

============================================================
# 53. UI COMPONENT SYSTEM
============================================================

Create reusable components:

Button
Modal
Dropdown
Select
Input
Textarea
Badge
Tag
Toast
Tooltip
Tabs
Card
Table
Kanban Card
Progress bar
Date picker
Command palette
Context menu
Confirm dialog

Avoid duplicated HTML where possible.

============================================================
# 54. ARCHITECTURE
============================================================

Use modular JavaScript.

Recommended structure:

/taskforge
│
├── index.html
│
├── css/
│   ├── styles.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── storage.js
│   ├── state.js
│   ├── router.js
│   ├── utils.js
│   ├── keyboard.js
│   ├── notifications.js
│   ├── search.js
│   ├── filters.js
│   │
│   ├── components/
│   │   ├── modal.js
│   │   ├── toast.js
│   │   ├── task-card.js
│   │   ├── task-modal.js
│   │   ├── sidebar.js
│   │   └── command-palette.js
│   │
│   └── views/
│       ├── dashboard.js
│       ├── projects.js
│       ├── board.js
│       ├── backlog.js
│       ├── timeline.js
│       ├── calendar.js
│       ├── list.js
│       ├── reports.js
│       ├── goals.js
│       ├── my-work.js
│       └── settings.js
│
└── README.md

You may improve the structure if necessary.

============================================================
# 55. STATE MANAGEMENT
============================================================

Create a centralized application state.

Example:

AppState = {

  currentView,
  selectedProject,
  selectedTask,
  filters,
  searchQuery,
  theme,
  modal,
  tasks,
  projects

}

Changes should follow a predictable flow:

User Action
     ↓
State Update
     ↓
LocalStorage Update
     ↓
UI Render

============================================================
# 56. ROUTING
============================================================

Implement SPA-style navigation without a framework.

Views:

#/dashboard
#/my-work
#/projects
#/project/:id
#/board
#/backlog
#/timeline
#/calendar
#/list
#/reports
#/goals
#/settings

Browser back/forward should work.

============================================================
# 57. SECURITY
============================================================

Even though this is local-only:

- Escape user-generated HTML
- Prevent unsafe innerHTML usage
- Sanitize rich text
- Validate imported data
- Do not execute imported JavaScript
- Do not store secrets

============================================================
# 58. DATE HANDLING
============================================================

Use consistent ISO date storage.

Example:

2026-09-12T19:30:00.000Z

Display dates in user's local timezone.

Support:

Today
Tomorrow
This week
Next week
Overdue

============================================================
# 59. DEMO EXPERIENCE
============================================================

When opening the app for the first time,
the user should immediately see a populated professional dashboard.

Do NOT make the first screen look empty.

Demo project:

"Website Redesign"

Example tasks:

WEB-1
WEB-2
WEB-3
WEB-4

Use realistic data.

============================================================
# 60. JIRA-STYLE FEATURES TO INCLUDE
============================================================

Implement equivalents of:

- Projects
- Issues
- Epics
- Stories
- Tasks
- Bugs
- Subtasks
- Backlog
- Sprints
- Kanban board
- Scrum board
- Timeline
- Calendar
- Filters
- Saved views
- Labels
- Priorities
- Dependencies
- Comments
- Activity history
- Estimates
- Story points
- Reports
- Dashboards
- Goals
- Notifications
- Search
- Keyboard shortcuts
- Bulk operations
- Templates
- Recurring tasks
- Time tracking
- Import/export
- Archive
- Undo/redo

============================================================
# 61. PREMIUM DIFFERENTIATORS
============================================================

Go beyond a basic Jira clone.

Add:

## Smart Work Queue

Automatically rank tasks using:

Priority
Urgency
Due date
Dependencies
Age
Story points

Show:

"Recommended Next Task"

Explain why it was selected.

This must be deterministic JavaScript logic,
NOT an external AI API.

## Daily Focus

Automatically create:

Top 3 tasks for today.

## Workload Indicator

Show:

Light
Normal
Heavy
Overloaded

based on active task count and estimates.

## Deadline Risk

Calculate:

Safe
At Risk
Critical
Overdue

## Productivity Streak

Track consecutive productive days.

## Completion Velocity

Show average completed tasks per day/week.

============================================================
# 62. PERSONAL WORKFLOW AUTOMATION
============================================================

Implement browser-local automation logic.

Examples:

When task becomes DONE:

- Record completedAt
- Update activity
- Update project progress
- Update sprint progress
- Update goal progress
- Show toast

When task becomes overdue:

- Mark as overdue
- Add notification

When parent task's subtasks are completed:

- Update parent progress

============================================================
# 63. DASHBOARD CUSTOMIZATION
============================================================

Allow the user to:

- Show/hide widgets
- Change widget order
- Reset dashboard

Persist preferences.

============================================================
# 64. CONTEXT MENUS
============================================================

Right-click task:

Open
Edit
Duplicate
Change status
Change priority
Move
Add label
Archive
Delete

Right-click project:

Open
Edit
Archive
Delete

============================================================
# 65. DUPLICATE TASK
============================================================

Duplicate should create a new ID and key.

Copy:

- Title
- Description
- Priority
- Labels
- Checklist
- Estimate
- Type

Do NOT copy:

- ID
- Task key
- Activity history
- Comments
- Completion timestamp

============================================================
# 66. TASK RELATIONSHIPS
============================================================

Allow:

Parent
Child
Blocks
Blocked by
Related

Show relationships in task detail.

============================================================
# 67. PROJECT PROGRESS
============================================================

Calculate project progress using:

Completed tasks / total active tasks

Also provide optional:

Story-point-based progress.

============================================================
# 68. REPORTING
============================================================

Reports should update automatically
from LocalStorage data.

Never hard-code report numbers.

============================================================
# 69. TESTING
============================================================

Before declaring the application complete,
test:

Task creation
Task editing
Task deletion
Task duplication
Task completion
Drag/drop
Filtering
Searching
Sorting
Projects
Epics
Sprints
Subtasks
Dependencies
Recurring tasks
Calendar
Timeline
Reports
Import
Export
Dark mode
Responsive UI
Keyboard shortcuts
Undo/redo

Test LocalStorage persistence.

Refresh the page and verify that data remains.

============================================================
# 70. QUALITY GATE
============================================================

Do NOT consider the project complete merely because
the page renders.

The application must be:

- Functional
- Interactive
- Persistent
- Responsive
- Consistent
- Visually polished
- Error-resistant

Every visible button must perform a real action.

Every form must save data.

Every view must display real LocalStorage data.

No placeholder buttons.

No fake charts.

No fake metrics.

No lorem ipsum.

============================================================
# 71. IMPLEMENTATION STRATEGY
============================================================

Do NOT attempt to write the entire application
as one giant HTML file.

Build incrementally.

PHASE 1
Application shell
Storage layer
State management
Routing

PHASE 2
Projects
Tasks
Task detail
CRUD

PHASE 3
Board
Backlog
Subtasks
Labels
Priorities

PHASE 4
Search
Filters
Saved views
Command palette

PHASE 5
Calendar
Timeline
Sprints
Dependencies

PHASE 6
Dashboard
Reports
Goals
Analytics

PHASE 7
Time tracking
Focus mode
Recurring tasks
Templates

PHASE 8
Import/export
Undo/redo
Notifications
Settings

PHASE 9
Responsive design
Accessibility
Performance
Error handling

PHASE 10
Full QA
Bug fixing
UI polish

============================================================
# 72. AGENTIC IDE WORKING RULES
============================================================

You are responsible for actually implementing the application.

DO NOT simply explain what code should be written.

Create and modify the required files.

After each phase:

1. Inspect existing files.
2. Preserve working functionality.
3. Implement the next feature.
4. Test affected functionality.
5. Fix discovered issues.
6. Continue to the next phase.

Never overwrite functioning features unnecessarily.

Do not introduce frameworks that violate the technology constraints.

Do not ask unnecessary confirmation questions.

Make sensible engineering decisions autonomously.

============================================================
# 73. CODE QUALITY
============================================================

Use:

- Meaningful variable names
- Small functions
- Reusable utilities
- Modular files
- Comments only where useful
- Defensive programming
- Consistent formatting

Avoid:

- Massive functions
- Duplicate code
- Global variables everywhere
- Hard-coded business logic
- Inline JavaScript
- Inline CSS where avoidable

============================================================
# 74. FINAL DELIVERABLE
============================================================

The final application must contain:

1. index.html
2. Complete CSS
3. Complete JavaScript
4. LocalStorage persistence
5. Demo data
6. Responsive UI
7. Dashboard
8. Projects
9. Tasks
10. Epics
11. Stories
12. Bugs
13. Subtasks
14. Kanban board
15. Backlog
16. Sprints
17. Calendar
18. Timeline
19. List view
20. Search
21. Filters
22. Saved views
23. Reports
24. Goals
25. Notifications
26. Comments
27. Activity history
28. Dependencies
29. Time tracking
30. Focus mode
31. Recurring tasks
32. Templates
33. Bulk operations
34. Undo/redo
35. Import/export
36. Dark mode
37. Keyboard shortcuts
38. Settings
39. Accessibility
40. Error handling

============================================================
# 75. FINAL QA CHECKLIST
============================================================

Before finishing, verify:

[ ] App opens directly from index.html
[ ] No backend required
[ ] No database required
[ ] LocalStorage works
[ ] Refresh preserves data
[ ] Task CRUD works
[ ] Project CRUD works
[ ] Board drag/drop works
[ ] Backlog works
[ ] Sprint functionality works
[ ] Calendar works
[ ] Timeline works
[ ] Search works
[ ] Filters work
[ ] Saved views work
[ ] Comments work
[ ] Activity history works
[ ] Dependencies work
[ ] Recurring tasks work
[ ] Time tracking works
[ ] Reports use real data
[ ] Import works
[ ] Export works
[ ] Dark mode works
[ ] Keyboard shortcuts work
[ ] Undo/redo works
[ ] Mobile layout works
[ ] No console errors
[ ] No dead buttons
[ ] No fake functionality
[ ] No data loss on refresh

============================================================
# 76. IMPORTANT FINAL INSTRUCTION
============================================================

Build the application as if it were a premium commercial
personal productivity product.

Prioritize:

FUNCTIONALITY
>
DATA INTEGRITY
>
UX
>
PERFORMANCE
>
VISUAL POLISH

Do not stop at a prototype.

Do not produce a simplified Todo application.

Build the complete TaskForge system described above.

Start with PHASE 1 and continue through all phases,
testing and fixing the application as you go.

At completion, provide:

1. Final file structure
2. Feature summary
3. Keyboard shortcut list
4. LocalStorage schema
5. Testing summary
6. Known limitations
7. Instructions for running index.html