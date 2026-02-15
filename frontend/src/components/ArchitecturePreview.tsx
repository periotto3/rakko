import { AWSResource } from "@/lib/types";
import ResourceCard from "./ResourceCard";

type Props = {
  resources: AWSResource[];
  maxSelect?: number;
  selectedIds?: Set<string>;
  onToggle?: (resourceId: string) => void;
};

export default function ArchitecturePreview({
  resources,
  maxSelect,
  selectedIds,
  onToggle,
}: Props) {
  return (
    <div className="space-y-2">
      {maxSelect && selectedIds && (
        <p className="text-slate-400 text-xs text-center">
          {selectedIds.size}/{maxSelect} 選択中
        </p>
      )}
      <div className="flex gap-2 flex-wrap justify-center">
        {resources.map((r) => (
          <ResourceCard
            key={r.id}
            resource={r}
            selected={selectedIds?.has(r.id)}
            onClick={onToggle ? () => onToggle(r.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
