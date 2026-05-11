# Black Sustainability Network
## Membership Billing Reconciliation Report
**Date: February 16, 2026**

---

## 1. Executive Summary

This report documents the completion of the Black Sustainability Network (BSN) membership billing reconciliation project. All subscription records in Wix now match Airtable billing status.

| Metric | Count |
|--------|-------|
| Total subscriptions reviewed | 97 |
| Active subscriptions | 35 |
| Non-active subscriptions | 62 |
| Records missing in Airtable (before reconciliation) | 18 |
| Records created (backfilled) | 18 |
| Records corrected (Paying flag) | 25 |
| Final parity status | **All metrics at zero mismatches** |

**All subscription records in Wix now match Airtable billing status.**

---

## 2. Active Member Enforcement (35)

### Authorized Definition

A member is considered **authorized** (and thus Paying Member = true in Airtable) when:

- **Active + Paid** — Subscription status is Active and last payment status is Paid
- **OR Free Trial** — Subscription status is Free Trial (regardless of payment status)

### Actions Completed

- Paying Member flag set to **true** for all 34 unique authorized emails
- One final correction applied during audit: **keverett@keyenvi.com** (was incorrectly set to false; corrected to true)
- Duplicate subscription handled: **Beverly Scott** (beverly@iyai.org) maintains two active plans (ENTHUSIAST Annual + ENTITY Monthly); authorization aggregated by email; single Paying record in Airtable

---

## 3. Non-Active Enforcement (62)

### Definition

Non-active includes: Canceled, Expired, Paused, Failed, and Unpaid statuses.

### Actions Completed

- Paying Member set to **false** for all non-authorized members
- 15 incorrect flags corrected (members who were incorrectly marked as Paying)
- 10 missing records backfilled (Wix emails not previously in Airtable)
- **4 equity-protected records** intentionally left unchanged:
  - uniquepassion1@gmail.com
  - greenacresfarm679@gmail.com
  - lavoulle@gmail.com
  - cocohoustonnow@gmail.com

---

## 4. Final Audit Results

Final combined audit (run after all corrections):

| Metric | Result |
|--------|--------|
| incorrectPayingFalseCount | **0** |
| incorrectPayingTrueCount | **0** |
| missingInAirtableCount | **0** |

**Billing parity between Wix and Airtable is now fully enforced.**

---

## 5. Operational Safeguards

The reconciliation process implements the following safeguards:

- **Authorization aggregation per email** — When a member has multiple subscriptions (e.g., annual and monthly), authorization is determined by whether *any* subscription qualifies. A single Paying record is maintained in Airtable.
- **Duplicate subscription handling** — Duplicate Wix subscriptions for the same email are aggregated; only one Airtable record is updated per unique email.
- **Equity protection logic** — Members with Equity Member status are excluded from Paying flag changes, preserving intentional exceptions.
- **Audit script validation** — Dry-run and apply scripts produce auditable logs; final combined audit confirms zero mismatches before automation.

---

## 6. Next Phase: Automation Lock

To prevent manual reconciliation in the future, the following automation is recommended:

1. **Scheduled Wix → Airtable sync** — Regular export of subscription data from Wix and sync to Airtable
2. **Automatic Paying Member enforcement** — Automated updates to Paying Member flags based on Wix authority
3. **Non-active removal enforcement** — Automated enforcement of Paying = false for non-active subscriptions
4. **Map visibility enforcement** — Client-side filter so non-paying authenticated members do not see themselves on the map (public map remains unchanged)

---

## 7. Admin Access Request

To implement automated billing reconciliation and ensure ongoing accuracy, I require **Admin access** to the Wix site in order to generate and manage API keys for secure subscription sync.

This access is strictly for technical configuration and does not affect billing ownership.

---

---

## Appendix: Member Status CSV

A companion artifact **BSN_FINAL_MEMBERSHIP_STATUS_REPORT.csv** is available in the `reports/` directory. It contains member-level status for all subscription records with columns: email, full_name, wix_subscription_status, wix_payment_status, authorized_status, airtable_paying_member, equity_member, and reconciliation_status.

*Note: Some legacy subscription rows from Wix use derived email placeholders (@bsn-legacy) where the original export did not include an email address.*

---

*Report generated as part of the BSN Membership Billing Reconciliation project. All data reflects the state as of February 16, 2026.*
