# Phase 1 — production foundation

This phase establishes a safer runtime boundary around the existing preview. It does not enable public tenant intake, add staff authentication, add a database, or make the local server production-ready by itself.

## Implemented

- Exact production origins can be supplied through `RRC_PUBLIC_ORIGINS` as a comma-separated list, such as `https://www.example.com`.
- The default remains localhost-only when `RRC_PUBLIC_ORIGINS` is blank.
- Host validation uses the configured origin host in production and the actual local port in preview mode.
- Cross-origin POST requests and requests without an `Origin` header remain rejected.
- `RRC_BIND_HOST` controls the server bind address and defaults to `127.0.0.1`.
- `GET /healthz` provides a non-sensitive process health response: `{ "ok": true }`.
- HTTP keep-alive, header-count and request timeouts are explicitly bounded.
- SIGINT and SIGTERM begin graceful shutdown so the service can finish active requests.
- The server passes the supplied environment into both optional mailer factories.

## Production use still requires

1. A reverse proxy that terminates HTTPS and forwards only the intended public host.
2. A firewall allowing the application port only from that proxy or internal network.
3. A process manager or container restart policy.
4. Centralized logs with request bodies and credentials excluded.
5. Shared rate limiting and bot protection for more than one application process.
6. A staging deployment and authorized security review before enabling either mail flag.

Do not set `RRC_PUBLIC_ORIGINS` to `*`, include paths or credentials in an origin, or expose the Node process directly to the internet.

## Suggested first deployment shape

`Internet → HTTPS reverse proxy → Node process on 127.0.0.1 → private SMTP`

The database, private document storage, staff authentication and durable application queues belong to later phases.
