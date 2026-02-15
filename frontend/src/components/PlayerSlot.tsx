import { Player } from "@/lib/types";
import ResourceCard from "./ResourceCard";

type Props = {
  player: Player;
  isCurrentUser?: boolean;
  showHand?: boolean;
  onCardClick?: (index: number) => void;
  selectedCardIndices?: Set<number>;
};

export default function PlayerSlot({
  player,
  isCurrentUser,
  showHand,
  onCardClick,
  selectedCardIndices,
}: Props) {
  return (
    <div
      className={`rounded-xl p-3 ${
        isCurrentUser
          ? "bg-slate-800 border-2 border-blue-500"
          : "bg-slate-700 border border-slate-600"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{player.avatar}</span>
        <span className="text-white font-bold text-sm">{player.name}</span>
        {player.isCPU && (
          <span className="text-[10px] bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">
            CPU
          </span>
        )}
        {player.evaluation && (
          <span
            className={`ml-auto text-sm font-bold ${
              player.evaluation.grade === "S"
                ? "text-yellow-400"
                : player.evaluation.grade === "A"
                  ? "text-green-400"
                  : player.evaluation.grade === "B"
                    ? "text-blue-400"
                    : player.evaluation.grade === "C"
                      ? "text-orange-400"
                      : "text-gray-400"
            }`}
          >
            {player.evaluation.grade} ({player.evaluation.score}点)
          </span>
        )}
      </div>

      {showHand && player.hand.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {player.hand.map((resource, i) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              selected={selectedCardIndices?.has(i) ?? false}
              onClick={onCardClick ? () => onCardClick(i) : undefined}
              compact={!isCurrentUser}
            />
          ))}
        </div>
      )}

      {!showHand && player.hand.length > 0 && (
        <div className="flex gap-1">
          {player.hand.map((_, i) => (
            <div
              key={i}
              className="w-6 h-8 rounded bg-slate-500 border border-slate-400"
            />
          ))}
        </div>
      )}
    </div>
  );
}
