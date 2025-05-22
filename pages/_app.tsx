import { SessionProvider } from "next-auth/react";
// 1) Bootstrap’s CSS (for grid, nav, tabs, etc.)
import "bootstrap/dist/css/bootstrap.min.css";
import "formiojs/dist/formio.full.min.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
    <Component {...pageProps} />;
    </SessionProvider>
  )
 
}
