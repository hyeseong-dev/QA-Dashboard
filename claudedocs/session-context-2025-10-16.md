# QA Dashboard Session Context
*Loaded: 2025-10-16*

## Project Overview
**Multi-Project QA Dashboard System** - Next.js 15 fullstack application with PostgreSQL for collaborative testing workflows.

### Core Architecture
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + Chart.js
- **Backend**: Next.js API routes with RESTful endpoints
- **Database**: PostgreSQL with Docker containerization
- **Auth**: JWT-based session management with bcryptjs

### Current Status
- Branch: `main` (up to date with origin/main)
- Recent work: PostgreSQL LISTEN/NOTIFY + SSE real-time system implementation
- Pending migrations: Tree structure (005) and error tracking (006) columns

## Key Features
✅ **Implemented**:
- Multi-project test organization with project-based access control
- Real-time test result tracking with SSE (Server-Sent Events)
- User authentication system with role-based access (Admin/Lead/Tester)
- Test case hierarchy with category organization
- Environmental testing support (OS/device/version tracking)
- Dashboard analytics with Chart.js visualizations

🔄 **In Progress** (detected from git status):
- Tree structure support for hierarchical test cases (migration 005)
- Error tracking with fix status columns (migration 006)
- Session cleanup and token management improvements

## Database Schema Evolution

### Current Tables
1. **users** - User management with roles
2. **projects** - Project master with status tracking
3. **project_members** - User-project associations
4. **categories** - Test case categorization per project
5. **test_cases** - Core test case data with hierarchy support
6. **test_results** - Test execution records with environment tracking

### Pending Migrations
- **005**: Tree structure (`parent_id`, `depth`, `sort_order`)
- **006**: Error tracking (`error_type`, `fix_checked`)

## Component Architecture

### Core Components
- `Dashboard.tsx` - Main dashboard with test execution interface
- `TestCaseSpreadsheet.tsx` - Advanced test case management interface
- `QAEnvironmentSetup.tsx` - Environment configuration for testing
- `UserManagement.tsx` - Admin interface for user/project management

### Context Providers
- `AuthContext.tsx` - Authentication state management
- `QAEnvironmentContext.tsx` - Test environment state
- `AutoLogoutProvider.tsx` - Session timeout handling

### API Routes Structure
```
/api/
├── auth/ - Authentication endpoints
├── projects/ - Project CRUD operations
├── users/ - User management
└── results/ - Test result recording
```

## Development Environment

### Available Commands
```bash
npm run dev          # Development server with Turbopack
npm run db:up        # Start PostgreSQL container
npm run db:down      # Stop PostgreSQL container
npm run db:reset     # Reset database (WARNING: removes all data)
npm run lint         # ESLint validation
```

### Configuration Files
- `package.json` - Dependencies and scripts
- `docker-compose.yml` - PostgreSQL container setup
- `database/init/` - Database initialization scripts
- `database/migrations/` - Schema evolution scripts

## Constitution Integration
This project follows the **Five-Layer Context Architecture** defined in `CONSTITUTION.md`:

1. **System Context**: QA Dashboard specialized development assistant
2. **Domain Context**: QA engineering and test management expertise  
3. **Task Context**: Implementation standards and success criteria
4. **Interaction Context**: Communication protocols and feedback loops
5. **Response Context**: Output formats and quality standards

## Session Capabilities
With this context loaded, I can assist with:

- **Database Operations**: Schema migrations, query optimization, data integrity
- **API Development**: RESTful endpoint creation, authentication integration
- **Frontend Components**: React/Next.js components following project patterns
- **Real-time Features**: SSE integration, WebSocket alternatives
- **Testing Workflows**: QA-specific business logic and user experience
- **Security**: Authentication, authorization, and data protection

## Next Actions Available
Based on the current state, common next steps include:
1. Apply pending database migrations (005, 006)
2. Implement tree structure UI components for hierarchical test cases
3. Add error tracking interface for categorization and fix status
4. Enhance real-time collaboration features
5. Optimize performance for large-scale test case management

---
*This context enables efficient development collaboration with full project understanding.*