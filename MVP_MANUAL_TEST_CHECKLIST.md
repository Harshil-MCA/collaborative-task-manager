# Manual Verification Checklist

Use local MongoDB or a dedicated assessment database only. Keep credentials in ignored `backend/.env`.

## Preparation

- [ ] Start MongoDB and confirm `GET /api/health` reports `database: connected`.
- [ ] Start backend: `cd backend && npm.cmd start`.
- [ ] Start frontend: `cd frontend && npm.cmd run dev`.
- [ ] Have Manager, User, Developer, and QA Tester accounts in the dedicated database.

## MVP Manager/User flow

- [ ] Manager logs in and sees the task dashboard.
- [ ] Manager creates and assigns a task to a registered User.
- [ ] User logs in and sees only assigned tasks.
- [ ] User changes status to `In Progress`, then `Completed`.
- [ ] Manager verifies the updated status and activity history.
- [ ] Confirm a non-participant cannot read the task's activity history.

## Automatic role/workspace flow

- [ ] Register a new account and confirm it receives `User`, even if a privileged role is submitted.
- [ ] Manager opens User Management and assigns `Developer` or `QA Tester` to an existing account.
- [ ] Confirm Manager/Project Manager roles cannot be changed and self-promotion is unavailable.
- [ ] Log out/in as the changed account and confirm the role-specific workspace appears.

## Developer-to-QA bug flow

- [ ] Manager creates/uses a project task and assigns a registered Developer.
- [ ] QA records a failed execution and creates a linked bug.
- [ ] Manager assigns the bug to the Developer.
- [ ] Developer sees only assigned bugs, starts work, enters fix notes, and optionally enters a real HTTP(S) PR URL.
- [ ] Developer moves the bug through `In Progress → Fixed → Ready for Retest`.
- [ ] Confirm Developer cannot assign users, change roles, or close bugs.
- [ ] QA sees the bug in `Ready for Retest`, records Fail, and confirms `Reopened`.
- [ ] Developer fixes it again and sends it to retest.
- [ ] QA records Pass and confirms `Closed`.
- [ ] Confirm the closed bug is absent from the QA `Ready for Retest` list. This is expected behavior.

## QA access without task assignment

- [ ] Use a QA Tester who is not a project member and has zero assigned tasks.
- [ ] Confirm projects with active test cases or ready-for-retest bugs appear in Delivery Workspace.
- [ ] Confirm the QA Tester can open `SMS-TC-001`, execute Pass/Fail, and access `SMS-BUG-001` when ready for retest.
- [ ] Confirm unrelated projects and non-ready bugs are not exposed.

## Evidence and limitations

- [ ] Capture `/api/health`, relevant UI states, and test output.
- [ ] Record whether this checklist was run against local, dedicated, or production data. Never use production for assessment testing.
- Automated tests do not replace this browser checklist. Do not report browser or live MongoDB verification unless actually observed.
