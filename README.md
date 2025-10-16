# QA Dashboard

Multi-Project QA Dashboard System - A Next.js fullstack application with PostgreSQL for collaborative testing workflows.

## 🎯 AI Development Constitution

This project uses the **Five-Layer Context Architecture** for consistent, high-quality AI assistance:
- 📋 **Primary Reference**: [`CONSTITUTION.md`](./CONSTITUTION.md) - Complete implementation guide
- ⚡ **Quick Reference**: [`claudedocs/five_layer_quick_reference.md`](./claudedocs/five_layer_quick_reference.md)

**For Developers**: Always reference the Constitution when working with AI tools on this project.

## 🎉 Recent Updates (2025-10-16)

### ✅ Database Enhancements
- **Tree Structure Support**: Test cases now support hierarchical organization with `parent_id`, `depth`, and `sort_order`
- **Error Tracking**: Added `error_type` categorization (기능오류, UI/UX오류, 시스템연동오류, 신규개발)
- **Fix Status**: Boolean `fix_checked` column for tracking bug resolution
- **Migration System**: Comprehensive automated migration system with history tracking

### ✅ Real-time Features
- **PostgreSQL LISTEN/NOTIFY**: Database-level real-time notifications
- **Session Management**: JWT-based authentication with automatic cleanup
- **User Status Tracking**: Live online/offline status with SSE fallback
- **Connection Resilience**: Auto-reconnection with polling backup

### ✅ Development Experience
- **Five-Layer Context Architecture**: AI development constitution for consistent results
- **Comprehensive Documentation**: Database audit reports and API documentation
- **Docker Integration**: Fully containerized development environment
- **Migration Safety**: Automated schema updates with rollback capability

### ✅ API Completeness
- **Full CRUD Operations**: Complete test case management API
- **Hierarchical Operations**: Tree structure manipulation endpoints
- **Error Management**: Dedicated error type and fix status endpoints
- **User Analytics**: Personal testing statistics and reporting

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

> **Note**: If port 3000 is in use, Next.js will automatically use an available port (e.g., 3004). Check the terminal output for the actual URL.

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
- **Hierarchical Test Cases**: Tree structure with parent-child relationships
- **Error Tracking**: Categorize bugs (기능오류, UI/UX오류, 시스템연동오류, 신규개발)
- **Fix Status Tracking**: Mark test cases as fix-checked with boolean flags
- **Real-time Updates**: Live user status and session tracking
- **Test Case Organization**: Category-based and hierarchical test management
- **Result Tracking**: Comprehensive test execution history with environment data
- **Dashboard Analytics**: Real-time statistics with Chart.js visualization
- **Import/Export**: Bulk test case management with Excel-like interface

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
- **`users`** - User accounts and profiles with password hashing
- **`sessions`** - JWT-based session management with auto-cleanup
- **`projects`** - Project master data with status tracking
- **`categories`** - Test case categorization per project
- **`project_members`** - Many-to-many user-project relationships
- **`test_cases`** - Test items with hierarchy support (parent_id, depth, sort_order)
- **`test_results`** - Execution records with environment data and user tracking
- **`migration_history`** - Database migration tracking and version control

### Real-time Components
- **`users_online_status`** - View for real-time user status tracking
- **PostgreSQL Triggers** - Automatic notifications for session/user changes
- **LISTEN/NOTIFY Channels** - `session_updates`, `user_status_updates`, `test_channel`
- **Utility Functions**:
  - `cleanup_expired_sessions()` - Automatic session maintenance
  - `update_session_activity()` - Session activity tracking
  - `test_notification()` - Real-time system testing

## 🔄 Database Migrations

The project includes automated database migrations that run when Docker containers are initialized:

### Migration Files
```
database/
├── init/
│   ├── 01_schema.sql              # Initial schema and sample data
│   └── 02_apply_migrations.sql    # Complete migration system
└── migrations/
    ├── 000_run_migrations.sql      # Migration management system
    ├── 001_create_sessions_table.sql
    ├── 002_add_session_triggers.sql
    ├── 003_add_session_management.sql
    ├── 005_add_tree_structure_to_test_cases.sql
    ├── 006_add_error_tracking_columns.sql
    ├── 01_add_password_hash.sql
    └── 02_add_tree_structure_columns.sql
```

