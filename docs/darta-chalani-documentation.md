# Darta-Chalani Document Management System (DMS)

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Data Models](#data-models)
4. [Darta Workflow](#darta-workflow)
5. [Patra Chalani Workflow](#patra-chalani-workflow)
6. [Document Numbering System](#document-numbering-system)
7. [API Reference](#api-reference)
8. [Features & Capabilities](#features--capabilities)
9. [Usage Examples](#usage-examples)
10. [Technical Implementation](#technical-implementation)

---

## Overview

The Darta-Chalani Document Management System (DMS) is a comprehensive solution for managing incoming and outgoing documents in Nepali cooperative societies. The system handles:

- **Darta**: Incoming documents (received correspondence)
- **Patra Chalani**: Outgoing/internal correspondence (sent letters)

### Key Features
- Fiscal year-based document numbering
- Complete audit trail of document movements
- Status-based workflow management
- Document attachment support with versioning
- Public tracking capabilities (QR codes)
- Soft delete and archival
- Retention policy management

---

## System Architecture

### Core Components

1. **Darta Module**: Manages incoming documents
   - Registration and tracking
   - Movement between users/departments
   - Status transitions
   - Document attachments

2. **Patra Chalani Module**: Manages outgoing/internal correspondence
   - Draft creation and approval workflow
   - Dispatch tracking
   - Action history
   - Document attachments

3. **Serial Number Generation**: Atomic counter-based numbering
   - Race-condition safe
   - Fiscal year-based reset
   - Unique per cooperative per fiscal year

4. **Document Storage**: Multi-provider support
   - Local file system
   - AWS S3
   - Azure Blob Storage
   - Google Cloud Storage

---

## Data Models

### Darta Model

```typescript
{
  id: string
  cooperativeId: string
  
  // Smart Numbering
  fiscalYear: string          // e.g., "2081/82"
  serialNo: number            // e.g., 1
  dartaNumber: string         // e.g., "D-081/82-001"
  
  // Document Details
  title: string
  description?: string
  subject?: string
  category?: DartaCategory
  status: DartaStatus         // ACTIVE | PROCESSING | COMPLETED | ARCHIVED | CANCELLED
  priority: DocumentPriority  // LOW | NORMAL | HIGH | URGENT
  remarks?: string
  
  // Source Info (पत्र पठाउनेको विवरण)
  senderName: string          // Received From
  senderAddress?: string
  senderChalaniNo?: string    // प्राप्त पत्रको चलानी नं.
  senderChalaniDate?: Date    // प्राप्त पत्रको मिति
  receivedDate: Date          // दर्ता मिति
  
  // Tracking
  qrCode?: string
  trackingCode?: string
  publicTrackingEnabled: boolean
  
  // Audit Trail
  createdBy?: string
  updatedBy?: string
  closedBy?: string
  
  // Soft Delete & Archival
  deletedAt?: Date
  isArchived: boolean
  archivedAt?: Date
  retentionUntil?: Date
  
  // Relations
  documents: DartaDocument[]
  movements: DartaMovement[]
  generatedChalanis: PatraChalani[]
}
```

### PatraChalani Model

```typescript
{
  id: string
  cooperativeId: string
  
  // Smart Numbering
  fiscalYear: string          // e.g., "2081/82"
  serialNo: number            // e.g., 1
  chalaniNumber: string       // e.g., "PC-081/82-001"
  
  // Link to Darta (Reply)
  replyToDartaId?: string
  
  // Document Details
  type: ChalaniType           // INCOMING | OUTGOING | INTERNAL
  subject: string
  content?: string            // पत्रको ब्यहोरा
  category?: ChalaniCategory
  status: ChalaniStatus       // DRAFT | PENDING | IN_PROGRESS | APPROVED | SENT | COMPLETED | ARCHIVED | CANCELLED
  priority: DocumentPriority
  remarks?: string
  
  // Receiver/Sender Details
  receiverName: string        // पत्र पाउने संस्था वा व्यक्ति
  receiverAddress?: string
  senderName?: string
  senderAddress?: string
  
  // Dispatch Details
  date: Date                  // पत्रको मिति
  receivedDate?: Date
  sentDate?: Date             // चलानी मिति
  transportMode?: string      // Email | Post Office | By Hand | Courier
  
  // CC/BODHARTHA
  bodhartha?: string
  
  // Tracking
  qrCode?: string
  trackingCode?: string
  publicTrackingEnabled: boolean
  
  // Audit Trail
  createdBy?: string
  updatedBy?: string
  completedBy?: string
  
  // Soft Delete & Archival
  deletedAt?: Date
  isArchived: boolean
  archivedAt?: Date
  retentionUntil?: Date
  
  // Relations
  documents: PatraChalaniDocument[]
  actions: PatraChalaniAction[]
}
```

### Enums

#### DartaStatus
- `ACTIVE`: Newly registered document (default)
- `PROCESSING`: Under review/processing
- `COMPLETED`: Processed and closed
- `ARCHIVED`: Moved to archive
- `CANCELLED`: Cancelled/rejected

#### ChalaniStatus
- `DRAFT`: Being prepared (default)
- `PENDING`: Awaiting approval/action
- `IN_PROGRESS`: Being processed
- `APPROVED`: Approved for sending
- `SENT`: Dispatched
- `COMPLETED`: Process completed
- `ARCHIVED`: Moved to archive
- `CANCELLED`: Cancelled

#### DocumentPriority
- `LOW`: Low priority
- `NORMAL`: Normal priority (default)
- `HIGH`: High priority
- `URGENT`: Urgent

#### DartaCategory
- `GOVERNMENT_NOTICE`
- `LOAN_REQUEST`
- `MEMBER_APPLICATION`
- `COMPLAINT`
- `LEGAL_DOCUMENT`
- `FINANCIAL_REPORT`
- `MEETING_MINUTE`
- `OTHER`

#### ChalaniCategory
- `OFFICIAL_CORRESPONDENCE`
- `MEMBER_COMMUNICATION`
- `GOVERNMENT_REPLY`
- `INTERNAL_MEMO`
- `FINANCIAL_DOCUMENT`
- `LEGAL_DOCUMENT`
- `OTHER`

#### ChalaniType
- `INCOMING`: Received correspondence
- `OUTGOING`: Sent correspondence
- `INTERNAL`: Internal memo/circular

---

## Darta Workflow

### Status Lifecycle

```
ACTIVE → PROCESSING → COMPLETED → ARCHIVED
         ↓
      CANCELLED
```

### Workflow Steps

#### 1. Registration (ACTIVE)
- Document received with sender details
- Auto-generated Darta number (e.g., `D-081/82-001`)
- Status: `ACTIVE` (default)
- Attachments can be uploaded
- Initial movement record created with type `CREATE`

**Required Fields:**
- `title`: Document title
- `senderName`: Sender organization/person name
- `receivedDate`: Registration date

**Optional Fields:**
- `description`: Document description
- `subject`: Subject matter (विषय)
- `category`: Document category
- `priority`: Priority level (default: NORMAL)
- `senderAddress`: Sender's address
- `senderChalaniNo`: Reference number from sender
- `senderChalaniDate`: Date from sender's document
- `remarks`: Additional remarks

#### 2. Processing (PROCESSING)
- Status transition: `ACTIVE` → `PROCESSING`
- Document forwarded/transferred between users/departments
- All movements tracked in `DartaMovement` table
- Multiple movements can occur during processing

**Movement Types:**
- `FORWARD`: Forward to another user/department
- `TRANSFER`: Transfer ownership
- `RETURN`: Return to sender
- `APPROVE`: Approve the document
- `REJECT`: Reject the document

#### 3. Completion (COMPLETED)
- Status transition: `PROCESSING` → `COMPLETED`
- Document processing finished
- `closedAt` and `closedBy` automatically recorded
- Can generate a Chalani (reply) from this Darta

#### 4. Archival (ARCHIVED)
- Status transition: `COMPLETED` → `ARCHIVED`
- Document moved to archive
- `archivedAt` and `archivedBy` recorded
- Can be restored if needed

#### 5. Cancellation (CANCELLED)
- Status transition: Any → `CANCELLED`
- Document cancelled/rejected
- Terminal state

### Movement Tracking

Each movement is recorded with:
- `movementType`: Type of movement
- `fromUserId`: User who sent/transferred
- `toUserId`: User who received
- `fromDepartment`: Department/office from
- `toDepartment`: Department/office to
- `remarks`: Movement remarks
- `movedBy`: User who performed the movement
- `movedAt`: Timestamp

---

## Patra Chalani Workflow

### Status Lifecycle

```
DRAFT → PENDING → IN_PROGRESS → APPROVED → SENT → COMPLETED → ARCHIVED
        ↓
     CANCELLED
```

### Workflow Steps

#### 1. Draft Creation (DRAFT)
- Create with receiver/sender details
- Auto-generated Chalani number (e.g., `PC-081/82-001`)
- Status: `DRAFT` (default)
- Can link to a Darta via `replyToDartaId` (for replies)
- Attachments can be uploaded

**Required Fields:**
- `type`: INCOMING | OUTGOING | INTERNAL
- `subject`: Letter subject
- `receiverName`: Receiver organization/person name
- `date`: Letter date (पत्रको मिति)

**Optional Fields:**
- `content`: Letter content (पत्रको ब्यहोरा)
- `category`: Document category
- `priority`: Priority level (default: NORMAL)
- `receiverAddress`: Receiver's address
- `senderName`: Sender name (usually our office for outgoing)
- `senderAddress`: Our office address
- `receivedDate`: Date received (for incoming)
- `sentDate`: Date sent (चलानी मिति)
- `transportMode`: Email | Post Office | By Hand | Courier
- `bodhartha`: CC to other departments/orgs
- `remarks`: Additional remarks
- `replyToDartaId`: Link to source Darta (for replies)

#### 2. Review & Approval (PENDING → IN_PROGRESS)
- Status transition: `DRAFT` → `PENDING` → `IN_PROGRESS`
- Actions tracked in `PatraChalaniAction` table
- Forward for approval if needed
- Multiple actions can occur during processing

**Action Types:**
- `FORWARD`: Forward to another user/department
- `REPLY`: Reply to a Darta (links via `replyToDartaId`)
- `NOTE`: Add internal note
- `APPROVE`: Approve the document
- `REJECT`: Reject the document

**Status Updates:**
- `FORWARD` or `REPLY` → Status becomes `IN_PROGRESS`
- `APPROVE` → Status becomes `APPROVED`
- `REJECT` → Status becomes `CANCELLED`

#### 3. Approval (APPROVED)
- Status transition: `IN_PROGRESS` → `APPROVED`
- Document approved for dispatch
- Ready to be sent

#### 4. Dispatch (SENT)
- Status transition: `APPROVED` → `SENT`
- Document dispatched
- `sentDate` and `transportMode` recorded
- Track delivery if applicable

#### 5. Completion (COMPLETED)
- Status transition: `SENT` → `COMPLETED`
- Process completed
- `completedAt` and `completedBy` automatically recorded

#### 6. Archival (ARCHIVED)
- Status transition: `COMPLETED` → `ARCHIVED`
- Document moved to archive
- `archivedAt` and `archivedBy` recorded
- Can be restored if needed

#### 7. Cancellation (CANCELLED)
- Status transition: Any → `CANCELLED`
- Document cancelled
- Terminal state

### Action Tracking

Each action is recorded with:
- `actionType`: Type of action
- `actionTo`: User/Department action is forwarded to
- `remarks`: Action remarks
- `actionBy`: User who performed the action
- `actionDate`: Timestamp

**Status Updates Based on Actions:**
- `COMPLETE` → Status becomes `COMPLETED`, `completedAt` set
- `ARCHIVE` → Status becomes `ARCHIVED`
- `FORWARD` or `REPLY` → Status becomes `IN_PROGRESS`

---

## Document Numbering System

### Format

**Darta:** `D-YY/YY-NNN`
- Prefix: `D-`
- Fiscal Year: Last 2 digits of start year + last 2 digits of end year (e.g., `081/82`)
- Serial Number: 3-digit sequential number (e.g., `001`)

**Example:** `D-081/82-001`, `D-081/82-002`, etc.

**Chalani:** `PC-YY/YY-NNN`
- Prefix: `PC-`
- Fiscal Year: Last 2 digits of start year + last 2 digits of end year (e.g., `081/82`)
- Serial Number: 3-digit sequential number (e.g., `001`)

**Example:** `PC-081/82-001`, `PC-081/82-002`, etc.

### Fiscal Year Based

- Serial numbers reset each fiscal year
- Fiscal year format: `"2081/82"` or `"081/82"`
- Supports custom fiscal years for historical data entry

### Atomic Generation

- Uses counter tables (`DartaSerialCounter`, `ChalaniSerialCounter`) for race-condition safe numbering
- Transaction flow: `BEGIN → SELECT FOR UPDATE → INCREMENT → COMMIT`
- Ensures unique numbering even with concurrent requests

### Unique Constraints

- `(cooperativeId, fiscalYear, serialNo)` - Ensures uniqueness per cooperative per fiscal year
- `dartaNumber` / `chalaniNumber` - Unique constraint for fast lookup

---

## API Reference

### Darta Endpoints

#### List Dartas
```
GET /api/darta
```

**Query Parameters:**
- `status`: Filter by status (ACTIVE, PROCESSING, COMPLETED, ARCHIVED, CANCELLED)
- `category`: Filter by category
- `search`: Search in title, dartaNumber, subject
- `fiscalYear`: Filter by fiscal year (e.g., "2081/82")
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "dartas": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### Get Darta Details
```
GET /api/darta/:id
```

**Response:**
```json
{
  "id": "...",
  "dartaNumber": "D-081/82-001",
  "title": "...",
  "status": "ACTIVE",
  "documents": [...],
  "movements": [...]
}
```

#### Create Darta
```
POST /api/darta
```

**Request Body:**
```json
{
  "title": "Document Title",
  "senderName": "Sender Organization",
  "senderAddress": "Address",
  "subject": "Subject Matter",
  "category": "GOVERNMENT_NOTICE",
  "priority": "NORMAL",
  "description": "Description",
  "senderChalaniNo": "REF-001",
  "senderChalaniDate": "2024-01-15",
  "receivedDate": "2024-01-20",
  "fiscalYear": "2081/82",
  "remarks": "Remarks"
}
```

**Response:**
```json
{
  "id": "...",
  "dartaNumber": "D-081/82-001",
  ...
}
```

#### Update Darta
```
PUT /api/darta/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "PROCESSING",
  "priority": "HIGH",
  "remarks": "Updated remarks"
}
```

#### Record Movement
```
POST /api/darta/:id/movement
```

**Request Body:**
```json
{
  "movementType": "FORWARD",
  "fromUserId": "user-id",
  "toUserId": "user-id",
  "fromDepartment": "Department A",
  "toDepartment": "Department B",
  "remarks": "Forwarding for review"
}
```

#### Upload Document
```
POST /api/darta/:id/document
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: File to upload
- `title`: Document title
- `description`: Document description

#### Delete Document
```
DELETE /api/darta/:id/document/:docId
```

### Patra Chalani Endpoints

#### List Patra Chalanis
```
GET /api/patra-chalani
```

**Query Parameters:**
- `type`: Filter by type (INCOMING, OUTGOING, INTERNAL)
- `status`: Filter by status
- `category`: Filter by category
- `search`: Search in subject, chalaniNumber, patraNumber, receiverName, senderName
- `fiscalYear`: Filter by fiscal year
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

#### Get Patra Chalani Details
```
GET /api/patra-chalani/:id
```

#### Create Patra Chalani
```
POST /api/patra-chalani
```

**Request Body:**
```json
{
  "type": "OUTGOING",
  "subject": "Letter Subject",
  "content": "Letter content",
  "receiverName": "Receiver Organization",
  "receiverAddress": "Address",
  "senderName": "Our Office",
  "senderAddress": "Our Address",
  "date": "2024-01-20",
  "sentDate": "2024-01-21",
  "category": "OFFICIAL_CORRESPONDENCE",
  "priority": "NORMAL",
  "transportMode": "Email",
  "bodhartha": "CC to Department A",
  "fiscalYear": "2081/82",
  "replyToDartaId": "darta-id",
  "remarks": "Remarks"
}
```

#### Update Patra Chalani
```
PUT /api/patra-chalani/:id
```

#### Add Action
```
POST /api/patra-chalani/:id/action
```

**Request Body:**
```json
{
  "actionType": "FORWARD",
  "actionTo": "user-id",
  "remarks": "Forwarding for approval"
}
```

**Action Types:**
- `FORWARD`: Forward to another user/department
- `REPLY`: Reply to a Darta
- `NOTE`: Add internal note
- `APPROVE`: Approve the document
- `REJECT`: Reject the document
- `COMPLETE`: Mark as completed
- `ARCHIVE`: Archive the document
- `CANCEL`: Cancel the document

#### Upload Document
```
POST /api/patra-chalani/:id/document
Content-Type: multipart/form-data
```

#### Delete Document
```
DELETE /api/patra-chalani/:id/document/:docId
```

---

## Features & Capabilities

### 1. Fiscal Year Management
- Documents organized by Nepali fiscal year
- Automatic fiscal year detection
- Support for custom fiscal years
- Serial numbers reset each fiscal year

### 2. Atomic Numbering
- Race-condition safe serial number generation
- Uses counter tables with database transactions
- Prevents duplicate numbers
- Unique per cooperative per fiscal year

### 3. Status Management
- Clear status transitions
- Automatic status updates based on actions
- Status history tracking
- Terminal states (ARCHIVED, CANCELLED)

### 4. Movement Tracking
- Complete audit trail of document movements
- User and department tracking
- Movement history with timestamps
- Remarks for each movement

### 5. Document Linking
- Darta-Chalani relationship tracking
- Reply chain tracking via `replyToDartaId`
- Generated Chalani tracking from Darta

### 6. File Management
- Multiple attachments per document
- Versioned document storage
- Support for multiple storage providers
- File integrity checks (SHA-256 hash)
- Soft delete for documents

### 7. Soft Delete
- Documents can be soft-deleted
- `deletedAt` timestamp
- Can be restored if needed
- Excluded from normal queries

### 8. Retention Policies
- Auto-archive based on `retentionUntil` date
- Auto-delete support (future implementation)
- Configurable retention periods

### 9. Public Tracking
- Optional QR codes for documents
- Public tracking codes
- Public tracking page support
- Enable/disable per document

### 10. Search & Filtering
- Full-text search support (planned)
- Filter by status, category, fiscal year
- Date range filtering
- Search across multiple fields

### 11. Priority Management
- Four priority levels (LOW, NORMAL, HIGH, URGENT)
- Visual indicators in UI
- Filtering by priority

### 12. Audit Trail
- Complete user tracking (created, updated, closed, completed)
- Timestamp tracking for all actions
- Movement and action history
- Department tracking

---

## Usage Examples

### Example 1: Registering an Incoming Document (Darta)

```typescript
// POST /api/darta
const response = await fetch('/api/darta', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Government Notice on Compliance',
    senderName: 'Ministry of Cooperatives',
    senderAddress: 'Kathmandu, Nepal',
    subject: 'Annual Compliance Requirements',
    category: 'GOVERNMENT_NOTICE',
    priority: 'HIGH',
    description: 'Notice regarding annual compliance requirements',
    senderChalaniNo: 'MOF-2024-001',
    senderChalaniDate: '2024-01-15',
    receivedDate: '2024-01-20',
    remarks: 'Urgent attention required'
  })
});

// Response includes auto-generated dartaNumber: "D-081/82-001"
```

### Example 2: Forwarding a Darta to Another Department

```typescript
// POST /api/darta/:id/movement
const response = await fetch(`/api/darta/${dartaId}/movement`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    movementType: 'FORWARD',
    fromUserId: currentUserId,
    toUserId: targetUserId,
    fromDepartment: 'Reception',
    toDepartment: 'Compliance',
    remarks: 'Forwarding for compliance review'
  })
});
```

### Example 3: Creating a Reply Chalani

```typescript
// POST /api/patra-chalani
const response = await fetch('/api/patra-chalani', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'OUTGOING',
    subject: 'Re: Government Notice on Compliance',
    content: 'We acknowledge receipt of your notice...',
    receiverName: 'Ministry of Cooperatives',
    receiverAddress: 'Kathmandu, Nepal',
    senderName: 'Our Cooperative Society',
    senderAddress: 'Our Address',
    date: '2024-01-25',
    category: 'GOVERNMENT_REPLY',
    priority: 'HIGH',
    transportMode: 'Email',
    replyToDartaId: dartaId, // Link to original Darta
    remarks: 'Reply to compliance notice'
  })
});
```

### Example 4: Approving and Sending a Chalani

```typescript
// Step 1: Approve
await fetch(`/api/patra-chalani/${chalaniId}/action`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    actionType: 'APPROVE',
    remarks: 'Approved for dispatch'
  })
});

