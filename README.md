# Mekari Klikpajak API Guidelines & Examples (CoreTax / CTAS)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Authentication: HMAC-SHA256](https://img.shields.io/badge/Auth-HMAC--SHA256-blue.svg)](#-hmac-authentication-specification)
[![Product: Mekari Klikpajak](https://img.shields.io/badge/Product-Mekari%20Klikpajak-red.svg)](https://klikpajak.id)
[![CoreTax: Ready](https://img.shields.io/badge/CoreTax%20%2F%20CTAS-Ready-brightgreen.svg)](#-coretax-ctas-single-tax-invoice-specification)

This repository provides production-ready, verified integration examples and guidelines for the **Mekari Klikpajak API** using **HMAC-SHA256 authentication**, with a focus on the new **CoreTax (CTAS / V2)** system for **Creating Single Tax Invoices (Faktur Pajak Keluaran)** across popular programming languages and developer tools.

---

## 📖 Table of Contents
1. [Developer Portals & Base URLs](#-developer-portals--base-urls)
2. [How to Generate Credentials (MDC)](#-how-to-generate-credentials-in-mekari-developer-center-mdc)
3. [HMAC Authentication Specification](#-hmac-authentication-specification)
4. [CoreTax (CTAS) Single Tax Invoice Specification](#-coretax-ctas-single-tax-invoice-specification)
5. [Available Implementations](#-available-implementations)
6. [Official Documentation & References](#-official-documentation--references)
7. [License](#-license)

---

## 🌐 Developer Portals & Base URLs

Mekari provides both a sandbox testing environment and a production environment:

| Environment | Developer Center (MDC) | API Gateway Base URL | Web Dashboard |
|---|---|---|---|
| **Sandbox (Testing)** | [sandbox-developers.mekari.com](https://sandbox-developers.mekari.com) | `https://sandbox-api.mekari.com` | [sandbox.klikpajak.id](https://sandbox.klikpajak.id) |
| **Production (Live)** | [developers.mekari.com](https://developers.mekari.com) | `https://api.mekari.com` | [app.klikpajak.id](https://app.klikpajak.id) |

---

## 🔑 How to Generate Credentials in Mekari Developer Center (MDC)

> 📘 **Step-by-Step Slide Guide**:  
> For visual walkthrough slides with screenshots and explanation:  
> **[HMAC Guideline & MDC Credentials Guide (Google Slides)](https://docs.google.com/presentation/d/1eA2UQWYrh36jqq0rIJC_tuJkTkJjrrHgdRy5-o3Gk3E/edit?usp=sharing)**

### Steps:
1. Log in to [MDC Sandbox](https://sandbox-developers.mekari.com) (or [MDC Production](https://developers.mekari.com)).
2. Go to **Applications** > click **Create Application**.
3. Enter your **Application Name**.
4. Select the required **Scopes** for Klikpajak CoreTax (CTAS) e-Faktur and e-Bupot.
   *(Tip: Scroll down completely until the scopes list stops loading before selecting).*
5. Save your application and navigate to **Application Details > Credentials**.
6. Copy your **Client ID** (`hmac_username`) and **Client Secret** (`hmac_secret`).
7. **Important**: The Client Secret is only displayed once upon creation. Keep it stored securely.

---

## 🔐 HMAC Authentication Specification

Mekari Klikpajak uses **HMAC-SHA256** request signing. Every HTTP request requires four mandatory headers:

```http
Authorization: hmac username="<CLIENT_ID>", algorithm="hmac-sha256", headers="date request-line", signature="<SIGNATURE>"
Date: Thu, 15 Oct 2026 06:15:00 GMT
Digest: SHA-256=<BASE64_SHA256_OF_BODY>
X-Idempotency-Key: <UUID_V4>
Content-Type: application/json
```

### Signature Generation Rules:

1. **Date Header**:
   - Must be formatted in **RFC 1123 / UTC** (e.g. `Thu, 15 Oct 2026 06:15:00 GMT`).
   - Must represent the current time when sending the request (fresh timestamp for every call).

2. **Request Line**:
   - Format: `[METHOD] [PATH] HTTP/1.1`
   - Example: `POST /v2/klikpajak/v2/efaktur/out HTTP/1.1`
   - *Note*: Use the path only without query parameters in the request line.

3. **Signing String (Payload)**:
   ```text
   date: <DATE_HEADER_VALUE>\n<REQUEST_LINE>
   ```

4. **Signature**:
   ```text
   Base64( HMAC-SHA256( signingString, clientSecret ) )
   ```

5. **Digest Header**:
   - For `POST` / `PUT` requests with a JSON body, calculate the SHA-256 hash of the raw body:
     ```text
     Digest: SHA-256=Base64( SHA256( rawRequestBody ) )
     ```

6. **Freshness Guarantee**:
   - The signature is one-time use per request. Do not reuse old signatures, or the gateway will reject them with `401 Unauthorized`.

### 🔑 X-Idempotency-Key (Preventing Duplicate Invoice Creation)

The `X-Idempotency-Key` header is required for create/write operations to guarantee idempotency and avoid duplicate entries:

* **Auto-generated (UUID v4)**: Recommended for testing or non-mutating requests.
* **Custom Reference (e.g., your Internal Invoice Number / Order ID)**: Strongly recommended for production invoice creation (e.g. `ABC0001` or `INV-2026-0001`).

> 💡 **Core Difference**:
> * **HMAC Signature** must be freshly computed on **every single request**.
> * **X-Idempotency-Key** stays the same for a given transaction to **prevent duplicate creation**.

If you accidentally retry or resend a request with the **same** `X-Idempotency-Key`, Klikpajak will recognize it and safely return:
```json
{
  "code": "1903",
  "message": "Your request has already completed"
}
```

### 🔄 Handling Faktur Pajak Pengganti (Replacement Invoices with `-1`, `-2`, ++)

When creating a replacement invoice (**Faktur Pajak Pengganti**), you must provide a **new** `X-Idempotency-Key`. Reusing the original invoice's key will result in error `1903` ("Your request has already completed").

The recommended and battle-tested pattern is appending a revision suffix (`-1`, `-2`, etc.):

| Invoice Type | `X-Idempotency-Key` & `client_reference_id` | `substitution_flag` | `substituted_tax_invoice_id` | Description |
|---|---|---|---|---|
| **Normal** | `INVQBL0001` | `false` | `null` | Original tax invoice |
| **Pengganti ke-1** | `INVQBL0001-1` | `true` | `8219420` | 1st replacement invoice |
| **Pengganti ke-2** | `INVQBL0001-2` | `true` | `8219420` | 2nd replacement (if further amendments needed) |
| **Pengganti ke-N** | `INVQBL0001-N` | `true` | `8219420` | N-th replacement |

**Benefits**:
1. **Passes Idempotency Check**: Avoids error code `1903` while maintaining duplicate protection per revision.
2. **Audit Trail**: Clearly traces all replacement revisions back to the original invoice root (`INVQBL0001`) across your database, ERP, and Klikpajak dashboard.

### 📜 Official Postman Pre-request Script

Here is the reference script from the official documentation and slides that sets all headers including `X-Idempotency-Key`:

```javascript
const uuid = require('uuid');

var method = pm.request.method;
var path = pm.request.url.getPath();
var username = pm.variables.get("mekariApiClientId");
var secret = pm.variables.get("mekariApiClientSecret");
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

postman.setEnvironmentVariable('hmacAuthHeader', header);
postman.setEnvironmentVariable('hmacDate', dateString);
postman.setEnvironmentVariable('hmacDigest', bodyDigest);
postman.setEnvironmentVariable('idempotencyKey', idempotencyKey);
```

---

## 📑 CoreTax (CTAS) Single Tax Invoice Specification

Under Indonesia's **CoreTax (CTAS / V2)** tax system, sales tax invoices (Faktur Pajak Keluaran) are created via:

- **Method**: `POST`
- **Endpoint**: `/v2/klikpajak/v2/efaktur/out`
- **Full Sandbox URL**: `https://sandbox-api.mekari.com/v2/klikpajak/v2/efaktur/out?auto_approval=false&auto_calculate=true`

### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `auto_approval` | `boolean` | `false` | `true` = Immediately submit to DJP for approval.<br>`false` = Save invoice as Draft. |
| `auto_calculate` | `boolean` | `true` | `true` = Klikpajak automatically calculates DPP totals, PPN (VAT), and PPnBM (STLG). |

### CoreTax Specific Fields:
- **16-digit NPWP / NIK**: Field `customer.npwp` accepts 16-digit numbers in CoreTax.
- **NITKU (Nomor Induk Tempat Kegiatan Usaha)**: 6-digit branch code (e.g. `"000000"` for head office).
- **Transaction Detail (`transaction_detail`)**:
  - `01`: Penyerahan kepada Bukan Pemungut PPN.
  - `02`: Penyerahan kepada Pemungut Bendaharawan.
  - `03`: Penyerahan kepada Pemungut Selain Bendaharawan (BUMN).
  - `04`: DPP Nilai Lain.
  - `07`: Penyerahan Fasilitas Tidak Dipungut.
  - `08`: Penyerahan Fasilitas Dibebaskan.
- **Other Tax Base (`other_tax_base`)**: DPP Nilai Lain.

### Sample Request Payload:
```json
{
    "client_reference_id": "INV-1792045000000",
    "transaction_detail": "04",
    "additional_trx_detail": "00",
    "substitution_flag": false,
    "substituted_tax_invoice_id": null,
    "tax_invoice_number_term": "",
    "description": "Invoice Penjualan Barang & Jasa IT",
    "document_date": "2026-10-15",
    "reference": "REF-INV-001",
    "total_tax_base": 10000000,
    "total_other_tax_base": 10000000,
    "total_vat": 1200000,
    "total_stlg": 0,
    "total_price": 10000000,
    "total_discount": 0,
    "downpayment_flag": 0,
    "downpayment_stlg": 0,
    "downpayment_tax_base": 0,
    "downpayment_other_tax_base": 0,
    "downpayment_vat": 0,
    "customer": {
        "npwp": "1091031210912281",
        "id_type": "NPWP",
        "country_code": "IDN",
        "other_id": "",
        "name": "PT Pembeli Sejahtera",
        "address": "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
        "nitku": "000000",
        "email": "finance@pembelisejahtera.co.id"
    },
    "items": [
        {
            "goods_service": "GOODS",
            "goods_service_code": "000000",
            "goods_service_name": "Paket Server Rack 1U",
            "unit_price": 10000000,
            "unit_measurement": "UNIT",
            "selling_price": 10000000,
            "quantity": 1,
            "discount": 0,
            "tax_base": 10000000,
            "other_tax_base": 10000000,
            "vat": 1200000,
            "stlg_rate": 0,
            "stlg": 0
        }
    ]
}
```

---

## 💻 Available Implementations

Explore the standalone examples in your language of choice:

| Implementation | Folder | Prerequisites | Description |
|---|---|---|---|
| **Node.js** | [`nodejs/`](file:///Users/mekari/Work/hmac/klikpajak/nodejs) | Node.js v18+ | Zero external dependencies (uses native `fetch` & `crypto`). |
| **Python** | [`python/`](file:///Users/mekari/Work/hmac/klikpajak/python) | Python 3.8+ | Zero external dependencies (uses `urllib`, `hmac`, `hashlib`). |
| **PHP** | [`php/`](file:///Users/mekari/Work/hmac/klikpajak/php) | PHP 7.4+ / 8.x | Native PHP with `curl` and `hash_hmac`. |
| **Go** | [`go/`](file:///Users/mekari/Work/hmac/klikpajak/go) | Go 1.20+ | Standard library (`net/http`, `crypto/hmac`). |
| **Bash / cURL** | [`bash/`](file:///Users/mekari/Work/hmac/klikpajak/bash) | `curl`, `openssl` | Shell script with automated HMAC header creation. |
| **Postman** | [`postman/`](file:///Users/mekari/Work/hmac/klikpajak/postman) | Postman App | Collection with pre-request script for one-click testing. |

---

## 📚 Official Documentation & References

- **Mekari Klikpajak CoreTax (V2) Postman Documenter**: [V2 Documentation](https://documenter.getpostman.com/view/17365057/2sAYQUpZEY)
- **Mekari Klikpajak Legacy (V1) Postman Documenter**: [V1 Documentation](https://documenter.getpostman.com/view/17365057/U16hrR5d)
- **Postman Playground Collection**: [Klikpajak Workspace](https://www.postman.com/qbl-playground/public/collection/y7b6pk1/klikpajak)
- **HMAC Slide Walkthrough**: [Google Presentation](https://docs.google.com/presentation/d/1eA2UQWYrh36jqq0rIJC_tuJkTkJjrrHgdRy5-o3Gk3E/edit?usp=sharing)
- **Mekari Developer Center (Production)**: [developers.mekari.com](https://developers.mekari.com)
- **Mekari Developer Center (Sandbox)**: [sandbox-developers.mekari.com](https://sandbox-developers.mekari.com)

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
