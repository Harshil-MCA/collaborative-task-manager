# Collaborative Task Manager

Collaborative Task Manager is a React/Vite and Node.js/Express application for task delivery, project traceability, development workflow, QA execution, defect retesting, and release readiness. MongoDB/Mongoose stores users, work items, execution history, bugs, releases, and audit activity.

## Features

- JWT login and bcrypt password hashing.
- Safe public registration: every new account is created as `User`.
- Manager-controlled `Developer` and `QA Tester` role assignment with audit history.
- Tasks with assignment, status, priority, due dates, activity history, search, pagination, and CSV export.
- Projects, requirements, acceptance criteria, sprints, traceability, and readiness reporting.
- Guarded development stages, developer allocation, comments, blockers, time logs, and branch/PR/commit links.
- QA test cases and append-only Pass/Fail execution history.
- Failed-execution-linked bugs, Developer fix notes, validated HTTP(S) PR URLs, controlled retesting, reopening, and QA-only closure.
- Release creation, readiness checks, and QA approval.
- Loading, empty, error, and success states in the frontend.

Not implemented: WebSocket updates, drag-and-drop Kanban, file uploads, push notifications, hosted deployment, and a production browser automation suite.

## Role and permission matrix

| Role | Permissions |
|---|---|
| Manager | Manage users and supported roles, projects, requirements, sprints, tasks, assignments, releases, and delivery oversight. |
| Project Manager | Same protected advanced management operations as Manager, without changing Manager/Project Manager privileges. |
| Developer | Assigned tasks and assigned bugs only; guarded development updates, fix notes, and optional valid PR URLs. No QA closure or Manager controls. |
| QA Tester | Authorized QA projects, active test cases, execution history, failed-bug creation, and bugs in `Ready for Retest`. Can record retests; only QA can close after a passing retest. |
| User | Standard assigned-task workflow and permitted status/activity access. |

Backend authorization is authoritative. Frontend visibility is only a usability layer.

## Architecture

The frontend calls the Express API through Axios. JWT middleware loads the current User document on every authenticated request, so role changes take effect on the next request or login without encoding permissions in the token. Mongoose models and route-level ownership/role checks protect records.

Repository structure:

```text
backend/
  middleware/       JWT authentication and role authorization
  models/           User, Task, Activity, Project, Requirement, Sprint, QA, Bug, Release
  routes/           auth, task, project/QA/bug/release APIs
  test/             Node test runner and Supertest regression suite
  .env.example      Safe configuration template
frontend/
  src/              React application, API client, workspace, and styles
API_DOCUMENTATION.md
ARCHITECTURE.md
ASSESSMENT_AUDIT.md
MVP_MANUAL_TEST_CHECKLIST.md
DEMO_SCRIPT.md
```

## Prerequisites

- Node.js 20+ and npm.
- MongoDB Atlas or a local MongoDB instance.
- A modern browser.

## Configuration and setup

```powershell
cd backend
Copy-Item .env.example .env
```

Replace only the harmless placeholders in `backend/.env` with local or dedicated assessment values. Required runtime variables are `MONGODB_URI`, `JWT_SECRET`, and optionally `JWT_EXPIRES_IN` and `CLIENT_URL`. Seed variables are documented in `.env.example`; seed creates missing accounts only and never overwrites or deletes records.

Install and run the backend:

```powershell
cd backend
npm install
npm run seed       # optional; requires local SEED_* values
npm start
```

Run the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The default frontend API base URL is `http://localhost:5000/api`.

## Workflows

### Registration and role assignment

Public signup ignores privileged role requests and creates `User`. A Manager or Project Manager uses the User Management section to assign `User`, `Developer`, or `QA Tester`. Manager/Project Manager roles cannot be changed through that route, self-promotion is rejected, and each change is logged as activity. The next authenticated request reloads the role from MongoDB.

### Developer-to-QA defect workflow

1. QA records a failed execution from an active test case.
2. QA creates a bug linked to that failed execution; test case, requirement, and task links are derived server-side.
3. Manager assigns a registered Developer.
4. Developer moves `Assigned → In Progress`, submits required fix notes and an optional HTTP(S) PR URL, then moves `Fixed → Ready for Retest`.
5. QA records a retest. Fail reopens the bug; Pass closes it.

Closed bugs are intentionally excluded from the QA `Ready for Retest` queue. Therefore a QA list can correctly show no bugs after a passing retest and closure.

### Release readiness

Managers create releases. Readiness reports account for pending QA, reopened defects, unfinished sprint work, and required task sign-off. QA roles perform the protected approval operation.

## API groups

See `API_DOCUMENTATION.md` for request details. Main groups are:

- `/api/auth` — registration, login, and current-user profile.
- `/api/tasks` — MVP task dashboard, task CRUD, status, activity, and CSV export.
- `/api/projects`, `/api/requirements`, `/api/sprints` — delivery planning and traceability.
- `/api/advanced/users` — Manager/Project Manager user listing and supported role changes.
- `/api/qa` — QA queue, test cases, executions, and summaries.
- `/api/bugs` — failed-execution bug creation, Developer assignment/fix, status transitions, and QA retesting.
- `/api/releases` and `/api/reports/readiness` — release workflow and readiness reporting.

## Verification commands

Backend:

```powershell
cd backend
npm test
node --check server.js
node --check routes/advancedRoutes.js
node --check test/api.test.js
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

The backend suite uses Node's test runner, Supertest, and MongoDB Memory Server. It does not use the configured MongoDB database. Browser and live MongoDB verification must be reported separately; this workspace has not observed a live browser session.

## Security notes

- `.env`, `node_modules`, build output, logs, credentials, and local configuration are Git-ignored.
- Passwords are hashed and excluded from normal User queries.
- No route trusts frontend-only role or ownership claims.
- Do not run seed or migration commands against production without checking the target connection.

## Documentation

- `API_DOCUMENTATION.md` — implemented routes and authorization.
- `ARCHITECTURE.md` — service and data relationships.
- `ASSESSMENT_AUDIT.md` — requirement evidence and actual verification results.
- `MVP_MANUAL_TEST_CHECKLIST.md` — repeatable MVP and advanced browser checklist.
- `DEMO_SCRIPT.md` — short demonstration flow.

## AI tools

OpenAI Codex was used as a coding and audit assistant for repository inspection, implementation, regression tests, documentation, and verification. Reported automated results were executed in this workspace.
