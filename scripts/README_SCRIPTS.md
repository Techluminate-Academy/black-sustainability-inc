# BSN Batch Upload Template - Scripts

This directory contains scripts to generate the BSN Batch Upload Template with dropdown validation.

## 📁 Available Scripts

### 1. Google Sheets Script (Recommended for Google Sheets Users)

**File**: `BSN_Batch_Upload_Google_Sheets.js`

**Use this if**: You want to create the template directly in Google Sheets

**How to use**:
1. Open Google Sheets
2. Go to **Extensions** → **Apps Script**
3. Paste the entire script
4. Click **Run** ▶️
5. Authorize permissions
6. Done! Your sheet now has dropdowns

**See**: `GOOGLE_SHEETS_SETUP_INSTRUCTIONS.md` for detailed instructions

---

### 2. Python Script (Recommended for Excel Users)

**File**: `generate-batch-upload-template.py`

**Use this if**: You want to generate an Excel (.xlsx) file

**Requirements**:
```bash
pip install openpyxl
```

**How to use**:
```bash
python3 scripts/generate-batch-upload-template.py
```

**Output**: `data/BSN_Batch_Upload_Template_v2.xlsx`

---

### 3. Node.js Script (For JavaScript/Node.js Users)

**File**: `generate-batch-upload-template.js`

**Use this if**: You're working in a Node.js environment

**Requirements**:
```bash
npm install exceljs
```

**How to use**:
```bash
node scripts/generate-batch-upload-template.js
```

**Output**: `data/BSN_Batch_Upload_Template_v2_NodeJS.xlsx`

---

### 4. CSV Generator Script

**File**: `generate-csv-template.py`

**Use this if**: You need a CSV version (no dropdowns - CSV limitation)

**Requirements**:
```bash
# No additional requirements - uses Python standard library
```

**How to use**:
```bash
python3 scripts/generate-csv-template.py
```

**Output**: `data/BSN_Batch_Upload_Template_v2.csv`

---

## 🎯 Which Script Should I Use?

### For Google Sheets Users
→ Use **`BSN_Batch_Upload_Google_Sheets.js`**
- Creates template directly in Google Sheets
- No file download needed
- Works immediately
- Best for collaboration

### For Excel Users (Windows/Mac)
→ Use **`generate-batch-upload-template.py`**
- Generates .xlsx file
- Works with Microsoft Excel
- Works with LibreOffice Calc
- Can be shared via email

### For Developers/Node.js Projects
→ Use **`generate-batch-upload-template.js`**
- Integrates with Node.js projects
- Can be automated
- Can be added to build scripts
- Good for CI/CD pipelines

### For CSV Users
→ Use **`generate-csv-template.py`**
- Simple CSV format
- Works everywhere
- No special software needed
- Note: No dropdown validation (CSV limitation)

---

## 📊 All Scripts Create the Same Template

All scripts generate a template with:

✅ **30 columns** matching the BSN form structure  
✅ **Dropdown validation** for:
- IDENTIFICATION (6 options)
- GENDER (4 options)
- PRIMARY INDUSTRY HOUSE (12 options)
- ADDITIONAL FOCUS AREAS (12 options)
- State/Province (66 options)
- MEMBER LEVEL (6 options)
- Yes/No fields (6 options)

✅ **Formatted headers** (blue background, white text)  
✅ **Instructions row**  
✅ **Sample data row**  
✅ **Hidden options sheet** (Excel only)

---

## 🚀 Quick Start

### Google Sheets (Easiest)
1. Copy `BSN_Batch_Upload_Google_Sheets.js`
2. Paste into Google Sheets Apps Script
3. Run
4. Done!

### Python (Most Compatible)
```bash
pip install openpyxl
python3 scripts/generate-batch-upload-template.py
```

### Node.js (For Developers)
```bash
npm install exceljs
node scripts/generate-batch-upload-template.js
```

---

## 📝 Script Comparison

| Feature | Google Sheets | Python | Node.js | CSV |
|---------|--------------|--------|---------|-----|
| Dropdowns | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Excel Format | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| Google Sheets | ✅ Native | ❌ No | ❌ No | ✅ Yes |
| Easy Setup | ✅ Very Easy | ✅ Easy | ✅ Easy | ✅ Very Easy |
| Collaboration | ✅ Real-time | ❌ No | ❌ No | ✅ Yes |
| File Size | N/A | ~8 KB | ~8 KB | ~1 KB |

---

## 🔧 Requirements Summary

### Python Script
- Python 3.6+
- `openpyxl` package

### Node.js Script
- Node.js 12+
- `exceljs` package

### Google Sheets Script
- Google account
- Google Sheets access
- No installation needed

### CSV Script
- Python 3.6+
- No additional packages

---

## 💡 Tips

1. **For Google Sheets**: The script adds a custom menu for easy re-running
2. **For Excel**: Open the generated .xlsx file in Excel to use dropdowns
3. **For CSV**: Keep `BSN_VALID_OPTIONS_REFERENCE.md` open for valid values
4. **All scripts**: Can be run multiple times to regenerate templates

---

## 🐛 Troubleshooting

### Python Script Issues
- **Error**: `ModuleNotFoundError: No module named 'openpyxl'`
  - **Fix**: Run `pip install openpyxl`

### Node.js Script Issues
- **Error**: `Cannot find module 'exceljs'`
  - **Fix**: Run `npm install exceljs`

### Google Sheets Script Issues
- **Error**: Script won't run
  - **Fix**: Make sure you authorized permissions
  - **Fix**: Check that function name is `createBSNBatchUploadTemplate`

### CSV Script Issues
- **Error**: File not found
  - **Fix**: Make sure you're in the project root directory

---

## 📞 Support

For questions about the scripts:
- Check the individual script comments
- Review the instruction files
- Email: members@blacksustainability.org

---

*All scripts generate templates with identical structure and dropdown options.*
