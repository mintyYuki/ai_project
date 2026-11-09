# Technical Specification (SPEC.md)

## 1. Overview & Roles
The system is a service booking and management platform with three distinct roles:
- `client` (Car owner)
- `mechanic` (Service provider/worker)
- `administrator` (System manager)

Roles are represented as enums in the database in English (`client`, `mechanic`, `administrator`).

---

## 2. Database Schema (PostgreSQL)
- Database runs on PostgreSQL, standard port, managed via systemd.
- Connection user: `postgres`, no password.
- Transactions are enforced on backend operations to prevent partial/corrupted states.
- Field types: `VARCHAR` is preferred over `TEXT` where lengths are bounded. `ENUM` types are preferred over `VARCHAR` where values are strictly known beforehand.
- Foreign key relations are established between tables.

### 2.1. `users`
Stores system user credentials and roles.
- `id`: Primary Key
- `email`: `VARCHAR` (Unique, not null)
- `password`: `VARCHAR` (Hashed using SHA-1 or stronger algorithm, e.g., bcrypt/argon2/sha1 minimum; avoiding collision-prone legacy algorithms like plain MD5)
- `role`: ENUM (`client`, `mechanic`, `administrator`)
- `created_at`: Timestamp

### 2.2. `refresh_tokens`
Helps manage JWT refresh tokens and session revocation.
- `id`: Primary Key
- `user_id`: Foreign Key referencing `users(id)`
- `token_hash`: `VARCHAR` (Hashed refresh token)
- `expires_at`: Timestamp
- `revoked`: `BOOLEAN` (For revoking tokens without deleting the row)

### 2.3. `services`
Stores available service descriptions.
- `id`: Primary Key
- `name`: `VARCHAR` (Service name)
- `duration_minutes`: Integer (Duration of the service in minutes)
- `price`: Numeric / Decimal

### 2.4. `mechanics`
Stores information specific to mechanics.
- `id`: Primary Key
- `user_id`: Foreign Key referencing `users(id)`
- `specialization`: `VARCHAR`

### 2.5. `bookings`
Stores booking and appointment information.
- `id`: Primary Key
- `client_id`: Foreign Key referencing `users(id)` (or client reference)
- `mechanic_id`: Foreign Key referencing `mechanics(id)`
- `service_id`: Foreign Key referencing `services(id)`
- `start_at`: Timestamp
- `end_at`: Timestamp (Calculated based on service `duration_minutes` without hacks)
- `status`: ENUM (`created`, `confirmed`, `completed`, `cancelled`)

*Business rule:* A single mechanic's bookings must not overlap in time (`start_at` / `end_at` intervals must not intersect for the same `mechanic_id`).

### 2.6. `action_logs`
Audit log for tracking system actions.
- `id`: Primary Key
- `user_id`: Foreign Key referencing `users(id)`
- `action`: `VARCHAR`
- `details`: `VARCHAR` (or structured field if applicable)
- `created_at`: Timestamp

---

## 3. API & Backend Requirements

### 3.1. Authentication & Security
- JWT-based authentication using two tokens: `access` token and `refresh` token.
- `Logout` endpoint revokes the refresh token (`revoked = true`).
- All critical multi-step operations are wrapped in database transactions.

### 3.2. Endpoints & Functionality
- **Catalog:** Public or authenticated access to view available services and mechanics.
- **Bookings Creation:** Allows clients to book services. Includes strict validation logic to check that the selected mechanic is not busy during the requested time slot (preventing time overlaps).
- **Client Panel:** View personal bookings and cancel them.
- **Mechanic Panel:** View assigned bookings and update their statuses.
- **Administrator Panel:** Comprehensive catalog management, user management, and a SQL report exportable to CSV.
