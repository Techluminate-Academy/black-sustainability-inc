# Batch Upload Workflow

## Overview

The batch upload system now saves submissions to a **pending list** for review before uploading to Airtable. This allows administrators to review and approve submissions before they go live.

## User Flow

### 1. Public Submission (`/batch-upload`)

- Users fill out the batch upload form
- Click **"Submit All"**
- Data is **saved to MongoDB** (not immediately uploaded to Airtable)
- User sees message: *"Saved X member(s) for review! Your submission will be reviewed before being uploaded."*

### 2. Admin Review (`/admin/review-batch-uploads`)

- Administrators can view all pending submissions
- Filter by status: Pending, Uploaded, Rejected
- View details of each submission:
  - Number of members
  - Email addresses
  - Submission date
  - Full row details
- Select one or more submissions
- **Upload** selected submissions to Airtable
- **Reject** submissions that shouldn't be uploaded

## Data Storage

### MongoDB Collection: `pendingBatchUploads`

Each document contains:
```typescript
{
  _id: ObjectId,
  rows: BatchUploadRow[],  // Array of member data
  submittedAt: Date,
  submittedBy: string,     // IP address or identifier
  status: 'pending' | 'approved' | 'rejected' | 'uploaded',
  uploadedAt?: Date,
  uploadedBy?: string,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Public Endpoint

**POST** `/api/batch-upload`
- Saves batch upload to MongoDB
- Status: `pending`
- Returns: Success message with submission ID

### Admin Endpoints

**GET** `/api/admin/pending-batch-uploads?status=pending`
- Lists all pending batch uploads
- Optional filter by status

**POST** `/api/admin/pending-batch-uploads`
- Action: `upload` - Uploads selected batch uploads to Airtable
- Action: `reject` - Marks selected batch uploads as rejected

## Status Flow

```
pending → uploaded (when admin approves)
pending → rejected (when admin rejects)
```

## Admin Interface Features

- **Filter by Status**: View pending, uploaded, or rejected submissions
- **Select Multiple**: Select one or more submissions to process
- **Bulk Actions**: Upload or reject multiple submissions at once
- **Detailed View**: Expand to see all member rows in each submission
- **Status Indicators**: Color-coded status badges

## Benefits

1. **Quality Control**: Review data before it goes live
2. **Error Prevention**: Catch mistakes before they're in Airtable
3. **Audit Trail**: Track who submitted what and when
4. **Flexibility**: Reject invalid submissions without affecting Airtable
5. **Bulk Processing**: Process multiple submissions at once

## Access

- **Public Form**: `/batch-upload` (anyone can submit)
- **Admin Review**: `/admin/review-batch-uploads` (admin only)

---

*Last Updated: January 23, 2026*
