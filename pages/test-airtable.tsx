import { useState, useEffect } from 'react';
import BSNRegistrationForm from '@/pages/bsn-registration';
import { HARDCODED_MEMBER_LEVELS } from '@/constants/member-levels';

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

  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('profileAccessToken');
      
      if (token) {
        try {
          // Verify token is still valid
          const response = await fetch('/api/auth/check-token', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            // Token is valid, auto-fetch user data
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            setEmail(tokenData.email);
            
            // Fetch user data using the token
            const userResponse = await fetch(
              `/api/airtable/get-user?email=${encodeURIComponent(tokenData.email)}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            
            if (userResponse.ok) {
              const data = await userResponse.json();
              const transformedData = transformUserData(data.data);
              setUserData(transformedData);
              setFormReady(true);
            }
          } else {
            // Token expired or invalid, remove it
            localStorage.removeItem('profileAccessToken');
          }
        } catch (error) {
          console.error('Error checking token:', error);
          localStorage.removeItem('profileAccessToken');
        }
      }
    };

    checkExistingToken();
  }, []);

  // Helper function to format phone numbers as (XXX) XXX-XXXX
  const formatPhoneNumber = (phoneNumber: string) => {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  };

  const transformUserData = (data: any) => {
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
    // This is a linked record, so we get the record ID directly
    let memberLevel = '';
    if (Array.isArray(data?.fields?.["MEMBER LEVEL"]) && data.fields["MEMBER LEVEL"].length > 0) {
      // Use the record ID directly - this matches our HARDCODED_MEMBER_LEVELS ids
      memberLevel = data.fields["MEMBER LEVEL"][0];
    }

    // Debug log for member level
    console.log('🎯 Member Level from Airtable:', {
      raw: data?.fields?.["MEMBER LEVEL"],
      transformed: memberLevel
    });

    return {
      email: data?.fields?.email || '',
      firstName: data?.fields?.firstName || '',
      lastName: data?.fields?.lastName || '',
      memberLevel: memberLevel, // This will be the Airtable record ID
      bio: data?.fields?.bio || '',
      organizationName: data?.fields?.organizationName || '',
      photo: null,
      photoUrl: data?.fields?.photo?.[0]?.url || '',
      logo: null,
      logoUrl: data?.fields?.logo?.[0]?.url || '',
      identification: data?.fields?.identification || '',
      gender: data?.fields?.gender || '',
      website: data?.fields?.website || '',
      phoneCountryCode: '+1-us',
      phone: phoneNumber,
      primaryIndustry: data?.fields?.primaryIndustry || '',
      additionalFocus: data?.fields?.additionalFocus || [],
      address: data?.fields?.address || '',
      zipCode: data?.fields?.zipCode || 0,
      youtube: data?.fields?.youtube || '',
      nearestCity: data?.fields?.nearestCity || '',
      nameFromLocation: data?.fields?.nameFromLocation || '',
      fundingGoal: data?.fields?.fundingGoal || '',
      similarCategories: data?.fields?.similarCategories || [],
      naicsCode: data?.fields?.naicsCode || '',
      includeOnMap: data?.fields?.includeOnMap || false,
      latitude: data?.fields?.latitude || null,
      longitude: data?.fields?.longitude || null,
      showDropdown: false,
      affiliatedEntity: data?.fields?.affiliatedEntity || '',
      phoneCountryCodeTouched: false
    };
  };

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

      const transformedData = transformUserData(data.data);
      console.log('📦 Transformed data:', transformedData);
      setUserData(transformedData);
      
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
    localStorage.removeItem('profileAccessToken');
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
        <h1 className="text-2xl font-bold mb-8">Upgrade Your Free BSN Profile - Register for BSN Membership</h1>
        
        {/* Step 1: Email Input */}
        {!emailSent && !userData && (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold">
                Black Sustainability Network (BSN) Member Registration
              </h2>
              <p className="text-gray-600 mt-2">
                Welcome to our community of sustainability practitioners of African
                descent. If you are Black AND Green, please fill out the
                information below to apply to join our network of over 2,300 people.
              </p>
              <p className="text-gray-600 mt-2 font-bold">We exist and are growing!</p>
              <p className="text-gray-600 mt-2 text-sm">
                *Not Black AND Green? No worries, email info@blacksustainability.org
                to find out how best to connect with us.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-semibold mb-4">Upgrade Your Free BSN Profile - Register for BSN Membership</h2>
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
          </>
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
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">✅ Profile accessed successfully for: {userData.email}</p>
            </div>
            <BSNRegistrationForm key={userData.email} initialData={userData} />
          </div>
        )}
      </div>
    </div>
  );
} 