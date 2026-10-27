# FreshBite Project Context

This document is a working map of the FreshBite repository for future development chats. It describes the code currently present in the repository; check source files when changing behavior because this guide can become stale.

## Project at a glance

FreshBite is a restaurant/cafe ordering and customer-management web application.

- **Language:** JavaScript (JSX on the frontend). No TypeScript source or `tsconfig` is present.
- **Package manager:** npm. Lockfiles exist at the repository root, `client/`, and `server/`.
- **Frontend:** React 19, Vite 6, React Router 7.
- **Backend:** Node.js ES modules, Express 4.
- **Database:** MySQL via `mysql2/promise` connection pool.
- **Authentication:** JWT bearer tokens, bcrypt password hashing, Google OAuth login.
- **Maps:** Google Maps through `@react-google-maps/api`; the client reads `VITE_GOOGLE_MAPS_API_KEY` at build time.
- **Uploads:** Multer saves menu and promotion images under `client/public`; Express exposes static paths.

The code is split into independent `client` and `server` applications. The repository-root `package.json` is server-oriented too, but the intended frontend commands/dependencies live under `client/`, and backend commands/dependencies under `server/`.

## Repository map

```text
FreshBite/
├── package.json                 # Root package metadata/scripts/dependencies
├── package-lock.json
├── README.md                     # Brief, partially outdated homepage description
├── client/
│   ├── package.json              # Vite/React scripts and dependencies
│   ├── vite.config.js            # Dev server and API/upload proxy
│   ├── index.html
│   ├── public/                   # Static images and uploaded assets
│   └── src/
│       ├── main.jsx              # React root, global CSS, Google OAuth provider
│       ├── App.jsx               # SPA routes, shared navbar/footer/auth provider
│       ├── context/AuthContext.jsx
│       ├── utils/deliveryTrip.js  # Client-side simulated delivery trip state
│       ├── utils/reservationSlots.js # Shared one-hour slot labels/range
│       ├── components/           # Shared UI and admin subpanels
│       │   ├── ReservationFloorMap.jsx # Shared customer/admin table status map
│       │   └── AdminEmployees.jsx     # Admin employee CRUD and password reset
│       ├── pages/                # Route-level screens, including DriverDashboard and KitchenDashboard
│       └── assets/style/         # Page/component CSS
└── server/
    ├── package.json              # Express/backend scripts and dependencies
    ├── server.js                 # Express setup and route mounting
    ├── schema.sql                # MySQL schema and seed data
    ├── config/db.js              # mysql2 pool
    ├── middleware/authMiddleware.js
    ├── routes/                   # Endpoint declarations and middleware, including tables and KDS
    ├── controllers/              # Request handling and SQL/business logic, including table availability and KDS
    ├── migrations/               # Feature SQL migrations, including reservations, delivery, and kitchen tickets
    └── .env                      # Local secrets/configuration; do not copy into docs
```

Generated `client/dist/` is a Vite build output, not the primary source of truth. `node_modules/`, package lockfiles, and generated build files are omitted from the source map above.

## Frontend structure and navigation

`client/src/main.jsx` mounts React with `React.StrictMode` and wraps the app in `GoogleOAuthProvider`. The Google client ID is currently embedded in this frontend entry file. `client/src/App.jsx` wraps the app in `AuthProvider` and `BrowserRouter`; customer routes redirect admin, driver, and kitchen users to their role-specific screens. Admin, driver, and kitchen sessions use role-specific navigation without the customer footer or global delivery notice. On mobile, Navbar's shared hamburger drawer is available to all roles; driver users have an Assigned Deliveries link to `/driver`, and kitchen users have active KDS and History links to `/kitchen` and `/kitchen/history`. The kitchen active link uses an end-matched React Router state, so it highlights on the dashboard but not on history. Drawer state closes on route changes, backdrop clicks, Escape, and desktop resizing. `AuthContext` reads cached user JSON defensively during initialization.

Current SPA routes:

