# Mekari Klikpajak Coretax (CTAS) - Bash / cURL Implementation

This directory provides a shell script implementation using `curl` and `openssl` for creating a **Single Tax Invoice (Faktur Pajak Keluaran)** using the new **Coretax (CTAS)** API and **HMAC-SHA256** authentication.

---

## 🚀 Features
- **Standard UNIX Tools**: Built with `curl`, `openssl`, and `date`.
- **HMAC-SHA256 Authentication**: Compliant with Mekari Developer Center (MDC) specification.
- **SHA-256 Digest**: Automatically calculates body hash for integrity check.
- **RFC 1123 Date Header**: Generates fresh UTC date header for every request.
- **UUID v4 Idempotency Key**: Uses `uuidgen` for unique requests.
- **Coretax (CTAS) Ready**: Supports 16-digit NPWP/NIK, 6-digit NITKU, and DPP Nilai Lain.

---

## 📋 Requirements
- `curl`
- `openssl`
- `uuidgen` (built into macOS and `util-linux` on Linux)

---

## ⚙️ Configuration & Environment Variables

| Variable | Description | Default |
|---|---|---|
| `MEKARI_CLIENT_ID` | Your Mekari Application Client ID | `YOUR_MEKARI_CLIENT_ID` |
| `MEKARI_CLIENT_SECRET` | Your Mekari Application Client Secret | `YOUR_MEKARI_CLIENT_SECRET` |
| `MEKARI_BASE_URL` | Base API Gateway URL | `https://sandbox-api.mekari.com` |

---

## 🏃 Quick Start

```bash
chmod +x example.sh

# Option 1: Run with inline environment variables
MEKARI_CLIENT_ID="your_client_id" \
MEKARI_CLIENT_SECRET="your_client_secret" \
./example.sh

# Option 2: Run directly (after editing example.sh)
./example.sh
```
