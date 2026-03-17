# Estela Event Management System
## Knowledge Document for Claude Code

---

## 1. Project Overview

Build a web-based event registration and check-in system for **Estela Shipping** events at the **Palma Boat Show** (29 April – 1 May 2025).

The system is built and maintained by **SupaSailing** and positioned as SupaSailing technology infrastructure powering Estela events.

**Branding rule**: All user-facing pages show the Estela logo prominently. A "Powered by SupaSailing" attribution appears in the footer. No third-party brand (Tally, Zapier, Typeform, etc.) is visible anywhere.

---

## 2. Events to Support

| Event Type | Days | Time |
|---|---|---|
| Breakfast Seminar | 29 Apr, 30 Apr, 1 May | 08:00 – 10:30 |
| Sunset Cocktail | 29 Apr, 30 Apr | Evening |
| Gala Dinner | 1 May | Evening — **NOT managed by this system** |

Each attendee can register for one or more events. Each event day has a capacity limit (~150 people for Breakfast Seminars).

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS |
| Backend / Database | Supabase (existing Estela project) |
| Auth (check-in only) | Supabase Auth or simple PIN protection |
| Hosting | Cloudflare Pages |
| Google Sheets sync | Google Apps Script (standalone, reads Supabase REST API) |
| QR code generation | `qrcode.react` library |

**Important**: The Supabase project already exists. Do not create a new project. Use the existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` from environment variables.

---

## 4. Database Schema (Supabase)

### 4.1 Table: `registrations`

```sql
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Personal data
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  azienda TEXT,
  ruolo TEXT,
  provenienza TEXT, -- 'mallorca' | 'fuori_mallorca' | 'altro'

  -- Event selection (booleans)
  colazione_29 BOOLEAN DEFAULT false,
  colazione_30 BOOLEAN DEFAULT false,
  colazione_01 BOOLEAN DEFAULT false,
  sunset_29 BOOLEAN DEFAULT false,
  sunset_30 BOOLEAN DEFAULT false,

  -- Consent
  consenso_dati BOOLEAN NOT NULL DEFAULT false,
  consenso_sponsor BOOLEAN DEFAULT false,

  -- Check-in token (unique QR per person)
  qr_token UUID UNIQUE DEFAULT gen_random_uuid(),

  -- Status
  status TEXT DEFAULT 'registered' -- 'registered' | 'cancelled'
);
```

### 4.2 Table: `checkins`

```sql
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'colazione' | 'sunset'
  event_day DATE NOT NULL,  -- e.g. '2025-04-29'
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  operator_note TEXT
);
```

### 4.3 RLS Policies

```sql
-- registrations: public can INSERT (registration form), no public SELECT
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can register"
  ON registrations FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (operators) can SELECT
CREATE POLICY "Operators can view"
  ON registrations FOR SELECT
  TO authenticated
  USING (true);

-- checkins: only authenticated users
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators manage checkins"
  ON checkins FOR ALL
  TO authenticated
  USING (true);
```

---

## 5. Application Structure

```
/src
  /pages
    RegisterPage.jsx        ← Public registration form
    ConfirmationPage.jsx    ← Post-registration confirmation + QR code
    CheckinPage.jsx         ← Operator check-in interface (protected)
    AdminPage.jsx           ← Simple stats dashboard (protected)
  /components
    EventSelector.jsx       ← Checkbox group for event/day selection
    QRDisplay.jsx           ← Shows personal QR code after registration
    AttendeeList.jsx        ← Searchable list for check-in operators
    PresenceCounter.jsx     ← Real-time count per event
  /lib
    supabaseClient.js       ← Supabase client initialization
    sheetsSync.js           ← Helper for triggering Google Sheets sync
  /styles
    theme.js                ← Estela brand colors + SupaSailing secondary
