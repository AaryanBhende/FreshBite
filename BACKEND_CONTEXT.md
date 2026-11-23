# FreshBite Backend Architecture and Client Contract

This guide is a backend-oriented companion to `PROJECT_CONTEXT.md`. It records the current Express/MySQL architecture and the constraints the React client depends on. Source code remains authoritative when an endpoint or payload changes.

## Backend stack

- Node.js using ES modules (`server/package.json` sets `"type": "module"`).
- Express 4.
- MySQL through `mysql2/promise`; a shared connection pool is exported from `server/config/db.js`.
- Controllers use parameterized SQL through `pool.query(...)` and return JSON responses.
- JWT authentication uses `jsonwebtoken`; passwords use `bcryptjs`.
- Multer handles menu and promotion image uploads; Nodemailer and Mailtrap API integration support contact/admin inbox functionality.
- Server defaults to port `5000`, configurable through `PORT`.

## Server request pipeline

`server/server.js` applies middleware and routers in this order:

1. `compression()`
2. `cors()`
3. `express.json({ limit: '10mb' })`
4. `express.urlencoded({ extended: true })`
5. Rate limit mounted at `/api/`: default 1,200 requests per IP per 15 minutes, configurable with `API_RATE_LIMIT_MAX`, with standard headers enabled and JSON `{ error }` responses on 429.
6. Static files: `/assets` → `client/public/assets`; `/uploads` → `client/public/uploads`.
7. Feature routers mounted beneath `/api`.
8. Global Express error handler returning JSON `{ error: ... }`.

The router mounts are `/api/auth`, `/api/users`, `/api/reservations`, `/api/tables`, `/api/ratings`, `/api/menu`, `/api/orders`, `/api/kds`, `/api/promotions`, `/api/rush`, and `/api/contact`. Keep those prefixes stable for the client. Vite proxies `/api` and `/uploads` to `http://localhost:5000` in development.

## Client contract rules

When adding/changing endpoints, preserve these integration conventions:

- Frontend uses relative URLs such as `/api/menu`; retain the `/api` prefix and avoid hard-coded backend hostnames in React code.
- Return JSON for success and errors. Errors should be `{ "error": "Human-readable message" }` with an appropriate HTTP status, so the client can inspect `response.ok` and parse the body.
- Keep existing successful payload shapes stable unless both client and server are updated together. Inspect the corresponding `fetch(...)` call before changing a response.
- For protected requests, client sends `Authorization: Bearer <token>`. `verifyToken` populates `req.user`; `verifyAdmin` requires `req.user.role === 'admin'`; `optionalAuth` continues without a user if the token is absent or invalid.
- Driver-only order endpoints use `verifyDriver`, requiring `req.user.role === 'driver'`.
- The client Navbar's mobile drawer links drivers to `/driver` (assigned deliveries/dashboard); this is client-side navigation and does not add or change an API route.
- Kitchen ticket endpoints use `verifyKitchen`, requiring `req.user.role === 'kitchen'`; the menu availability toggle allows either admin or kitchen staff.
- Preserve client-used field names and multipart field names. Existing upload forms use the field name `image`.
- Keep image URLs and stored DB paths consistent with the static Express mounts and client rendering.
- `localStorage` auth/cart state is frontend-only; server identity for protected operations must come from verified JWT claims, not a user ID trusted from request payload.

## Important existing asset path mismatch

The stated desired contract is that menu and promotion uploads live under `client/public/uploads` and are reachable as `/uploads/<filename>` (or a path beneath that directory). **Current code does not use one uniform upload location:**

- `server/routes/menuRoutes.js` writes menu images to `client/public/assets/images`. `menuController.js` saves DB paths like `assets/images/<filename>`, and Express exposes those through `/assets/...`.
- `server/routes/promotionRoutes.js` writes promo images to `client/public/uploads/promos`. Express exposes them through `/uploads/promos/...`.
- `server/server.js` statically serves `client/public/uploads` at `/uploads` and `client/public/assets` at `/assets`.

Therefore the current menu image path is `/assets/images/...`, while promotion images are `/uploads/promos/...`; neither feature uses a single flat `/uploads/filename.jpg` convention. Before implementing the requested unified distribution, update the upload destination, persisted URL/path values, and any cleanup code in controllers together, and verify how the React UI builds image URLs. Moving files or changing returned paths in only one layer will produce broken images. This document records the required contract and current divergence; it does not silently change the implementation.

## Route and authorization map

All endpoints below include the `/api` prefix.

| Router | Methods and paths | Current access behavior |
| --- | --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/google` | Public; registration always creates `role: "user"`, ignoring client-supplied roles; Google-created accounts default to user; returns login data |
| Users | `GET /users/profile`, `PUT /users/profile` | JWT required |
| Users | `GET /users/recommendations` | JWT required |
| Users | `GET /users/admin/segments` | Admin required |
| Employee management | `GET/POST /users/admin/employees`, `PUT/DELETE /users/admin/employees/:id` | Admin required; CRUD only for driver and kitchen roles; passwords are bcrypt-hashed and never returned |
| Menu | `GET /menu`, `GET /menu/favorites` | Public |
| Menu | `PUT /menu/:id/favorite`, `POST /menu`, `PUT /menu/:id`, `DELETE /menu/:id` | Admin required; menu writes accept multipart `image` where applicable |
| Menu | `PUT /menu/:id/availability` | Admin or kitchen role; toggles `menu_items.is_available` |
| Orders | `POST /orders` | Public with optional JWT authentication; order `user_id` comes only from the verified token and is null for guests; optional item `table_id` is validated and persisted for dine-in linking; delivery orders are atomically assigned an available driver or return 409 |
| Orders | `GET /orders?page=N&limit=10`, `PUT /orders/:id`, `DELETE /orders/:id` | Admin required; list is paginated by distinct order group |
| Orders | `GET /orders/user`, `GET /orders/status/:orderId` | JWT required; defined before wildcard routes; grouped results include a derived stage |
| Orders | `PUT /orders/:orderId/failure-read`, `PUT /orders/:orderId/picked-up` | Admin required; marks a failed delivery notification read or confirms an accepted, kitchen-ready driver pickup (Delivery) or customer pickup (Takeout) |
| Orders driver | `POST /orders/driver/:orderId/delivery-otp` | `verifyDriver`; generates/regenerates a five-minute 4-digit code for the assigned driver after pickup |
| Orders customer | `POST /orders/:orderId/verify-delivery-otp` | JWT required; owner-scoped verification completes delivery |
| Orders | `GET /orders/driver/assigned`, `PUT /orders/driver/:orderId/status` | Driver role required; list own active deliveries with address and stored destination coordinates and update delivery status |
| Orders | `GET /orders/driver/analytics` | Driver role required; completed delivery counts and fee/tip earnings summaries |
| Kitchen display | `GET /kds/orders?type=...`, `GET /kds/history` | Kitchen role required; active tickets (optionally filtered by order type) and recent ready/completed history |
| Kitchen delivered history | `GET /kds/delivered?page=N` | Kitchen role required; chronological delivered-order pages, fixed at 20 order groups per page |
| Kitchen display | `PUT /kds/orders/:id/status` with `{ status: "preparing"|"ready" }`, `PUT /kds/orders/items/:itemId/bump` | Kitchen role required; updates ticket stage or marks an eligible dine-in item cooked |
| Tables | `GET /tables`, `GET /tables/availability?date=YYYY-MM-DD&time_slot=HH:00` | Public table list/capacities and live status for one-hour blocks |
| Reservations | `GET /reservations/availability?date=YYYY-MM-DD` | Public |
| Reservations | `POST /reservations` | Optional JWT; guest booking supported |
| Reservations | `GET /reservations/user`, `PUT /reservations/:id/cancel` | JWT required; cancellation is owner-scoped and limited to Pending/Confirmed statuses |
| Reservations | `GET /reservations/admin`, `POST /reservations/admin/walkin`, `PUT /reservations/admin/:id/status` | Admin required |
| Ratings | `GET /ratings/item/:itemId?page=N&limit=5` | Public; paged item reviews with average/count and pagination metadata |
| Ratings | `POST /ratings/item/:itemId` | Optional JWT; current route permits guest reviews |
| Ratings | `GET /ratings/admin?page=N&limit=10&status=all|active|flagged&search=text`, `PUT /ratings/admin/:id/moderate` | Admin required; list includes pagination metadata and applies filters before paging |
| Promotions | `POST /promotions/validate` | Optional JWT |
| Promotions | `GET /promotions/announcements?location=...` | Public |
| Promotions | `GET/POST /promotions/admin`, `PUT/DELETE /promotions/admin/:id`, `PUT /promotions/admin/:id/active` | Admin required; create/update accepts multipart `image` |
| Rush | `GET /rush` | Public |
| Rush | `PUT /rush/override` | Admin required |
| Contact | `POST /contact` | Public; expects `name`, `email`, `message` |
| Contact | `POST /contact/order-issue` | JWT required; verifies `order_id` belongs to the caller, rejects missing/invalid or 7-day-old orders, and accepts `issue_tag` plus optional `message` (max 2000 chars); sends a red-accented HTML/text email through the existing SMTP contact transport |
| Contact | `GET /contact/mailtrap` | Admin required; reads Mailtrap configuration from environment |

## Route-to-controller layout

- `routes/authRoutes.js` → `controllers/authController.js`
- `routes/userRoutes.js` → `controllers/userController.js` and `controllers/crmController.js`
- `routes/menuRoutes.js` → `controllers/menuController.js`
- `routes/orderRoutes.js` → `controllers/orderController.js`
- `routes/kdsRoutes.js` → `controllers/kdsController.js`
- `routes/tableRoutes.js` → `controllers/tableController.js`
- `routes/reservationRoutes.js` → `controllers/reservationController.js`
- `routes/ratingRoutes.js` → `controllers/ratingController.js`
- `routes/promotionRoutes.js` → `controllers/promotionController.js`
- `routes/rushRoutes.js` → `controllers/rushController.js`
- `routes/contactRoutes.js` currently contains its contact submission and Mailtrap inbox handlers directly in the route module.

Most controllers combine request handling, validation/business rules, SQL, and response formatting. There is no separate service/repository layer apparent in the current layout. For new work, follow the neighboring feature's conventions unless deliberately refactoring it.

### Customer order status contract

`orderController.js` derives customer-facing order stages. For Dine-in orders, marking the ticket ready in the KDS automatically records completion (`completed = 1`) and transitions status to Ready without manual admin action. For Takeout orders, marking the ticket ready in the KDS transitions status to Ready; admin-only `PUT /api/orders/:orderId/picked-up` confirms customer pickup, sets `completed = 1`, and transitions the customer-facing order tracker to Completed. For delivery, kitchen `preparing`/`ready` status drives the early stages; driver acceptance alone remains at the kitchen stage. Admin-only `PUT /api/orders/:orderId/picked-up` locks the order; for Delivery it requires `kitchen_status = 'ready'` and `delivery_status = 'accepted'`, then sets `picked_up`. This yields customer-facing `out_for_delivery`. The assigned driver calls `POST /api/orders/driver/:orderId/delivery-otp` after pickup or while awaiting confirmation to generate/regenerate an OTP. The server uses a cryptographically random four-digit code, stores only its HMAC-SHA-256 digest using `DELIVERY_OTP_SECRET` (falling back to `JWT_SECRET`), expires it after five minutes, and returns plaintext only to the authenticated assigned driver. `POST /api/orders/:orderId/verify-delivery-otp` requires JWT ownership and `{ otp: "1234" }`; a valid, unexpired code marks the order delivered. Incorrect attempts are limited to five, and the fifth invalidates the code. Driver `PUT /api/orders/driver/:orderId/status` retains `{ status, reason?, details? }`: `accepted` is allowed only from `assigned`; `failed` is allowed only after pickup and clears any active OTP. Drivers cannot directly set `delivered`. Failure requires one of `Customer not available`, `Missing/destroyed one or more item`, or `Wrong order`, plus optional `details` up to 2000 characters. The ordinary admin order update endpoint cannot change delivery state. Kitchen status remains distinct from delivery status.

`GET /api/orders/status/:orderId` returns `order_id`, `order_type`, `completed`, `coordinates`, `address`, optional `table_id`/`table_number`/`table_zone`, delivery status/driver fields, `stage`, `created_at`, and `items` (item IDs, titles, and completion flags). During OTP verification the stage is `awaiting_delivery_otp`; status payloads never contain the OTP or hash. `GET /api/orders/user` groups line items by `order_id`, includes table and driver identity/status fields when assigned, and adds `stage`; the global delivery notice relies on that field. Keep both response forms aligned with `OrderTracker.jsx` and `GlobalDeliveryNotification.jsx`.

The API continues to return `stage: 'delivery_failed'` when a delivery fails. In `OrderTracker.jsx`, that existing stage replaces the final Delivered step with a red X Delivery Failed node; the normal successful path keeps its connected Delivered step. This is client presentation logic and does not alter the endpoint payload or status values.

`GET /api/orders/driver/assigned` remains protected by `verifyDriver` and returns active assigned/accepted/picked_up/awaiting_otp order groups. Each group includes `order_id`, `order_type`, `address`, `coordinates` (stored `"latitude,longitude"` string), `delivery_status`, `delivery_failure_reason`, `delivery_otp_expires_at` (never the OTP/hash), `created_at`, `customer_name`, and `items` (`title`, `quantity`, `notes`). The driver dashboard uses the existing destination fields to calculate and display a Google Maps Routes driving overview; this adds no GPS tracking.

`GET /api/orders?page=N&limit=10` returns `{ orders, pagination: { page, limit, total, totalPages, hasMore }, unreadFailureCount }`. It first pages distinct `order_id` groups, then fetches all line-item rows for those IDs so one order is never split across pages. Each row retains `delivery_failure_read_at`, `delivery_failure_reason`, and `delivery_failure_details`; `unreadFailureCount` counts distinct failed unread groups across all pages. Failed deliveries start unread because the driver workflow clears the read timestamp. Opening a failed order sends admin-only `PUT /api/orders/:orderId/failure-read`, which timestamps all failed rows in the group; the admin UI polls page 1 and lazily appends subsequent groups while displaying unread counts, the selected failure tag, and the driver's optional note in expanded details. This pagination change does not require a schema migration.

`GET /api/ratings/admin?page=N&limit=10&status=all|active|flagged&search=text` returns `{ reviews, pagination: { page, limit, total, totalPages, hasMore } }`. The count and page queries share the admin status/search filters; `limit` is clamped to 1–50 and defaults to 10. The admin review client requests 10 rows at a time and appends more when its list-end IntersectionObserver sentinel becomes visible. This pagination change does not require a schema migration.

`GET /api/ratings/item/:itemId?page=N&limit=5` returns `{ reviews, avg_rating, review_count, pagination: { page, limit, total, totalPages, hasMore } }`. Only unmoderated reviews are counted and returned, ordered newest first. The default batch size is five and `limit` is clamped to 1–50. The customer ProductCard fetches the first page when expanded and observes the bottom of its scrollable review list to fetch additional pages. No schema change is required.

`GET /api/orders/driver/analytics` summarizes completed deliveries for the authenticated driver, including total completed deliveries, earnings, delivery fees, tips, average tip, and daily/weekly aggregates. `POST /api/orders` calculates delivery fees from destination coordinates (₹30 base, plus ₹5/km beyond 3 km) and calculates tip from the allowed 0%, 10%, or 20% of the food subtotal; it validates any client-supplied `tip_amount`. Success includes `delivery_fee`, `tip_amount`, and `total`.

`POST /api/contact/order-issue` accepts only `Order not delivered`, `Missing/destroyed one or more item`, or `Wrong order` as `issue_tag`. It sends the authenticated customer's report using an HTML email with red issue styling and the existing SMTP transport; order ownership and a valid `created_at` less than seven days old are checked before sending. Orders at least seven days old are rejected with HTTP 403 and `{ error }`.

Kitchen routes are all protected by `verifyKitchen`; the frontend `/kitchen` and `/kitchen/history` pages also apply a kitchen-role route guard. `GET /api/kds/orders` returns active, incomplete tickets in pending/preparing states and supports the dashboard's order-type filter; `GET /api/kds/history` returns recent ready/completed tickets for Recall (excluding delivered deliveries). `GET /api/kds/delivered?page=N` returns delivered orders chronologically with a fixed page size of 20 and pagination metadata `{ orders, page, limit, total, totalPages }`. `PUT /api/kds/orders/:id/status` accepts `preparing` or `ready`, and refuses to mark an order ready while a dine-in item remains uncooked. Marking a Dine-in order ready in KDS automatically sets `completed = 1`; marking a Takeout order ready sets `kitchen_status = 'ready'`, awaiting admin pickup confirmation to set `completed = 1`; moving an order back to `preparing` resets `completed = 0`. Ticket rows expose kitchen status and item cooked state. Navbar active highlighting for the Kitchen link is client-side route state on `/kitchen` and does not change API authorization. The mobile drawer exposes the active KDS page and History links to kitchen users; this navigation change adds no backend endpoint or authorization exception. Menu availability is a separate admin/kitchen control; public menu reads expose `is_available`, and order creation rejects unavailable menu items.

Employee management uses the existing `users` table and roles. Public registration is customer-only; `GET/POST /api/users/admin/employees` and `PUT/DELETE /api/users/admin/employees/:id` are protected with `verifyAdmin`, constrain employee rows to `driver`/`kitchen`, hash passwords with bcrypt, and never return hashes. Creation requires name, email, password (minimum eight characters), and role; update accepts name/email plus optional password reset. No schema change or migration is needed because `users.role` already includes both employee roles. `/kitchen` keeps `verifyKitchen` for KDS APIs; admins see a UI card there that navigates to `/admin/management?view=employees`. This is a client navigation change and adds no backend endpoint or authorization exception.

`GET /api/tables/availability` validates `date` as `YYYY-MM-DD` and `time_slot` as an hourly start time from 09:00 through 21:00. It reports each table as `Free`, `Booked`, or `Occupied` for the overlapping one-hour interval. Pending/Confirmed reservations are Booked; a reservation in `Seated` status is Occupied. The reservation availability endpoint reports free table counts per slot, rather than remaining seats.

The reservation creation route uses `optionalAuth`, so the backend still permits guest requests; the current `Reservations.jsx` customer page requires sign-in before submission. `createReservation` checks the chosen table, capacity, and overlapping one-hour reservation inside a transaction, then stores the booking as Confirmed.

Dine-in orders may include `table_id` per line item. `createOrder` verifies that referenced table IDs exist and that a grouped order does not mix tables, stores the foreign key, and order read endpoints resolve `table_number` and `table_zone`. `POST /orders` remains available to guests and uses optional JWT authentication to associate signed-in orders with the token owner; client-supplied `user_id` values are ignored. Menu checkout allows guest dine-in orders and guest table reservations (name/email are required by reservation creation); an authenticated reservation is cancelled by its owner if subsequent order placement fails.

The driver movement and arrival notice are currently simulated in the browser and stored in localStorage for 45 seconds after the client observes `out_for_delivery`; the backend does not receive GPS or a separate driver-arrival event. Do not describe these as server-tracked or real-time GPS data.

## Authentication lifecycle

`server/middleware/authMiddleware.js`:

- `verifyToken` requires a `Bearer ` header, verifies the JWT, assigns claims to `req.user`, and responds `401` if absent or `403` if invalid/expired.
- `verifyAdmin` calls token verification and checks `req.user.role` for `admin`, otherwise responds `403`.
- `verifyDriver` requires a valid JWT and `req.user.role === 'driver'` for assigned-delivery endpoints.
- `verifyKitchen` requires a valid JWT and `req.user.role === 'kitchen'` for KDS routes. The availability route separately permits admin or kitchen roles.
- `optionalAuth` attaches a decoded user when a valid token is present; otherwise continues as guest.

The JWT secret uses `JWT_SECRET` with a hard-coded fallback in current code. For deployments, configure a strong secret through the environment and do not copy `.env` values into documentation. Auth controller issues tokens; frontend stores them and sends them on protected requests. Note: `menuRoutes.js` chains `verifyToken, verifyAdmin` on a few handlers even though `verifyAdmin` itself invokes `verifyToken`; this is redundant and should be handled carefully if middleware behavior is refactored.

## Database operations and schema

`server/config/db.js` creates a MySQL pool using `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` (defaults include `localhost`, `root`, and `freshbite_db`). Defaults are 20 active connections, a bounded queue of 100 waiting requests, and a 10-second connection timeout; deployments can tune these with `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, and `DB_CONNECT_TIMEOUT_MS`. Startup performs a connectivity check and releases its connection.

