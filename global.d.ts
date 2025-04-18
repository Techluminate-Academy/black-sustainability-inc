// global.d.ts
import React from "react";

// Extend React's built‑in ImgHTMLAttributes so <img> can accept `fill` & `blurAmount`.
declare module "react" {
  interface ImgHTMLAttributes<T> {
    /** use-fill (e.g. for Next/Image compatibility) */
    fill?: boolean;
    /** custom blur‐amount prop */
    blurAmount?: number;
  }
}
