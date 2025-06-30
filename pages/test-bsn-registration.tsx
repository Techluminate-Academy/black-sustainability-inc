import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { Formik, Form } from 'formik';
import Image from 'next/image';
import { connectToDatabase } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import type { FormVersion } from '@/models/formVersion';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import toast from 'react-hot-toast';
import logo from '@/public/png/bsn-logo.png';

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
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [initialValues, setInitialValues] = useState(() =>
    formConfig.fields.reduce((acc, field) => {
      if (field.type === 'address') {
        acc[field.name] = { street: '', city: '', state: '', zip: '', country: '' };
      } else if (field.type === 'checkbox') {
        acc[field.name] = false;
      } else {
        acc[field.name] = '';
      }
      return acc;
    }, {} as Record<string, any>)
  );
  const totalSteps = 3;

  const transformAirtableDataToInitialValues = (airtableData: any) => {
    const newInitialValues = { ...initialValues };
    const airtableFields = airtableData.fields;

    formConfig.fields.forEach(field => {
      if (field.airtableColumn && airtableFields[field.airtableColumn]) {
        newInitialValues[field.name] = airtableFields[field.airtableColumn];
      }
    });

    return newInitialValues;
  };

  const sendVerificationEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/send-verification-mandrill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email');
      }
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
      const verifyResponse = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid verification code');
      }

      if (verifyData.token) {
        localStorage.setItem('profileAccessToken', verifyData.token);
      }

      const userResponse = await fetch(`/api/airtable/get-user?email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${verifyData.token}` }
      });
      if (!userResponse.ok) {
        throw new Error('User not found or error fetching data.');
      }
      const userData = await userResponse.json();
      
      const newInitialValues = transformAirtableDataToInitialValues(userData.data);
      setInitialValues(newInitialValues);
      setFormReady(true);
      toast.success('User data loaded successfully!');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

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

  const currentStepFields = formConfig.fields.filter(field => field.step === currentStep);

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

  if (!formReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6 text-center">
          <Image src={logo} alt="BSN Logo" width={80} height={80} className="mx-auto" />
          <h1 className="text-3xl font-bold text-gray-800">Update Your Profile</h1>
          <p className="text-gray-500">First, let's verify your email address.</p>
          
          {!emailSent ? (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={sendVerificationEmail}
                disabled={loading}
                className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We've sent a code to <strong>{email}</strong>. Please enter it below.
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={verifyCodeAndLoadData}
                disabled={verifying}
                className="w-full px-6 py-3 text-base font-medium text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Verify & Load Data'}
              </button>
            </div>
          )}
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <Image src={logo} alt="BSN Logo" width={80} height={80} />
          <h1 className="text-3xl font-bold text-gray-800 mt-4">
            BSN Registration Form
          </h1>
          <p className="text-gray-500">
            Testing v{formConfig.version} for {email}
          </p>
        </div>

        <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
          {({ values }: { values: Record<string, any> }) => (
            <>
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Current Step Data Preview:</h3>
                <pre className="text-sm bg-gray-100 p-3 rounded-md whitespace-pre-wrap text-left">
                  {JSON.stringify(formatFormDataPreview(values), null, 2)}
                </pre>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">All Steps Progress:</h3>
                  <span className="text-sm font-medium text-gray-500">Step {currentStep} of {totalSteps}</span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(step => {
                    const { filled, total } = getStepProgress(step, values);
                    const progress = total > 0 ? (filled / total) * 100 : 0;
                    return (
                      <div key={step}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className={`font-medium ${step === currentStep ? 'text-blue-600' : 'text-gray-600'}`}>
                            Step {step}
                          </span>
                          <span className="text-gray-500">{filled} of {total} fields filled</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Form className="space-y-6 mt-8">
                <DynamicForm fields={currentStepFields} values={values} />
                
                <div className="flex justify-between pt-6">
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
                      onClick={handleNextStep}
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
                      {isSubmitting ? 'Submitting...' : 'Submit to Airtable'}
                    </button>
                  )}
                </div>
              </Form>
            </>
          )}
        </Formik>
      </div>
    </div>
  );
} 