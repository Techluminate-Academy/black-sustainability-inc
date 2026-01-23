# BSN Batch Upload Templates

This directory contains templates and documentation for batch uploading members to the Black Sustainability Network (BSN).

## 📁 Files Overview

### Templates

1. **BSN_Batch_Upload_Template_v2.xlsx** ⭐ **RECOMMENDED**
   - Excel file with dropdown validation
   - Prevents data entry errors
   - Hidden "Options" sheet with all valid values
   - Best for batch uploads

2. **BSN_Batch_Upload_Template_v2.csv**
   - CSV version with sample data
   - No dropdown validation (CSV limitation)
   - Use if Excel is not available
   - Refer to documentation for valid options

3. **BSN_Batch_Upload_Template_v1 - BSN_Batch_Upload_Template_v1.csv**
   - Original CSV template (legacy)

### Documentation

4. **BSN_BATCH_UPLOAD_INSTRUCTIONS.md**
   - Complete guide on how to use the templates
   - Field descriptions
   - Step-by-step instructions
   - Common errors to avoid

5. **BSN_VALID_OPTIONS_REFERENCE.md**
   - Quick reference for all dropdown options
   - Field mapping table
   - Data entry tips
   - Copy-paste ready option lists

## 🚀 Quick Start

### For Most Users (Excel Available)

1. Open `BSN_Batch_Upload_Template_v2.xlsx`
2. Fill in member data starting at row 3
3. Use dropdowns for:
   - IDENTIFICATION (Column H)
   - GENDER (Column I)
   - PRIMARY INDUSTRY HOUSE (Column L)
   - ADDITIONAL FOCUS AREAS (Column M)
   - State/Province (Column S)
   - MEMBER LEVEL (Column Z)
4. Save and upload

### For CSV Users

1. Open `BSN_Batch_Upload_Template_v2.csv`
2. Keep `BSN_VALID_OPTIONS_REFERENCE.md` open for valid options
3. Copy exact values from the reference guide
4. Save and upload

## 📋 Fields with Dropdown Validation

| Field | Column | Options Count | Required |
|-------|--------|---------------|----------|
| IDENTIFICATION | H | 6 options | ✅ Yes |
| GENDER | I | 4 options | ✅ Yes |
| PRIMARY INDUSTRY HOUSE | L | 12 options | ✅ Yes |
| ADDITIONAL FOCUS AREAS | M | 12 options | No |
| State/Province | S | 66 options | No |
| State | T | 66 options | No |
| MEMBER LEVEL | Z | 6 options | No |
| Yes/No Fields | W, AA, AB, AD | 6 options | No |

## ✅ Required Fields

The following fields **must** be completed for each member:

- EMAIL ADDRESS (Column A)
- FIRST NAME (Column C)
- LAST NAME (Column D)
- BIO (Column G)
- IDENTIFICATION (Column H)
- GENDER (Column I)
- PRIMARY INDUSTRY HOUSE (Column L)
- Address (Column P)
- Location (Nearest City) (Column Q)

## 📊 Dropdown Options Summary

### IDENTIFICATION (6 options)
African/Afrikan • African-American/Black • Afro-diasporic • Black/African-American • Black/Afro-Diasporic • Of African Descent

### GENDER (4 options)
Female • Male • Non-Binary • Prefer not to say

### PRIMARY INDUSTRY HOUSE (12 options)
Alternative Energy • Agriculture • Community Development • Eco-friendly Building • Alternative Economics • Education & Cultural Preservation • Environmental Justice/Advocacy • Green Lifestyle • Survival/Preparedness • Waste • Water • Wholistic Health

### State/Province (66 options)
50 US States + DC + 3 US Territories + 13 Canadian Provinces/Territories

### MEMBER LEVEL (6 options)
Member • Core Member • Impact Member • Legacy Member • Featured Member • Free Member

## 🛠️ Generate Templates

To regenerate the templates, run:

```bash
# Generate Excel template with dropdowns
python3 scripts/generate-batch-upload-template.py

# Generate CSV template
python3 scripts/generate-csv-template.py
```

## 📞 Support

For questions or issues:
- Email: members@blacksustainability.org
- Subject: "Batch Upload Support"

## 🔄 Version History

- **v2.0** (2026-01-23) - Added Excel template with dropdown validation
- **v1.0** - Original CSV template

---

*For detailed instructions, see `BSN_BATCH_UPLOAD_INSTRUCTIONS.md`*  
*For valid options reference, see `BSN_VALID_OPTIONS_REFERENCE.md`*
