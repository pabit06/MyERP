<!-- 1a06062e-bd50-4503-8978-fd806d392420 b6a00bfd-94ca-4e45-a1db-93ddb5b464de -->

# Governance Sidebar Reorganization with Refined Schema

## Overview

Reorganize sidebar navigation to create a dedicated "Governance (संस्थागत सुशासन)" group with three main sections:

1. **Committees (समिति तथा उप-समिति)** - Single page with card grid and detail view with tabs
2. **Meetings (सञ्चालक बैठक)** - List view with detail page containing agenda, attendance, and minutes/decisions
3. **AGM (साधारण सभा)** - Separate page and model for Annual General Meetings

## Database Schema Changes

### New Enums in `packages/db-schema/prisma/schema.prisma`:

```prisma
enum CommitteeType {
  BOD           // Sanchalak Samiti
  ACCOUNT       // Lekha Samiti
  LOAN          // Rin Upasamiti
  EDUCATION     // Shiksha Upasamiti
  OTHER
}

enum AGMStatus {
  PLANNED
  SCHEDULED
  COMPLETED
  CANCELLED
}
```

### New Models:

1. **Committee Model**:
   - `id` (String, @id, @default(uuid()))
   - `cooperativeId` (String)
   - `name` (String) - e.g., "Board of Directors"
   - `nameNepali` (String?) - e.g., "सञ्चालक समिति"
   - `description` (String?)
   - `type` (CommitteeType, @default(OTHER))
   - `isStatutory` (Boolean, @default(false)) - To distinguish statutory committees from ad-hoc ones
   - Relations: `cooperative`, `members`, `tenures`, `meetings`
   - Index: `[cooperativeId]`

2. **CommitteeTenure Model**:
   - `id` (String, @id, @default(uuid()))
   - `committeeId` (String)
   - `name` (String) - e.g., "Term 2080-2084"
   - `startDate` (DateTime)
   - `endDate` (DateTime?) - Null means currently active/ongoing
   - `notes` (String?)
   - `isCurrent` (Boolean, @default(false)) - Helper flag for quick queries
   - Relations: `committee`, `members`

3. **CommitteeMember Model**:
   - `id` (String, @id, @default(uuid()))
   - `committeeId` (String)
   - `memberId` (String) - Link to Cooperative Member
   - `tenureId` (String?) - Optional: Some members might be ad-hoc outside a tenure
   - `position` (String) - e.g., "Chairman", "Secretary"
   - `positionNepali` (String?)
   - `photoPath` (String?) - Specific photo for committee display
   - `startDate` (DateTime)
   - `endDate` (DateTime?)
   - `isActive` (Boolean, @default(true))
   - `isActing` (Boolean, @default(false)) - Karyabahak (Acting) check
   - Relations: `committee`, `member`, `tenure`
   - Index: `[committeeId, isActive]`

4. **AGM Model** (separate from Meeting):
   - `id` (String, @id, @default(uuid()))
   - `cooperativeId` (String)
   - `fiscalYear` (String) - e.g., "2080/081"
   - `agmNumber` (Int) - e.g., 15 (15th AGM)
   - `bookCloseDate` (DateTime?)
   - `scheduledDate` (DateTime)
   - `location` (String?)
   - `totalMembers` (Int, @default(0)) - Snapshot at time of AGM
   - `presentMembers` (Int, @default(0))
   - `quorumThresholdPercent` (Float, @default(51.0)) - Usually 51%
   - `approvedDividendBonus` (Float?) - %
   - `approvedDividendCash` (Float?) - %
   - `status` (AGMStatus, @default(PLANNED))
   - `notes` (String?)
   - `minutesFileUrl` (String?) - Link to scanned minutes PDF
   - Relations: `cooperative`
   - Unique constraint: `[cooperativeId, fiscalYear]`

### Update Existing Meeting Model:

Add to `Meeting` model:

- `committeeId` (String?) - Link meeting to a committee
- `minutesFileUrl` (String?) - For file uploads
- `minutesStatus` (String) - "DRAFT" or "FINALIZED" (to prevent editing decisions once finalized)
- Relation: `committee` (Committee?)

## Backend Implementation

### New Routes in `apps/backend/src/routes/governance.ts`:

1. **Committees Routes**:
   - `GET /api/governance/committees` - List all committees
   - `POST /api/governance/committees` - Create committee
   - `GET /api/governance/committees/:id` - Get committee details with members and tenures
   - `PUT /api/governance/committees/:id` - Update committee
   - `DELETE /api/governance/committees/:id` - Delete committee
   - `POST /api/governance/committees/:id/members` - Add committee member
   - `PUT /api/governance/committees/:id/members/:memberId` - Update committee member
   - `DELETE /api/governance/committees/:id/members/:memberId` - Remove committee member
   - `POST /api/governance/committees/:id/tenure` - Add tenure period (with overlap validation)
   - `PUT /api/governance/committees/:id/tenure/:tenureId` - Update tenure
   - `DELETE /api/governance/committees/:id/tenure/:tenureId` - Delete tenure