| Path | Page | Purpose |
| --- | --- | --- |
| `/` | `Home` | Landing page and featured content |
| `/about` | `About` | Cafe/about information |
| `/favorites` | `Favorites` | Favorite menu items |
| `/menu` | `Menu` | Menu, cart, checkout, promotions, location/map interaction |
| `/contact` | `Contact` | Contact information and form |
| `/reservations` | `Reservations` | Availability lookup and reservation submission |
| `/admin` | `AdminMenu` | Admin dashboard and management panels |
| `/admin/operations`, `/admin/marketing`, `/admin/management` | `AdminMenu` | Admin section entry paths |
| `/driver` | `DriverDashboard` | Driver-only assigned-delivery and earnings dashboard |
| `/kitchen` | `KitchenDashboard` | Kitchen-role ticket dashboard; admins see an Add New Employee card linking to Employee Management; matching Navbar item highlights |
| `/kitchen/history` | `KitchenHistory` | Kitchen-only paginated delivered-order history, 20 orders per page |
| `/profile` | `Profile` | Profile, order/reservation history, account details |
| `/track/:orderId` | `OrderTracker` | Authenticated order status tracking |

There is no explicit catch-all route in the current `App.jsx`.

### Frontend context and persistence

- `AuthContext.jsx` exposes `{ user, token, login, logout }`. It reads/writes `freshbite_user` and `freshbite_token` in `localStorage`.
- The menu/cart flow persists `freshbite_cart` in `localStorage`.
- Admin read-message IDs use `admin_read_msg_ids` in local storage.
- Delivery trip timing/arrival state uses `freshbite_delivery_trip_<orderId>` in local storage.
- Most API calls use the browser `fetch` API directly from pages/components. There is no centralized API client layer visible in the source.
- Polling and authentication views use `utils/readJsonResponse.js` to tolerate empty, malformed, or non-JSON failure bodies; server errors are read from `{ error }` when available, so a rate-limit response cannot itself trigger a JSON parsing exception.
- Protected calls generally attach `Authorization: Bearer ${token}` from `AuthContext`.
- Page-specific CSS is in `client/src/assets/style/`; global styles are in `App.css`.

### Notable frontend files

- `pages/Menu.jsx`: menu fetch, cart persistence, checkout/order creation, promotion validation, rush state, recommendations and map selection; delivery checkout includes a distance-based fee and optional driver tip.
- `pages/AuthModal.jsx`: customer-only public registration, login, and Google login calls.
- `pages/Reservations.jsx`: availability and customer reservation flow.
- `components/ReservationFloorMap.jsx`: shared responsive, reference-inspired Patio/Indoor/Bar layout used by customer booking, dine-in checkout, and admin reservations; bar entries render as single-seat spots and table colors/status come from table availability APIs.
- `utils/reservationSlots.js`: shared hourly reservation slots and display formatting.
- `components/AdminReservations.jsx`: date/hour floor map, reservation management, and scrollable walk-in modal with table-driven guest count.
- `pages/Menu.jsx`: dine-in seating prompt; customers can link an existing table or pick and reserve a live-available table before placing the order.
- `pages/Profile.jsx`: user profile updates and order/reservation history.
- `pages/OrderTracker.jsx`: polls authenticated order status every 5 seconds, renders delivery route/trip UI, a connected successful-delivery stepper, and customer OTP verification during `awaiting_delivery_otp`. For `delivery_failed`, the final Delivered position is replaced with a red X failure node. The page also sends tagged customer issue reports through the authenticated contact endpoint.
- `pages/DriverDashboard.jsx`: polls assigned deliveries, accepts orders, generates/displays five-minute 4-digit delivery OTPs, supports OTP regeneration and failure reports, and displays driver earnings analytics with a Google Maps Routes driving overview.
- `pages/KitchenDashboard.jsx`: kitchen-role dashboard for active tickets, horizontal Active Orders/Recall queues, dine-in item bumping, and menu availability; admins see an Add New Employee card at `/kitchen` that navigates to `/admin/management?view=employees`.
- `pages/KitchenHistory.jsx`: displays delivered orders chronologically, 20 orders per page.
- `components/GlobalDeliveryNotification.jsx` and `utils/deliveryTrip.js`: monitor delivery orders and persist simulated trip/arrival-notice state across pages and tabs.
- `pages/AdminMenu.jsx`: admin dashboard composition and menu/order/rush/contact-message management. The overview Orders summary card specifically displays the count of active pending deliveries (orders in active/pending fulfillment stages, excluding terminal completed/delivered and delivery_failed orders). Order Management fetches 10 order groups per page, appends groups on scroll, and refreshes the first page every 10 seconds while retaining loaded older groups; each group is paged whole with its line items, unread failure state, driver, and address.
- `components/AdminReviews.jsx`: paginated admin review listing/moderation; search and status filters apply server-side, and an IntersectionObserver appends 10 matching reviews at a time.
- `components/AdminEmployees.jsx`: admin-only driver/kitchen employee listing, create/edit/delete, and password reset.
- `components/ProductCard.jsx`: product display and ratings/review interaction; expanded cards fetch five customer reviews per page and use an IntersectionObserver in the review scroller to append more.
- `components/AdminPromotions.jsx`, `AdminReservations.jsx`, `AdminReviews.jsx`, `AdminCRM.jsx`: admin feature panels.
- `components/PromoAnnouncements.jsx`: public location-specific promotion announcements.

