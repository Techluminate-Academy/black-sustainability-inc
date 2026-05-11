import { MIGHTY_PAID_STATUS_MONGO_PATH } from "@/lib/domain/billing/isPaidActiveAuthority";

describe("lib/domain/billing/isPaidActiveAuthority", () => {
  it("documents the Mongo path for map paid visibility", () => {
    expect(MIGHTY_PAID_STATUS_MONGO_PATH).toBe("subscription.isPaidActive");
  });
});
