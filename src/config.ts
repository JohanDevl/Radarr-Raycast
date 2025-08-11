import { getPreferenceValues } from "@raycast/api";
import type { RadarrInstance } from "./types";

interface Preferences {
  instances: string;
}

interface RawRadarrInstance {
  name: string;
  url: string;
  apiKey: string;
  isDefault?: boolean;
}

export function getRadarrInstances(): RadarrInstance[] {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const instances = JSON.parse(preferences.instances);

    if (!Array.isArray(instances)) {
      throw new Error("Instances configuration must be an array");
    }

    return instances.map((instance: RawRadarrInstance, index: number) => {
      if (!instance.name || !instance.url || !instance.apiKey) {
        throw new Error(`Instance ${index + 1} is missing required fields (name, url, apiKey)`);
      }

      return {
        name: instance.name,
        url: instance.url.replace(/\/$/, ""), // Remove trailing slash
        apiKey: instance.apiKey,
        isDefault: instance.isDefault === true,
      };
    });
  } catch (error) {
    throw new Error(`Invalid instances configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function getDefaultRadarrInstance(): RadarrInstance {
  const instances = getRadarrInstances();
  const defaultInstance = instances.find((instance) => instance.isDefault);

  if (defaultInstance) {
    return defaultInstance;
  }

  if (instances.length > 0) {
    return instances[0];
  }

  throw new Error("No Radarr instances configured");
}

export function validateRadarrInstance(instance: RadarrInstance): void {
  if (!instance.name.trim()) {
    throw new Error("Instance name cannot be empty");
  }

  if (!instance.url.trim()) {
    throw new Error("Instance URL cannot be empty");
  }

  if (!instance.apiKey.trim()) {
    throw new Error("Instance API key cannot be empty");
  }

  try {
    new URL(instance.url);
  } catch {
    throw new Error("Instance URL is not valid");
  }
}

export function getRadarrInstanceChoices(): Array<{ title: string; value: string }> {
  const instances = getRadarrInstances();

  return instances.map((instance) => ({
    title: `${instance.name} (${instance.url})`,
    value: JSON.stringify({
      name: instance.name,
      url: instance.url,
      apiKey: instance.apiKey,
      isDefault: instance.isDefault,
    }),
  }));
}
