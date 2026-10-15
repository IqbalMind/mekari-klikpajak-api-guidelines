/**
 * Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice (Faktur Pajak Keluaran)
 * Language: Node.js (v18+ Native Fetch, zero external dependencies required)
 * Authentication: HMAC-SHA256
 */

const crypto = require('crypto');

// -----------------------------------------------------------------------------
// 1. CONFIGURATION
// -----------------------------------------------------------------------------
// Obtain these from Mekari Developer Center (MDC):
// Sandbox: https://sandbox-developers.mekari.com
// Production: https://developers.mekari.com
const CLIENT_ID = process.env.MEKARI_CLIENT_ID || "YOUR_MEKARI_CLIENT_ID";
const CLIENT_SECRET = process.env.MEKARI_CLIENT_SECRET || "YOUR_MEKARI_CLIENT_SECRET";

// Base URL:
// Sandbox: "https://sandbox-api.mekari.com"
// Production: "https://api.mekari.com"
const BASE_URL = process.env.MEKARI_BASE_URL || "https://sandbox-api.mekari.com";

/**
 * Generate HMAC-SHA256 authentication and integrity headers for Mekari Klikpajak API.
 * 
 * @param {string} method - HTTP method (e.g. 'POST', 'GET', 'PUT', 'DELETE')
 * @param {string} path - URL path without query params (e.g. '/v2/klikpajak/v2/efaktur/out')
 * @param {string} bodyString - Raw JSON string of the request body (empty string for GET)
 * @param {string} clientId - Mekari API Client ID
 * @param {string} clientSecret - Mekari API Client Secret
 * @returns {object} Object containing all required headers
 */
function generateHmacHeaders(method, path, bodyString, clientId, clientSecret) {
    // 1. Date header in RFC 1123 / UTC format (e.g., 'Thu, 15 Oct 2026 06:15:00 GMT')
    const dateString = new Date().toUTCString();

    // 2. Request Line format: '[METHOD] [PATH] HTTP/1.1'
    const requestLine = `${method.toUpperCase()} ${path} HTTP/1.1`;

    // 3. Signing payload: 'date: <dateString>\n<requestLine>'
    const signingPayload = `date: ${dateString}\n${requestLine}`;

    // 4. HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(signingPayload);
    const signature = hmac.digest('base64');

    // 5. Authorization header
    const authHeader = `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`;

    // 6. Digest header (SHA-256 hash of the request body)
    let digestHeader = "";
    if (bodyString && bodyString.length > 0) {
        const bodyHash = crypto.createHash('sha256').update(bodyString, 'utf8').digest('base64');
        digestHeader = `SHA-256=${bodyHash}`;
    }

    // 7. Idempotency Key (UUID v4)
    const idempotencyKey = crypto.randomUUID();

    const headers = {
        'Authorization': authHeader,
        'Date': dateString,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
    };

    if (digestHeader) {
        headers['Digest'] = digestHeader;
    }

    return headers;
}

/**
 * Create a Single Tax Invoice (Faktur Pajak Keluaran) in CoreTax (CTAS)
 */
async function createSingleTaxInvoice() {
    // Endpoint path (excluding query params for the request line in HMAC signature)
    const path = "/v2/klikpajak/v2/efaktur/out";

    // Query parameters:
    // - auto_approval: true = submit immediately to DJP, false = save as draft
    // - auto_calculate: true = Klikpajak calculates totals/taxes automatically
    const queryParams = "?auto_approval=false&auto_calculate=true";
    const fullUrl = `${BASE_URL}${path}${queryParams}`;

    // Sample CoreTax CTAS Single Tax Invoice Payload
    const invoicePayload = {
        "client_reference_id": `INV-${Date.now()}`,
        "transaction_detail": "04", // 01=Non-Pemungut, 02=Pemungut Bendahara, 04=DPP Nilai Lain, etc.
        "additional_trx_detail": "00",
        "substitution_flag": false,
        "substituted_tax_invoice_id": null,
        "tax_invoice_number_term": "",
        "description": "Invoice Penjualan Barang & Jasa IT",
        "document_date": new Date().toISOString().split('T')[0], // YYYY-MM-DD
        "reference": `REF-${Date.now()}`,
        "total_tax_base": 10000000,
        "total_other_tax_base": 10000000,
        "total_vat": 1200000, // CoreTax 12% PPN
        "total_stlg": 0,
        "total_price": 10000000,
        "total_discount": 0,
        "downpayment_flag": 0,
        "downpayment_stlg": 0,
        "downpayment_tax_base": 0,
        "downpayment_other_tax_base": 0,
        "downpayment_vat": 0,
        "customer": {
            "npwp": "1091031210912281", // 16-digit NPWP or NIK
            "id_type": "NPWP",
            "country_code": "IDN",
            "other_id": "",
            "name": "PT Pembeli Sejahtera",
            "address": "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
            "nitku": "000000", // 6-digit NITKU
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
    };

    const bodyString = JSON.stringify(invoicePayload);
    const headers = generateHmacHeaders('POST', path, bodyString, CLIENT_ID, CLIENT_SECRET);

    console.log("==================================================================");
    console.log("Mekari Klikpajak CoreTax: Create Single Tax Invoice (Draft)");
    console.log("==================================================================");
    console.log(`URL: ${fullUrl}`);
    console.log("Headers:");
    console.log(JSON.stringify(headers, null, 2));
    console.log("\nPayload Preview:");
    console.log(JSON.stringify(invoicePayload, null, 2));

    try {
        console.log("\nSending request to Mekari Klikpajak API...");
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: headers,
            body: bodyString
        });

        const status = response.status;
        const responseText = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        if (response.ok) {
            console.log(`\n✅ Success! HTTP Status: ${status}`);
            console.log("Response Body:");
            console.log(JSON.stringify(responseData, null, 2));
        } else {
            console.error(`\n❌ API Error: HTTP ${status}`);
            console.error(typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData);
        }
        return responseData;
    } catch (error) {
        console.error(`\n❌ Network/Request Error:`, error.message);
    }
}

// Execute the example
createSingleTaxInvoice();
