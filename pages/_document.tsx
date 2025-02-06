import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title> Black Sustainability Inc</title>
        <meta
          name="description"
          content="The Black Sustainability Network is founded on the traditional principles of ubuntu & cooperative work, while connecting frontline solution providers to resources & like-minds through membership."
        ></meta>
        <link
          rel="icon"
          href="https://static.wixstatic.com/media/af8b67_353e724b0ed341bd95192b2eea97c664%7Emv2.jpg/v1/fill/w_32%2Ch_32%2Clg_1%2Cusm_0.66_1.00_0.01/af8b67_353e724b0ed341bd95192b2eea97c664%7Emv2.jpg"
          sizes="any"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Work+Sans:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