Schema source and migration locations:

- Base schema/data: `server/schema.sql`
- Reservation tables and FK: `server/migrations/20261013_table_reservations.sql`
- Order-to-table FK: `server/migrations/20261014_order_table_assignment.sql`
- Driver delivery workflow: `server/migrations/20261022_driver_delivery_workflows.sql`
- Admin pickup confirmation state: `server/migrations/20261028_admin_delivery_pickup.sql`
- Delivery OTP verification fields/state: `server/migrations/20261029_delivery_otp_verification.sql`
- Delivery fee/tip columns: `server/migrations/20261023_delivery_fees_tips.sql`
- Kitchen roles, KDS ticket fields, and menu availability: `server/migrations/20261025_kitchen_kds.sql`
- Admin unread delivery-failure tracking: `server/migrations/20261026_delivery_failure_read_tracking.sql`
- Driver failure text details: `server/migrations/20261027_delivery_failure_details.sql`
- Incremental promotion/rush changes: `server/migrations/phase4_promotions_advertising.sql`, `phase4_promotions_rush.sql`, `phase4_promo_advertising_state.sql`, and `phase4_promo_visuals.sql`.

Feature tables visible in the schema/controllers include users, menu items, ratings, orders, `tables`, reservations, promotions, order-promotion redemptions, announcements, and `app_settings`. `reservations.table_id` and `orders.table_id` reference `tables.id`; numeric IDs disambiguate repeated table numbers across zones. Existing databases need the reservation, order-table, driver-delivery, fee/tip, kitchen, failure-read, failure-details, admin-pickup, and delivery-OTP migrations applied in date order. The base schema includes equivalent fields for fresh setup. The driver migration adds the `driver` role and order driver workflow fields; the fee/tip migration adds delivery fees and tips; the kitchen migration adds the `kitchen` role, menu availability and kitchen status fields; later migrations add failure read/details, `picked_up`, and OTP fields/status. Controllers use parameter placeholders for SQL values. When editing DB behavior, update schema/migrations and controller queries as one change; review foreign keys and migration order before applying schema changes.

