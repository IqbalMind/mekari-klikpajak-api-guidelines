# Mekari Klikpajak CoreTax (CTAS) - Oracle NetSuite SuiteScript 2.1

This directory provides native **SuiteScript 2.1** modules and scripts for integrating **Oracle NetSuite** with **Mekari Klikpajak CoreTax (CTAS)** using **HMAC-SHA256 authentication**.

---

## 📂 Files Included

| File | Type | Description |
|---|---|---|
| [`klikpajak_hmac_service.js`](file:///Users/mekari/Work/hmac/klikpajak/netsuite/klikpajak_hmac_service.js) | SuiteScript 2.1 Custom Module | Encapsulates HMAC-SHA256 signing with `N/crypto`, SHA-256 body digest, RFC 1123 date generation, and HTTP submission via `N/https`. |
| [`klikpajak_invoice_ue.js`](file:///Users/mekari/Work/hmac/klikpajak/netsuite/klikpajak_invoice_ue.js) | User Event Script (Invoice) | Automatically triggers on Invoice `afterSubmit` to generate Normal or Pengganti (`-1`, `-2`) tax invoices in Klikpajak. |

---

## 🛠️ NetSuite Custom Fields Setup

Before deploying the User Event script, create the following custom Transaction Body fields on the Invoice record:

| Field Label | Field ID | Type | Description |
|---|---|---|---|
| **Is Faktur Pengganti** | `custbody_kp_is_pengganti` | Check Box | Check if this invoice is an amendment/replacement. |
| **Original Faktur ID** | `custbody_kp_original_faktur_id` | Integer / Text | Stores the Klikpajak ID of the original tax invoice. |
| **Revision Count** | `custbody_kp_revision_count` | Integer | Tracks replacement iterations (1, 2, ...). |
| **Klikpajak Faktur ID** | `custbody_kp_faktur_id` | Text | Updated automatically with Klikpajak's Invoice ID. |
| **Klikpajak Status** | `custbody_kp_faktur_status` | Text | Updated automatically with DJP status (`DRAFT`, `APPROVED`). |

---

## 🔄 Idempotency & Replacement (-1, -2) in NetSuite

The integration enforces strict idempotency using NetSuite's `tranid`:

* **Normal Invoice (`INV-10023`)**:
  * `client_reference_id`: `INV-10023`
  * `X-Idempotency-Key`: `INV-10023`
  * `substitution_flag`: `false`
* **First Replacement (`INV-10023-1`)**:
  * `client_reference_id`: `INV-10023-1`
  * `X-Idempotency-Key`: `INV-10023-1`
  * `substitution_flag`: `true`
  * `substituted_tax_invoice_id`: `<original_faktur_id>`
* **Subsequent Replacements (`INV-10023-2`, etc.)**:
  * Increment the revision suffix to avoid gateway duplicate error `1903`.

---

## 🚀 Deployment Steps

1. Upload [`klikpajak_hmac_service.js`](file:///Users/mekari/Work/hmac/klikpajak/netsuite/klikpajak_hmac_service.js) to the NetSuite File Cabinet under `SuiteScripts/Klikpajak/`.
2. Upload [`klikpajak_invoice_ue.js`](file:///Users/mekari/Work/hmac/klikpajak/netsuite/klikpajak_invoice_ue.js) to `SuiteScripts/Klikpajak/`.
3. Create a **Script Record** for `klikpajak_invoice_ue.js` (Script Type: **User Event Script**).
4. Deploy the script to the **Invoice** record type (Event Type: `Create`, `Edit`).
5. Fill in your `CLIENT_ID` and `CLIENT_SECRET` in the script parameters or constants.
