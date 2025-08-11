import { LocalStorage } from "@raycast/api";
import { getActiveRadarrInstance, getRadarrInstances } from "./config";
import type { RadarrInstance } from "./types";

const SELECTED_INSTANCE_KEY = "selectedRadarrInstance";

/**
 * Get the currently active instance, with the following priority:
 * 1. User's persisted choice (from LocalStorage)
 * 2. Default from Raycast preferences
 */
export async function getCurrentInstance(): Promise<RadarrInstance> {
  // Check if there's a user-selected instance in LocalStorage
  const selectedInstanceJson = await LocalStorage.getItem<string>(SELECTED_INSTANCE_KEY);

  if (selectedInstanceJson) {
    try {
      const selectedInstance: RadarrInstance = JSON.parse(selectedInstanceJson);

      // Verify the selected instance still exists in current config
      const availableInstances = getRadarrInstances();
      const instanceExists = availableInstances.some(
        (instance) => instance.name === selectedInstance.name && instance.url === selectedInstance.url,
      );

      if (instanceExists) {
        return selectedInstance;
      } else {
        // Instance no longer exists, clear selection
        await LocalStorage.removeItem(SELECTED_INSTANCE_KEY);
      }
    } catch (error) {
      console.error("Failed to parse selected instance:", error);
      await LocalStorage.removeItem(SELECTED_INSTANCE_KEY);
    }
  }

  // Fall back to preference-based default instance
  return getActiveRadarrInstance();
}

/**
 * Persistently set the active instance (saved in LocalStorage)
 */
export async function setCurrentInstance(instance: RadarrInstance): Promise<void> {
  await LocalStorage.setItem(SELECTED_INSTANCE_KEY, JSON.stringify(instance));
}
