# Berbou HRM

Berbou HRM is a Human Resource Management (HRM) web application that simplifies employee management, payroll, leave, internal messaging and HR processes. It is built with **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS 4** and **Recharts**, and stores its data in two JSON files.

## Getting started

```bash
npm install
cp .env.example .env.local   # then set SESSION_SECRET to a long random string
npm run dev                  # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

### Demo accounts

| Role     | Email                      | Password      |
| -------- | -------------------------- | ------------- |
| Admin    | `guest@bhrm.com`           | `guest`       |
| Employee | `fatima.elamrani@bhrm.com` | `password123` |
| Employee | `john.doe@bhrm.com`        | `password123` |

Every other seeded employee also uses `password123`.

### Deploy on Vercel

Vercel's file system is read-only, so on Vercel the app stores its data in **Redis** (Upstash) instead of the JSON files:

1. Import the GitHub repository on [vercel.com/new](https://vercel.com/new) (framework: Next.js, default settings).
2. In the project, open **Storage → Create / Connect database → Upstash for Redis** (free plan) and connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
3. In **Settings → Environment Variables**, add `SESSION_SECRET` (a long random string).
4. Redeploy. On the first request, the database is filled with the demo data from `data.json` and `messages.json`.

When those Redis variables are not set (e.g. `npm run dev`), the app keeps using the JSON files.

## Features

| Page | Admin | Employee |
| --- | --- | --- |
| **Dashboard** | Company KPIs (headcount, absenteeism, leave usage, monthly payroll), charts by department / contract, attendance alerts, pending leave, people search | Personal KPIs: leave balance, pending requests, absenteeism, net pay |
| **Departments** | Employees grouped by department, filter and search, payroll per department | – |
| **Employees** | Add / edit / delete employees (profile, payroll, leave balance, documents, projects) | – |
| **Profile** | View anyone's profile | Own profile, request leave, cancel pending requests |
| **Leave requests** | Approve / reject; approved vacation is deducted from the balance (working days, Mon–Fri) | – |
| **Messages** | Inbox, sent, archive, trash, reply, message everyone | Same, without "message everyone" |
| **Payroll** | Totals, CSV export (Excel-friendly), **Run payroll** generates the month's payslips | Own pay and payslips |
| **Payslip** | Printable payslip (Print → Save as PDF) | Own payslips |

### Payroll rules

Defined in `lib/hr.js`:

- Gross = base salary + overtime + bonuses
- Net = gross − deductions
- Overtime = hours × (monthly salary ÷ 151.67 h) × 125 %
- Currency: `CURRENCY` in `lib/hr.js` (EUR by default)

## Project structure

```
app/
  page.js                 login page
  auth/                   pages that require a login (layout = header + sidebar)
  api/
    auth/login|logout     session cookie
    me                    current user
    data                  employees (GET for everyone, POST/PUT/DELETE for admins)
    directory             names only, used to pick message recipients
    leave                 request / approve / reject / cancel leave
    messages              send, list, archive, delete, restore
    payroll/run           generate monthly payslips
components/               shared UI + user context
lib/
  auth.js                 password hashing, signed session cookie, access checks
  db.js                   storage: Redis when configured, JSON files otherwise
  hr.js                   business rules (working days, pay, currency)
middleware.js             redirects logged-out visitors to the login page
scripts/hash-passwords.mjs  converts plain-text passwords in data.json to hashes
data.json, messages.json  the data
```

## Security

- Passwords are stored as scrypt hashes. If you add plain-text passwords to `data.json` by hand, run `node scripts/hash-passwords.mjs`; they are also converted on the next successful login.
- The session is an **httpOnly cookie signed with HMAC**, so it can't be read or forged in the browser. Set `SESSION_SECRET` in production.
- Every API route checks the session and the role on the server. Employees only receive their own record, and passwords are never sent to the browser.

## Limits

- Locally, data is stored in JSON files; on Vercel (or anywhere the Redis variables are set) it is stored as two JSON documents in Redis. That suits a demo or a small team; a larger company would want a relational database.
- The document links in the seed data are placeholders.