2. **AGM Routes**:
   - `GET /api/governance/agm` - List all AGMs
   - `POST /api/governance/agm` - Create AGM
   - `GET /api/governance/agm/:id` - Get AGM details
   - `PUT /api/governance/agm/:id` - Update AGM
   - `DELETE /api/governance/agm/:id` - Delete AGM

3. **Meeting Minutes Routes**:
   - `POST /api/governance/meetings/:id/finalize-minutes` - Mark minutes as FINALIZED (lock decisions)

### Critical Backend Validations:

**Tenure Overlap Validation** (in `POST /api/governance/committees/:id/tenure`):

```typescript
const existingTenure = await prisma.committeeTenure.findFirst({
  where: {
    committeeId,
    OR: [
      { startDate: { lte: newEndDate }, endDate: { gte: newStartDate } },
      { startDate: { lte: newEndDate }, endDate: null }, // Handling active tenures
    ],
  },
});
if (existingTenure) throw new Error('Tenure dates overlap with an existing term.');
```

## Frontend Implementation

### Sidebar Updates (`apps/frontend-web/src/components/Sidebar.tsx`):

1. Add new group `governance` to `groupLabels`:

   ```typescript
   governance: 'Governance (संस्थागत सुशासन)';
   ```

2. Update navigation items:
   - Move `Meetings` from `group: 'operations'` to `group: 'governance'`
   - Update `Meetings` label to `'Board Meetings (सञ्चालक बैठक)'`, `icon: '📅'`
   - Add `Committees` with `href: '/governance/committees'`, `module: 'governance'`, `icon: '👔'`
   - Add `AGM` with `href: '/governance/agm'`, `module: 'governance'`, `icon: '🗳️'`

**Note:** If using lucide-react icons: `Gavel` (Governance), `Briefcase` (Committees), `CalendarRange` (Meetings), `Vote` (AGM)

### New Frontend Pages:

1. **`apps/frontend-web/src/app/governance/committees/page.tsx`**:
   - Card grid layout showing all committees (BOD, लेखा समिति, ऋण उप-समिति, etc.)
   - Each card shows committee name, type, and current member count
   - Clicking a card navigates to `/governance/committees/[id]`

2. **`apps/frontend-web/src/app/governance/committees/[id]/page.tsx`**:
   - Tab-based interface:
     - **Tab 1: Current Members** - Display current members with photos and positions
     - **Tab 2: Tenure/History** - Show tenure history, allow adding new tenure periods
     - **Tab 3: Settings** - Edit committee name, description, type
   - Add/Edit/Remove members functionality
   - Add/Edit/Remove tenure periods (with overlap validation feedback)

3. **`apps/frontend-web/src/app/governance/meetings/page.tsx`** (Update existing):
   - Ensure it shows list of meetings with date, meeting number, status
   - "+ New Meeting" button
   - Filter by meeting type if needed

4. **`apps/frontend-web/src/app/meetings/[id]/page.tsx`** (Update existing):
   - Enhance to show tabs/steps:
     - **Step 1: Agenda** - Add discussion topics
     - **Step 2: Attendance** - Mark who attended
     - **Step 3: Minutes/Decisions** - Write decisions for each agenda item
   - Add file upload for meeting minutes (PDF, Word)
   - Add "Finalize Minutes" button (locks decisions when status is FINALIZED)
   - Disable editing decisions when `minutesStatus === "FINALIZED"`

5. **`apps/frontend-web/src/app/governance/agm/page.tsx`**:
   - List all AGMs with fiscal year, book close date, status
   - "+ New AGM" button
   - Link to AGM detail page

6. **`apps/frontend-web/src/app/governance/agm/new/page.tsx`**:
   - Form to create new AGM with:
     - Fiscal Year (dropdown/select)
     - AGM Number (auto-increment or manual)
     - Book Close Date (date picker)
     - Scheduled Date (date picker)
     - Location (text input)
     - Total Members (number input)
     - Present Members (number input, calculated from attendance)
     - Quorum Threshold % (number input, default 51.0)
     - Approved Dividend Bonus % (number input)
     - Approved Dividend Cash % (number input)
     - Notes (textarea)

7. **`apps/frontend-web/src/app/governance/agm/[id]/page.tsx`**:
   - Display AGM details
   - **Live Quorum Status Indicator**:

     ```typescript
     const quorumMet = (presentMembers / totalMembers) * 100 >= agm.quorumThresholdPercent;
     ```

     - Show Red badge: "Quorum Not Met" if `!quorumMet`
     - Show Green badge: "Quorum Met" if `quorumMet`
     - Update in real-time as attendance is recorded

   - Edit AGM information
   - View attendance details
   - View dividend approval information

