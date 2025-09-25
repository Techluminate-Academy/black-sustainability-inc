// pages/join-map/index.tsx

import React from "react";
import Head from "next/head";
import FreeSignupFormContainer from "@/features/freeSignup/FreeSignupFormContainer";

const JoinMapPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Join the Map - Black Sustainability Network</title>
        <meta name="description" content="Add yourself to the global directory of Black-led sustainability organizations and practitioners." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://maps.blacksustainability.org/join-map" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Join the Map - Black Sustainability Network" />
        <meta property="og:description" content="Add yourself to the global directory of Black-led sustainability organizations and practitioners." />
        <meta property="og:image" content="https://maps.blacksustainability.org/default-logo.png" />
        <meta property="og:url" content="https://maps.blacksustainability.org/join-map" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Join the Map - Black Sustainability Network" />
        <meta name="twitter:description" content="Add yourself to the global directory of Black-led sustainability organizations and practitioners." />
        <meta name="twitter:image" content="https://maps.blacksustainability.org/default-logo.png" />
      </Head>
      <div className="min-h-screen bg-gray-100 py-12">
        <FreeSignupFormContainer />
      </div>
    </>
  );
};

export default JoinMapPage;
