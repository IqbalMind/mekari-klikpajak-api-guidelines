<?php
/**
 * Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice & Pengganti (Replacement)
 * Language: PHP (7.4+, 8.x)
 * Authentication: HMAC-SHA256
 */

// -----------------------------------------------------------------------------
// 1. CONFIGURATION
// -----------------------------------------------------------------------------
$clientId = getenv('MEKARI_CLIENT_ID') ?: 'YOUR_MEKARI_CLIENT_ID';
$clientSecret = getenv('MEKARI_CLIENT_SECRET') ?: 'YOUR_MEKARI_CLIENT_SECRET';
$baseUrl = getenv('MEKARI_BASE_URL') ?: 'https://sandbox-api.mekari.com';

/**
 * Generate a random UUID v4 string.
 */
function generateUuidV4(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Generate HMAC-SHA256 authentication and integrity headers for Mekari Klikpajak API.
 */
function generateHmacHeaders(string $method, string $path, string $bodyString, string $clientId, string $clientSecret, ?string $customIdempotencyKey = null): array {
    // 1. Date header in RFC 1123 / UTC format
    $dateString = gmdate('D, d M Y H:i:s T');

    // 2. Request Line format: '[METHOD] [PATH] HTTP/1.1'
    $requestLine = strtoupper($method) . " " . $path . " HTTP/1.1";

    // 3. Signing payload: 'date: <dateString>\n<requestLine>'
    $signingPayload = "date: " . $dateString . "\n" . $requestLine;

    // 4. HMAC-SHA256 signature
    $rawHmac = hash_hmac('sha256', $signingPayload, $clientSecret, true);
    $signature = base64_encode($rawHmac);

    // 5. Authorization header
    $authHeader = sprintf(
        'hmac username="%s", algorithm="hmac-sha256", headers="date request-line", signature="%s"',
        $clientId,
        $signature
    );

    // 6. X-Idempotency-Key (INVQBL0001 for normal, INVQBL0001-1 for replacement)
    $idempotencyKey = $customIdempotencyKey ?: generateUuidV4();

    // 7. Build headers array
    $headers = [
        'Authorization: ' . $authHeader,
        'Date: ' . $dateString,
        'Content-Type: application/json',
        'X-Idempotency-Key: ' . $idempotencyKey
    ];

    // 8. Digest header (SHA-256 hash of the request body)
    if (!empty($bodyString)) {
        $bodyDigest = 'SHA-256=' . base64_encode(hash('sha256', $bodyString, true));
        $headers[] = 'Digest: ' . $bodyDigest;
    }

    return $headers;
}

/**
 * Send request helper
 */
function sendInvoiceRequest(string $fullUrl, array $payload, array $headers, string $title) {
    $bodyString = json_encode($payload, JSON_UNESCAPED_SLASHES);

    echo "==================================================================\n";
    echo $title . "\n";
    echo "==================================================================\n";
    echo "URL: " . $fullUrl . "\n";
    echo "Headers:\n" . print_r($headers, true) . "\n";
    echo "Payload Preview:\n" . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

    echo "Sending request to Mekari Klikpajak API...\n";

    $ch = curl_init($fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyString);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);

    if ($curlError) {
        echo "\n❌ cURL Error: " . $curlError . "\n";
        return;
    }

    if ($httpCode >= 200 && $httpCode < 300) {
        echo "\n✅ Success! HTTP Status: " . $httpCode . "\n";
    } else {
        echo "\n❌ API Error: HTTP " . $httpCode . "\n";
    }

    echo "Response Body:\n" . $response . "\n";
}

/**
 * CASE 1: Create Normal Single Tax Invoice
 */
