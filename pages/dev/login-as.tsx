/**
 * Dev-only: temporary "Sign in as" links for map visibility testing.
 * Only renders when NODE_ENV === "development". 404 in production.
 */
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";

const TEST_USERS = [
  { label: "P1 (Paying)", email: "aoberdorf.3@outlook.com", name: "Alexis Blomqvist" },
  { label: "NP1 (Non-Paying)", email: "martine.malivers@yahoo.com", name: "Martine Malivers" },
  { label: "NP2 (Non-Paying)", email: "congodiamond@gmail.com", name: "Kamau Kenyatta" },
];

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV !== "development") {
    return { notFound: true };
  }
  return { props: {} };
};

export default function DevLoginAsPage() {

  return (
    <>
      <Head>
        <title>Dev: Sign in as (map testing)</title>
      </Head>
      <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>Dev: Sign in as (map visibility testing)</h1>
        <p style={{ color: "#666" }}>
          Sets the <code>bsn_user_data</code> cookie so getMarkers sees you as that user. Development only.
        </p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {TEST_USERS.map((u) => (
            <li key={u.email} style={{ marginBottom: "0.5rem" }}>
              <a href={`/api/dev/login-as?email=${encodeURIComponent(u.email)}`} style={{ marginRight: "0.5rem" }}>
                Sign in as {u.label}
              </a>
              <span style={{ color: "#888" }}>— {u.name} ({u.email})</span>
            </li>
          ))}
        </ul>
        <p>
          <a href="/api/dev/login-as">Sign out (clear cookie)</a>
        </p>
        <p>
          <Link href="/">← Back to map</Link>
        </p>
      </div>
    </>
  );
}
