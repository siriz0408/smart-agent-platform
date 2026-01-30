import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  name: string;
  shortcuts: Shortcut[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["g", "h"], description: "Go to Home / Chat" },
      { keys: ["g", "d"], description: "Go to Documents" },
      { keys: ["g", "c"], description: "Go to Contacts" },
      { keys: ["g", "p"], description: "Go to Properties" },
      { keys: ["g", "i"], description: "Go to Pipeline" },
      { keys: ["g", "m"], description: "Go to Messages" },
      { keys: ["g", "s"], description: "Go to Settings" },
    ],
  },
  {
    name: "Actions",
    shortcuts: [
      { keys: ["n"], description: "Create new item" },
      { keys: ["e"], description: "Edit selected item" },
      { keys: ["/"], description: "Focus search" },
      { keys: ["Esc"], description: "Close dialog / Cancel" },
    ],
  },
  {
    name: "Chat",
    shortcuts: [
      { keys: ["Enter"], description: "Send message" },
      { keys: ["Shift", "Enter"], description: "New line in message" },
      { keys: ["Cmd", "k"], description: "Clear chat history" },
    ],
  },
  {
    name: "Documents",
    shortcuts: [
      { keys: ["u"], description: "Upload new document" },
      { keys: ["d"], description: "Download selected document" },
      { keys: ["Delete"], description: "Delete selected document" },
    ],
  },
  {
    name: "Global",
    shortcuts: [
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Cmd", "j"], description: "Toggle sidebar" },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ShortcutKey({ keyName }: { keyName: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 font-mono text-xs font-medium bg-muted border border-border rounded shadow-sm">
      {keyName}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return shortcutGroups;

    const query = searchQuery.toLowerCase();
    return shortcutGroups
      .map((group) => ({
        ...group,
        shortcuts: group.shortcuts.filter(
          (shortcut) =>
            shortcut.description.toLowerCase().includes(query) ||
            shortcut.keys.some((key) => key.toLowerCase().includes(query)) ||
            group.name.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.shortcuts.length > 0);
  }, [searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 py-2 -mx-6 px-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shortcuts found for "{searchQuery}"
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.name}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {group.name}
                </h4>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, idx) => (
                          <span key={key} className="flex items-center gap-1">
                            {idx > 0 && (
                              <span className="text-xs text-muted-foreground">+</span>
                            )}
                            <ShortcutKey keyName={key} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <ShortcutKey keyName="?" /> anywhere to open this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}
