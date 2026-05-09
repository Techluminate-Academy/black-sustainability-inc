'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const nextPath = typeof router.query?.next === 'string' ? router.query.next : '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Sign-in failed');
      }

      const first = data.user?.firstName ? String(data.user.firstName).trim() : '';
      toast.success(first ? `Welcome back, ${first}!` : "You're signed in. Opening the map…");

      // If the member hasn't set a location yet, redirect them to the update form (unless they opted out).
      try {
        const meRes = await fetch('/api/member/me', { credentials: 'include' });
        const me = await meRes.json().catch(() => null);
        const mongo = me?.mongo || null;
        const optedOut = mongo?.locationPromptOptOut === true;
        const hasCoords =
          typeof mongo?.latitude === 'number' &&
          Number.isFinite(mongo.latitude) &&
          typeof mongo?.longitude === 'number' &&
          Number.isFinite(mongo.longitude);
        const hasLocation = typeof mongo?.location === 'string' && mongo.location.trim().length >= 2;

        if (!optedOut && (!hasLocation || !hasCoords)) {
          const dest = `/update-location?forced=1&next=${encodeURIComponent(nextPath || '/')}`;
          await router.replace(dest);
          return;
        }
      } catch {
        // If this check fails, just continue to the intended destination.
      }

      await router.replace(nextPath || '/');
    } catch (error) {
      const text = error.message || 'An unexpected error occurred.';
      toast.error(text);
      setMessage({
        type: 'error',
        text,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In — BSN Member Map</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen flex flex-col lg:flex-row font-lexen">
        {/* Left column — brand / context */}
        <div
          className="relative lg:w-1/2 lg:min-h-screen flex flex-col justify-center px-8 py-12 sm:px-12 text-white overflow-hidden
          bg-gradient-to-br from-[#14532d] via-[#166534] to-[#0f3d24]"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative max-w-lg mx-auto lg:mx-0">
            <Link
              href="/"
              className="inline-block mb-8 rounded-xl bg-white px-7 py-5 shadow-lg shadow-black/10 ring-1 ring-gray-200/90"
            >
              <img
                src="/png/LOGO.png"
                alt="Black Sustainability Network"
                className="w-[240px] h-[76px] object-contain"
                draggable={false}
              />
            </Link>
            <p className="text-[#FFBF23] font-inter font-semibold uppercase tracking-widest text-xs mb-3">
              BSN Member Map
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Welcome back
            </h1>
            <p className="text-green-100 text-base leading-relaxed mb-8">
              Sign in with the same email you use in our Mighty network. We&apos;ll confirm your membership and take you straight to the directory map.
            </p>
            <ul className="space-y-3 text-sm text-green-50/95 font-inter">
              <li className="flex gap-2">
                <span className="text-[#FFBF23] shrink-0">●</span>
                <span>No magic link — one step with your member email.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#FFBF23] shrink-0">●</span>
                <span>Secure session; you can log out anytime from the map.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#FFBF23] shrink-0">●</span>
                <span>
                  Not a member yet?{' '}
                  <a
                    href="https://black-sustainability-network.mn.co/landing"
                    className="underline decoration-[#FFBF23] decoration-2 underline-offset-2 hover:text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join the network
                  </a>
                  .
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right column — form */}
        <div className="lg:w-1/2 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 bg-[#f6f7f4] min-h-[50vh] lg:min-h-screen">
          <div className="w-full max-w-md mx-auto">
            <div className="lg:hidden mb-8 flex justify-center">
              <Link
                href="/"
                className="inline-block rounded-xl bg-white px-6 py-4 shadow-md ring-1 ring-gray-200/90"
              >
                <img
                  src="/png/LOGO.png"
                  alt="Black Sustainability Network"
                  className="mx-auto w-[200px] h-[64px] object-contain"
                  draggable={false}
                />
              </Link>
            </div>

            <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Member sign in</h2>
              <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                Enter the email tied to your Mighty profile. We verify it against the network, then open the map.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-gray-700 font-medium mb-1.5 text-sm">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg font-semibold uppercase text-xs tracking-wide bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60 shadow-sm"
                >
                  {isSubmitting ? 'Signing in…' : 'Continue to map'}
                </button>
              </form>
              {message && (
                <p
                  className={`mt-4 text-sm ${
                    message.type === 'error' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {message.text}
                </p>
              )}
              <p className="mt-8 text-center text-sm text-gray-500">
                <Link href="/" className="text-green-700 font-medium hover:underline">
                  ← Back to map
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
