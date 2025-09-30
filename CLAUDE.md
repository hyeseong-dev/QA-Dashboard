# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-Project QA Dashboard System - A Next.js fullstack application with PostgreSQL for collaborative testing workflows. The system enables multiple projects with independent QA environments, real-time test result tracking, and comprehensive dashboard analytics.

## Architecture

**Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Chart.js for data visualization
**Backend**: Next.js API routes serving RESTful endpoints  
**Database**: PostgreSQL with Docker containerization
**Key Features**: Project-based test organization, real-time statistics, test history tracking, environment-specific testing

## Development Commands

### Database Management
```bash
npm run db:up          # Start PostgreSQL container
npm run db:down        # Stop PostgreSQL container  
npm run db:reset       # Reset database (removes all data)
```

### Application Development
```bash
npm run dev            # Start development server (http://localhost:3000)
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
```

### Initial Setup
```bash
cd qa-dashboard
npm install
npm run db:up          # Start database first
npm run dev            # Start application
```

## Database Schema

**Core Tables**:
- `projects` - Project master (project_id, project_name, description, status)
- `test_cases` - Test items per project (case_id, project_id, category, item, steps, expected, priority)  
- `test_results` - Test execution records (result_id, case_id, tester, status, environment, notes, bug_id, created_at)

**Key Relationships**:
- test_cases.project_id → projects.project_id
- test_results.case_id → test_cases.case_id (CASCADE DELETE)

## API Architecture

**Base URL**: `/api/v1` (currently `/api/`)

**Endpoints**:
- `GET /api/projects` - List all active projects
- `GET /api/projects/{projectId}/cases` - Get test cases and results for project
- `POST /api/results` - Create new test result record

**Request Flow**: Project selection → Environment setup → Test execution → Result recording

## Frontend Architecture  

**Main Component**: `src/components/Dashboard.tsx` - Complete dashboard implementation
**State Management**: React hooks for project selection, test data, user environment
**Key Features**: 
- Project dropdown with real-time data loading
- Environment validation (project + tester + OS required)
- Dynamic test case filtering by category
- Expandable test cards with history and recording
- Real-time statistics with Chart.js doughnut visualization

## Database Connection

**Configuration**: `.env.local` with DATABASE_URL
**Connection Pool**: `src/lib/db.ts` manages PostgreSQL connections
**Query Interface**: Exported `query()` function for parameterized queries

## Development Patterns

**API Route Structure**: Each route validates input, handles errors, returns JSON responses
**Type Safety**: Complete TypeScript interfaces in `src/types/index.ts`
**Error Handling**: Consistent error responses with appropriate HTTP status codes
**Database Queries**: Parameterized queries prevent SQL injection

## Testing Workflow

The application enforces a strict workflow:
1. Select project from dropdown (loads available projects)
2. Enter tester name and select OS (required validation)  
3. Test case list becomes enabled only after prerequisites
4. Record results with optional notes and bug IDs
5. View real-time statistics and test history

## Key Business Logic

**Multi-Project Support**: All test cases belong to specific projects
**Environment Tracking**: Each test result stores OS/device/version as JSONB
**Status Types**: pass, fail, blocker with color-coded visualization
**Real-time Updates**: UI refreshes after each test result submission
**Historical Tracking**: Complete audit trail of all test attempts

## Docker Integration

**PostgreSQL Container**: Configured in `docker-compose.yml` with init script
**Sample Data**: `init.sql` creates schema and loads test projects/cases
**Port Mapping**: Database accessible on localhost:5432
**Volume Persistence**: Data persists between container restarts