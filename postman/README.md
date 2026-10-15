# Mekari Klikpajak Coretax (CTAS) - Postman Collection

This directory contains a pre-configured Postman Collection with automated **HMAC-SHA256 signature** generation for creating a **Single Tax Invoice (Faktur Pajak Keluaran)** in Coretax (CTAS).

---

## 📥 Import to Postman

1. Open Postman.
2. Click **Import** (top left).
3. Drag and drop [`Klikpajak_Coretax_Single_Tax_Invoice.postman_collection.json`](file:///Users/mekari/Work/hmac/klikpajak/postman/Klikpajak_Coretax_Single_Tax_Invoice.postman_collection.json).
4. In the collection settings, go to the **Variables** tab:
   - `clientId`: Paste your Mekari API Client ID (`hmac_username`).
   - `clientSecret`: Paste your Mekari API Client Secret (`hmac_secret`).
   - `baseUrl`: Set to `https://sandbox-api.mekari.com` (for testing) or `https://api.mekari.com` (for production).
5. Click **Save**.

---

## ⚡ How the Pre-request Script Works

The collection includes a Pre-request Script at the collection level that runs automatically before every request:
1. Calculates **SHA-256 Digest** of the request body and sets the `Digest` header.
2. Extracts HTTP method and path to construct the request line: `[METHOD] [PATH] HTTP/1.1`.
3. Concatenates `date: <UTC_Date>\n<requestLine>`.
4. Computes **HMAC-SHA256** using your `clientSecret`.
5. Sets the `Authorization`, `Date`, and `X-Idempotency-Key` headers dynamically.

---

## 🧪 Testing the Request

1. Select **Create Single Tax Invoice (Draft)**.
2. Review or adjust the invoice fields in the **Body** tab.
3. Click **Send**.
4. Check the Response status (`200 OK` or `201 Created`).
