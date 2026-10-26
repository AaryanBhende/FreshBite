# FreshBite Frontend Architecture and API Contract

This guide describes the current React client and its connection to the FreshBite backend. It is intended as a handoff for future UI and data-fetching work. Source code is authoritative if this guide and implementation diverge.

## Client stack

- React 19 with JSX and JavaScript; no TypeScript source/configuration is present.
- Vite 6 for local development and production builds.
- React Router 7 using browser-history SPA routing.
- Native browser `fetch` calls made directly in pages/components; no shared API client or state library is present.
- Styles are predominantly component/page CSS under `client/src/assets/style/`.
- Maps use Google Maps through `@react-google-maps/api`, configured with `VITE_GOOGLE_MAPS_API_KEY`. Google OAuth is provided through `@react-oauth/google`.

## Source layout

```text
client/
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── context/AuthContext.jsx
    ├── utils/deliveryTrip.js
    ├── utils/reservationSlots.js       # Shared hourly table reservation slots
    ├── pages/
    │   ├── Home.jsx
    │   ├── About.jsx
    │   ├── Menu.jsx
    │   ├── Favorites.jsx
    │   ├── Contact.jsx
    │   ├── Reservations.jsx
    │   ├── AuthModal.jsx
    │   ├── Profile.jsx
    │   ├── OrderTracker.jsx
    │   ├── DriverDashboard.jsx        # Driver-only assigned delivery workflow
    │   ├── KitchenDashboard.jsx       # Kitchen tickets and admin employee navigation card
    │   └── AdminMenu.jsx
    ├── components/AdminEmployees.jsx  # Admin employee CRUD and password reset
    ├── components/
    │   ├── ReservationFloorMap.jsx     # Shared customer/admin table map
    │   ├── Navbar.jsx, Footer.jsx, Hero.jsx
    │   ├── GlobalDeliveryNotification.jsx
    │   ├── ProductGrid.jsx, ProductCard.jsx
    │   ├── ContactForm.jsx, PromoAnnouncements.jsx
    │   └── AdminCRM.jsx, AdminPromotions.jsx,
    │       AdminReservations.jsx, AdminReviews.jsx
    └── assets/style/
        ├── kitchen.css
        └── reservationFloorMap.css
```

`client/dist/` is generated Vite output and should not be treated as editable source.

## App bootstrap and routing

`src/main.jsx` mounts the React root under `React.StrictMode` and `GoogleOAuthProvider`, imports the global `App.css`, and renders `App`.

`src/App.jsx` nests `AuthProvider` and `BrowserRouter`. Customer routes redirect admins to `/admin`, drivers to `/driver`, and kitchen staff to `/kitchen`; each role dashboard is role-gated. Admin, driver, and kitchen sessions get role-specific navigation and omit the customer footer and global delivery notice. The kitchen Navbar item is an end-matched `NavLink` to `/kitchen`: it highlights on the dashboard and does not highlight on `/kitchen/history`. `AuthContext` initializes the cached user defensively so malformed `freshbite_user` JSON does not break app startup. Current routes:

| Path | Screen | Main purpose |
| --- | --- | --- |
| `/` | `Home` | Homepage/featured content |
| `/about` | `About` | Cafe story and information |
| `/menu` | `Menu` | Browse/filter items, cart, location, promotions, checkout |
| `/favorites` | `Favorites` | Browse favorite menu items |
| `/contact` | `Contact` | Contact details and form |
| `/reservations` | `Reservations` | Slot availability and reservation form |
| `/profile` | `Profile` | Profile, order and reservation history, account/cart utilities |
| `/track/:orderId` | `OrderTracker` | Order status tracker for signed-in user |
| `/admin` | `AdminMenu` | Admin menu, order and management dashboard |
| `/admin/operations`, `/admin/marketing`, `/admin/management` | `AdminMenu` | Admin section entry paths, including Employee Management under Management (`/admin/management?view=employees`) |
| `/driver` | `DriverDashboard` | Driver-only assigned deliveries |
| `/kitchen` | `KitchenDashboard` | Kitchen-role order tickets and availability; admins see an Add New Employee card linking to Employee Management; active Navbar link |
| `/kitchen/history` | `KitchenHistory` | Kitchen-only chronological delivered-order history, 20 orders per page |

No explicit fallback route is currently defined. Screen transitions should use React Router navigation/links rather than full page reloads unless an external destination is intended.

