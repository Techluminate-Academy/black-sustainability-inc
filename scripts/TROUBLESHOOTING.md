# Troubleshooting BSN Batch Upload Template

## Issue: Headers Look Wrong or Misaligned

### Solution 1: Re-run the Script
1. Go to **Extensions** → **Apps Script**
2. Make sure you have the latest version of the script
3. Click **Run** ▶️ again
4. Select `createBSNBatchUploadTemplate`
5. Click **Run**
6. The script will clear everything and recreate it

### Solution 2: Check Column Count
The template should have **exactly 30 columns** (A through AD).

To verify:
1. Look at the bottom of the sheet - you should see columns A through AD
2. Check row 1 - all 30 headers should be there
3. If columns are missing, re-run the script

### Solution 3: Manual Header Check
Compare your headers with the correct list:

**Columns A-AD (30 total):**
1. EMAIL ADDRESS
2. Email 2
3. FIRST NAME
4. LAST NAME
5. ORGANIZATION NAME
6. WEBSITE
7. BIO
8. IDENTIFICATION ⬇️
9. GENDER ⬇️
10. PHONE US/CAN ONLY
11. PHONE NON-US/CAN
12. PRIMARY INDUSTRY HOUSE ⬇️
13. ADDITIONAL FOCUS AREAS ⬇️
14. NAICS Code
15. AFFILIATED ENTITY
16. Address
17. Location (Nearest City)
18. Country
19. State/Province ⬇️
20. State ⬇️
21. Zip/Postal Code
22. Time zone
23. Include me on Global BSN Map ⬇️
24. LATITUDE (NEW)
25. LONGITUDE (NEW)
26. MEMBER LEVEL ⬇️
27. Paying Member (keep current) ⬇️
28. Equity Member (keep current) ⬇️
29. Membership Status Notes
30. Send Need Payment Email ⬇️

---

## Issue: Dropdowns Not Appearing

### Check These Things:

1. **Are you in the right column?**
   - Dropdowns only appear in columns: H, I, L, M, S, T, Z, W, AA, AB, AD
   - Click on a cell in one of these columns

2. **Refresh the sheet**
   - Sometimes Google Sheets needs a refresh
   - Press `F5` or refresh the browser

3. **Check if data validation exists**
   - Click on a cell in column H (IDENTIFICATION)
   - Go to **Data** → **Data validation**
   - You should see a dropdown list configured

4. **Re-run the script**
   - The script sets up data validation
   - If it didn't run completely, dropdowns won't work

---

## Issue: Script Won't Run

### Error: "Authorization Required"
1. Click **Review permissions**
2. Select your Google account
3. Click **Advanced** → **Go to [Project Name] (unsafe)**
4. Click **Allow**

### Error: "Function not found"
1. Make sure the function name is exactly: `createBSNBatchUploadTemplate`
2. Select it from the function dropdown at the top
3. Click **Run** ▶️

### Error: "Execution failed"
1. Check the **Execution log** (View → Execution log)
2. Look for error messages
3. Common issues:
   - Missing permissions
   - Sheet is protected
   - Too many cells to process

---

## Issue: Headers Are Cut Off or Wrapped

### This is Normal!
- Headers are set to wrap text
- This allows long header names to display properly
- You can adjust column widths manually if needed

### To Adjust Column Widths:
1. Click on the column letter (e.g., "A")
2. Drag the right edge to resize
3. Or double-click to auto-fit

---

## Issue: Sample Data Row Won't Delete

### Easy Fix:
1. Right-click on row 3
2. Select **Delete row**
3. Or select row 3 and press `Delete` key

---

## Issue: Can't See Options Sheet

### The Options Sheet is Hidden (This is Normal)
To unhide it:
1. Right-click on any sheet tab at the bottom
2. Look for **"Options"** in the list
3. Click **Show sheet**

Or:
1. Go to **View** → **Hidden sheets**
2. Select **Options**

---

## Issue: Headers Don't Match Original CSV

### The Script Should Match Exactly
If headers don't match:
1. **Re-run the script** - it will clear and recreate everything
2. **Check the script** - make sure you copied the entire script
3. **Verify column count** - should be exactly 30 columns

### Manual Fix (If Needed):
1. Delete all rows
2. Copy headers from the original CSV
3. Paste into row 1
4. Re-run the script (it will add dropdowns to existing headers)

---

## Issue: Data Validation Not Working

### Check Data Validation Settings:
1. Click on a cell with dropdown (e.g., column H)
2. Go to **Data** → **Data validation**
3. Should show:
   - Criteria: "List of items" or "List from a range"
   - Show dropdown list in cell: ✅ Checked

### If Not Working:
1. Re-run the script
2. Make sure the Options sheet exists (even if hidden)
3. Check that the Options sheet has data in columns A-F

---

## Quick Fix: Start Fresh

If nothing works, start completely fresh:

1. **Create a new Google Sheet**
2. **Copy the entire script** from `BSN_Batch_Upload_Google_Sheets.js`
3. **Paste into Apps Script**
4. **Run the script**
5. **Authorize permissions**
6. **Done!**

---

## Still Having Issues?

1. **Check the Execution Log**:
   - In Apps Script: **View** → **Execution log**
   - Look for any error messages

2. **Verify Script Completeness**:
   - Make sure you copied the ENTIRE script
   - Should be ~370 lines
   - Should end with the `onOpen()` function

3. **Contact Support**:
   - Email: members@blacksustainability.org
   - Include:
     - Screenshot of the issue
     - What step you're on
     - Any error messages

---

## Verification Checklist

After running the script, verify:

- [ ] Row 1 has 30 headers (A through AD)
- [ ] Row 1 has blue background, white text
- [ ] Row 2 has instructions (gray italic text)
- [ ] Row 3 has sample data (gray italic text)
- [ ] Column H shows dropdown arrow (IDENTIFICATION)
- [ ] Column I shows dropdown arrow (GENDER)
- [ ] Column L shows dropdown arrow (PRIMARY INDUSTRY HOUSE)
- [ ] Column M shows dropdown arrow (ADDITIONAL FOCUS AREAS)
- [ ] Column S shows dropdown arrow (State/Province)
- [ ] Column Z shows dropdown arrow (MEMBER LEVEL)
- [ ] Options sheet exists (may be hidden)

If all checkboxes are ✅, your template is set up correctly!

---

*Last Updated: January 23, 2026*
