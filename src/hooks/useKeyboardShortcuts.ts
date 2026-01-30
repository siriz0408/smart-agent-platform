import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true, onShowShortcuts } = options;
  const navigate = useNavigate();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isInputElement = useCallback((target: EventTarget | null) => {
    if (!target) return false;
    const tagName = (target as HTMLElement).tagName?.toLowerCase();
    const isEditable = (target as HTMLElement).isContentEditable;
    return tagName === "input" || tagName === "textarea" || tagName === "select" || isEditable;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if typing in an input field
      if (isInputElement(event.target)) return;

      const key = event.key.toLowerCase();
      const isMod = event.metaKey || event.ctrlKey;

      // Global shortcuts that work anywhere
      if (key === "?" && !event.shiftKey) {
        event.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // ? with shift (which produces ? on most keyboards)
      if (event.key === "?" && event.shiftKey) {
        event.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // Mod + J to toggle sidebar (handled by sidebar component)
      if (isMod && key === "j") {
        // Don't prevent default, let sidebar handle it
        return;
      }

      // / to focus search
      if (key === "/" && !isMod) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Search"]'
        );
        searchInput?.focus();
        return;
      }

      // Two-key navigation shortcuts (g + key)
      if (pendingKey === "g") {
        event.preventDefault();
        setPendingKey(null);

        switch (key) {
          case "h":
            navigate("/");
            break;
          case "d":
            navigate("/documents");
            break;
          case "c":
            navigate("/contacts");
            break;
          case "p":
            navigate("/properties");
            break;
          case "i":
            navigate("/pipeline");
            break;
          case "m":
            navigate("/messages");
            break;
          case "s":
            navigate("/settings");
            break;
          default:
            // Unknown key after 'g', ignore
            break;
        }
        return;
      }

      // Start of two-key sequence
      if (key === "g" && !isMod) {
        event.preventDefault();
        setPendingKey("g");
        // Clear pending key after timeout if no second key pressed
        setTimeout(() => setPendingKey(null), 1000);
        return;
      }

      // Clear pending key on any other key
      if (pendingKey) {
        setPendingKey(null);
      }
    },
    [enabled, isInputElement, navigate, onShowShortcuts, pendingKey]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    pendingKey,
  };
}
