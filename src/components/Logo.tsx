import { cn } from "@/lib/utils";

type LogoVariant = "symbol" | "full" | "horizontal" | "text";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize | number;
  className?: string;
}

const sizeMap: Record<LogoSize, number> = {
  sm: 40,
  md: 48,
  lg: 64,
};

const wideSizeMap: Record<LogoSize, number> = {
  sm: 160,
  md: 200,
  lg: 280,
};

const variantSrc: Record<LogoVariant, string> = {
  symbol: "/logo/logo.svg",
  full: "/logo/logo-con-scritta.svg",
  horizontal: "/logo/logo-orizzontale.svg",
  text: "/logo/scritta-only.svg",
};

const Logo = ({ variant = "symbol", size = "md", className }: LogoProps) => {
  const px = typeof size === "number" ? size : sizeMap[size];

  const isWide = variant === "horizontal" || variant === "full" || variant === "text";
  const wideWidth = typeof size === "number" ? Math.round(px * 4.2) : wideSizeMap[size];

  return (
    <img
      src={variantSrc[variant]}
      alt="Milano Help"
      className={cn("block", className)}
      style={
        isWide
          ? { height: px, width: wideWidth, objectFit: "contain" }
          : { width: px, height: px }
      }
    />
  );
};

export default Logo;
