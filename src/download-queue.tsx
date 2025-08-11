import React, { useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color, confirmAlert, Alert } from "@raycast/api";

import { getRadarrInstances, getDefaultRadarrInstance } from "./config";
import { useQueue, removeQueueItem } from "./hooks/useRadarrAPI";
import { formatMovieTitle, formatFileSize } from "./utils";
import type { QueueItem, RadarrInstance } from "./types";

export default function DownloadQueue() {
  const [selectedInstance, setSelectedInstance] = useState<RadarrInstance>(() => {
    try {
      return getDefaultRadarrInstance();
    } catch (error) {
      console.error("Failed to get default instance:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: error instanceof Error ? error.message : "Failed to load Radarr configuration",
      });
      return { name: "", url: "", apiKey: "", isDefault: true };
    }
  });

  const instances = (() => {
    try {
      return getRadarrInstances();
    } catch (error) {
      console.error("Failed to get instances:", error);
      return [];
    }
  })();

  const { data: queueResponse, isLoading, error, mutate } = useQueue(selectedInstance);
  const queueItems = queueResponse?.records || [];

  const getStatusColor = (status: string, trackedDownloadStatus: string): Color => {
    if (trackedDownloadStatus === "error") return Color.Red;
    if (trackedDownloadStatus === "warning") return Color.Yellow;
    if (status === "downloading") return Color.Blue;
    if (status === "completed") return Color.Green;
    return Color.SecondaryText;
  };

  const getStatusIcon = (status: string, trackedDownloadStatus: string): Icon => {
    if (trackedDownloadStatus === "error") return Icon.XMarkCircle;
    if (trackedDownloadStatus === "warning") return Icon.ExclamationMark;
    if (status === "downloading") return Icon.Download;
    if (status === "completed") return Icon.Check;
    return Icon.Clock;
  };

  const formatProgress = (item: QueueItem): string => {
    if (item.size === 0) return "Unknown size";

    const downloaded = item.size - item.sizeleft;
    const percentage = Math.round((downloaded / item.size) * 100);

    return `${formatFileSize(downloaded)} / ${formatFileSize(item.size)} (${percentage}%)`;
  };

  const getTimeLeft = (item: QueueItem): string => {
    if (item.timeleft && item.timeleft !== "00:00:00") {
      return item.timeleft;
    }

    if (item.estimatedCompletionTime) {
      const completion = new Date(item.estimatedCompletionTime);
      const now = new Date();
      const diffMs = completion.getTime() - now.getTime();

      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
      }
    }

    return "Unknown";
  };

  const handleRemoveItem = async (item: QueueItem) => {
    const confirmed = await confirmAlert({
      title: "Remove Download",
      message: `Are you sure you want to remove "${item.title}" from the download queue?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await removeQueueItem(selectedInstance, item.id);
        mutate();
      } catch (error) {
        console.error("Failed to remove queue item:", error);
      }
    }
  };

  const queueListItem = (item: QueueItem) => {
    const statusColor = getStatusColor(item.status, item.trackedDownloadStatus);
    const statusIcon = getStatusIcon(item.status, item.trackedDownloadStatus);
    const progress = formatProgress(item);
    const timeLeft = getTimeLeft(item);

    const statusMessages = item.statusMessages.flatMap((sm) => sm.messages).join(", ");

    return (
      <List.Item
        key={item.id}
        icon={{ source: statusIcon, tintColor: statusColor }}
        title={item.title}
        subtitle={formatMovieTitle(item.movie)}
        accessories={[
          { text: progress },
          ...(timeLeft !== "Unknown" ? [{ text: timeLeft }] : []),
          { tag: { value: item.status, color: statusColor } },
        ]}
        detail={
          <List.Item.Detail
            markdown={`# ${item.title}

## Movie
**${formatMovieTitle(item.movie)}**

## Download Details
- **Status:** ${item.status}
- **Tracked Status:** ${item.trackedDownloadStatus}
- **Protocol:** ${item.protocol}
- **Download Client:** ${item.downloadClient}
- **Indexer:** ${item.indexer}
- **Progress:** ${progress}
- **Time Left:** ${timeLeft}
- **Output Path:** ${item.outputPath}

${statusMessages ? `## Status Messages\n${statusMessages}` : ""}

## Movie Overview
${item.movie.overview || "No overview available"}`}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Remove from Queue"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleRemoveItem(item)}
              />
              <Action.OpenInBrowser
                title="Open Movie in Radarr"
                url={`${selectedInstance.url}/movie/${item.movie.id}`}
                icon={Icon.Globe}
              />
              {item.movie.imdbId && (
                <Action.OpenInBrowser
                  title="Open in Imdb"
                  url={`https://imdb.com/title/${item.movie.imdbId}`}
                  icon={Icon.Globe}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel.Section>
            {instances.length > 1 && (
              <ActionPanel.Section title="Switch Instance">
                {instances.map((instance) => (
                  <Action
                    key={instance.name}
                    title={`Switch to ${instance.name}`}
                    icon={selectedInstance.name === instance.name ? Icon.Check : Icon.Circle}
                    onAction={() => setSelectedInstance(instance)}
                  />
                ))}
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  if (instances.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Radarr Instances Configured"
          description="Please configure your Radarr instances in preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Failed to Load Queue"
          description={`Error: ${error.message}`}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search download queue on ${selectedInstance.name}...`}
      isShowingDetail
    >
      {queueItems.length === 0 ? (
        <List.EmptyView
          title="Download Queue Empty"
          description="No downloads currently in progress"
          icon={Icon.Download}
        />
      ) : (
        queueItems.map(queueListItem)
      )}
    </List>
  );
}
