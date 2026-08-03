# Local Development Guidelines

## 1. Code Repository Protocol
- **Git Ignore**: The `.env` file containing local database strings and secrets must remain heavily guarded and excluded via `.gitignore`.
- **Branching Strategy**: Use Git Flow. `main` is production-ready. `develop` is the integration branch. Features branch off `develop` as `feature/issue-name`.

## 2. Local Database Emulation
- **No Production Data**: Local development must strictly use a sanitized database dump (e.g., stripping patient PII from `detail_hosxp`).
- **Database Container**: It is highly recommended to run the local MariaDB/MySQL instance via Docker to isolate it from your host machine.
  ```yaml
  # Example docker-compose.yml snippet
  services:
    db:
      image: mariadb:10.5
      environment:
        MYSQL_ROOT_PASSWORD: root
        MYSQL_DATABASE: riskhospital_dev
  ```

## 3. Prisma Safety Directives
The RiskHRMS database schema is authoritative in MySQL. Prisma is strictly a downstream consumer in Phase 1.
- **DO NOT RUN `prisma db push`**: This will attempt to forcefully alter the legacy schema.
- **DO NOT RUN `prisma migrate dev`**: This will create a migrations table and attempt to take ownership of the schema.
- **DO RUN `prisma generate`**: This safely builds the TypeScript client locally based on `schema.prisma`.
