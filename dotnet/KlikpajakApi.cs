using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Mekari.Klikpajak
{
    public class KlikpajakApi
    {
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _baseUrl;
        private readonly HttpClient _httpClient;

        public record HmacHeadersResult(
            string Authorization,
            string Date,
            string Digest,
            string IdempotencyKey
        );

        public KlikpajakApi(string clientId, string clientSecret, string? baseUrl = null, HttpClient? httpClient = null)
        {
            _clientId = clientId ?? throw new ArgumentNullException(nameof(clientId));
            _clientSecret = clientSecret ?? throw new ArgumentNullException(nameof(clientSecret));
            _baseUrl = baseUrl ?? "https://sandbox-api.mekari.com";
            _httpClient = httpClient ?? new HttpClient();
        }

        public HmacHeadersResult GenerateHeaders(string method, string path, string? jsonBody = null, string? customIdempotencyKey = null)
        {
            // 1. RFC 1123 / HTTP GMT date format
            string dateString = DateTimeOffset.UtcNow.ToString("r");

            // 2. Request Line format: '[METHOD] [PATH] HTTP/1.1'
            string requestLine = $"{method.ToUpperInvariant()} {path} HTTP/1.1";

            // 3. Signing payload
            string stringToSign = $"date: {dateString}\n{requestLine}";

            // 4. HMAC-SHA256 signature
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_clientSecret));
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(stringToSign));
            string signature = Convert.ToBase64String(hash);

            string authHeader = $"hmac username=\"{_clientId}\", algorithm=\"hmac-sha256\", headers=\"date request-line\", signature=\"{signature}\"";

            // 5. SHA-256 Digest of body
            string digestHeader = "";
            if (!string.IsNullOrEmpty(jsonBody))
            {
                using var sha256 = SHA256.Create();
                byte[] bodyHash = sha256.ComputeHash(Encoding.UTF8.GetBytes(jsonBody));
                digestHeader = $"SHA-256={Convert.ToBase64String(bodyHash)}";
            }

            // 6. X-Idempotency-Key
            string idempotencyKey = !string.IsNullOrEmpty(customIdempotencyKey)
                ? customIdempotencyKey
                : Guid.NewGuid().ToString();

            return new HmacHeadersResult(authHeader, dateString, digestHeader, idempotencyKey);
        }

        public async Task<HttpResponseMessage> CreateSingleTaxInvoiceAsync(string jsonPayload, string? customIdempotencyKey = null, bool autoApproval = false, bool autoCalculate = true)
        {
            string path = "/v2/klikpajak/v2/efaktur/out";
            string query = $"?auto_approval={autoApproval.ToString().ToLower()}&auto_calculate={autoCalculate.ToString().ToLower()}";
            string fullUrl = $"{_baseUrl}{path}{query}";

            var headers = GenerateHeaders("POST", path, jsonPayload, customIdempotencyKey);

            using var request = new HttpRequestMessage(HttpMethod.Post, fullUrl)
            {
                Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
            };

            request.Headers.TryAddWithoutValidation("Authorization", headers.Authorization);
            request.Headers.TryAddWithoutValidation("Date", headers.Date);
            request.Headers.TryAddWithoutValidation("X-Idempotency-Key", headers.IdempotencyKey);
            if (!string.IsNullOrEmpty(headers.Digest))
            {
                request.Headers.TryAddWithoutValidation("Digest", headers.Digest);
            }

            return await _httpClient.SendAsync(request);
        }
    }
}
