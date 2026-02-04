import { useNavigate } from "react-router-dom";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function Onboarding() {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("onboarding_started");
  }, []);

  const handleComplete = () => {
    navigate("/", { replace: true });
  };

  return <OnboardingWizard onComplete={handleComplete} />;
}
