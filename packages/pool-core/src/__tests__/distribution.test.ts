import { describe, it, expect } from "vitest";
import { computeDistribution } from "../distribution.js";
import type { DistributionInput } from "../distribution.js";

describe("computeDistribution", () => {
  it("empty pool returns remainder = totalPie, no items", () => {
    const result = computeDistribution(1000n, []);
    expect(result.totalKudos).toBe(0n);
    expect(result.allocated).toBe(0n);
    expect(result.remainder).toBe(1000n);
    expect(result.itemCount).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("single recipient gets all of totalPie", () => {
    const inputs: DistributionInput[] = [
      { recipient: "email:alice@example.com", kudos: 100n },
    ];
    const result = computeDistribution(5000n, inputs);
    expect(result.totalKudos).toBe(100n);
    expect(result.allocated).toBe(5000n);
    expect(result.remainder).toBe(0n);
    expect(result.itemCount).toBe(1);
    expect(result.items[0].points).toBe(5000n);
    expect(result.items[0].recipient).toBe("email:alice@example.com");
  });

  it("two recipients, even split", () => {
    const inputs: DistributionInput[] = [
      { recipient: "email:alice@example.com", kudos: 50n },
      { recipient: "email:bob@example.com", kudos: 50n },
    ];
    const result = computeDistribution(1000n, inputs);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].points).toBe(500n);
    expect(result.items[1].points).toBe(500n);
  });

  it("three recipients with remainder uses largest-remainder method", () => {
    const inputs: DistributionInput[] = [
      { recipient: "email:alice@example.com", kudos: 1n },
      { recipient: "email:bob@example.com", kudos: 1n },
      { recipient: "email:carol@example.com", kudos: 1n },
    ];
    const result = computeDistribution(10n, inputs);

    // 10 / 3 = 3 each base, leftover = 1
    // All have same remainder (10 % 3 = 1 each), so tiebreak by recipient ASC
    // alice gets the extra point
    const sum = result.items.reduce((s, i) => s + i.points, 0n);
    expect(sum).toBe(10n);
    expect(result.allocated).toBe(10n);
    expect(result.remainder).toBe(0n);

    const alice = result.items.find((i) => i.recipient === "email:alice@example.com")!;
    const bob = result.items.find((i) => i.recipient === "email:bob@example.com")!;
    const carol = result.items.find((i) => i.recipient === "email:carol@example.com")!;
    expect(alice.points).toBe(4n);
    expect(bob.points).toBe(3n);
    expect(carol.points).toBe(3n);
  });

  it("invariant: sum of points always equals totalPie", () => {
    const inputs: DistributionInput[] = [
      { recipient: "email:a@example.com", kudos: 33n },
      { recipient: "email:b@example.com", kudos: 33n },
      { recipient: "email:c@example.com", kudos: 34n },
    ];
    for (const pie of [100n, 1000n, 9999n, 1n, 3n, 7n]) {
      const result = computeDistribution(pie, inputs);
      const sum = result.items.reduce((s, i) => s + i.points, 0n);
      expect(sum).toBe(pie);
    }
  });

  it("determinism: same input twice produces identical output", () => {
    const inputs: DistributionInput[] = [
      { recipient: "email:alice@example.com", kudos: 7n },
      { recipient: "email:bob@example.com", kudos: 3n },
      { recipient: "email:carol@example.com", kudos: 11n },
    ];
    const r1 = computeDistribution(1000n, inputs);
    const r2 = computeDistribution(1000n, inputs);
    expect(r1.items.map((i) => [i.recipient, i.points.toString()]))
      .toEqual(r2.items.map((i) => [i.recipient, i.points.toString()]));
  });

  it("deterministic tiebreak by recipient name", () => {
    // Same kudos → same remainder → tiebreak by recipient ASC
    const inputs: DistributionInput[] = [
      { recipient: "email:zara@example.com", kudos: 1n },
      { recipient: "email:adam@example.com", kudos: 1n },
    ];
    const result = computeDistribution(3n, inputs);
    // 3/2 = 1 each, leftover = 1
    // Both have remainder 1, tiebreak: adam < zara
    const adam = result.items.find((i) => i.recipient === "email:adam@example.com")!;
    const zara = result.items.find((i) => i.recipient === "email:zara@example.com")!;
    expect(adam.points).toBe(2n);
    expect(zara.points).toBe(1n);
    expect(adam.remainderRank).toBe(1);
    expect(zara.remainderRank).toBe(0); // didn't receive extra
  });

  it("large totalPie values work with bigint math", () => {
    const largePie = 10n ** 30n;
    const inputs: DistributionInput[] = [
      { recipient: "email:alice@example.com", kudos: 1n },
      { recipient: "email:bob@example.com", kudos: 2n },
    ];
    const result = computeDistribution(largePie, inputs);
    const sum = result.items.reduce((s, i) => s + i.points, 0n);
    expect(sum).toBe(largePie);

    const alice = result.items.find((i) => i.recipient === "email:alice@example.com")!;
    const bob = result.items.find((i) => i.recipient === "email:bob@example.com")!;
    // bob should have ~2x alice
    expect(bob.points).toBeGreaterThan(alice.points);
  });

  it("itemCount matches items array length", () => {
    const inputs: DistributionInput[] = [
      { recipient: "email:a@example.com", kudos: 10n },
      { recipient: "email:b@example.com", kudos: 20n },
      { recipient: "email:c@example.com", kudos: 30n },
    ];
    const result = computeDistribution(100n, inputs);
    expect(result.itemCount).toBe(result.items.length);
    expect(result.itemCount).toBe(3);
  });

  it("shareNumerator and shareDenominator are set correctly", () => {
    const inputs: DistributionInput[] = [
      { recipient: "email:alice@example.com", kudos: 3n },
      { recipient: "email:bob@example.com", kudos: 7n },
    ];
    const result = computeDistribution(100n, inputs);
    for (const item of result.items) {
      expect(item.shareNumerator).toBe(item.kudos);
      expect(item.shareDenominator).toBe(10n);
    }
  });
});
