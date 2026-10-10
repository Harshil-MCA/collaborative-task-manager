# Architecture and Relationships

The application is split into a React/Vite client, an Express/Mongoose API and MongoDB collections.

    Browser -> Axios/JWT -> Express routes -> JWT/RBAC middleware -> Mongoose -> MongoDB

Domain relationships:

    Project 1--many Requirement
    Project 1--many Sprint
    Requirement 1--many Task
    Requirement 1--many TestCase
    TestCase 1--many TestExecution
    TestExecution 0--many Bug
    Task 0--many Bug
    Project 1--many Release
    All domain changes 1--many Activity

The backend is the source of truth for ownership, role permissions, workflow transitions, QA-required Done validation, bug closure and release readiness.
