'use client';

import { useState, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function Profile() {
  // const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    organization: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
// console.log(session)
  // Redirect if there is no session (and we're not loading)
  // useEffect(() => {
  //   if (status !== 'loading' && !session) {
  //     router.push('/signin');
  //   }
  // }, [session, status, router]);

  // Pre-populate form fields from session data when available
  // useEffect(() => {
  //   if (session && session.user) {
  //     setFormData({
  //       firstName: session.user.firstName || '',
  //       lastName: session.user.lastName || '',
  //       organization: session.user.organization || '',
  //     });
  //   }
  // }, [session]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit the updated profile data to the update API route
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Mock API call for static export
      // const res = await fetch('/api/auth/update-user', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     email: session.user.email, // Use the email from the session
      //     firstName: formData.firstName,
      //     lastName: formData.lastName,
      //     organization: formData.organization,
      //   }),
      // });

      // const data = await res.json();
      // if (!res.ok) {
      //   throw new Error(data.error || 'Failed to update profile');
      // }
      
      // Simulate successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Profile updated successfully (demo mode).' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'An error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If the session is still loading or is not present, show a loading indicator.
  // if (status === 'loading' || !session) {
  //   return (
  //     <div className="flex justify-center items-center h-screen">
  //       <p>Loading...</p>
  //     </div>
  //   );
  // }

  return (
    <>
      <Head>
        <title>Update Profile</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 mt-12">
          <h1 className="text-2xl font-bold text-center mb-6">Update Profile</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-gray-700 font-medium mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-gray-700 font-medium mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <div>
              <label htmlFor="organization" className="block text-gray-700 font-medium mb-1">
                Organization Name
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
            >
              {isSubmitting ? 'Updating Profile...' : 'Update Profile'}
            </button>
          </form>
          {message && (
            <p
              className={`mt-4 text-center ${
                message.type === 'error' ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {message.text}
            </p>
          )}

<div className="mt-6 text-center">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