## Predictable JSON and error handling

The API rate limiter defaults to 1,200 requests per IP per 15-minute window and can be tuned with `API_RATE_LIMIT_MAX`; its 429 handler returns JSON `{ error }` rather than express-rate-limit's default plain-text response. Unknown `/api` paths and request parser errors also use the JSON error contract. The final handler in `server/server.js` preserves valid 4xx statuses and returns a generic 500 message for server errors. Transactional route handlers with dedicated pool connections use `asyncHandler` so acquisition/cleanup rejections reach this final handler rather than becoming unhandled Express 4 promises. The bounded pool queue returns pressure to the caller instead of accumulating unlimited waiters.

For new endpoints, use a consistent status/payload pattern:

- Success: stable JSON object or array matching the UI's expectations; use `201` for created resources where appropriate.
- Invalid input: `400` with `{ error: '...' }`.
- Missing/invalid auth: preserve `401`/`403` behavior from middleware.
- Missing records: `404` with `{ error: '...' }`.
- Unexpected server/database errors: `500` with `{ error: '...' }`.

Avoid returning raw HTML or plain text from an API endpoint. Keep details useful to the UI but do not leak credentials or sensitive SQL/environment information.

## Environment/configuration

`server/.env` is present locally. Environment keys used by source include:

- Server/database/auth: `PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `DELIVERY_OTP_SECRET`, `API_RATE_LIMIT_MAX`, `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, `DB_CONNECT_TIMEOUT_MS`.
- Contact email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
- Mailtrap inbox: `MAILTRAP_ACCOUNT_ID`, `MAILTRAP_INBOX_ID`, `MAILTRAP_API_TOKEN`.

