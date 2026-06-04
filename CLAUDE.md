# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (Spring Boot, port 8080)
cd backend && mvn spring-boot:run

# Frontend (Vite + React, port 5173)
cd frontend && npm run dev

# Docker (full stack)
docker-compose up -d
```

No tests exist yet. `mvn test` and `npm test` will run defaults when tests are written. The project uses `ddl-auto: update` — Hibernate auto-manages schema, no migration scripts.

## Architecture

```
User ─→ Goal ─←→─ Task (reusable definition)
                   │
              TaskInstance (daily occurrence: TODO → IN_PROGRESS → COMPLETED)
                   │
              CheckInRecord (each pause/resume creates a new record, same instance)
                   │
              CheckInImage (uploaded per check-in)
```

**Key design decisions:**

- **Task vs TaskInstance**: Tasks are reusable templates. TaskInstances are daily instantiations — one per task per day. Deleting an instance resets that day; deleting a task removes the definition.
- **CheckInRecord vs TaskInstance**: One TaskInstance can have many CheckInRecords (pause creates a new record via `start`, resumes accumulation). The `complete` flag on `endCheckIn` controls whether the instance is set to COMPLETED (`complete=true`) or stays IN_PROGRESS (`complete=false` for pause).
- **FileStorageService** is an interface (strategy pattern). Only `LocalFileStorageService` exists. To add cloud storage, implement the interface and toggle via `file.storage.type`.

### Backend conventions

- All controllers return `ApiResponse<T>` (wraps data in `{ code, message, data }`).
- `GlobalExceptionHandler` catches `EntityNotFoundException` → 404, `IllegalArgumentException` → 400, validation errors → 400 with field messages.
- `userId` is hardcoded as `1L` in every controller — no auth system yet. User table and entity exist but are unused beyond `DataInitializer`.
- All entities extend `BaseEntity` (id, createdAt, updatedAt). JPA `ddl-auto: update` manages schema.
- DTOs use inner static classes for request/query objects (e.g., `CheckInDTO.StartRequest`).

### Frontend conventions

- `api/client.ts` interceptor unwraps `ApiResponse`: checks `code === 200`, returns `res.data`. All API functions receive unwrapped data directly.
- The checkin page (`CheckInPage.tsx`) is the most complex component. Key state: `activeInstanceId`, `activeRecordId`, `elapsed` (current session seconds), `accumulatedElapsed` (sum of previous records' durations). `timerDisplay = accumulatedElapsed + elapsed`.
- `end` API uses multipart: JSON `request` part + optional `images` parts. The `manual` API same.
- Ant Design theming is in `ThemeProvider.tsx` via `ConfigProvider` with Chinese locale.
- All routes except `/` are wrapped in `AppLayout` (sidebar navigation).
