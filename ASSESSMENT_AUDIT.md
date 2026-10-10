# Collaborative Task Manager — Assessment Audit

Audit date: 2026-10-10
Scope: repository source, assessment DOCX, package manifests, tracked files, static checks, frontend production build and lint.
Status meanings: COMPLETE, PARTIAL, MISSING, BROKEN, UNVERIFIED.

## Executive summary

The repository contains a focused Manager/User task-management MVP. The implementation is coherent at the source level: JWT authentication, bcrypt password hashing, backend authorization, task CRUD/status APIs, MongoDB/Mongoose persistence, separate activity records, rate limiting, a React/Vite UI, responsive CSS, dark mode, and loading/empty/error states are present.

The MVP is not fully verified end-to-end because no database-backed API demonstration or automated test suite is included/runnable from the repository. The frontend production build succeeds. Frontend lint fails at frontend/src/App.jsx:90 because the authentication-dependent effect synchronously resets state. The advanced assessment modules (projects, requirements, sprints, developer workflows, QA, bugs, release readiness and advanced reporting) are not implemented.

A local ignored backend/.env exists and contains a live-looking database connection value. Its contents are intentionally not reproduced here. It is ignored and not tracked, but any real credential in it should be rotated if it has ever been exposed or committed elsewhere, and a safe .env.example should be added.

## Repository and verification evidence

| Check | Result | Evidence |
|---|---|---|
| Assessment source | COMPLETE | Collaborative_Task_Manager_Assessment.docx was read in full. |
| Repository scope | COMPLETE | backend/ and frontend/ source, models, routes, manifests and README inspected. |
| Tracked secret check | PARTIAL | backend/.env is ignored and absent from git ls-files; local .env still contains a credential-bearing connection value. |
| Backend syntax | COMPLETE | node --check passed for server.js, auth middleware and both route files. |
| Frontend production build | COMPLETE | npm.cmd run build completed successfully. |
| Frontend lint | BROKEN | npm.cmd run lint reports react-hooks/set-state-in-effect at frontend/src/App.jsx:90. |
| Database/API integration | UNVERIFIED | No database-backed test or running API flow was available during the static audit. |
| Automated tests | MISSING | No test files or backend test script are tracked. |

## Mandatory Core MVP audit

