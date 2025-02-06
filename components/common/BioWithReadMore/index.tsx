import React, { useState } from "react";
import BlurText from "../BlurText";

interface BioWithReadMoreProps {
  bio: string;
  isAuthenticated: boolean;
}

const BioWithReadMore: React.FC<BioWithReadMoreProps> = ({
  bio,
  isAuthenticated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = bio.split(" ");

  const previewBio = words.slice(0, 20).join(" ");

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {isAuthenticated ? (
        <p className={`text-xs`}>
          {isExpanded ? bio : previewBio}
          {!isExpanded && "... "}
          {words.length > 20 && (
            <span
              className="font-bold cursor-pointer "
              onClick={handleToggle}
            >
              {isExpanded ? " Read Less." : " Read More."}
            </span>
          )}
        </p>
      ) : (
        <BlurText
          text={words.toString() || ""}
          blurAmount={1}
        />
      )}
    </>
  );
};

export default BioWithReadMore;
