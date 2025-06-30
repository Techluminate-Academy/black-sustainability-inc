import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import type { FormVersion } from '@/models/formVersion';
import type { FieldDef } from '@/types/schema-editor';
import type { Option } from '@/types/form';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from 'react-google-places-autocomplete';
import Select, { components, OptionProps } from 'react-select';
import AirtableUtils from '@/features/freeSignup/airtableUtils';
import logo from '@/public/png/bsn-logo.png';
import axios from 'axios';

const iconMap: Record<string, string> = {
  "Agriculture/Sustainable Living": "agric",
  "Alternative Energy": "AlternaiveEnergy",
  "Business": "Green",
  "Community Development": "CommDev",
  "Eco-Tourism": "Eco",
  "Education & Cultural Preservation": "Edu",
  "Environmental Justice/Policy": "Preparedness",
  "Waste Management": "waste",
  "Water Resources": "water",
  "Wholistic Health": "wholistic",
  "Other": "other",
  "All": "all",
};

const getIconForIndustry = (industryLabel: string): string => {
  for (const key in iconMap) {
    if (industryLabel.includes(key)) {
      return iconMap[key];
    }
  }
  return 'default'; 
};

interface SelectOption {
  id: string;
  name: string;
  value: string;
  label: string;
  icon: string;
}

const CustomOption = (props: OptionProps<SelectOption, false>) => {
  const { data } = props;
  return (
    <components.Option {...props}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src={`/png/${data.icon}.png`} alt={data.label} style={{ width: 20, height: 20, marginRight: 10 }} />
        {data.label}
      </div>
    </components.Option>
  );
};

interface TestFreeSignupProps {
  formConfig: FormVersion;
}

