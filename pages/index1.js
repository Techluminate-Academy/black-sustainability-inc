"use client";
import React from "react";
import Image from "next/image";

interface CustomIconContentProps {
  
}

const CustomIconContent: React.FC<CustomIconContentProps> = () => {
  const bgColor = 'black'

  return (
    <div
      style={{
        width: "50px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: bgColor,
        borderColor: bgColor,
        transform: "rotate(-35deg)",
        borderRadius: "52% 52% 100% 0% / 95% 38% 62% 5%",
        position: "relative",
        border: '1.9px solid', // even bigger border works now
        boxSizing: "border-box", // <-- Add this line
      }}
    >
    
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "127%",
            height: "125%",
            transform: "translate(-50%, -50%) rotate(35deg)",
          }}
        >
          <Image
           src={"https://plus.unsplash.com/premium_photo-1689568126014-06fea9d5d341?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8cHJvZmlsZXxlbnwwfHwwfHx8MA%3D%3D"}
            alt="member"
            width={60} // Set width and height to match the div's size
            height={64}
            loading="lazy"
            style={{
              width: "100%",
              // marginTop:'10px',
              height: "100%",
              objectFit: "cover",
              backgroundColor: "white",
            }}
          />
        </div>
    </div>
  );
};

export default CustomIconContent;
