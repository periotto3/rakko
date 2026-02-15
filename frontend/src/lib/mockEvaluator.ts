import { AWSResource, ArchitectureEvaluation } from "./types";

export interface ArchitectureEvaluator {
  evaluate(resources: AWSResource[]): Promise<ArchitectureEvaluation>;
}

// シナジーパターン定義
const SYNERGY_PATTERNS: { services: string[]; bonus: number; label: string }[] = [
  { services: ["Lambda", "APIGateway"], bonus: 10, label: "サーバーレスAPI" },
  { services: ["Lambda", "DynamoDB"], bonus: 8, label: "サーバーレスDB連携" },
  { services: ["Lambda", "SQS"], bonus: 8, label: "非同期処理" },
  { services: ["EC2", "ELB"], bonus: 8, label: "負荷分散構成" },
  { services: ["EC2", "RDS"], bonus: 6, label: "Web+DB構成" },
  { services: ["CloudFront", "S3"], bonus: 8, label: "静的配信" },
  { services: ["ECS", "ELB"], bonus: 8, label: "コンテナLB構成" },
  { services: ["RDS", "ElastiCache"], bonus: 8, label: "DBキャッシュ構成" },
  { services: ["VPC", "EC2"], bonus: 4, label: "ネットワーク基盤" },
  { services: ["VPC", "ECS"], bonus: 4, label: "コンテナネットワーク" },
  { services: ["IAM", "Cognito"], bonus: 6, label: "認証認可基盤" },
  { services: ["CloudWatch", "Lambda"], bonus: 4, label: "監視付きサーバーレス" },
  { services: ["SNS", "SQS"], bonus: 6, label: "Pub/Subメッセージング" },
  { services: ["Route53", "CloudFront"], bonus: 6, label: "グローバル配信" },
  { services: ["StepFunctions", "Lambda"], bonus: 8, label: "オーケストレーション" },
];

// アーキテクチャタイトル判定
const ARCHITECTURE_PATTERNS: { required: string[]; title: string }[] = [
  { required: ["Lambda", "APIGateway", "DynamoDB"], title: "サーバーレスアーキテクチャ" },
  { required: ["EC2", "ELB", "RDS"], title: "3層Webアプリケーション" },
  { required: ["ECS", "ELB", "RDS"], title: "コンテナベースWebアプリ" },
  { required: ["EKS", "ELB"], title: "Kubernetesマイクロサービス" },
  { required: ["CloudFront", "S3", "Lambda"], title: "エッジコンピューティング構成" },
  { required: ["Lambda", "SQS", "DynamoDB"], title: "イベント駆動アーキテクチャ" },
  { required: ["ECS", "SQS", "RDS"], title: "非同期マイクロサービス" },
];

function detectTitle(services: string[]): string {
  for (const pattern of ARCHITECTURE_PATTERNS) {
    if (pattern.required.every((s) => services.includes(s))) {
      return pattern.title;
    }
  }
  return "カスタム構成";
}

function scoreCategory(resources: AWSResource[]): number {
  const categories = new Set(resources.map((r) => r.category));
  const map: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 22, 5: 27, 6: 30 };
  return map[categories.size] ?? 0;
}

function scoreSynergy(resources: AWSResource[]): { score: number; matched: string[] } {
  const services = resources.map((r) => r.service);
  let score = 0;
  const matched: string[] = [];

  for (const pattern of SYNERGY_PATTERNS) {
    if (pattern.services.every((s) => services.includes(s))) {
      score += pattern.bonus;
      matched.push(pattern.label);
    }
  }

  return { score: Math.min(score, 40), matched };
}

function scoreTier(resources: AWSResource[]): number {
  const total = resources.reduce((sum, r) => sum + r.tier, 0);
  return Math.min(Math.round((total / resources.length) * 5), 15);
}

function checkWeaknesses(resources: AWSResource[]): { penalty: number; weaknesses: string[] } {
  const categories = new Set(resources.map((r) => r.category));
  const weaknesses: string[] = [];
  let penalty = 0;

  if (!categories.has("networking")) {
    weaknesses.push("ネットワーク構成が不足");
    penalty += 8;
  }
  if (!categories.has("security")) {
    weaknesses.push("セキュリティ対策が不足");
    penalty += 5;
  }

  const services = resources.map((r) => r.service);
  const uniqueServices = new Set(services);
  if (uniqueServices.size < resources.length) {
    weaknesses.push("リソースに重複あり");
    penalty += 3;
  }

  return { penalty: Math.min(penalty, 15), weaknesses };
}

export class MockArchitectureEvaluator implements ArchitectureEvaluator {
  async evaluate(resources: AWSResource[]): Promise<ArchitectureEvaluation> {
    // API呼び出しをシミュレート
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

    const categoryScore = scoreCategory(resources);
    const { score: synergyScore, matched: strengths } = scoreSynergy(resources);
    const tierScore = scoreTier(resources);
    const { penalty, weaknesses } = checkWeaknesses(resources);
    const noise = Math.floor(Math.random() * 11);

    const rawScore = categoryScore + synergyScore + tierScore - penalty + noise;
    const score = Math.max(0, Math.min(100, rawScore));

    const grade =
      score >= 90 ? "S" : score >= 75 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

    const services = resources.map((r) => r.service);
    const title = detectTitle(services);

    const feedback =
      score >= 75
        ? "よく設計されたアーキテクチャです！"
        : score >= 50
          ? "基本的な構成はできていますが、改善の余地があります。"
          : "構成に課題が多く見られます。";

    return { score, grade, title, feedback, strengths, weaknesses };
  }
}
