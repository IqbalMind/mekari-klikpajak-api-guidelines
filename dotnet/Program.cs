using System;
using System.Text.Json;
using System.Threading.Tasks;
using Mekari.Klikpajak;

class Program
{
    static async Task Main(string[] args)
    {
        string clientId = Environment.GetEnvironmentVariable("MEKARI_CLIENT_ID") ?? "YOUR_MEKARI_CLIENT_ID";
        string clientSecret = Environment.GetEnvironmentVariable("MEKARI_CLIENT_SECRET") ?? "YOUR_MEKARI_CLIENT_SECRET";
        string baseUrl = Environment.GetEnvironmentVariable("MEKARI_BASE_URL") ?? "https://sandbox-api.mekari.com";

        Console.WriteLine($"Initializing .NET Mekari Klikpajak CoreTax Client [{baseUrl}]...\n");
        var client = new KlikpajakApi(clientId, clientSecret, baseUrl);

        string today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        // ---------------------------------------------------------------------
        // CASE 1: Create Normal Single Tax Invoice (INVQBL0001)
        // ---------------------------------------------------------------------
        string normalInvoiceNo = "INVQBL0001";
        var normalPayload = new
        {
            client_reference_id = normalInvoiceNo,
            transaction_detail = "04",
            additional_trx_detail = "00",
            substitution_flag = false,
            substituted_tax_invoice_id = (object?)null,
            tax_invoice_number_term = "",
            description = "Invoice Penjualan Normal",
            document_date = today,
            reference = normalInvoiceNo,
            total_tax_base = 10000000,
            total_other_tax_base = 10000000,
            total_vat = 1200000,
            total_stlg = 0,
            total_price = 10000000,
            total_discount = 0,
            downpayment_flag = 0,
            downpayment_stlg = 0,
            downpayment_tax_base = 0,
            downpayment_other_tax_base = 0,
            downpayment_vat = 0,
            customer = new
            {
                npwp = "1091031210912281",
                id_type = "NPWP",
                country_code = "IDN",
                other_id = "",
                name = "PT Pembeli Sejahtera",
                address = "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
                nitku = "000000",
                email = "finance@pembelisejahtera.co.id"
            },
            items = new[]
            {
                new
                {
                    goods_service = "GOODS",
                    goods_service_code = "000000",
                    goods_service_name = "Paket Server Rack 1U",
                    unit_price = 10000000,
                    unit_measurement = "UNIT",
                    selling_price = 10000000,
                    quantity = 1,
                    discount = 0,
                    tax_base = 10000000,
                    other_tax_base = 10000000,
                    vat = 1200000,
                    stlg_rate = 0,
                    stlg = 0
                }
            }
        };

        string normalJson = JsonSerializer.Serialize(normalPayload, new JsonSerializerOptions { WriteIndented = true });
        Console.WriteLine("==================================================================");
        Console.WriteLine("CASE 1: Create Normal Single Tax Invoice (Draft)");
        Console.WriteLine("==================================================================");
        Console.WriteLine($"X-Idempotency-Key: {normalInvoiceNo}");
        Console.WriteLine(normalJson);

        try
        {
            var response = await client.CreateSingleTaxInvoiceAsync(normalJson, customIdempotencyKey: normalInvoiceNo);
            string respContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"\nHTTP Status: {(int)response.StatusCode} {response.StatusCode}");
            Console.WriteLine("Response:\n" + respContent);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n❌ Request Error: {ex.Message}");
        }

        Console.WriteLine("\n------------------------------------------------------------------\n");

        // ---------------------------------------------------------------------
        // CASE 2: Create Replacement Single Tax Invoice (INVQBL0001-1)
        // ---------------------------------------------------------------------
        string replacementKey = "INVQBL0001-1";
        var replacementPayload = new
        {
            client_reference_id = replacementKey,
            transaction_detail = "04",
            additional_trx_detail = "00",
            substitution_flag = true,
            substituted_tax_invoice_id = 8219420L,
            tax_invoice_number_term = "",
            description = "Invoice Penjualan Pengganti ke-1",
            document_date = today,
            reference = replacementKey,
            total_tax_base = 12000000,
            total_other_tax_base = 12000000,
            total_vat = 1440000,
            total_stlg = 0,
            total_price = 12000000,
            total_discount = 0,
            downpayment_flag = 0,
            downpayment_stlg = 0,
            downpayment_tax_base = 0,
            downpayment_other_tax_base = 0,
            downpayment_vat = 0,
            customer = new
            {
                npwp = "1091031210912281",
                id_type = "NPWP",
                country_code = "IDN",
                other_id = "",
                name = "PT Pembeli Sejahtera",
                address = "Jalan Jend. Sudirman Kav 21, Karet Semanggi, Jakarta Selatan",
                nitku = "000000",
                email = "finance@pembelisejahtera.co.id"
            },
            items = new[]
            {
                new
                {
                    goods_service = "GOODS",
                    goods_service_code = "000000",
                    goods_service_name = "Paket Server Rack 1U (Revisi Spesifikasi)",
                    unit_price = 12000000,
                    unit_measurement = "UNIT",
                    selling_price = 12000000,
                    quantity = 1,
                    discount = 0,
                    tax_base = 12000000,
                    other_tax_base = 12000000,
                    vat = 1440000,
                    stlg_rate = 0,
                    stlg = 0
                }
            }
        };

        string replacementJson = JsonSerializer.Serialize(replacementPayload, new JsonSerializerOptions { WriteIndented = true });
        Console.WriteLine("==================================================================");
        Console.WriteLine("CASE 2: Create Replacement Single Tax Invoice (Pengganti #1)");
        Console.WriteLine("==================================================================");
        Console.WriteLine($"X-Idempotency-Key: {replacementKey}");
        Console.WriteLine(replacementJson);

        try
        {
            var response = await client.CreateSingleTaxInvoiceAsync(replacementJson, customIdempotencyKey: replacementKey);
            string respContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"\nHTTP Status: {(int)response.StatusCode} {response.StatusCode}");
            Console.WriteLine("Response:\n" + respContent);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n❌ Request Error: {ex.Message}");
        }
    }
}
