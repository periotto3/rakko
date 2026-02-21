import { Suit } from "./types";

const BASE_URL =
  "https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v19.0/dist";

export const AWS_SERVICES: {
  label: string;
  suit: Suit;
  rank: number;
  imageUrl: string;
}[] = [
  // Compute (ranks 1-7)
  { label: "EC2",      suit: "compute", rank: 1,  imageUrl: `${BASE_URL}/Compute/EC2.png` },
  { label: "Lambda",   suit: "compute", rank: 2,  imageUrl: `${BASE_URL}/Compute/Lambda.png` },
  { label: "ECS",      suit: "compute", rank: 3,  imageUrl: `${BASE_URL}/Containers/ElasticContainerService.png` },
  { label: "EKS",      suit: "compute", rank: 4,  imageUrl: `${BASE_URL}/Containers/ElasticKubernetesService.png` },
  { label: "Fargate",  suit: "compute", rank: 5,  imageUrl: `${BASE_URL}/Containers/Fargate.png` },
  { label: "SAM",      suit: "compute", rank: 6,  imageUrl: `${BASE_URL}/Compute/ServerlessApplicationModel.png` },
  { label: "CDK",      suit: "compute", rank: 7,  imageUrl: `${BASE_URL}/DeveloperTools/CloudDevelopmentKit.png` },
  // Storage (ranks 8-13)
  { label: "S3",       suit: "storage", rank: 8,  imageUrl: `${BASE_URL}/Storage/SimpleStorageService.png` },
  { label: "EBS",      suit: "storage", rank: 9,  imageUrl: `${BASE_URL}/Storage/ElasticBlockStore.png` },
  { label: "EFS",      suit: "storage", rank: 10, imageUrl: `${BASE_URL}/Storage/ElasticFileSystem.png` },
  { label: "Glacier",  suit: "storage", rank: 11, imageUrl: `${BASE_URL}/Storage/Glacier.png` },
  { label: "DataSync", suit: "storage", rank: 12, imageUrl: `${BASE_URL}/Storage/DataSync.png` },
  { label: "Snowball", suit: "storage", rank: 13, imageUrl: `${BASE_URL}/Storage/Snowball.png` },
  // Database (ranks 14-19)
  { label: "RDS",      suit: "database", rank: 14, imageUrl: `${BASE_URL}/Database/RDS.png` },
  { label: "DynamoDB", suit: "database", rank: 15, imageUrl: `${BASE_URL}/Database/DynamoDB.png` },
  { label: "E.Cache",  suit: "database", rank: 16, imageUrl: `${BASE_URL}/Database/ElastiCache.png` },
  { label: "Aurora",   suit: "database", rank: 17, imageUrl: `${BASE_URL}/Database/Aurora.png` },
  { label: "Redshift", suit: "database", rank: 18, imageUrl: `${BASE_URL}/Database/Redshift.png` },
  { label: "Neptune",  suit: "database", rank: 19, imageUrl: `${BASE_URL}/Database/Neptune.png` },
  // Network (ranks 20-26)
  { label: "VPC",      suit: "network", rank: 20, imageUrl: `${BASE_URL}/NetworkingContentDelivery/VirtualPrivateCloud.png` },
  { label: "C.Front",  suit: "network", rank: 21, imageUrl: `${BASE_URL}/NetworkingContentDelivery/CloudFront.png` },
  { label: "Route 53", suit: "network", rank: 22, imageUrl: `${BASE_URL}/NetworkingContentDelivery/Route53.png` },
  { label: "API GW",   suit: "network", rank: 23, imageUrl: `${BASE_URL}/ApplicationIntegration/APIGateway.png` },
  { label: "WAF",      suit: "network", rank: 24, imageUrl: `${BASE_URL}/SecurityIdentityCompliance/WAF.png` },
  { label: "C.Watch",  suit: "network", rank: 25, imageUrl: `${BASE_URL}/ManagementGovernance/CloudWatch.png` },
  { label: "IAM",      suit: "network", rank: 26, imageUrl: `${BASE_URL}/SecurityIdentityCompliance/IAM.png` },
];

export const JOKER_IMAGE_URL = `${BASE_URL}/ManagementGovernance/Billing.png`;