## Frontend/backend connection

`client/vite.config.js` runs the development frontend on port **5173** and proxies:

- `/api` → `http://localhost:5000`
- `/uploads` → `http://localhost:5000`

The UI therefore uses relative URLs such as `/api/menu`; Vite forwards them to Express during local development. Express itself listens on `process.env.PORT` or **5000**. It also serves `/assets` from `client/public/assets` and `/uploads` from `client/public/uploads`.

The Vite proxy is development-only. Check the deployment setup separately before assuming production uses the same origin/proxy behavior.

## Backend request lifecycle

`server/server.js` loads dotenv configuration and configures Express middleware in this order:

1. Compression.
2. CORS, JSON parsing (10 MB limit), and URL-encoded parsing.
3. A rate limiter for `/api/` (default 1,200 requests per IP per 15-minute window, configurable with `API_RATE_LIMIT_MAX`) with a JSON `{ error }` 429 response.
4. Static `/assets` and `/uploads` serving.
5. Feature routers mounted under `/api/...`.
6. A JSON 404 handler for unknown API paths and a final JSON error handler (including request-body parser errors).

Controllers typically validate/read `req` values, run parameterized SQL using the shared pool in `config/db.js`, and return JSON. Error handling is mostly local `try/catch` blocks returning status 500 and `{ error }`.

## API route map

All paths below are prefixed by `/api` in `server/server.js`.

