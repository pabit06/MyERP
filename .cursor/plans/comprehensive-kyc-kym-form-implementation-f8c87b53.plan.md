<!-- f8c87b53-6583-4159-82c9-df08c7bc496f 3b46863a-d125-4ba4-b16b-1320f3e58fb4 -->

# Comprehensive KYC/KYM Form Implementation

## Overview

Create a unified and reusable KYC/KYM form component that aligns with the detailed regulatory format for natural persons. This form will capture extensive details across personal, family, occupation, residential, cooperative, financial, and declarative sections. It will serve both for initial member onboarding and periodic updates, featuring automatic risk assessment, biometric capture, and strict compliance checks.

## Architecture

### 1. Reusable KymForm Component

**File:** `apps/frontend-web/src/components/KymForm.tsx`

**Props:**

- `memberId?: string`
- `defaultValues?: KymFormData`
- `mode: 'onboarding' | 'update'`
- `onSubmit: (data: KymFormData) => Promise<void>`
- `onCancel?: () => void`

**Form Sections (Structured as per Official KYM Format):**

**a. Personal Details**

- Full Name, Surname
- Date of Birth
- Citizenship Certificate No., Issuing Office & District
- Gender

**b. Family Details**

- Grandfather's Name, Father's Name, Mother's Name
- Marital Status
- Spouse's Name, Surname
- Family Type (e.g., Joint, Nuclear)

**c. Occupation Details**

- Own Main Occupation (with specifics for Business, Service, etc.)
- Permanent Account Number (PAN)
- Spouse's Main Occupation
- Details of other main earning family members (Relationship, Occupation)
- PEP (High-Ranking Position) Status for self or family members, with details.

**d. Residential Details**

- Permanent Address (Province, Municipality, Ward, Tole, House No.)
- Temporary Address
- Contact No., Email ID
- Voter ID Card No., Passport No.
- Residence status and duration in the institution's working area.

**e. Cooperative Membership**

- Objective of membership
- Details of memberships in other cooperative institutions (for self and family members).
- Purpose for any dual/multiple memberships.
- Details of family members who are also members of this institution.

**f. Income Source Details**

- Annual family income range (e.g., Up to 4 lakh, 4-10 lakh, etc.)
- Detailed breakdown of income sources if above the minimum threshold.

**g. Financial Transaction Details**

- Details of initial deposits (Share, Savings, etc.)
- Estimated annual transaction volume and amount.
- Estimated loan transaction amount.

**h. Self-Declaration & Biometrics**

- Checkbox for agreement to update details within 35 days of any change.
- Checkbox for declaration of truthfulness of submitted information.
- Signature, Right Thumbprint, Left Thumbprint (File Uploads)
- Date of declaration.

**i. Attached Documents**

- File inputs for: Copy of Citizenship, Voter ID Card, Passport.

**j. Recommendation**

- Section for two existing members to recommend the applicant (for new onboarding).

### 2. Backend API Endpoint & Data Storage

**File:** `apps/backend/src/routes/members.ts`

**Endpoint:** `PUT /api/members/:memberId/kyc`

**Functionality:**

- Accept the full, structured KYM data.
- Handle file uploads for biometrics and documents, storing paths.
- Trigger `updateMemberRisk(memberId)` for automatic risk reassessment.

**File:** `packages/db-schema/prisma/schema.prisma`

**Modify `MemberKYC` model:**

- Add numerous fields to store all the new information from the form (e.g., `citizenshipCertificateNo`, `panNo`, `voterIdNo`, `annualFamilyIncome`, document paths).
- **Create new related models** to handle one-to-many relationships, such as `OtherCooperativeMembership`, `FamilyMemberLink`, and `IncomeSourceDetail`.

### 3. Form Validation

**File:** `packages/shared-types/src/kyc.ts` (new)

**Create a comprehensive Zod Schema:**

- Enforce mandatory fields like citizenship details, family names, and declarations.
- Implement conditional validation (e.g., require spouse's name if married, require PEP details if PEP status is true).
- Validate file uploads and data formats.

### 4. Shared Constants for Dropdowns

**File:** `packages/shared-types/src/kyc-options.ts` (new)

**Purpose:** To centralize options for form dropdowns, linking them directly to risk factors for automated assessment.

**Example `OCCUPATION_OPTIONS`:**

```typescript
export const OCCUPATION_OPTIONS = [
  { label: 'Agriculture', value: 'AGRICULTURE', risk: 'LOW' },
  { label: 'Government Service', value: 'GOVT_SERVICE', risk: 'LOW' },
  // ... other low/medium risk
  { label: 'Real Estate Business', value: 'REAL_ESTATE', risk: 'HIGH' },
  { label: 'Precious Metals/Stones', value: 'PRECIOUS_METALS', risk: 'HIGH' },
  { label: 'Manpower Agency', value: 'MANPOWER', risk: 'HIGH' },
];
```

### 5. UI Integration & UX Enhancements

**Onboarding & Updates:**

- **New Member:** `apps/frontend-web/src/app/members/new/page.tsx` will use the `KymForm`.
- **Periodic Update:** A new page `apps/frontend-web/src/app/compliance/kym-update/[memberId]/page.tsx` will pre-fill the `KymForm`.
- **KYM Status Board:** `apps/frontend-web/src/app/compliance/kym-status/page.tsx` will link to the update page.

**UX Features in `KymForm.tsx`:**

- **Draft State:** Auto-save form progress to `localStorage`.
- **Real-time Risk Alerts:** Show UI feedback for high-risk selections (e.g., occupation) by checking the `risk` property from `OCCUPATION_OPTIONS`.
- **Clear Sectioning:** Use accordions or tabs to manage the large number of fields.

## Implementation Steps

1.  **Database:** Update `schema.prisma` by adding all new fields to the `MemberKYC` model and creating the necessary related models. Run database migration.
2.  **Shared Types:** Create the `packages/shared-types/src/kyc-options.ts` file and define the mapped arrays for occupations and other dropdowns.
3.  **Validation:** Create the comprehensive Zod schema in a new `packages/shared-types/src/kyc.ts` file, referencing the values from `kyc-options.ts`.
4.  **Backend:** Extend the `PUT /api/members/:memberId/kyc` endpoint in `members.ts` to accept and process the full `KymFormData`, using the occupation value to update risk factors.
5.  **Frontend:** Build the reusable `KymForm.tsx` component, using `kyc-options.ts` to populate dropdowns.
6.  **Integration:** Integrate the `KymForm` into the new member onboarding and periodic KYM update pages.
7.  **Testing:** Perform end-to-end testing of both onboarding and update flows.

### To-dos

- [ ] Update Prisma schema with all new KYC fields and related models.
- [ ] Create the comprehensive Zod validation schema for the new KYC form.
- [ ] Extend the backend KYC endpoint to handle the new data structure.
- [ ] Build the full KymForm.tsx frontend component.
- [ ] Integrate the KymForm into onboarding and update pages.
- [ ] Perform end-to-end testing of the complete KYC flow.
