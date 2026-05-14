# تعاهد — Frontend

React + Vite + Tailwind frontend for the **تعاهد** platform. RTL Arabic, Cairo
font, color palette `#2c2f7c` (primary) and `#136d4a` (secondary).

## Setup

```bash
npm install
cp .env.example .env       # then edit VITE_API_URL
npm run dev
```

## Architecture

The app is split into three areas:

### 1. Public pages
Standard auth + landing flow. Standalone layouts.

| Route                | Page             |
|----------------------|------------------|
| `/`                  | Landing          |
| `/login`             | Login            |
| `/register`          | Register         |
| `/otp`               | OTP verification |
| `/forgot-password`   | Forgot password  |

### 2. Project flows (full-screen, no sidebar)
Anyone logged in can use these. Each page has its own topbar with a
"لوحة التحكّم" button to return to the dashboard.

| Route                       | Page                                |
|-----------------------------|-------------------------------------|
| `/projects`                 | Browse all open projects            |
| `/projects/new`             | Create project (4-step wizard)      |
| `/projects/:id`             | Project details (role-aware)        |
| `/projects/:id/apply`       | Apply to a project                  |

### 3. Dashboard (sidebar layout)
The user's personal workspace — shows only their own work. The sidebar
nav is intentionally minimal (home + profile) since the dashboard's job
is now to surface YOUR projects/applications, not to navigate to lists
of other people's stuff. Browsing all projects happens at `/projects`.

| Route                | Page (selected by `account_type`)                    |
|----------------------|------------------------------------------------------|
| `/dashboard`         | `customer` / `developer` → `CustomerDashboard`       |
|                      | `service_provider` → `ServiceProviderDashboard`      |
|                      | `supplier` → `SupplierDashboard` (placeholder)       |
| `/dashboard/profile` | Profile                                              |

`DashboardHome.jsx` is just a router that picks one of the three based on
`user.account_type`.

## What each role's dashboard shows

### Customer / Developer
The user's owned projects, listed as expandable cards. Each card header
shows status, title, type/city/budget, and a "view details" button. Clicking
the "الطلبات المستلمة" toggle expands an inline panel showing every
application received on that project, with Accept/Reject buttons on
pending ones. Stats strip up top: total / pending / in progress / completed.
Top-right: "+ مشروع جديد" CTA.

### Service Provider
Projects the user has applied to. Each row shows the project info, the
user's own application data (bid amount, delivery date, status), and a
status pill (pending/accepted/rejected). Tabs filter by status. Pending
applications can be withdrawn inline. Top-right: "تصفّح المشاريع" CTA.

### Supplier
Placeholder. Friendly "coming soon" message with a CTA to browse projects
in the meantime.

## Project details — three view modes

`/projects/:id` adapts to the viewer:

| Viewer                            | Sees                                       |
|-----------------------------------|--------------------------------------------|
| Owner of the project              | Edit button, applications received section |
| Service provider on `open` project | "تقديم طلب" CTA                            |
| Anyone else                       | Read-only details                          |

Detected by comparing `project.user_id === user.id`. The page wraps itself
in its own `UserProvider` (since it's outside the dashboard layout) so
role detection still works.

## API services

Same as before — see `src/services/`:

- `http.js` configured axios instance (auth token, error normalization)
- `auth.js`, `projects.js`, `applications.js`, `contact.js`
- `index.js` barrel — `import { auth, projects, applications } from '../services'`

Each service function shows the real call as a comment on the first line,
with a fenced mock below. Uncomment the real call, delete the mock when ready.

The `applications` service is grouped by actor:

```js
applications.applicant.submit(projectId, payload)
applications.applicant.listMine()
applications.applicant.cancelMine(id)

applications.owner.listForProject(projectId)
applications.owner.acceptApplication(id)        // also rejects siblings
applications.owner.rejectApplication(id)
```

## Testing different roles

The mock `auth.me()` (in `src/services/auth.js`) returns:

```js
{ id: 1, name: 'مستخدم تجريبي', account_type: 'service_provider' }
```

To see the customer dashboard, change `account_type` to `'customer'`.
For the supplier placeholder, change to `'supplier'`. Hot reload picks it
up immediately.

## Project structure

```
taahud-frontend/
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── assets/logo.svg
    ├── config/
    │   ├── constants.js
    │   └── projectConstants.js
    ├── contexts/
    │   └── UserContext.jsx
    ├── services/
    │   ├── http.js
    │   ├── auth.js
    │   ├── projects.js
    │   ├── applications.js
    │   ├── contact.js
    │   └── index.js
    ├── styles/globals.css
    ├── components/
    │   ├── Logo.jsx
    │   ├── auth/                         (AuthShell, BrandPanel, DevNav)
    │   ├── dashboard/                    (DashboardLayout, Sidebar, Topbar)
    │   ├── form/                         (Field, SelectField, ...)
    │   ├── landing/                      (Navbar, Hero, About, ...)
    │   └── project/
    │       ├── Stepper.jsx
    │       ├── StatusBadge.jsx
    │       ├── ProjectCard.jsx
    │       ├── OpenProjectCard.jsx
    │       ├── RequirementsList.jsx
    │       ├── FilesUpload.jsx
    │       └── steps/                    (StepDetails, StepScopeAndBudget, ...)
    └── pages/
        ├── LandingPage.jsx
        ├── LoginPage.jsx
        ├── RegisterPage.jsx
        ├── OtpPage.jsx
        ├── ForgotPasswordPage.jsx
        ├── PublicProjectsPage.jsx        ← /projects   (browse all)
        ├── ProjectDetailsPage.jsx        ← /projects/:id
        ├── CreateProjectPage.jsx         ← /projects/new
        ├── ApplyPage.jsx                 ← /projects/:id/apply
        └── dashboard/
            ├── DashboardHome.jsx          ← role router
            ├── CustomerDashboard.jsx      ← my projects + apps received
            ├── ServiceProviderDashboard.jsx ← projects I applied to
            ├── SupplierDashboard.jsx      ← placeholder
            └── ProfilePage.jsx
```
