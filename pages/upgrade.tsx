import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Image from 'next/image'
import logo from '@/public/png/bsn-logo.png'
import UpgradeForm from '@/features/loginUpgrade/UpgradeForm'

export default function UpgradePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="flex justify-center mb-4">
          <Image
            src={logo}
            alt="BSN Logo"
            width={100}
            height={100}
          />
        </div>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading your account...</span>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
          <div className="flex justify-center mb-6">
            <Image
              src={logo}
              alt="BSN Logo"
              width={100}
              height={100}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to upgrade your membership.
          </p>
          <button
            onClick={() => signIn()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  // Check if user has free signup data
  const freeSignupData = (session as any)?.user?.freeSignupData
  
  if (!freeSignupData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
          <div className="flex justify-center mb-6">
            <Image
              src={logo}
              alt="BSN Logo"
              width={100}
              height={100}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Account Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't find your free signup account. Please create a free account first.
          </p>
          <div className="space-y-3">
            <a
              href="/signup" // Update this to your actual free signup route
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 inline-block"
            >
              Sign up for free
            </a>
            <button
              onClick={() => signOut()}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <UpgradeForm
      userData={freeSignupData}
      onLogout={() => signOut()}
    />
  )
} 