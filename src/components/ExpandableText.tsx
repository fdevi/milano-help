import { useState } from "react";

interface ExpandableTextProps {
  text: string;
  lines?: number;
}

const ExpandableText = ({ text, lines = 5 }: ExpandableTextProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={`text-foreground/80 whitespace-pre-line leading-relaxed ${
          !expanded ? `line-clamp-${lines}` : ""
        }`}
        style={!expanded ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {text}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-sm font-medium text-primary hover:underline focus:outline-none"
      >
        {expanded ? "Riduci ↑" : "Leggi tutto ↓"}
      </button>
    </div>
  );
};

export default ExpandableText;
