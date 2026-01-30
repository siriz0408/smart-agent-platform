import { JourneyProgress, type JourneyStage } from "./JourneyProgress";

export const BUYER_STAGES: JourneyStage[] = [
  { key: "browsing", label: "Browsing", description: "Exploring properties online" },
  { key: "interested", label: "Interested", description: "Saved properties you like" },
  { key: "touring", label: "Touring", description: "Scheduling and attending tours" },
  { key: "offer_prep", label: "Offer Prep", description: "Preparing your offer" },
  { key: "offer_submitted", label: "Offer Submitted", description: "Offer sent to seller" },
  { key: "negotiating", label: "Negotiating", description: "Back and forth with seller" },
  { key: "under_contract", label: "Under Contract", description: "Offer accepted!" },
  { key: "inspection", label: "Inspection", description: "Property inspection period" },
  { key: "appraisal", label: "Appraisal", description: "Lender appraisal" },
  { key: "final_walkthrough", label: "Final Walkthrough", description: "Last look before closing" },
  { key: "closing", label: "Closing", description: "Signing final documents" },
  { key: "closed", label: "Closed!", description: "Congratulations, you own it!" },
];

export interface BuyerJourneyProps {
  currentStage: string | null | undefined;
  onStageClick?: (stageKey: string) => void;
  className?: string;
}

export function BuyerJourney({ currentStage, onStageClick, className }: BuyerJourneyProps) {
  return (
    <JourneyProgress
      stages={BUYER_STAGES}
      currentStage={currentStage}
      orientation="horizontal"
      onStageClick={onStageClick}
      className={className}
    />
  );
}

export default BuyerJourney;
