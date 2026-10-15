<?php
/**
 * Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice (Faktur Pajak Keluaran)
 * Language: PHP (7.4+, 8.x)
 * Authentication: HMAC-SHA256
 */

// -----------------------------------------------------------------------------
// 1. CONFIGURATION
// -----------------------------------------------------------------------------
// Obtain these from Mekari Developer Center (MDC):
// Sandbox: https://sandbox-developers.mekari.com
// Production: https://developers.mekari.com
$clientId = getenv('MEKARI_CLIENT_ID') ?: 'YOUR_MEKARI_CLIENT_ID';
$clientSecret = getenv('MEKARI_CLIENT_SECRET') ?: 'YOUR_MEKARI_CLIENT_SECRET';

// Base URL:
// Sandbox: "https://sandbox-api.mekari.com"
// Production: "https://api.mekari.com"
$baseUrl = getenv('MEKARI_BASE_URL') ?: 'https://sandbox-api.mekari.com';

/**
 * Generate a random UUID v4 string.
 */
function generateUuidV4(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Generate HMAC-SHA256 authentication and integrity headers for Mekari Klikpajak API.
 * 
 * @param string $method HTTP method
 * @param string $path URL path without query params
 * @param string $bodyString Raw JSON body string
 * @param string $clientId Mekari Client ID
 * @param string $clientSecret Mekari Client Secret
 * @param string|null $customIdempotencyKey Optional custom reference (e.g. invoice no) to prevent duplicate creation
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

    // 6. X-Idempotency-Key: Use your invoice reference or an auto-generated UUID v4
    $idempotencyKey = $customIdempotencyKey ?: generateUuidV4();

    // 7. Build headers array
    $headers = [
        'Authorization: ' . $authHeader,
        'Date: ' . $dateString,
        'Content-Type: application/json',
        'X-Idempotency-Key: ' . $idempotencyKey
    ];

    // 7. Digest header (SHA-256 hash of the request body)
    if (!empty($bodyString)) {
        $bodyDigest = 'SHA-256=' . base64_encode(hash('sha256', $bodyString, true));
        $headers[] = 'Digest: ' . $bodyDigest;
    }

    return $headers;
}

/**
 * Create a Single Tax Invoice (Faktur Pajak Keluaran) in CoreTax (CTAS)
 */
function createSingleTaxInvoice(string $baseUrl, string $clientId, string $clientSecret) {
    $path = "/v2/klikpajak/v2/efaktur/out";
    $queryParams = "?auto_approval=false&auto_calculate=true";
    $fullUrl = $baseUrl . $path . $queryParams;

    $timestamp = round(microtime(true) * 1000);
    $today = date('Y-m-d');

    $invoicePayload = [
        "client_reference_id" => "INV-" . $timestamp,
        "transaction_detail" => "04", // 01=Non-Pemungut, 02=Pemungut Bendahara, 04=DPP Nilai Lain, etc.
        "additional_trx_detail" => "00",
        "substitution_flag" => false,
        "substituted_tax_invoice_id" => null,
        "tax_invoice_number_term" => "",
        "description" => "Invoice Penjualan Barang & Jasa IT",
        "document_date" => $today,
        "reference" => "REF-" . $timestamp,
        "total_tax_base" => 10000000,
        "total_other_tax_base" => 10000000,
        "total_vat" => 1200000, // CoreTax 12% PPN
        "total_stlg" => 0,
        "total_price" => 10000000,
        "total_discount" => 0,
        "downpayment_flag" => 0,
        "downpayment_stlg" => 0,
        "downpayment_tax_base" => 0,
        "downpayment_other_tax_base" => 0,
        "downpayment_vat" => 0,
        "customer" => [
            "npwp" => "1091031210912281", // 16-digit NPWP or NIK
            "id_type" => "NPWP",
            "country_code" => "IDN",
            "other_id" => "",
            "name" => "PT Pembeli Sejahtera",
            "address" => "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
            "nitku" => "000000", // 6-digit NITKU
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

    $bodyString = json_encode($invoicePayload, JSON_UNESCAPED_SLASHES);
    $headers = generateHmacHeaders('POST', $path, $bodyString, $clientId, $clientSecret);

    echo "==================================================================\n";
    echo "Mekari Klikpajak CoreTax: Create Single Tax Invoice (Draft)\n";
    echo "==================================================================\n";
    echo "URL: " . $fullUrl . "\n";
    echo "Headers:\n" . print_r($headers, true) . "\n";
    echo "Payload Preview:\n" . json_encode($invoicePayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

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

// Run the script
createSingleTaxInvoice($baseUrl, $clientId, $clientSecret);
