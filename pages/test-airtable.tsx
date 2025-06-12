import { useState } from 'react';
import BSNRegistrationForm from '@/pages/bsn-registration';

export default function TestAirtable() {
  const [email, setEmail] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [formReady, setFormReady] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    setUserData(null);
    setUserNotFound(false);
    setFormReady(false);

    try {
      console.log('🔍 Fetching data for email:', email);
      
      const response = await fetch(
        `/api/airtable/test-get-user?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (response.status === 404) {
        console.log('❌ User not found');
        setUserNotFound(true);
        return;
      }

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
      console.error('Error fetching user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Upgrade Your BSN Profile</h1>
        
        {/* Email Lookup Section */}
        {!userData && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Enter Your Email</h2>
            <div className="flex gap-4 mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={fetchUserData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Find My Profile'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}
        {userNotFound && (
          <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
            <p>No profile found with this email. Please check the email address and try again.</p>
            <p className="mt-2">If you haven't registered yet, please <a href="/bsn-registration" className="underline">sign up here</a>.</p>
          </div>
        )}

        {/* Show loading while fetching or preparing form */}
        {userData && !formReady && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Preparing form...</p>
          </div>
        )}

        {/* BSN Registration Form with Pre-populated Data */}
        {userData && formReady && (
          <div>
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800">✅ Profile found! Data loaded for: {userData.email}</p>
            </div>
            <BSNRegistrationForm key={userData.email} initialData={userData} />
          </div>
        )}
      </div>
    </div>
  );
} 