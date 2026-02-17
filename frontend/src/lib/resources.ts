import { AWSResource } from "./types";

type ResourceTemplate = Omit<AWSResource, "id">;

const AWS_RESOURCE_CATALOG: ResourceTemplate[] = [
  // Compute
  { service: "EC2", category: "compute", displayName: "EC2 インスタンス", description: "仮想サーバー", icon: "🖥️", tier: 1 },
  { service: "ECS", category: "compute", displayName: "ECS", description: "コンテナオーケストレーション", icon: "🐳", tier: 2 },
  { service: "EKS", category: "compute", displayName: "EKS", description: "Kubernetes サービス", icon: "☸️", tier: 3 },
  { service: "Fargate", category: "compute", displayName: "Fargate", description: "サーバーレスコンテナ", icon: "🚀", tier: 2 },

  // Storage
  { service: "S3", category: "storage", displayName: "S3 バケット", description: "オブジェクトストレージ", icon: "🪣", tier: 1 },
  { service: "EBS", category: "storage", displayName: "EBS", description: "ブロックストレージ", icon: "💾", tier: 1 },
  { service: "EFS", category: "storage", displayName: "EFS", description: "ファイルシステム", icon: "📁", tier: 2 },

  // Database
  { service: "RDS", category: "database", displayName: "RDS", description: "リレーショナルDB", icon: "🗄️", tier: 1 },
  { service: "DynamoDB", category: "database", displayName: "DynamoDB", description: "NoSQL DB", icon: "⚡", tier: 2 },
  { service: "Aurora", category: "database", displayName: "Aurora", description: "高性能RDB", icon: "🌟", tier: 3 },
  { service: "ElastiCache", category: "database", displayName: "ElastiCache", description: "インメモリキャッシュ", icon: "🏎️", tier: 2 },

  // Networking
  { service: "VPC", category: "networking", displayName: "VPC", description: "仮想ネットワーク", icon: "🌐", tier: 1 },
  { service: "CloudFront", category: "networking", displayName: "CloudFront", description: "CDN", icon: "🌍", tier: 2 },
  { service: "Route53", category: "networking", displayName: "Route 53", description: "DNS サービス", icon: "🗺️", tier: 1 },
  { service: "ELB", category: "networking", displayName: "ELB", description: "ロードバランサー", icon: "⚖️", tier: 1 },
  { service: "APIGateway", category: "networking", displayName: "API Gateway", description: "API管理", icon: "🚪", tier: 2 },

  // Serverless
  { service: "Lambda", category: "serverless", displayName: "Lambda", description: "サーバーレス関数", icon: "λ", tier: 2 },
  { service: "StepFunctions", category: "serverless", displayName: "Step Functions", description: "ワークフロー", icon: "🔄", tier: 2 },
  { service: "SQS", category: "serverless", displayName: "SQS", description: "メッセージキュー", icon: "📨", tier: 1 },
  { service: "SNS", category: "serverless", displayName: "SNS", description: "通知サービス", icon: "📢", tier: 1 },
  { service: "EventBridge", category: "serverless", displayName: "EventBridge", description: "イベントバス", icon: "🔀", tier: 2 },

  // Security
  { service: "IAM", category: "security", displayName: "IAM", description: "アクセス管理", icon: "🔑", tier: 1 },
  { service: "WAF", category: "security", displayName: "WAF", description: "WebアプリFW", icon: "🛡️", tier: 2 },
  { service: "KMS", category: "security", displayName: "KMS", description: "暗号化キー管理", icon: "🔐", tier: 2 },
  { service: "Cognito", category: "security", displayName: "Cognito", description: "認証サービス", icon: "👤", tier: 2 },
  { service: "CloudWatch", category: "security", displayName: "CloudWatch", description: "モニタリング", icon: "👁️", tier: 1 },
];

let nextId = 0;
//同じカードを区別するために固有idを付与
function instantiate(template: ResourceTemplate): AWSResource {
  return { ...template, id: `${template.service}-${nextId++}` };
}
// 56枚のデッキ作成
export function createResourcePool(): AWSResource[] {
  nextId = 0;
  const pool: AWSResource[] = [];

  for (const template of AWS_RESOURCE_CATALOG) {
    const copies = template.tier === 1 ? 3 : template.tier === 2 ? 2 : 1;
    for (let i = 0; i < copies; i++) {
      pool.push(instantiate(template));
    }
  }

  return shuffleResources(pool);
}

export function shuffleResources(pool: AWSResource[]): AWSResource[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawResources(
  pool: AWSResource[],
  count: number
): { drawn: AWSResource[]; remaining: AWSResource[] } {
  return {
    drawn: pool.slice(0, count),
    remaining: pool.slice(count),
  };
}
