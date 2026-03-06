import type { Event } from "./schemas/event.js";
import type { DistributionResult } from "./distribution.js";

/**
 * Convert a bigint to a JSON-safe value.
 * Returns number when safe, string for values exceeding Number.MAX_SAFE_INTEGER.
 * Useful for aggregate/settlement values (totalKudos, distribution amounts).
 */
export function bigintToJSON(value: bigint): number | string {
  return value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value.toString();
}

/**
 * Convert a bigint to a base-10 string.
 * Used for settlement-grade wire formats where all numeric values must be strings.
 */
export function bigintToString(value: bigint): string {
  return value.toString();
}

/**
 * Serialize an Event for JSON wire output.
 * Currently a passthrough since event kudos are numbers,
 * but provides a stable boundary for future bigint migration.
 */
export function serializeEvent(event: Event): Record<string, unknown> {
  return { ...event };
}

/**
 * Serialize a DistributionResult for JSON wire output.
 * All settlement values are base-10 strings per spec.
 */
export function serializeDistribution(
  result: DistributionResult,
  poolId: string,
  totalPie: bigint,
): Record<string, unknown> {
  return {
    status: "success",
    poolId,
    totalPie: bigintToString(totalPie),
    totalKudos: bigintToString(result.totalKudos),
    allocated: bigintToString(result.allocated),
    remainder: bigintToString(result.remainder),
    itemCount: result.itemCount,
    roundingMode: "LARGEST_REMAINDER",
    items: result.items.map((item) => ({
      recipient: item.recipient,
      kudos: bigintToString(item.kudos),
      points: bigintToString(item.points),
      shareNumerator: bigintToString(item.shareNumerator),
      shareDenominator: bigintToString(item.shareDenominator),
      remainderRank: item.remainderRank,
    })),
  };
}
