// pages/api/revoke-token.js

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
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
    // Connect to MongoDB.
    const client = await clientPromise;
    const db = client.db(); // Uses the default database from your connection string.

    // Revoke the token by unsetting the `apiToken` field.
    const result = await db.collection("users").updateOne(
      { email: session.user.email },
      { $unset: { apiToken: "" } }
    );

    // Check if a document was modified.
    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Token not found or already revoked" });
    }

    // Return success.
    return res.status(200).json({ message: "API token revoked successfully" });
  } catch (error) {
    console.error("Error revoking token:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