```

---

## 6. Pages — Functional Spec

### 6.1 RegisterPage (`/`)

**Purpose**: Public-facing registration form accessible via QR code.

**URL**: `/` or `/register`

**Behavior**:
- Mobile-first layout, works perfectly on smartphones
- Single-page form (no multi-step wizard — keep it fast)
- On submit: write to `registrations` table in Supabase
- On success: redirect to `/confirmation?token={qr_token}`
- Validate: email format, at least one event selected, consenso_dati required

**Fields** (in order):
1. Nome (text, required)
2. Cognome (text, required)
3. Email (email, required)
4. Telefono (text, optional)
5. Azienda (text, optional)
6. Ruolo (select: Capitano / Armatore / Broker / Manager / Agente Marittimo / Marina Manager / Altro)
7. Provenienza (select: Mallorca / Fuori Mallorca / Altro)
8. **Event Selection** (checkboxes, at least one required):
   - ☐ Breakfast Seminar — 29 Aprile
   - ☐ Breakfast Seminar — 30 Aprile
   - ☐ Breakfast Seminar — 1 Maggio
   - ☐ Sunset Cocktail — 29 Aprile
   - ☐ Sunset Cocktail — 30 Aprile
9. Consenso trattamento dati (checkbox, required) — with GDPR notice text
10. Consenso invio comunicazioni sponsor (checkbox, optional)

**UI notes**:
- Estela logo top center
- Clean white card on light background
- Submit button: Estela primary color
- "Powered by SupaSailing" in footer

---

### 6.2 ConfirmationPage (`/confirmation`)

**Purpose**: Show registration success and personal QR code.

**URL**: `/confirmation?token={qr_token}`

**Behavior**:
- Fetch registration by `qr_token` from Supabase
- Display: name, events registered for, QR code image
- QR code encodes the `qr_token` UUID string
- Prompt user to screenshot/save the QR code
- "Add to calendar" links for selected events (optional, nice to have)

**UI notes**:
- Large QR code, centered
- Clear instructions: "Mostra questo QR code all'ingresso"
- Estela branding

---

### 6.3 CheckinPage (`/checkin`)

**Purpose**: Operator interface at the door. Protected by PIN.

**URL**: `/checkin`

**Auth**: Simple 4-digit PIN stored in environment variable (`VITE_CHECKIN_PIN`). No full auth required — PIN is sufficient for this use case.

**Layout** (two panels on tablet, stacked on mobile):

**Left panel — QR Scanner**:
- Camera-based QR scanner (use `react-qr-scanner` or `html5-qrcode`)
- On scan: lookup `qr_token` in Supabase
- Show: attendee name, company, events registered
- Select which event/day to check in for (based on what they registered)
- Confirm check-in button → writes to `checkins` table
- Visual feedback: green = success, red = not registered / already checked in

**Right panel — Manual Search**:
- Search by name or email
- Shows filtered list of registrations
- Same check-in action available from list

**Top bar**:
- Current event selector (Colazione 29 / Colazione 30 / etc.)
- Real-time counter: "X / 150 presenti"
- Current time

---

### 6.4 AdminPage (`/admin`)

**Purpose**: Simple stats for Francesco. Protected by same PIN.

**Content**:
- Table: total registrations per event
- Table: checkins per event (today vs total registered)
- List: all registrations (exportable as CSV)
- Filter by event day
- "Export CSV" button → downloads registrations as CSV file

---

## 7. Google Sheets Sync

### Purpose
Francesco works in Google Sheets. The system must push data there automatically, without him doing anything.

### Architecture
A **Google Apps Script** (standalone, no server needed) runs on a time-based trigger every 5 minutes:

```javascript
// Pseudocode — implement in Google Apps Script
function syncFromSupabase() {
  const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const SUPABASE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
  const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');

  // Fetch all registrations from Supabase REST API
  const response = UrlFetchApp.fetch(
    `${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.asc`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );

  const registrations = JSON.parse(response.getContentText());

  // Write to Sheet — two tabs
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Tab 1: All registrations
  writeToTab(ss, 'Iscritti', registrations);
  
  // Tab 2: Colazioni only
  writeToTab(ss, 'Colazioni', registrations.filter(r => r.colazione_29 || r.colazione_30 || r.colazione_01));
  
  // Tab 3: Sunset Cocktails only
  writeToTab(ss, 'Sunset', registrations.filter(r => r.sunset_29 || r.sunset_30));
}
```

**Sheet columns** (in order):
`Timestamp iscrizione | Nome | Cognome | Email | Telefono | Azienda | Ruolo | Provenienza | Col 29 | Col 30 | Col 01 | Sunset 29 | Sunset 30 | Consenso Sponsor`

### Delivery
Provide the complete Apps Script code as a separate file `sheets_sync.gs`. Include setup instructions as comments at the top of the file.

---

## 8. Environment Variables

```env
# Supabase (existing project)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx

# Check-in PIN
VITE_CHECKIN_PIN=1234

# (For Apps Script — set in Script Properties, not .env)
# SUPABASE_URL
# SUPABASE_SERVICE_KEY  ← use service_role key for Apps Script (server-side only)
# SHEET_ID
```

---

## 9. Branding & Design

### Colors
- **Estela primary**: use `#003366` (deep navy) as placeholder until real brand assets are received
- **SupaSailing accent**: `#0ea5e9` (sky blue)
- **Background**: `#f8fafc`
- **Text**: `#0f172a`
- **Success**: `#22c55e`
- **Error**: `#ef4444`

### Typography
- Font: `Inter` (Google Fonts)
- Headings: semibold
- Body: regular

### Logo placement
- Estela logo: top center on all public pages, top left on operator pages
- SupaSailing "Powered by" badge: footer, small, secondary color

### Responsive
- All pages must work on mobile (registration form) and tablet (check-in interface)
- Minimum tested viewport: 375px wide

---

## 10. Deliverables

Claude Code must produce:

1. **`/src` — complete React app** with all pages and components listed in section 5
2. **`supabase/migrations/001_estela_events.sql`** — complete migration file with both tables and RLS policies
3. **`sheets_sync.gs`** — complete Google Apps Script for Sheets sync with setup instructions
4. **`README.md`** — setup guide covering:
   - Environment variables configuration
   - Supabase migration steps
   - Cloudflare Pages deployment
   - Google Apps Script setup
   - How to generate and print the QR code
   - PIN change instructions

---

## 11. Implementation Notes

- Use `@supabase/supabase-js` v2
- Use `qrcode.react` for QR code display on confirmation page
- Use `html5-qrcode` for camera scanning on check-in page
- Do not use any paid third-party services
- Do not use localStorage for sensitive data
- All dates are in `Europe/Madrid` timezone
- Language of UI: **Italian** (all labels, messages, placeholders in Italian)
- Language of code: English (variable names, comments)
- Error messages must be human-readable in Italian

---

## 12. Out of Scope (do not build)

- Gala dinner management (handled separately by Estela)
- Payment processing
- Email sending / notifications (future phase)
- Native mobile app
- Multi-tenant / multi-event configuration (future phase — this is hardcoded for Boat Show 2025)
