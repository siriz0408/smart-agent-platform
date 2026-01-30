import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  dealUpdates: boolean;
  darkMode: boolean;
}

const STORAGE_KEY = "smart-agent-preferences";

const defaultPreferences: UserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  dealUpdates: true,
  darkMode: false,
};

function getStoredPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (e) {
    logger.error("Failed to parse stored preferences:", e);
  }
  return defaultPreferences;
}

function applyDarkMode(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(getStoredPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize preferences and apply dark mode on mount
  useEffect(() => {
    const stored = getStoredPreferences();
    setPreferences(stored);
    applyDarkMode(stored.darkMode);
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever preferences change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences, isLoading]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };

      // Apply dark mode immediately when toggled
      if (key === "darkMode") {
        applyDarkMode(value as boolean);
      }

      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    applyDarkMode(defaultPreferences.darkMode);
  }, []);

  return {
    preferences,
    updatePreference,
    resetPreferences,
    isLoading,
  };
}
