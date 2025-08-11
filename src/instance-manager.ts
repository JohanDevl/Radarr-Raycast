import { LocalStorage } from "@raycast/api";
import { getActiveRadarrInstance, getRadarrInstances } from "./config";
import type { RadarrInstance } from "./types";

const SELECTED_INSTANCE_KEY = "selectedRadarrInstance";

/**
 * Get the currently selected instance, with the following priority:
 * 1. Temporarily overridden instance (from LocalStorage)
 * 2. Active instance from preferences
 */
export async function getCurrentInstance(): Promise<RadarrInstance> {
  // Check if there's a temporary override in LocalStorage
  const overriddenInstanceJson = await LocalStorage.getItem<string>(SELECTED_INSTANCE_KEY);

  if (overriddenInstanceJson) {
    try {
      const overriddenInstance: RadarrInstance = JSON.parse(overriddenInstanceJson);

      // Verify the overridden instance still exists in current config
      const availableInstances = getRadarrInstances();
      const instanceExists = availableInstances.some(
        (instance) => instance.name === overriddenInstance.name && instance.url === overriddenInstance.url,
      );

      if (instanceExists) {
        return overriddenInstance;
      } else {
        // Instance no longer exists, clear override
        await LocalStorage.removeItem(SELECTED_INSTANCE_KEY);
      }
    } catch (error) {
      console.error("Failed to parse overridden instance:", error);
      await LocalStorage.removeItem(SELECTED_INSTANCE_KEY);
    }
  }

  // Fall back to preference-based active instance
  return getActiveRadarrInstance();
}

/**
 * Temporarily override the active instance (stored in LocalStorage)
 */
export async function setCurrentInstance(instance: RadarrInstance): Promise<void> {
  await LocalStorage.setItem(SELECTED_INSTANCE_KEY, JSON.stringify(instance));
}

/**
 * Clear any temporary instance override and use preference-based selection
 */
export async function clearInstanceOverride(): Promise<void> {
  await LocalStorage.removeItem(SELECTED_INSTANCE_KEY);
}

/**
 * Check if there's currently a temporary instance override active
 */
export async function hasInstanceOverride(): Promise<boolean> {
  const overriddenInstance = await LocalStorage.getItem<string>(SELECTED_INSTANCE_KEY);
  return !!overriddenInstance;
}
