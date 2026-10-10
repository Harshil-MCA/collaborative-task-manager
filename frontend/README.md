# TaskFlow – Collaborative Task Manager

A full-stack task management application built with React, Node.js, Express, and MongoDB Atlas. TaskFlow enables managers to create and assign tasks, while users can view their assignments and update their progress.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [User Roles](#user-roles)
5. [Application Architecture](#application-architecture)
6. [Project Structure](#project-structure)
7. [Prerequisites](#prerequisites)
8. [Installation and Setup](#installation-and-setup)
9. [Environment Variables](#environment-variables)
10. [Running the Application](#running-the-application)
11. [API Documentation](#api-documentation)
12. [Database Models](#database-models)
13. [Testing the Application](#testing-the-application)
14. [Security](#security)
15. [Troubleshooting](#troubleshooting)
16. [Future Enhancements](#future-enhancements)

## 1. Project Overview

TaskFlow is a full-stack collaborative task management system designed to organize work, assign responsibilities, and monitor task progress.

The application provides role-based access for Managers and Users. Managers can create tasks and assign them to registered users. Users can view their assigned tasks and update their status. Task information is stored in MongoDB Atlas so that it persists across browser sessions and application restarts.

The system also records important task-related activities, including task creation, updates, status changes, and deletion.

## 2. Features

### Authentication and Authorization
- User registration and login.
- Password hashing using bcrypt.
- JSON Web Token (JWT) authentication.
- Protected API endpoints.
- Role-based access control.

### Task Management
- Create tasks with a title and description.
- Assign tasks to registered users.
- Set task priority and optional due date.
- Edit and delete tasks.
- Track task status.
- Display tasks based on the authenticated user's role.

### Dashboard
- Display total task count.
- Show tasks currently in progress.
- Show completed tasks.
- Provide task refresh functionality.
- Display empty states and success or error messages.

### User Experience
- Responsive React interface.
- Light and dark mode.
- Task creation and editing forms.
- Confirmation before deleting tasks.
- Status selection controls.

### Activity Logging
- Record account registration events.
- Record task creation, editing, deletion, and status changes.
- Store the actor, action, task title, and relevant details.

## 3. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Styling | CSS |
| Backend | Node.js |
| API framework | Express.js |
| Database | MongoDB Atlas |
| Database ODM | Mongoose |
| Authentication | JSON Web Tokens |
| Password security | bcryptjs |
| API security | express-rate-limit |
| Cross-origin requests | CORS |
| Configuration | dotenv |
| Development | Nodemon |
| Version control | Git and GitHub |

## 4. User Roles

### Manager

A Manager can:
- Log in to the application.
- View tasks created by that manager.
- Create and assign tasks to registered Users.
- Edit task details.
- Change task status.
- Delete tasks created by that manager.
- Monitor task progress.
- Review activity history for authorized tasks.

### User

A User can:
- Register an account and log in.
- View tasks assigned to them.
- Update the status of their assigned tasks.
- Track their own task progress.

Authorization is enforced by the backend API, not only by the frontend interface.

## 5. Application Architecture

The application follows a client-server architecture.

1. The React frontend provides the user interface.
2. The frontend sends HTTP requests to the Express REST API.
3. JWT authentication identifies the current user.
4. Backend middleware checks authentication and role permissions.
5. Mongoose communicates with MongoDB Atlas.
6. The API returns JSON responses to the frontend.
7. The frontend updates the dashboard using the returned data.

**Data flow:**

React Frontend → Express REST API → Authentication and Authorization → Mongoose → MongoDB Atlas

## 6. Project Structure

```text
new/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Task.js
│   │   └── Activity.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── taskRoutes.js
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── server.js
│   ├── createManager.js
│   └── resetManagerPassword.js
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── public/
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

*Note: The structure above describes the expected project layout. Keep only files and folders that actually exist in your repository.*

## 7. Prerequisites

Install the following before running the application:

- Node.js and npm.
- Git.
- A MongoDB Atlas account and database cluster.
- A code editor such as Visual Studio Code.
- A modern web browser.

## 8. Installation and Setup

### Step 1: Clone the Repository

After uploading the project to GitHub, clone it using:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

Replace the placeholders with your actual repository URL and folder name.

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure the Backend

Create a `.env` file inside the `backend` directory. See the Environment Variables section below.

Ensure MongoDB Atlas allows connections from your development machine and the database user has the necessary permissions.

### Step 4: Install Frontend Dependencies

Open another terminal from the project root:

```bash
cd frontend
npm install
```

### Step 5: Configure the Frontend API URL

Open `frontend/src/api.js` and verify that the API base URL points to the running backend:

```text
http://localhost:5000/api
```

Use the actual configuration format expected by your existing `api.js` file.

## 9. Environment Variables

Create `backend/.env` with your own configuration:

```env
PORT=5000
MONGODB_URI=YOUR_MONGODB_ATLAS_CONNECTION_STRING
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
```

Replace the placeholder values with valid settings.

- `PORT`: Port on which the Express server runs.
- `MONGODB_URI`: MongoDB Atlas connection string.
- `JWT_SECRET`: A long, unpredictable secret used to sign JWTs.
- `JWT_EXPIRES_IN`: Token expiration duration.
- `CLIENT_URL`: Allowed frontend origin for CORS.

Never commit `.env` files, database passwords, JWT secrets, or authentication tokens to GitHub.

## 10. Running the Application

Run the backend and frontend in separate terminals.

### Terminal 1 – Backend

From the project root:

```bash
cd backend
npm run dev
```

If the backend's `package.json` does not define a `dev` script, use the available script or run:

```bash
node server.js
```

The backend should start at:

`http://localhost:5000`

### Terminal 2 – Frontend

From the project root:

```bash
cd frontend
npm run dev
```

Open the URL displayed by Vite, usually:

`http://localhost:5173`

### Verify the Backend

Open the following URL in your browser:

`http://localhost:5000/api/health`

A healthy response should indicate that the API is running and the database is connected.

## 11. API Documentation

The following endpoints describe the intended API routes. Request bodies and response details should be checked against the implemented route files.

### Authentication

Base path: `/api/auth`

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/register` | Register a new User | Public |
| POST | `/login` | Authenticate a user | Public |
| GET | `/me` | Get the authenticated user's profile | Authenticated |

Registration accepts the user's name, email, and password. The server hashes the password before saving the account.

Login returns a JWT and the user's public profile.

### Tasks

Base path: `/api/tasks`

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/` | List tasks visible to the current user | Authenticated |
| GET | `/dashboard` | Retrieve dashboard statistics and task data | Authenticated |
| GET | `/users` | List registered Users for task assignment | Manager |
| POST | `/` | Create and assign a task | Manager |
| PATCH | `/:id/status` | Update task status | Authorized task participant |
| PUT | `/:id` | Edit task details | Manager |
| GET | `/:id/activity` | Retrieve task activity history | Authorized task participant |
| DELETE | `/:id` | Delete a task | Manager |

### Authentication Header

Protected requests use a bearer token:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Do not publish or share real authentication tokens.

### Example Task Object

```json
{
  "title": "Prepare project report",
  "description": "Complete, review, and submit the project report",
  "status": "Pending",
  "priority": "High",
  "dueDate": null
}
```

The API associates tasks with a creator and an assignee using database user IDs. Valid status values are `Pending`, `In Progress`, and `Completed`. Valid priority values are `Low`, `Medium`, and `High`.

## 12. Database Models

The application uses MongoDB collections managed through Mongoose.

### User

Stores account information, including:
- Name.
- Email address.
- Hashed password.
- Role (`Manager` or `User`).
- Creation and update timestamps.

### Task

Stores task information, including:
- Title and description.
- Assigned user.
- Manager who created the task.
- Status and priority.
- Optional due date.
- Creation and update timestamps.

### Activity

Stores task-related audit events, including:
- Task reference, where applicable.
- User who performed the action.
- Action type.
- Description of the event.
- Task title.
- Creation and update timestamps.

MongoDB Atlas stores the application data persistently. Collections are created as required when documents are saved.

## 13. Testing the Application

Use the following manual workflow to verify the main features.

### Test 1: Manager Login

1. Start the backend and frontend.
2. Open the application.
3. Log in using a configured Manager account.
4. Verify that the Manager dashboard appears.

### Test 2: Create a Task

1. Click **New Task**.
2. Enter a title and description.
3. Select a registered User.
4. Choose a priority and optional due date.
5. Save the task.
6. Confirm that the task appears in the Manager dashboard.

### Test 3: User Login

1. Log out of the Manager account.
2. Log in using the assigned User account.
3. Confirm that the assigned task appears on the User dashboard.

### Test 4: Update Task Status

1. Change the task status to `In Progress`.
2. Confirm that the application displays a success message.
3. Verify that the dashboard statistics change.
4. Log in as the Manager and refresh the dashboard.
5. Confirm that the updated status is visible.

### Test 5: Edit and Delete

1. Log in as the Manager.
2. Edit a task and save the changes.
3. Verify that the changes persist.
4. Delete the task after confirming the deletion prompt.
5. Verify that the task no longer appears.

### Test 6: Verify Database Persistence

Open MongoDB Atlas Data Explorer and inspect the database and collections used by the application.

Confirm that:
- Registered users are stored in `users`.
- Created tasks are stored in `tasks`.
- Activity records are stored in `activities`.
- Task changes persist after refreshing the frontend.

### Test 7: Verify Authorization

Use separate Manager and User accounts to test access restrictions. Confirm that users cannot access Manager-only task creation, editing, or deletion operations through direct API requests.

## 14. Security

The application includes the following security measures:

- Password hashing with bcrypt.
- JWT-based authentication.
- Protected routes and API endpoints.
- Role-based authorization.
- Backend validation of incoming data.
- Rate limiting for API requests.
- CORS configuration.
- Restricted task access based on the authenticated user.
- Environment variables for sensitive configuration.

Security checks must be enforced on the backend because frontend restrictions alone do not prevent unauthorized API requests.

## 15. Troubleshooting

### MongoDB Connection Error

- Verify the MongoDB Atlas connection string.
- Confirm the database username and password.
- Check Atlas network access settings.
- Confirm that the cluster is available.

### Frontend Cannot Reach Backend

- Confirm that the backend is running on port `5000`.
- Verify the API base URL in `frontend/src/api.js`.
- Check the browser console and Network tab.
- Confirm the backend's CORS origin matches the frontend URL.

### Login Fails

- Verify the email and password.
- Confirm the account exists in the database.
- Check that `JWT_SECRET` is configured.
- Inspect the backend terminal for errors.

### Tasks Do Not Appear

- Confirm that the correct account is logged in.
- Check the task's creator and assignee IDs.
- Refresh the dashboard.
- Inspect the API response and MongoDB `tasks` collection.

### Frontend Build Errors

Run these commands from the frontend directory:

```bash
npm install
npm run build
```

Resolve any reported errors before deployment.

## 16. Future Enhancements

Potential improvements include:
- Email notifications for task assignments.
- Search, sorting, and filtering.
- Pagination for large task lists.
- Due-date reminders.
- Team-based workspaces.
- Automated unit and integration tests.
- Deployment to a production hosting platform.
- A downloadable task activity report.

## Author

Developed as a full-stack collaborative task management project.

## AI Usage Disclosure

AI assistance was used during development for guidance, code troubleshooting, documentation, and implementation support. The final repository should accurately describe which parts were AI-assisted and which parts were implemented, reviewed, and tested by the developer.

## License

Add a license if you intend to distribute this project publicly. Otherwise, specify the applicable terms for your repository.
