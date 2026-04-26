# HireFlow ATS — Recruitment Management System

A full-stack MERN-based recruitment management system with role-based access for HR and employees to manage hiring workflows, candidate pipelines, interview tracking, and dashboard analytics.

## 🚀 Features

- **Role-Based Authentication** — JWT auth with HR (Admin) and Employee (Coordinator) roles
- **Job Management** — HR can create, edit, and manage job postings across departments
- **Candidate Management** — Add, search, filter, and track candidates through the hiring pipeline
- **Kanban Pipeline** — Drag-and-drop board with 7 stages (Applied → Selected/Rejected)
- **Interview Tracking** — Round-wise scoring, feedback, and interviewer management (HR-only)
- **Analytics Dashboard** — Real-time stats, pipeline overview, today's interviews, job-wise breakdown
- **Responsive Design** — Mobile-first UI with modern glassmorphism and animations

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT |
| Drag & Drop | @hello-pangea/dnd |
| Icons | Lucide React |
| Notifications | React Hot Toast |

## 📁 Project Structure

```
HireFlow-ATS/
├── server/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/ (User, Job, Candidate, InterviewRound)
│   ├── controllers/ (auth, job, candidate, interview, dashboard)
│   ├── routes/ (auth, job, candidate, interview, dashboard)
│   ├── server.js
│   └── .env
├── client/
│   ├── src/
│   │   ├── components/ (Sidebar, Layout, Modal, Loader, ProtectedRoute)
│   │   ├── pages/ (Login, Dashboard, Candidates, Jobs, Pipeline)
│   │   ├── context/AuthContext.jsx
│   │   └── utils/ (api.js, constants.js)
│   └── vite.config.js
└── README.md
```

## ⚡ Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
git clone <repo-url>
cd HireFlow-ATS

# Install server deps
cd server
npm install

# Install client deps
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/hireflow-ats
JWT_SECRET=your_super_secret_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 🚢 Deployment

### Frontend → Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Set root directory to `client`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. Set root directory to `server`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables:
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_secret
   NODE_ENV=production
   CLIENT_URL=https://your-app.vercel.app
   ```

### Database → MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free M0 cluster
3. Create database user
4. Whitelist IP `0.0.0.0/0` (for Render)
5. Copy connection string to `MONGO_URI`

## 📝 API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/signup` | Public | Register |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Auth | Current user |
| GET/POST | `/api/jobs` | Auth/HR | List/Create jobs |
| PUT/DELETE | `/api/jobs/:id` | HR | Update/Delete job |
| GET/POST | `/api/candidates` | Auth | List/Add candidates |
| PUT | `/api/candidates/:id` | Auth | Update candidate |
| PUT | `/api/candidates/:id/stage` | Auth | Update pipeline stage |
| POST | `/api/interviews` | Auth | Add interview round |
| GET | `/api/interviews/:candidateId` | HR | Get rounds (scores) |
| GET | `/api/dashboard/stats` | Auth | Dashboard stats |
| GET | `/api/dashboard/today` | Auth | Today's interviews |
| GET | `/api/dashboard/pipeline` | Auth | Pipeline summary |
| GET | `/api/dashboard/job-stats` | Auth | Job-wise counts |