### Fresh Installation
When you run `docker-compose up` for the first time, all migrations are automatically applied:

1. **Base Schema**: Users, projects, categories, test cases, and results tables
2. **Session Management**: JWT-based sessions with automatic cleanup
3. **Real-time System**: PostgreSQL triggers and LISTEN/NOTIFY setup
4. **Tree Structure**: Hierarchical test case organization support
5. **Error Tracking**: Test case error categorization and fix status
6. **User Accounts**: Default admin and tester accounts with bcrypt encryption

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
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}/cases` - Test cases with results and hierarchy
- `GET /api/projects/{id}/categories` - Project categories
- `POST /api/projects/{id}/categories` - Create category
- `POST /api/projects/{id}/test-cases` - Create test case with tree support
- `PATCH /api/projects/{id}/test-cases/{caseId}` - Update test case
- `DELETE /api/projects/{id}/test-cases/{caseId}` - Delete test case
- `POST /api/projects/{id}/test-cases/{caseId}/error-type` - Set error type
- `POST /api/projects/{id}/test-cases/{caseId}/fix-check` - Toggle fix status
- `POST /api/results` - Submit test results
- `GET /api/users` - User management (Admin only)
- `GET /api/users/{id}/statistics` - User testing statistics

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

### Port Configuration
```bash
# Check if port 3000 is in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Force specific port
npm run dev -- -p 3000
```

### Real-time Connection Issues
- Check browser console for SSE connection status
- Verify PostgreSQL LISTEN/NOTIFY channels: `SELECT test_notification();`
- Monitor Network tab in developer tools for `/api/realtime` requests
- Test notification system: `docker exec qa-postgres psql -U qa_user -d qa_dashboard -c "SELECT test_notification();"`

### Database Issues
```bash
# Check migration status
docker exec qa-postgres psql -U qa_user -d qa_dashboard -c "SELECT * FROM migration_history;"

# Verify all tables exist
docker exec qa-postgres psql -U qa_user -d qa_dashboard -c "\dt"

# Check test_cases table structure (including new columns)
docker exec qa-postgres psql -U qa_user -d qa_dashboard -c "\d test_cases"
```

### Common Fixes
```bash
# If columns missing (error_type, fix_checked)
npm run db:reset

# If port 3000 in use
# Next.js automatically uses next available port (check terminal)

# Clear Docker volumes completely
docker-compose down -v
docker volume prune
npm run db:up
```

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

## 📊 Project Status

### Current State
- ✅ **Production Ready**: Full-featured QA dashboard with real-time capabilities
- ✅ **Database Stable**: All migrations tested and automated
- ✅ **API Complete**: Full CRUD operations with comprehensive endpoints
- ✅ **Real-time Working**: SSE + PostgreSQL LISTEN/NOTIFY fully functional
- ✅ **Authentication Secure**: JWT + bcrypt with session management
- ✅ **Docker Ready**: Containerized development and deployment

### Database Schema (8 Tables)
```
users (8 cols) ──┬── sessions (9 cols)
                 └── project_members ──── projects (4 cols)
                                          └── categories (3 cols)
                                              └── test_cases (12 cols)
                                                  └── test_results (9 cols)
migration_history (5 cols)
```

### Key Metrics
- **Tables**: 8 core tables with proper relationships
- **API Endpoints**: 15+ RESTful endpoints with full CRUD
- **Real-time Channels**: 3 PostgreSQL LISTEN/NOTIFY channels
- **Migration Files**: 8 migration scripts with automated application
- **Test Coverage**: Core functionality validated
- **Documentation**: 5 comprehensive documentation files in `claudedocs/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Reference the Constitution: Check `CONSTITUTION.md` for development standards
4. Run tests and ensure migrations work: `npm run db:reset && npm run dev`
5. Submit a pull request with clear description

## 📄 License

This project is private and confidential.