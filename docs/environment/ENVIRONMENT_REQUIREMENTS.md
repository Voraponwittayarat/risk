# Environment Requirements

## Backend (Node.js REST API)
- **Runtime**: Node.js v18.x LTS or higher
- **Package Manager**: npm v9.x or higher, or yarn v1.22+
- **TypeScript**: TypeScript v5.x
- **Framework CLI**: `@nestjs/cli` v10.x
- **Database ORM**: Prisma CLI v5.x
- **Environment OS**: Linux (Ubuntu 22.04 LTS), macOS, or Windows 10/11 (WSL2 recommended for Prisma edge cases).

## Frontend (React SPA - Future Phase)
- **Framework**: Node.js v18.x
- **Bundler**: Vite v4+ or Next.js v13+
- **Browser**: Modern evergreen browsers (Chrome 100+, Firefox 100+, Edge 100+). No IE11 support.

## Legacy Backend (Yii2 - Maintenance)
- **Runtime**: PHP 5.4+ (PHP 7.4+ highly recommended for security)
- **Web Server**: Apache 2.4+ or Nginx 1.18+
- **Database**: MySQL 5.5 / MariaDB 5.5

## Infrastructure / Network
- **Outbound Access**: The backend server must have outbound HTTPS (port 443) access to `notify-api.line.me` (or `api.line.me` for Messaging API) for notifications.
