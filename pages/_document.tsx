import Document, { Html, Head, Main, NextScript } from 'next/document'
import { GA_TRACKING_ID } from '../lib/gtag'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Mobile viewport and touch support */}
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
          <meta name="format-detection" content="telephone=no" />
          
          {/* Resource hints for performance */}
          <link rel="preconnect" href="https://www.googletagmanager.com" />
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
          <link rel="preconnect" href="https://*.airtableusercontent.com" />
          <link rel="dns-prefetch" href="https://*.airtableusercontent.com" />
          <link rel="preconnect" href="https://api.mapbox.com" />
          <link rel="dns-prefetch" href="https://api.mapbox.com" />
          <style dangerouslySetInnerHTML={{
            __html: `
              html, body {
                height: 100%;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                touch-action: pan-y;
              }
              body {
                margin: 0;
                padding: 0;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
              }
            `
          }} />
          {/* Google tag (gtag.js) - Deferred to prevent render blocking */}
          <script
            async
            defer
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <script
            defer
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}');
              `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument