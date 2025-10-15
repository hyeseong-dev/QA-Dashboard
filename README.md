# QA Dashboard

Multi-Project QA Dashboard System - A Next.js fullstack application with PostgreSQL for collaborative testing workflows.

## 🚀 Quick Start

### 1. Database Setup (Required)

```bash
# Start PostgreSQL with Docker
npm run db:up

# Reset database (if needed)
npm run db:reset
```

### 2. Application Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Default Login Accounts

| Role | Email | Password |
|------|-------|----------|
| 👔 관리자 | `admin@example.com` | `password123` |
| 🧪 테스터 | `user-t001@example.com` | `password123` |

## 🏗️ Architecture

**Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Chart.js
**Backend**: Next.js API routes with RESTful endpoints
**Database**: PostgreSQL with Docker containerization
**Real-time**: Server-Sent Events (SSE) + PostgreSQL LISTEN/NOTIFY

## 📋 Features

### Core Functionality
- **Multi-Project Management**: Independent QA environments per project
- **Real-time Updates**: Live user status and session tracking
- **Test Case Organization**: Category-based test management
- **Result Tracking**: Comprehensive test execution history
- **Dashboard Analytics**: Real-time statistics with Chart.js visualization

### Session Management
- **JWT Authentication**: Secure token-based authentication
- **Database Sessions**: PostgreSQL-backed session storage
- **Auto-logout**: 30-minute inactivity timeout
- **Real-time Status**: Live online/offline user tracking

### Real-time Features
- **SSE Integration**: Server-Sent Events for live updates
- **PostgreSQL LISTEN/NOTIFY**: Database-level real-time notifications
- **Auto-reconnection**: Failover to polling when SSE unavailable
- **Connection Status**: Visual connection state indicators

## 🛠️ Development Commands

### Database Management
```bash
npm run db:up          # Start PostgreSQL container
npm run db:down        # Stop PostgreSQL container  
npm run db:reset       # Reset database (removes all data)
```

### Application Development
```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
```

## 📂 Database Schema

### Core Tables
- **`users`** - User accounts and profiles
- **`sessions`** - Active user sessions for authentication
- **`projects`** - Project master data
- **`test_cases`** - Test items per project with categories
- **`test_results`** - Test execution records with environment data

### Real-time Components
- **`users_online_status`** - View for real-time user status
- **PostgreSQL Triggers** - Automatic notifications for session changes
- **LISTEN/NOTIFY Channels** - `session_updates`, `user_status_updates`

## 🔄 Database Migrations

The project includes automated database migrations that run when Docker containers are initialized:

### Migration Files
```
database/
├── init/
│   ├── 01_schema.sql              # Initial schema and sample data
│   └── 02_apply_migrations.sql    # Session management setup
└── migrations/
    ├── 000_run_migrations.sql     # Migration management system
    ├── 001_create_sessions_table.sql
    ├── 002_add_session_triggers.sql
    └── 003_add_session_management.sql
```

### Fresh Installation
When you run `docker-compose up` for the first time, all migrations are automatically applied:

1. **Base Schema**: Users, projects, test cases, and results tables
2. **Session Management**: Sessions table with proper indexes
3. **Real-time System**: PostgreSQL triggers and LISTEN/NOTIFY setup
4. **User Accounts**: Default admin and tester accounts with encrypted passwords

### Migration to New Server
To deploy to a new server:

```bash
# 1. Copy project files
git clone <repository>
cd QA-Dashboard

# 2. Set up environment
cp .env.local.example .env.local
# Edit .env.local with your database credentials

# 3. Start database (auto-runs all migrations)
docker-compose up -d

# 4. Install and start application
npm install
npm run dev
```

## 🔧 Environment Configuration

Create `.env.local` file:

```env
DATABASE_URL=postgresql://qa_user:qa_password@localhost:5432/qa_dashboard
JWT_SECRET=your-secret-key-change-this-in-production
```

## 🎯 Testing Workflow

The application enforces a structured testing workflow:

1. **Project Selection**: Choose from available projects
2. **Environment Setup**: Set tester name and device information
3. **Test Execution**: Record results with status (pass/fail/blocker)
4. **Real-time Tracking**: Monitor progress and team activity
5. **Analytics**: View completion rates and trend analysis

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/me` - Current user info

### Core Data
- `GET /api/projects` - List active projects
- `GET /api/projects/{id}/cases` - Test cases with results
- `POST /api/results` - Submit test results
- `GET /api/users` - User management (Admin only)

### Real-time
- `GET /api/realtime?token={jwt}` - SSE connection for live updates

## 🧪 Testing Real-time Features

Test the real-time user status updates:

1. Login as admin and go to User Management page
2. Open another browser tab and login as a different user
3. Observe real-time online status changes
4. Check connection status indicator (green = connected, red = polling fallback)

## 🚢 Deployment

### Docker Production
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Or for development
docker-compose up -d
```

### Vercel/Railway Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run migration SQL files on your database
4. Deploy Next.js application

## 🔍 Troubleshooting

### Database Issues
```bash
# Check container status
docker ps

# View database logs
docker logs qa-postgres

# Connect to database directly
docker exec -it qa-postgres psql -U qa_user -d qa_dashboard
```

### Real-time Connection Issues
- Check browser console for SSE connection status
- Verify PostgreSQL LISTEN/NOTIFY channels: `SELECT test_notification();`
- Monitor Network tab in developer tools for `/api/realtime` requests

## 📚 Technical Stack

- **Framework**: Next.js 15.5.4 with React 19.1.0
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL 15
- **Authentication**: JWT with bcrypt
- **Real-time**: Server-Sent Events + PostgreSQL LISTEN/NOTIFY
- **Charts**: Chart.js with react-chartjs-2
- **Testing**: Playwright for E2E testing
- **Container**: Docker with docker-compose

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests and ensure migrations work
4. Submit a pull request

## 📄 License

This project is private and confidential.