"""
Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice (Faktur Pajak Keluaran)
Language: Python 3
Authentication: HMAC-SHA256
"""

import os
import json
import time
import uuid
import hmac
import hashlib
from datetime import datetime, timezone
from email.utils import format_datetime
import urllib.request
import urllib.error

# -----------------------------------------------------------------------------
# 1. CONFIGURATION
# -----------------------------------------------------------------------------
# Obtain these from Mekari Developer Center (MDC):
# Sandbox: https://sandbox-developers.mekari.com
# Production: https://developers.mekari.com
CLIENT_ID = os.getenv("MEKARI_CLIENT_ID", "YOUR_MEKARI_CLIENT_ID")
CLIENT_SECRET = os.getenv("MEKARI_CLIENT_SECRET", "YOUR_MEKARI_CLIENT_SECRET")

# Base URL:
# Sandbox: "https://sandbox-api.mekari.com"
# Production: "https://api.mekari.com"
BASE_URL = os.getenv("MEKARI_BASE_URL", "https://sandbox-api.mekari.com")


def generate_hmac_headers(method: str, path: str, body_string: str, client_id: str, client_secret: str) -> dict:
    """
    Generate HMAC-SHA256 authentication and integrity headers for Mekari Klikpajak API.
    
    :param method: HTTP method (e.g. 'POST', 'GET', 'PUT', 'DELETE')
    :param path: URL path without query params (e.g. '/v2/klikpajak/v2/efaktur/out')
    :param body_string: Raw JSON string of request body (empty string if no body)
    :param client_id: Mekari API Client ID
    :param client_secret: Mekari API Client Secret
    :return: Dictionary containing all required HTTP headers
    """
    # 1. Date in RFC 1123 format (e.g., 'Thu, 15 Oct 2026 06:15:00 GMT')
    now = datetime.now(timezone.utc)
    date_string = format_datetime(now, usegmt=True)

    # 2. Request Line: '[METHOD] [PATH] HTTP/1.1'
    request_line = f"{method.upper()} {path} HTTP/1.1"

    # 3. Signing payload: 'date: <date_string>\n<request_line>'
    signing_payload = f"date: {date_string}\n{request_line}"

    # 4. Generate HMAC-SHA256 signature
    signature = hmac.new(
        client_secret.encode('utf-8'),
        signing_payload.encode('utf-8'),
        hashlib.sha256
    ).digest()
    import base64
    signature_b64 = base64.b64encode(signature).decode('utf-8')

    # 5. Authorization header
    auth_header = (
        f'hmac username="{client_id}", '
        f'algorithm="hmac-sha256", '
        f'headers="date request-line", '
        f'signature="{signature_b64}"'
    )

    # 6. Digest header (SHA-256 hash of body)
    headers = {
        "Authorization": auth_header,
        "Date": date_string,
        "Content-Type": "application/json",
        "X-Idempotency-Key": str(uuid.uuid4())
    }

    if body_string:
        body_hash = hashlib.sha256(body_string.encode('utf-8')).digest()
        digest_b64 = base64.b64encode(body_hash).decode('utf-8')
        headers["Digest"] = f"SHA-256={digest_b64}"

    return headers


def create_single_tax_invoice():
    """
    Create a Single Tax Invoice (Faktur Pajak Keluaran) in CoreTax (CTAS)
    """
    path = "/v2/klikpajak/v2/efaktur/out"
    query_params = "?auto_approval=false&auto_calculate=true"
    full_url = f"{BASE_URL}{path}{query_params}"

    current_timestamp = int(time.time() * 1000)
    today_str = datetime.now().strftime("%Y-%m-%d")

    invoice_payload = {
        "client_reference_id": f"INV-{current_timestamp}",
        "transaction_detail": "04", # 01=Non-Pemungut, 02=Pemungut Bendahara, 04=DPP Nilai Lain, etc.
        "additional_trx_detail": "00",
        "substitution_flag": False,
        "substituted_tax_invoice_id": None,
        "tax_invoice_number_term": "",
        "description": "Invoice Penjualan Barang & Jasa IT",
        "document_date": today_str,
        "reference": f"REF-{current_timestamp}",
        "total_tax_base": 10000000,
        "total_other_tax_base": 10000000,
        "total_vat": 1200000, # CoreTax 12% PPN
        "total_stlg": 0,
        "total_price": 10000000,
        "total_discount": 0,
        "downpayment_flag": 0,
        "downpayment_stlg": 0,
        "downpayment_tax_base": 0,
        "downpayment_other_tax_base": 0,
        "downpayment_vat": 0,
        "customer": {
            "npwp": "1091031210912281", # 16-digit NPWP or NIK
            "id_type": "NPWP",
            "country_code": "IDN",
            "other_id": "",
            "name": "PT Pembeli Sejahtera",
            "address": "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
            "nitku": "000000", # 6-digit NITKU
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

    body_string = json.dumps(invoice_payload)
    headers = generate_hmac_headers("POST", path, body_string, CLIENT_ID, CLIENT_SECRET)

    print("==================================================================")
    print("Mekari Klikpajak CoreTax: Create Single Tax Invoice (Draft)")
    print("==================================================================")
    print(f"URL: {full_url}")
    print("Headers:")
    print(json.dumps(headers, indent=2))
    print("\nPayload Preview:")
    print(json.dumps(invoice_payload, indent=2))

    print("\nSending request to Mekari Klikpajak API...")
    req = urllib.request.Request(
        url=full_url,
        data=body_string.encode('utf-8'),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            response_body = response.read().decode('utf-8')
            print(f"\n✅ Success! HTTP Status: {status_code}")
            try:
                parsed = json.loads(response_body)
                print("Response Body:")
                print(json.dumps(parsed, indent=2))
            except json.JSONDecodeError:
                print("Response Body:", response_body)
    except urllib.error.HTTPError as e:
        print(f"\n❌ API Error: HTTP {e.code}")
        err_body = e.read().decode('utf-8')
        try:
            parsed = json.loads(err_body)
            print(json.dumps(parsed, indent=2))
        except json.JSONDecodeError:
            print(err_body)
    except Exception as e:
        print(f"\n❌ Network/Request Error: {e}")


if __name__ == "__main__":
    create_single_tax_invoice()
