// features/freeSignup/FreeSignupFormContainer.tsx

import React from "react";
import FreeSignupForm from "./FreeSignupForm";
import { useFreeSignupForm } from "./useFreeSignupForm";

/**
 * Container component that “glues” the hook + presentational form together.
 * It passes all data, errors, and handlers as props into FreeSignupForm.
 */
const FreeSignupFormContainer: React.FC = () => {
  const {
    formData,
    errors,
    industryOptions,
    isSubmitting,
    isSubmitted,
    handleFieldChange,
    handleAddressSelect,
    handleSubmit,
  } = useFreeSignupForm();

  return (
    <FreeSignupForm
      formData={formData}
      errors={errors}
      industryOptions={industryOptions}
      isSubmitting={isSubmitting}
      isSubmitted={isSubmitted}
      onFieldChange={handleFieldChange}
      onAddressSelect={handleAddressSelect}
      onSubmit={handleSubmit}
    />
  );
};

export default FreeSignupFormContainer;
