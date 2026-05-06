# TaskFlow — Team Task Manager

A full-stack collaborative task management app built with **Django REST Framework** + **React + Vite + Tailwind CSS**.

## Features

- **JWT Authentication** — Signup, login, auto token refresh
- **Projects** — Create projects, invite members, role-based access (Admin / Member)
- **Tasks** — Create tasks with title, description, due date, priority, status; assign to team members
- **Dashboard** — Visual stats: tasks by status (pie chart), tasks per user (bar chart), overdue alerts
- **Role-Based Access** — Admins manage all tasks; Members can only update status of their own tasks

---

## Tech Stack

| Layer      | Tech                                  |
|------------|---------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Recharts |
| Backend    | Django 4.2, Django REST Framework     |
| Auth       | SimpleJWT (access + refresh tokens)   |
| Database   | PostgreSQL                            |
| Deployment | Railway                               |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Edit .env with your database credentials

# Run migrations
python manage.py migrate

# Create superuser (optional, for Django admin)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend runs at: `http://localhost:8000`
Django Admin: `http://localhost:8000/admin/`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000/api" > .env

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint                                 | Description              | Auth        |
|--------|------------------------------------------|--------------------------|-------------|
| POST   | `/api/auth/register/`                    | Register new user        | Public      |
| POST   | `/api/auth/login/`                       | Login, get JWT tokens    | Public      |
| POST   | `/api/auth/refresh/`                     | Refresh access token     | Public      |
| GET    | `/api/auth/me/`                          | Get current user         | Required    |
| GET    | `/api/projects/`                         | List my projects         | Required    |
| POST   | `/api/projects/`                         | Create project           | Required    |
| GET    | `/api/projects/:id/`                     | Get project detail       | Member      |
| PATCH  | `/api/projects/:id/`                     | Update project           | Admin       |
| DELETE | `/api/projects/:id/`                     | Delete project           | Admin       |
| POST   | `/api/projects/:id/members/`             | Add member               | Admin       |
| DELETE | `/api/projects/:id/members/`             | Remove member            | Admin       |
| GET    | `/api/tasks/:project_id/tasks/`          | List tasks               | Member      |
| POST   | `/api/tasks/:project_id/tasks/`          | Create task              | Admin       |
| PATCH  | `/api/tasks/:project_id/tasks/:id/`      | Update task              | Admin/Member|
| DELETE | `/api/tasks/:project_id/tasks/:id/`      | Delete task              | Admin       |
| GET    | `/api/tasks/:project_id/dashboard/`      | Dashboard stats          | Member      |

---

## Deployment on Railway

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/youruser/team-task-manager.git
git push -u origin main
```

### 2. Deploy Backend on Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo
3. Add a **PostgreSQL** plugin in Railway
4. Set environment variables in Railway dashboard:
   ```
   SECRET_KEY=<generate a strong key>
   DEBUG=False
   ALLOWED_HOSTS=<your-railway-backend-domain>
   DATABASE_URL=<auto-provided by Railway PostgreSQL>
   CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>
   ```
5. In Settings → Start Command:
   ```
   cd backend && python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
   ```

### 3. Deploy Frontend on Railway
1. Add another service → Deploy from same repo
2. Set Root Directory to `frontend`
3. Set environment variable:
   ```
   VITE_API_URL=https://<your-backend-domain>/api
   ```
4. Build Command: `npm run build`
5. Start Command: `npx serve dist`

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── config/          # Django settings, URLs, WSGI
│   ├── users/           # Custom User model, auth endpoints
│   ├── projects/        # Project & ProjectMember models
│   ├── tasks/           # Task model, dashboard endpoint
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios instance with JWT interceptor
│   │   ├── components/  # Layout, Sidebar, ProtectedRoute
│   │   ├── context/     # AuthContext (login/logout/register)
│   │   └── pages/       # Login, Signup, Dashboard, Projects, ProjectDetail
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── railway.toml
└── README.md
```
