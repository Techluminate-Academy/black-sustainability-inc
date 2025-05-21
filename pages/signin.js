'use client';

import { useState } from 'react';
import Head from 'next/head';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Handle form submission to initiate email login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Initiate NextAuth email sign-in
      const result = await signIn('email', {
        email,
        redirect: false, // Set to false if you want to handle the response manually.
        callbackUrl: '/dashboard', // The URL to redirect to after login.
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage({
        type: 'success',
        text: 'Check your email for a magic link to log in.',
      });

      // Optionally reset the email input
      setEmail('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 mt-12">
          <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
            >
              {isSubmitting ? 'Sending Magic Link...' : 'Send Magic Link'}
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
        </div>
      </div>
    </>
  );
}
