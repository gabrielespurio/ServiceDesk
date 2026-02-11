# HelpDesk - Service Desk System

## Overview

This is a professional Service Desk (Help Desk) MVP application built with a modern SaaS design philosophy. The system enables end users to submit support tickets, resolver agents to handle and resolve those tickets, and administrators to manage the overall system. It features a custom authentication system with role-based access control, real-time ticket updates, and a clean, intuitive interface inspired by modern SaaS products like Zendesk, Linear, and Notion.

## User Preferences

Preferred communication style: Simple, everyday language.
- Settings submodules should use data-table format with search field and pagination (10 items per page)
- UI should be modern, elegant with larger fonts for better readability
- Language: Portuguese (Brazilian)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state with automatic refetching for real-time updates
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints defined in shared route contracts (`shared/routes.ts`)
- **Build System**: Custom build script using esbuild for server and Vite for client

### Authentication System
- **Strategy**: Session-based authentication using Passport.js with Local Strategy
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Password Security**: bcryptjs for hashing with salt
- **Role-Based Access Control**: Three user roles - admin, resolver, user
- **Route Protection**: Both frontend (ProtectedRoute component) and backend middleware

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Definition**: Shared schema in `shared/schema.ts` with Zod integration via drizzle-zod
- **Database**: PostgreSQL (connection via DATABASE_URL or EXTERNAL_DATABASE_URL)
- **Migrations**: Drizzle Kit for schema migrations (`db:push` command)

### Key Design Patterns
- **Monorepo Structure**: Client (`client/`), server (`server/`), and shared code (`shared/`)
- **Type Safety**: End-to-end TypeScript with shared types between frontend and backend
- **API Contract**: Centralized API definitions in `shared/routes.ts` with Zod schemas for validation
- **Component Architecture**: Atomic design with reusable UI components in `components/ui/`

### Database Schema
- **Users**: id, username, password (hashed), fullName, role (enum), email, createdAt
- **Tickets**: id, title, description, status (enum), priority (enum), category, creatorId, assignedToId, timestamps
- **Messages**: id, ticketId, userId, content, isInternal (for agent-only notes), createdAt

### Status and Priority Enums
- **Ticket Status**: aberto, em_andamento, aguardando_usuario, resolvido, fechado
- **Ticket Priority**: baixa, media, alta, critica

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection string from `DATABASE_URL` or `EXTERNAL_DATABASE_URL` environment variable
- **Session Store**: PostgreSQL table for session persistence (auto-created by connect-pg-simple)

### Key NPM Packages
- **@tanstack/react-query**: Server state management with polling for real-time updates
- **drizzle-orm / drizzle-kit**: Database ORM and migration tooling
- **passport / passport-local**: Authentication framework
- **bcryptjs**: Password hashing
- **express-session / connect-pg-simple**: Session management
- **zod / drizzle-zod**: Schema validation
- **Radix UI**: Accessible component primitives (accordion, dialog, dropdown, etc.)
- **date-fns**: Date formatting utilities
- **recharts**: Charts for admin dashboard statistics

### Environment Variables Required
- `DATABASE_URL` or `EXTERNAL_DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET` (optional): Session encryption key (defaults to development value)

### Replit-Specific Integrations
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling (dev only)
- **@replit/vite-plugin-dev-banner**: Development banner (dev only)