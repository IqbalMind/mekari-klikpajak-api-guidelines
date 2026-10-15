# Mekari Klikpajak Coretax (CTAS) - PHP Implementation

This directory provides a production-ready PHP implementation for creating a **Single Tax Invoice (Faktur Pajak Keluaran)** using the new **Coretax (CTAS)** API and **HMAC-SHA256** authentication.

---

## 🚀 Features
- **Zero Composer Dependencies**: Uses native PHP `hash_hmac`, `hash`, and `curl`.
- **HMAC-SHA256 Authentication**: Compliant with Mekari Developer Center (MDC) specification.
- **SHA-256 Digest**: Automatically calculates body hash for integrity check.
- **RFC 1123 Date Header**: Generates fresh UTC date header for every request.
- **UUID v4 Idempotency Key**: Prevents duplicate invoice creation.
- **Coretax (CTAS) Ready**: Supports 16-digit NPWP/NIK, 6-digit NITKU, and DPP Nilai Lain.

---

## 📋 Requirements
- PHP 7.4 or later (tested on PHP 8.x).
- PHP `curl` and `openssl` extensions enabled.

---

## ⚙️ Configuration & Environment Variables

Set your credentials as environment variables or update the variables inside [`example.php`](file:///Users/mekari/Work/hmac/klikpajak/php/example.php):

| Variable | Description | Default |
|---|---|---|
| `MEKARI_CLIENT_ID` | Your Mekari Application Client ID | `YOUR_MEKARI_CLIENT_ID` |
| `MEKARI_CLIENT_SECRET` | Your Mekari Application Client Secret | `YOUR_MEKARI_CLIENT_SECRET` |
| `MEKARI_BASE_URL` | Base API Gateway URL | `https://sandbox-api.mekari.com` |

---

## 🏃 Quick Start

Run directly via PHP CLI:

```bash
# Option 1: Inline environment variables
MEKARI_CLIENT_ID="your_client_id" \
MEKARI_CLIENT_SECRET="your_client_secret" \
php example.php

# Option 2: Run directly (after editing example.php)
php example.php
```
