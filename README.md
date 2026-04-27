# Family Survey Portal

Family Survey Portal is a Node.js + Express application to capture, manage, and export family records with two major flows:

1. Family user flow (login, create family, maintain members)
2. Admin flow (search, edit, export, and direct family creation)

The project is server-rendered with EJS, uses MySQL, and stores family structure using persons + relationships tables.

## Project Flow

### 1) Family User Flow

1. User opens login/register page.
2. User authenticates using email + password.
3. User lands on dashboard.
4. If family data does not exist, user fills the family form.
5. User can view and edit existing members from My Family.
6. User can add children and update photos/details.

Main routes in this flow:

- GET /, GET /login, POST /login
- GET /register, POST /register, GET /logout
- GET /dashboard
- GET /family-form, POST /save-family
- GET /my-family, GET /my-family-json
- GET /family/:familyId
- GET /family-edit/:id, GET /member-edit/:id
- POST /update-family/:id, POST /update-member/:id, POST /update-husband
- POST /add-child
- DELETE /delete-family

### 2) Admin Flow

1. Admin logs in and opens admin dashboard.
2. Admin reviews families list and member details.
3. Admin can search/filter family records.
4. Admin can edit members, upload photos, add child records.
5. Admin can delete families.
6. Admin can export data (Excel/PDF).
7. Admin can also create a full family with user credentials directly from admin create flow.

Main routes in this flow:

- GET /admin/dashboard
- GET /admin/search
- GET /admin/families (JSON list)
- GET /admin/view/:id, GET /admin/edit/:id, POST /admin/edit/:id
- POST /admin/upload-photo/:familyId
- POST /admin/add-child
- POST /admin/delete/:id
- GET /admin/export/excel, GET /admin/export/pdf
- GET /admin/family-login, POST /admin/family-login, POST /admin/family-register
- GET /admin/add-family
- GET /admin/create-family, POST /admin/create-family
- GET /admin/view/create-family, POST /admin/view/create-family

### 3) Family Tree Flow

1. User/admin opens family tree page by user id.
2. Tree data is served through API endpoints by person id or user id.
3. Navigation endpoint resolves related family tree nodes.

Main routes:

- GET /family-tree/:userId
- GET /api/family-tree/:personId
- GET /api/family-tree-user/:userId
- GET/POST /admin/family-tree/navigate/find-related

## Features

- Session-based authentication for users/admin
- Family creation with parent/spouse/children/sibling relationships
- Image upload support for family members
- Admin family management (view/edit/delete)
- Search/filter support for admin views
- Excel and PDF export
- Family tree rendering and related-node navigation
- State/district selection from static India dataset

## Tech Stack

- Backend: Node.js, Express.js
- View Engine: EJS
- Database: MySQL (mysql2)
- ORM/Migrations: Sequelize, sequelize-cli
- Auth: express-session + bcryptjs
- Uploads: Multer
- Image Processing: Sharp
- Export: ExcelJS, PDFKit
- Dev Tooling: Nodemon, Jest, Supertest

## Current Data Model

The active runtime flow is centered on:

- users
- persons
- relationships

Notes:

- Legacy families/family_members naming still appears in some files/migrations.
- The compatibility layer in model logic writes/reads through persons + relationships for current flows.

## Folder Overview

- app.js: App bootstrapping, middleware, route mounting, global error handler
- config/: DB configuration and pool setup
- controllers/: Business logic for family, admin, export, tree navigation
- routes/: Family/admin/search/tree route declarations
- middleware/: Auth and upload middleware
- models/: Data access and compatibility model logic
- migrations/: Historical schema migration files
- views/: EJS pages for family and admin UI
- public/: Static JS, images, data files
- uploads/: Uploaded media storage

## Setup

1. Install dependencies

```bash
npm install
```

2. Create environment file

Create .env with your DB values (example):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=survey_app
ADMIN_EMAIL=admin@example.com
```

3. Ensure MySQL database exists

- Database name used by default: survey_app

4. Run migrations (if needed for your environment)

```bash
npx sequelize-cli db:migrate
```

5. Start the app

```bash
npm start
```

For development:

```bash
npm run dev
```

## Run & Access

- App currently starts on: http://localhost:4000
- Family login: http://localhost:4000/login
- Admin dashboard: http://localhost:4000/admin/dashboard

## Scripts

- npm start: start server
- npm run dev: start server with nodemon
- npm test: placeholder test command

## Docker Notes

Docker files exist (Dockerfile + docker-compose.yml), but verify exposed/internal port mappings with app.js before production use.

## Security & Operations Notes

- Passwords are hashed using bcryptjs
- Session cookie is httpOnly and sameSite=lax
- Update session secret and DB credentials for production
- Keep uploads directory writable by runtime user

## License

ISC