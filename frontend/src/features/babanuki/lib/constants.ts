import { Suit } from "./types";

const BASE_URL =
  "https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v19.0/dist";

export const AWS_SERVICES: {
  label: string;
  suit: Suit;
  rank: number;
  imageUrl: string;
}[] = [
  // Compute
  { label: "EC2",            suit: "compute",  rank: 1,  imageUrl: `${BASE_URL}/Compute/EC2.png` },
  { label: "Lambda",         suit: "compute",  rank: 2,  imageUrl: `${BASE_URL}/Compute/Lambda.png` },
  { label: "ECS",            suit: "compute",  rank: 3,  imageUrl: `${BASE_URL}/Containers/ElasticContainerService.png` },
  { label: "Bedrock",        suit: "compute",  rank: 4,  imageUrl: `${BASE_URL}/ArtificialIntelligence/Bedrock.png` },
  // Storage / DB
  { label: "S3",             suit: "storage",  rank: 5,  imageUrl: `${BASE_URL}/Storage/SimpleStorageService.png` },
  { label: "RDS",            suit: "database", rank: 6,  imageUrl: `${BASE_URL}/Database/RDS.png` },
  { label: "DynamoDB",       suit: "database", rank: 7,  imageUrl: `${BASE_URL}/Database/DynamoDB.png` },
  // Network / Integration
  { label: "API Gateway",    suit: "network",  rank: 8,  imageUrl: `${BASE_URL}/NetworkingContentDelivery/APIGateway.png` },
  { label: "Amplify",        suit: "network",  rank: 9,  imageUrl: `${BASE_URL}/FrontEndWebMobile/Amplify.png` },
  { label: "IAM",            suit: "network",  rank: 10, imageUrl: `${BASE_URL}/SecurityIdentityCompliance/IdentityandAccessManagement.png` },
  { label: "CloudWatch",     suit: "network",  rank: 11, imageUrl: `${BASE_URL}/ManagementGovernance/CloudWatch.png` },
  { label: "Cognito",        suit: "network",  rank: 12, imageUrl: `${BASE_URL}/SecurityIdentityCompliance/Cognito.png` },
  { label: "Cloud Formation", suit: "network",  rank: 13, imageUrl: `${BASE_URL}/ManagementGovernance/CloudFormation.png` },
];

export const JOKER_IMAGE_URL = `${BASE_URL}/ManagementGovernance/Billing.png`;
