"""
Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice & Pengganti (Replacement)
Language: Python 3
Authentication: HMAC-SHA256
"""

import os
import json
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
CLIENT_ID = os.getenv("MEKARI_CLIENT_ID", "YOUR_MEKARI_CLIENT_ID")
CLIENT_SECRET = os.getenv("MEKARI_CLIENT_SECRET", "YOUR_MEKARI_CLIENT_SECRET")
BASE_URL = os.getenv("MEKARI_BASE_URL", "https://sandbox-api.mekari.com")


def generate_hmac_headers(method: str, path: str, body_string: str, client_id: str, client_secret: str, custom_idempotency_key: str = None) -> dict:
    """
    Generate HMAC-SHA256 authentication and integrity headers for Mekari Klikpajak API.
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

    # 6. X-Idempotency-Key:
    # - Normal: 'INVQBL0001'
    # - Pengganti 1: 'INVQBL0001-1'
    # - Pengganti 2: 'INVQBL0001-2'
    idempotency_key = custom_idempotency_key or str(uuid.uuid4())

    headers = {
        "Authorization": auth_header,
        "Date": date_string,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotency_key
    }

    if body_string:
        body_hash = hashlib.sha256(body_string.encode('utf-8')).digest()
        digest_b64 = base64.b64encode(body_hash).decode('utf-8')
        headers["Digest"] = f"SHA-256={digest_b64}"

    return headers


def send_invoice_request(full_url: str, payload: dict, headers: dict, title: str):
    body_string = json.dumps(payload)
    print("==================================================================")
    print(title)
    print("==================================================================")
    print(f"URL: {full_url}")
    print("Headers:")
    print(json.dumps(headers, indent=2))
    print("\nPayload Preview:")
    print(json.dumps(payload, indent=2))

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
                print(json.dumps(parsed, indent=2))
            except json.JSONDecodeError:
                print(response_body)
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


def create_normal_invoice(invoice_number="INVQBL0001"):
    path = "/v2/klikpajak/v2/efaktur/out"
    full_url = f"{BASE_URL}{path}?auto_approval=false&auto_calculate=true"
    today_str = datetime.now().strftime("%Y-%m-%d")

    payload = {
        "client_reference_id": invoice_number,
        "transaction_detail": "04",
        "additional_trx_detail": "00",
        "substitution_flag": False,
        "substituted_tax_invoice_id": None,
        "tax_invoice_number_term": "",
        "description": "Invoice Penjualan Normal",
        "document_date": today_str,
        "reference": invoice_number,
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

    body_string = json.dumps(payload)
    headers = generate_hmac_headers("POST", path, body_string, CLIENT_ID, CLIENT_SECRET, invoice_number)
    send_invoice_request(full_url, payload, headers, "CASE 1: Create Normal Tax Invoice (Draft)")


def create_replacement_invoice(original_invoice_id=8219420, base_invoice_number="INVQBL0001", revision=1):
    path = "/v2/klikpajak/v2/efaktur/out"
    full_url = f"{BASE_URL}{path}?auto_approval=false&auto_calculate=true"
    today_str = datetime.now().strftime("%Y-%m-%d")

    replacement_key = f"{base_invoice_number}-{revision}" # e.g. "INVQBL0001-1"

    payload = {
        "client_reference_id": replacement_key,
        "transaction_detail": "04",
        "additional_trx_detail": "00",
        "substitution_flag": True,
        "substituted_tax_invoice_id": original_invoice_id,
        "tax_invoice_number_term": "",
        "description": f"Invoice Penjualan Pengganti ke-{revision}",
        "document_date": today_str,
        "reference": replacement_key,
        "total_tax_base": 12000000,
        "total_other_tax_base": 12000000,
        "total_vat": 1440000,
        "total_stlg": 0,
        "total_price": 12000000,
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
                "goods_service_name": "Paket Server Rack 1U (Revisi Spesifikasi)",
                "unit_price": 12000000,
                "unit_measurement": "UNIT",
                "selling_price": 12000000,
                "quantity": 1,
                "discount": 0,
                "tax_base": 12000000,
                "other_tax_base": 12000000,
                "vat": 1440000,
                "stlg_rate": 0,
                "stlg": 0
            }
        ]
    }

    body_string = json.dumps(payload)
    headers = generate_hmac_headers("POST", path, body_string, CLIENT_ID, CLIENT_SECRET, replacement_key)
    send_invoice_request(full_url, payload, headers, f"CASE 2: Create Replacement Tax Invoice (Pengganti #{revision})")


if __name__ == "__main__":
    create_normal_invoice("INVQBL0001")
    print("\n------------------------------------------------------------------\n")
    create_replacement_invoice(8219420, "INVQBL0001", 1)
