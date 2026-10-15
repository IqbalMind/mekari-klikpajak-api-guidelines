# Mekari Klikpajak CoreTax (CTAS) - Java Implementation

This directory provides a production-ready Java implementation for creating **Single Tax Invoices (Faktur Pajak Keluaran Normal & Pengganti)** in CoreTax using **HMAC-SHA256** authentication.

---

## 🚀 Features
- **Zero External Dependencies**: Pure Java 11+ standard library (`java.net.http.HttpClient`, `javax.crypto.Mac`, `java.security.MessageDigest`).
- **HMAC-SHA256 Signature**: RFC 1123 UTC Date formatting and standard HMAC digest.
- **SHA-256 Digest**: Automatically computes payload body hash for integrity.
- **X-Idempotency-Key**: Supports custom invoice numbers (`INVQBL0001`) and replacement suffixes (`-1`, `-2`).
- **Enterprise Ready**: Easily pluggable into Spring Boot, Quarkus, Micronaut, or Jakarta EE.

---

## 📋 Requirements
- Java 11 or later (Java 17 / 21 LTS recommended).

---

## 🏃 Compilation & Run

Compile and run using standard `javac` and `java`:

```bash
# Compile
javac -d bin Example.java

# Run with environment variables
MEKARI_CLIENT_ID="your_client_id" \
MEKARI_CLIENT_SECRET="your_client_secret" \
java -cp bin com.mekari.klikpajak.example.Example
```
