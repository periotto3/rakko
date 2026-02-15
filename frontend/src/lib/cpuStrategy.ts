import { AWSResource, CPUPersonality } from "./types";

const PERSONALITY_PREFERENCES: Record<CPUPersonality, string[]> = {
  "serverless-fan": ["Lambda", "APIGateway", "DynamoDB", "SQS", "SNS", "StepFunctions", "EventBridge", "S3", "Cognito"],
  traditional: ["EC2", "ELB", "RDS", "VPC", "EBS", "Route53", "IAM", "CloudWatch", "ElastiCache"],
  balanced: [],
};

function preferenceScore(resource: AWSResource, personality: CPUPersonality): number {
  const preferred = PERSONALITY_PREFERENCES[personality];
  if (preferred.length === 0) {
    return resource.tier;
  }
  const inPreferred = preferred.includes(resource.service);
  return (inPreferred ? 10 : 0) + resource.tier;
}

export function decideCPUDiscard(hand: AWSResource[], personality: CPUPersonality): number[] {
  if (hand.length === 0) return [];

  // CPUは1〜2枚捨てる（ランダム性を持たせる）
  const discardCount = Math.random() < 0.6 ? 1 : 2;

  const scored = hand.map((r, i) => ({ index: i, score: 0 }));

  if (personality === "balanced") {
    const categoryCounts = new Map<string, number>();
    for (const r of hand) {
      categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1);
    }
    for (const item of scored) {
      const dupPenalty = (categoryCounts.get(hand[item.index].category) ?? 0) > 1 ? -5 : 0;
      item.score = hand[item.index].tier + dupPenalty;
    }
  } else {
    for (const item of scored) {
      item.score = preferenceScore(hand[item.index], personality);
    }
  }

  // スコアが低い順にソートして、上位discardCount個を捨てる
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, discardCount).map((s) => s.index);
}

export function decideCPUBuildSelection(
  hand: AWSResource[],
  personality: CPUPersonality
): AWSResource[] {
  if (hand.length <= 5) return hand;

  if (personality === "balanced") {
    const selectedCategories = new Set<string>();
    const selected: AWSResource[] = [];
    const sorted = [...hand].sort((a, b) => b.tier - a.tier);

    for (const r of sorted) {
      if (selected.length >= 5) break;
      if (!selectedCategories.has(r.category)) {
        selected.push(r);
        selectedCategories.add(r.category);
      }
    }

    for (const r of sorted) {
      if (selected.length >= 5) break;
      if (!selected.includes(r)) {
        selected.push(r);
      }
    }

    return selected;
  }

  const scored = hand.map((r) => ({
    resource: r,
    score: preferenceScore(r, personality),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.resource);
}