| Area | Endpoint(s) | Access/behavior |
| --- | --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/google` | Public registration always creates a customer (`user`); staff accounts require admin employee management; returns user/token |
| Users | `GET /users/profile`, `PUT /users/profile` | JWT-authenticated profile read/update |
| Users/CRM | `GET /users/admin/segments` | Admin-only customer segmentation |
| Users/employee admin | `GET/POST /users/admin/employees`, `PUT/DELETE /users/admin/employees/:id` | Admin-only driver and kitchen employee CRUD; employee passwords are bcrypt-hashed and never returned |
| Users | `GET /users/recommendations` | JWT-authenticated menu recommendations |
| Menu | `GET /menu`, `GET /menu/favorites` | Public menu/favorites; menu includes aggregate rating data |
| Menu admin | `POST /menu`, `PUT /menu/:id`, `DELETE /menu/:id`, `PUT /menu/:id/favorite` | Admin-only; menu writes may upload an image |
| Menu availability | `PUT /menu/:id/availability` | Admin or kitchen role; toggles item availability |
| Orders | `POST /orders` | Order creation; route currently has no auth middleware; delivery orders are assigned an available driver in the creation transaction or fail with 409 if none is available |
| Orders admin | `GET /orders?page=N&limit=10`, `PUT /orders/:id`, `DELETE /orders/:id` | Admin-only management; listing returns `{ orders, pagination, unreadFailureCount }` and pages whole order groups |
| Orders customer | `GET /orders/user`, `GET /orders/status/:orderId` | JWT-authenticated history/status |
| Orders admin | `PUT /orders/:orderId/failure-read`, `PUT /orders/:orderId/picked-up` | Admin reads failed delivery notices or confirms an accepted, kitchen-ready driver pickup |
| Orders driver | `GET /orders/driver/assigned`, `POST /orders/driver/:orderId/delivery-otp`, `PUT /orders/driver/:orderId/status`, `GET /orders/driver/analytics` | Driver-only assignment, acceptance, OTP generation, failure reporting, and earnings workflow |
| Orders customer | `POST /orders/:orderId/verify-delivery-otp` | JWT-authenticated order owner verifies the driver's 4-digit code to complete delivery |
| Kitchen display | `GET /kds/orders`, `GET /kds/history`, `PUT /kds/orders/:id/status`, `PUT /kds/orders/items/:itemId/bump` | Kitchen-role ticket and item workflow |
| Kitchen delivered history | `GET /kds/delivered?page=N` | Kitchen role required; chronological pages of 20 delivered order groups |
| Tables | `GET /tables`, `GET /tables/availability?date=YYYY-MM-DD&time_slot=HH:00` | Public table layout/capacity and status for one-hour blocks |
| Reservations | `GET /reservations/availability?date=...` | Public availability lookup |
| Reservations | `POST /reservations` | Optional JWT; guest reservations are allowed |
| Reservations customer | `GET /reservations/user`, `PUT /reservations/:id/cancel` | JWT-authenticated history; owner may cancel Pending or Confirmed reservations |
| Reservations admin | `GET /reservations/admin`, `POST /reservations/admin/walkin`, `PUT /reservations/admin/:id/status` | Admin-only operations |
| Ratings | `GET /ratings/item/:itemId?page=N&limit=5` | Public paginated item reviews; returns review summary and pagination metadata |
| Ratings | `POST /ratings/item/:itemId` | Optional JWT; review controller associates authenticated user if present |
| Ratings admin | `GET /ratings/admin?page=N&limit=10&status=all|active|flagged&search=text`, `PUT /ratings/admin/:id/moderate` | Admin-only paginated review moderation; listing returns `{ reviews, pagination }` |
| Promotions | `POST /promotions/validate` | Optional JWT; validates/quotes a promotion |
| Promotions | `GET /promotions/announcements?location=...` | Public announcements |
| Promotions admin | `GET/POST /promotions/admin`, `PUT/DELETE /promotions/admin/:id`, `PUT /promotions/admin/:id/active` | Admin-only; create/update supports uploaded image |
| Rush | `GET /rush` | Public rush status |
| Rush admin | `PUT /rush/override` | Admin-only override |
| Contact | `POST /contact` | Public contact form submission |
| Contact | `POST /contact/order-issue` | JWT-authenticated, order-owner-checked issue report sent through the existing SMTP/Mailtrap contact infrastructure |
| Contact/admin | `GET /contact/mailtrap` | Admin-only Mailtrap inbox integration |

Implementation details and exact payload shapes belong in the relevant route/controller file; this table is a navigation aid, not a formal API specification.

Order history/status include customer-facing stages derived by `orderController.js`. Kitchen status (`pending`, `preparing`, `ready`) drives preparation stages. For delivery, a driver accepts (`accepted`), the admin confirms pickup (`picked_up`) after the kitchen marks ready, then the driver generates an OTP. The assigned driver receives the plaintext OTP; the customer must verify it before the server sets `delivered`. OTPs are hash-stored, expire after five minutes, and can be regenerated; driver failure reporting clears any active OTP. Only `picked_up` maps to customer-facing `out_for_delivery`; `awaiting_otp` maps to `awaiting_delivery_otp`. The simulated trip and arrival notice are browser-local, not GPS/server location tracking. `delivery_failed` is a customer-visible terminal stage.

Delivery creation locks driver records and automatically assigns the first available driver in the same transaction; checkout receives HTTP 409 when all drivers are busy. Drivers report failed deliveries with one of three tags, and admins see an unread failure count until they open the failed order; the selected tag is shown in its expanded details. Customers can report an order issue from `/track/:orderId` using the tags `Order not delivered`, `Missing/destroyed one or more item`, or `Wrong order`; the authenticated endpoint verifies order ownership and sends a red-accented email through the existing contact mail transport.

Public sign-up and Google-created accounts use the customer role. Admins manage `driver` and `kitchen` accounts in Employee Management; the Add New Employee card on `/kitchen` navigates directly to `/admin/management?view=employees`. Employee CRUD routes are admin-only. Password hashes are not reversible, so employee lists show a masked secure-hash state and admins reset passwords through Edit. The existing `users.role` enum already supports these employee roles; this feature adds no database migration.

## Authentication and authorization

`server/middleware/authMiddleware.js` provides:

- `verifyToken`: reads a `Bearer` JWT, verifies it, and places decoded claims on `req.user`.
- `verifyAdmin`: checks the decoded role for `admin`.
- `verifyDriver`: checks the decoded role for `driver` on driver delivery and analytics endpoints.
- `verifyKitchen`: checks the decoded role for `kitchen` on KDS endpoints; the menu availability route also permits admins.
- `optionalAuth`: verifies a token when present, but continues as guest when missing or invalid.

The JWT secret comes from `JWT_SECRET` with a development fallback defined in the middleware. Auth-related secrets and credentials must come from local environment configuration and should never be written into project notes. User passwords are handled with `bcryptjs`; Google sign-in is validated in `authController.js` using Google auth libraries.

## Database and persistence

`server/config/db.js` creates a MySQL connection pool. Configuration comes from `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`; defaults include localhost, root, and `freshbite_db`. Pool capacity defaults to 20 connections and a queue of 100, with a 10-second connection timeout; `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, and `DB_CONNECT_TIMEOUT_MS` tune these values. The pool checks connectivity during startup and logs a connection error if unavailable.

