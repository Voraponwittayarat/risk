# RiskHRMS Node.js Backend

This is the modernized REST API for the RiskHRMS system, built with Node.js, TypeScript, and Prisma ORM.

## Architecture Principles
- **Strangler Pattern**: This API runs concurrently with the legacy Yii2 application.
- **Read/Write Safety**: This backend reads from and writes to the legacy database (`riskhospital`) using exact ORM mappings to preserve backward compatibility. 
- **No Schema Migrations**: The database schema is currently owned by the legacy system. Do not execute Prisma migrations here.

## Quick Start
1. Ensure Node.js 18+ is installed.
2. `npm install`
3. `cp .env.example .env` and configure your local development database.
4. `npx prisma generate`
5. `npm run dev`

See `/docs/environment/` for full installation and development guidelines.