## Implementation Steps

1. **Database Schema**:
   - Add CommitteeType and AGMStatus enums
   - Add Committee, CommitteeMember, CommitteeTenure, and AGM models
   - Update Meeting model with `committeeId`, `minutesFileUrl`, `minutesStatus`
   - Run Prisma migration: `npx prisma migrate dev --name add_governance_models`

2. **Backend Routes**:
   - Create committees and AGM routes in governance.ts with validation and RBAC
   - Implement tenure overlap validation logic
   - Add endpoint to finalize meeting minutes (lock decisions)
   - Add RBAC checks for all governance operations

3. **Sidebar**:
   - Update Sidebar.tsx to add Governance group
   - Move Meetings from operations to governance group
   - Add appropriate icons for each navigation item

4. **Frontend Pages**:
   - Create all new frontend pages for committees and AGM
   - Implement AGM quorum live status indicator with Red/Green badge
   - Add meeting minutes draft/finalized status toggle
   - Implement file upload for meeting minutes

5. **Update Meetings**:
   - Enhance existing meetings pages to support new tab structure
   - Add file upload functionality
   - Implement lock/unlock functionality for finalized minutes

6. **Testing**:
   - Test all CRUD operations for committees and AGM
   - Test tenure overlap validation (should reject overlapping dates)
   - Test quorum calculation and live status display
   - Test meeting minutes draft/finalized workflow (decisions locked when finalized)

## Additional Implementation Considerations

### Naming Conventions

- Routes: Use kebab-case (e.g., `/governance/committees`, `/governance/agm`)
- Components: Use PascalCase (e.g., `CommitteeList`, `AGMDetail`, `MeetingAttendance`)
- API endpoints: Follow RESTful conventions (e.g., `/api/governance/committees/:id/members`)

### Data Fetching & Performance

- Use SWR or React Query for client-side data fetching with caching
- Implement pagination for lists (committees, meetings, AGMs, committee members)
- Consider SSR/SSG for static content (committee types, AGM templates)
- Add loading indicators and skeleton screens for better UX

### User Interface Enhancements

- Use existing UI component library (Button, Input, Card, Tabs, etc.)
- Implement search functionality for committees, meetings, and AGMs
- Add filtering by status, type, date range, fiscal year
- Provide clear feedback: loading states, success/error messages, confirmations
- Responsive design for mobile and tablet views

### Role-Based Access Control (RBAC)

- Backend: Validate user roles in all governance routes (admin, board member, secretary)
- Frontend: Conditionally show/hide actions based on user role
- Audit logging for sensitive operations (committee member changes, AGM approvals)

### State Management

- Use React Context or Zustand for complex state (meeting agenda management, attendance tracking)
- Keep local state for simple forms and UI interactions

### Search & Filtering

- **Committees**: Search by name, filter by type
- **Meetings**: Search by title, filter by type, status, date range
- **AGM**: Search by fiscal year, filter by status, date range
- **Committee Members**: Search by member name, filter by position, active/inactive

### Testing Strategy

- Unit tests for validation logic (tenure overlap, quorum calculation)
- Integration tests for API endpoints
- E2E tests for critical flows (create committee, add member, create AGM)
- Test RBAC enforcement

## Notes

- Committees are configuration-type data (updated infrequently, every 3 years or so)
- AGM is separate from regular meetings due to specific requirements (fiscal year, dividend, quorum)
- Meeting minutes and decisions remain part of the meeting detail page, not separate sidebar items
- All pages should respect the `governance` module access control
- File uploads for meeting minutes should integrate with existing document management system if available
- Quorum status is critical for legal validity of AGM decisions - must be clearly displayed
- Meeting minutes draft/finalized workflow prevents accidental edits to approved decisions

### To-dos

- [ ] Add Committee, CommitteeMember, and CommitteeTenure models to Prisma schema
- [ ] Add AGM model to Prisma schema (separate from Meeting)
- [ ] Create backend routes for committees CRUD and member/tenure management
- [ ] Create backend routes for AGM CRUD operations
- [ ] Update Sidebar.tsx to add Governance group with Committees, Meetings, and AGM links
- [ ] Create /governance/committees page with card grid layout
- [ ] Create /governance/committees/[id] page with tabs for Members, Tenure, Settings
- [ ] Create /governance/agm page with AGM list view
- [ ] Create /governance/agm/new and /governance/agm/[id] pages for AGM management
- [ ] Update existing meetings pages to support Agenda, Attendance, Minutes/Decisions tabs
