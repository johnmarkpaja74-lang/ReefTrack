# ReefTrack frontend

The default ReefTrack entry, login, and signup experience uses React, TypeScript, Tailwind CSS v4, shadcn/ui component patterns, Radix primitives, and Phosphor icons. The existing Faculty, Technician, and BFAR/LGU dashboards remain available as compatibility routes and continue to use the same browser storage records.

## Development

```powershell
npm install
npm run dev
```

Open `https://localhost:5173/`. Vite uses a local development certificate so browser camera APIs are available during development. On a phone connected to the same network, open the HTTPS network address printed by Vite, accept the local certificate warning once, and allow Camera access. The React routes are `/`, `/login`, and `/signup`.

## Production build

```powershell
npm run build
npm start
```

The build creates `dist`, bundles the React/Tailwind application, and copies the existing role dashboards and their shared assets. The Node server supports clean React routes, registered accounts, and password recovery.

## Password-recovery email

ReefTrack uses its own Node/SQLite account service and Nodemailer. Copy `.env.example` to `.env.local`, then add the SMTP mailbox that will send the six-digit recovery codes:

```powershell
Copy-Item .env.example .env.local
```

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=ReefTrack <your-email@gmail.com>
```

For Gmail, enable two-step verification and create an App Password. Never commit `.env.local`. Recovery codes expire after 10 minutes, have an attempt limit, and can only reset registered accounts. Account passwords are salted and hashed in `server/data/reeftrack.sqlite`.

## UI components

Reusable shadcn-style components live in `src/components/ui`. The ReefTrack color and spacing tokens live in `src/index.css`, and `components.json` configures future shadcn CLI additions to use Phosphor icons.

```powershell
npx shadcn@latest add dialog
```
