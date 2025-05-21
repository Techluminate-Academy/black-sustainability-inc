'use client';

import { useState } from 'react';
import Head from 'next/head';
import { signIn } from 'next-auth/react';

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    organization: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Handle input field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Handle form submission to initiate email login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Call NextAuth's signIn function with the "email" provider.
      const result = await signIn('email', {
        email: formData.email,
        redirect: false, // Set to false if you want to handle the response manually.
        callbackUrl: '/dashboard', // The URL to redirect to after login.
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Inform the user that a magic link has been sent.
      setMessage({
        type: 'success',
        text: 'Check your email for a magic link to log in.',
      });

      // Optionally, reset the form data (if desired)
      setFormData({ firstName: '', lastName: '', organization: '', email: '' });
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
        <title>Sign Up / Login to Access Member Data</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
        {/* About the Organization */}
        <div className="bg-white shadow-lg rounded-lg w-full max-w-3xl p-6 mt-8">
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-2">Who We Are</h2>
            <p className="text-gray-700">
              Our organization mobilizes sustainability practitioners of Afrikan descent to (re)build sustainable communities and economies that will restore balance to our planet.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold mb-2">Our Mission</h2>
            <p className="text-gray-700">
              To mobilize sustainability practitioners of Afrikan descent to (re)build sustainable communities and economies that will restore balance to our planet.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold mb-2">Our Vision</h2>
            <p className="text-gray-700">
              We envision a world that honors Afrikan ancestral wisdom and ingenuity to restore the well-being of our planet and generations to come.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold mb-2">Theory of Change</h2>
            <p className="text-gray-700">
              By creating a global network of Afrikan sustainability practitioners to exchange knowledge, our members can develop best practices and apply sustainable solutions to environmental issues across impacted Black communities.
            </p>
          </section>

          {/* New Section for API Access */}
          <section>
            <h2 className="text-xl font-bold mb-2">API Access & Member Data</h2>
            <p className="text-gray-700">
              Our robust API provides secure, token-based access to our member data, enabling developers to seamlessly integrate detailed information—such as membership levels, contact details, and profile images—into their applications. By leveraging our API, you can build innovative solutions that help further engage with our community and drive meaningful insights.
            </p>
          </section>
        </div>

        {/* Sign-Up / Email Login Form */}
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-6 mt-12">
          <h1 className="text-2xl font-bold text-center mb-6">
            Sign Up / Login to Access Member Data
          </h1>
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

            {/* New Input for Organization Name */}
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

            <div>
              <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
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
              {isSubmitting ? 'Sending Magic Link...' : 'Send Magic Link'}
            </button>
          </form>

          {message && (
            <p className={`mt-4 text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