## Local state and persistence

### Shared auth context

`src/context/AuthContext.jsx` exposes `{ user, token, login, logout }`.

- Token is initialized from `localStorage.freshbite_token`.
- User is loaded from `localStorage.freshbite_user` on mount.
- `login(user, token)` updates context and writes both storage entries.
- `logout()` clears both entries and context.

The bearer token is available to protected fetches through `useContext(AuthContext)`. Do not invent a second token key or trust a client-submitted user ID as authorization.

### Other browser storage keys

| Key | Current purpose | Main usage |
| --- | --- | --- |
| `freshbite_user` | Cached logged-in user JSON | `AuthContext` |
| `freshbite_token` | JWT bearer token | `AuthContext` |
| `freshbite_cart` | Menu cart JSON | `Menu`, with related cart helpers in `Profile` |
| `admin_read_msg_ids` | IDs of Mailtrap messages marked read by admin UI | `Navbar`, `AdminMenu` |
| `freshbite_delivery_trip_<orderId>` | Client-side trip start/arrival state | `utils/deliveryTrip.js`, `OrderTracker`, `GlobalDeliveryNotification` |

Treat stored JSON as untrusted/stale input and handle parse errors defensively when changing persistence. UI-only state (modal visibility, filters, loading states, feedback) otherwise lives in component `useState`.

## Network proxy and fetch conventions

`vite.config.js` configures the development server on port **5173** and proxies:

- `/api` to `http://localhost:5000`
- `/uploads` to `http://localhost:5000`

For FreshBite backend calls, continue using relative URLs such as `/api/menu`; do not hard-code `localhost:5000` in components. The app uses native `fetch` directly in the calling page/component and typically checks `response.ok`, parses JSON, and displays `data.error` on failure.

### Request headers and payloads

- JSON request bodies should use `headers: { 'Content-Type': 'application/json' }` and `body: JSON.stringify(payload)`.
- Protected routes should include `Authorization: Bearer ${token}` from `AuthContext`.
- Optional-auth flows (for example reservations) add the Bearer header only when a token exists.
- For Multer image requests, send `FormData` with the expected field `image`; do not manually set `Content-Type` because the browser must add the multipart boundary. Existing admin menu/promotion flows are the relevant integration points.
- GET requests usually do not need a Content-Type header. Keep their method/path/auth behavior aligned with the corresponding Express route.
- On failed responses, backend contract is JSON `{ error: "message" }`; parse and present that error rather than assuming every response succeeds.

There is an intentional third-party request in `Menu.jsx` for address geocoding through the OpenStreetMap Nominatim endpoint. The relative-URL convention applies to FreshBite backend API calls; preserve that external geocoder behavior unless replacing it deliberately.

Google Maps is used by the menu location picker, Contact map, and delivery tracker. Maps show loading/error states when the API script is unavailable. The tracker requests the Google Maps `routes` library to calculate a driving path.

Delivery assignment and outcome are server-backed: order creation automatically assigns an available driver in its transaction (or returns 409 when all drivers are busy), then the driver accepts or reports delivery success/failure. Acceptance moves the customer order to `out_for_delivery`. Driver failure reports include a fixed tag and optional explanatory text; the admin sees both in the expanded failed order, and unread failures remain visible until opened. The moving marker and arrival notice remain simulated in the frontend: `deliveryTrip.js` stores a start timestamp and the tracker interpolates the marker for `DELIVERY_TRIP_DURATION_MS` (45 seconds). This is browser/localStorage state, not GPS or a live driver location.

## Page/component responsibilities and backend dependencies