This list names keys only. Never expose local values in docs, responses, commits, or logs. The contact submit handler currently uses SMTP configuration; the admin inbox handler calls the Mailtrap API.

## Frontend integration points to inspect before server changes

- `client/src/pages/Menu.jsx`: menu, rush, promotion validation, recommendations, dine-in seating prompt, table reservation, and order payloads. The Recommended Items section now uses arrow-button navigation (hiding the native scrollbar) instead of a raw browser scrollbar; `ProductGrid` accepts an optional `gridRef` prop for this purpose.
- `client/src/pages/AdminMenu.jsx` and `client/src/components/AdminEmployees.jsx`: menu/order admin behavior and employee management UI; manual admin completion controls have been removed from Order Management, and Takeout/Dine-in orders automatically reflect Ready status and completion upon kitchen readiness. The admin overview Orders metric card specifically calculates active pending deliveries from loaded order groups, excluding terminal completed/delivered and delivery_failed orders. Employee routes are admin-only, and passwords are never returned; the form supports password reset.
- `client/src/pages/KitchenDashboard.jsx`: KDS API caller for kitchen users; admins see an Add New Employee navigation card linking to the admin employee management view.
- `client/src/components/AdminPromotions.jsx`: promotion JSON/form fields and image uploads.
- `client/src/pages/Reservations.jsx`, `client/src/components/AdminReservations.jsx`, `client/src/components/ReservationFloorMap.jsx`: table availability, reservation payloads, shared floor map, and admin filters/status changes.
- `client/src/components/ProductCard.jsx`, `client/src/components/AdminReviews.jsx`: review payloads and moderation.
- `client/src/pages/Profile.jsx`, `client/src/pages/OrderTracker.jsx`: authenticated profile/history/status and customer order-issue report contracts.
- `client/src/components/ContactForm.jsx`: contact submission contract.

## Safe workflow for backend endpoint changes

1. Read the route, controller, schema/migration, and the React `fetch` caller together.
2. Record current method, path, auth requirement, content type, request fields, response shape, and image URL behavior.
3. Implement the route/controller/database change while preserving these contracts or update caller and server in the same change.
4. Ensure every failure path returns JSON `{ error: "..." }` with an appropriate status.
5. For uploaded assets, confirm the actual on-disk destination, saved DB value, served URL, and cleanup path all agree.

## New-chat handoff

> Read `PROJECT_CONTEXT.md` for the overall architecture, then read `CLIENT_CONTEXT.md` or `BACKEND_CONTEXT.md` based on the task. Preserve the existing frontend/backend API, auth, payload, and asset-path contracts; inspect relevant source files before changing behavior.
