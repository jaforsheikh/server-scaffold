# Scaffold Blood Donation Server

## Project Purpose

Scaffold Blood Donation Server is the backend API for a MERN stack blood donation platform. It manages authentication, JWT token verification, role-based access control, user management, donor search, donation request management, dashboard statistics, and protected API routes for donors, volunteers, and admins.

## Live Server URL

https://server-scaffold.vercel.app

## Health Check

https://server-scaffold.vercel.app/health

## Key Features

* Express.js REST API server
* MongoDB Atlas database connection
* Better Auth email/password authentication
* JWT token generation and verification for private APIs
* Role-based access control for Admin, Donor, and Volunteer
* User status management: active and blocked
* Admin user management API
* Donor search API by blood group, district, and upazila
* Donation request CRUD API
* Public pending donation request API
* Private donation request details API
* Donation confirmation flow with status change from pending to inprogress
* My donation requests API with pagination and status filter
* All blood donation requests API for admin and volunteer
* Dashboard summary API for statistics and recent requests
* Secure environment variable usage for MongoDB URI, auth secret, JWT secret, and client URL
* CORS configured for production frontend

## User Roles

### Admin

* Can view and manage all users
* Can block and unblock users
* Can make users volunteer or admin
* Can view, edit, delete, and update all donation requests
* Can access dashboard statistics

### Donor

* Can create donation requests if active
* Can view and manage own donation requests
* Can update own profile
* Can donate to pending blood requests

### Volunteer

* Can view all donation requests
* Can update donation request status only
* Can access dashboard statistics

## API Endpoints Overview

### Health

* `GET /health`

### Authentication

* `POST /api/auth/sign-up/email`
* `POST /api/auth/sign-in/email`
* `GET /api/auth/get-session`
* `POST /api/auth/sign-out`

### JWT

* `POST /api/jwt`

### Users

* `GET /api/users/me`
* `PATCH /api/users/me`
* `GET /api/users/search-donors`
* `GET /api/users`
* `PATCH /api/users/:id/status`
* `PATCH /api/users/:id/role`

### Donation Requests

* `POST /api/donation-requests`
* `GET /api/donation-requests/public`
* `GET /api/donation-requests/my`
* `GET /api/donation-requests/all`
* `GET /api/donation-requests/:id`
* `PATCH /api/donation-requests/:id`
* `PATCH /api/donation-requests/:id/donate`
* `PATCH /api/donation-requests/:id/status`
* `DELETE /api/donation-requests/:id`

### Dashboard

* `GET /api/dashboard/summary`

## Technologies Used

* Node.js
* Express.js
* MongoDB
* Better Auth
* JSON Web Token
* CORS
* dotenv
* Vercel Serverless Deployment

## NPM Packages Used

* express
* mongodb
* better-auth
* jsonwebtoken
* cors
* dotenv
* nodemon

## Environment Variables

Create a `.env` file in the server root and add:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_SECRET=your_better_auth_secret
MONGODB_URI=your_mongodb_connection_string
DB_NAME=Scaffold
JWT_SECRET=your_jwt_secret
```

For production, set environment variables in Vercel:

```env
CLIENT_URL=https://client-scaffold-six.vercel.app
BETTER_AUTH_URL=https://server-scaffold.vercel.app
BETTER_AUTH_SECRET=your_better_auth_secret
MONGODB_URI=your_mongodb_connection_string
DB_NAME=Scaffold
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

## Local Installation

```bash
npm install
npm run dev
```

## Production Deployment

The server is deployed on Vercel. After pushing changes to GitHub, Vercel automatically redeploys the backend.

## Security Notes

* MongoDB credentials are stored in environment variables.
* Better Auth secret is stored in environment variables.
* JWT secret is stored in environment variables.
* Private API routes are protected with JWT verification.
* Admin and volunteer APIs are protected with role-based middleware.
* Blocked users cannot create donation requests.

## Admin Access

Admin role is assigned manually from the MongoDB database by updating the user document:

```json
{
  "role": "admin",
  "status": "active"
}
```
