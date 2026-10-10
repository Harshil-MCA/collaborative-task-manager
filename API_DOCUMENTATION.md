# API Documentation

Base URL: http://localhost:5000/api

Protected endpoints use the HTTP header Authorization: Bearer <JWT>.

## Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | /auth/register | Public | Register a User |
| POST | /auth/login | Public | Return JWT and public profile |
| GET | /auth/me | Authenticated | Return current profile |

## MVP tasks

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | /tasks | Authenticated | Role-filtered task list; page, limit, search and status query support |
| GET | /tasks/dashboard | Authenticated | Role-filtered counts and tasks |
| GET | /tasks/users | Manager | List User assignees |
| POST | /tasks | Manager | Create and assign an MVP task |
| PUT | /tasks/:id | Owning Manager | Edit task |
| PATCH | /tasks/:id/status | Assigned User or owning Manager | Update MVP status |
| DELETE | /tasks/:id | Owning Manager | Delete task while preserving activity |
| GET | /tasks/:id/activity | Task participant | Read task activity |
| GET | /tasks/export.csv | Authenticated | Export role-visible tasks |

## Projects, requirements and sprints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | /projects | Authenticated | List accessible projects; Developers use assigned tasks/bugs and QA uses active test cases/ready-for-retest bugs |
| POST | /projects | Manager/Project Manager | Create project |
| GET | /projects/:id | Project member/manager or authorized QA project | Project detail, tasks, requirements and sprints |
| PUT | /projects/:id | Project owner manager | Edit project |
| GET | /requirements?project=:id | Project member | Requirements and missing coverage |
| POST | /requirements | Manager/Project Manager | Create requirement |
| PATCH | /requirements/:id/status | Manager/Project Manager | Guarded requirement transition |
| POST | /requirements/:id/link-task | Manager/Project Manager | Link development task |
| GET | /sprints?project=:id | Project member | List sprints |
| POST | /sprints | Manager/Project Manager | Create sprint |
| PATCH | /sprints/:id/state | Manager/Project Manager | Change state; closure checks unfinished tasks |
| POST | /sprints/:id/carry-forward | Manager/Project Manager | Move unfinished sprint tasks to backlog |

## Development workflow

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| PATCH | /tasks/:id/allocation | Manager/Project Manager | Set project, requirement, sprint, developer, effort, QA and code links |
| PATCH | /tasks/:id/workflow | Delivery participant | Guarded development transition |
| POST | /tasks/:id/comments | Delivery/QA role | Add progress comment |
| POST | /tasks/:id/time | Delivery role | Add immutable work-hour log |

## QA and bugs

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | /qa/queue | QA/manager role | List authorized-project tasks Ready for QA |
| GET | /qa/test-cases | QA/manager role | List test cases in authorized projects |
| POST | /qa/test-cases | QA/manager role | Create reusable test case |
| PUT | /qa/test-cases/:id | QA/manager role | Edit/deactivate test case |
| GET | /qa/executions | QA/manager role | Historical execution records |
| POST | /qa/executions | QA/manager role | Append execution result |
| GET | /qa/summary | QA/manager role | Status counts |
| GET | /bugs | Authenticated/project-scoped | List visible defects |
| POST | /bugs | QA/manager role | Create from failed execution |
| PATCH | /bugs/:id/assign | Manager/Project Manager | Assign Developer |
| PATCH | /bugs/:id/status | Assigned Developer or QA | Guarded bug transition |
| PUT | /bugs/:id/fix | Assigned Developer | Record required fix notes/optional HTTP(S) PR URL and move to Fixed |
| PATCH | /bugs/:id/status | Assigned Developer | Move Fixed to Ready for Retest after fix |
| POST | /bugs/:id/retest | QA/manager role | Append retest; pass closes, fail reopens |

Execution statuses are Not Run, Pass, Fail and Blocked. Environments are Dev, QA, Staging and Production. Bug closure requires QA and a passing retest.

## Releases and reports

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | /releases?project=:id | Project member | List releases |
| POST | /releases | Manager/Project Manager | Create release version |
| PATCH | /releases/:id/approve | QA/manager role | Record environment approval |
| GET | /reports/readiness?project=:id | Project member | Pending QA, reopened defects and unfinished sprint checks |
| GET | /reports/dashboard?project=:id | Authenticated | Real task stage/workload/overdue/blocker/defect aggregates |
| GET | /advanced/users | Manager/Project Manager | List registered Developer accounts without passwords |
| GET | /advanced/users?mode=all | Manager/Project Manager | List registered users and roles without passwords |
| GET | /advanced/users?mode=promotion | Manager/Project Manager | List User accounts eligible for promotion |
| PATCH | /advanced/users/:id/role | Manager/Project Manager | Assign User, Developer or QA Tester; protects privileged roles and self-promotion |
| PATCH | /advanced/users/:id/promote-developer | Manager/Project Manager | Safe legacy promotion of an existing User account |
