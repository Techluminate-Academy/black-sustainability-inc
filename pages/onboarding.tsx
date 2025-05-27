"use client";

import React from "react";
import DynamicForm from "@/components/DynamicForm/DynamicForm";

export default function OnboardingPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Member Onboarding</h1>
      <DynamicForm />
    </div>
  );
}
