import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import Image from 'next/image';
import { connectToDatabase } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import type { FormVersion } from '@/models/formVersion';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import toast from 'react-hot-toast';
import logo from '@/public/png/bsn-logo.png';
import MembershipOptions from '@/features/loginUpgrade/MembershipOptions';
import CountryCodeDropdown from '@/components/CountryCodeDropdown/CountryCodeDropdown';
import { allCountries } from 'country-telephone-data';
import AirtableUtils from '@/features/freeSignup/airtableUtils';
import { HARDCODED_MEMBER_LEVELS, type MemberLevel } from '@/constants/member-levels';
import { IndustryHouses } from '@/utils/IndustryDetails';

interface CountryData {
  name: string;
  dialCode: string;
  iso2: string;
}

// Transform the raw country data into the format expected by CountryCodeDropdown
const internationalOptions = (allCountries as CountryData[]).map(country => ({
  value: `+${country.dialCode}-${country.iso2}`,
  label: `${country.name} (+${country.dialCode})`,
  iso2: country.iso2.toLowerCase()
}));

interface TestBSNRegistrationProps {
  formConfig: FormVersion;
}

export const getServerSideProps: GetServerSideProps<TestBSNRegistrationProps> = async () => {
  const { db } = await connectToDatabase();
  const coll = db.collection('formVersions') as Collection<FormVersion>;
  
  // Get the latest published version of the BSN Registration Form
  const formConfig = await coll.findOne(
    { name: 'BSN Registration Form', status: 'published' },
    { sort: { version: -1 } }
  );

  if (!formConfig) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      formConfig: JSON.parse(JSON.stringify(formConfig))
    }
  };
};

interface AirtableFields {
  "EMAIL ADDRESS": string;
  "FIRST NAME": string;
  "LAST NAME": string;
  "MEMBER LEVEL"?: string[];
  "BIO": string;
  "ORGANIZATION NAME": string;
  "PHONE US/CAN ONLY": string;
  "ADDITIONAL FOCUS AREAS": string[];
  "Zip/Postal Code"?: number;
  "Similar Categories": string[];
  "NAICS Code": string;
  "Featured": boolean;
  "Latitude": string;
  "Longitude": string;
  "Address": string;
  "IDENTIFICATION"?: string;
  "GENDER"?: string;
  "WEBSITE"?: string;
  "PRIMARY INDUSTRY HOUSE"?: string;
  "AFFILIATED ENTITY"?: string;
  "YOUTUBE"?: string;
  "Location (Nearest City)"?: string;
  "Name (from Location)"?: string;
  "FUNDING GOAL"?: string;
  "PHOTO"?: Array<{ url: string; filename: string }>;
  "LOGO"?: Array<{ url: string; filename: string }>;
  [key: string]: any; // Allow dynamic field access
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  memberLevel: MemberLevel;
  bio: string;
  organizationName: string;
  photo: File | null;
  photoUrl?: string;
  logo: File | null;
  logoUrl?: string;
  identification: string;
  gender: string;
  website: string;
  phoneCountryCode: string;
  phone: string;
  primaryIndustry: string;
  additionalFocus: string[];
  address: string;
  zipCode: number;
  youtube: string;
  nearestCity: string;
  nameFromLocation: string;
  fundingGoal: string;
  similarCategories: string[];
  naicsCode: string;
  includeOnMap: boolean;
  latitude: number | null;
  longitude: number | null;
  affiliatedEntity: string;
}

