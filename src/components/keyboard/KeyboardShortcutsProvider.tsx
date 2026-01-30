import { useState, createContext, useContext, ReactNode } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "@/components/settings/KeyboardShortcutsDialog";

interface KeyboardShortcutsContextValue {
  showShortcuts: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue>({
  showShortcuts: () => {},
});

export function useKeyboardShortcutsContext() {
  return useContext(KeyboardShortcutsContext);
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showShortcuts = () => setIsOpen(true);

  useKeyboardShortcuts({
    enabled: true,
    onShowShortcuts: showShortcuts,
  });

  return (
    <KeyboardShortcutsContext.Provider value={{ showShortcuts }}>
      {children}
      <KeyboardShortcutsDialog open={isOpen} onOpenChange={setIsOpen} />
    </KeyboardShortcutsContext.Provider>
  );
}
