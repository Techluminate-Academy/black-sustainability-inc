import { connectToDatabase } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import type { FormVersion } from '@/models/formVersion';
import { FieldType } from '@/models/field';

async function setupMasterForms() {
  const { db } = await connectToDatabase();
  const formVersions = db.collection<FormVersion>('formVersions');

  // Free Signup Form Configuration
  const freeSignupForm: FormVersion = {
    name: 'Free Signup Form',
    version: 1000,
    master: true,
    fields: [
      {
        id: 'firstName',
        name: 'firstName',
        label: 'First Name',
        type: 'text' as FieldType,
        required: true,
        step: 1,
        placeholder: 'Enter your first name'
      },
      {
        id: 'lastName',
        name: 'lastName',
        label: 'Last Name',
        type: 'text' as FieldType,
        required: true,
        step: 1,
        placeholder: 'Enter your last name'
      },
      {
        id: 'email',
        name: 'email',
        label: 'Email',
        type: 'email' as FieldType,
        required: true,
        step: 1,
        placeholder: 'you@example.com'
      },
      {
        id: 'photo',
        name: 'photo',
        label: 'Profile Photo',
        type: 'file' as FieldType,
        required: true,
        step: 1,
        description: 'Upload a clear photo of yourself'
      },
      {
        id: 'logo',
        name: 'logo',
        label: 'Organization Logo',
        type: 'file' as FieldType,
        required: false,
        step: 1,
        description: "Optional: Upload your organization's logo if applicable"
      },
      {
        id: 'address',
        name: 'address',
        label: 'Address',
        type: 'address' as FieldType,
        required: true,
        step: 1,
        placeholder: 'Start typing your address...'
      },
      {
        id: 'primaryIndustry',
        name: 'primaryIndustry',
        label: 'Primary Industry House',
        type: 'dropdown' as FieldType,
        required: true,
        step: 1,
        placeholder: 'Select one...',
        options: [
          { value: 'agriculture', label: 'Agriculture' },
          { value: 'alternative_energy', label: 'Alternative Energy' },
          { value: 'community_development', label: 'Community Development' },
          { value: 'education', label: 'Education' },
          { value: 'green_building', label: 'Green Building' },
          { value: 'waste_management', label: 'Waste Management' },
          { value: 'water', label: 'Water' },
          { value: 'wholistic', label: 'Wholistic' }
        ]
      },
      {
        id: 'organizationName',
        name: 'organizationName',
        label: 'Organization Name (optional)',
        type: 'text' as FieldType,
        required: false,
        step: 1,
        placeholder: 'Enter organization name'
      },
      {
        id: 'bio',
        name: 'bio',
        label: 'Bio (optional)',
        type: 'textarea' as FieldType,
        required: false,
        step: 1,
        placeholder: 'Briefly describe your work...'
      }
    ],
    isMultiStep: false,
    status: 'published',
    updatedAt: new Date().toISOString()
  };

  // BSN Registration Form Configuration
  const bsnRegistrationForm: FormVersion = {
    name: 'BSN Registration Form',
    version: 1001,
    master: true,
    fields: [
      // Step 1: Basic Information
      {
        id: 'email',
        name: 'email',
        label: 'Email Address',
        type: 'email' as FieldType,
        required: true,
        step: 1,
        placeholder: 'Enter your email address'
      },
      {
        id: 'firstName',
        name: 'firstName',
        label: 'First Name',
        type: 'text' as FieldType,
        required: true,
        step: 1,
        placeholder: 'Enter your first name'
      },
      {
        id: 'lastName',
        name: 'lastName',
        label: 'Last Name',
        type: 'text' as FieldType,
        required: true,
        step: 1,
        placeholder: 'Enter your last name'
      },
      {
        id: 'memberLevel',
        name: 'memberLevel',
        label: 'Membership Level',
        type: 'dropdown' as FieldType,
        required: true,
        step: 1,
        options: [
          { value: '🥋 Expert - Experienced Professional', label: '🥋 Expert - Experienced Professional' },
          { value: '👓 Enthusiast -Excited to Learn', label: '👓 Enthusiast -Excited to Learn' },
          { value: '🏢 Entity - Black & Green Organization', label: '🏢 Entity - Black & Green Organization' },
          { value: 'Young Environmental Scholar', label: 'Young Environmental Scholar' }
        ]
      },
      {
        id: 'affiliatedEntity',
        name: 'affiliatedEntity',
        label: 'Affiliated Entity',
        type: 'text' as FieldType,
        required: false,
        step: 1,
        placeholder: 'Enter your affiliated entity'
      },
      {
        id: 'identification',
        name: 'identification',
        label: 'Identification',
        type: 'dropdown' as FieldType,
        required: false,
        step: 1,
        options: [
            { value: 'African/Afrikan', label: 'African/Afrikan' },
            { value: 'Black/African-American', label: 'Black/African-American' },
            { value: 'Black/Afro-Diasporic', label: 'Black/Afro-Diasporic' },
            { value: 'African-American/Black', label: 'African-American/Black' },
            { value: 'Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)', label: 'Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)' },
            { value: 'Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)', label: 'Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)' }
        ]
      },
      {
        id: 'gender',
        name: 'gender',
        label: 'Gender',
        type: 'dropdown' as FieldType,
        required: false,
        step: 1,
        options: [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
          { label: 'Non-binary', value: 'non-binary' },
          { label: 'Prefer not to say', value: 'prefer_not_to_say' }
        ]
      },

      // Step 2: Contact & Focus Areas
      {
        id: 'website',
        name: 'website',
        label: 'Website',
        type: 'url' as FieldType,
        required: false,
        step: 2,
        placeholder: 'Enter your website URL'
      },
      {
        id: 'phone',
        name: 'phone',
        label: 'Phone Number',
        type: 'phone' as FieldType,
        required: false,
        step: 2
      },
      {
        id: 'additionalFocus',
        name: 'additionalFocus',
        label: 'Additional Focus Areas',
        type: 'dropdown' as FieldType,
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
        type: 'text' as FieldType,
        required: false,
        step: 2,
        placeholder: 'Enter your ZIP code'
      },

      // Step 3: Additional Information
      {
        id: 'youtube',
        name: 'youtube',
        label: 'YouTube Channel',
        type: 'url' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Enter your YouTube channel URL'
      },
      {
        id: 'nearestCity',
        name: 'nearestCity',
        label: 'Nearest City',
        type: 'text' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Enter the nearest major city'
      },
      {
        id: 'fundingGoal',
        name: 'fundingGoal',
        label: 'Funding Goal',
        type: 'text' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Enter your funding goal'
      },
      {
        id: 'naicsCode',
        name: 'naicsCode',
        label: 'NAICS Code',
        type: 'text' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Enter your NAICS code'
      },
      {
        id: 'includeOnMap',
        name: 'includeOnMap',
        label: 'Include on Map',
        type: 'checkbox' as FieldType,
        required: true,
        step: 3
      }
    ],
    isMultiStep: true,
    status: 'published',
    updatedAt: new Date().toISOString()
  };

  try {
    // Upsert the master form configurations
    await formVersions.updateOne(
      { version: 1000 },
      { $set: freeSignupForm },
      { upsert: true }
    );
    await formVersions.updateOne(
      { version: 1001 },
      { $set: bsnRegistrationForm },
      { upsert: true }
    );
    console.log('Successfully created/updated master form configurations:');
    console.log(`- ${freeSignupForm.name} (version ${freeSignupForm.version})`);
    console.log(`- ${bsnRegistrationForm.name} (version ${bsnRegistrationForm.version})`);

  } catch (err) {
    console.error('Failed to set up master forms:', err);
  }
}

setupMasterForms().catch(console.error); 