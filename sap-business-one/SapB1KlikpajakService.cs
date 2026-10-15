using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Mekari.Klikpajak.SapBusinessOne
{
    /// <summary>
    /// Service to map SAP Business One A/R Invoices (OINV / INV1) to Mekari Klikpajak CoreTax e-Faktur.
    /// </summary>
    public class SapB1KlikpajakService
    {
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _baseUrl;
        private readonly HttpClient _httpClient;

        public SapB1KlikpajakService(string clientId, string clientSecret, string? baseUrl = null, HttpClient? httpClient = null)
        {
            _clientId = clientId ?? throw new ArgumentNullException(nameof(clientId));
            _clientSecret = clientSecret ?? throw new ArgumentNullException(nameof(clientSecret));
            _baseUrl = baseUrl ?? "https://sandbox-api.mekari.com";
            _httpClient = httpClient ?? new HttpClient();
        }

        /// <summary>
        /// Model representing SAP Business One A/R Invoice (OINV / INV1)
        /// </summary>
        public class SapArInvoice
        {
            public int DocEntry { get; set; }
            public int DocNum { get; set; }
            public string? NumAtCard { get; set; }
            public string CardCode { get; set; } = "";
            public string CardName { get; set; } = "";
            public string CustomerTaxId16 { get; set; } = ""; // 16-digit NPWP or NIK
            public string Nitku { get; set; } = "000000";     // 6-digit NITKU
            public string Address { get; set; } = "";
            public string Email { get; set; } = "";
            public DateTime DocDate { get; set; }
            public bool IsReplacement { get; set; }           // True if Faktur Pengganti
            public long? OriginalKlikpajakId { get; set; }    // Klikpajak ID of original invoice
            public int RevisionNumber { get; set; }           // 1, 2, ...
            public List<SapInvoiceLine> Lines { get; set; } = new();
        }

        public class SapInvoiceLine
        {
            public int LineNum { get; set; }
            public string ItemCode { get; set; } = "";
            public string ItemDescription { get; set; } = "";
            public decimal Quantity { get; set; }
            public decimal Price { get; set; }
            public decimal LineTotal { get; set; }
            public decimal VatAmount { get; set; }
            public decimal DiscountPercent { get; set; }
        }

        /// <summary>
        /// Transform SAP B1 Invoice into Klikpajak CoreTax Payload
        /// </summary>
        public object MapToCoreTaxPayload(SapArInvoice sapInvoice, out string idempotencyKey)
        {
            string baseRef = !string.IsNullOrEmpty(sapInvoice.NumAtCard)
                ? sapInvoice.NumAtCard
                : $"SAP-{sapInvoice.DocNum}";

            // Handle Idempotency Key & Suffix:
            // Normal: SAP-10045
            // Pengganti 1: SAP-10045-1
            // Pengganti 2: SAP-10045-2
            idempotencyKey = sapInvoice.IsReplacement
                ? $"{baseRef}-{Math.Max(1, sapInvoice.RevisionNumber)}"
                : baseRef;

            decimal totalTaxBase = 0;
            decimal totalVat = 0;
            var items = new List<object>();

            foreach (var line in sapInvoice.Lines)
            {
                totalTaxBase += line.LineTotal;
                totalVat += line.VatAmount;

                items.Add(new
                {
                    goods_service = "GOODS",
                    goods_service_code = "000000",
                    goods_service_name = line.ItemDescription,
                    unit_price = line.Price,
                    unit_measurement = "UNIT",
                    selling_price = line.LineTotal,
                    quantity = line.Quantity,
                    discount = (line.Price * line.Quantity) * (line.DiscountPercent / 100m),
                    tax_base = line.LineTotal,
                    other_tax_base = line.LineTotal,
                    vat = line.VatAmount,
                    stlg_rate = 0,
                    stlg = 0
                });
            }

            return new
            {
                client_reference_id = idempotencyKey,
                transaction_detail = "04",
                additional_trx_detail = "00",
                substitution_flag = sapInvoice.IsReplacement,
                substituted_tax_invoice_id = sapInvoice.OriginalKlikpajakId,
                tax_invoice_number_term = "",
                description = sapInvoice.IsReplacement
                    ? $"SAP B1 Invoice Pengganti #{sapInvoice.RevisionNumber}"
                    : $"SAP B1 Invoice {baseRef}",
                document_date = sapInvoice.DocDate.ToString("yyyy-MM-dd"),
                reference = idempotencyKey,
                total_tax_base = totalTaxBase,
                total_other_tax_base = totalTaxBase,
                total_vat = totalVat,
                total_stlg = 0,
                total_price = totalTaxBase,
                total_discount = 0,
                downpayment_flag = 0,
                downpayment_stlg = 0,
                downpayment_tax_base = 0,
                downpayment_other_tax_base = 0,
                downpayment_vat = 0,
                customer = new
                {
                    npwp = sapInvoice.CustomerTaxId16,
                    id_type = "NPWP",
                    country_code = "IDN",
                    other_id = "",
                    name = sapInvoice.CardName,
                    address = sapInvoice.Address,
                    nitku = sapInvoice.Nitku,
                    email = sapInvoice.Email
                },
                items = items
            };
        }

        /// <summary>
        /// Post SAP B1 Invoice to Klikpajak CoreTax
        /// </summary>
        public async Task<(int StatusCode, string ResponseBody)> SubmitToKlikpajakAsync(SapArInvoice sapInvoice, bool autoApproval = false)
        {
            var payloadObj = MapToCoreTaxPayload(sapInvoice, out string idempotencyKey);
            string jsonBody = JsonSerializer.Serialize(payloadObj);

            string path = "/v2/klikpajak/v2/efaktur/out";
            string query = $"?auto_approval={autoApproval.ToString().ToLower()}&auto_calculate=true";
            string fullUrl = $"{_baseUrl}{path}{query}";

            // Generate HMAC headers
            string dateString = DateTimeOffset.UtcNow.ToString("r");
            string requestLine = $"POST {path} HTTP/1.1";
            string signingPayload = $"date: {dateString}\n{requestLine}";

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_clientSecret));
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signingPayload));
            string signature = Convert.ToBase64String(hash);
            string authHeader = $"hmac username=\"{_clientId}\", algorithm=\"hmac-sha256\", headers=\"date request-line\", signature=\"{signature}\"";

            using var sha256 = SHA256.Create();
            byte[] bodyHash = sha256.ComputeHash(Encoding.UTF8.GetBytes(jsonBody));
            string digestHeader = $"SHA-256={Convert.ToBase64String(bodyHash)}";

            using var req = new HttpRequestMessage(HttpMethod.Post, fullUrl)
            {
                Content = new StringContent(jsonBody, Encoding.UTF8, "application/json")
            };

            req.Headers.TryAddWithoutValidation("Authorization", authHeader);
            req.Headers.TryAddWithoutValidation("Date", dateString);
            req.Headers.TryAddWithoutValidation("Digest", digestHeader);
            req.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);

            var resp = await _httpClient.SendAsync(req);
            string respContent = await resp.Content.ReadAsStringAsync();

            return ((int)resp.StatusCode, respContent);
        }
    }
}
