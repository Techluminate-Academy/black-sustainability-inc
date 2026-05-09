# BSN Batch Upload - Valid Options Reference

## Quick Reference Guide for Dropdown Fields

This document lists all valid options for dropdown fields in the BSN Batch Upload Template.

---

## IDENTIFICATION (Column H)

Valid options:
- `African/Afrikan`
- `African-American/Black`
- `Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)`
- `Black/African-American`
- `Black/Afro-Diasporic`
- `Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)`

---

## GENDER (Column I)

Valid options:
- `Female`
- `Male`
- `Non-Binary`
- `Prefer not to say`

---

## PRIMARY INDUSTRY HOUSE (Column L)

Valid options:
- `☀️ Alternative Energy`
- `🌾 Agriculture/Sustainable Food Production / Land Management`
- `🏘 Community Development`
- `🛖 Eco-friendly Building`
- `💰 Alternative Economics`
- `🧑🏾‍🏫 Education & Cultural Preservation`
- `Environmental Justice/Advocacy`
- `♻️ Green Lifestyle`
- `🆘 Survival/Preparedness`
- `🗑 Waste`
- `💧Water`
- `🧘🏿‍♀️ Wholistic Health`

---

## ADDITIONAL FOCUS AREAS (Column M)

Same options as PRIMARY INDUSTRY HOUSE (see above).

**Note**: For multiple selections, separate values with commas.

Example:
```
☀️ Alternative Energy, 🌾 Agriculture/Sustainable Food Production / Land Management, 💧Water
```

---

## STATE/PROVINCE (Columns S & T)

### United States
- `Alabama`
- `Alaska`
- `Arizona`
- `Arkansas`
- `California`
- `Colorado`
- `Connecticut`
- `Delaware`
- `Florida`
- `Georgia`
- `Hawaii`
- `Idaho`
- `Illinois`
- `Indiana`
- `Iowa`
- `Kansas`
- `Kentucky`
- `Louisiana`
- `Maine`
- `Maryland`
- `Massachusetts`
- `Michigan`
- `Minnesota`
- `Mississippi`
- `Missouri`
- `Montana`
- `Nebraska`
- `Nevada`
- `New Hampshire`
- `New Jersey`
- `New Mexico`
- `New York`
- `North Carolina`
- `North Dakota`
- `Ohio`
- `Oklahoma`
- `Oregon`
- `Pennsylvania`
- `Rhode Island`
- `South Carolina`
- `South Dakota`
- `Tennessee`
- `Texas`
- `Utah`
- `Vermont`
- `Virginia`
- `Washington`
- `West Virginia`
- `Wisconsin`
- `Wyoming`

### US Territories
- `Washington D.C.`
- `Puerto Rico`
- `U.S. Virgin Islands`
- `Guam`

### Canada
- `Alberta`
- `British Columbia`
- `Manitoba`
- `New Brunswick`
- `Newfoundland and Labrador`
- `Northwest Territories`
- `Nova Scotia`
- `Nunavut`
- `Ontario`
- `Prince Edward Island`
- `Quebec`
- `Saskatchewan`
- `Yukon`

---

## MEMBER LEVEL (Column Z)

Valid options:
- `Member`
- `Core Member`
- `Impact Member`
- `Legacy Member`
- `Featured Member`
- `Free Member`

---

## YES/NO FIELDS (Columns W, AA, AB, AD)

Valid options:
- `Yes`
- `No`
- `TRUE`
- `FALSE`
- `true`
- `false`

**Note**: Any of these values will work. The system accepts both text (Yes/No) and boolean (TRUE/FALSE) formats.

---

## Field Mapping Reference

| Column | Field Name | Type | Required |
|--------|-----------|------|----------|
| A | EMAIL ADDRESS | Text | ✅ Yes |
| B | Email 2 | Text | No |
| C | FIRST NAME | Text | ✅ Yes |
| D | LAST NAME | Text | ✅ Yes |
| E | ORGANIZATION NAME | Text | No |
| F | WEBSITE | URL | No |
| G | BIO | Text | ✅ Yes |
| H | IDENTIFICATION | Dropdown | ✅ Yes |
| I | GENDER | Dropdown | ✅ Yes |
| J | PHONE US/CAN ONLY | Phone | No |
| K | PHONE NON-US/CAN | Phone | No |
| L | PRIMARY INDUSTRY HOUSE | Dropdown | ✅ Yes |
| M | ADDITIONAL FOCUS AREAS | Multi-Select | No |
| N | NAICS Code | Text | No |
| O | AFFILIATED ENTITY | Text | No |
| P | Address | Text | ✅ Yes |
| Q | Location (Nearest City) | Text | ✅ Yes |
| R | Country | Text | No |
| S | State/Province | Dropdown | No |
| T | State | Dropdown | No |
| U | Zip/Postal Code | Text | No |
| V | Time zone | Text | No |
| W | Include me on Global BSN Map | Yes/No | No |
| X | LATITUDE (NEW) | Number | No |
| Y | LONGITUDE (NEW) | Number | No |
| Z | MEMBER LEVEL | Dropdown | No |
| AA | Paying Member (keep current) | Yes/No | No |
| AB | Equity Member (keep current) | Yes/No | No |
| AC | Membership Status Notes | Text | No |
| AD | Send Need Payment Email | Yes/No | No |

---

## Tips for Data Entry

### Email Addresses
- Must be valid email format: `name@domain.com`
- Each member must have a unique primary email address

### Phone Numbers
- **US/Canada format**: `(XXX) XXX-XXXX`
  - Example: `(312) 555-1234`
- **International format**: Include country code
  - Example: `+44 20 1234 5678`

### Multiple Values
- For ADDITIONAL FOCUS AREAS, separate multiple selections with commas
- Example: `☀️ Alternative Energy, 💧Water, ♻️ Green Lifestyle`

### Coordinates
- Latitude range: `-90` to `90`
- Longitude range: `-180` to `180`
- Example: Chicago, IL = `41.8781, -87.6298`

### URLs
- Must include protocol: `https://` or `http://`
- Example: `https://www.blacksustainability.org`

---

## Quick Copy Reference (Plain Text)

### For IDENTIFICATION
```
African/Afrikan
African-American/Black
Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)
Black/African-American
Black/Afro-Diasporic
Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)
```

### For GENDER
```
Female
Male
Non-Binary
Prefer not to say
```

### For PRIMARY INDUSTRY HOUSE & ADDITIONAL FOCUS AREAS
```
☀️ Alternative Energy
🌾 Agriculture/Sustainable Food Production / Land Management
🏘 Community Development
🛖 Eco-friendly Building
💰 Alternative Economics
🧑🏾‍🏫 Education & Cultural Preservation
Environmental Justice/Advocacy
♻️ Green Lifestyle
🆘 Survival/Preparedness
🗑 Waste
💧Water
🧘🏿‍♀️ Wholistic Health
```

### For MEMBER LEVEL
```
Member
Core Member
Impact Member
Legacy Member
Featured Member
Free Member
```

---

*Last Updated: January 23, 2026*
*For support: members@blacksustainability.org*
