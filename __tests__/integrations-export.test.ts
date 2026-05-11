/**
 * @jest-environment node
 */
describe("lib/integrations re-exports", () => {
  it("exports connectToDatabase from mongodb integration", async () => {
    const { connectToDatabase } = await import("@/lib/integrations/mongodb");
    expect(typeof connectToDatabase).toBe("function");
  });

  it("exports mighty helpers", async () => {
    const mighty = await import("@/lib/integrations/mighty");
    expect(typeof mighty.mightyGetMemberByEmail).toBe("function");
  });
});
