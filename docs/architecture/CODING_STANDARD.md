# Coding Standards

## 1. Backend Standards (NestJS)
- **Framework**: NestJS (Enterprise-grade Node.js framework).
- **Language**: TypeScript exclusively. `strict: true` must be enabled in `tsconfig.json`.
- **Clean Architecture Principles**:
  - *Controllers*: Must remain extremely thin. Their only responsibility is handling HTTP parsing, routing, and DTO validation.
  - *Services*: Contain all pure business logic and rule enforcement. They must be independently testable.
  - *Repositories/ORM*: Database access must be strictly isolated behind Prisma Service abstractions. Controllers should never interact with Prisma directly.
- **Documentation**: Swagger/OpenAPI documentation must be generated automatically using `@nestjs/swagger` decorators on all controllers and DTOs.
- **Linting & Formatting**: Enforced via ESLint and Prettier.

## 2. Frontend Standards (React)
- **Framework**: React (Next.js or Vite) using functional components and Hooks.
- **Styling**: TailwindCSS for utility-first styling. Component libraries (e.g., shadcn/ui) for complex interactive elements.
- **State Management**: React Query (TanStack Query) for remote data fetching.
- **Directory Structure**: Feature-based architecture over type-based grouping.

## 3. General Documentation Standard
- Complex business logic must feature JSDoc comments explaining the *why*, not just the *what*.
- ADRs must be written for any architectural deviations.
