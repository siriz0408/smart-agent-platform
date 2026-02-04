import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface AISettingsPopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AISettingsPopover({ children, open, onOpenChange }: AISettingsPopoverProps) {
  const { preferences, updatePreference } = useUserPreferences();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" sideOffset={8}>
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-medium text-sm mb-1">AI Settings</h4>
            <p className="text-xs text-muted-foreground">
              Customize your AI assistant experience
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Model</Label>
            <RadioGroup
              value={preferences.aiModel || "default"}
              onValueChange={(value) => updatePreference("aiModel", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="model-default" />
                <Label htmlFor="model-default" className="font-normal cursor-pointer flex-1">
                  <div className="flex items-center justify-between">
                    <span>Default (Balanced)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Claude Sonnet 4 - Best for most tasks</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <RadioGroupItem value="fast" id="model-fast" disabled />
                <Label htmlFor="model-fast" className="font-normal cursor-not-allowed flex-1">
                  <div className="flex items-center justify-between">
                    <span>Fast</span>
                    <Badge variant="secondary" className="text-[10px] py-0">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Claude Haiku - Quick responses</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <RadioGroupItem value="advanced" id="model-advanced" disabled />
                <Label htmlFor="model-advanced" className="font-normal cursor-not-allowed flex-1">
                  <div className="flex items-center justify-between">
                    <span>Advanced</span>
                    <Badge variant="secondary" className="text-[10px] py-0">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Claude Opus - Most capable</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Search Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Search Mode</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="search-my-data" className="font-normal flex-1">
                  <span>My Data Only</span>
                  <p className="text-xs text-muted-foreground">Search contacts, properties, deals</p>
                </Label>
                <Switch
                  id="search-my-data"
                  checked={preferences.searchMode !== "web"}
                  onCheckedChange={(checked) =>
                    updatePreference("searchMode", checked ? "myData" : "web")
                  }
                />
              </div>
              <div className="flex items-center justify-between opacity-50">
                <Label htmlFor="search-web" className="font-normal cursor-not-allowed flex-1">
                  <div className="flex items-center gap-2">
                    <span>Include Web Search</span>
                    <Badge variant="secondary" className="text-[10px] py-0">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Search the web for information</p>
                </Label>
                <Switch id="search-web" disabled checked={false} />
              </div>
            </div>
          </div>

          {/* Response Length */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Response Length</Label>
            <RadioGroup
              value={preferences.responseLength || "medium"}
              onValueChange={(value) => updatePreference("responseLength", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="short" id="length-short" />
                <Label htmlFor="length-short" className="font-normal cursor-pointer">
                  Short - Concise answers
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="length-medium" />
                <Label htmlFor="length-medium" className="font-normal cursor-pointer">
                  Medium - Balanced detail
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="long" id="length-long" />
                <Label htmlFor="length-long" className="font-normal cursor-pointer">
                  Long - Comprehensive explanations
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
