import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  /** Fallback path to navigate to if there's no history */
  fallbackPath?: string;
  /** Custom label for the button */
  label?: string;
  /** Additional className */
  className?: string;
  /** Variant style */
  variant?: "default" | "ghost" | "outline" | "secondary" | "link";
  /** Size */
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Smart back button that uses browser history when available,
 * otherwise falls back to a specified path.
 * 
 * Usage:
 * ```tsx
 * <BackButton fallbackPath="/dashboard" label="Back to Dashboard" />
 * ```
 */
export function BackButton({ 
  fallbackPath = "/dashboard", 
  label = "Back",
  className,
  variant = "ghost",
  size = "sm"
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if there's actual browser history from this origin
    if (window.history.length > 1 && document.referrer.includes(window.location.origin)) {
      navigate(-1);
    } else {
      // No history or external referrer, use fallback
      navigate(fallbackPath);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleBack}
      className={cn("gap-2", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      {label && <span>{label}</span>}
    </Button>
  );
}
