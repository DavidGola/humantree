import { memo } from "react";
import { Link } from "react-router-dom";

const ICON_COLORS = [
  { bg: "bg-primary-500/10", text: "text-primary-500" },
  { bg: "bg-accent-500/10", text: "text-accent-500" },
  { bg: "bg-earth-400/10", text: "text-earth-400" },
];

const ICON_SHAPES = ["🌳", "🌿", "🌲", "🌱"];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface TreeCardProps {
  id: number;
  name: string;
  description: string | null;
  creatorUsername: string;
  tags: string[];
  variant?: "featured" | "compact";
  isFavorited?: boolean;
  onFavorite?: (id: number) => void;
  onTagClick?: (tag: string) => void;
  score?: number;
}

export const TreeCard = memo(function TreeCard({
  id,
  name,
  description,
  creatorUsername,
  tags,
  variant = "compact",
  isFavorited,
  onFavorite,
  onTagClick,
  score,
}: TreeCardProps) {
  const h = hashCode(name);
  const color = ICON_COLORS[h % ICON_COLORS.length];
  const icon = ICON_SHAPES[h % ICON_SHAPES.length];

  const tagElements = tags.length > 0 && (
    <div className="mt-2.5 flex flex-wrap gap-1">
      {tags.slice(0, 5).map((tag) => (
        <button
          key={tag}
          onClick={(e) => {
            e.preventDefault();
            onTagClick?.(tag);
          }}
          className="px-2 py-0.5 text-[10px] rounded-md border border-primary-200 dark:border-primary-800/50 text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-150"
        >
          #{tag}
        </button>
      ))}
      {tags.length > 5 && (
        <span className="px-1.5 py-0.5 text-[10px] text-gray-400 dark:text-slate-500">
          +{tags.length - 5}
        </span>
      )}
    </div>
  );

  if (variant === "featured") {
    return (
      <Link
        to={`/tree/${id}`}
        className="featured-card surface-card rounded-xl p-5 block group transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-0.5"
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${color.bg}`}
          >
            {icon}
          </div>
          {onFavorite && (
            <button
              className={`text-lg transition-colors duration-150 ${
                isFavorited
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-gray-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-500"
              }`}
              onClick={(e) => {
                e.preventDefault();
                onFavorite(id);
              }}
              aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              {isFavorited ? "\u2605" : "\u2606"}
            </button>
          )}
        </div>
        <h3 className="font-display font-semibold text-base text-gray-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-150 line-clamp-1">
          {name}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        )}
        {tagElements}
        <div
          className="mt-4 pt-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <span className="text-xs text-gray-400 dark:text-slate-500">
            @{creatorUsername}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/tree/${id}`}
      className="surface-card rounded-lg p-4 block group transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm ${color.bg}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-gray-800 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-150">
              {name}
            </h3>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {score !== undefined && (
                <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                  {Math.round(score * 100)}%
                </span>
              )}
              {onFavorite && (
                <button
                  className={`text-sm transition-colors duration-150 ${
                    isFavorited
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-gray-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-500"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    onFavorite(id);
                  }}
                  aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  {isFavorited ? "\u2605" : "\u2606"}
                </button>
              )}
            </div>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400 truncate">
            @{creatorUsername}
          </p>
        </div>
      </div>
      {tagElements}
    </Link>
  );
});
