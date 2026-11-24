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
  db.js                   JSON file storage (serialised, atomic writes)
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

- Data is stored in JSON files, which suits a demo or a small team. Hosts with a read-only file system (e.g. Vercel) can't save changes; use a server or VPS, or replace `lib/db.js` with a real database.
- The document links in the seed data are placeholders.
