# Mekari Klikpajak Coretax (CTAS) - Node.js Implementation

This directory provides a production-ready Node.js implementation for creating a **Single Tax Invoice (Faktur Pajak Keluaran)** using the new **Coretax (CTAS)** API and **HMAC-SHA256** authentication.

---

## 🚀 Features
- **Zero External Dependencies**: Uses native Node.js (v18+) `crypto` and `fetch`.
- **HMAC-SHA256 Authentication**: Compliant with Mekari Developer Center (MDC) specification.
- **SHA-256 Digest**: Automatically calculates body hash for integrity check.
- **RFC 1123 Date Header**: Generates fresh UTC date header for every request.
- **UUID v4 Idempotency Key**: Prevents duplicate invoice creation.
- **Coretax (CTAS) Ready**: Supports 16-digit NPWP/NIK, 6-digit NITKU, and DPP Nilai Lain.

---

## 📋 Requirements
- Node.js `v18.0.0` or later (tested on Node v20/v22/v24).

---

## ⚙️ Configuration & Environment Variables

Set your credentials as environment variables or update the constants inside [`example.js`](file:///Users/mekari/Work/hmac/klikpajak/nodejs/example.js):

| Variable | Description | Default |
|---|---|---|
| `MEKARI_CLIENT_ID` | Your Mekari Application Client ID | `YOUR_MEKARI_CLIENT_ID` |
| `MEKARI_CLIENT_SECRET` | Your Mekari Application Client Secret | `YOUR_MEKARI_CLIENT_SECRET` |
| `MEKARI_BASE_URL` | Base API Gateway URL | `https://sandbox-api.mekari.com` |

---

## 🏃 Quick Start

Run directly without installing any npm packages:

```bash
# Option 1: Inline environment variables
MEKARI_CLIENT_ID="your_client_id" \
MEKARI_CLIENT_SECRET="your_client_secret" \
node example.js

# Option 2: Run directly (after editing example.js)
node example.js
```

---

## 📦 Axios Alternative (Optional)

If your existing codebase uses `axios`, you can install dependencies and use `axios`:

```bash
npm install
```

```javascript
const axios = require('axios');
const headers = generateHmacHeaders('POST', path, bodyString, CLIENT_ID, CLIENT_SECRET);
const response = await axios.post(fullUrl, invoicePayload, { headers });
```
