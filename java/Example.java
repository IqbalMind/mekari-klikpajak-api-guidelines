package com.mekari.klikpajak.example;

/**
 * Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice & Pengganti (Replacement)
 * Language: Java 11+ (Standard Library HttpClient, zero external dependencies required)
 * Authentication: HMAC-SHA256
 */

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class Example {

    // -------------------------------------------------------------------------
    // 1. CONFIGURATION
    // -------------------------------------------------------------------------
    private static final String CLIENT_ID = System.getenv().getOrDefault("MEKARI_CLIENT_ID", "YOUR_MEKARI_CLIENT_ID");
    private static final String CLIENT_SECRET = System.getenv().getOrDefault("MEKARI_CLIENT_SECRET", "YOUR_MEKARI_CLIENT_SECRET");
    private static final String BASE_URL = System.getenv().getOrDefault("MEKARI_BASE_URL", "https://sandbox-api.mekari.com");

    /**
     * Generate HMAC-SHA256 authentication and integrity headers for Mekari Klikpajak API.
     */
    public static Map<String, String> generateHmacHeaders(
            String method,
            String path,
            String bodyString,
            String clientId,
            String clientSecret,
            String customIdempotencyKey
    ) throws NoSuchAlgorithmException, InvalidKeyException {

        // 1. Date header in RFC 1123 / UTC format
        String dateString = ZonedDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.RFC_1123_DATE_TIME);

        // 2. Request Line format: '[METHOD] [PATH] HTTP/1.1'
        String requestLine = String.format("%s %s HTTP/1.1", method.toUpperCase(), path);

        // 3. Signing payload: 'date: <dateString>\n<requestLine>'
        String signingPayload = String.format("date: %s\n%s", dateString, requestLine);

        // 4. HMAC-SHA256 signature
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(clientSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] signatureBytes = mac.doFinal(signingPayload.getBytes(StandardCharsets.UTF_8));
        String signature = Base64.getEncoder().encodeToString(signatureBytes);

        // 5. Authorization header
        String authHeader = String.format(
                "hmac username=\"%s\", algorithm=\"hmac-sha256\", headers=\"date request-line\", signature=\"%s\"",
                clientId, signature
        );

        // 6. X-Idempotency-Key: Use custom key (e.g. INVQBL0001-1 for Pengganti) or UUID v4
        String idempotencyKey = (customIdempotencyKey != null && !customIdempotencyKey.isBlank())
                ? customIdempotencyKey
                : UUID.randomUUID().toString();

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", authHeader);
        headers.put("Date", dateString);
        headers.put("Content-Type", "application/json");
        headers.put("X-Idempotency-Key", idempotencyKey);

        // 7. Digest header (SHA-256 hash of the request body)
        if (bodyString != null && !bodyString.isEmpty()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bodyString.getBytes(StandardCharsets.UTF_8));
            String bodyDigest = "SHA-256=" + Base64.getEncoder().encodeToString(hash);
            headers.put("Digest", bodyDigest);
        }

        return headers;
    }

    /**
     * Helper to send invoice request using standard Java 11+ HttpClient
     */
    private static void sendInvoiceRequest(String fullUrl, String bodyJson, Map<String, String> headers, String title) {
        System.out.println("==================================================================");
        System.out.println(title);
        System.out.println("==================================================================");
        System.out.println("URL: " + fullUrl);
        System.out.println("Headers:");
        headers.forEach((k, v) -> System.out.println("  " + k + ": " + v));
        System.out.println("\nPayload Preview:\n" + bodyJson);

        System.out.println("\nSending request to Mekari Klikpajak API...");
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30))
                    .build();

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8));

            headers.forEach(reqBuilder::header);

            HttpResponse<String> response = client.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                System.out.println("\n✅ Success! HTTP Status: " + response.statusCode());
            } else {
                System.out.println("\n❌ API Error: HTTP " + response.statusCode());
            }
            System.out.println("Response Body:\n" + response.body());

        } catch (IOException | InterruptedException e) {
            System.out.println("\n❌ Network/Request Error: " + e.getMessage());
        }
    }

    /**
     * CASE 1: Create Normal Single Tax Invoice
     */
    public static void createNormalInvoice(String invoiceNumber) throws NoSuchAlgorithmException, InvalidKeyException {
        String path = "/v2/klikpajak/v2/efaktur/out";
        String fullUrl = BASE_URL + path + "?auto_approval=false&auto_calculate=true";
        String today = LocalDate.now().toString();

        String payload = "{\n" +
                "  \"client_reference_id\": \"" + invoiceNumber + "\",\n" +
                "  \"transaction_detail\": \"04\",\n" +
                "  \"additional_trx_detail\": \"00\",\n" +
                "  \"substitution_flag\": false,\n" +
                "  \"substituted_tax_invoice_id\": null,\n" +
                "  \"tax_invoice_number_term\": \"\",\n" +
                "  \"description\": \"Invoice Penjualan Normal\",\n" +
                "  \"document_date\": \"" + today + "\",\n" +
                "  \"reference\": \"" + invoiceNumber + "\",\n" +
                "  \"total_tax_base\": 10000000,\n" +
                "  \"total_other_tax_base\": 10000000,\n" +
                "  \"total_vat\": 1200000,\n" +
                "  \"total_stlg\": 0,\n" +
                "  \"total_price\": 10000000,\n" +
                "  \"total_discount\": 0,\n" +
                "  \"downpayment_flag\": 0,\n" +
                "  \"downpayment_stlg\": 0,\n" +
                "  \"downpayment_tax_base\": 0,\n" +
                "  \"downpayment_other_tax_base\": 0,\n" +
                "  \"downpayment_vat\": 0,\n" +
                "  \"customer\": {\n" +
                "    \"npwp\": \"1091031210912281\",\n" +
                "    \"id_type\": \"NPWP\",\n" +
                "    \"country_code\": \"IDN\",\n" +
                "    \"other_id\": \"\",\n" +
                "    \"name\": \"PT Pembeli Sejahtera\",\n" +
                "    \"address\": \"Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan\",\n" +
                "    \"nitku\": \"000000\",\n" +
                "    \"email\": \"finance@pembelisejahtera.co.id\"\n" +
                "  },\n" +
                "  \"items\": [\n" +
                "    {\n" +
                "      \"goods_service\": \"GOODS\",\n" +
                "      \"goods_service_code\": \"000000\",\n" +
                "      \"goods_service_name\": \"Paket Server Rack 1U\",\n" +
                "      \"unit_price\": 10000000,\n" +
                "      \"unit_measurement\": \"UNIT\",\n" +
                "      \"selling_price\": 10000000,\n" +
                "      \"quantity\": 1,\n" +
                "      \"discount\": 0,\n" +
                "      \"tax_base\": 10000000,\n" +
                "      \"other_tax_base\": 10000000,\n" +
                "      \"vat\": 1200000,\n" +
                "      \"stlg_rate\": 0,\n" +
                "      \"stlg\": 0\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        Map<String, String> headers = generateHmacHeaders("POST", path, payload, CLIENT_ID, CLIENT_SECRET, invoiceNumber);
        sendInvoiceRequest(fullUrl, payload, headers, "CASE 1: Create Normal Tax Invoice (Draft)");
    }

    /**
     * CASE 2: Create Replacement Single Tax Invoice (Pengganti)
     */
    public static void createReplacementInvoice(long originalInvoiceId, String baseInvoiceNumber, int revision)
            throws NoSuchAlgorithmException, InvalidKeyException {

        String path = "/v2/klikpajak/v2/efaktur/out";
        String fullUrl = BASE_URL + path + "?auto_approval=false&auto_calculate=true";
        String today = LocalDate.now().toString();
        String replacementKey = baseInvoiceNumber + "-" + revision; // e.g. INVQBL0001-1

        String payload = "{\n" +
                "  \"client_reference_id\": \"" + replacementKey + "\",\n" +
                "  \"transaction_detail\": \"04\",\n" +
                "  \"additional_trx_detail\": \"00\",\n" +
                "  \"substitution_flag\": true,\n" +
                "  \"substituted_tax_invoice_id\": " + originalInvoiceId + ",\n" +
                "  \"tax_invoice_number_term\": \"\",\n" +
                "  \"description\": \"Invoice Penjualan Pengganti ke-" + revision + "\",\n" +
                "  \"document_date\": \"" + today + "\",\n" +
                "  \"reference\": \"" + replacementKey + "\",\n" +
                "  \"total_tax_base\": 12000000,\n" +
                "  \"total_other_tax_base\": 12000000,\n" +
                "  \"total_vat\": 1440000,\n" +
                "  \"total_stlg\": 0,\n" +
                "  \"total_price\": 12000000,\n" +
                "  \"total_discount\": 0,\n" +
                "  \"downpayment_flag\": 0,\n" +
                "  \"downpayment_stlg\": 0,\n" +
                "  \"downpayment_tax_base\": 0,\n" +
                "  \"downpayment_other_tax_base\": 0,\n" +
                "  \"downpayment_vat\": 0,\n" +
                "  \"customer\": {\n" +
                "    \"npwp\": \"1091031210912281\",\n" +
                "    \"id_type\": \"NPWP\",\n" +
                "    \"country_code\": \"IDN\",\n" +
                "    \"other_id\": \"\",\n" +
                "    \"name\": \"PT Pembeli Sejahtera\",\n" +
                "    \"address\": \"Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan\",\n" +
                "    \"nitku\": \"000000\",\n" +
                "    \"email\": \"finance@pembelisejahtera.co.id\"\n" +
                "  },\n" +
                "  \"items\": [\n" +
                "    {\n" +
                "      \"goods_service\": \"GOODS\",\n" +
                "      \"goods_service_code\": \"000000\",\n" +
                "      \"goods_service_name\": \"Paket Server Rack 1U (Revisi Spesifikasi)\",\n" +
                "      \"unit_price\": 12000000,\n" +
                "      \"unit_measurement\": \"UNIT\",\n" +
                "      \"selling_price\": 12000000,\n" +
                "      \"quantity\": 1,\n" +
                "      \"discount\": 0,\n" +
                "      \"tax_base\": 12000000,\n" +
                "      \"other_tax_base\": 12000000,\n" +
                "      \"vat\": 1440000,\n" +
                "      \"stlg_rate\": 0,\n" +
                "      \"stlg\": 0\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        Map<String, String> headers = generateHmacHeaders("POST", path, payload, CLIENT_ID, CLIENT_SECRET, replacementKey);
        sendInvoiceRequest(fullUrl, payload, headers, "CASE 2: Create Replacement Tax Invoice (Pengganti #" + revision + ")");
    }

    public static void main(String[] args) {
        try {
            // 1. Create Normal Invoice
            createNormalInvoice("INVQBL0001");

            System.out.println("\n------------------------------------------------------------------\n");

            // 2. Create Replacement Invoice (Pengganti)
            createReplacementInvoice(8219420L, "INVQBL0001", 1);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