| UI module | Responsibilities and important network behavior |
| --- | --- |
| `pages/Menu.jsx` | Fetches `/api/menu`, `/api/orders`, `/api/rush`; fetches `/api/users/recommendations` with Bearer JWT; validates promotions with JSON POST; creates orders with JSON POST (delivery checkout is assigned a driver by the backend, which returns 409 if none are available); persists cart; geocodes delivery address externally; renders Google Map location selection. Dine-in checkout prompts for an existing table or opens the shared live availability map. A selected reservation includes date/hour/guest count, creates a reservation on order submission, and sends table ID/display details with order items. Delivery checkout offers 0%, 10%, or 20% tip choices and displays the distance-based delivery fee. If order creation fails, it attempts to cancel the new reservation. |
| `pages/AuthModal.jsx` | Register/login at `/api/auth/register` or `/api/auth/login`; public registration creates customer accounts only, Google credential goes to `/api/auth/google`; on success calls context `login(data.user, data.token)`. |
| `pages/Reservations.jsx` | Requires sign-in in the customer UI, loads hourly `/api/reservations/availability?date=...` and `/api/tables/availability?date=...&time_slot=...`, refreshes table status periodically, and POSTs JSON reservation with `table_id`; uses the shared map and caps party size at table capacity. The API itself still supports guest reservations through `optionalAuth`. |
| `pages/Profile.jsx` | Uses authenticated profile, order-history, and reservation-history APIs; updates profile; displays linked table details and lets the owner cancel Pending/Confirmed reservations. |
| `pages/OrderTracker.jsx` | Calls `/api/orders/status/:orderId` with Bearer token and polls every 5 seconds while signed in; renders stage-specific dine-in/takeout UI or Google Maps delivery route and simulated driver progress. The red-accent Report Order Issues form posts a selected issue tag and optional details to `/api/contact/order-issue`. |
| `pages/DriverDashboard.jsx` | Deliveries view calls `/api/orders/driver/assigned` every five seconds; accepts assigned deliveries, marks accepted deliveries delivered, or reports failure with a fixed reason tag and optional text details (up to 2000 characters). Analytics view loads `/api/orders/driver/analytics` and shows delivery earnings, tips, and daily/weekly summaries. |
| `pages/KitchenDashboard.jsx` | Polls active kitchen tickets and displays active and Recall queues as horizontal scrolling cards; supports order-type filters, dine-in item bumping, and menu availability controls. |
| `pages/KitchenHistory.jsx` | Fetches `/api/kds/delivered?page=N` and displays delivered order groups 20 at a time with Previous/Next controls. |
| `pages/KitchenDashboard.jsx` | Kitchen-only dashboard polls `/api/kds/orders` every five seconds, supports order-type filters and recent history/recall, bumps dine-in items, and toggles menu availability. Admins visiting `/kitchen` see a responsive Add New Employee card linking to `/admin/management?view=employees`; kitchen users cannot create accounts. |
| `components/GlobalDeliveryNotification.jsx` | Rendered for customer sessions; polls `/api/orders/user` every 10 seconds while authenticated, listens for arrival events and cross-tab storage updates, then links to the tracker. |
| `utils/deliveryTrip.js` | Persists simulated trip timing and arrival-notified state per order in localStorage and dispatches a same-tab custom event. |
| `pages/Favorites.jsx` | Fetches `/api/menu/favorites`. |
| `pages/AdminMenu.jsx` | Admin dashboard; menu CRUD/image uploads, orders, rush override, and Mailtrap inbox. Order Management requests `/api/orders?page=N&limit=10`, appends complete order groups at an IntersectionObserver sentinel, and polls page 1 every 10 seconds while retaining older loaded groups. It shows unread failed-delivery count/tags and marks a failure read when its row is opened. |
| `components/AdminEmployees.jsx` | Admin-only Drivers and Kitchen Staff listings with create/edit/delete controls and an add form. Passwords remain bcrypt-hashed and are never returned; the list displays masked status and admins can reset a password in Edit. |
| `components/ProductCard.jsx` | Loads five item reviews at a time when expanded, appending the next page with an IntersectionObserver rooted in the scrollable review list. Keeps the full item rating summary, and posts reviews with Bearer auth when available. Unavailable items display an unavailable state and cannot be added or expanded. |
| `components/ProductGrid.jsx` | Renders menu cards and keeps the expanded card synchronized with menu availability updates. |
| `components/PromoAnnouncements.jsx` | Public announcement fetch by display location. |
| `components/AdminPromotions.jsx` | Promotion CRUD/activation and image upload. |
| `components/AdminReservations.jsx` | Admin reservations listing/status updates, live shared floor map, and walk-in creation. Its walk-in modal is wide and scrollable within the viewport so the form and map remain accessible. |
| `components/ReservationFloorMap.jsx` | Shared reference-inspired Patio, Indoor, and Bar floor layout; free tables are selectable in customer flows, while booked/occupied tables display status details and reservation time. Bar positions are compact one-seat spots. The `admin` prop makes every table read-only and shows guest names when available. |
| `utils/reservationSlots.js` | Provides one-hour slot values and formatted display ranges. |
| `components/AdminReviews.jsx` | Admin review listing/moderation. Sends `page`, `limit=10`, selected `status`, and submitted `search` filters to the protected admin endpoint, then appends further matching reviews as the list-end sentinel enters view. |
| `components/AdminCRM.jsx` | Customer segment fetch, protected by Bearer token. |
| `components/ContactForm.jsx` | JSON POST `{ name, email, message }` to `/api/contact`; prefills name/email from current user when available. |
| `components/Navbar.jsx` | Role-specific customer/admin/driver/kitchen navigation with a shared mobile hamburger drawer. Driver drawer navigation links to Assigned Deliveries (`/driver`); kitchen drawer navigation links to active KDS tickets (`/kitchen`) and History (`/kitchen/history`). The kitchen active-ticket link uses `NavLink` with `end` for active highlighting on `/kitchen` only and polls `/api/kds/orders` for its count. Drawer closes on route changes, backdrop clicks, Escape, and desktop resizing. Admin Mailtrap inbox/read-state behavior remains here. |

