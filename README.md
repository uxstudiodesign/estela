# Estela Event Management System

Web-based event registration and check-in system for **Estela Shipping** at the Palma Boat Show (29 April – 1 May 2025). Built by **SupaSailing**.

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd Estela
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_CHECKIN_PIN=1234
```

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — from your Supabase project dashboard (Settings > API).
- `VITE_CHECKIN_PIN` — 4-digit PIN used to access the check-in and admin pages. Change this to any number you prefer.

### 3. Run Supabase migration

**Option A** — Using Supabase CLI:

```bash
supabase db push
```

**Option B** — Using the Supabase dashboard:

1. Go to your Supabase project > SQL Editor
2. Paste the contents of `supabase/migrations/001_estela_events.sql`
3. Click "Run"

This creates the `registrations` and `checkins` tables with RLS policies.

### 4. Run locally

```bash
npm run dev
```

The event system pages are at:

| Page | URL | Access |
|------|-----|--------|
| Registration form | `/events` | Public |
| Confirmation + QR | `/events/confirmation?token=...` | Public (via redirect) |
| Check-in operator | `/events/checkin` | PIN protected |
| Admin dashboard | `/events/admin` | PIN protected |

## Deployment (Cloudflare Pages)

1. Connect your repository to Cloudflare Pages
2. Set build configuration:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. Add environment variables in Cloudflare dashboard (Settings > Environment variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CHECKIN_PIN`
4. Deploy

After deployment, all `/events/*` routes will be accessible at your Cloudflare Pages domain.

## Google Sheets Sync

The file `sheets_sync.gs` contains a Google Apps Script that syncs registration data to a Google Sheet every 5 minutes.

### Setup

1. Go to [script.google.com](https://script.google.com) and create a new project
2. Paste the contents of `sheets_sync.gs`
3. Go to **Project Settings > Script Properties** and add:
   - `SUPABASE_URL` — your Supabase project URL (same as `VITE_SUPABASE_URL`)
   - `SUPABASE_SERVICE_KEY` — your Supabase **service_role** key (from Settings > API > service_role). This is a secret server-side key — do not use the anon key here.
   - `SHEET_ID` — the ID from your Google Sheet URL (`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`)
4. Run `installTrigger()` once manually (from the editor toolbar: select function > Run)
5. Authorize permissions when prompted

The script writes to 3 tabs:
- **Iscritti** — all registrations
- **Colazioni** — only attendees registered for breakfast seminars
- **Sunset** — only attendees registered for sunset cocktails

## QR Codes

There are two types of QR codes in this system:

### Entry QR (for printing / marketing materials)

This is a QR code you print and place at the event venue, flyers, or invitations. It points to the registration page:

```
https://your-domain.com/events
```

Generate it with any online QR code generator (e.g. qr-code-generator.com) using your deployed `/events` URL. Attendees scan this QR to open the registration form on their phone.

### Personal QR (generated after registration)

After an attendee submits the registration form, they are redirected to a confirmation page with a unique QR code tied to their registration. This QR is used at the entrance for check-in.

- The QR encodes the attendee's unique `qr_token` (a UUID)
- The check-in operator scans it using the camera on `/events/checkin`
- Attendees should screenshot their confirmation page to save their QR code

**Summary**: Entry QR → brings people to `/events` to register. Personal QR → generated after registration, used for check-in at the door.

## Changing the Check-in PIN

1. Update `VITE_CHECKIN_PIN` in your Cloudflare Pages environment variables
2. Trigger a new deployment (or redeploy manually from the Cloudflare dashboard)
3. The new PIN takes effect immediately after deployment

For local development, update the value in your `.env` file and restart the dev server.

## Tech Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS v4
- **Backend/Database**: Supabase (PostgreSQL + REST API + RLS)
- **QR Generation**: `qrcode.react`
- **QR Scanning**: `html5-qrcode`
- **Sheets Sync**: Google Apps Script
- **Hosting**: Cloudflare Pages