export const getServerSideProps: GetServerSideProps<TestFreeSignupProps> = async () => {
  const { db } = await connectToDatabase();
  const coll = db.collection('formVersions') as Collection<FormVersion>;
  
  // Get the latest published version of the Free Signup Form
  const formConfig = await coll.findOne(
    { name: 'Free Signup Form', status: 'published' },
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

export default function TestFreeSignup({ formConfig }: TestFreeSignupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [industryOptions, setIndustryOptions] = useState<SelectOption[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchIndustryOptions = async () => {
      try {
        const metadata = await AirtableUtils.fetchTableMetadata();
        const field = metadata.find(
          (f: any) => f.fieldName === "PRIMARY INDUSTRY HOUSE"
        );
        if (field && field.options) {
          const filtered = field.options
            .filter((opt: any) => opt.name !== "PRIMARY INDUSTRY HOUSE" && opt.name !== "Business" && opt.name !== "Climate")
            .sort((a: any, b: any) => {
              const strip = (s: string) => s.replace(/^[^a-zA-Z]+/, "").trim();
              return strip(a.name).localeCompare(strip(b.name), "en", {
                sensitivity: "base",
              });
            })
            .map((o: any) => ({ 
              ...o, 
              value: o.name, 
              label: o.name,
              icon: getIconForIndustry(o.name)
            }));
          setIndustryOptions(filtered);
        }
      } catch (err) {
        console.error("Error loading industry options:", err);
        toast.error("Failed to load industry options from Airtable.");
      }
    };
    fetchIndustryOptions();
  }, []);

  // Generate initial values based on form fields
  const initialValues = formConfig.fields.reduce((acc, field) => {
    if (field.type === 'address') {
      acc[field.name] = {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      };
    } else if (field.type === 'checkbox') {
      acc[field.name] = false;
    } else if (field.type === 'dropdown') {
      acc[field.name] = '';
    } else {
      acc[field.name] = '';
    }
    return acc;
  }, {} as Record<string, any>);

  // Generate validation schema based on form fields
  const validationSchema = Yup.object().shape(
    formConfig.fields.reduce((acc, field) => {
      if (field.type === 'address') {
        if (field.required) {
          acc[field.name] = Yup.object().shape({
            address: Yup.string().required(`${field.label} is required`),
            latitude: Yup.number().required(),
            longitude: Yup.number().required(),
            placeId: Yup.string().required(),
          }).nullable().required(`${field.label} is required`);
        } else {
          acc[field.name] = Yup.object().shape({
            address: Yup.string(),
            latitude: Yup.number(),
            longitude: Yup.number(),
            placeId: Yup.string(),
          }).nullable();
        }
      } else {
        let fieldSchema: Yup.StringSchema | Yup.BooleanSchema = Yup.string();
        if (field.type === 'checkbox') {
          fieldSchema = Yup.boolean();
        }

        if (field.required) {
          fieldSchema = fieldSchema.required(`${field.label} is required`);
        }
        
        if (field.type === 'email') {
          fieldSchema = (fieldSchema as Yup.StringSchema).email('Please enter a valid email address');
        }
        
        if (field.type === 'url') {
          fieldSchema = (fieldSchema as Yup.StringSchema).url('Please enter a valid URL');
        }
        
        if (field.name === 'primaryIndustry') {
          if (field.required) {
            acc[field.name] = Yup.string().required(`${field.label} is required`);
          } else {
            acc[field.name] = Yup.string();
          }
        }
        
        acc[field.name] = fieldSchema;
      }
      return acc;
    }, {} as Record<string, any>)
  );

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      // Map form values to Airtable field names
      const submissionData: Record<string, any> = {
        "FIRST NAME": values.firstName,
        "LAST NAME": values.lastName,
        "EMAIL ADDRESS": values.email,
        "PRIMARY INDUSTRY HOUSE": values.primaryIndustry,
        "BIO": values.bio || "",
        "ORGANIZATION NAME": values.organizationName || "",
        "Featured": true, // Always set to true for map visibility
        "Membership Status Notes": "Free" // Set membership status to Free
      };

      // Handle address data
      if (values.address) {
        submissionData["Address"] = values.address.address;
        // Convert latitude and longitude to strings with fixed decimal places
        submissionData["LATITUDE (NEW)"] = values.address.latitude.toString();
        submissionData["LONGITUDE (NEW)"] = values.address.longitude.toString();
      }

      // Handle file uploads
      if (values.photo && values.photo instanceof File) {
        const formData = new FormData();
        formData.append('file', values.photo);
        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.status !== 200) throw new Error('Photo upload failed');
        submissionData["PHOTO"] = [{ url: response.data.url }];
      }

      if (values.logo && values.logo instanceof File) {
        const formData = new FormData();
        formData.append('file', values.logo);
        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.status !== 200) throw new Error('Logo upload failed');
        submissionData["LOGO"] = [{ url: response.data.url }];
      }

      // Submit directly to Airtable using AirtableUtils
      const result = await AirtableUtils.submitToAirtable(submissionData);

      setIsSubmitted(true);
      toast.success('Form submitted successfully to Airtable!');
      console.log('Submission result:', result);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit form to Airtable');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If form has been submitted, show a thank-you screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg text-center">
          <div className="mb-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-3">Thank you!</h2>
          <p className="text-gray-600 mb-6">
            Your free listing is now on our map. We'll review your information and follow up if needed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 min-h-[44px]"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 bg-gray-100">
      <div className="w-full sm:w-1/2 mx-auto bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-xl">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <Image
            src={logo}
            alt="BSN Logo"
            width={120}
            height={120}
            className="mb-3 sm:mb-4 w-auto h-auto"
            priority
          />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2 text-center">
            Black Sustainability Network (BSN) Map Listing
          </h1>
          <p className="text-sm sm:text-base text-gray-600 text-center px-2 sm:px-4">
            Welcome to the first step in joining our community of sustainability practitioners.
          </p>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue }) => {
            return (
              <Form className="space-y-4 sm:space-y-5">
                {formConfig.fields
                  .filter((field) => field.name !== 'membershipStatusNotes')
                  .map((field) => (
                  <div key={field.id} className="form-field">
                    <label 
                      htmlFor={field.name}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {field.label} {field.required && <span className="text-red-600">*</span>}
                    </label>
                    
                    {field.description && (
                      <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                    )}

                    {field.name === 'primaryIndustry' ? (
                      <Select
                        id={field.name}
                        name={field.name}
                        options={industryOptions}
                        value={industryOptions.find(option => option.value === values[field.name])}
                        onChange={(option) => setFieldValue(field.name, option?.value)}
                        components={{ Option: CustomOption }}
                        placeholder={field.placeholder || "Select an industry"}
                      />
                    ) : field.type === 'address' ? (
                      <div>
                        <GooglePlacesAutocomplete
                          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                          selectProps={{
                            placeholder: field.placeholder || "Search for your address...",
                            className: "google-places-autocomplete",
                            classNamePrefix: "google-places",
                            isClearable: true,
                            value: values[field.name] ? {
                              label: values[field.name].address,
                              value: {
                                place_id: values[field.name].placeId,
                                structured_formatting: {
                                  main_text: values[field.name].address,
                                  secondary_text: ""
                                }
                              }
                            } : null,
                            onChange: async (val: any) => {
                              if (!val) {
                                setFieldValue(field.name, {
                                  address: "",
                                  latitude: null,
                                  longitude: null,
                                  placeId: null
                                });
                                return;
                              }

                              try {
                                const results = await geocodeByPlaceId(val.value.place_id);
                                const { lat, lng } = await getLatLng(results[0]);
                                
                                setFieldValue(field.name, {
                                  address: results[0].formatted_address,
                                  latitude: lat,
                                  longitude: lng,
                                  placeId: val.value.place_id
                                });
                              } catch (error) {
                                console.error('Error getting location details:', error);
                                toast.error('Failed to get location details');
                              }
                            },
                            styles: {
                              control: (provided: any, state: any) => ({
                                ...provided,
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                borderColor: errors[field.name] && touched[field.name] 
                                  ? '#ef4444' 
                                  : state.isFocused 
                                    ? '#3b82f6' 
                                    : '#d1d5db',
                                boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
                                '&:hover': {
                                  borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
                                }
                              }),
                              option: (provided: any, state: any) => ({
                                ...provided,
                                backgroundColor: state.isSelected 
                                  ? '#3b82f6' 
                                  : state.isFocused 
                                    ? '#e5e7eb' 
                                    : 'transparent',
                                color: state.isSelected ? 'white' : '#111827',
                                cursor: 'pointer',
                                '&:active': {
                                  backgroundColor: '#3b82f6'
                                }
                              })
                            }
                          }}
                        />
                        {errors[field.name] && touched[field.name] && (
                          <p className="mt-1.5 text-sm text-red-600 font-medium">
                            {typeof errors[field.name] === 'object'
                              ? ((errors[field.name] as any).address)
                              : errors[field.name]
                            }
                          </p>
                        )}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <Field
                        as="textarea"
                        id={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        className={`
                          w-full
                          px-4
                          py-3
                          text-base
                          border
                          rounded-lg
                          focus:ring-2
                          focus:ring-blue-500
                          focus:ring-offset-1
                          min-h-[100px]
                          ${errors[field.name] && touched[field.name]
                            ? 'border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:ring-blue-200'
                          }
                          transition-colors
                          duration-200
                        `}
                      />
                    ) : field.type === 'file' ? (
                      <input
                        id={field.name}
                        name={field.name}
                        type="file"
                        onChange={(event) => {
                          if (event.currentTarget.files) {
                            setFieldValue(field.name, event.currentTarget.files[0]);
                          }
                        }}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                    ) : (
                      <Field
                        type={field.type}
                        id={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        className={`
                          w-full
                          px-4
                          py-3
                          text-base
                          border
                          rounded-lg
                          focus:ring-2
                          focus:ring-blue-500
                          focus:ring-offset-1
                          ${errors[field.name] && touched[field.name]
                            ? 'border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:ring-blue-200'
                          }
                          transition-colors
                          duration-200
                        `}
                      />
                    )}

                    <ErrorMessage
                      name={field.name}
                      component="p"
                      className="mt-1.5 text-sm text-red-600 font-medium"
                    />
                  </div>
                ))}

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center items-center px-5 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 min-h-[44px] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
} 