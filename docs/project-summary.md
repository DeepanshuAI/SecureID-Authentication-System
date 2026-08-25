# Project Summary: SecureID Authentication System

## What the Project Does
SecureID is a mock Identity and Access Management (IAM) system designed to demonstrate how user authentication, multi-factor authentication (MFA), and session management operate under the hood. It acts as an internship technical assessment, showcasing core backend logic and responsive frontend design without relying on heavy abstractions.

## Features Implemented
- User Registration with password strength indicators and hashing.
- Multi-step OTP Verification for Email and SMS.
- MFA Setup flow (simulating Authenticator App setup).
- Secure Session Management (HttpOnly cookies).
- JWT Generation and Authorization for API routes.
- A modern, mobile-first frontend with glassmorphism design.

## Authentication Workflow
1. Client submits credentials.
2. Server validates input and looks up the user.
3. Server securely compares the submitted password against the bcrypt hash.
4. Server holds the authentication state pending MFA.
5. Server generates a single-use OTP and creates a short-lived challenge in the data store.
6. User provides the OTP.
7. Upon successful OTP verification, the server issues an active session cookie.

## MFA Workflow
The system allows users to select their preferred MFA method. During login, instead of immediately establishing a session, the server issues an MFA Challenge ID to the frontend and simulates sending a code via the user's preferred method. The frontend uses the Challenge ID to present an OTP screen.

## OTP Workflow
1. The server generates a random 6-digit number.
2. The server hashes the OTP (using bcrypt) and saves the hash, expiry (3 mins), and attempts (max 3) in `otpChallenges.json`.
3. The raw OTP is printed to the server console (simulating SMS/Email delivery).
4. The client submits the user's input alongside the Challenge ID.
5. The server looks up the challenge and compares the hashed OTP.
6. The challenge is immediately destroyed upon success to prevent replay attacks.

## Assumptions Made
- The user runs the system locally where console logs serve as the delivery mechanism for SMS and Email.
- Authenticator app setup is currently simulated (a static manual key and placeholder QR code are provided).
- JSON files act as an acceptable, zero-dependency substitute for a database.

## Limitations
- **Data Persistence Strategy**: Writing to a JSON file concurrently in a real-world scenario would lead to race conditions or file corruption. It is only suitable for simple assignment demonstrations.
- **In-Memory State Loss**: Not applicable here since we write directly to JSON, but standard memory storage would lose state on restart.
- **No Password Reset Flow**: Forgot password functionality is mocked in the UI.

## Development Approach
- **Backend First**: The `express` routes and JSON helper functions were constructed first to ensure the core data flow and security rules were solid.
- **Vanilla Frontend**: The UI was constructed using pure HTML and CSS variables to maintain a lightweight footprint while delivering a premium aesthetic. Javascript `fetch` wrappers were built to keep API calls clean.

## Challenges Solved
- **Sequential Verification**: Handling the Registration -> Email OTP -> SMS OTP -> MFA Setup -> Login chain required careful tracking of challenge types in the `otpChallenges.json` store to dictate what the next step should be.
- **Security Posture**: Ensuring OTPs were never leaked to the client required returning opaque `challengeId` UUIDs instead of the codes themselves.