export default function TestBSNRegistration({ formConfig }: TestBSNRegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const [userName, setUserName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1-us');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [initialValues, setInitialValues] = useState(() =>
    formConfig.fields.reduce((acc, field) => {
      if (field.type === 'address') {
        acc[field.name] = '';
        acc[`${field.name}PlaceId`] = '';
        acc['latitude'] = null;
        acc['longitude'] = null;
      } else if (field.type === 'checkbox') {
        acc[field.name] = false;
      } else if (field.type === 'phone') {
        acc[field.name] = '';
        acc['phoneCountryCode'] = '+1-us';
      } else if (field.type === 'multiselect') {
        acc[field.name] = [];
      } else if (field.type === 'file') {
        acc[field.name] = null;
        acc[`${field.name}Url`] = '';
        acc[`${field.name}Preview`] = '';
      } else {
        acc[field.name] = '';
      }
      return acc;
    }, {} as Record<string, any>)
  );
  const totalSteps = Math.max(...formConfig.fields.map(f => (f.step ?? 1)));

  // Auto-check existing token and pre-load user data if token valid
  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('profileAccessToken');
      if (!token) return;
      try {
        const response = await fetch('/api/auth/check-token', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          localStorage.removeItem('profileAccessToken');
          return;
        }
        // Get email from token payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        const savedEmail = payload.email as string;
        setEmail(savedEmail);
        // Fetch user data
        const userResponse = await fetch(`/api/airtable/get-user?email=${encodeURIComponent(savedEmail)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userResponse.ok) return;
        const userDataJson = await userResponse.json();
        const newInitial = transformAirtableDataToInitialValues(userDataJson.data);
        setInitialValues(newInitial);
        setFormReady(true);
      } catch (err) {
        console.error('Auto token check failed', err);
        localStorage.removeItem('profileAccessToken');
      }
    };
    checkExistingToken();
  }, []);

  const transformAirtableDataToInitialValues = (data: any) => {
    // Get the phone number and remove any +1 prefix if it exists
    let phoneNumber = (data?.fields?.phone || '').replace(/^\+1/, '');
    
    // If the phone number is not already in (XXX) XXX-XXXX format,
    // clean it and format it
    if (phoneNumber && !phoneNumber.includes('(')) {
      phoneNumber = phoneNumber.replace(/\D/g, '');
      if (phoneNumber.length === 10) {
        phoneNumber = formatPhoneNumber(phoneNumber);
      }
    }

    // Get member level ID from the MEMBER LEVEL array in Airtable
    let memberLevel = '';
    if (Array.isArray(data?.fields?.["MEMBER LEVEL"]) && data.fields["MEMBER LEVEL"].length > 0) {
      memberLevel = data.fields["MEMBER LEVEL"][0];
    }

    // Debug log for member level
    console.log('Member Level from Airtable:', {
      raw: data?.fields?.["MEMBER LEVEL"],
      transformed: memberLevel,
      allFields: data?.fields
    });

    return {
      email: data?.fields?.email || '',
      firstName: data?.fields?.firstName || '',
      lastName: data?.fields?.lastName || '',
      memberLevel: memberLevel, // This should be the Airtable record ID
      bio: data?.fields?.bio || '',
      organizationName: data?.fields?.organizationName || '',
      photo: null,
      photoUrl: data?.fields?.photo?.[0]?.url || '',
      photoPreview: data?.fields?.photo?.[0]?.url || '',
      logo: null,
      logoUrl: data?.fields?.logo?.[0]?.url || '',
      logoPreview: data?.fields?.logo?.[0]?.url || '',
      identification: data?.fields?.identification || '',
      gender: data?.fields?.gender || '',
      website: data?.fields?.website || '',
      phoneCountryCode: data?.fields?.phoneCountryCode || '+1-us',
      phone: phoneNumber,
      primaryIndustry: data?.fields?.primaryIndustry || '',
      additionalFocus: data?.fields?.additionalFocus || [],
      address: data?.fields?.address || '',
      zipCode: data?.fields?.zipCode || '',
      youtube: data?.fields?.youtube || '',
      nearestCity: data?.fields?.nearestCity || '',
      locationName: data?.fields?.locationName || '',
      fundingGoal: data?.fields?.fundingGoal || '',
      similarCategories: data?.fields?.similarCategories || [],
      naicsCode: data?.fields?.naicsCode || '',
      includeOnMap: data?.fields?.includeOnMap || false,
      latitude: data?.fields?.latitude || null,
      longitude: data?.fields?.longitude || null,
      affiliatedEntity: data?.fields?.affiliatedEntity || ''
    };
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  };

  const sendVerificationEmail = async () => {
    setLoading(true);
    setError(null);
    setUserNotFound(false);
    try {
      const response = await fetch('/api/auth/send-verification-mandrill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.status === 404) {
        setUserNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email');
      }
      setUserName(data.firstName || '');
      setEmailSent(true);
      toast.success(`Verification code sent to ${email}`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCodeAndLoadData = async () => {
    setVerifying(true);
    setError(null);
    try {
      console.log('🔐 Verifying code for email:', email);
      
      // First verify the code and get access token
      const verifyResponse = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid verification code');
      }

      // Store the token
      if (verifyData.token) {
        localStorage.setItem('profileAccessToken', verifyData.token);
      }

      console.log('✅ Code verified, fetching user data');

      // Now fetch the full user data from Airtable using the token
      const response = await fetch(
        `/api/airtable/get-user?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${verifyData.token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      console.log('🔍 Raw API response:', data);

      const transformedData = transformAirtableDataToInitialValues(data.data);
      console.log('📦 Transformed data:', transformedData);
      setInitialValues(transformedData);
      
      setTimeout(() => {
        setFormReady(true);
      }, 100);
      
    } catch (err: any) {
      console.error('Error verifying code or fetching user data:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const validateStep = (values: any): boolean => {
    const errors: Record<string, string> = {};

    // Validation for Step 1
    if (currentStep === 1) {
      if (!values.email) {
        errors.email = 'Email is required';
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
        errors.email = 'Invalid email address';
      }
      if (!values.firstName) {
        errors.firstName = 'First name is required';
      }
      if (!values.lastName) {
        errors.lastName = 'Last name is required';
      }
      if (!values.phone) {
        errors.phone = 'Phone number is required';
      } else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(values.phone)) {
        errors.phone = 'Phone number must be in format (XXX) XXX-XXXX';
      }
      if (!values.phoneCountryCode) {
        errors.phoneCountryCode = 'Country code is required';
      }
    }

    // Validation for Step 2
    if (currentStep === 2) {
      if (!values.memberLevel) {
        errors.memberLevel = 'Member level is required';
      }
      if (!values.bio) {
        errors.bio = 'Bio is required';
      }
      if (!values.organizationName) {
        errors.organizationName = 'Organization name is required';
      }
      if (!values.primaryIndustry) {
        errors.primaryIndustry = 'Primary industry is required';
      }
    }

    // Validation for Step 3
    if (currentStep === 3) {
      if (!values.address) {
        errors.address = 'Address is required';
      }
      if (!values.zipCode) {
        errors.zipCode = 'Zip code is required';
      } else {
        const zipValue = values.zipCode.toString().replace(/\D/g, '');
        if (!zipValue || zipValue.length < 5) {
          errors.zipCode = 'Please enter a valid zip code';
        }
      }
      if (!values.nearestCity) {
        errors.nearestCity = 'Nearest city is required';
      }
    }

    // Update form errors
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = (e: React.MouseEvent, values: any) => {
    e.preventDefault();
    if (validateStep(values)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const transformFormDataToAirtableFields = (formData: FormData): AirtableFields => {
    // Format the phone number with country code
    const phoneNumber = formData.phoneCountryCode 
      ? `${formData.phoneCountryCode.split('-')[0]}${formData.phone}`
      : formData.phone;

    // Convert zip code to number and handle empty/invalid values
    const zipCode = formData.zipCode ? parseInt(formData.zipCode.toString().replace(/\D/g, ''), 10) : undefined;

    const airtableFields: AirtableFields = {
      "EMAIL ADDRESS": formData.email,
      "FIRST NAME": formData.firstName,
      "LAST NAME": formData.lastName,
      "MEMBER LEVEL": formData.memberLevel ? [formData.memberLevel] : undefined,
      "BIO": formData.bio,
      "ORGANIZATION NAME": formData.organizationName,
      "PHONE US/CAN ONLY": phoneNumber,
      "ADDITIONAL FOCUS AREAS": formData.additionalFocus,
      "Zip/Postal Code": zipCode,
      "Similar Categories": formData.similarCategories,
      "NAICS Code": formData.naicsCode,
      "Featured": formData.includeOnMap,
      "Latitude": formData.latitude !== null ? formData.latitude.toString() : "",
      "Longitude": formData.longitude !== null ? formData.longitude.toString() : "",
      "Address": formData.address,
      "IDENTIFICATION": formData.identification,
      "GENDER": formData.gender,
      "WEBSITE": formData.website,
      "PRIMARY INDUSTRY HOUSE": formData.primaryIndustry,
      "AFFILIATED ENTITY": formData.affiliatedEntity,
      "YOUTUBE": formData.youtube,
      "Location (Nearest City)": formData.nearestCity,
      "Name (from Location)": formData.nameFromLocation,
      "FUNDING GOAL": formData.fundingGoal,
    };

    // Add photo if available
    if (formData.photoUrl) {
      airtableFields["PHOTO"] = [{
        url: formData.photoUrl,
        filename: formData.photo?.name || "profile-photo.jpg"
      }];
    }

    // Add logo if available
    if (formData.logoUrl) {
      airtableFields["LOGO"] = [{
        url: formData.logoUrl,
        filename: formData.logo?.name || "organization-logo.jpg"
      }];
    }

    // Remove undefined fields
    Object.keys(airtableFields).forEach(key => {
      if (airtableFields[key] === undefined || airtableFields[key] === '') {
        delete airtableFields[key];
      }
    });

    // Debug log for member level
    console.log('Sending to Airtable:', {
      memberLevel: formData.memberLevel,
      airtableFields: airtableFields["MEMBER LEVEL"]
    });

    return airtableFields;
  };

  const handleFormSubmit = async (values: any, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    if (currentStep !== totalSteps) {
      setSubmitting(false);
      return;
    }

    if (!validateStep(values)) {
      setSubmitting(false);
      return;
    }

    try {
      setSubmitting(true);
      
      // Transform form data to match Airtable field names
      const airtableFields = transformFormDataToAirtableFields(values as FormData);

      // First, try to find existing record by email
      const searchResponse = await fetch(`/api/airtable/get-user?email=${encodeURIComponent(values.email)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('profileAccessToken')}`
        }
      });

      if (!searchResponse.ok) {
        throw new Error('Failed to check existing record');
      }

      const searchData = await searchResponse.json();
      
      let result;
      if (searchData.data) {
        // Record exists, update it using AirtableUtils
        const recordId = searchData.data.id;
        result = await AirtableUtils.updateRecord(recordId, airtableFields);
      } else {
        // No existing record, create new one using AirtableUtils
        result = await AirtableUtils.submitToAirtable(airtableFields);
      }

      toast.success('Form submitted successfully!');
      console.log('Submission result:', result);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add state for form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // For step 1, enforce the required order and limit fields
  let currentStepFields = formConfig.fields.filter(field => field.step === currentStep);
  if (currentStep === 1) {
    const step1Fields = [
      'email',
      'firstName',
      'lastName',
      'photo',
      'logo',
      'phone'
    ];
    currentStepFields = step1Fields
      .map(name => currentStepFields.find(f => f.name === name))
      .filter((f): f is typeof f & object => !!f);
  } else if (currentStep === 2) {
    const step2Fields = [
      'memberLevel',
      'bio',
      'organizationName',
      'identification',
      'gender',
      'website',
      'primaryIndustry',
      'additionalFocus'
    ];
    currentStepFields = step2Fields
      .map(name => {
        const field = currentStepFields.find(f => f.name === name);
        if (field && field.name === 'memberLevel') {
          return {
            ...field,
            options: HARDCODED_MEMBER_LEVELS.map(level => ({
              value: level.id,
              label: level.name
            }))
          };
        }
        if (field && (field.name === 'primaryIndustry' || field.name === 'additionalFocus')) {
          return {
            ...field,
            options: IndustryHouses.map(industry => ({
              value: industry.value,
              label: industry.value // Use the value as the label since it contains the emojis
            }))
          };
        }
        return field;
      })
      .filter((f): f is typeof f & object => !!f);
  } else if (currentStep === 3) {
    const step3Fields = [
      'address',
      'zipCode',
      'youtube',
      'nearestCity',
      'locationName',
      'fundingGoal',
      'similarCategories',
      'includeOnMap'
    ];
    currentStepFields = step3Fields
      .map(name => {
        const field = currentStepFields.find(f => f.name === name);
        if (field && field.name === 'similarCategories') {
          return {
            ...field,
            options: IndustryHouses.map(industry => ({
              value: industry.value,
              label: industry.value // Use the value as the label since it contains the emojis
            }))
          };
        }
        return field;
      })
      .filter((f): f is typeof f & object => !!f);
  }

  const formatFormDataPreview = (values: Record<string, any>) => {
    const currentStepFieldNames = currentStepFields.map(field => field.name);
    const filledFields = Object.entries(values).reduce((acc, [key, value]) => {
      if (!currentStepFieldNames.includes(key)) return acc;
      if (value === '' || value === null || value === undefined) return acc;
      
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const filledSubFields = Object.values(value).some(v => v !== '');
        if (filledSubFields) acc[key] = value;
      } else {
        acc[key] = value;
      }
      
      return acc;
    }, {} as Record<string, any>);
    return Object.keys(filledFields).length > 0 ? filledFields : { message: `No fields filled yet in Step ${currentStep}` };
  };

  const getStepProgress = (step: number, values: Record<string, any>) => {
    const stepFields = formConfig.fields.filter(field => field.step === step);
    const filledCount = stepFields.filter(field => {
        const value = values[field.name];
        if (field.type === 'address') {
            return typeof value === 'object' && value !== null && Object.values(value).some(v => v !== '');
        }
        return value !== '' && value !== null && value !== undefined && value !== false;
    }).length;
    return { filled: filledCount, total: stepFields.length };
  };

  const resetFlow = () => {
    localStorage.removeItem('profileAccessToken');
    setEmail('');
    setVerificationCode('');
    setEmailSent(false);
    setFormReady(false);
    setError(null);
    setUserNotFound(false);
    setUserName('');
  };

  // Add a function to handle image preview
  const getImagePreview = (fieldName: string, values: any) => {
    const previewUrl = values[`${fieldName}Url`];
    if (previewUrl) {
      return (
        <div className="mt-2">
          <Image
            src={previewUrl}
            alt={`${fieldName} preview`}
            width={100}
            height={100}
            className="rounded-lg object-cover"
          />
        </div>
      );
    }
    return null;
  };

  // Update the member level options in the form fields
  const memberLevelOptions = HARDCODED_MEMBER_LEVELS.map(level => ({
    value: level.id,
    label: level.name
  }));

  if (!formReady) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Image src={logo} alt="BSN Logo" width={100} height={100} className="mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">BSN Member Registration</h2>
            <p className="text-lg text-gray-600">Step {currentStep} of {totalSteps}</p>
          </div>

          {!formReady ? (
            <div className="bg-white shadow sm:rounded-lg p-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Black Sustainability Network (BSN) Member Registration</h3>
                <p className="text-gray-600 mb-4">
                  Welcome to our community of sustainability practitioners of African descent. If you are Black AND Green, please fill out the information below to apply to join our network of over 2,300 people.
                </p>
                <p className="text-lg font-semibold text-gray-800 mb-4">We exist and are growing!</p>
                <p className="text-sm text-gray-500">
                  *Not Black AND Green? No worries, email info@blacksustainability.org to find out how best to connect with us.
                </p>
              </div>

              {!emailSent ? (
                <div>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <button
                    onClick={sendVerificationEmail}
                    disabled={loading || !email}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading || !email ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      id="code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter verification code"
                    />
                  </div>
                  <button
                    onClick={verifyCodeAndLoadData}
                    disabled={verifying || !verificationCode}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      verifying || !verificationCode ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    {verifying ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow sm:rounded-lg">
              <Formik 
                initialValues={initialValues} 
                onSubmit={handleFormSubmit}
                enableReinitialize
              >
                {({ values, isSubmitting }) => (
                  <Form className="space-y-6">
                    <DynamicForm 
                      fields={currentStepFields} 
                      values={values} 
                      errors={formErrors}
                      renderImagePreview={getImagePreview}
                    />
                    <div className="flex justify-between pt-8">
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        disabled={currentStep === 1}
                        className="px-6 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {currentStep < totalSteps ? (
                        <button
                          type="button"
                          onClick={(e) => handleNextStep(e, values)}
                          className="px-6 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-6 py-2 text-base font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : 'Update Profile'}
                        </button>
                      )}
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className={`mx-auto transition-all duration-300 ${isSubmitted ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src={logo} alt="BSN Logo" width={200} height={100} priority className="h-auto" />
        </div>
        
        {/* Main heading and info */}
        <h1 className="text-2xl font-bold mb-4 text-center">Upgrade Your Free BSN Profile - Register for BSN Membership</h1>
        
        {/* Success banner */}
        {formReady && !isSubmitted && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-6 py-3 mb-6 text-center flex items-center justify-center gap-2">
            <span className="text-xl">✅</span>
            <span>Profile accessed successfully for: <span className="font-semibold">{email}</span></span>
          </div>
        )}

        {/* Registration form container */}
        {formReady && !isSubmitted && (
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-0 md:p-10 space-y-8">
            <Formik 
              initialValues={initialValues} 
              onSubmit={handleFormSubmit}
              enableReinitialize
            >
              {({ values, isSubmitting }) => (
                <Form className="space-y-6">
                  <DynamicForm 
                    fields={currentStepFields} 
                    values={values} 
                    errors={formErrors}
                    renderImagePreview={getImagePreview}
                  />
                  <div className="flex justify-between pt-8">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={currentStep === 1}
                      className="px-6 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {currentStep < totalSteps ? (
                      <button
                        type="button"
                        onClick={(e) => handleNextStep(e, values)}
                        className="px-6 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 text-base font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Update Profile'}
                      </button>
                    )}
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

        {/* Submission success display */}
        {isSubmitted && (
          <div className="bg-green-50 p-6 rounded-lg text-center">
            <p className="text-green-800 text-lg font-semibold">Thank you! Your profile has been updated successfully.</p>
          </div>
        )}

        {/* Membership options if needed */}
        {isSubmitted && (
          <div className="w-full max-w-[1400px] -mx-4 mt-8">
            <MembershipOptions onReturn={() => setIsSubmitted(false)} />
          </div>
        )}
      </div>
    </div>
  );
} 