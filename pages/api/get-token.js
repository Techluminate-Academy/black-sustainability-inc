// pages/api/get-token.js

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  // Allow only GET requests.
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
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
    const db = client.db(); // Uses the default database in your connection string.

    // Find the user by their email.
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return the API token if it exists.
    if (user.apiToken) {
      return res.status(200).json({ apiToken: user.apiToken });
    } else {
      return res.status(200).json({ apiToken: null, message: "No API token found" });
    }
  } catch (error) {
    console.error("Error fetching token:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
