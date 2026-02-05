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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Onboarding.tsx:handleComplete',message:'handleComplete called, navigating to /',data:{currentPath:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    navigate("/", { replace: true });
  };

  return <OnboardingWizard onComplete={handleComplete} />;
}
