'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to /signin if not logged in and not loading
  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/signin');
    }
  }, [session, status, router]);

  // Show a loading indicator if session is loading or not yet available
  if (status === 'loading' || !session) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          <p className="mb-6">
            Welcome, <span className="font-semibold">{session.user.email}</span>!
          </p>

          {/* Dashboard Content */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Member Data</h2>
            <p>
              Here you can view and manage your member data. You can access various features,
              including updating your profile, viewing your membership details, and more.
            </p>
          </div>

          {/* Buttons container */}
          <div className="flex justify-center gap-4 mt-4">
            <Link
              href="/profile"
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Update Profile
            </Link>
            <Link
              href="/generate-token"
              className="px-6 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              Generate API Token
            </Link>
            <button
              onClick={() => {
                signOut();
                router.push('/signin');
              }}
              className="px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
