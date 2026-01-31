import { shortenHash } from "@/lib/buildInfo";

describe("buildInfo", () => {
  it("shortens long hashes to 8 chars by default", () => {
    expect(shortenHash("a1b2c3d4e5f6")).toBe("a1b2c3d4");
  });

  it("keeps short hashes as-is", () => {
    expect(shortenHash("a1b2c3d4")).toBe("a1b2c3d4");
  });

  it("returns empty string for empty input", () => {
    expect(shortenHash(" ")).toBe("");
  });

  it("enforces length bounds", () => {
    expect(shortenHash("a1b2c3d4e5f6", 5)).toBe("a1b2c3d");
    expect(shortenHash("a1b2c3d4e5f6", 20)).toBe("a1b2c3d4e5f6".slice(0, 12));
  });
});
