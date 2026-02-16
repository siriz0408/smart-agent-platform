import { Cable, Calendar, Mail, Database, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActiveConnector {
  name: string;
  connector_key: string;
  category: string;
  icon?: string;
}

interface ActiveConnectorsBadgeProps {
  connectors: ActiveConnector[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  calendar: <Calendar className="h-3 w-3" />,
  communication: <Mail className="h-3 w-3" />,
  crm: <Building2 className="h-3 w-3" />,
  property_data: <Database className="h-3 w-3" />,
  default: <Cable className="h-3 w-3" />,
};

export function ActiveConnectorsBadge({ connectors }: ActiveConnectorsBadgeProps) {
  if (!connectors || connectors.length === 0) {
    return null;
  }

  const connectorNames = connectors.map(c => c.name).join(", ");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary">
            <Cable className="h-3 w-3" />
            <span className="font-medium">
              {connectors.length === 1
                ? connectors[0].name
                : `${connectors.length} sources`}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium text-xs">Using connected data from:</p>
            <ul className="space-y-0.5">
              {connectors.map((connector) => (
                <li key={connector.connector_key} className="flex items-center gap-1.5 text-xs">
                  {categoryIcons[connector.category] || categoryIcons.default}
                  <span>{connector.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
