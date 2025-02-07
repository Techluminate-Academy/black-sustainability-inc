// pages/api/auth/[...nextauth].js

import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb";

// Export the NextAuth configuration as a named export.
export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    EmailProvider({
      server: {
        host: process.env.NEXTAUTH_EMAIL_SERVER_HOST,
        port: Number(process.env.NEXTAUTH_EMAIL_SERVER_PORT),
        auth: {
          user: process.env.NEXTAUTH_EMAIL_SERVER_USER,
          pass: process.env.NEXTAUTH_EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.NEXTAUTH_EMAIL_FROM,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/signin", // Custom sign-in page
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
  },
  debug: process.env.NODE_ENV === "development",
};

// Default export for NextAuth
export default NextAuth(authOptions);
 