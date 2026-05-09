# BSN Batch Upload Template - Project Summary

## ✅ Project Completed Successfully!

I've created a comprehensive batch upload system for the Black Sustainability Network with **dropdown validation** for all the fields you requested.

---

## 📦 What Was Created

### 1. Excel Template with Dropdowns ⭐ **MAIN FILE**

**File**: `data/BSN_Batch_Upload_Template_v2.xlsx` (8.0 KB)

This is the **recommended** template with full dropdown validation:

- ✅ **IDENTIFICATION dropdown** (Column H)
  - 6 options from the BSN form
  - Sorted alphabetically
  
- ✅ **GENDER dropdown** (Column I)
  - 4 options: Female, Male, Non-Binary, Prefer not to say
  
- ✅ **PRIMARY INDUSTRY HOUSE dropdown** (Column L)
  - 12 industry categories with emojis
  - Matches BSN registration form exactly
  
- ✅ **ADDITIONAL FOCUS AREAS dropdown** (Column M)
  - Same 12 options as Primary Industry
  - Supports multiple selections (comma-separated)
  
- ✅ **State/Province dropdown** (Columns S & T)
  - 50 US States
  - Washington D.C. + 3 US Territories
  - 13 Canadian Provinces/Territories
  - **Total: 66 locations**
  
- ✅ **MEMBER LEVEL dropdown** (Column Z)
  - 6 membership levels
  
- ✅ **Yes/No dropdowns** (Columns W, AA, AB, AD)
  - For boolean fields like "Include on Map"

### 2. CSV Alternative Template

**File**: `data/BSN_Batch_Upload_Template_v2.csv` (1.1 KB)

- CSV version with sample data
- Use when Excel is not available
- Requires manual validation against reference guide

### 3. Comprehensive Documentation

**Files Created**:

1. **BSN_BATCH_UPLOAD_INSTRUCTIONS.md** (6.4 KB)
   - Complete step-by-step guide
   - All field descriptions
   - Required vs optional fields
   - Common errors to avoid
   - Tips for success

2. **BSN_VALID_OPTIONS_REFERENCE.md** (5.7 KB)
   - Quick reference for all dropdown options
   - Copy-paste ready lists
   - Field mapping table
   - Data entry tips

3. **data/README.md** (3.8 KB)
   - Quick start guide
   - Files overview
   - Summary of all dropdowns

### 4. Generation Scripts

**Files Created**:

1. **scripts/generate-batch-upload-template.py**
   - Python script to generate Excel template
   - Creates dropdown validation
   - Hides the "Options" sheet
   - Can be rerun to regenerate template

2. **scripts/generate-csv-template.py**
   - Python script to generate CSV template
   - Creates sample data row

---

## 🎯 Dropdown Options Source

All dropdown options were extracted from:

1. **BSN Registration Form** (`pages/bsn-registration/index.tsx`)
   - Identification options (from Airtable)
   - Gender options (from Airtable)
   - Primary Industry House options (from Airtable)
   - Additional Focus Areas (hardcoded in form)

2. **Form Setup Configuration** (`scripts/setup-master-forms.ts`)
   - Verified option values
   - Matched emojis and formatting

3. **Airtable Data** (`utils/AirtableResults.json`)
   - State/Province values from actual member data
   - Validated US states and Canadian provinces

---

## 📊 Dropdown Field Details

### IDENTIFICATION (Column H) ✅
```
• African/Afrikan
• African-American/Black
• Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)
• Black/African-American
• Black/Afro-Diasporic
• Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)
```

### GENDER (Column I) ✅
```
• Female
• Male
• Non-Binary
• Prefer not to say
```

### PRIMARY INDUSTRY HOUSE (Column L) ✅
```
• ☀️ Alternative Energy
• 🌾 Agriculture/Sustainable Food Production / Land Management
• 🏘 Community Development
• 🛖 Eco-friendly Building
• 💰 Alternative Economics
• 🧑🏾‍🏫 Education & Cultural Preservation
• Environmental Justice/Advocacy
• ♻️ Green Lifestyle
• 🆘 Survival/Preparedness
• 🗑 Waste
• 💧Water
• 🧘🏿‍♀️ Wholistic Health
```