| Requirement | Status | Evidence (file/API/model) | What is missing | Recommended fix | Priority |
|---|---|---|---|---|---|
| Signup and login | COMPLETE | backend/routes/authRoutes.js POST /api/auth/register and POST /api/auth/login; frontend/src/App.jsx auth form | Runtime flow not verified against MongoDB | Add API integration tests and document demo accounts | High |
| JWT authentication | COMPLETE | authRoutes.js signs JWT; middleware/auth.js verifies Bearer tokens; frontend/src/api.js attaches token | No refresh/revocation mechanism | Add short-lived access tokens plus refresh/revocation if required for production | Medium |
| Secure password handling | COMPLETE | bcrypt.hash(..., 12) on registration/manager creation; password select:false in User | No password reset/change flow | Add password lifecycle endpoints and tests | Medium |
| Session handling | PARTIAL | React restores JWT from localStorage via /api/auth/me; logout removes token | JWT remains client storage; no server-side session invalidation or expiry UX | Use secure cookie-based sessions or document JWT threat model; add expiry handling | Medium |
| Protected routes/API endpoints | COMPLETE | router.use(authenticateToken) in taskRoutes.js; /api/auth/me protected | No automated unauthorized-request tests | Add 401/expired-token tests | High |
| Manager/User roles | COMPLETE | User.role enum; public signup forces User; manager script creates Manager | Only two roles; advanced roles absent by design | Preserve these roles while adding advanced roles later | High |
| Backend authorization | COMPLETE | authorizeRoles("Manager"); ownership checks on status, edit, delete and activity | Status update permits a Manager and assigned User, which is broader than a strict User-only interpretation | Clarify/document manager status permission or tighten it and test both roles | High |
| Task creation | COMPLETE | POST /api/tasks; Task schema | No project/requirement/sprint links | Add validation tests and later relationships | High |
| Assignment | COMPLETE | Assignee validated as an existing User; manager-only create/edit | Assignment changes are not separately represented as an activity action | Emit explicit assignment history with old/new assignee | High |
| Editing | COMPLETE | PUT /api/tasks/:id; creator Manager ownership enforced | No field-level audit diff | Store changed fields in activity details | Medium |
| Deletion | COMPLETE | DELETE /api/tasks/:id; creator Manager ownership enforced; activity retained with task reference nulled | Deleted task cannot be navigated from history | Add a stable deleted-task snapshot/audit identifier | Medium |
| Status updates | COMPLETE | PATCH /api/tasks/:id/status; enum Pending, In Progress, Completed; activity logged | No formal transition policy; status can move freely | Define allowed transitions and test them | High |
| Relevant dates | PARTIAL | Task.dueDate, Mongoose timestamps and frontend date input | No start/completion date or explicit date semantics | Add start date, completion date and overdue calculation | Medium |
| User dashboard | COMPLETE | GET /api/tasks/dashboard filters by assignee; React renders assigned tasks/counts | No pagination/filtering | Add pagination and filters when volume requires | Medium |
| Manager dashboard | COMPLETE | Dashboard filters by createdBy; UI displays manager-created tasks and statuses | No team-wide analytics or workload view | Add advanced dashboard metrics as enhancement | Medium |
| Responsive React interface | COMPLETE | React/Vite app; App.css responsive breakpoints at 850/650/380px | Assessment specifically says Tailwind; interface is primarily custom CSS despite Tailwind packages/import | Either use Tailwind materially or document CSS choice | Medium |
| Dark mode | COMPLETE | darkMode state and .dark CSS theme; functional toggle in App.jsx | Preference is not persisted across refresh | Persist theme preference | Low |
| Form validation | PARTIAL | Client required inputs and server validation for name/email/password/task fields | Client validation is mostly HTML; no shared schema and no inline field errors | Add client schema validation and consistent server error mapping | Medium |
| Loading states | COMPLETE | loading/saving states in App.jsx; loading text and disabled submit | No request cancellation | Add abort handling for production polish | Low |
| Empty states | COMPLETE | Empty task panel with Manager/User-specific copy | No empty-user-list guidance beyond disabled submit | Add actionable manager guidance | Low |
| Error states | COMPLETE | Axios error mapping and error/success messages; backend error responses | Generic errors and no global error boundary | Add error boundary and structured request errors | Medium |
| Express REST APIs | COMPLETE | server.js, authRoutes.js, taskRoutes.js expose auth, dashboard, users, CRUD, status and activity endpoints | No OpenAPI/Postman artifact | Add API documentation | High |
| JWT middleware | COMPLETE | backend/middleware/auth.js | User lookup on every request; no disabled-user handling | Add indexes and account status if needed | Medium |
| Rate limiting | COMPLETE | express-rate-limit applied to /api/, 100 requests/15 minutes | One broad limiter; auth endpoints lack stricter limits | Add a stricter login/register limiter and production store | High |
| MongoDB/Mongoose models | COMPLETE | User, Task, Activity; Mongoose connection in server.js | No indexes explicitly declared beyond unique email; no advanced models | Add indexes based on query patterns | Medium |
| Separate activity logs | PARTIAL | Activity collection; creation, update, status and deletion records | Assignment is folded into creation/update text; no explicit assignment event; no activity API beyond per-task | Add explicit action types, old/new values and indexes | High |
| Complete MVP demonstration flow | UNVERIFIED | Code path exists: manager task creation, user task filter/status update, manager filter/activity endpoint | No observed live flow, test data or recorded walkthrough | Run with a safe database and add a written five-minute script | High |

## Advanced/bonus feature audit

The assessment explicitly treats these as enhancements. Their absence does not make the core MVP claim false, but they should not be advertised as implemented.

