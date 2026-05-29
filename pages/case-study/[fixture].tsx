import Head from "next/head";
import type { GetServerSideProps } from "next";
import { CaseStudyFixtureView } from "../../features/case-study/CaseStudyFixtureView";
import {
  FIXTURE_SLUGS,
  isCaseStudyFixtureSlug,
  type CaseStudyFixtureSlug,
} from "../../lib/caseStudyFixtures";

type Props = { fixture: CaseStudyFixtureSlug };

function fixturesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.E2E_TEST_ENABLED === "1" ||
    process.env.CASE_STUDY_FIXTURES_ENABLED === "1"
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const raw = String(ctx.params?.fixture ?? "");
  if (!fixturesEnabled()) {
    return { notFound: true };
  }
  if (!isCaseStudyFixtureSlug(raw)) {
    return { notFound: true };
  }
  return { props: { fixture: raw } };
};

export default function CaseStudyFixturePage({ fixture }: Props) {
  return (
    <>
      <Head>
        <title>Case study fixture — {fixture}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <CaseStudyFixtureView fixture={fixture} />
    </>
  );
}

export { FIXTURE_SLUGS };
