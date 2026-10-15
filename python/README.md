# Mekari Klikpajak Coretax (CTAS) - Python Implementation

This directory provides a production-ready Python 3 implementation for creating a **Single Tax Invoice (Faktur Pajak Keluaran)** using the new **Coretax (CTAS)** API and **HMAC-SHA256** authentication.

---

## 🚀 Features
- **Pure Standard Library**: Built using `urllib`, `hmac`, `hashlib`, and `uuid` (no external pip package strictly required).
- **HMAC-SHA256 Authentication**: Compliant with Mekari Developer Center (MDC) specification.
- **SHA-256 Digest**: Automatically calculates body hash for integrity check.
- **RFC 1123 Date Header**: Generates fresh UTC date header for every request.
- **UUID v4 Idempotency Key**: Prevents duplicate invoice creation.
- **Coretax (CTAS) Ready**: Supports 16-digit NPWP/NIK, 6-digit NITKU, and DPP Nilai Lain.

---

## 📋 Requirements
- Python 3.8 or later.

---

## ⚙️ Configuration & Environment Variables

Set your credentials as environment variables or update the constants inside [`example.py`](file:///Users/mekari/Work/hmac/klikpajak/python/example.py):

| Variable | Description | Default |
|---|---|---|
| `MEKARI_CLIENT_ID` | Your Mekari Application Client ID | `YOUR_MEKARI_CLIENT_ID` |
| `MEKARI_CLIENT_SECRET` | Your Mekari Application Client Secret | `YOUR_MEKARI_CLIENT_SECRET` |
| `MEKARI_BASE_URL` | Base API Gateway URL | `https://sandbox-api.mekari.com` |

---

## 🏃 Quick Start

Run directly without installing third-party packages:

```bash
# Option 1: Inline environment variables
MEKARI_CLIENT_ID="your_client_id" \
MEKARI_CLIENT_SECRET="your_client_secret" \
python3 example.py

# Option 2: Run directly (after editing example.py)
python3 example.py
```

---

## 📦 Using `requests` (Optional)

If your project uses `requests`:

```bash
pip install -r requirements.txt
```

```python
import requests

headers = generate_hmac_headers("POST", path, body_string, CLIENT_ID, CLIENT_SECRET)
response = requests.post(full_url, data=body_string, headers=headers)
print(response.status_code, response.json())
```
