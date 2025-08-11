import { useState, useEffect, useCallback } from "react";
import {
  getCurrentInstance,
  setCurrentInstance,
  clearInstanceOverride,
  hasInstanceOverride,
} from "../instance-manager";
import { getRadarrInstances } from "../config";
import type { RadarrInstance } from "../types";

export function useInstanceManager() {
  const [currentInstance, setCurrentInstanceState] = useState<RadarrInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOverride, setHasOverride] = useState(false);

  const loadCurrentInstance = useCallback(async () => {
    try {
      const instance = await getCurrentInstance();
      const override = await hasInstanceOverride();
      setCurrentInstanceState(instance);
      setHasOverride(override);
    } catch (error) {
      console.error("Failed to load current instance:", error);
      setCurrentInstanceState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentInstance();
  }, [loadCurrentInstance]);

  const switchToInstance = useCallback(async (instance: RadarrInstance) => {
    try {
      await setCurrentInstance(instance);
      setCurrentInstanceState(instance);
      setHasOverride(true);
    } catch (error) {
      console.error("Failed to switch instance:", error);
      throw error;
    }
  }, []);

  const resetToPreferences = useCallback(async () => {
    try {
      await clearInstanceOverride();
      await loadCurrentInstance(); // Reload to get preference-based instance
    } catch (error) {
      console.error("Failed to reset to preferences:", error);
      throw error;
    }
  }, [loadCurrentInstance]);

  const availableInstances = (() => {
    try {
      return getRadarrInstances();
    } catch {
      return [];
    }
  })();

  return {
    currentInstance,
    isLoading,
    hasOverride,
    availableInstances,
    switchToInstance,
    resetToPreferences,
    refresh: loadCurrentInstance,
  };
}
