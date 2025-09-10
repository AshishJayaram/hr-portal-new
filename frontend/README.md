# HR Portal

A comprehensive HR management system built with Next.js, TypeScript, and Tailwind CSS. This application provides role-based access control for different user types including HR, Admin, Managers, and regular Employees.

## Features

### 🔐 Authentication & Authorization
- Secure login with JWT tokens
- Role-based access control (RBAC)
- Protected routes with authentication guards
- Automatic logout functionality

### 👥 User Management
- **HR/Admin**: Full user management (create, edit, delete users)
- **Managers**: View team members and manage direct reports
- **Employees**: View own profile and basic information

### 📅 Leave Management
- **Employees**: Apply for leaves, view leave balance, cancel pending leaves
- **Managers/HR**: Approve/reject leave requests, view team leaves
- **HR/Admin**: Manage leave balances, view all leave requests

### 📄 Document Management
- **HR/Admin**: Upload, edit, delete documents, manage access control
- **All Users**: View accessible documents based on permissions
- Support for public and private documents with ACL

### 💰 Salary Slip Management
- **HR/Admin**: Upload salary slips for employees
- **Employees**: View and download their own salary slips
- Organized by month and year

### 📊 Dashboard
- **HR/Admin**: Overview statistics (total employees, pending leaves, etc.)
- **All Users**: Personal dashboard with leave balance, recent documents, and payslips
- Calendar view for upcoming leaves

### 🏢 Organization Features
- **Holidays**: HR/Admin can manage company holidays
- **Team View**: Managers can view their team members
- **Organization Tree**: Hierarchical view of the organization

## Role-Based Access Control

### 🔴 Admin
- Full system access
- User management (CRUD)
- Document management
- Salary slip management
- Leave approval/rejection
- Holiday management
- Dashboard statistics

### 🟡 HR
- User management (CRUD)
- Document management
- Salary slip management
- Leave approval/rejection
- Holiday management
- Dashboard statistics
- Cannot approve their own leaves

### 🟢 Manager
- View team members
- Approve/reject team leave requests
- View team leave requests
- Cannot approve their own leaves

### 🔵 Employee
- View own profile
- Apply for leaves
- View own leave balance
- Cancel own pending leaves
- View accessible documents
- View own salary slips

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get users (HR/Admin only)
- `POST /api/users` - Create user (HR/Admin only)
- `GET /api/users/:id` - Get user details (scoped)
- `PATCH /api/users/:id` - Update user (HR/Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Leave Management
- `GET /api/leaves` - Get leaves (role-scoped)
- `POST /api/leaves` - Apply for leave (Employee)
- `GET /api/leaves/:id` - Get leave details (scoped)
- `PATCH /api/leaves/:id` - Update leave (owner/HR/Admin)
- `POST /api/leaves/:id/approve` - Approve leave (Manager)
- `POST /api/leaves/:id/reject` - Reject leave (Manager)

### Leave Balance
- `GET /api/users/:id/leave-balance` - Get leave balance (scoped)
- `PATCH /api/users/:id/leave-balance` - Update leave balance (HR/Admin)

### Documents
- `GET /api/documents` - Get documents (public + ACL)
- `POST /api/documents` - Upload document (HR/Admin, multipart)
- `GET /api/documents/:id` - Get document (scoped)
- `PATCH /api/documents/:id` - Update document (HR/Admin)
- `DELETE /api/documents/:id` - Delete document (HR/Admin)

### Document Access Control
- `GET /api/documents/:id/access` - Get document access (HR/Admin)
- `POST /api/documents/:id/access` - Set document access (HR/Admin)
- `PATCH /api/documents/:id/access/:userId` - Update access (HR/Admin)
- `DELETE /api/documents/:id/access/:userId` - Remove access (HR/Admin)

### Salary Slips
- `GET /api/salary-slips` - Get salary slips (scoped)
- `POST /api/salary-slips` - Upload salary slip (HR/Admin, multipart)
- `GET /api/salary-slips/:id` - Get salary slip (scoped)
- `DELETE /api/salary-slips/:id` - Delete salary slip (HR/Admin)

### Holidays
- `GET /api/holidays` - Get holidays (Authenticated)
- `POST /api/holidays` - Create holiday (HR/Admin)
- `PATCH /api/holidays/:id` - Update holiday (HR/Admin)
- `DELETE /api/holidays/:id` - Delete holiday (HR/Admin)

### Dashboard & Team
- `GET /api/dashboard/stats` - Get dashboard statistics (role-aware)
- `GET /api/team` - Get team members (Manager/HR/Admin)
- `GET /api/org/tree` - Get organization tree (Authenticated)

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXTAUTH_SECRET=your-secret-key-here
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL and NextAuth secret
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Authentication**: JWT tokens with localStorage
- **UI Components**: Custom components with Framer Motion
- **Styling**: Tailwind CSS with custom dark theme
- **Icons**: Emoji icons for simplicity

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── documents/         # Document management
│   ├── employees/         # Employee management (HR/Admin)
│   ├── holidays/          # Holiday management
│   ├── leaves/            # Leave management
│   ├── salary-slips/      # Salary slip management
│   ├── signin/            # Authentication
│   └── team/              # Team view
├── components/            # Reusable components
│   ├── AuthGuard.tsx      # Authentication guard
│   ├── RoleGuard.tsx      # Role-based access control
│   ├── Sidebar.tsx        # Navigation sidebar
│   ├── Topbar.tsx         # Top navigation bar
│   └── ...                # Other components
└── lib/                   # Utilities and API
    ├── api.ts             # API client with all endpoints
    └── leaveUtils.ts      # Leave calculation utilities
```

## Security Features

- **Authentication Guard**: Protects all app routes
- **Role-Based Access Control**: Component-level and API-level permissions
- **JWT Token Management**: Secure token storage and validation
- **Input Validation**: Form validation and sanitization
- **Error Handling**: Comprehensive error handling and user feedback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
