# Family Survey Portal

A comprehensive web application for managing family data collection and surveys. The system provides separate portals for families to register and manage their information, and for administrators to view, search, filter, and export family data.

## Features

### Family Portal
- **User Authentication**: Secure registration and login system with bcrypt password hashing
- **Family Registration**: Create and manage family profiles with personal information
- **Member Management**: Add and edit family members (parents and children)
- **Photo Uploads**: Upload and manage family member photos
- **Profile Editing**: Update family and member information
- **State/District Selection**: Location-based data with Indian states and districts

### Admin Portal
- **Dashboard**: Overview of all registered families with statistics
- **Advanced Search & Filtering**: Filter families by state, district, and search terms
- **Family Management**: View, edit, and delete family records
- **Create Families**: Admin can create new family entries
- **Data Export**: Export family data to Excel/PDF formats
- **Pagination**: Efficient data browsing with paginated views
- **Image Management**: View and manage uploaded family photos

## Technology Stack

- **Backend**: Node.js with Express.js
- **Template Engine**: EJS (Embedded JavaScript)
- **Database**: MySQL with Sequelize ORM
- **Authentication**: Express-session with bcrypt password hashing
- **File Upload**: Multer for handling multipart/form-data
- **Image Processing**: Sharp for image optimization
- **Export Tools**: ExcelJS for Excel exports, PDFKit for PDF generation
- **Development**: Nodemon for auto-reload during development

## Project Structure

```
survey-project/
│
├── app.js                      # Main application entry point
├── package.json                # Project dependencies and scripts
├── README.md                   # Project documentation
│
├── config/                     # Configuration files
│   ├── config.json            # Database configuration (dev, test, prod)
│   └── db.js                  # Database connection setup
│
├── controllers/               # Business logic controllers
│   ├── adminController.js     # Admin dashboard, CRUD operations
│   ├── adminSearchController.js # Advanced search and filtering
│   ├── exportController.js    # Excel/PDF export functionality
│   └── familyController.js    # Family portal auth and operations
│
├── middleware/                # Express middleware
│   ├── auth.js               # Authentication middleware
│   └── upload.js             # File upload middleware (Multer config)
│
├── migrations/                # Database migrations (Sequelize)
│   ├── 20260202095059-create-users.js
│   ├── 20260202095140-create-families.js
│   ├── 20260202095206-create-family-members.js
│   └── 20260202095207-alter-families.js
│
├── models/                    # Data models
│   ├── admin.js              # Admin model
│   ├── Child.js              # Child model
│   ├── FamilyMember.js       # Family member model
│   ├── index.js              # Sequelize models index
│   └── User.js               # User model
│
├── public/                    # Static assets
│   ├── data/
│   │   └── india-states-districts.json  # Indian states and districts data
│   ├── images/               # Static images
│   ├── js/                   # Client-side JavaScript
│   │   ├── family.js         # Family portal scripts
│   │   └── india-states-districts.js  # Location dropdown handler
│   └── uploads/              # User uploaded files (public access)
│
├── routes/                    # Route definitions
│   ├── adminRoutes.js        # Admin portal routes
│   ├── adminSearchRoutes.js  # Admin search routes
│   └── familyRoutes.js       # Family portal routes
│
├── uploads/                   # File upload storage
│   ├── children/             # Children photos
│   ├── parent/               # Parent photos (single)
│   └── parents/              # Parents photos (multiple)
│
└── views/                     # EJS templates
    ├── dashboard.ejs         # Family dashboard
    ├── family-edit.ejs       # Edit family form
    ├── family-form.ejs       # New family form
    ├── family-login.ejs      # Family login page
    ├── member-edit.ejs       # Edit member form
    ├── my-family.ejs         # Family details view
    └── admin/                # Admin views
        ├── create-family.ejs
        ├── dashboard.ejs
        ├── edit.ejs
        ├── search-filter-form.ejs
        └── view.ejs
```

## Directory Explanation

### Core Files
- **app.js**: Express application setup, middleware configuration, route mounting, and server initialization
- **package.json**: Dependencies, scripts, and project metadata

### config/
Database configuration and connection management
- `config.json`: Environment-specific database credentials (development, test, production)
- `db.js`: MySQL connection pool setup using mysql2

### controllers/
Business logic separated from routes
- `adminController.js`: Dashboard stats, family CRUD operations, member management
- `adminSearchController.js`: Search and filter functionality with pagination
- `exportController.js`: Generate Excel and PDF exports of family data
- `familyController.js`: User authentication, family registration, member management

### middleware/
Reusable middleware functions
- `auth.js`: Session-based authentication guards for protected routes
- `upload.js`: Multer configuration for handling file uploads with validation

### migrations/
Database schema versioning using Sequelize CLI
- Sequential migrations for creating and altering tables
- Maintains database schema history

### models/
Data access layer with Sequelize ORM
- Define table schemas and relationships
- Provide methods for database operations

### public/
Static files served directly to clients
- `data/`: JSON data files (states, districts)
- `images/`: Static images and assets
- `js/`: Client-side JavaScript for dynamic behavior
- `uploads/`: Publicly accessible uploaded files

### routes/
URL routing and request handling
- Map HTTP endpoints to controller functions
- Apply middleware (authentication, validation)

### uploads/
File storage for user uploads
- Organized by member type (children, parent, parents)
- Files stored with unique hashed names

### views/
EJS templates for server-side rendering
- Family portal views (login, registration, dashboard)
- Admin portal views (dashboard, search, edit)
- Reusable layouts and partials

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd survey-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the database**
   - Update `config/config.json` with your MySQL credentials
   - Create a MySQL database: `survey_app`

4. **Run migrations**
   ```bash
   npx sequelize-cli db:migrate
   ```

5. **Start the application**
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   ```

6. **Access the application**
   - Family Portal: http://localhost:3000
   - Admin Portal: http://localhost:3000/admin

## Database Schema

The application uses the following main tables:
- **users**: User authentication and credentials
- **families**: Family information (deprecated in favor of family_members)
- **family_members**: Stores all family member data (parents and children)

## Scripts

- `npm start`: Start the production server
- `npm run dev`: Start development server with nodemon
- `npm test`: Run tests (placeholder)

## Security Features

- Password hashing with bcrypt
- Session-based authentication with httpOnly cookies
- File upload validation and sanitization
- Protected admin routes
- SQL injection prevention with parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Notes

- Ensure MySQL server is running before starting the application
- Upload directories are automatically created if they don't exist
- Images are processed and optimized using Sharp
- Session secret should be changed in production environments