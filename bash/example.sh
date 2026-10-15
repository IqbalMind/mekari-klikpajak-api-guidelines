#!/usr/bin/env bash
# ==============================================================================
# Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice (Faktur Pajak Keluaran)
# Language: Bash / cURL
# Authentication: HMAC-SHA256
# ==============================================================================

set -euo pipefail

# 1. CONFIGURATION
# ------------------------------------------------------------------------------
# Obtain credentials from Mekari Developer Center (MDC):
# Sandbox: https://sandbox-developers.mekari.com
# Production: https://developers.mekari.com
CLIENT_ID="${MEKARI_CLIENT_ID:-YOUR_MEKARI_CLIENT_ID}"
CLIENT_SECRET="${MEKARI_CLIENT_SECRET:-YOUR_MEKARI_CLIENT_SECRET}"
BASE_URL="${MEKARI_BASE_URL:-https://sandbox-api.mekari.com}"

METHOD="POST"
PATH_ENDPOINT="/v2/klikpajak/v2/efaktur/out"
QUERY_PARAMS="?auto_approval=false&auto_calculate=true"
FULL_URL="${BASE_URL}${PATH_ENDPOINT}${QUERY_PARAMS}"

TIMESTAMP=$(date +%s)
TODAY=$(date "+%Y-%m-%d")

# 2. CONSTRUCT JSON BODY
# ------------------------------------------------------------------------------
BODY=$(cat <<EOF
{
    "client_reference_id": "INV-${TIMESTAMP}",
    "transaction_detail": "04",
    "additional_trx_detail": "00",
    "substitution_flag": false,
    "substituted_tax_invoice_id": null,
    "tax_invoice_number_term": "",
    "description": "Invoice Penjualan Barang & Jasa IT",
    "document_date": "${TODAY}",
    "reference": "REF-${TIMESTAMP}",
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
EOF
)

# 3. GENERATE HEADERS
# ------------------------------------------------------------------------------
# Date header in RFC 1123 / UTC format
DATE_STRING=$(date -u "+%a, %d %b %Y %H:%M:%S GMT")

# Request line format: '[METHOD] [PATH] HTTP/1.1'
REQUEST_LINE="${METHOD} ${PATH_ENDPOINT} HTTP/1.1"

# Signing payload: 'date: <date>\n<request_line>'
PAYLOAD=$(printf "date: %s\n%s" "${DATE_STRING}" "${REQUEST_LINE}")

# HMAC-SHA256 signature
SIGNATURE=$(printf "%s" "${PAYLOAD}" | openssl dgst -sha256 -hmac "${CLIENT_SECRET}" -binary | base64)

# Authorization header
AUTH_HEADER="hmac username=\"${CLIENT_ID}\", algorithm=\"hmac-sha256\", headers=\"date request-line\", signature=\"${SIGNATURE}\""

# SHA-256 Digest of body
BODY_HASH=$(printf "%s" "${BODY}" | openssl dgst -sha256 -binary | base64)
DIGEST_HEADER="SHA-256=${BODY_HASH}"

# Idempotency Key (Set CUSTOM_IDEMPOTENCY_KEY to prevent duplicate creation, or default to UUID v4)
if [ -n "${CUSTOM_IDEMPOTENCY_KEY:-}" ]; then
    IDEMPOTENCY_KEY="${CUSTOM_IDEMPOTENCY_KEY}"
elif command -v uuidgen >/dev/null 2>&1; then
    IDEMPOTENCY_KEY=$(uuidgen | tr '[:upper:]' '[:lower:]')
else
    IDEMPOTENCY_KEY=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "inv-${TIMESTAMP}")
fi

echo "=================================================================="
echo "Mekari Klikpajak CoreTax: Create Single Tax Invoice (Draft)"
echo "=================================================================="
echo "URL: ${FULL_URL}"
echo "Date: ${DATE_STRING}"
echo "Authorization: ${AUTH_HEADER}"
echo "Digest: ${DIGEST_HEADER}"
echo "X-Idempotency-Key: ${IDEMPOTENCY_KEY}"
echo ""
echo "Sending request to Mekari Klikpajak API..."

curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "${FULL_URL}" \
    -H "Authorization: ${AUTH_HEADER}" \
    -H "Date: ${DATE_STRING}" \
    -H "Digest: ${DIGEST_HEADER}" \
    -H "X-Idempotency-Key: ${IDEMPOTENCY_KEY}" \
    -H "Content-Type: application/json" \
    -d "${BODY}"
