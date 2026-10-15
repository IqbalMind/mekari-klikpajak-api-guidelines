# Mekari Klikpajak Coretax (CTAS) - Postman Collection

This directory contains a pre-configured Postman Collection with automated **HMAC-SHA256 signature** generation and **`X-Idempotency-Key`** handling for creating a **Single Tax Invoice (Faktur Pajak Keluaran)** in Coretax (CTAS).

---

## 🔑 The Role of `X-Idempotency-Key`

> ⚠️ **Important (From Official Slides & Docs)**:
> The `X-Idempotency-Key` is required for unique API requests to prevent accidental duplicate invoice creation:
>
> * **Auto-generated (UUID v4)**: If you just want to run exploratory tests or fetch data.
> * **Your Own ID (e.g. Invoice Number / Reference)**: If you want to ensure the same invoice is never created twice.
>
> **In Short**:
> * **HMAC Signature** = Must be newly generated for *every single HTTP request*.
> * **X-Idempotency-Key** = Prevents duplicate creation on the server side.
>
> If you resend a request with the **same** `X-Idempotency-Key` and data, Klikpajak responds with:
> ```json
> {
>   "code": "1903",
>   "message": "Your request has already completed"
> }
> ```

---

## 📜 Official Pre-request Script

The collection includes the pre-request script as specified in the official Klikpajak documentation:

```javascript
const uuid = require('uuid');

var method = pm.request.method;
var path = pm.request.url.getPath();
var username = pm.variables.get("mekariApiClientId") || pm.collectionVariables.get("mekariApiClientId");
var secret = pm.variables.get("mekariApiClientSecret") || pm.collectionVariables.get("mekariApiClientSecret");
var dateString = new Date().toUTCString();

var body = pm.request.body ? pm.request.body.toString() : '';
var bodyDigest = '';
var bodyLen = Object.keys(body).length;
if (bodyLen > 0) {
    var bodyHash = CryptoJS.SHA256(body);
    bodyDigest = 'SHA-256=' + CryptoJS.enc.Base64.stringify(bodyHash);
}

var requestLine = method + ' ' + path + ' HTTP/1.1';
var payload = ['date: ' + dateString, requestLine].join("\n");
var digest = CryptoJS.HmacSHA256(payload, secret);
var signature = CryptoJS.enc.Base64.stringify(digest);
var header = 'hmac username="' + username + '", algorithm="hmac-sha256", headers="date request-line", signature="' + signature + '"';

// Generate UUID for idempotency or set custom invoice number
var idempotencyKey = uuid.v4();

// Set environment variables (official docs format)
postman.setEnvironmentVariable('hmacAuthHeader', header);
postman.setEnvironmentVariable('hmacDate', dateString);
postman.setEnvironmentVariable('hmacDigest', bodyDigest);
postman.setEnvironmentVariable('idempotencyKey', idempotencyKey);

// Also set headers directly to ensure compatibility across Postman runners
pm.request.headers.upsert({ key: 'Authorization', value: header });
pm.request.headers.upsert({ key: 'Date', value: dateString });
if (bodyDigest) {
    pm.request.headers.upsert({ key: 'Digest', value: bodyDigest });
}
pm.request.headers.upsert({ key: 'X-Idempotency-Key', value: idempotencyKey });

console.log('HMAC Header:', header);
console.log('Date Header:', dateString);
console.log('Digest Header:', bodyDigest);
console.log('X-Idempotency-Key:', idempotencyKey);
console.log('Request Line:', requestLine);
```

---

## 📥 Import to Postman

1. Open Postman.
2. Click **Import** (top left).
3. Drag and drop [`Klikpajak_Coretax_Single_Tax_Invoice.postman_collection.json`](file:///Users/mekari/Work/hmac/klikpajak/postman/Klikpajak_Coretax_Single_Tax_Invoice.postman_collection.json).
4. In the collection settings, go to the **Variables** tab:
   - `mekariApiClientId`: Paste your Mekari API Client ID (`hmac_username`).
   - `mekariApiClientSecret`: Paste your Mekari API Client Secret (`hmac_secret`).
   - `baseUrl`: Set to `https://sandbox-api.mekari.com` (for testing) or `https://api.mekari.com` (for production).
5. Click **Save**.

---

## 🧪 Testing the Request

1. Select **Create Single Tax Invoice (Draft)**.
2. Review or adjust the invoice fields in the **Body** tab.
3. Click **Send**.
4. Check the Response status (`200 OK` or `201 Created`).
