import { JourneyProgress, type JourneyStage } from "./JourneyProgress";

export const SELLER_STAGES: JourneyStage[] = [
  { key: "preparing", label: "Preparing", description: "Getting your home ready" },
  { key: "listed", label: "Listed", description: "Your home is on the market" },
  { key: "showing", label: "Showing", description: "Buyers are touring your home" },
  { key: "offer_received", label: "Offer Received", description: "An offer has been submitted" },
  { key: "negotiating", label: "Negotiating", description: "Working out the details" },
  { key: "under_contract", label: "Under Contract", description: "Offer accepted!" },
  { key: "inspection", label: "Inspection", description: "Buyer inspection period" },
  { key: "appraisal", label: "Appraisal", description: "Property appraisal" },
  { key: "closing", label: "Closing", description: "Signing final documents" },
  { key: "closed", label: "Closed!", description: "Congratulations on your sale!" },
];

export interface SellerJourneyProps {
  currentStage: string | null | undefined;
  onStageClick?: (stageKey: string) => void;
  className?: string;
}

export function SellerJourney({ currentStage, onStageClick, className }: SellerJourneyProps) {
  return (
    <JourneyProgress
      stages={SELLER_STAGES}
      currentStage={currentStage}
      orientation="vertical"
      onStageClick={onStageClick}
      className={className}
    />
  );
}

export default SellerJourney;
