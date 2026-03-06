export interface DistributionInput {
  recipient: string;
  kudos: bigint;
}

export interface DistributionItem {
  recipient: string;
  kudos: bigint;
  points: bigint;
  shareNumerator: bigint;
  shareDenominator: bigint;
  remainderRank: number;
}

export interface DistributionResult {
  totalKudos: bigint;
  allocated: bigint;
  remainder: bigint;
  itemCount: number;
  items: DistributionItem[];
}

export function computeDistribution(
  totalPie: bigint,
  inputs: DistributionInput[],
): DistributionResult {
  const totalKudos = inputs.reduce((sum, i) => sum + i.kudos, 0n);

  if (totalKudos === 0n) {
    return {
      totalKudos: 0n,
      allocated: 0n,
      remainder: totalPie,
      itemCount: 0,
      items: [],
    };
  }

  // Calculate base points and remainder numerators
  const working = inputs.map((input) => {
    const basePoints = (input.kudos * totalPie) / totalKudos;
    const remainderNumerator = (input.kudos * totalPie) % totalKudos;
    return {
      recipient: input.recipient,
      kudos: input.kudos,
      basePoints,
      remainderNumerator,
      points: basePoints,
      remainderRank: 0,
    };
  });

  // Leftover to distribute
  const sumBase = working.reduce((sum, w) => sum + w.basePoints, 0n);
  let leftover = totalPie - sumBase;

  // Sort by remainderNumerator DESC, then recipient ASC for deterministic tiebreak
  const ranked = [...working].sort((a, b) => {
    if (a.remainderNumerator !== b.remainderNumerator) {
      return a.remainderNumerator > b.remainderNumerator ? -1 : 1;
    }
    return a.recipient.localeCompare(b.recipient);
  });

  // Distribute leftover one unit at a time
  for (let i = 0; i < ranked.length && leftover > 0n; i++) {
    ranked[i].points += 1n;
    ranked[i].remainderRank = i + 1;
    leftover -= 1n;
  }

  // Build result items in the ranked order
  const items: DistributionItem[] = ranked.map((w) => ({
    recipient: w.recipient,
    kudos: w.kudos,
    points: w.points,
    shareNumerator: w.kudos,
    shareDenominator: totalKudos,
    remainderRank: w.remainderRank,
  }));

  return {
    totalKudos,
    allocated: totalPie,
    remainder: 0n,
    itemCount: items.length,
    items,
  };
}
