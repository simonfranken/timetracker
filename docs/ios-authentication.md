# iOS Authentication & Backend Communication Architecture

## Overview
This document outlines the authentication mechanism and backend communication protocol used by the iOS application. The architecture relies on an API-driven approach where the backend acts as an intermediary (BFF - Backend for Frontend) for an OIDC identity provider. Notably, the backend manages the PKCE (Proof Key for Code Exchange) generation and verification internally, simplifying the mobile client's responsibilities.

## 1. Authentication Flow

The authentication process utilizes `ASWebAuthenticationSession` for a secure, out-of-app browser experience.

### Step 1: Login Initiation
The application initiates the login sequence by launching an ephemeral web session targeting the backend's login endpoint.

*   **URL:** `[API_BASE_URL]/auth/login`
*   **Query Parameters:**
    *   `redirect_uri`: `timetracker://oauth/callback`
*   **Behavior:** The backend generates PKCE parameters, stores them in an in-memory session tied to a `state` parameter, and redirects the user to the actual Identity Provider (IdP).

### Step 2: User Authentication
The user completes the authentication flow (e.g., entering credentials, 2FA) within the secure web view.

### Step 3: Callback
Upon successful authentication, the backend redirects the browser back to the application using a custom URL scheme.

*   **Callback URL:** `timetracker://oauth/callback?code=[auth_code]&state=[state]`
*   **Action:** The application intercepts this URL, extracts the `code` and `state` parameters.

### Step 4: Token Exchange
The application immediately exchanges the received code and state for a JWT access token via a backend API call.

*   **Endpoint:** `POST /auth/token`
*   **Headers:** `Content-Type: application/json`
*   **Body (JSON):**
    ```json
    {
      "code": "<auth_code>",
      "state": "<state>",
      "redirect_uri": "timetracker://oauth/callback"
    }
    ```
*   **Note:** The `code_verifier` is **not** sent by the client. The backend retrieves the verifier using the `state` parameter from its internal session cache.
*   **Success Response:** Returns a `TokenResponse` containing the `access_token` and the `User` object.

## 2. API Communication

All subsequent communication with the backend requires the obtained JWT access token.

### Base Configuration
*   **Base URL:** Determined via the `API_BASE_URL` key in `Info.plist`. Defaults to `http://localhost:3001` if missing.
*   **Path Resolution:** API paths are appended to the Base URL (e.g., `/clients`, `/time-entries`).

### Standard Request Headers
For authenticated endpoints, the following headers **must** be included:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

### Response & Error Handling
*   **Success (200-299):** Parses the JSON response into the expected model. Empty responses (`Data.isEmpty`) should be handled gracefully (e.g., mapping to a dummy `{}` object or allowing `Void` returns).
*   **Unauthorized (401):** 
    *   The access token has expired or is invalid.
    *   **Action:** The application must immediately clear the local session (keychain, user state) and present the login screen.
*   **Standard Errors (400, 500, etc.):** 
    *   The backend typically returns a JSON payload containing an `error` string.
    *   **Format:** `{"error": "Message detailing the failure"}`

## 3. Storage & Session Management

Security and seamless user experience dictate how the session is managed across app launches.

### Token Storage
*   The `access_token` must be stored securely using the **iOS Keychain**.
*   **Service Name:** `com.timetracker.app`
*   **Key:** `accessToken`
*   **Accessibility:** `.whenUnlockedThisDeviceOnly` (prevents extraction when the device is locked and disables iCloud Keychain syncing).
*   **In-Memory Cache:** The token is also cached in-memory during the app's lifecycle to minimize Keychain read operations.

### Session Restoration (App Launch)
When the application starts:
1.  Read the `accessToken` from the Keychain.
2.  If present, make a verification request to `GET /auth/me`.
3.  **If `GET /auth/me` succeeds:** Update the local `User` state and transition to the authenticated interface.
4.  **If `GET /auth/me` fails (especially 401):** Clear the Keychain and transition to the unauthenticated login interface.

### Logout
When the user explicitly logs out:
1.  Send a best-effort `POST /auth/logout` request to the backend.
2.  Immediately delete the `accessToken` from the Keychain.
3.  Clear the in-memory `User` and token state.
4.  Return to the login screen.

## 4. Core Data Models

### Token Response
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": { ... }
}
```

### User Model
```json
{
  "id": "uuid-string",
  "username": "johndoe",
  "fullName": "John Doe",  // Optional/Nullable
  "email": "john@example.com"
}
```

## 5. Reimplementation Requirements List

When rebuilding the iOS application, the following requirements **must** be met to ensure compatibility with the existing backend:

- [ ] **R1. Custom Scheme Configuration:** Register `timetracker://` as a custom URL scheme in the project settings (Info.plist) to handle OAuth redirects.
- [ ] **R2. Ephemeral Web Sessions:** Use `ASWebAuthenticationSession` with `prefersEphemeralWebBrowserSession = true` to prevent Safari from sharing cookies with the app's login flow.
- [ ] **R3. Login Initiation:** The login URL must strictly be `[API_BASE_URL]/auth/login?redirect_uri=timetracker://oauth/callback`.
- [ ] **R4. Token Exchange Parameters:** The callback payload to `POST /auth/token` must include `code`, `state`, and `redirect_uri`. Do not attempt to implement local PKCE generation.
- [ ] **R5. Secure Storage:** The JWT access token must be stored exclusively in the Keychain using the `.whenUnlockedThisDeviceOnly` accessibility level.
- [ ] **R6. Authorization Header:** Every authenticated API request must include the `Authorization: Bearer <token>` header.
- [ ] **R7. Global 401 Interceptor:** Implement a global network interceptor or centralized error handler that catches `401 Unauthorized` responses, clears local storage, and forces a logout.
- [ ] **R8. Session Verification:** On application launch, if a token exists in the Keychain, the app must validate it by calling `GET /auth/me` before allowing access to secure screens.
- [ ] **R9. Error Parsing:** API error responses must be parsed to extract the `{"error": "..."}` message for user-facing alerts.