| Feature | Status | Evidence | What is missing / recommended fix | Priority |
|---|---|---|---|---|
| Projects | MISSING | No Project model, route or UI found | Add project model, ownership and APIs | Medium |
| Requirements/user stories | MISSING | No requirement model/routes/UI | Add requirement ID, description, acceptance criteria, priority, owner and status | Medium |
| Requirement links and traceability | MISSING | Task has no requirement/project reference; no QA models or coverage queries | Add relationships, coverage queries and missing-coverage reporting | Medium |
| Requirement workflow | MISSING | Task status only has three MVP values | Add guarded requirement state transitions | Medium |
| Sprints | MISSING | No Sprint model or API | Add sprint ID, goal, dates and Planned/Active/Closed state | Medium |
| Backlog/sprint assignment | MISSING | No sprint/backlog fields | Add task/requirement sprint references and carry-forward policy | Medium |
| Subtasks/priorities/deadlines/effort | PARTIAL | MVP task has priority and due date | No subtasks or effort estimates | Medium |
| Developer allocation/workload | MISSING | Only User assignees are supported | Add Developer role, allocation and workload aggregation | Medium |
| Developer/Project Manager roles | MISSING | User.role only allows Manager/User | Extend roles and backend permissions without breaking MVP | Medium |
| Development workflow | MISSING | Only Pending/In Progress/Completed | Add development states and transition authorization | High |
| Comments | MISSING | No comment model/API/UI | Add task-scoped comments with authorization | Low |
| Work-hour estimates/logs | MISSING | No time fields or endpoints | Add estimates and immutable work logs | Low |
| Blockers/ownership | MISSING | No blocker model/fields | Add blocker lifecycle and owner | Medium |
| Branch/PR/commit links | MISSING | No fields/routes/UI | Add validated link fields and history | Low |
| Assignment/stage history | PARTIAL | Generic activity collection exists | Does not capture structured old/new assignment/stage values | High |
| Development vs QA completion | MISSING | Completed is a single status | Add separate development and QA states | High |
| QA Tester role/work queue | MISSING | No QA role or queue | Add role, queue query and UI | High |
| Test cases and reuse | MISSING | No test-case model | Add reusable test-case definitions with all required fields | High |
| Test coverage reporting | MISSING | No QA coverage queries | Add requirement and sprint coverage counts | High |
| Ready-for-QA queue trigger | MISSING | No Ready for QA status | Add query/transition hook | High |
| Historical test execution | MISSING | No test-run model | Add append-only test runs with tester/build/environment/evidence | High |
| QA execution counts | MISSING | No QA data | Add requirement/sprint aggregation | Medium |
| Bug creation and lifecycle | MISSING | No Bug model/routes | Add linked bug creation, required fields and guarded Open→Closed/Reopened workflow | High |
| Developer fix notes/PR and QA closure | MISSING | No bug workflow | Enforce QA-controlled closure after pass | High |
| QA sign-off/release readiness | MISSING | No sign-off/release models | Add environment approval and readiness checks | High |
| Prevent invalid Done transitions | MISSING | No QA-required field or QA guard | Add backend transition rule checking passed tests/blockers | High |
| Advanced role dashboards | MISSING | Only three task counts; no Developer or QA views | Add Manager, Developer and QA dashboards | Medium |
| Graphs/burndown/velocity/time/defects | MISSING | No analytics implementation | Add aggregate endpoints and chart components | Low |
| WebSockets/Socket.IO | MISSING | No dependency or socket server | Add only after polling/API correctness is established | Low |
| Drag-and-drop Kanban | MISSING | No board or drag library | Add after formal workflow states exist | Low |
| Pagination/optimized querying | MISSING | Queries return unbounded arrays and no explicit indexes | Add page/limit validation, projections and indexes | Medium |
| Search/filters/dependencies/carry-forward | MISSING | No query filters or dependency fields | Add incrementally | Low |
| Notes/mentions/attachments/notifications/CSV | MISSING | No models/endpoints/UI | Add only after QA baseline | Low |
| Accessibility/mobile analytics | PARTIAL | Responsive CSS, labels and aria status label exist | No full accessibility audit or richer analytics | Medium |
| Automated API/unit tests | MISSING | No test files/scripts | Add authorization, transitions, QA rules and defect tests | High |
| Validation/error handling/security hardening | PARTIAL | Basic validation, CORS, body limit, rate limit and error responses exist | No central validation, stricter auth limiter, security headers, structured logging or integration tests | High |
| Reusable services/components | PARTIAL | Small route/model layout; single large App.jsx | Extract auth/task UI and backend services as features grow | Medium |
| Audit history | PARTIAL | Activity model covers MVP task events | Not structured enough for assignment/stage/QA history | High |
| Database indexes | PARTIAL | Unique email index is implied by schema | Add task/activity query indexes and verify with explain plans | Medium |
| Docker/live deployment | MISSING | No Dockerfile or deployment configuration | Add deployment artifacts only with real environment configuration | Low |
| Swagger/Postman docs | MISSING | No collection/OpenAPI file | Add OpenAPI or Postman collection | High |
| Seed data | MISSING | Manager creation script only; no safe sample dataset | Add idempotent seed script using environment-provided credentials | Medium |
| Architecture diagram | MISSING | No diagram found | Add Mermaid diagram to README or docs | Low |
| Regression/test plan/release report | MISSING | No artifacts found | Add after implementing advanced modules | Low |

