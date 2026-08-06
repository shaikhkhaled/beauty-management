# Beauty Parlor Management System
### Node.js REST API with Full Test Suite (Playwright · Mocha · Chai · Sinon)

[![CI](https://github.com/shaikhkhaled/beauty-parlor-management/actions/workflows/test.yml/badge.svg)](https://github.com/shaikhkhaled/beauty-parlor-management/actions)

A complete backend API for a beauty parlor management system with a full SDET-grade test suite covering unit, API, and E2E layers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 + Express.js |
| Database | MySQL 8 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Unit Tests | Mocha + Chai + Sinon |
| API Tests | Mocha + Chai + Sinon + Supertest |
| E2E Tests | Playwright |
| CI/CD | GitHub Actions |

---

## Project Structure

```
beauty-parlor-management/
├── src/
│   ├── app.js                    # Express app entry point
│   ├── db/
│   │   ├── connection.js         # MySQL connection pool
│   │   └── setup.js              # DB schema + seed data
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication + role check
│   │   └── validate.js           # Input validation middleware
│   ├── controllers/
│   │   ├── authController.js     # register / login / profile
│   │   ├── appointmentController.js
│   │   ├── paymentController.js
│   │   └── serviceController.js
│   └── routes/
│       ├── auth.js
│       ├── appointments.js
│       ├── payments.js
│       └── services.js
├── tests/
│   ├── unit/
│   │   ├── validate.test.js           # Middleware unit tests (Sinon stubs)
│   │   ├── authController.test.js     # Auth logic unit tests
│   │   └── appointmentController.test.js
│   ├── api/
│   │   ├── auth.api.test.js           # Full HTTP tests via Supertest
│   │   └── appointment.api.test.js    # Appointment + payment API tests
│   └── e2e/
│       └── registration.spec.js       # Playwright E2E journeys
├── .github/
│   └── workflows/
│       └── test.yml              # GitHub Actions CI pipeline
├── playwright.config.js
├── .env.example
└── README.md
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/shaikhkhaled/beauty-parlor-management.git
cd beauty-parlor-management
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=beauty_parlor
JWT_SECRET=your_secret_key
```

### 3. Create Database

```sql
-- In MySQL:
CREATE DATABASE beauty_parlor;
```

### 4. Run DB Setup

```bash
npm run db:setup
```

### 5. Start Server

```bash
npm start         # production
npm run dev       # with nodemon (auto-reload)
```

---

## Running Tests

```bash
# Run all unit + API tests (no DB needed — DB is stubbed)
npm test

# Run only unit tests
npm run test:unit

# Run only API tests
npm run test:api

# Run E2E tests (requires server + DB running)
npm run test:e2e

# Run everything
npm run test:all
```

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, get JWT token |
| GET | `/api/auth/profile` | Bearer token | Get current user profile |

### Appointments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/appointments` | Customer | Book new appointment |
| GET | `/api/appointments/my` | Customer | Get my appointments |
| GET | `/api/appointments/:id` | Customer/Admin | Get by ID |
| PATCH | `/api/appointments/:id/status` | Admin only | Update status |
| DELETE | `/api/appointments/:id/cancel` | Customer/Admin | Cancel appointment |

### Payments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payments` | Customer | Make payment |
| GET | `/api/payments/appointment/:id` | Customer | Get payment by appointment |
| GET | `/api/payments` | Admin only | Get all payments |

### Services & Staff
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/services` | None | List all services |
| GET | `/api/services/staff` | None | List all staff |
| GET | `/api/services/:id` | None | Get service by ID |
| POST | `/api/services` | Admin only | Create service |

---

## Test Architecture

### Why Three Layers?

```
                    Slowest / Most realistic
        E2E         Real browser → Real API → Real DB
      ───────
      API Tests     HTTP requests → Real routes → Stubbed DB
    ───────────
    Unit Tests      Pure functions → Sinon stubs → No I/O
                    Fastest / Most isolated
```

### Key Testing Decisions

**Unit tests stub the DB** so they:
- Run in milliseconds (no I/O)
- Never fail due to DB availability
- Test pure business logic in isolation

**API tests use Supertest + Sinon** so they:
- Test the full HTTP layer (routing, middleware, auth, validation)
- Still don't need a live database
- Catch integration bugs between middleware and controllers

**E2E tests with Playwright** cover:
- Complete user journeys end-to-end
- Real database interactions
- The full booking → payment workflow

---

## Example API Usage

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Priya Sharma","email":"priya@test.com","phone":"9876543210","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"priya@test.com","password":"secret123"}'

# Book Appointment (use token from login)
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"staff_id":1,"service_id":1,"appt_date":"2026-09-15","appt_time":"10:00"}'
```

---

## Author

**Shaikh Abdul Khaled** — QA Engineer | SDET  
[GitHub](https://github.com/shaikhkhaled) · [LinkedIn](https://linkedin.com/in/shaikh-khaled-184725259)
