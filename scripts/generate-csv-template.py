#!/usr/bin/env python3
"""
Generate BSN Batch Upload Template CSV with Sample Data and Valid Options
"""

import csv

def create_csv_template():
    """Create CSV template with headers and sample data"""
    
    output_file = '/Users/jerrybony/Documents/GitHub/black-sustainability-inc/data/BSN_Batch_Upload_Template_v2.csv'
    
    # Define headers
    headers = [
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
    ]
    
    # Sample data row with instructions
    sample_instructions = [
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
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Write headers
        writer.writerow(headers)
        
        # Write sample/instruction row
        writer.writerow(sample_instructions)
        
        # Add empty rows for data entry
        for _ in range(5):
            writer.writerow([''] * len(headers))
    
    print(f"✅ Successfully created: {output_file}")
    print("\nCSV template created with:")
    print("  - Header row with all field names")
    print("  - Sample data row with examples")
    print("  - 5 empty rows for data entry")
    print("\n⚠️  Note: CSV files cannot have dropdown validation.")
    print("   For dropdown validation, use the Excel template: BSN_Batch_Upload_Template_v2.xlsx")
    print("\n📖 Refer to BSN_BATCH_UPLOAD_INSTRUCTIONS.md for valid dropdown options")

if __name__ == "__main__":
    create_csv_template()
