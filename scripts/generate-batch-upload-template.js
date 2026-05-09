/**
 * BSN Batch Upload Template Generator (Node.js)
 * 
 * This script generates an Excel file (.xlsx) with dropdown validation
 * for the BSN Batch Upload Template.
 * 
 * Usage:
 *   node scripts/generate-batch-upload-template.js
 * 
 * Requirements:
 *   npm install exceljs
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function createBSNBatchUploadTemplate() {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  
  // Create main data sheet
  const worksheet = workbook.addWorksheet('Batch Upload Template');
  
  // Define column headers
  const headers = [
    "EMAIL ADDRESS",
    "Email 2", 
    "FIRST NAME",
    "LAST NAME",
    "ORGANIZATION NAME",
    "WEBSITE",
    "BIO",
    "IDENTIFICATION",
    "GENDER",
    "PHONE US/CAN ONLY",
    "PHONE NON-US/CAN",
    "PRIMARY INDUSTRY HOUSE",
    "ADDITIONAL FOCUS AREAS",
    "NAICS Code",
    "AFFILIATED ENTITY",
    "Address",
    "Location (Nearest City)",
    "Country",
    "State/Province",
    "State",
    "Zip/Postal Code",
    "Time zone",
    "Include me on Global BSN Map",
    "LATITUDE (NEW)",
    "LONGITUDE (NEW)",
    "MEMBER LEVEL",
    "Paying Member (keep current)",
    "Equity Member (keep current)",
    "Membership Status Notes",
    "Send Need Payment Email"
  ];
  
  // Add headers to row 1
  worksheet.addRow(headers);
  
  // Format header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF366092' }
  };
  headerRow.alignment = { 
    horizontal: 'center', 
    vertical: 'middle', 
    wrapText: true 
  };
  headerRow.height = 30;
  
  // Set column widths
  const columnWidths = [
    30, 25, 15, 15, 30, 30, 50, 30, 15, 20, 20, 40, 40, 15, 30, 
    40, 30, 20, 20, 15, 15, 15, 30, 15, 15, 25, 25, 25, 30, 25
  ];
  
  headers.forEach((header, index) => {
    worksheet.getColumn(index + 1).width = columnWidths[index];
  });
  
  // Add instruction row
  worksheet.addRow([]);
  const instructionRow = worksheet.getRow(2);
  instructionRow.getCell(1).value = 'INSTRUCTIONS: Fill in member information below. Use dropdowns where provided. For multiple ADDITIONAL FOCUS AREAS, separate with commas.';
  worksheet.mergeCells(2, 1, 2, headers.length);
  instructionRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
  instructionRow.height = 40;
  
  // Freeze header rows
  worksheet.views = [
    { state: 'frozen', ySplit: 2 }
  ];
  
  // Define dropdown options
  const identificationOptions = [
    "African/Afrikan",
    "African-American/Black",
    "Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)",
    "Black/African-American",
    "Black/Afro-Diasporic",
    "Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)"
  ];
  
  const genderOptions = [
    "Female",
    "Male", 
    "Non-Binary",
    "Prefer not to say"
  ];
  
  const primaryIndustryOptions = [
    "☀️ Alternative Energy",
    "🌾 Agriculture/Sustainable Food Production / Land Management",
    "🏘 Community Development",
    "🛖 Eco-friendly Building",
    "💰 Alternative Economics",
    "🧑🏾‍🏫 Education & Cultural Preservation",
    "Environmental Justice/Advocacy",
    "♻️ Green Lifestyle",
    "🆘 Survival/Preparedness",
    "🗑 Waste",
    "💧Water",
    "🧘🏿‍♀️ Wholistic Health"
  ];
  
  const usStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming", "Washington D.C.",
    "Puerto Rico", "U.S. Virgin Islands", "Guam"
  ];
  
  const canadianProvinces = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
    "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
    "Yukon"
  ];
  
  const stateProvinceOptions = [...usStates, ...canadianProvinces].sort();
  
  const memberLevelOptions = [
    "Member",
    "Core Member",
    "Impact Member",
    "Legacy Member",
    "Featured Member",
    "Free Member"
  ];
  
  const yesNoOptions = ["Yes", "No", "TRUE", "FALSE", "true", "false"];
  
  // Create options sheet
  const optionsSheet = workbook.addWorksheet('Options');
  optionsSheet.state = 'hidden';
  
  // Write options to options sheet
  optionsSheet.getCell('A1').value = 'IDENTIFICATION';
  optionsSheet.getCell('A1').font = { bold: true };
  identificationOptions.forEach((opt, index) => {
    optionsSheet.getCell(`A${index + 2}`).value = opt;
  });
  
  optionsSheet.getCell('B1').value = 'GENDER';
  optionsSheet.getCell('B1').font = { bold: true };
  genderOptions.forEach((opt, index) => {
    optionsSheet.getCell(`B${index + 2}`).value = opt;
  });
  
  optionsSheet.getCell('C1').value = 'PRIMARY INDUSTRY HOUSE';
  optionsSheet.getCell('C1').font = { bold: true };
  primaryIndustryOptions.forEach((opt, index) => {
    optionsSheet.getCell(`C${index + 2}`).value = opt;
  });
  
  optionsSheet.getCell('D1').value = 'STATE/PROVINCE';
  optionsSheet.getCell('D1').font = { bold: true };
  stateProvinceOptions.forEach((opt, index) => {
    optionsSheet.getCell(`D${index + 2}`).value = opt;
  });
  
  optionsSheet.getCell('E1').value = 'MEMBER LEVEL';
  optionsSheet.getCell('E1').font = { bold: true };
  memberLevelOptions.forEach((opt, index) => {
    optionsSheet.getCell(`E${index + 2}`).value = opt;
  });
  
  optionsSheet.getCell('F1').value = 'YES/NO';
  optionsSheet.getCell('F1').font = { bold: true };
  yesNoOptions.forEach((opt, index) => {
    optionsSheet.getCell(`F${index + 2}`).value = opt;
  });
  
  // Add data validation (dropdowns)
  // Column H (8): IDENTIFICATION
  worksheet.getColumn(8).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) { // Skip header and instruction rows
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$A$2:$A${identificationOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Identification',
        error: 'Please select a valid identification option'
      };
    }
  });
  
  // Column I (9): GENDER
  worksheet.getColumn(9).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$B$2:$B${genderOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Gender',
        error: 'Please select a valid gender option'
      };
    }
  });
  
  // Column L (12): PRIMARY INDUSTRY HOUSE
  worksheet.getColumn(12).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$C$2:$C${primaryIndustryOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Industry',
        error: 'Please select a valid industry option'
      };
    }
  });
  
  // Column M (13): ADDITIONAL FOCUS AREAS
  worksheet.getColumn(13).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$C$2:$C${primaryIndustryOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Focus Areas',
        error: 'Please select valid focus areas (separate multiple with commas)'
      };
    }
  });
  
  // Column S (19): State/Province
  worksheet.getColumn(19).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$D$2:$D${stateProvinceOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid State/Province',
        error: 'Please select a valid state or province'
      };
    }
  });
  
  // Column T (20): State
  worksheet.getColumn(20).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$D$2:$D${stateProvinceOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid State',
        error: 'Please select a valid state or province'
      };
    }
  });
  
  // Column Z (26): MEMBER LEVEL
  worksheet.getColumn(26).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$E$2:$E${memberLevelOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Member Level',
        error: 'Please select a valid member level'
      };
    }
  });
  
  // Column W (23): Include me on Global BSN Map
  worksheet.getColumn(23).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$F$2:$F${yesNoOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Value',
        error: 'Please select Yes or No'
      };
    }
  });
  
  // Column AA (27): Paying Member
  worksheet.getColumn(27).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$F$2:$F${yesNoOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Value',
        error: 'Please select Yes or No'
      };
    }
  });
  
  // Column AB (28): Equity Member
  worksheet.getColumn(28).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$F$2:$F${yesNoOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Value',
        error: 'Please select Yes or No'
      };
    }
  });
  
  // Column AD (30): Send Need Payment Email
  worksheet.getColumn(30).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 2) {
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Options!$F$2:$F${yesNoOptions.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Value',
        error: 'Please select Yes or No'
      };
    }
  });
  
  // Add sample data row
  const sampleData = [
    "example@email.com",
    "backup@email.com",
    "John",
    "Doe",
    "Example Organization",
    "https://example.com",
    "Bio description goes here - describe yourself and/or your organization",
    "Black/African-American",
    "Female",
    "(555) 123-4567",
    "+44 20 1234 5678",
    "☀️ Alternative Energy",
    "🌾 Agriculture/Sustainable Food Production / Land Management, 💧Water",
    "237990",
    "Partner Organization Name",
    "123 Main Street, City, Country",
    "Chicago",
    "United States",
    "Illinois",
    "Illinois",
    "60601",
    "CST",
    "Yes",
    "41.8781",
    "-87.6298",
    "Core Member",
    "Yes",
    "No",
    "Active member",
    "No"
  ];
  
  const sampleRow = worksheet.addRow(sampleData);
  sampleRow.font = { italic: true, color: { argb: 'FF999999' } };
  
  // Save the workbook
  const outputPath = path.join(__dirname, '../data/BSN_Batch_Upload_Template_v2_NodeJS.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  
  console.log('✅ Successfully created:', outputPath);
  console.log('\nDropdown fields configured:');
  console.log('  - Column H: IDENTIFICATION');
  console.log('  - Column I: GENDER');
  console.log('  - Column L: PRIMARY INDUSTRY HOUSE');
  console.log('  - Column M: ADDITIONAL FOCUS AREAS');
  console.log('  - Column S: State/Province');
  console.log('  - Column T: State');
  console.log('  - Column Z: MEMBER LEVEL');
  console.log('  - Columns W, AA, AB, AD: Yes/No fields');
  console.log('\nNote: The "Options" sheet contains all dropdown values and is hidden.');
}

// Run the function
createBSNBatchUploadTemplate()
  .then(() => {
    console.log('\n✨ Template generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error generating template:', error);
    process.exit(1);
  });
