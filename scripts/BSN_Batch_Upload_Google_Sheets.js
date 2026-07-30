/**
 * BSN Batch Upload Template Generator for Google Sheets
 * 
 * Instructions:
 * 1. Open Google Sheets
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script
 * 4. Click Run (▶️) button
 * 5. Authorize permissions if prompted
 * 6. The script will set up your sheet with dropdowns
 * 
 * Or use this in a new sheet:
 * - Create a new Google Sheet
 * - Run this script
 * - It will populate the current sheet
 */

function createBSNBatchUploadTemplate() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Clear existing content completely
    sheet.clear();
    sheet.clearFormats();
    
    // Define column headers - MUST match original CSV exactly
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
    
    // Verify we have exactly 30 headers
    if (headers.length !== 30) {
      SpreadsheetApp.getUi().alert('Error: Expected 30 headers, found ' + headers.length);
      return;
    }
    
    // Write headers to row 1 - ensure all columns are written
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    
    // Format header row (reuse the same headerRange variable)
    headerRange.setBackground("#366092");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);
    
    // Set column widths - ensure we have 30 widths
    const columnWidths = [
      30, 25, 15, 15, 30, 30, 50, 30, 15, 20, 20, 40, 40, 15, 30, 40, 30, 20, 20, 15, 15, 15, 30, 15, 15, 25, 25, 25, 30, 25
    ];
    
    if (columnWidths.length !== 30) {
      SpreadsheetApp.getUi().alert('Error: Expected 30 column widths, found ' + columnWidths.length);
      return;
    }
    
    for (let i = 0; i < columnWidths.length && i < headers.length; i++) {
      sheet.setColumnWidth(i + 1, columnWidths[i]);
    }
    
    // Add instruction in row 2
    sheet.getRange(2, 1, 1, headers.length).merge();
    sheet.getRange(2, 1).setValue("INSTRUCTIONS: Fill in member information below. Use dropdowns where provided. For multiple ADDITIONAL FOCUS AREAS, separate with commas.");
    sheet.getRange(2, 1).setFontStyle("italic");
    sheet.getRange(2, 1).setFontColor("#666666");
    sheet.setRowHeight(2, 40);
    
    // Freeze header row
    sheet.setFrozenRows(2);
    
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
    "🌾 Reparative Agriculture",
    "💰 Alternative Economics",
    "🏘 Community Development",
    "🛖 Eco-friendly Building",
    "🧑🏾‍🏫 Education & Cultural Preservation",
    "Climate/Environmental Justice",
    "♻️ Green Lifestyle",
    "🆘 Survival/Preparedness",
    "💻 Technology",
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
    
    // Create a hidden sheet for dropdown options (for reference)
    let optionsSheet = sheet.getParent().getSheetByName("Options");
    if (!optionsSheet) {
      optionsSheet = sheet.getParent().insertSheet("Options");
    } else {
      optionsSheet.clear();
    }
    
    // Write options to hidden sheet
    optionsSheet.getRange(1, 1).setValue("IDENTIFICATION");
    optionsSheet.getRange(1, 1).setFontWeight("bold");
    optionsSheet.getRange(2, 1, identificationOptions.length, 1).setValues(identificationOptions.map(opt => [opt]));
    
    optionsSheet.getRange(1, 2).setValue("GENDER");
    optionsSheet.getRange(1, 2).setFontWeight("bold");
    optionsSheet.getRange(2, 2, genderOptions.length, 1).setValues(genderOptions.map(opt => [opt]));
    
    optionsSheet.getRange(1, 3).setValue("PRIMARY INDUSTRY HOUSE");
    optionsSheet.getRange(1, 3).setFontWeight("bold");
    optionsSheet.getRange(2, 3, primaryIndustryOptions.length, 1).setValues(primaryIndustryOptions.map(opt => [opt]));
    
    optionsSheet.getRange(1, 4).setValue("STATE/PROVINCE");
    optionsSheet.getRange(1, 4).setFontWeight("bold");
    optionsSheet.getRange(2, 4, stateProvinceOptions.length, 1).setValues(stateProvinceOptions.map(opt => [opt]));
    
    optionsSheet.getRange(1, 5).setValue("MEMBER LEVEL");
    optionsSheet.getRange(1, 5).setFontWeight("bold");
    optionsSheet.getRange(2, 5, memberLevelOptions.length, 1).setValues(memberLevelOptions.map(opt => [opt]));
    
    optionsSheet.getRange(1, 6).setValue("YES/NO");
    optionsSheet.getRange(1, 6).setFontWeight("bold");
    optionsSheet.getRange(2, 6, yesNoOptions.length, 1).setValues(yesNoOptions.map(opt => [opt]));
    
    // Hide the options sheet
    try {
      optionsSheet.hideSheet();
    } catch (e) {
      console.log('Could not hide options sheet:', e);
    }
    
    // Helper function to apply data validation with error handling
    function applyDataValidation(column, rowStart, numRows, options, helpText, errorTitle) {
    try {
      const range = sheet.getRange(rowStart, column, numRows, 1);
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(options, true)
        .setAllowInvalid(false)
        .setHelpText(helpText)
        .build();
      range.setDataValidation(rule);
      Utilities.sleep(100); // Small delay to avoid rate limiting
      return true;
    } catch (e) {
      console.log(`Error applying validation to column ${column}:`, e);
      return false;
    }
    }
    
    // Apply data validation (dropdowns) to columns
    // Using 500 rows instead of 1000 to avoid "could not save" errors
    const numRows = 500;
    let validationErrors = [];
    
    // Column H (8): IDENTIFICATION
    if (!applyDataValidation(8, 3, numRows, identificationOptions, 
        "Select a valid identification option", "Invalid Identification")) {
      validationErrors.push("IDENTIFICATION (Column H)");
    }
    
    // Column I (9): GENDER
    if (!applyDataValidation(9, 3, numRows, genderOptions, 
        "Select a valid gender option", "Invalid Gender")) {
      validationErrors.push("GENDER (Column I)");
    }
    
    // Column L (12): PRIMARY INDUSTRY HOUSE
    if (!applyDataValidation(12, 3, numRows, primaryIndustryOptions, 
        "Select a valid primary industry house", "Invalid Industry")) {
      validationErrors.push("PRIMARY INDUSTRY HOUSE (Column L)");
    }
    
    // Column M (13): ADDITIONAL FOCUS AREAS
    // Note: Google Sheets doesn't support multi-select in data validation
    // Users will need to type multiple values separated by commas
    if (!applyDataValidation(13, 3, numRows, primaryIndustryOptions, 
        "Select one or type multiple values separated by commas", "Invalid Focus Areas")) {
      validationErrors.push("ADDITIONAL FOCUS AREAS (Column M)");
    }
    
    // Column S (19): State/Province
    if (!applyDataValidation(19, 3, numRows, stateProvinceOptions, 
        "Select a valid state or province", "Invalid State/Province")) {
      validationErrors.push("State/Province (Column S)");
    }
    
    // Column T (20): State (same as State/Province)
    if (!applyDataValidation(20, 3, numRows, stateProvinceOptions, 
        "Select a valid state or province", "Invalid State")) {
      validationErrors.push("State (Column T)");
    }
    
    // Column Z (26): MEMBER LEVEL
    if (!applyDataValidation(26, 3, numRows, memberLevelOptions, 
        "Select a valid member level", "Invalid Member Level")) {
      validationErrors.push("MEMBER LEVEL (Column Z)");
    }
    
    // Column W (23): Include me on Global BSN Map
    if (!applyDataValidation(23, 3, numRows, yesNoOptions, 
        "Select Yes or No", "Invalid Value")) {
      validationErrors.push("Include me on Global BSN Map (Column W)");
    }
    
    // Column AA (27): Paying Member
    if (!applyDataValidation(27, 3, numRows, yesNoOptions, 
        "Select Yes or No", "Invalid Value")) {
      validationErrors.push("Paying Member (Column AA)");
    }
    
    // Column AB (28): Equity Member
    if (!applyDataValidation(28, 3, numRows, yesNoOptions, 
        "Select Yes or No", "Invalid Value")) {
      validationErrors.push("Equity Member (Column AB)");
    }
    
    // Column AD (30): Send Need Payment Email
    if (!applyDataValidation(30, 3, numRows, yesNoOptions, 
        "Select Yes or No", "Invalid Value")) {
      validationErrors.push("Send Need Payment Email (Column AD)");
    }
    
    // Add sample data row (row 3)
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
      "🌾 Reparative Agriculture, 💧Water",
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
    
    sheet.getRange(3, 1, 1, sampleData.length).setValues([sampleData]);
    sheet.getRange(3, 1, 1, sampleData.length).setFontColor("#999999");
    sheet.getRange(3, 1, 1, sampleData.length).setFontStyle("italic");
    
    // Set row height for data rows
    sheet.setRowHeight(3, 30);
    
    // Add a note about the sample row
    sheet.getRange(3, 1).setNote("This is a sample row. Delete it before entering real data.");
    
    // Verify the setup was successful
    const verificationHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    let verificationPassed = true;
    let verificationErrors = [];
    
    for (let i = 0; i < headers.length; i++) {
      if (verificationHeader[i] !== headers[i]) {
        verificationPassed = false;
        verificationErrors.push(`Column ${String.fromCharCode(65 + i)}: Expected "${headers[i]}", got "${verificationHeader[i]}"`);
      }
    }
    
    // Success message with verification
    let message = "The template has been set up with:\n\n" +
      "• Headers in row 1 (formatted)\n" +
      "• Instructions in row 2\n" +
      "• Sample data in row 3 (delete before use)\n" +
      "• Dropdown validation for:\n" +
      "  - IDENTIFICATION (Column H)\n" +
      "  - GENDER (Column I)\n" +
      "  - PRIMARY INDUSTRY HOUSE (Column L)\n" +
      "  - ADDITIONAL FOCUS AREAS (Column M)\n" +
      "  - State/Province (Columns S & T)\n" +
      "  - MEMBER LEVEL (Column Z)\n" +
      "  - Yes/No fields (Columns W, AA, AB, AD)\n\n" +
      "A hidden 'Options' sheet contains all dropdown values for reference.\n\n" +
      "Note: Dropdowns are applied to rows 3-502 (500 rows).";
    
    if (!verificationPassed) {
      message += "\n\n⚠️ WARNING: Header verification failed:\n" + verificationErrors.join("\n");
    } else {
      message += "\n\n✅ Verification: All 30 headers created correctly!";
    }
    
    if (validationErrors.length > 0) {
      message += "\n\n⚠️ WARNING: Some dropdown validations failed:\n" + validationErrors.join("\n") +
        "\n\nYou may need to manually add data validation to these columns.";
    } else {
      message += "\n\n✅ All dropdown validations applied successfully!";
    }
    
    SpreadsheetApp.getUi().alert(
      "✅ BSN Batch Upload Template Created Successfully!",
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  
  } catch (error) {
    // Handle any errors that occur
    const errorMessage = "An error occurred while creating the template:\n\n" +
      error.toString() + "\n\n" +
      "Common fixes:\n" +
      "1. Make sure you have edit permissions on the sheet\n" +
      "2. Try running the script again\n" +
      "3. If the error persists, try creating a new sheet and running the script there";
    
    SpreadsheetApp.getUi().alert(
      "❌ Error Creating Template",
      errorMessage,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    // Log the error for debugging
    console.error("Error in createBSNBatchUploadTemplate:", error);
    throw error; // Re-throw so it appears in execution log
  }
}

/**
 * Quick setup function - just run this
 */
function onOpen() {
  // Optional: Add a custom menu when sheet opens
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('BSN Tools')
    .addItem('Setup Batch Upload Template', 'createBSNBatchUploadTemplate')
    .addToUi();
}
