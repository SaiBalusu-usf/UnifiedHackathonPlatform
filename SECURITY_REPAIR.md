# Security and application repair review

This branch builds on security PR #2. It is a draft: no deployment or database change has been performed.

## Behavior changes

- HTTP and WebSocket access use the same configured signing keys, explicit token purpose/algorithm, persisted account role and session version. Logout/password changes invalidate existing sessions; broadcasts recheck recipient authorization.
- Auth state is persisted in PostgreSQL instead of process-local memory. Public registration cannot assign privileged roles, and organizers cannot promote accounts. Resource checks query actual team/hackathon ownership. Organizer resume/location access is restricted to their participants/hackathons; multipart uploads cannot impersonate another user.
- Express 5 request guards reject nested query operators/prototype keys and repeated scalar parameters without altering passwords. Error/access logs omit request bodies, tokens and query strings. Uploads remain bounded to 5 MB and one file.
- Startup rejects invalid ports and token lifetimes. Production and test TypeScript both compile; agent/event lifecycles, missing UI imports and API-backed admin/hackathon pages are repaired. Generated backend/dist files are no longer tracked; builds create them from reviewed source.
- Docker uses Node 24 and locked installs. The frontend Docker build context is the repository root and consumes the workspace package-lock.json. Docker contexts exclude environment files. Database and monitoring port mappings bind to loopback. Sample administrator accounts and default database passwords are removed from initialization templates.

## Database and configuration review before use

Back up an existing database and review backend/src/config/security-migration.sql before applying it. It adds authentication/session fields to the canonical users schema; it does not convert a legacy database using incompatible id/profile columns. Fresh initialization uses init-db.sql followed by security-migration.sql. No SQL was applied to a real database during this audit. Existing seeded accounts/passwords are not removed from deployed databases by these source changes.

Supply distinct JWT_SECRET and JWT_REFRESH_SECRET values of at least 32 characters through the deployment secret store, plus database credentials. Do not commit real values. Existing access tokens must be renewed because the repaired tokens require a purpose and session version. No credentials were generated or changed by this repair.

## Remaining integration work

Email delivery is not configured: password-reset requests return the same 503 response for every address and verification tokens are never logged/published. OAuth and two-factor success stubs fail closed until a real provider/verifier is integrated. Accounts already marked as requiring two-factor authentication cannot bypass it via password login. Do not advertise these unfinished flows as available.

Resume extraction and several legacy dashboard widgets remain demo implementations; production parsing/quality is not established by the security tests. The legacy multi-service Compose topology has additional incomplete command/routing assumptions and requires a real startup exercise; the validated application entry point is backend/src/index.ts. Database integration/E2E tests require isolated PostgreSQL/MongoDB and were not executed: Docker Desktop was unavailable and no MongoDB binary was downloaded. Request explicit approval before acquiring an additional binary/source or accessing a deployment.

## Validation

Backend build, strict production/test type checks, signing-key regressions, offline SQL/HTTP/WebSocket/agent tests, frontend build/API tests and frontend lint were run locally. Frontend lint retains 15 pre-existing warnings and no errors. Workspace and backend standalone npm audits report zero advisories in the resolved dependencies. This does not prove the application has no vulnerabilities. CI results on the published commit are the final portable check; real databases, container startup, browser E2E, email/OAuth/2FA providers and deployed state remain unverified.