`server/schema.sql` is the schema/seed source. Main feature data includes:

- users and authentication/profile details;
- menu items and favorites;
- orders and their line items/status data;
- reservations;
- ratings/reviews and moderation state;
- promotions and promotion redemptions;
- announcements;
- application settings such as rush override.

Promotion/rush related incremental SQL is under `server/migrations/`. Review the full schema and relevant migrations before changing table fields or writing queries; the SQL controllers rely on those names and relationships.

Reservation and dine-in table assignment use `tables` and `reservations.table_id`; `orders.table_id` links dine-in order line items to a table. Existing databases need migrations through `20261029_delivery_otp_verification.sql` applied in date order. The base schema includes the OTP hash, expiry, attempt counter, and `awaiting_otp` state for fresh setup. Table numbers repeat across zones, so use numeric `table_id` for relationships and `zone`/`table_number` for display. Reservation slots are one-hour blocks; `Seated` reservations appear as Occupied on the table map, while Pending/Confirmed reservations appear as Booked. Orders also track driver assignment/outcomes, customer OTP verification, and kitchen status/item cooked state; menu items include `is_available` for sold-out controls.

## Upload and static image flow

- Menu images are uploaded with Multer by `menuRoutes.js` into `client/public/assets/images`; stored DB values are relative paths such as `assets/images/<filename>`.
- Promotion imagery is uploaded into `client/public/uploads/promos`; promotion routes limit accepted extensions/MIME types and cap file size at 5 MB.
- Express exposes static roots under `/assets` and `/uploads`.
- Menu update/delete logic may remove image files from disk. Inspect controller behavior before changing file lifecycle.

## Scripts and local development

Commands from the relevant directory:

- Frontend: `npm run dev` in `client/`; `npm run build`; `npm run preview`.
- Backend: `npm run dev` in `server/` (nodemon); `npm start`.
- The root package also has server-like `start`/`dev` scripts. Prefer the package belonging to the app being worked on.

The app requires a configured MySQL database and local server environment variables. A `server/.env` exists in this checkout; do not expose its values in chat, documentation, logs, or commits. The repository README is currently very short and focuses on the homepage, so source code and schema are the more complete references.

## Useful starting points for common changes

- Change page layout/interaction: `client/src/pages/` and corresponding `client/src/assets/style/` files.
- Change shared header/footer/product UI: `client/src/components/`.
- Change SPA route: `client/src/App.jsx`.
- Change login/session behavior: `client/src/context/AuthContext.jsx`, `client/src/pages/AuthModal.jsx`, `server/controllers/authController.js`, and auth middleware.
- Change endpoint shape/access: matching `server/routes/*Routes.js` and `server/controllers/*Controller.js`.
- Change MySQL behavior/schema: controller SQL, `server/schema.sql`, and any applicable migration.
- Change Vite development connectivity: `client/vite.config.js`; change Express mounts/middleware/static serving: `server/server.js`.

## Handoff prompt for a new chat
   
> Read `PROJECT_CONTEXT.md` for the overall architecture, then read `CLIENT_CONTEXT.md` or `BACKEND_CONTEXT.md` based on the task. Preserve the existing frontend/backend API, auth, payload, and asset-path contracts; inspect relevant source files before changing behavior.