## Working features to preserve

- Public signup creates only User accounts; Manager creation is kept out of public signup.
- bcrypt hashing and password exclusion from default User queries.
- JWT-protected /api/auth/me and task routes.
- Manager ownership isolation for listing, editing and deleting tasks.
- User assignment isolation for task listing and status updates.
- Task validation for title, description, assignee, status, priority and due date.
- Separate Activity documents retained when a task is deleted.
- Dashboard counts and task sorting by most recently updated.
- Responsive layout, dark mode, refresh/logout controls, loading, empty and error messages.
- Environment-based configuration and ignored .env files.

## Prioritized implementation plan

### Stage 0 — Audit and safety baseline

1. Keep this audit as the baseline.
2. Rotate any real credential found in the local environment file; do not commit it.
3. Add .env.example with placeholders only and correct README setup details.
4. Add backend test tooling and safe test database configuration.
5. Fix the lint failure without changing behavior.

### Stage 1 — MVP verification and hardening

1. Add authorization and validation tests for signup/login, ownership, status updates, deletion and activity visibility.
2. Add explicit assignment activity records and structured old/new values.
3. Add auth-specific rate limits, database indexes and API documentation.
4. Run the complete Manager → User → Manager demonstration against a safe database.

### Stage 2 — Advanced domain foundation

1. Add Project, Requirement, Sprint and expanded Task relationships.
2. Add Developer/Project Manager/QA Tester roles and backend permissions.
3. Add structured workflow transition history and prevent invalid transitions.

### Stage 3 — QA and defect controls

1. Add test-case definitions and historical test runs.
2. Add Ready for QA queue, bug lifecycle, retesting and QA-controlled closure.
3. Enforce QA-required Done rules transactionally at the backend boundary.
4. Add coverage, defect and release-readiness reports.

### Stage 4 — UX, reporting and delivery

1. Add role-specific dashboards, filters, pagination and workload metrics.
2. Add comments/time logs/links/attachments/notifications only where they support the assessment demo.
3. Add seed data, architecture diagram, deployment/docs artifacts and optional real-time/Kanban enhancements.

## Tests to run

### Existing checks

- cd frontend && npm.cmd run build — observed passing.
- cd frontend && npm.cmd run lint — observed failing at App.jsx:90.
- cd backend && node --check server.js routes/authRoutes.js routes/taskRoutes.js middleware/auth.js — observed passing.
- git status --short and secret scan before submission.

### Required new automated tests

- Register valid User; reject malformed input, duplicate email and public Manager role.
- Login valid/invalid credentials; reject missing, malformed and expired JWTs.
- Verify Manager-only create/edit/delete/user-list operations.
- Verify User cannot read another user’s tasks or mutate another user’s task.
- Verify Manager cannot mutate another Manager’s task.
- Verify assignment, status and deletion activity records and visibility.
- Verify all task field validation and allowed status transitions.
- Verify rate-limit behavior on repeated auth/API requests.
- If advanced modules are implemented: role matrix, requirement/sprint transitions, QA queue, historical retesting, bug reopen/closure and QA-required Done guard.

## Submission checklist

