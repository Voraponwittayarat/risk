# Error Handling Guide

## 1. REST API Error Standards
All modern backend endpoints (Node.js) must conform to a standardized JSON error response structure. Never leak stack traces to the client in production.

### Standard Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The affected persons array must not be empty.",
    "details": [
      { "field": "affectedPersons", "issue": "Missing required field." }
    ],
    "timestamp": "2026-07-31T00:00:00Z"
  }
}
```

### HTTP Status Codes
- `400 Bad Request`: Validation failures, malformed input.
- `401 Unauthorized`: Missing or invalid session/JWT.
- `403 Forbidden`: Valid session, but insufficient privileges (e.g., Role 99 trying to edit).
- `404 Not Found`: Resource (e.g., Risk ID) does not exist.
- `500 Internal Server Error`: Unhandled exceptions, database disconnects.

## 2. Frontend Boundary Handling
- **React Error Boundaries**: All major feature modules (e.g., Incident Form, Dashboard) must be wrapped in React Error Boundaries to prevent total application crashes if a single component fails.
- **Graceful Degradation**: If the API fails to fetch Dashboard KPI data, display a user-friendly "Data temporarily unavailable" state rather than infinite loaders.

## 3. Backend Logging
- **Winston/Pino**: All errors >= 400 must be logged using a structured logger.
- **Alerting**: 500-level errors should trigger immediate administrative alerts (via webhook/email to the IT department).
