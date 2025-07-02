import { connectToDatabase } from '../lib/mongodb';
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
        description: 'Upload a clear photo of yourself',
        accept: 'image/*',
        maxSize: 5242880, // 5MB in bytes
        multiple: false
      },
      {
        id: 'logo',
        name: 'logo',
        label: 'Organization Logo',
        type: 'file' as FieldType,
        required: false,
        step: 1,
        description: "Optional: Upload your organization's logo if applicable",
        accept: 'image/*',
        maxSize: 5242880, // 5MB in bytes
        multiple: false
      },
      {
        id: 'phone',
        name: 'phone',
        label: 'Phone Number',
        type: 'phone' as FieldType,
        required: false,
        step: 1,
        placeholder: 'Enter your phone number',
        description: 'Please enter your phone number with country code'
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
      // Step 1: Basic Information (order matches bsn-registration)
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
        id: 'photo',
        name: 'photo',
        label: 'Photo',
        type: 'file' as FieldType,
        required: true,
        step: 1,
        description: 'Share your headshot and/or logo to complete your profile.',
        accept: 'image/*',
        maxSize: 5242880, // 5MB in bytes
        multiple: false
      },
      {
        id: 'logo',
        name: 'logo',
        label: 'Logo',
        type: 'file' as FieldType,
        required: false,
        step: 1,
        description: "Drop files here",
        accept: 'image/*',
        maxSize: 5242880,
        multiple: false
      },
      {
        id: 'phone',
        name: 'phone',
        label: 'Phone Number',
        type: 'phone' as FieldType,
        required: false,
        step: 1,
        placeholder: 'Enter your phone number'
      },
      {
        id: 'memberLevel',
        name: 'memberLevel',
        label: 'Member Level',
        type: 'dropdown' as FieldType,
        required: true,
        step: 2,
        placeholder: 'Select your membership level',
        options: [
          { value: '🥋 Expert - Experienced Professional', label: '🥋 Expert - Experienced Professional' },
          { value: '👓 Enthusiast -Excited to Learn', label: '👓 Enthusiast -Excited to Learn' },
          { value: '🏢 Entity - Black & Green Organization', label: '🏢 Entity - Black & Green Organization' },
          { value: 'Young Environmental Scholar', label: 'Young Environmental Scholar' }
        ]
      },
      {
        id: 'bio',
        name: 'bio',
        label: 'Bio (250 words or less)',
        type: 'textarea' as FieldType,
        required: true,
        step: 2,
        placeholder: 'Tell us about yourself and/or your organization.',
        description: 'Word Count: 0 / 250'
      },
      {
        id: 'organizationName',
        name: 'organizationName',
        label: 'Organization Name (if Applicable)',
        type: 'text' as FieldType,
        required: false,
        step: 2,
        placeholder: 'Enter organization name'
      },
      {
        id: 'identification',
        name: 'identification',
        label: 'Identification',
        type: 'dropdown' as FieldType,
        required: true,
        step: 2,
        placeholder: 'Select your identification',
        options: [
          { value: 'African/Afrikan', label: 'African/Afrikan' },
          { value: 'Black/African-American', label: 'Black/African-American' },
          { value: 'Black/Afro-Diasporic', label: 'Black/Afro-Diasporic' },
          { value: 'African-American/Black', label: 'African-American/Black' },
          { value: 'Afro-diasporic', label: 'Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)' },
          { value: 'Of African Descent', label: 'Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)' }
        ]
      },
      {
        id: 'gender',
        name: 'gender',
        label: 'Gender',
        type: 'dropdown' as FieldType,
        required: true,
        step: 2,
        placeholder: 'Select your gender',
        options: [
          { value: 'Female', label: 'Female' },
          { value: 'Male', label: 'Male' },
          { value: 'Non-Binary', label: 'Non-Binary' },
          { value: 'Prefer not to say', label: 'Prefer not to say' }
        ]
      },
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
        id: 'primaryIndustry',
        name: 'primaryIndustry',
        label: 'Primary Industry House',
        type: 'dropdown' as FieldType,
        required: true,
        step: 2,
        placeholder: 'Select your primary industry',
        options: [
          { value: 'Agriculture', label: '🌾 Agriculture/Sustainable Food Production / Land Management' },
          { value: 'Alternative Energy', label: '☀️ Alternative Energy' },
          { value: 'Community Development', label: '🏘 Community Development' },
          { value: 'Education', label: '🧑🏾‍🏫 Education & Cultural Preservation' },
          { value: 'Green Building', label: '🏗️ Green Building' },
          { value: 'Waste Management', label: '♻️ Waste Management' },
          { value: 'Water', label: '💧 Water' },
          { value: 'Wholistic', label: '🌍 Wholistic' }
        ]
      },
      {
        id: 'additionalFocus',
        name: 'additionalFocus',
        label: 'Additional Industry Houses',
        type: 'multiselect' as FieldType,
        required: false,
        step: 2,
        placeholder: 'Select additional industries',
        options: [
          { value: 'Agriculture', label: '🌾 Agriculture/Sustainable Food Production / Land Management' },
          { value: 'Alternative Energy', label: '☀️ Alternative Energy' },
          { value: 'Community Development', label: '🏘 Community Development' },
          { value: 'Education', label: '🧑🏾‍🏫 Education & Cultural Preservation' },
          { value: 'Green Building', label: '🏗️ Green Building' },
          { value: 'Waste Management', label: '♻️ Waste Management' },
          { value: 'Water', label: '💧 Water' },
          { value: 'Wholistic', label: '🌍 Wholistic' }
        ]
      },
      {
        id: 'address',
        name: 'address',
        label: 'Address (Drop your pin on the map!)',
        type: 'address' as FieldType,
        required: true,
        step: 3,
        placeholder: 'Start typing your full address...'
      },
      {
        id: 'zipCode',
        name: 'zipCode',
        label: 'Zip/Postal Code',
        type: 'text' as FieldType,
        required: false,
        step: 3,
        placeholder: 'e.g., 60628'
      },
      {
        id: 'youtube',
        name: 'youtube',
        label: 'YouTube',
        type: 'url' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Enter YouTube link'
      },
      {
        id: 'nearestCity',
        name: 'nearestCity',
        label: 'Location (Nearest City)',
        type: 'text' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Enter nearest city'
      },
      {
        id: 'locationName',
        name: 'locationName',
        label: 'Name (from Location)',
        type: 'dropdown' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Find an option',
        options: [
          { value: 'MEX', label: 'MEX' },
          { value: 'USA', label: 'USA' },
          { value: 'LR', label: 'LR' },
          { value: 'SEN', label: 'SEN' },
          { value: 'UK', label: 'UK' },
          { value: 'BRB', label: 'BRB' },
          { value: 'GHA', label: 'GHA' },
          { value: 'NIG', label: 'NIG' },
          { value: 'ZA', label: 'ZA' },
          { value: 'Portsmouth', label: 'Portsmouth' },
          { value: 'JAM', label: 'JAM' },
          { value: 'GBR', label: 'GBR' },
          { value: 'RWA', label: 'RWA' },
          { value: 'VIR', label: 'VIR' },
          { value: 'UGA', label: 'UGA' },
          { value: 'HTI', label: 'HTI' },
          { value: 'CAN', label: 'CAN' },
          { value: 'GUY', label: 'GUY' },
          { value: 'BEL', label: 'BEL' },
          { value: 'MW', label: 'MW' },
          { value: 'Gam', label: 'Gam' },
          { value: 'TZA', label: 'TZA' },
          { value: 'PR', label: 'PR' },
          { value: 'CM', label: 'CM' },
          { value: 'ETH', label: 'ETH' },
          { value: 'COL', label: 'COL' },
          { value: 'Caribbean', label: 'Caribbean' },
          { value: 'BW', label: 'BW' },
          { value: 'NOR', label: 'NOR' },
          { value: 'CG', label: 'CG' },
          { value: 'SL', label: 'SL' },
          { value: 'VU', label: 'VU' },
          { value: 'BH', label: 'BH' },
          { value: 'ZWA', label: 'ZWA' }
        ]
      },
      {
        id: 'fundingGoal',
        name: 'fundingGoal',
        label: 'Funding Goal',
        type: 'textarea' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Any project that needs funding...'
      },
      {
        id: 'similarCategories',
        name: 'similarCategories',
        label: 'Similar Categories',
        type: 'multiselect' as FieldType,
        required: false,
        step: 3,
        placeholder: 'Select similar categories',
        options: [
          { value: 'Astrology,Author', label: 'Astrology,Author' },
          { value: 'Community Development', label: '🏘 Community Development' },
          { value: 'Green Lifestyle', label: '♻️ Green Lifestyle' },
          { value: 'Agriculture/Sustainable Food Production / Land Management', label: '🌾 Agriculture/Sustainable Food Production / Land Management' },
          { value: 'Alternative Energy', label: '☀️ Alternative Energy' },
          { value: 'Environmental Justice', label: '⚖️ Environmental Justice' },
          { value: 'Education & Cultural Preservation', label: '🧑🏾‍🏫 Education & Cultural Preservation' },
          { value: 'Alternative Economics', label: '💰 Alternative Economics' },
          { value: 'Water', label: '💧 Water' },
          { value: 'Waste Management', label: '🗑️ Waste Management' },
          { value: 'Climate Preparedness', label: '🌡️ Climate Preparedness' },
          { value: 'Wholistic Health', label: '🧘🏾‍♀️ Wholistic Health' },
          { value: 'Author', label: '📚 Author' },
          { value: 'Eco-Friendly Products', label: '🌿 Eco-Friendly Products' },
          { value: 'Sustainability Consulting', label: '💼 Sustainability Consulting' },
          { value: 'Environmental Education', label: '🎓 Environmental Education' },
          { value: 'Renewable Energy', label: '🔋 Renewable Energy' },
          { value: 'Sustainable Fashion', label: '👗 Sustainable Fashion' },
          { value: 'Zero Waste', label: '♾️ Zero Waste' },
          { value: 'Urban Farming', label: '🌱 Urban Farming' },
          { value: 'Sustainable Transportation', label: '🚲 Sustainable Transportation' },
          { value: 'Environmental Policy', label: '📜 Environmental Policy' },
          { value: 'Green Building', label: '🏗️ Green Building' },
          { value: 'Sustainable Tourism', label: '🌍 Sustainable Tourism' }
        ]
      },
      {
        id: 'includeOnMap',
        name: 'includeOnMap',
        label: 'Include me on Global BSN Map',
        type: 'checkbox' as FieldType,
        required: false,
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