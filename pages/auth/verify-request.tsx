import Head from 'next/head';
import Link from 'next/link';

export default function VerifyRequestPage() {
  return (
    <>
      <Head>
        <title>Check Your Email - BSN</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 mt-12">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              We've sent you a magic link to sign in to your account. 
              Please check your email and click the link to continue.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The magic link will expire in 24 hours for security reasons.
              </p>
            </div>
            <Link 
              href="/signin"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 