- [ ] GitHub repository contains source code and a clear structure.
- [ ] README states actual implemented features and clearly separates MVP from enhancements.
- [ ] README includes prerequisites, setup, environment variables and safe sample roles/logins without real passwords.
- [ ] .env, database credentials, JWT secrets, passwords, node_modules and build output are not committed.
- [ ] Add .env.example with placeholders and verify the tracked-file list.
- [ ] Document all implemented API endpoints and database models.
- [ ] Add Postman or Swagger documentation.
- [ ] Add an idempotent safe seed command if sample data is expected.
- [ ] Add a five-minute written demo script covering Manager login, task assignment, User status update and Manager activity verification.
- [ ] Describe AI tools used and their role, as requested by the assessment.
- [ ] Run backend automated tests, frontend lint/build and any available end-to-end tests; report actual results.
- [ ] Record all unverified behavior and any intentionally unimplemented advanced feature.
- [ ] Never include real credentials in README, screenshots, commits or the final report.

## Audit conclusion

The project is a credible MVP implementation but should currently be presented as “MVP implemented, integration and automated verification pending; advanced workflows not implemented.” The highest-value next work is testable MVP hardening and documentation, followed by the QA/domain foundation only if the assessment submission needs advanced-feature credit.

## Stage 0 implementation update

Stage 0 was implemented without adding advanced domain modules or changing production database data.

### Files changed or added

| File | Change |
|---|---|
| frontend/src/App.jsx | Removed redundant synchronous state resets from the unauthenticated data-loading effect. Existing logout behavior still clears task state, counts and users. |
| backend/server.js | Exported the Express app and guarded server startup with require.main so API tests can import the app without opening a production listener. |
| backend/package.json | Added test and seed scripts plus Supertest and MongoDB Memory Server development tooling. |
| backend/.env.example | Added harmless placeholders only; no real connection strings, secrets or passwords. |
| backend/seed.js | Added idempotent manager/user seed tooling. It creates missing users only and never updates, deletes or overwrites existing records. |
| backend/test/api.test.js | Added four API tests for registration/RBAC, authentication failures, task ownership/status authorization and activity-history authorization. |
| MVP_MANUAL_TEST_CHECKLIST.md | Added repeatable Manager → User → Manager demonstration and authorization checklist. |

The local ignored backend/.env was not copied or modified. No production database operation was run. No commit or push was performed.

### Stage 0 verification results

| Command/check | Result |
|---|---|
| cd backend && npm.cmd test | PASS — 4 tests passed, 0 failed, 0 skipped. Tests used MongoDB Memory Server and did not contact the configured database. |
| cd frontend && npm.cmd run lint | PASS — no ESLint errors. |
| cd frontend && npm.cmd run build | PASS — Vite production build completed. |
| Backend node --check for server, seed, test, auth routes, task routes and middleware | PASS. |
| Git exclusion check | PASS — local backend/.env, backend/node_modules, frontend/node_modules and frontend/dist are ignored and no matching tracked files were reported. |
| Secret scan of tracked source | PASS — no database URI, JWT secret or password value was added to tracked source. |
| Manual MVP browser flow | NOT RUN — requires a deliberate local MongoDB/manual browser session; use MVP_MANUAL_TEST_CHECKLIST.md. |

### Remaining Stage 0 note

The backend package-lock.json was updated with the new test dependencies. npm.cmd ci --dry-run --ignore-scripts --offline --no-audit --no-fund also completed successfully, confirming the lockfile is internally usable without changing installed files.

## Full assessment implementation update

The following advanced phases were implemented after the original audit:

| Phase | Result | Evidence |
|---|---|---|
| Projects and requirements | IMPLEMENTED | models/Project.js, models/Requirement.js and advancedRoutes.js; project access, requirement fields, guarded workflow, task linking and missing test coverage response |
| Sprint planning | IMPLEMENTED | models/Sprint.js and advancedRoutes.js; date validation, Planned/Active/Closed states, unfinished-task closure check and carry-forward endpoint |
| Developer workflows | IMPLEMENTED | expanded User and Task models; guarded development-stage transitions, developer allocation, comments, time logs, blockers and code links |
| QA test cases | IMPLEMENTED | models/TestCase.js, QA routes and AdvancedWorkspace.jsx |
| QA execution/history | IMPLEMENTED | models/TestExecution.js; append-only executions, status/environment validation, QA queue and summary endpoint |
| Bug tracking/retesting | IMPLEMENTED | models/Bug.js; failed-execution creation, assignment, developer fix, reopen and QA-only passing-retest closure |
| QA sign-off/release readiness | IMPLEMENTED | models/Release.js, QA-required Done guard, environment approvals and readiness report |
| Dashboards/reports | PARTIAL | AdvancedWorkspace.jsx and reports/dashboard plus reports/readiness provide real project/task/QA/readiness metrics; burndown/velocity charts are not yet visualized |
| Productivity/technical enhancements | PARTIAL | Pagination/search, CSV export, sprint carry-forward, indexes, validation, audit history and auth rate limiter implemented; Socket.IO, drag-and-drop Kanban, uploads and notifications remain absent |
| API/submission materials | IMPLEMENTED | README.md, API_DOCUMENTATION.md and DEMO_SCRIPT.md |

