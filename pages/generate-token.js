'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function TokenPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [message, setMessage] = useState('');

  // Redirect unauthenticated users to /signin.
  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/signin');
    }
  }, [session, status, router]);

  // Function to generate the token.
  const generateToken = async () => {
    setIsGenerating(true);
    setMessage('');
    try {
      const res = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }
      setToken(data.apiToken);
      setMessage('Token generated successfully. IMPORTANT: Please copy and save it now, as it will not be shown again.');
    } catch (error) {
      setMessage(error.message || 'An error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to copy the token and immediately hide it.
  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setHasCopied(true);
      setMessage('Token copied to clipboard. It has now been hidden for security purposes. Please store it securely.');
      // Hide the token to prevent further copying.
      setToken(null);
    } catch (error) {
      setMessage('Failed to copy token.');
    }
  };

  // Display a loading indicator while waiting for session data.
  if (status === 'loading' || !session) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Generate API Token</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 mt-12">
          <h1 className="text-2xl font-bold text-center mb-4">Generate API Token</h1>
          <p className="text-gray-700 mb-4">
            Click the button below to generate your API token.{' '}
            <span className="font-bold text-red-600">
              IMPORTANT:
            </span>{' '}
            This token will be displayed only once. Please copy it and store it securely.
          </p>
          {!token && !hasCopied && (
            <button
              onClick={generateToken}
              disabled={isGenerating}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors mb-4"
            >
              {isGenerating ? 'Generating Token...' : 'Generate Token'}
            </button>
          )}
          {token && (
            <div className="flex flex-col items-center mb-4">
              <input
                type="text"
                readOnly
                value={token}
                className="w-full border border-gray-300 rounded p-2 mb-2 text-center"
              />
              <button
                onClick={copyToken}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors"
              >
                Copy Token
              </button>
            </div>
          )}
          {message && (
            <p className={`text-center ${message.includes('error') ? 'text-red-500' : 'text-green-500'} mb-4`}>
              {message}
            </p>
          )}
           {/* Button to navigate back to Dashboard */}
           <div className="text-center mt-4">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
          <div className="border-t pt-4">
            <p className="text-gray-700 text-center">
              To authenticate your API requests, include your token as a Bearer token in the Authorization header.
            </p>
            <p className="text-gray-700 text-center mt-2">
              For example:
              <br />
              <code>Authorization: Bearer YOUR_API_TOKEN</code>
            </p>
            <p className="text-gray-700 text-center mt-2">
              For code examples and more details, please visit our{' '}
              <Link href="https://github.com/Techluminate-Academy/Black-Sustainability-Member-access/blob/main/README.md" className="text-blue-500 underline">
                GitHub repository
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
