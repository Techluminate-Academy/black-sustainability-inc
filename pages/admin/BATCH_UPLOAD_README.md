# BSN Batch Upload Web Interface

A web-based spreadsheet interface for batch uploading members to the Black Sustainability Network.

## 🎯 Features

- **Excel-like Interface**: Table-based form that looks and feels like a spreadsheet
- **Dropdown Validation**: All dropdown fields match the BSN registration form
- **Add/Remove Rows**: Dynamically add or remove member rows
- **CSV Export**: Export your data to CSV format
- **Real-time Validation**: Required fields are marked and validated
- **Bulk Submission**: Submit all members at once to Airtable
- **Error Handling**: Detailed error messages for failed submissions

## 🚀 Access

Navigate to: `/admin/batch-upload`

Or visit: `https://your-domain.com/admin/batch-upload`

## 📋 How to Use

### 1. Fill Out Member Data

- Each row represents one member
- Required fields are marked with a red asterisk (*)
- Use dropdowns for validated fields:
  - IDENTIFICATION
  - GENDER
  - PRIMARY INDUSTRY HOUSE
  - ADDITIONAL FOCUS AREAS (multi-select)
  - State/Province
  - MEMBER LEVEL
  - Yes/No fields

### 2. Add More Rows

- Click the **"+ Add Row"** button to add more members
- Click the **"×"** button on a row to remove it (minimum 1 row required)

### 3. Export to CSV

- Click **"Export to CSV"** to download your data
- The CSV file will be named: `bsn-batch-upload-YYYY-MM-DD.csv`
- You can open this in Excel, Google Sheets, or any spreadsheet application

### 4. Submit All Members

- Click **"Submit All"** to validate and submit all rows
- The system will:
  - Validate all required fields
  - Check for existing members by email
  - Create new records or update existing ones
  - Show success/error messages for each row

## 📊 Field Details

### Required Fields (*)

- **EMAIL ADDRESS** - Primary email (must be unique)
- **FIRST NAME** - Member's first name
- **LAST NAME** - Member's last name
- **BIO** - Description of member/organization
- **IDENTIFICATION** - Dropdown selection
- **GENDER** - Dropdown selection
- **PRIMARY INDUSTRY HOUSE** - Dropdown selection
- **Address** - Full address
- **Location (Nearest City)** - City name

### Optional Fields

All other fields are optional and can be left blank.

### Dropdown Options

All dropdown options match the BSN registration form:

- **IDENTIFICATION**: 6 options
- **GENDER**: 4 options
- **PRIMARY INDUSTRY HOUSE**: 12 options
- **ADDITIONAL FOCUS AREAS**: Same 12 options (multi-select)
- **State/Province**: 66 options (US states + Canadian provinces)
- **MEMBER LEVEL**: 6 options
- **Yes/No Fields**: 6 options (Yes, No, TRUE, FALSE, true, false)

## 🔄 How It Works

### Frontend (`/pages/admin/batch-upload.tsx`)

- React component with state management
- Table-based UI with editable cells
- Dropdown components for validated fields
- CSV export functionality
- Form validation

### Backend (`/pages/api/admin/batch-upload.ts`)

- Receives array of member rows
- Validates required fields
- Checks for existing members by email
- Maps data to Airtable format
- Creates new records or updates existing ones
- Returns detailed success/error results

### Data Flow

1. User fills out form in browser
2. Clicks "Submit All"
3. Frontend validates data
4. Sends POST request to `/api/admin/batch-upload`
5. Backend processes each row:
   - Validates required fields
   - Checks if member exists (by email)
   - Creates or updates Airtable record
6. Returns results to frontend
7. Frontend displays success/error messages

## 🛠️ Technical Details

### Dependencies

- React (Next.js)
- react-hot-toast (for notifications)
- TypeScript

### API Endpoint

**POST** `/api/admin/batch-upload`

**Request Body:**
```json
{
  "rows": [
    {
      "email": "example@email.com",
      "firstName": "John",
      "lastName": "Doe",
      // ... other fields
    }
  ]
}
```

**Response:**
```json
{
  "message": "Processed 5 row(s)",
  "results": {
    "successful": 4,
    "failed": 1,
    "details": {
      "success": [
        { "row": 1, "action": "created", "email": "..." }
      ],
      "errors": [
        { "row": 2, "error": "Missing required fields" }
      ]
    }
  }
}
```

## 🎨 UI Features

- **Sticky Header**: Column headers stay visible when scrolling
- **Hover Effects**: Rows highlight on hover
- **Responsive Design**: Works on desktop and tablet
- **Color Coding**: Required fields marked in red
- **Inline Editing**: Click any cell to edit
- **Dropdown Indicators**: Visual indicators for dropdown fields

## 📝 Tips

1. **Start Small**: Test with 1-2 rows first
2. **Export Before Submit**: Always export to CSV as backup
3. **Check Errors**: Review error messages if submission fails
4. **Email Uniqueness**: Each member must have a unique email
5. **Multi-Select**: For ADDITIONAL FOCUS AREAS, select multiple values (they'll be comma-separated)

## 🐛 Troubleshooting

### "Missing required fields" Error

- Check that all required fields (marked with *) are filled
- Make sure email addresses are valid

### "Submission failed" Error

- Check your internet connection
- Verify API endpoint is accessible
- Check browser console for detailed errors

### Dropdowns Not Showing

- Make sure JavaScript is enabled
- Try refreshing the page
- Check browser console for errors

## 🔐 Security

- API endpoint should be protected (add authentication)
- Validate all inputs on the backend
- Sanitize data before sending to Airtable

## 🚀 Future Enhancements

- [ ] Add authentication/authorization
- [ ] Bulk import from CSV file
- [ ] Progress bar for large submissions
- [ ] Undo/redo functionality
- [ ] Save draft functionality
- [ ] Template download
- [ ] Field-level validation messages
- [ ] Duplicate detection before submission

---

*Created: January 23, 2026*
*For support: members@blacksustainability.org*
