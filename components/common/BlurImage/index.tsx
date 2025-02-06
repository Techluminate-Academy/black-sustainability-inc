import Image from "next/image";
import React, { useEffect, useState } from "react";

interface BlurImageProps {
  imageUrl: string;
  blurAmount: number;
}

const BlurImage: React.FC<BlurImageProps> = ({ imageUrl, blurAmount }) => {
  const [blurredImageUrl, setBlurredImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const img = document.createElement("img");
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get 2D context for canvas");
      }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const newBlurredImageUrl = canvas.toDataURL();
      setBlurredImageUrl(newBlurredImageUrl);
    };
  }, [imageUrl, blurAmount]);

  if (!blurredImageUrl) {
    return null;
  }

  return (
    <div className="bg-[#FFF8E5] relative w-full h-[250px] rounded-xl">
      <Image
        src={blurredImageUrl}
        alt="Blurred"
        fill
        className="rounded-xl object-top object-cover"
      />
    </div>
  );
};

export default BlurImage;
