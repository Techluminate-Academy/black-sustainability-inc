'use client';

import { useState, useEffect } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";

// Helper function to mask a token (show first 4 and last 4 characters)
function maskToken(token) {
  if (!token) return "";
  if (token.length <= 8) return token;
  return token.slice(0, 4) + "..." + token.slice(-4);
}

export default function TokenManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiToken, setApiToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Redirect unauthenticated users
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/signin");
    } else if (session) {
      fetchToken();
    }
  }, [session, status, router]);

  // Fetch the current token from /api/get-token
  const fetchToken = async () => {
    try {
      const res = await fetch("/api/get-token");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch token");
      }
      setApiToken(data.apiToken);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Revoke the token via /api/revoke-token
  const revokeToken = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/revoke-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke token");
      }
      setApiToken(null);
      setMessage("Token revoked successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Token Management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-md p-8 mt-16">
          <h1 className="text-2xl font-bold text-center mb-8">Token Management</h1>
          <p className="text-gray-700 mb-6 text-center">
            Here you can view your current API token and revoke it if needed.
            <br />
            <span className="font-bold text-red-600">IMPORTANT:</span> Your token is displayed only in a masked format. To generate a new token (and view it fully once), please navigate to the token creation page.
          </p>
          {message && (
            <p className="text-center mb-6 text-gray-700">{message}</p>
          )}
          {apiToken ? (
            <div className="mb-6">
              <input
                type="text"
                readOnly
                value={maskToken(apiToken)}
                className="w-full border border-gray-300 rounded p-2 text-center mb-4"
              />
              <button
                onClick={revokeToken}
                disabled={loading}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition-colors"
              >
                {loading ? "Processing..." : "Revoke Token"}
              </button>
            </div>
          ) : (
            <p className="text-center mb-6">No token found.</p>
          )}
          <div className="flex flex-col justify-center gap-4 mt-6">
            <Link
              href="/generate-token"
              className="w-full inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-center"
            >
              Generate New Token
            </Link>
            <Link
              href="/dashboard"
              className="w-full inline-block px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-center"
            >
              Back to Dashboard
            </Link>
          </div>
          <div className="border-t pt-6 text-center mt-6">
            <p className="text-gray-700">
              To authenticate your API requests, include your token as a Bearer token in the Authorization header.
            </p>
            <p className="text-gray-700 mt-2">
              For example:
              <br />
              <code>Authorization: Bearer YOUR_API_TOKEN</code>
            </p>
            <p className="text-gray-700 mt-2">
              For code examples and further details, please refer to our{" "}
              <a
                href="https://github.com/Techluminate-Academy/Black-Sustainability-Member-access/blob/main/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                GitHub repository
              </a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
