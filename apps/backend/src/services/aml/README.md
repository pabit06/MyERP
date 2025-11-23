# AML & Compliance Services

This directory contains all services related to Anti-Money Laundering (AML) and compliance functionality.

## Services Overview

### `monitor.ts`

Real-time transaction monitoring service that:

- Listens to transaction events (deposits, withdrawals, share purchases, loan repayments)
- Applies AML rules (TTR, Source of Funds, High-Risk Member)
- Creates TTR reports for transactions ≥ Rs. 10 Lakhs
- Flags high-risk transactions for continuous monitoring
- Implements idempotent processing to prevent duplicate flags

**Key Functions:**

- `initializeAmlMonitoring()` - Sets up event listeners
- `processTransactionEvent()` - Processes individual transactions

### `risk.ts`

Risk assessment and scoring service that:

- Calculates risk scores based on PEP status, occupation, transaction volume, and geography
- Updates member risk categories (High, Medium, Low)
- Calculates dynamic KYM expiry dates based on risk:
  - High Risk: 1 year
  - Medium Risk: 2 years
  - Low Risk: 3 years
- Tracks risk factors for Schedule-3 reporting

**Key Functions:**

- `calculateRiskScore()` - Calculates risk score for a member
- `updateMemberRisk()` - Updates member risk category and KYM dates

### `watchlist.ts`

Watchlist screening service that:

- Screens members against UN Sanction List
- Screens members against Home Ministry Sanction List
- Supports recursive PEP screening (family members)
- Handles false positive whitelisting
- Re-screens all members when watchlists are updated

**Key Functions:**

- `screenMember()` - Screen a single member
- `rescreenAllMembers()` - Re-screen all members against updated watchlists

### `goaml.ts`

goAML XML generation service that:

- Generates TTR (Threshold Transaction Report) XML files
- Generates STR (Suspicious Transaction Report) XML files
- Validates data before XML generation (pre-flight checks)
- Saves XML files to `uploads/goaml/` directory
- Follows goAML v5.0.1 schema

**Key Functions:**

- `generateTtrXml()` - Generate TTR XML
- `generateStrXml()` - Generate STR XML

### `cron.ts`

Automated task service that:

- Updates KYM review dates for all members
- Reassesses risk for all members
- Re-screens members against watchlists

**Key Functions:**

- `updateKymReviewDates()` - Update all KYM review dates
- `reassessAllMemberRisks()` - Reassess all member risks
- `rescreenAllMembersAgainstWatchlists()` - Re-screen all members
- `runAmlCronJobs()` - Run all cron jobs

### `cron-setup.ts`

Optional cron job setup that:

- Sets up automated daily tasks using node-cron
- Runs at 2 AM daily
- Gracefully handles missing node-cron dependency

**Usage:**

```typescript
import { setupAmlCronJobs } from './services/aml/cron-setup';

// In your index.ts or server startup
await setupAmlCronJobs();
```

## Event System

The AML monitoring uses an event-driven architecture:

```typescript
import { amlEvents, AML_EVENTS } from '../../lib/events';

// Emit events after successful transactions
amlEvents.emit(AML_EVENTS.ON_DEPOSIT, {
  memberId: 'member-id',
  amount: 1500000,
  currency: 'NPR',
  isCash: true,
  transactionId: 'tx-id',
  occurredOn: new Date(),
  transactionType: 'deposit',
  counterpartyType: 'MEMBER',
});
```

## Configuration

### Thresholds

- TTR Threshold: Rs. 10,00,000 (10 Lakhs)
- SOF Threshold: Rs. 10,00,000 (10 Lakhs)
- TTR Deadline: 15 days
- High Value Threshold: Rs. 30,00,000 (30 Lakhs annually)

### Risk Weights

- PEP: 40%
- Occupation: 25%
- Volume: 25%
- Geography: 10%

### Risk Thresholds

- High Risk: Score > 80
- Medium Risk: Score > 40
- Low Risk: Score ≤ 40

## Testing

To test the AML services:

1. Create a member with high-risk attributes
2. Perform transactions exceeding thresholds
3. Verify TTR generation
4. Check risk assessment
5. Test watchlist screening
6. Generate goAML XML files

## Dependencies

- `@prisma/client` - Database access
- `xmlbuilder2` - XML generation
- `node-cron` (optional) - Automated tasks

## Error Handling

All services include comprehensive error handling:

- Database errors are caught and logged
- Event processing failures don't block transactions
- XML generation validates data before creating files
- Watchlist screening handles missing data gracefully