### Additional verification

- Backend suite: PASS — 5 tests passed, including project/requirement/sprint setup, guarded development transitions, QA-required Done protection, failed-test-to-bug flow, failed retest reopening, passing retest closure, CSV export and dashboard reporting.
- Frontend lint: PASS.
- Frontend production build: PASS.
- Backend syntax checks: PASS for all models, routes, seed script, server and tests.
- No production database operation was run.
- Browser-based verification remains UNVERIFIED because no local server/browser session was observed by the agent.

### Remaining honest limitations

- Socket.IO real-time updates, drag-and-drop Kanban, attachment storage, notifications, full chart visualizations and hosted deployment are not implemented.
- The advanced UI is intentionally compact: it provides project/requirement/sprint creation, QA test-case/execution controls, bug visibility and release approval, while the complete API remains available for deeper workflows.
- Developers discover projects through ownership/membership or assigned tasks/bugs. QA Testers discover projects with active test cases or bugs ready for retest; backend checks remain authoritative.
- The manual MVP and advanced demonstrations still need to be run in a browser using local or dedicated assessment data.

## Bug creation failure fix

Verified reproduction:

1. The QA Fail button successfully called POST /api/qa/executions and received an execution record.
2. frontend/src/AdvancedWorkspace.jsx did not copy response.data.execution._id into bugForm.testExecution.
3. Clicking Create bug therefore sent an empty testExecution value.
4. The bug route passed that value to TestExecution.findOne as the MongoDB _id.
5. Mongoose raised a CastError: Cast to ObjectId failed for value "" at path "_id" for model "TestExecution", which caused the observed generic HTTP 500.

Fix:

- The frontend now stores the returned failed execution ID in the bug form.
- The backend rejects missing or malformed execution IDs with HTTP 400 before querying.
- The backend validates required bug fields, severity and priority.
- Bug links are derived from the verified failed execution's populated test case, requirement and task rather than trusting browser-supplied relationship IDs.
- Invalid Mongoose validation/cast input returns HTTP 400; project access returns HTTP 403; duplicate bug IDs return HTTP 409.
- Existing records and production data were not modified.

Regression verification:

- The existing failed-execution → bug → developer-fix → failed-retest/reopen → passing-retest/close test now also checks the four persisted links.
- The same test verifies an empty execution ID returns HTTP 400 instead of HTTP 500.
- Backend tests: PASS — 5 passed, 0 failed.
- Frontend lint: PASS.
- Frontend production build: PASS.
- Backend syntax checks: PASS.

## Bug management workflow controls

Developer assignment was traced and fixed. The backend now returns only registered Developer accounts from `/api/advanced/users`; the frontend no longer silently filters a mixed-role response and shows loading, empty, retry/error, and success states. Assignment validates both IDs, enforces Manager/Project Manager authorization, persists `assignedDeveloper`, and sets status to `Assigned` only after a valid Developer assignment succeeds. Regression coverage verifies eligible-user listing, persistence, unauthorized assignment rejection, and invalid Developer ID handling.

The Bugs tab previously rendered only a read-only summary card. It now uses the existing protected bug APIs to show linked execution/test-case/requirement/task details and provide role-appropriate controls:

- Managers and Project Managers can assign/reassign registered Developers and request valid status transitions.
- Assigned Developers can start work and submit fix notes plus pull-request URLs.
- QA roles can run Pass/Fail retests; a passing retest closes the bug, while a failed retest reopens it.
- Backend transition and role checks remain authoritative, so direct requests cannot bypass lifecycle rules.
- Bug responses now populate the related developer, requirement, task, test case and failed execution for the UI.

