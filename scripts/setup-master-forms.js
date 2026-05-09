const { connectToDatabase } = require('../lib/mongodb');

async function setupMasterForms() {
  const { db } = await connectToDatabase();
  const formVersions = db.collection('formVersions');

  // Free Signup Form Configuration (Single Step)
  const freeSignupForm = {
    version: 1000,
    name: "Free Signup Form",
    master: true,
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
        step: 1,
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
        step: 1,
        placeholder: 'Enter your organization name'
      },
      {
        id: 'bio',
        name: 'bio',
        label: 'Bio',
        type: 'textarea',
        required: false,
        step: 1,
        placeholder: 'Tell us about yourself or your organization'
      },
      {
        id: 'photo',
        name: 'photo',
        label: 'Profile Photo',
        type: 'file',
        required: false,
        step: 1
      },
      {
        id: 'logo',
        name: 'logo',
        label: 'Organization Logo',
        type: 'file',
        required: false,
        step: 1
      }
    ],
    isMultiStep: false,
    status: 'published',
    updatedAt: new Date().toISOString()
  };

  // BSN Registration Form Configuration (Multi-step)
  const bsnRegistrationForm = {
    version: 1001,
    name: "BSN Registration Form",
    master: true,
    fields: [
      // Step 1: Basic Information
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

      // Step 2: Contact & Focus Areas
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

      // Step 3: Additional Information
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
    isMultiStep: true,
    status: 'published',
    updatedAt: new Date().toISOString()
  };

  try {
    // Remove existing master forms if they exist
    await formVersions.deleteMany({ master: true });

    // Insert new master forms
    await formVersions.insertMany([freeSignupForm, bsnRegistrationForm]);

    console.log('Successfully created master form configurations:');
    console.log(`- ${freeSignupForm.name} (version ${freeSignupForm.version}) - Single Step Master`);
    console.log(`- ${bsnRegistrationForm.name} (version ${bsnRegistrationForm.version}) - Multi Step Master`);
  } catch (error) {
    console.error('Error setting up master forms:', error);
    process.exit(1);
  }

  process.exit(0);
}

setupMasterForms().catch(console.error); 