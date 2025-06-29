import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { Formik, Form } from 'formik';
import { connectToDatabase } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import type { FormVersion } from '@/models/formVersion';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import toast from 'react-hot-toast';

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

export default function TestBSNRegistration({ formConfig }: TestBSNRegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

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

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/airtable/test-update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: values,
          formVersion: formConfig.version
        }),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();
      toast.success('Form submitted successfully to Airtable!');
      console.log('Submission result:', result);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit form to Airtable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Filter fields for current step
  const currentStepFields = formConfig.fields.filter(field => field.step === currentStep);

  const formatFormDataPreview = (values: Record<string, any>) => {
    // Get field names for the current step
    const currentStepFieldNames = currentStepFields.map(field => field.name);

    const filledFields = Object.entries(values).reduce((acc, [key, value]) => {
      // Only include fields from the current step
      if (!currentStepFieldNames.includes(key)) {
        return acc;
      }

      // Skip empty strings, empty objects, and null/undefined values
      if (value === '' || value === null || value === undefined) {
        return acc;
      }
      
      // For address objects, only include if at least one field is filled
      if (typeof value === 'object' && !Array.isArray(value)) {
        const filledAddressFields = Object.entries(value).reduce((addressAcc, [addressKey, addressValue]) => {
          if (addressValue && addressValue !== '') {
            addressAcc[addressKey] = addressValue;
          }
          return addressAcc;
        }, {} as Record<string, any>);
        
        if (Object.keys(filledAddressFields).length > 0) {
          acc[key] = filledAddressFields;
        }
      } else {
        acc[key] = value;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.keys(filledFields).length > 0 ? filledFields : { message: `No fields filled yet in Step ${currentStep}` };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Test BSN Registration Form (Version {formConfig.version})</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 mx-2 rounded ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`text-sm ${
                  step === currentStep ? 'text-blue-600 font-bold' : 'text-gray-500'
                }`}
              >
                Step {step}
              </div>
            ))}
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
        >
          {({ values }) => (
            <Form className="space-y-6">
              <DynamicForm
                fields={currentStepFields}
                values={values}
              />
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Previous
                </button>

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit to Airtable'}
                  </button>
                )}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Current Step Data Preview:</h3>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(formatFormDataPreview(values), null, 2)}
                </pre>
              </div>

              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">All Steps Progress:</h3>
                  <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
                </div>
                {[1, 2, 3].map(step => {
                  const stepFields = formConfig.fields.filter(field => field.step === step);
                  const stepValues = stepFields.reduce((acc, field) => {
                    if (values[field.name] !== '' && values[field.name] !== null && values[field.name] !== undefined) {
                      acc[field.name] = values[field.name];
                    }
                    return acc;
                  }, {} as Record<string, any>);
                  const filledCount = Object.keys(stepValues).length;
                  const totalCount = stepFields.length;
                  
                  return (
                    <div key={step} className="mb-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={step === currentStep ? 'font-bold' : ''}>
                          Step {step}
                        </span>
                        <span className="text-gray-500">
                          {filledCount} of {totalCount} fields filled
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(filledCount / totalCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
} 