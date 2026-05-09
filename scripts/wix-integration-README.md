# Wix → Airtable Integration

This folder contains the Wix API integration for fetching subscription data and syncing with Airtable.

## Setup

### 1. API credentials (from site owner)

Add to `.env`:

```
WIX_API_KEY=<your-api-key>
WIX_SITE_ID=<your-site-id>
WIX_ACCOUNT_ID=<your-account-id>
```

- **API Key**: Headless Settings → Admin API Key → Manage API Key
- **Site ID**: From dashboard URL (`.../dashboard/{SITE_ID}/...`)
- **Account ID**: Shown in API Keys Manager

Required scopes: **Read Orders**, **Read Members**, **Read Plans**

### 2. While waiting for the key

Use CSV export from Wix dashboard:

- Export Members/Subscriptions to CSV
- Columns needed: `email`, `subscription_status`, `last_payment_status` (optional: `customer_name`, `plan`)
- Run: `npm run wix-fetch -- --csv ./path/to/export.csv`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run wix-fetch` | Fetch subscriptions (API if configured, else requires `--csv`) |
| `npm run wix-fetch -- --csv ./file.csv` | Use CSV file |
| `npm run wix-fetch -- --csv-only --csv ./file.csv` | Force CSV, skip API |

## Usage in code

```ts
import {
  loadWixSubscriptionsFromSource,
  loadWixSubscriptions,
} from "@/lib/reconciliation/wixAuthority";

// Prefer API, fall back to CSV
const { subscriptions, source } = await loadWixSubscriptionsFromSource({
  csvPath: "./backup.csv",
  preferApi: true,
});

// Or CSV only
const subs = await loadWixSubscriptions("./path/to/file.csv");
```

## Files

- `lib/wix/client.ts` - Wix SDK client (API key auth)
- `lib/wix/fetchSubscriptions.ts` - Fetch orders + resolve member emails
- `lib/reconciliation/wixAuthority.ts` - Unified loader (API + CSV)
