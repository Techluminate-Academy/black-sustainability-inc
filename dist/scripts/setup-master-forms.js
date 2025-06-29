"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("../lib/mongodb");
async function setupMasterForms() {
    const { db } = await (0, mongodb_1.connectToDatabase)();
    const formVersions = db.collection('formVersions');
    // Free Signup Form Configuration
    const freeSignupForm = {
        version: 1000, // Using 1000 as base version for master configs
        fields: [
            {
                id: 'firstName',
                name: 'firstName',
                label: 'First Name',
                type: 'text',
                required: true,
                step: 1,
                placeholder: 'Enter your first name'
            },
            {
                id: 'lastName',
                name: 'lastName',
                label: 'Last Name',
                type: 'text',
                required: true,
                step: 1,
                placeholder: 'Enter your last name'
            },
            {
                id: 'email',
                name: 'email',
                label: 'Email Address',
                type: 'email',
                required: true,
                step: 1,
                placeholder: 'Enter your email address'
            },
            {
                id: 'address',
                name: 'address',
                label: 'Address',
                type: 'address',
                required: true,
                step: 1,
                placeholder: 'Enter your address'
            },
            {
                id: 'primaryIndustry',
                name: 'primaryIndustry',
                label: 'Primary Industry',
                type: 'dropdown',
                required: true,
                step: 2,
                options: [
                    { label: 'Agriculture', value: 'agriculture' },
                    { label: 'Alternative Energy', value: 'alternative_energy' },
                    { label: 'Community Development', value: 'community_development' },
                    { label: 'Education', value: 'education' },
                    { label: 'Green Building', value: 'green_building' },
                    { label: 'Waste Management', value: 'waste_management' },
                    { label: 'Water', value: 'water' },
                    { label: 'Wholistic', value: 'wholistic' }
                ]
            },
            {
                id: 'organizationName',
                name: 'organizationName',
                label: 'Organization Name',
                type: 'text',
                required: false,
                step: 2,
                placeholder: 'Enter your organization name'
            },
            {
                id: 'bio',
                name: 'bio',
                label: 'Bio',
                type: 'textarea',
                required: false,
                step: 2,
                placeholder: 'Tell us about yourself or your organization'
            },
            {
                id: 'photo',
                name: 'photo',
                label: 'Profile Photo',
                type: 'file',
                required: false,
                step: 3
            },
            {
                id: 'logo',
                name: 'logo',
                label: 'Organization Logo',
                type: 'file',
                required: false,
                step: 3
            }
        ],
        status: 'published',
        updatedAt: new Date().toISOString()
    };
    // Upgrade Form Configuration
    const upgradeForm = {
        version: 1001, // Using 1001 for upgrade form
        fields: [
            // Basic info from free signup
            {
                id: 'email',
                name: 'email',
                label: 'Email Address',
                type: 'email',
                required: true,
                step: 1,
                placeholder: 'Enter your email address'
            },
            {
                id: 'firstName',
                name: 'firstName',
                label: 'First Name',
                type: 'text',
                required: true,
                step: 1,
                placeholder: 'Enter your first name'
            },
            {
                id: 'lastName',
                name: 'lastName',
                label: 'Last Name',
                type: 'text',
                required: true,
                step: 1,
                placeholder: 'Enter your last name'
            },
            // Additional fields for paid membership
            {
                id: 'memberLevel',
                name: 'memberLevel',
                label: 'Membership Level',
                type: 'dropdown',
                required: true,
                step: 1,
                options: [
                    { label: 'Individual', value: 'individual' },
                    { label: 'Organization', value: 'organization' },
                    { label: 'Corporate', value: 'corporate' }
                ]
            },
            {
                id: 'affiliatedEntity',
                name: 'affiliatedEntity',
                label: 'Affiliated Entity',
                type: 'text',
                required: true,
                step: 1,
                placeholder: 'Enter your affiliated entity'
            },
            {
                id: 'identification',
                name: 'identification',
                label: 'Identification',
                type: 'text',
                required: true,
                step: 1
            },
            {
                id: 'gender',
                name: 'gender',
                label: 'Gender',
                type: 'dropdown',
                required: true,
                step: 1,
                options: [
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Non-binary', value: 'non-binary' },
                    { label: 'Prefer not to say', value: 'prefer_not_to_say' }
                ]
            },
            {
                id: 'website',
                name: 'website',
                label: 'Website',
                type: 'url',
                required: false,
                step: 2,
                placeholder: 'Enter your website URL'
            },
            {
                id: 'phone',
                name: 'phone',
                label: 'Phone Number',
                type: 'phone',
                required: true,
                step: 2
            },
            {
                id: 'additionalFocus',
                name: 'additionalFocus',
                label: 'Additional Focus Areas',
                type: 'dropdown',
                required: false,
                step: 2,
                options: [
                    { label: 'Agriculture', value: 'agriculture' },
                    { label: 'Alternative Energy', value: 'alternative_energy' },
                    { label: 'Community Development', value: 'community_development' },
                    { label: 'Education', value: 'education' },
                    { label: 'Green Building', value: 'green_building' },
                    { label: 'Waste Management', value: 'waste_management' },
                    { label: 'Water', value: 'water' },
                    { label: 'Wholistic', value: 'wholistic' }
                ]
            },
            {
                id: 'zipCode',
                name: 'zipCode',
                label: 'ZIP Code',
                type: 'text',
                required: true,
                step: 2,
                placeholder: 'Enter your ZIP code'
            },
            {
                id: 'youtube',
                name: 'youtube',
                label: 'YouTube Channel',
                type: 'url',
                required: false,
                step: 3,
                placeholder: 'Enter your YouTube channel URL'
            },
            {
                id: 'nearestCity',
                name: 'nearestCity',
                label: 'Nearest City',
                type: 'text',
                required: true,
                step: 3
            },
            {
                id: 'fundingGoal',
                name: 'fundingGoal',
                label: 'Funding Goal',
                type: 'text',
                required: false,
                step: 3,
                placeholder: 'Enter your funding goal'
            },
            {
                id: 'naicsCode',
                name: 'naicsCode',
                label: 'NAICS Code',
                type: 'text',
                required: false,
                step: 3,
                placeholder: 'Enter your NAICS code'
            },
            {
                id: 'includeOnMap',
                name: 'includeOnMap',
                label: 'Include on Map',
                type: 'checkbox',
                required: false,
                step: 3
            }
        ],
        status: 'published',
        updatedAt: new Date().toISOString()
    };
    try {
        // Remove existing master forms if they exist
        await formVersions.deleteMany({ version: { $in: [1000, 1001] } });
        // Insert new master forms
        await formVersions.insertMany([freeSignupForm, upgradeForm]);
        console.log('Successfully created master form configurations:');
        console.log('- Free Signup Form (version 1000)');
        console.log('- Upgrade Form (version 1001)');
    }
    catch (error) {
        console.error('Error setting up master forms:', error);
        process.exit(1);
    }
    process.exit(0);
}
setupMasterForms().catch(console.error);
