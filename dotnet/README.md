# Mekari Klikpajak CoreTax (CTAS) - .NET / C# Implementation

This directory provides a production-ready .NET 8 / C# implementation for creating **Single Tax Invoices (Faktur Pajak Keluaran Normal & Pengganti)** in CoreTax using **HMAC-SHA256** authentication.

---

## 🚀 Features
- **Zero Third-Party Dependencies**: Pure .NET standard library (`System.Net.Http.HttpClient`, `System.Security.Cryptography.HMACSHA256`).
- **HMAC-SHA256 Authentication**: RFC 1123 UTC Date formatting and standard HMAC digest.
- **SHA-256 Digest**: Automatically computes payload body hash for data integrity.
- **X-Idempotency-Key**: Supports custom invoice numbers (`INVQBL0001`) and replacement suffixes (`-1`, `-2`).
- **Modular Architecture**: Separate reusable client class [`KlikpajakApi.cs`](file:///Users/mekari/Work/hmac/klikpajak/dotnet/KlikpajakApi.cs) ready for Dependency Injection in ASP.NET Core or background workers.

---

## 📋 Requirements
- .NET 8.0 SDK or later (works on .NET 6 / 7 / 8 / 9).

---

## 🏃 Quick Start

Run directly via the .NET CLI:

```bash
# Option 1: Run with environment variables
MEKARI_CLIENT_ID="your_client_id" \
MEKARI_CLIENT_SECRET="your_client_secret" \
dotnet run

# Option 2: Build project
dotnet build
```
