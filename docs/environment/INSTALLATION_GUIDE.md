# Installation Guide

This guide details the setup for the new modernized NestJS backend.

## 1. Prerequisites
Ensure you have met all requirements in `ENVIRONMENT_REQUIREMENTS.md` (Node.js 18+ and `@nestjs/cli` installed).

## 2. Setting Up the Backend
1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Variables:**
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and fill in the `DATABASE_URL` with a **Development Database** connection string. *Never use production credentials in local `.env`.*
   - **Important**: The `.env` file is excluded from Git. Do not commit it.

4. **Database Verification (Safe Sync)**
   - Because we are using the legacy database, we **must never run** `npx prisma db push` or `npx prisma migrate`.
   - To sync the Prisma schema with the legacy database:
     ```bash
     npx prisma db pull
     ```
     *(Only execute this against a confirmed development/staging database copy!)*
   - Generate the Prisma Client:
     ```bash
     npx prisma generate
     ```

## 3. Running the Server
- **Development Mode**:
  ```bash
  npm run start:dev
  ```
- **Production Build**:
  ```bash
  npm run build
  npm run start:prod
  ```
