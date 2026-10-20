# HOLUB 360 prototype

The workspace began with only an MCP configuration. It now contains a local prototype, not a production-ready or deployed HOLUB 360 platform.

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm start
npm test
npm run check:deploy
```

The API listens on port `3000` by default; set `PORT` to use another port. The server reads an optional local `.env` with Node.js's built-in environment-file parser without overriding variables already supplied by the process. The audit file is created at `server/logs/ai_compliance.log` relative to this repository.

Open `http://localhost:3000` for the local UI. Three.js is served from the installed dependency, not an external CDN.

## Implemented routes

- `POST /api/satellite-scan` accepts an address and returns a clearly labeled illustrative estimate. It does not access satellite imagery or measure a building.
- `POST /api/meteo-validation` evaluates caller-provided weather values; it is not connected to a forecast provider.
- `POST /api/generate-contract` returns an escaped, unsigned working draft based on an estimate held in process memory.
- `POST /api/export-pdf` returns a printable PDF based on that model estimate; it explicitly disclaims survey, verified pricing, and a completed contract.
- `POST /api/reactivation/register` accepts an estimate and an explicit follow-up consent. After 48 hours an in-process queue changes the item to human review. It never sends an SMS/email, and records expire after 72 hours.
- `POST /api/trigger-geo-shield` prepares campaign payloads only after work confirmation and consent. It does not contact Meta or Google and never launches ads.
- `GET /api/hbot/hello` returns an automated-assistant disclosure.

Pricing inputs in the sample estimator require confirmation by the operator. The installment split is arithmetic only, not a Skip Pay/ČSOB offer or credit approval. The audit log is append-only application output, not tamper-proof or a certification of EU AI Act compliance. Contract text is not legal advice.

The Three.js building and surface reveal are visual illustrations, not a reconstruction of a property or an actual contamination-removal simulation. Audio and vibration are off unless a user opts in. The “42% after 12 months” claim is not supported by the supplied data and is not represented as a prediction or a monetary “cost of delay.”

Tests use Node.js's built-in test runner. No live weather, payment/BankID, e-signature, ad-platform, address-geocoding, or property/job database integration is configured. Neighbor matching, automatic marketing, production data persistence, complete legal/accreditation documents, and deployment have not been implemented. The in-memory queue and estimates are not suitable for multi-process production. Obtain provider agreements, verify business/legal claims, configure access controls and retention, and arrange qualified legal/security review before any production use.

`npm run build` creates minified browser bundles in the ignored `public/dist/` directory. Minification is not encryption or reliable protection of client-side logic. `npm run check:deploy` checks that expected folders exist and, when present, that the audit file has restrictive permissions and valid JSONL records. It does not prove the log is tamper-proof, certify EU AI Act compliance, verify provider credentials, or declare the platform ready to launch; it exits unsuccessfully if the log is absent or structurally invalid.

`.env.example` documents variable names for future provider integrations. The listed provider APIs are not wired into the application, and putting credentials in `.env` does not enable those integrations.