### ADDITIONAL FOCUS AREAS (Column M) ✅
Same options as PRIMARY INDUSTRY HOUSE above.
**Note**: Can select multiple (separate with commas)

### STATE/PROVINCE (Columns S & T) ✅

**US States** (50):
Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming

**US Territories** (4):
Washington D.C., Puerto Rico, U.S. Virgin Islands, Guam

**Canadian Provinces/Territories** (13):
Alberta, British Columbia, Manitoba, New Brunswick, Newfoundland and Labrador, Northwest Territories, Nova Scotia, Nunavut, Ontario, Prince Edward Island, Quebec, Saskatchewan, Yukon

**Total**: 66 locations

---

## 🚀 How to Use

### Method 1: Excel (Recommended)

1. Open `data/BSN_Batch_Upload_Template_v2.xlsx`
2. Click on any cell in columns H, I, L, M, S, T, or Z
3. You'll see a dropdown arrow appear
4. Select from the dropdown options
5. Fill in other fields as needed
6. Save and upload

### Method 2: CSV

1. Open `data/BSN_Batch_Upload_Template_v2.csv`
2. Keep `data/BSN_VALID_OPTIONS_REFERENCE.md` open
3. Copy exact values from the reference guide
4. Paste into the CSV
5. Save and upload

---

## 🎨 Excel Features

The Excel template includes:

1. **Header Row Formatting**
   - Blue background (#366092)
   - White text
   - Bold font
   - Center alignment

2. **Column Width Optimization**
   - Auto-sized for readability
   - Wider columns for long text fields
   - Narrower for codes and numbers

3. **Data Validation**
   - Dropdown lists for specified fields
   - Error messages for invalid entries
   - Allows blank entries for optional fields

4. **Hidden Options Sheet**
   - Contains all dropdown values
   - Used by data validation formulas
   - Keeps main sheet clean

5. **Frozen Header Row**
   - Header stays visible while scrolling
   - Easy to reference field names

6. **Instructions Row**
   - Row 2 contains usage instructions
   - Light gray text (non-intrusive)

---

## 📁 File Structure

```
black-sustainability-inc/
├── data/
│   ├── BSN_Batch_Upload_Template_v1 - BSN_Batch_Upload_Template_v1.csv (original)
│   ├── BSN_Batch_Upload_Template_v2.xlsx ⭐ (NEW - with dropdowns)
│   ├── BSN_Batch_Upload_Template_v2.csv (NEW - updated CSV)
│   ├── BSN_BATCH_UPLOAD_INSTRUCTIONS.md (NEW)
│   ├── BSN_VALID_OPTIONS_REFERENCE.md (NEW)
│   └── README.md (NEW)
│
└── scripts/
    ├── generate-batch-upload-template.py (NEW)
    └── generate-csv-template.py (NEW)
```

---

## 🔧 Regenerating Templates

If you need to update the templates in the future:

```bash
# Regenerate Excel template
python3 scripts/generate-batch-upload-template.py

# Regenerate CSV template
python3 scripts/generate-csv-template.py
```

---

## ✨ Key Benefits

1. **Prevents Data Entry Errors**
   - Dropdown validation ensures only valid values
   - Reduces upload failures
   - Saves time correcting mistakes

2. **User-Friendly**
   - Easy to use dropdowns
   - Clear field names
   - Built-in instructions

3. **Complete Documentation**
   - Step-by-step guides
   - Quick reference cards
   - Examples and tips

4. **Maintainable**
   - Python scripts for easy updates
   - All options sourced from BSN form
   - Version controlled

5. **Flexible**
   - Excel for dropdown validation
   - CSV for systems without Excel
   - Both use same field structure

---

## 📞 Support

For questions about the batch upload templates:
- Email: members@blacksustainability.org
- Subject: "Batch Upload Support"

---

## ✅ Next Steps

1. **Open** `data/BSN_Batch_Upload_Template_v2.xlsx`
2. **Review** the dropdown options
3. **Test** with a few sample records
4. **Import** your member data
5. **Upload** to the BSN system

---

*Created: January 23, 2026*  
*All dropdown options match the BSN registration form*  
*Ready for production use*
