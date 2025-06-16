import { useState } from 'react';
import BSNRegistrationForm from '@/pages/bsn-registration';

export default function TestAirtable() {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [userName, setUserName] = useState('');

  const sendVerificationEmail = async () => {
    setLoading(true);
    setError(null);
    setUserNotFound(false);

    try {
      console.log('📧 Sending verification email to:', email);
      
      const response = await fetch('/api/auth/send-verification-mandrill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();

      if (response.status === 404) {
        console.log('❌ User not found');
        setUserNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email');
      }

      console.log('✅ Verification email sent');
      setEmailSent(true);
      setUserName(data.firstName || '');
      
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCodeAndFetchData = async () => {
    setVerifying(true);
    setError(null);

    try {
      console.log('🔐 Verifying code for email:', email);
      
      // First verify the code
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

      console.log('✅ Code verified, fetching user data');

      // Now fetch the full user data from Airtable
      const response = await fetch(
        `/api/airtable/get-user?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      console.log('🔍 Raw API response:', data);

      // Transform the data to match BSNRegistrationForm's expected format
      const transformedData = {
        email: data.data?.fields?.email || '',
        firstName: data.data?.fields?.firstName || '',
        lastName: data.data?.fields?.lastName || '',
        memberLevel: data.data?.fields?.memberLevel || '',
        bio: data.data?.fields?.bio || '',
        organizationName: data.data?.fields?.organizationName || '',
        photo: null,
        photoUrl: data.data?.fields?.photo?.[0]?.url || '',
        logo: null,
        logoUrl: data.data?.fields?.logo?.[0]?.url || '',
        identification: data.data?.fields?.identification || '',
        gender: data.data?.fields?.gender || '',
        website: data.data?.fields?.website || '',
        phoneCountryCode: data.data?.fields?.phoneCountryCode || '+1-us',
        phone: data.data?.fields?.phone || '',
        primaryIndustry: data.data?.fields?.primaryIndustry || '',
        additionalFocus: data.data?.fields?.additionalFocus || [],
        address: data.data?.fields?.address || '',
        zipCode: data.data?.fields?.zipCode || 0,
        youtube: data.data?.fields?.youtube || '',
        nearestCity: data.data?.fields?.nearestCity || '',
        nameFromLocation: data.data?.fields?.nameFromLocation || '',
        fundingGoal: data.data?.fields?.fundingGoal || '',
        similarCategories: data.data?.fields?.similarCategories || [],
        naicsCode: data.data?.fields?.naicsCode || '',
        includeOnMap: data.data?.fields?.includeOnMap || false,
        latitude: data.data?.fields?.latitude || null,
        longitude: data.data?.fields?.longitude || null,
        showDropdown: false,
        affiliatedEntity: data.data?.fields?.affiliatedEntity || '',
        phoneCountryCodeTouched: false
      };
      
      console.log('📦 Transformed data:', transformedData);
      setUserData(transformedData);
      
      // Add a small delay to ensure state is set before marking as ready
      setTimeout(() => {
        setFormReady(true);
      }, 100);
      
    } catch (err: any) {
      console.error('Error verifying code or fetching user data:', err);
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const resetFlow = () => {
    setEmail('');
    setVerificationCode('');
    setEmailSent(false);
    setUserData(null);
    setFormReady(false);
    setError(null);
    setUserNotFound(false);
    setUserName('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Access Your BSN Profile</h1>
        
        {/* Step 1: Email Input */}
        {!emailSent && !userData && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Enter Your Email</h2>
            <p className="text-gray-600 mb-4">
              We'll send you a verification code to access your profile securely.
            </p>
            <div className="flex gap-4 mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendVerificationEmail}
                disabled={loading || !email.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verification Code Input */}
        {emailSent && !userData && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Enter Verification Code
            </h2>
            <p className="text-gray-600 mb-4">
              {userName && `Hi ${userName}! `}
              We've sent a 6-digit verification code to <strong>{email}</strong>. 
              Please check your email and enter the code below.
            </p>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-32 p-3 border border-gray-300 rounded-lg text-center text-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
              <button
                onClick={verifyCodeAndFetchData}
                disabled={verifying || verificationCode.length !== 6}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying...' : 'Verify & Access Profile'}
              </button>
            </div>
            <div className="flex gap-4 text-sm">
              <button
                onClick={sendVerificationEmail}
                disabled={loading}
                className="text-blue-500 hover:text-blue-700"
              >
                Resend Code
              </button>
              <button
                onClick={resetFlow}
                className="text-gray-500 hover:text-gray-700"
              >
                Use Different Email
              </button>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}
        
        {/* User Not Found */}
        {userNotFound && (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-8">
            <p>No profile found with this email. Please check the email address and try again.</p>
            <p className="mt-2">If you haven't registered yet, please <a href="/bsn-registration" className="underline">sign up here</a>.</p>
          </div>
        )}

        {/* Loading State */}
        {userData && !formReady && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Preparing your profile form...</p>
          </div>
        )}

        {/* BSN Registration Form */}
        {userData && formReady && (
          <div>
            <div className="mb-4 p-4 bg-green-50 rounded-lg flex justify-between items-center">
              <p className="text-green-800">✅ Profile accessed successfully for: {userData.email}</p>
              <button
                onClick={resetFlow}
                className="px-4 py-2 bg-green-200 text-green-800 rounded hover:bg-green-300 text-sm"
              >
                Access Different Profile
              </button>
            </div>
            <BSNRegistrationForm key={userData.email} initialData={userData} />
          </div>
        )}
      </div>
    </div>
  );
} 