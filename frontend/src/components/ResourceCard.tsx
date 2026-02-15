import { AWSResource, AWSCategory } from "@/lib/types";

const CATEGORY_COLORS: Record<AWSCategory, string> = {
  compute: "bg-orange-100 text-orange-800 border-orange-300",
  storage: "bg-blue-100 text-blue-800 border-blue-300",
  database: "bg-purple-100 text-purple-800 border-purple-300",
  networking: "bg-green-100 text-green-800 border-green-300",
  serverless: "bg-yellow-100 text-yellow-800 border-yellow-300",
  security: "bg-red-100 text-red-800 border-red-300",
};

const CATEGORY_BG: Record<AWSCategory, string> = {
  compute: "border-orange-400",
  storage: "border-blue-400",
  database: "border-purple-400",
  networking: "border-green-400",
  serverless: "border-yellow-400",
  security: "border-red-400",
};

const CATEGORY_LABELS: Record<AWSCategory, string> = {
  compute: "コンピュート",
  storage: "ストレージ",
  database: "データベース",
  networking: "ネットワーク",
  serverless: "サーバーレス",
  security: "セキュリティ",
};

type Props = {
  resource: AWSResource;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
};

export default function ResourceCard({ resource, selected, onClick, compact }: Props) {
  const tierStars = "★".repeat(resource.tier) + "☆".repeat(3 - resource.tier);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${CATEGORY_BG[resource.category]} ${
          selected ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
        }`}
      >
        <span>{resource.icon}</span>
        <span className="font-medium">{resource.service}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-28 rounded-lg border-2 p-2 transition-all cursor-pointer ${
        CATEGORY_BG[resource.category]
      } ${
        selected
          ? "ring-2 ring-blue-500 scale-105 shadow-lg bg-blue-50"
          : "bg-white hover:shadow-md hover:scale-102"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="text-center text-2xl mb-1">{resource.icon}</div>
      <div className="text-center text-xs font-bold truncate">{resource.service}</div>
      <div className="text-center text-[10px] text-gray-500 truncate">{resource.description}</div>
      <div className="flex items-center justify-between mt-1">
        <span
          className={`text-[9px] px-1 rounded ${CATEGORY_COLORS[resource.category]}`}
        >
          {CATEGORY_LABELS[resource.category]}
        </span>
        <span className="text-[10px] text-amber-500">{tierStars}</span>
      </div>
    </div>
  );
}
