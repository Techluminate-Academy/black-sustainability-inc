/**
 * Minimal mocks shared by API endpoint tests in `__tests__/api/*`.
 *
 * These helpers do NOT implement real Mongo query semantics — they record the
 * query/pipeline passed in and return canned data. This is good enough to
 * verify query CONSTRUCTION (regex shape, $or vs $and, $nor exclusion,
 * skip/limit, cache keys), which is where most regressions in this codebase
 * have lived. For real query-matching coverage, see the Tier 2 plan that
 * swaps these for `mongodb-memory-server`.
 */

export type Capture = {
  findCalls: any[];
  countCalls: any[];
  aggregateCalls: any[];
  findOneCalls: any[];
  redisGetKeys: string[];
  redisSetCalls: Array<{ key: string; ttl?: number; value: string }>;
  redisSetexCalls: Array<{ key: string; ttl: number; value: string }>;
};

export type FakeFindResult = {
  docs?: any[];
  count?: number;
};

export function makeFakeCollection(opts: {
  findResult?: FakeFindResult | ((query: any) => FakeFindResult);
  aggregateResult?: any[] | ((pipeline: any[]) => any[]);
  findOneResult?: any | ((query: any) => any);
  capture: Capture;
}) {
  const { capture } = opts;

  const resolveFind = (query: any) =>
    typeof opts.findResult === "function"
      ? (opts.findResult as any)(query)
      : opts.findResult ?? { docs: [], count: 0 };

  function makeChain(query: any) {
    let docs: any[] = resolveFind(query).docs ?? [];
    let chain: any;
    chain = {
      sort: (_: any) => chain,
      skip: (_: number) => chain,
      limit: (_: number) => chain,
      project: (_: any) => chain,
      toArray: async () => docs,
    };
    return chain;
  }

  return {
    find: (query: any) => {
      capture.findCalls.push(query);
      return makeChain(query);
    },
    countDocuments: async (query: any) => {
      capture.countCalls.push(query);
      const r = resolveFind(query);
      return typeof r.count === "number" ? r.count : (r.docs?.length ?? 0);
    },
    aggregate: (pipeline: any[]) => {
      capture.aggregateCalls.push(pipeline);
      const docs =
        typeof opts.aggregateResult === "function"
          ? (opts.aggregateResult as any)(pipeline)
          : opts.aggregateResult ?? [];
      return {
        toArray: async () => docs,
      };
    },
    findOne: async (query: any, _projection?: any) => {
      capture.findOneCalls.push(query);
      return typeof opts.findOneResult === "function"
        ? (opts.findOneResult as any)(query)
        : opts.findOneResult ?? null;
    },
  };
}

export function makeFakeRedis(opts: { capture: Capture; getResult?: string | null }) {
  const { capture } = opts;
  return {
    get: async (key: string) => {
      capture.redisGetKeys.push(key);
      return opts.getResult ?? null;
    },
    set: async (key: string, value: string, _modeOrEx?: string, ttl?: number) => {
      capture.redisSetCalls.push({ key, ttl, value });
      return "OK";
    },
    setex: async (key: string, ttl: number, value: string) => {
      capture.redisSetexCalls.push({ key, ttl, value });
      return "OK";
    },
  };
}

export function emptyCapture(): Capture {
  return {
    findCalls: [],
    countCalls: [],
    aggregateCalls: [],
    findOneCalls: [],
    redisGetKeys: [],
    redisSetCalls: [],
    redisSetexCalls: [],
  };
}