function createNormalInvoice(string $baseUrl, string $clientId, string $clientSecret, string $invoiceNumber = "INVQBL0001") {
    $path = "/v2/klikpajak/v2/efaktur/out";
    $fullUrl = $baseUrl . $path . "?auto_approval=false&auto_calculate=true";

    $payload = [
        "client_reference_id" => $invoiceNumber,
        "transaction_detail" => "04",
        "additional_trx_detail" => "00",
        "substitution_flag" => false,
        "substituted_tax_invoice_id" => null,
        "tax_invoice_number_term" => "",
        "description" => "Invoice Penjualan Normal",
        "document_date" => date('Y-m-d'),
        "reference" => $invoiceNumber,
        "total_tax_base" => 10000000,
        "total_other_tax_base" => 10000000,
        "total_vat" => 1200000,
        "total_stlg" => 0,
        "total_price" => 10000000,
        "total_discount" => 0,
        "downpayment_flag" => 0,
        "downpayment_stlg" => 0,
        "downpayment_tax_base" => 0,
        "downpayment_other_tax_base" => 0,
        "downpayment_vat" => 0,
        "customer" => [
            "npwp" => "1091031210912281",
            "id_type" => "NPWP",
            "country_code" => "IDN",
            "other_id" => "",
            "name" => "PT Pembeli Sejahtera",
            "address" => "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
            "nitku" => "000000",
            "email" => "finance@pembelisejahtera.co.id"
        ],
        "items" => [
            [
                "goods_service" => "GOODS",
                "goods_service_code" => "000000",
                "goods_service_name" => "Paket Server Rack 1U",
                "unit_price" => 10000000,
                "unit_measurement" => "UNIT",
                "selling_price" => 10000000,
                "quantity" => 1,
                "discount" => 0,
                "tax_base" => 10000000,
                "other_tax_base" => 10000000,
                "vat" => 1200000,
                "stlg_rate" => 0,
                "stlg" => 0
            ]
        ]
    ];

    $bodyString = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $headers = generateHmacHeaders('POST', $path, $bodyString, $clientId, $clientSecret, $invoiceNumber);
    sendInvoiceRequest($fullUrl, $payload, $headers, "CASE 1: Create Normal Tax Invoice (Draft)");
}

/**
 * CASE 2: Create Replacement Single Tax Invoice (Pengganti)
 */
function createReplacementInvoice(string $baseUrl, string $clientId, string $clientSecret, int $originalInvoiceId = 8219420, string $baseInvoiceNumber = "INVQBL0001", int $revision = 1) {
    $path = "/v2/klikpajak/v2/efaktur/out";
    $fullUrl = $baseUrl . $path . "?auto_approval=false&auto_calculate=true";

    $replacementKey = $baseInvoiceNumber . "-" . $revision; // e.g. "INVQBL0001-1"

    $payload = [
        "client_reference_id" => $replacementKey,
        "transaction_detail" => "04",
        "additional_trx_detail" => "00",
        "substitution_flag" => true,
        "substituted_tax_invoice_id" => $originalInvoiceId,
        "tax_invoice_number_term" => "",
        "description" => "Invoice Penjualan Pengganti ke-" . $revision,
        "document_date" => date('Y-m-d'),
        "reference" => $replacementKey,
        "total_tax_base" => 12000000,
        "total_other_tax_base" => 12000000,
        "total_vat" => 1440000,
        "total_stlg" => 0,
        "total_price" => 12000000,
        "total_discount" => 0,
        "downpayment_flag" => 0,
        "downpayment_stlg" => 0,
        "downpayment_tax_base" => 0,
        "downpayment_other_tax_base" => 0,
        "downpayment_vat" => 0,
        "customer" => [
            "npwp" => "1091031210912281",
            "id_type" => "NPWP",
            "country_code" => "IDN",
            "other_id" => "",
            "name" => "PT Pembeli Sejahtera",
            "address" => "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
            "nitku" => "000000",
            "email" => "finance@pembelisejahtera.co.id"
        ],
        "items" => [
            [
                "goods_service" => "GOODS",
                "goods_service_code" => "000000",
                "goods_service_name" => "Paket Server Rack 1U (Revisi Spesifikasi)",
                "unit_price" => 12000000,
                "unit_measurement" => "UNIT",
                "selling_price" => 12000000,
                "quantity" => 1,
                "discount" => 0,
                "tax_base" => 12000000,
                "other_tax_base" => 12000000,
                "vat" => 1440000,
                "stlg_rate" => 0,
                "stlg" => 0
            ]
        ]
    ];

    $bodyString = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $headers = generateHmacHeaders('POST', $path, $bodyString, $clientId, $clientSecret, $replacementKey);
    sendInvoiceRequest($fullUrl, $payload, $headers, "CASE 2: Create Replacement Tax Invoice (Pengganti #" . $revision . ")");
}

// Execute both cases
createNormalInvoice($baseUrl, $clientId, $clientSecret, "INVQBL0001");
echo "\n------------------------------------------------------------------\n\n";
createReplacementInvoice($baseUrl, $clientId, $clientSecret, 8219420, "INVQBL0001", 1);
