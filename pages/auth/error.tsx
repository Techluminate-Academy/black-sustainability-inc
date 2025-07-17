import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AuthErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please contact support.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification link has expired or has already been used.';
      case 'EmailSignin':
        return 'The email could not be sent. Please try again.';
      case 'CredentialsSignin':
        return 'Sign in failed. Please check your credentials.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      case 'Default':
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <>
      <Head>
        <title>Authentication Error - BSN</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 mt-12">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
            <p className="text-gray-600 mb-6">
              {getErrorMessage(error as string)}
            </p>
            <div className="space-y-3">
              <Link 
                href="/signin"
                className="block w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              >
                Try Again
              </Link>
              <Link 
                href="/"
                className="block w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 