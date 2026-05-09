# Google Sheets Setup Instructions for BSN Batch Upload Template

## 🚀 Quick Start (3 Steps)

### Step 1: Open Google Sheets
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a **new blank spreadsheet**
3. Or open an existing sheet where you want to create the template

### Step 2: Open Apps Script
1. Click **Extensions** → **Apps Script** (or **Tools** → **Script editor**)
2. A new tab will open with the Apps Script editor

### Step 3: Paste and Run
1. **Delete** any existing code in the editor
2. **Copy** the entire contents of `BSN_Batch_Upload_Google_Sheets.js`
3. **Paste** it into the Apps Script editor
4. Click the **▶️ Run** button (or press `Ctrl+R` / `Cmd+R`)
5. Select `createBSNBatchUploadTemplate` from the function dropdown if prompted
6. Click **Run** again
7. **Authorize** the script when prompted (click "Review permissions" → "Allow")

### Done! ✅
Your sheet will now have:
- ✅ All column headers
- ✅ Formatted header row
- ✅ Dropdown validation on all specified columns
- ✅ Sample data row (delete before use)
- ✅ Hidden "Options" sheet with all valid values

---

## 📋 What Gets Created

### Main Sheet
- **Row 1**: Headers (blue background, white text, bold)
- **Row 2**: Instructions (gray italic text)
- **Row 3**: Sample data (gray italic text - delete before use)
- **Row 4+**: Empty rows for your data

### Dropdown Columns
The following columns have dropdown validation:

| Column | Field | Options Count |
|--------|-------|---------------|
| **H** | IDENTIFICATION | 6 options |
| **I** | GENDER | 4 options |
| **L** | PRIMARY INDUSTRY HOUSE | 12 options |
| **M** | ADDITIONAL FOCUS AREAS | 12 options |
| **S** | State/Province | 66 options |
| **T** | State | 66 options |
| **Z** | MEMBER LEVEL | 6 options |
| **W** | Include me on Global BSN Map | 6 options |
| **AA** | Paying Member | 6 options |
| **AB** | Equity Member | 6 options |
| **AD** | Send Need Payment Email | 6 options |

### Hidden Sheet
- **"Options"** sheet contains all dropdown values
- Hidden by default but can be unhidden if needed
- Useful for reference or troubleshooting

---

## 🎯 How to Use the Dropdowns

1. **Click** on any cell in a dropdown column (H, I, L, M, S, T, Z, W, AA, AB, or AD)
2. A **dropdown arrow** (▼) will appear
3. **Click** the arrow to see all valid options
4. **Select** an option from the list
5. The cell will be filled with your selection

### For Multiple Values (ADDITIONAL FOCUS AREAS)
- Column M allows multiple selections
- Type or paste multiple values separated by commas
- Example: `☀️ Alternative Energy, 💧Water, ♻️ Green Lifestyle`

---

## 🔄 Re-running the Script

If you need to reset or recreate the template:

1. Open **Extensions** → **Apps Script**
2. Click **▶️ Run** again
3. Select `createBSNBatchUploadTemplate`
4. Click **Run**
5. Confirm if prompted

**Note**: This will **clear** your current sheet and recreate everything from scratch. Make sure to save your data first if needed!

---

## 🛠️ Custom Menu (Optional)

The script includes an `onOpen()` function that adds a custom menu:

- **Menu Name**: "BSN Tools"
- **Menu Item**: "Setup Batch Upload Template"
- **Location**: Appears in the Google Sheets menu bar

This menu appears automatically when you open the sheet, making it easy to run the setup again.

---

## 📊 Column Details

### All 30 Columns Created:

1. EMAIL ADDRESS
2. Email 2
3. FIRST NAME
4. LAST NAME
5. ORGANIZATION NAME
6. WEBSITE
7. BIO
8. **IDENTIFICATION** ⬇️ (dropdown)
9. **GENDER** ⬇️ (dropdown)
10. PHONE US/CAN ONLY
11. PHONE NON-US/CAN
12. **PRIMARY INDUSTRY HOUSE** ⬇️ (dropdown)
13. **ADDITIONAL FOCUS AREAS** ⬇️ (dropdown)
14. NAICS Code
15. AFFILIATED ENTITY
16. Address
17. Location (Nearest City)
18. Country
19. **State/Province** ⬇️ (dropdown)
20. **State** ⬇️ (dropdown)
21. Zip/Postal Code
22. Time zone
23. **Include me on Global BSN Map** ⬇️ (dropdown)
24. LATITUDE (NEW)
25. LONGITUDE (NEW)
26. **MEMBER LEVEL** ⬇️ (dropdown)
27. **Paying Member (keep current)** ⬇️ (dropdown)
28. **Equity Member (keep current)** ⬇️ (dropdown)
29. Membership Status Notes
30. **Send Need Payment Email** ⬇️ (dropdown)

---

## ✅ Validation Features

### Data Validation Rules
- **Dropdown lists** for specified columns
- **Invalid entries blocked** - you can only select from the dropdown
- **Help text** appears when hovering over dropdown cells
- **Blank cells allowed** for optional fields

### Error Handling
- If you try to type an invalid value, Google Sheets will show an error
- You must select from the dropdown or leave blank
- This prevents data entry errors

---

## 🔍 Troubleshooting

### Script Won't Run
- **Check permissions**: Make sure you authorized the script
- **Check function name**: Make sure `createBSNBatchUploadTemplate` is selected
- **Check errors**: Look at the Execution log for error messages

### Dropdowns Not Appearing
- **Refresh the sheet**: Sometimes you need to refresh the page
- **Check column**: Make sure you're in the right column (H, I, L, M, S, T, Z, W, AA, AB, or AD)
- **Re-run script**: Try running the script again

### Can't See Options Sheet
- The "Options" sheet is hidden by default
- To unhide: Right-click on sheet tabs → "Options" → "Show sheet"
- Or: View → Hidden sheets → "Options"

### Sample Row Won't Delete
- The sample row (row 3) is just regular data
- Right-click row 3 → "Delete row"
- Or select row 3 and press `Delete` key

---

## 📤 Exporting to Excel

After setting up your template in Google Sheets:

1. **File** → **Download** → **Microsoft Excel (.xlsx)**
2. The Excel file will include all dropdowns and formatting
3. You can use this Excel file in Microsoft Excel or other spreadsheet programs

**Note**: Some advanced features may not transfer perfectly, but dropdowns should work.

---

## 💡 Tips

1. **Freeze header row**: Already done! Row 1 stays visible when scrolling
2. **Column widths**: Already optimized for readability
3. **Sample data**: Delete row 3 before entering real data
4. **Multiple members**: Add one member per row starting from row 4
5. **Copy-paste**: You can copy dropdown values from the Options sheet if needed

---

## 🔐 Permissions Required

The script needs these permissions:
- ✅ **Read and write** to the current spreadsheet
- ✅ **Create and modify** sheets within the spreadsheet
- ✅ **Set data validation** rules

These are standard Google Sheets permissions and are safe to grant.

---

## 📞 Support

If you encounter issues:
1. Check the **Execution log** in Apps Script (View → Execution log)
2. Make sure all code was copied correctly
3. Try running the script again
4. Contact: members@blacksustainability.org

---

## 🎉 Success!

Once the script runs successfully, you'll see:
- ✅ A success alert message
- ✅ All headers in row 1 (blue background)
- ✅ Instructions in row 2
- ✅ Sample data in row 3
- ✅ Dropdown arrows in columns H, I, L, M, S, T, Z, W, AA, AB, AD

**You're ready to start entering member data!**

---

*Last Updated: January 23, 2026*
