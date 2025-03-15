// pages/api/generate-token.js

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import crypto from "crypto";
import { connectToDatabase } from "../../lib/mongodb"

// Export the NextAuth configuration as a named export.

// This wraps your connectToDatabase function to extract the client.
const clientPromise = connectToDatabase().then(({ client }) => client);
export default async function handler(req, res) {
  // Only allow POST requests.
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Retrieve the session to ensure the user is authenticated.
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Generate a secure random token.
    const token = crypto.randomBytes(32).toString("hex");

    // Connect to MongoDB.
    const client = await clientPromise;
    const db = client.db("orgUserData");

    
    // Update the user record with the new token.
    const result = await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { apiToken: token } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return the generated token.
    return res.status(200).json({
      apiToken: token,
      message: "API token generated successfully",
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