// Step 2: Update status to SENT
await fetch(`/api/patra-chalani/${chalaniId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'SENT',
    sentDate: '2024-01-26',
    transportMode: 'Email'
  })
});
```

### Example 5: Uploading a Document Attachment

```typescript
// POST /api/darta/:id/document
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('title', 'Supporting Document');
formData.append('description', 'Additional information');

const response = await fetch(`/api/darta/${dartaId}/document`, {
  method: 'POST',
  body: formData
});
```

### Example 6: Filtering Documents by Fiscal Year

```typescript
// GET /api/darta?fiscalYear=2081/82&status=ACTIVE
const response = await fetch('/api/darta?fiscalYear=2081/82&status=ACTIVE&page=1&limit=20');
const data = await response.json();
// Returns all active dartas for fiscal year 2081/82
```

---

## Technical Implementation

### Database Schema

#### Key Tables
- `dartas`: Main Darta records
- `darta_documents`: Document attachments for Darta
- `darta_movements`: Movement history for Darta
- `darta_serial_counters`: Atomic counter for Darta numbering
- `patra_chalanis`: Main Patra Chalani records
- `patra_chalani_documents`: Document attachments for Chalani
- `patra_chalani_actions`: Action history for Chalani
- `chalani_serial_counters`: Atomic counter for Chalani numbering

#### Indexes
- `(cooperativeId, fiscalYear, serialNo)`: Unique constraint
- `(cooperativeId, status)`: Status filtering
- `(cooperativeId, fiscalYear)`: Fiscal year filtering
- `(dartaNumber)`, `(chalaniNumber)`: Fast lookup
- `(trackingCode)`, `(qrCode)`: Public tracking lookup

### Status Mapping

The system includes status mapping functions to handle frontend-backend status differences:

**Darta Status Mapping:**
- Frontend `PENDING` → Backend `ACTIVE`
- Frontend `IN_PROGRESS` → Backend `PROCESSING`
- Frontend `DONE` → Backend `COMPLETED`

**Chalani Status Mapping:**
- Frontend `ACTIVE` → Backend `PENDING`
- Frontend `PROCESSING` → Backend `IN_PROGRESS`
- Frontend `DONE` → Backend `COMPLETED`

### Serial Number Generation

```typescript
// Pseudo-code for atomic serial number generation
async function generateSerialNumber(cooperativeId: string, fiscalYear: string) {
  return await prisma.$transaction(async (tx) => {
    // Get or create counter
    let counter = await tx.dartaSerialCounter.findUnique({
      where: { cooperativeId_fiscalYear: { cooperativeId, fiscalYear } }
    });
    
    if (!counter) {
      counter = await tx.dartaSerialCounter.create({
        data: { cooperativeId, fiscalYear, lastSerialNo: 0 }
      });
    }
    
    // Increment atomically
    counter = await tx.dartaSerialCounter.update({
      where: { id: counter.id },
      data: { lastSerialNo: { increment: 1 } }
    });
    
    return counter.lastSerialNo;
  });
}
```

### Date Validation

**Application-level constraints:**
- Darta: `senderChalaniDate <= receivedDate` (if both provided)
- PatraChalani (Incoming): `receivedDate <= date`
- PatraChalani (Outgoing): `date <= sentDate`

These should be enforced in application code or via Prisma middleware.

### Full-Text Search

PostgreSQL GIN indexes can be added via raw SQL migration:

```sql
CREATE INDEX idx_darta_title_gin ON dartas 
USING gin(to_tsvector('nepali', title));

CREATE INDEX idx_darta_subject_gin ON dartas 
USING gin(to_tsvector('nepali', subject));

CREATE INDEX idx_chalani_subject_gin ON patra_chalanis 
USING gin(to_tsvector('nepali', subject));
```

### File Storage

Supports multiple storage providers:
- **LOCAL**: Local file system
- **S3**: AWS S3
- **AZURE_BLOB**: Azure Blob Storage
- **GCS**: Google Cloud Storage

File metadata includes:
- `filePath`: Local path or S3 key
- `fileUrl`: Public/pre-signed URL
- `fileHash`: SHA-256 hash for integrity
- `bucket`, `key`, `region`: Cloud storage metadata
- `version`: Document version
- `isLatest`: Latest version flag

---

## Best Practices

### 1. Document Creation
- Always provide required fields
- Use appropriate categories
- Set correct priority levels
- Include sender/receiver details

### 2. Status Management
- Follow proper status transitions
- Don't skip statuses
- Use terminal states appropriately
- Record movements/actions for audit

### 3. Numbering
- Don't manually set serial numbers
- Let the system generate numbers
- Use fiscal year correctly
- Handle custom fiscal years carefully

### 4. File Management
- Validate file types and sizes
- Use appropriate storage providers
- Maintain file versioning
- Clean up deleted files

### 5. Security
- Validate user permissions
- Check cooperative access
- Sanitize user inputs
- Use parameterized queries

### 6. Performance
- Use pagination for large lists
- Index frequently queried fields
- Cache fiscal year calculations
- Optimize file uploads

---

## Troubleshooting

### Common Issues

#### 1. Duplicate Serial Numbers
**Problem:** Two documents get the same serial number
**Solution:** Ensure atomic counter transactions are working correctly

#### 2. Status Mapping Errors
**Problem:** Frontend status doesn't match backend enum
**Solution:** Use status mapping functions in backend routes

#### 3. Fiscal Year Mismatch
**Problem:** Document created with wrong fiscal year
**Solution:** Verify fiscal year calculation and custom fiscal year handling

#### 4. File Upload Failures
**Problem:** Files not uploading
**Solution:** Check file size limits, storage provider configuration, permissions

#### 5. Missing Audit Trail
**Problem:** Movements/actions not recorded
**Solution:** Ensure movement/action endpoints are called with proper data

---

## Future Enhancements

1. **Workflow Engine Integration**: Formal workflow state machine
2. **Notification System**: Email/SMS notifications for status changes
3. **Digital Signatures**: Support for digital signatures
4. **OCR Integration**: Automatic text extraction from scanned documents
5. **Advanced Search**: Full-text search with Nepali language support
6. **Reporting**: Comprehensive reports and analytics
7. **Mobile App**: Mobile access for document management
8. **API Webhooks**: Webhook support for external integrations
9. **Bulk Operations**: Bulk import/export capabilities
10. **Template System**: Document templates for common correspondence

---

## Support & Maintenance

### Module Requirements
- DMS module must be enabled for the cooperative
- Proper user permissions required
- Storage provider configured

### Database Maintenance
- Regular cleanup of soft-deleted documents
- Archive old documents based on retention policies
- Monitor serial counter tables
- Optimize indexes periodically

### Monitoring
- Track document creation rates
- Monitor file storage usage
- Check for failed uploads
- Review audit logs regularly

---

## Conclusion

The Darta-Chalani Document Management System provides a comprehensive solution for managing incoming and outgoing documents in Nepali cooperative societies. With its robust workflow management, atomic numbering system, and complete audit trail, it ensures efficient and compliant document handling.

For additional support or feature requests, please refer to the main project documentation or contact the development team.

---

**Last Updated:** 2024
**Version:** 1.0.0
**Maintained By:** MyERP Development Team