## Important payload/response expectations visible in the client

- Auth success: `data.user` and `data.token`; public registration always assigns `role: user`, irrespective of any client-supplied role. Driver and kitchen accounts are created through admin-only employee management.
- Reservation availability: `data.slots` array; reservation success: `data.reservation`.
- Table APIs: `GET /api/tables` returns `{ tables }`; `GET /api/tables/availability?date=YYYY-MM-DD&time_slot=HH:00` returns `{ date, time_slot, tables }`, including `table_status` (`Free`, `Booked`, `Occupied`) and table identity/capacity.
- A table becomes `Occupied` when its reservation status is `Seated`; Pending and Confirmed reservations show as `Booked`. The floor-map component consumes these statuses, and customer selection is limited to Free tables.
- Customer cancellation: `PUT /api/reservations/:id/cancel` uses Bearer auth; only the reservation owner can cancel a Pending or Confirmed booking.
- Promotion validation: client sends `promo_code`, `cart_total`, and `user_id` (which is a client value, not authorization); UI reads discount fields including `discount` or `discount_amount` depending on the call path. Check backend/controller and both call sites before changing this response.
- Order creation: JSON object with `items` array plus `promo_code`. Items include normal line-item fields and optional address/coordinates and `table_id`; dine-in items also carry table display metadata and reserved guest count. All rows in a grouped order must use the same table. The server stores the FK `table_id` and resolves table number/zone for read responses; the associated reservation stores the selected guest count and slot.
- Delivery order creation also sends `tip_percent` (0, 10, or 20) and `tip_amount`; the server calculates the authoritative fee from destination coordinates and validates the tip. Success includes `delivery_fee`, `tip_amount`, and `total`. Fee and tip are stored once on the first line item in an order group.
- Order history/status: `/api/orders/user` and `/api/orders/status/:orderId` include table ID and table number/zone when assigned, plus driver status fields on deliveries. Status also returns `order_id`, `order_type`, `completed`, `coordinates`, `address`, `stage`, `created_at`, and `items`; stages include `placed`, `preparing`, `ready`, `out_for_delivery`, `completed`, and `delivery_failed`.
- Kitchen order state: order history/status also include `kitchen_status` (`pending`, `preparing`, `ready`). It drives customer-facing preparation stages ahead of the age-based fallback; delivery progression continues to use delivery status. Item completion (`is_cooked`) is tracked independently for kitchen bumping.
- Kitchen APIs: `/api/kds/orders` returns active kitchen tickets and accepts an optional order-type filter; `/api/kds/history` returns recent ready/completed tickets for Recall; `/api/kds/delivered?page=N` returns chronological delivered orders with a fixed page size of 20 and `{ orders, page, limit, total, totalPages }` metadata. All KDS routes require a kitchen-role Bearer token. Active and Recall queues scroll horizontally; delivered history is a separate page linked from the kitchen Navbar. `PUT /api/kds/orders/:id/status` accepts `preparing` or `ready`; ready is rejected while any dine-in item is uncooked. `PUT /api/kds/orders/items/:itemId/bump` marks an eligible dine-in item cooked.
- Menu availability: public `/api/menu` records include `is_available`; `PUT /api/menu/:id/availability` toggles it for admin or kitchen staff. Unavailable items remain visible but cannot be added to cart.
- Employee admin API: `GET/POST /api/users/admin/employees`, `PUT/DELETE /api/users/admin/employees/:id`; all require an admin Bearer token. Create accepts `{ name, email, password, role: "driver"|"kitchen" }`; update accepts name/email and an optional password reset. Password hashes are not exposed by the list API.
- Driver API: delivery drivers are assigned automatically during `POST /api/orders`; no admin manual assignment API is exposed. A driver polls `GET /api/orders/driver/assigned`, loads `GET /api/orders/driver/analytics`, and updates via `PUT /api/orders/driver/:orderId/status` with `{ status, reason?, details? }`; `reason` must be one of the three driver failure tags when `status` is `failed`, and optional `details` is limited to 2000 characters. Admin clients can mark a failure read with `PUT /api/orders/:orderId/failure-read`. Delivery stages include `ready`, `out_for_delivery`, `completed`, and `delivery_failed`; accepted deliveries enter the customer trip simulation.
- Contact: `POST /api/contact` takes `name`, `email`, and `message`. `POST /api/contact/order-issue` requires Bearer auth and takes `{ order_id, issue_tag, message? }`; the tag must be one of the three customer issue tags and the order must belong to the caller.
- Admin menu/promotion upload: multipart form with file field `image`; match remaining form fields to the respective controllers.
- Admin order pagination: `GET /api/orders?page=N&limit=10` returns `{ orders: [...line item rows], pagination: { page, limit, total, totalPages, hasMore }, unreadFailureCount }`. Pagination is applied to distinct order groups first; the response includes every line item for each group and retains delivery failure read/reason/details fields. `unreadFailureCount` counts unread failed order groups across all pages. The admin client appends/deduplicates groups and refreshes page 1 during its existing polling.
- Admin review pagination: `GET /api/ratings/admin?page=N&limit=10&status=all|active|flagged&search=text` returns `{ reviews: [...], pagination: { page, limit, total, totalPages, hasMore } }`. Status/search filtering happens before the count and page query, so lazy loading covers all matching reviews rather than only the currently rendered batch.
- Customer item reviews: `GET /api/ratings/item/:itemId?page=N&limit=5` returns `{ reviews, avg_rating, review_count, pagination: { page, limit, total, totalPages, hasMore } }`. The expanded ProductCard fetches page 1 on open and requests more when the bottom of its review scroller enters view; review submission refreshes the first page and summary.

