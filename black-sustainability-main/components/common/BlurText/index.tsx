import React, { useEffect, useState } from "react";

interface BlurTextProps {
  text: string;
  blurAmount: number;
  color?: string;
}

const BlurText: React.FC<BlurTextProps> = ({
  text,
  blurAmount,
  color = "grey",
}) => {
  const [blurredText, setBlurredText] = useState<string>("");

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D context for canvas");
    }

    ctx.font = "4px Work Sans";
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + blurAmount * 2;
    canvas.height = 24;
    ctx.fillStyle = color;
    ctx.fillText(text, blurAmount, 20);

    // Apply the blur effect
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    ctx.filter = "none"; // Reset the filter

    ctx.fillText(text, blurAmount - 10, 19);

    setBlurredText(canvas.toDataURL());
  }, [text, blurAmount, color]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={blurredText}
      alt="Blurred Text"
      className="blur"
    />
  );
};

export default BlurText;
