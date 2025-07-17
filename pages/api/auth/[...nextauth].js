// pages/api/auth/[...nextauth].js

import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { connectToDatabase } from "../../../lib/mongodb"

// Export the NextAuth configuration as a named export.

// This wraps your connectToDatabase function to extract the client.
const clientPromise = connectToDatabase().then(({ client }) => client);
export const authOptions = {
  adapter: MongoDBAdapter(clientPromise,  { databaseName: "orgUserData" }),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        secure: false, // Use TLS
        tls: {
          rejectUnauthorized: false
        }
      },
      from: process.env.EMAIL_FROM || "noreply@blacksustainability.org",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin", // Custom sign-in page
    verifyRequest: "/auth/verify-request", // Custom verify request page
    error: "/auth/error", // Custom error page
  },
  callbacks: {
    async session({ session, user }) {
      // Attach additional properties to the session object.
      session.user.id = user.id;
      session.user.organization = user.organization; // If you store custom fields
      session.user.firstName = user.firstName;       // Attach first name
      session.user.lastName = user.lastName;         // Attach last name
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Custom validation logic can go here
      // For now, allow all email sign-ins
      return true;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Default export for NextAuth
export default NextAuth(authOptions);
 