"use client";

import React, { useState, useMemo } from "react";
import BlurText from "../BlurText";

interface BioWithReadMoreProps {
  bio: string;
  isAuthenticated: boolean;
}

const WORD_LIMIT = 20;

const BioWithReadMore: React.FC<BioWithReadMoreProps> = ({
  bio,
  isAuthenticated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // If not logged in, blur the entire bio
  if (!isAuthenticated) {
    return <BlurText text={bio} blurAmount={1} />;
  }

  // Split once for performance
  const words = useMemo(() => bio.trim().split(/\s+/), [bio]);
  const isLong = words.length > WORD_LIMIT;

  // Single source of truth for displayed text
  const displayText = isExpanded
    ? bio
    : isLong
    ? words.slice(0, WORD_LIMIT).join(" ") + "…"
    : bio;

  return (
    <div className="text-xs leading-relaxed">
      <p>{displayText}</p>

      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-1 font-semibold underline focus:outline-none"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Show less bio" : "Read more bio"}
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
};

export default BioWithReadMore;
