# Mekari Klikpajak CoreTax (CTAS) - SAP Business One (SAP B1) Integration

This directory provides architecture, data mapping, and a production C# service for integrating **SAP Business One** with **Mekari Klikpajak CoreTax (CTAS)** using **HMAC-SHA256**.

---

## 🏗️ Integration Architecture

```
┌─────────────────────────┐          ┌──────────────────────────┐          ┌────────────────────────┐
│   SAP Business One      │  DI API  │   SAP B1 Middleware      │   HMAC   │  Mekari Klikpajak     │
│   - OINV (A/R Invoice)  │ ───────> │   (C# / Service Layer)   │ ───────> │  CoreTax Gateway       │
│   - INV1 (Rows)         │  OData   │   SapB1KlikpajakService  │ SHA-256  │  (api.mekari.com)      │
│   - OCRD (Business Ptnr)│ <─────── │   Updates UDFs in SAP    │ <─────── │                        │
└─────────────────────────┘          └──────────────────────────┘          └────────────────────────┘
```

---

## 🗂️ Data Field Mapping

| SAP B1 Field (OINV / INV1) | Description | CoreTax Payload Field |
|---|---|---|
| `OINV.DocNum` / `NumAtCard` | Invoice Number | `client_reference_id`, `reference`, `X-Idempotency-Key` |
| `OINV.DocDate` | Posting Date | `document_date` (`YYYY-MM-DD`) |
| `OCRD.LicTradNum` | Customer NPWP / NIK | `customer.npwp` (16 digits in CoreTax) |
| `OCRD.U_NITKU` (Custom UDF) | Branch Identifier | `customer.nitku` (6 digits, e.g. `"000000"`) |
| `OCRD.CardName` | Customer Name | `customer.name` |
| `OINV.Address` | Bill-to Address | `customer.address` |
| `INV1.ItemCode` / `Dscription`| Item Details | `items[].goods_service_name` |
| `INV1.Price` | Unit Price | `items[].unit_price` |
| `INV1.Quantity` | Quantity | `items[].quantity` |
| `INV1.LineTotal` | DPP (Net Total) | `items[].tax_base`, `items[].other_tax_base` |
| `INV1.VatSum` | PPN Amount | `items[].vat` (12% in CoreTax) |

---

## 🔄 Faktur Pajak Pengganti (Replacement) in SAP B1

When an invoice needs correction:
1. An A/R Credit Memo (`ORIN`) or Correction Invoice is issued in SAP B1.
2. The middleware detects `IsReplacement = true` and retrieves the original Klikpajak ID from `OINV.U_Klikpajak_ID`.
3. Suffix increment:
   - Original: `SAP-10045` (`X-Idempotency-Key: SAP-10045`)
   - 1st Replacement: `SAP-10045-1` (`X-Idempotency-Key: SAP-10045-1`)
   - 2nd Replacement: `SAP-10045-2` (`X-Idempotency-Key: SAP-10045-2`)
4. Payload sets `substitution_flag: true` and `substituted_tax_invoice_id: <original_id>`.

---

## 💻 Sample Implementation

See [`SapB1KlikpajakService.cs`](file:///Users/mekari/Work/hmac/klikpajak/sap-business-one/SapB1KlikpajakService.cs) for the full mapping and HMAC execution logic.
