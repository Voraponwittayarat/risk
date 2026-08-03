# Security Architecture

## 1. Vulnerability Remediation (Legacy Phase-out)
The new Node.js / Prisma architecture inherently resolves several legacy vulnerabilities:
- **SQL Injection**: Prisma ORM uses parameterized queries exclusively, eliminating the risk previously present in raw `$link_key` interpolations.
- **CSRF**: The modernized React SPA will utilize strict CSRF token validation and SameSite cookies, remediating the previously disabled CSRF protections in the Yii2 controllers.

## 2. Authentication Boundaries
- **Internal Dashboard (Strangler Pattern)**: The React frontend will bridge with the Yii2 session (`_identity-frontend` cookie).
- **External API (Machine-to-Machine)**: Future integrations (e.g., direct HOSxP polling services or external vendor connections) will authenticate via JWT (JSON Web Tokens).

## 3. Secure Communications
- **LINE Messaging API**: The webhook server must validate the `x-line-signature` header to ensure incoming requests genuinely originated from the LINE platform.
- **TLS/SSL Verification**: All outbound cURL/Axios requests (e.g., to LINE APIs) must strictly enforce SSL verification (`CURLOPT_SSL_VERIFYHOST = 2`), fixing the legacy bypass.

## 4. Role-Based Access Control (RBAC)
- **Role 99**: Implicit Deny. Cannot execute `POST`, `PUT`, or `DELETE` requests.
- **Staff (Role != 99)**: Restricted to submitting incidents and viewing reports relevant to their `department_id`.
- **Admin**: Global Read/Write access across all endpoints.
