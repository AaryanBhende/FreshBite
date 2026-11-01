# FreshBite

FreshBite is a full-stack restaurant and cafe web application that supports online ordering, reservation management, kitchen display systems (KDS), driver delivery management, customer feedback, and admin operations.

---

## Key Features

- **Customer Experience:** Browse menu items, apply promotions, track orders in real time, place dine-in table reservations, rate items, and submit contact or order-issue reports. Personalised recommendations appear in an arrow-navigated horizontal strip (native scrollbar hidden; `‹`/`›` buttons scroll by one card with smooth behavior and auto-hide when there is nothing left to scroll).
- **Role-Based Access:** Dedicated dashboards for Customers, Admins, Delivery Drivers, and Kitchen Staff.
- **Kitchen Display System (KDS):** Real-time order management for kitchen staff, supporting order bumping, availability toggles, automated ready status transitions for Takeout and Dine-in orders, and paginated delivered history.
- **Driver Delivery Workflow:** Automatic driver assignment, kitchen preparation, admin-confirmed pickup, and customer-confirmed delivery using a driver-generated four-digit OTP. Codes expire after five minutes and can be regenerated; only a verified code completes delivery. Assigned deliveries include a Google Maps route overview and driver earnings analytics.
- **Admin Management Panel:** Comprehensive tools for menu item CRUD, promotional announcements, employee management (drivers & kitchen staff), user segmentation (CRM), review moderation, Takeout pickup confirmation, automated order status tracking, and dashboard tracking of active pending deliveries.
- **Interactive Seating Map:** Shared, visual table availability and floor layout (Patio, Indoor, Bar) for customers and admins.

---

## Tech Stack

### Frontend
- **Framework:** React 19 with JSX (Vite 6)
- **Routing:** React Router 7
- **Styling:** Component-level CSS (`client/src/assets/style/`)
- **Maps & Authentication:** `@react-google-maps/api`, `@react-oauth/google`

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 4
- **Database:** MySQL via `mysql2/promise`
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **File Uploads:** Multer
- **Mail Integration:** Nodemailer & Mailtrap API

---

## Project Structure

```text
FreshBite/
├── client/                     # Frontend React application
│   ├── public/                 # Static assets and upload targets
│   └── src/
│       ├── assets/             # Images and component-level CSS
│       ├── components/         # Reusable UI & subpanel components
│       ├── context/            # React context (AuthContext)
│       ├── pages/              # SPA route pages
│       ├── utils/              # Helper utilities (trip calculations, reservation slots)
│       ├── App.jsx             # Router config and role guards
│       └── main.jsx            # Entry point & provider wrappers
├── server/                     # Backend Express server
│   ├── config/                 # Database pool setup
│   ├── controllers/            # Express route logic & SQL queries
│   ├── middleware/             # Auth & role verification middleware
│   ├── migrations/             # SQL schema migrations
│   ├── routes/                 # Express API routes
│   ├── schema.sql              # Base database schema & seed data
│   └── server.js               # Server startup & middleware pipeline
├── PROJECT_CONTEXT.md          # Architectural overview & project details
├── CLIENT_CONTEXT.md           # Client application contract & details
└── BACKEND_CONTEXT.md          # Backend API contract & schema details
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MySQL Server

### Database Setup
1. Create a MySQL database (e.g., `freshbite_db`).
2. Run `server/schema.sql` to initialize the base tables and initial seed data.
3. Apply any necessary incremental SQL migrations located in `server/migrations/` in chronological order.

### Environment Configuration

Create a `.env` file in the `server/` directory:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=freshbite_db
JWT_SECRET=your_jwt_secret

# Optional capacity settings (defaults shown)
API_RATE_LIMIT_MAX=1200
DB_CONNECTION_LIMIT=20
DB_QUEUE_LIMIT=100
DB_CONNECT_TIMEOUT_MS=10000

# Optional: Email / Mailtrap Configuration
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
MAILTRAP_ACCOUNT_ID=your_account_id
MAILTRAP_INBOX_ID=your_inbox_id
MAILTRAP_API_TOKEN=your_api_token
```

To configure Google Maps on the frontend, set `VITE_GOOGLE_MAPS_API_KEY` in `client/.env`.

The API limit applies per client IP over a 15-minute window. Rate-limit responses use JSON `{ "error": "..." }`; database pool capacity and waiting-queue defaults can be adjusted for the MySQL server's available resources.

---

## Running the Application

### 1. Start the Backend Server

```bash
cd server
npm install
npm run dev
```
The server runs on `http://localhost:5000` by default.

### 2. Start the Frontend Client

```bash
cd client
npm install
npm run dev
```
The client dev server runs on `http://localhost:5173`. Requests to `/api` and `/uploads` are automatically proxied to the Express server during development.

---

## API Overview

Key API endpoints include:

| Prefix | Role / Access | Description |
| --- | --- | --- |
| `/api/auth` | Public | User registration, login, and Google authentication |
| `/api/menu` | Public / Admin / Kitchen | Fetch menu, manage items, toggle availability |
| `/api/orders` | Public / User / Admin | Place orders, track status, admin order listing |
| `/api/orders/driver` | Driver | Assigned delivery workflow and driver analytics |
| `/api/kds` | Kitchen | Active ticket display, bump items, order status updates |
| `/api/reservations` | Public / User / Admin | Slot availability, booking submission, walk-in management |
| `/api/tables` | Public | Table map layout & hourly availability |
| `/api/users/admin/employees` | Admin | Manage Kitchen and Driver staff accounts |

For more extensive documentation, refer to `BACKEND_CONTEXT.md` and `CLIENT_CONTEXT.md`.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
