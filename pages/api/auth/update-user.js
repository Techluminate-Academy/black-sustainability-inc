// pages/api/auth/update-user.js

import { connectToDatabase } from "../../../lib/mongodb"

// Export the NextAuth configuration as a named export.

// This wraps your connectToDatabase function to extract the client.
const clientPromise = connectToDatabase().then(({ client }) => client);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, lastName, organization } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("orgUserData");


    // Update the user document in the "users" collection (used by NextAuth)
    const result = await db.collection('users').updateOne(
      { email: email },
      {
        $set: {
          firstName: firstName || null,
          lastName: lastName || null,
          organization: organization || null,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
