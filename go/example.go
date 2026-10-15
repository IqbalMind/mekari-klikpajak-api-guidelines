package main

/**
 * Mekari Klikpajak CoreTax (CTAS) - Create Single Tax Invoice (Faktur Pajak Keluaran)
 * Language: Go 1.21+ (Pure standard library, zero external dependencies)
 * Authentication: HMAC-SHA256
 */

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Generate a random RFC 4122 compliant UUID v4 string
func generateUUIDv4() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // Version 4
	b[8] = (b[8] & 0x3f) | 0x80 // RFC 4122 variant
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// Generate HMAC-SHA256 authentication and integrity headers
func generateHmacHeaders(method, path string, bodyBytes []byte, clientID, clientSecret, customIdempotencyKey string) map[string]string {
	// 1. Date header in RFC 1123 / UTC format with GMT zone (RFC 7231 / HTTP standard)
	dateString := time.Now().UTC().Format(http.TimeFormat)

	// 2. Request Line format: '[METHOD] [PATH] HTTP/1.1'
	requestLine := fmt.Sprintf("%s %s HTTP/1.1", strings.ToUpper(method), path)

	// 3. Signing payload: 'date: <dateString>\n<requestLine>'
	signingPayload := fmt.Sprintf("date: %s\n%s", dateString, requestLine)

	// 4. HMAC-SHA256 signature
	mac := hmac.New(sha256.New, []byte(clientSecret))
	mac.Write([]byte(signingPayload))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// 5. Authorization header
	authHeader := fmt.Sprintf(`hmac username="%s", algorithm="hmac-sha256", headers="date request-line", signature="%s"`, clientID, signature)

	// 6. X-Idempotency-Key: Use your invoice reference or an auto-generated UUID v4
	idempotencyKey := customIdempotencyKey
	if idempotencyKey == "" {
		idempotencyKey = generateUUIDv4()
	}

	headers := map[string]string{
		"Authorization":     authHeader,
		"Date":              dateString,
		"Content-Type":      "application/json",
		"X-Idempotency-Key": idempotencyKey,
	}

	// 6. Digest header (SHA-256 hash of body)
	if len(bodyBytes) > 0 {
		h := sha256.New()
		h.Write(bodyBytes)
		bodyDigest := "SHA-256=" + base64.StdEncoding.EncodeToString(h.Sum(nil))
		headers["Digest"] = bodyDigest
	}

	return headers
}

func main() {
	clientID := os.Getenv("MEKARI_CLIENT_ID")
	if clientID == "" {
		clientID = "YOUR_MEKARI_CLIENT_ID"
	}

	clientSecret := os.Getenv("MEKARI_CLIENT_SECRET")
	if clientSecret == "" {
		clientSecret = "YOUR_MEKARI_CLIENT_SECRET"
	}

	baseURL := os.Getenv("MEKARI_BASE_URL")
	if baseURL == "" {
		baseURL = "https://sandbox-api.mekari.com"
	}

	path := "/v2/klikpajak/v2/efaktur/out"
	queryParams := "?auto_approval=false&auto_calculate=true"
	fullURL := baseURL + path + queryParams

	now := time.Now()
	invoicePayload := map[string]interface{}{
		"client_reference_id":        fmt.Sprintf("INV-%d", now.UnixMilli()),
		"transaction_detail":         "04", // 01=Non-Pemungut, 02=Pemungut Bendahara, 04=DPP Nilai Lain
		"additional_trx_detail":      "00",
		"substitution_flag":          false,
		"substituted_tax_invoice_id": nil,
		"tax_invoice_number_term":    "",
		"description":                "Invoice Penjualan Barang & Jasa IT",
		"document_date":              now.Format("2006-01-02"),
		"reference":                  fmt.Sprintf("REF-%d", now.UnixMilli()),
		"total_tax_base":             10000000,
		"total_other_tax_base":       10000000,
		"total_vat":                  1200000, // CoreTax 12% PPN
		"total_stlg":                 0,
		"total_price":                10000000,
		"total_discount":             0,
		"downpayment_flag":           0,
		"downpayment_stlg":           0,
		"downpayment_tax_base":       0,
		"downpayment_other_tax_base": 0,
		"downpayment_vat":            0,
		"customer": map[string]interface{}{
			"npwp":         "1091031210912281", // 16-digit NPWP or NIK
			"id_type":      "NPWP",
			"country_code": "IDN",
			"other_id":     "",
			"name":         "PT Pembeli Sejahtera",
			"address":      "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
			"nitku":        "000000", // 6-digit NITKU
			"email":        "finance@pembelisejahtera.co.id",
		},
		"items": []map[string]interface{}{
			{
				"goods_service":      "GOODS",
				"goods_service_code": "000000",
				"goods_service_name": "Paket Server Rack 1U",
				"unit_price":         10000000,
				"unit_measurement":   "UNIT",
				"selling_price":      10000000,
				"quantity":           1,
				"discount":           0,
				"tax_base":           10000000,
				"other_tax_base":     10000000,
				"vat":                1200000,
				"stlg_rate":          0,
				"stlg":               0,
			},
		},
	}

	bodyBytes, err := json.Marshal(invoicePayload)
	if err != nil {
		fmt.Printf("Error marshaling payload: %v\n", err)
		return
	}

	// Pass empty string for auto-generated UUID v4, or pass custom invoice ID (e.g. "INV-001") to prevent duplicate creation
	headers := generateHmacHeaders("POST", path, bodyBytes, clientID, clientSecret, "")

	fmt.Println("==================================================================")
	fmt.Println("Mekari Klikpajak CoreTax: Create Single Tax Invoice (Draft)")
	fmt.Println("==================================================================")
	fmt.Printf("URL: %s\n", fullURL)
	prettyHeaders, _ := json.MarshalIndent(headers, "", "  ")
	fmt.Printf("Headers:\n%s\n", string(prettyHeaders))
	prettyPayload, _ := json.MarshalIndent(invoicePayload, "", "  ")
	fmt.Printf("\nPayload Preview:\n%s\n\n", string(prettyPayload))

	fmt.Println("Sending request to Mekari Klikpajak API...")

	req, err := http.NewRequest("POST", fullURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return
	}

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("\n❌ Network/Request Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		fmt.Printf("\n✅ Success! HTTP Status: %d\n", resp.StatusCode)
	} else {
		fmt.Printf("\n❌ API Error: HTTP %d\n", resp.StatusCode)
	}
	fmt.Printf("Response Body:\n%s\n", string(respBody))
}