Regression coverage now includes unauthorized updates, invalid direct closure, failed-retest closure rejection, assignment/status history and successful QA closure.

Verification for this fix:

- Backend tests: PASS — 5 passed, 0 failed.
- Frontend lint: PASS.
- Frontend production build: PASS.
- Backend syntax checks: PASS.
- Browser/manual verification: UNVERIFIED; use the checklist below with a real Manager, Developer and QA account.

## Developer account role diagnosis and migration

The User model permits `Manager`, `Project Manager`, `Developer`, `QA Tester` and `User`. Public registration deliberately writes `role: "User"`; therefore an existing account can log in and own tasks without being eligible for bug assignment. The developer endpoint returns only explicit `Developer` roles and never treats all Users as Developers. A manager-only promotion endpoint now changes an existing `User` account to `Developer` without creating an account or modifying task/history records. The Bugs tab exposes this migration only when no Developer accounts are available, with loading, empty and retry/error states.

The configured MongoDB service was unavailable during this run, so the stored role for the live `harshil` account could not be queried without fabricating a result. The automated in-memory MongoDB regression suite verifies role filtering, promotion authorization, persisted role change, bug assignment authorization, and assignment persistence when bugs are reloaded.

The transition error was traced to the Bugs UI offering every status in a single select. From `Assigned`, the valid Developer action is only `In Progress`; direct `Fixed`/`Closed` requests correctly returned `400 Invalid bug transition`. The UI now exposes role/state-specific actions, and fix submission follows `In Progress → Fixed → Ready for Retest`. Backend errors now distinguish invalid transitions from unauthorized status changes.

Developer bug access is now scoped to the authenticated Developer's `assignedDeveloper` records. Developer project visibility also includes projects containing their assigned tasks or bugs, while the frontend exposes only a Bugs tab and never renders manager assignment/promotion controls. Fix notes are required and optional PR links must be valid HTTP(S) URLs; QA-controlled closure remains unchanged.

The project-load path now preserves the server/API error detail instead of masking it. Developer visibility is regression-tested when the Developer is not a project member but has assigned task/bug records. Bug task population remains `populate("task", "title developmentStage")`; the UI now reports `Not linked or task record unavailable` when MongoDB returns no populated task, rather than inventing a task link. Existing records are not modified.

Verification for Developer bug access:

- Backend tests: PASS — 5 passed, 0 failed, including Developer bug listing, assigned-Developer authorization, invalid PR URL validation, and the complete fix/retest/closure workflow.
- Frontend lint: PASS.
- Frontend production build: PASS.
- Backend syntax checks: PASS.
- Browser verification: UNVERIFIED; no live browser session was used.

Manager role management is now covered by the same protected user API: public registration remains `User`, Managers/Project Managers can assign only `User`, `Developer`, or `QA Tester`, privileged roles cannot be changed through this route, self-promotion is rejected, and every role change is written to `Activity`. The frontend User Management section is rendered only for Manager/Project Manager sessions.

QA workspace access was fixed at the backend visibility layer. A QA Tester can now see projects containing active test cases or bugs in `Ready for Retest` even without project membership. The same project authorization is applied to QA queues and test-case retrieval; QA execution and bug retesting continue to require QA roles, while Developer fix controls remain Developer-only.

QA access verification:

- Backend tests: PASS — 5 passed, 0 failed, including QA project visibility without membership and authorized test-case retrieval.
- Frontend lint: PASS.
- Frontend production build: PASS.
- Backend syntax checks: PASS.
- Browser verification: UNVERIFIED; no live browser session was used.

QA bug visibility is restricted to authorized projects and `Ready for Retest` bugs; Developers remain restricted to their assigned bugs and Manager/Project Manager controls remain protected.

Updated verification:

- Backend tests: PASS — 5 passed, 0 failed.
- Frontend lint: PASS.
- Frontend production build: PASS.
- Backend syntax checks: PASS.

The first promotion test run exposed and fixed a schema compatibility issue: the Activity entity type enum did not include `User`, so role-change audit logging returned HTTP 500. `User` is now a supported audited entity type.
