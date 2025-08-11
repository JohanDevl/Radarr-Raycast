import { useState, useEffect, useCallback } from "react";
import { getCurrentInstance, setCurrentInstance } from "../instance-manager";
import { getRadarrInstances } from "../config";
import type { RadarrInstance } from "../types";

export function useInstanceManager() {
  const [currentInstance, setCurrentInstanceState] = useState<RadarrInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrentInstance = useCallback(async () => {
    try {
      const instance = await getCurrentInstance();
      setCurrentInstanceState(instance);
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
    } catch (error) {
      console.error("Failed to switch instance:", error);
      throw error;
    }
  }, []);

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
    availableInstances,
    switchToInstance,
    refresh: loadCurrentInstance,
  };
}
