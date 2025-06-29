// pages/free-signup.tsx

import React from "react";
import FreeSignupFormContainer from "@/features/freeSignup/FreeSignupFormContainer";

const FreeSignupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <FreeSignupFormContainer />
    </div>
  );
};

export default FreeSignupPage;
