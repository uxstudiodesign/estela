# ESTELA POD - Proof of Delivery

## Overview
A React-based Proof of Delivery (POD) application built with Vite, TypeScript, and Tailwind CSS. It uses Supabase as the backend for authentication and database.

## Project Architecture
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (external service)
- **Router**: React Router DOM v7
- **Validation**: Zod

## Project Structure
- `src/` - Application source code
  - `components/` - UI components (layout, shared, ui)
  - `config/` - Configuration (Supabase client)
  - `hooks/` - Custom React hooks (auth, boats, couriers, geolocation, parcels)
  - `pages/` - Page components (admin, auth, courier)
  - `router/` - Routing with protected/role-based routes
  - `types/` - TypeScript type definitions
  - `lib/` - Utility functions and formatters
- `public/` - Static assets, PWA manifest, service worker
- `supabase/` - Database schema, seed data, storage config

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Development
- Dev server runs on port 5000 (configured in vite.config.ts)
- `npm run dev` to start development server
- `npm run build` to build for production

## Deployment
- Static deployment using `dist/` directory after `npm run build`

## Recent Changes
- 2026-02-09: Initial Replit setup - configured Vite for port 5000 with allowedHosts, graceful Supabase fallback when env vars not set
