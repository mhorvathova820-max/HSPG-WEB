# HOLUB 360 API foundation

This repository previously contained only an MCP configuration. The current implementation is a small backend foundation, not a complete or production-deployed HOLUB 360 platform.

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm start
npm test
```

The API listens on port `3000` by default; set `PORT` to use another port. The audit file is created at `server/logs/ai_compliance.log` relative to this repository.

## Implemented routes

- `POST /api/satellite-scan` accepts an address and returns a clearly labeled illustrative estimate. It does not access satellite imagery or measure a building.
- `POST /api/meteo-validation` evaluates caller-provided weather values; it is not connected to a forecast provider.
- `POST /api/generate-contract` returns an escaped, unsigned working draft based on an estimate held in process memory.
- `POST /api/trigger-geo-shield` prepares campaign payloads only after work confirmation and consent. It does not contact Meta or Google and never launches ads.
- `GET /api/hbot/hello` returns an automated-assistant disclosure.

Pricing inputs in the sample estimator require confirmation by the operator. The installment split is arithmetic only, not a Skip Pay/ČSOB offer or credit approval. The audit log is append-only application output, not tamper-proof or a certification of EU AI Act compliance. Contract text is not legal advice.

This repository has no frontend, Three.js visualization, PDF export engine, live weather or payment integration, e-sign/BankID integration, or verified legal / accreditation documents. Those require separate implementation, credentials/provider agreements, and qualified review.
