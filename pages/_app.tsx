import { SessionProvider } from "next-auth/react";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import usePerformanceMonitoring from "@/hooks/usePerformanceMonitoring";

export default function App({ Component, pageProps }: AppProps) {
  console.log('🚀 App component mounted - initializing performance monitoring');
  // Initialize performance monitoring
  usePerformanceMonitoring();

  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
