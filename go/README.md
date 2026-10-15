# Mekari Klikpajak Coretax (CTAS) - Go Implementation

This directory provides a production-ready Go implementation for creating a **Single Tax Invoice (Faktur Pajak Keluaran)** using the new **Coretax (CTAS)** API and **HMAC-SHA256** authentication.

---

## 🚀 Features
- **Zero External Dependencies**: Pure Go standard library (`net/http`, `crypto/hmac`, `crypto/sha256`, `crypto/rand`).
- **HMAC-SHA256 Authentication**: Compliant with Mekari Developer Center (MDC) specification.
- **SHA-256 Digest**: Automatically calculates body hash for integrity check.
- **RFC 1123 / HTTP Date Header**: Formatted with standard GMT timezone.
- **UUID v4 Idempotency Key**: Cryptographically random RFC 4122 v4 UUID.
- **Coretax (CTAS) Ready**: Supports 16-digit NPWP/NIK, 6-digit NITKU, and DPP Nilai Lain.

---

## 📋 Requirements
- Go 1.20 or later (tested on Go 1.25).

---

## ⚙️ Configuration & Environment Variables

Set your credentials as environment variables or update the constants inside [`example.go`](file:///Users/mekari/Work/hmac/klikpajak/go/example.go):

| Variable | Description | Default |
|---|---|---|
| `MEKARI_CLIENT_ID` | Your Mekari Application Client ID | `YOUR_MEKARI_CLIENT_ID` |
| `MEKARI_CLIENT_SECRET` | Your Mekari Application Client Secret | `YOUR_MEKARI_CLIENT_SECRET` |
| `MEKARI_BASE_URL` | Base API Gateway URL | `https://sandbox-api.mekari.com` |

---

## 🏃 Quick Start

Run directly via `go run`:

```bash
# Option 1: Inline environment variables
MEKARI_CLIENT_ID="your_client_id" \
MEKARI_CLIENT_SECRET="your_client_secret" \
go run example.go

# Option 2: Run directly (after editing example.go)
go run example.go
```