Do not infer that a similarly named field is interchangeable. Search the caller and server controller together before changing a field or response shape.

## Asset URL considerations

Vite's proxy includes `/uploads` but not `/assets`. Files in `client/public` are normally served directly by Vite during frontend development. Express serves `/assets` from `client/public/assets` and `/uploads` from `client/public/uploads`.

Current backend image storage is mixed: menu images are saved in `client/public/assets/images` and DB paths use `assets/images/...`; promotion images are saved in `client/public/uploads/promos` and exposed under `/uploads/promos/...`. Coordinate UI URL resolution with `BACKEND_CONTEXT.md` before changing image paths. Avoid adding a path prefix twice (e.g. converting a stored `assets/...` path to `/assets/assets/...`).

## Client configuration

The Google Maps components read `VITE_GOOGLE_MAPS_API_KEY` from Vite's `import.meta.env`. Configure it in a local client env file for development and in the frontend build environment for deployment. Keep actual key values out of these context docs and source control; only the variable name belongs here.

## UI implementation conventions

- Route-level screens live in `pages/`; reusable visual behavior belongs in `components/`.
- Auth state is shared through context; most other state is local to the screen.
- Styles are imported near the relevant page/component; global styles come from `App.css`.
- Loading, empty, error, and success states are managed by the calling component rather than a common request abstraction.
- Menu filtering uses item categories and local search state; cart totals and promotion status are derived from local cart state.
- If introducing a shared hook or API utility, preserve the existing relative URLs, auth header conventions, JSON error parsing, and upload boundary behavior.

## New-chat handoff

> Read `PROJECT_CONTEXT.md` for the overall architecture, then read `CLIENT_CONTEXT.md` or `BACKEND_CONTEXT.md` based on the task. Preserve the existing frontend/backend API, auth, payload, and asset-path contracts; inspect relevant source files before changing behavior.
