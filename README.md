\# Collaborative Task Manager



A full-stack task management application that allows Managers to create, assign, update, and track tasks while Users manage their assigned work.



\## Features



\- User registration and login

\- JWT-based authentication

\- Role-based access for Managers and Users

\- Create, assign, edit, and delete tasks

\- Update task status

\- Dashboard with task statistics

\- Activity history for task actions

\- MongoDB Atlas database integration

\- Responsive React interface with dark mode



\## Technology Stack



\*\*Frontend:\*\* React, Vite, CSS, Axios  

\*\*Backend:\*\* Node.js, Express.js  

\*\*Database:\*\* MongoDB Atlas, Mongoose  

\*\*Authentication:\*\* JWT and bcrypt



\## Project Structure



```text

collaborative-task-manager/

├── backend/

│   ├── middleware/

│   ├── models/

│   ├── routes/

│   ├── server.js

│   └── package.json

├── frontend/

│   ├── src/

│   └── package.json

├── .gitignore

└── README.md

```



\## Prerequisites



\- Node.js and npm

\- A MongoDB Atlas account or accessible MongoDB database

\- Git



\## Setup



\### 1. Clone the repository



```bash

git clone YOUR\_GITHUB\_REPOSITORY\_URL

cd collaborative-task-manager

```



\### 2. Configure the backend



```bash

cd backend

npm install

```



Create a `.env` file inside `backend/` with these variables:



```env

PORT=5000

MONGODB\_URI=your\_mongodb\_connection\_string

JWT\_SECRET=your\_long\_random\_secret

JWT\_EXPIRES\_IN=1d

CLIENT\_URL=http://localhost:5173

MANAGER\_NAME=Your Manager Name

MANAGER\_EMAIL=manager@example.com

MANAGER\_PASSWORD=your\_secure\_password

```



Replace the example values with your own configuration. Never commit the `.env` file.



Start the backend:



```bash

npm start

```



If your `backend/package.json` does not define a `start` script, use the script specified in that file.



\### 3. Create the Manager account



From the `backend` directory, run:



```bash

node createManager.js

```



This uses the Manager details in your environment variables.



\### 4. Start the frontend



Open another terminal:



```bash

cd frontend

npm install

npm run dev

```



Open the local URL printed by Vite, usually `http://localhost:5173`.



\## User Roles



\*\*Manager\*\*

\- View dashboard statistics

\- Create and assign tasks

\- Edit and delete tasks

\- Monitor task status and activity



\*\*User\*\*

\- View assigned tasks

\- Update task status

\- Track personal task progress



\## Security Notes



\- Keep environment variables and database credentials private.

\- Use a strong, unique JWT secret.

\- Use HTTPS and appropriate production CORS settings when deploying.

\- Use test credentials for demonstrations and rotate exposed credentials.



\## Future Enhancements



\- Email notifications

\- Task deadlines and reminders

\- Team collaboration features

\- Automated testing and deployment

