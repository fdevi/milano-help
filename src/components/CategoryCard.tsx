import { motion } from "framer-motion";
import { icons, LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CategoryCardProps {
  iconName: string;
  title: string;
  color: string;
  delay?: number;
  onClick?: () => void;
}

const CATEGORY_COLORS = [
  "#1a9068", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48",
];

const CategoryCard = ({ iconName, title, color, delay = 0, onClick }: CategoryCardProps) => {
  const Icon = (icons as Record<string, LucideIcon>)[iconName] || icons.Circle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer border"
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: color + "18", color }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-heading font-bold text-foreground mb-2">{title}</h3>
    </motion.div>
  );
};

export { CATEGORY_COLORS };
export default CategoryCard;
