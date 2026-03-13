import { cn } from "@/lib/utils";

type LogoVariant = "symbol" | "full" | "horizontal" | "text";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize | number;
  className?: string;
}

const sizeMap: Record<LogoSize, number> = {
  sm: 48,   // 48px per footer
  md: 64,   // 64px per navbar
  lg: 96,   // 96px per login
};

const variantSrc: Record<LogoVariant, string> = {
  symbol: "/logo/logo.svg",
  full: "/logo/logo-con-scritta.svg",
  horizontal: "/logo/logo-orizzontale.svg",
  text: "/logo/scritta-only.svg",
};

const Logo = ({ variant = "symbol", size = "md", className }: LogoProps) => {
  const px = typeof size === "number" ? size : sizeMap[size];

  // For horizontal/full/text variants, height = px, width auto
  const isWide = variant === "horizontal" || variant === "full" || variant === "text";

  return (
    <img
      src={variantSrc[variant]}
      alt="Milano Help"
      className={cn("block", className)}
      style={
        isWide
          ? { height: px, width: "auto" }
          : { width: px, height: px }
      }
    />
  );
};

export default Logo;