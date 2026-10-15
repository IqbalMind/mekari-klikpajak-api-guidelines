# Mekari Klikpajak CoreTax (CTAS) - Oracle Fusion Cloud ERP Integration

This directory outlines integration patterns between **Oracle Fusion Cloud Financials (Receivables)** and **Mekari Klikpajak CoreTax (CTAS)** using **Oracle Integration Cloud (OIC)**.

---

## 🏛️ Architecture Overview

```
┌──────────────────────────────┐        ┌─────────────────────────────┐        ┌───────────────────────────┐
│  Oracle Fusion Cloud ERP     │        │  Oracle Integration Cloud   │        │   Mekari Klikpajak        │
│  - Receivables (AR) Invoices │ ─────> │  - Subscribes to AR Event   │ ─────> │   CoreTax API Gateway     │
│  - Credit Memos              │ (OIC)  │  - Calls oic_hmac_generator │ (REST) │   (api.mekari.com)        │
│  - Custom Attributes (DFF)   │ <───── │  - REST Adapter to Mekari   │ <───── │                           │
└──────────────────────────────┘        └─────────────────────────────┘        └───────────────────────────┘
```

---

## 📋 Oracle Receivables Mapping

| Oracle Fusion AR Field | Description | CoreTax Payload Field |
|---|---|---|
| `CustomerTransactionId` / `TrxNumber` | AR Transaction Number | `client_reference_id`, `reference`, `X-Idempotency-Key` |
| `TrxDate` | Transaction Date | `document_date` (`YYYY-MM-DD`) |
| `PartyTaxProfile.TaxRegistrationNumber` | Customer NPWP / NIK | `customer.npwp` (16 digits in CoreTax) |
| `BillToSite.DFF_NITKU` (Custom DFF) | Branch NITKU | `customer.nitku` (6 digits, e.g. `"000000"`) |
| `PartyName` | Customer Name | `customer.name` |
| `Line.Description` | Item Description | `items[].goods_service_name` |
| `Line.UnitSellingPrice` | Unit Price | `items[].unit_price` |
| `Line.QuantityInvoiced` | Quantity | `items[].quantity` |
| `Line.LineAmount` | DPP Amount | `items[].tax_base`, `items[].other_tax_base` |
| `TaxLine.TaxAmount` | PPN Amount | `items[].vat` (12% in CoreTax) |

---

## 🔄 Handling Replacements (Pengganti) in Oracle Fusion

When an AR Invoice is credited or cancelled, and a revised invoice is created:
1. In Oracle Fusion, link the new transaction to the previous one via `PreviousCustomerTransactionId`.
2. In OIC, detect the replacement flag and construct the idempotency key with suffix:
   * **Normal**: `AR-2026-001`
   * **Pengganti 1**: `AR-2026-001-1`
   * **Pengganti 2**: `AR-2026-001-2`
3. Include `substitution_flag: true` and `substituted_tax_invoice_id: <Original_Klikpajak_ID>`.

---

## 💻 OIC JavaScript Library

Import [`oic_hmac_generator.js`](file:///Users/mekari/Work/hmac/klikpajak/oracle-fusion/oic_hmac_generator.js) into your Oracle Integration Cloud environment under **Settings > Libraries** to compute the headers seamlessly before the REST invoke step.
