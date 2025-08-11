import React, { useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { getRadarrInstances, getDefaultRadarrInstance } from "./config";
import { useCalendar } from "./hooks/useRadarrAPI";
import {
  formatMovieTitle,
  getMoviePoster,
  formatReleaseDate,
  getGenresDisplay,
  truncateText,
  getMovieStatus,
} from "./utils";
import type { CalendarMovie, RadarrInstance } from "./types";

export default function UpcomingReleases() {
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

  const today = new Date();
  const twoMonthsFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  const {
    data: calendarMovies,
    isLoading,
    error,
  } = useCalendar(selectedInstance, today.toISOString().split("T")[0], twoMonthsFromNow.toISOString().split("T")[0]);

  const movieListItem = (movie: CalendarMovie) => {
    const poster = getMoviePoster(movie);
    const genres = getGenresDisplay(movie.genres);
    const overview = movie.overview ? truncateText(movie.overview, 150) : "No overview available";
    const status = getMovieStatus(movie);

    let releaseInfo = "";
    if (movie.inCinemas) {
      releaseInfo = `In Cinemas: ${formatReleaseDate(movie.inCinemas)}`;
    }
    if (movie.digitalRelease && movie.digitalRelease !== movie.inCinemas) {
      if (releaseInfo) releaseInfo += " • ";
      releaseInfo += `Digital: ${formatReleaseDate(movie.digitalRelease)}`;
    }
    if (movie.physicalRelease && movie.physicalRelease !== movie.digitalRelease) {
      if (releaseInfo) releaseInfo += " • ";
      releaseInfo += `Physical: ${formatReleaseDate(movie.physicalRelease)}`;
    }

    const statusColor = movie.hasFile ? Color.Green : movie.monitored ? Color.Blue : Color.SecondaryText;

    return (
      <List.Item
        key={movie.id}
        icon={poster || Icon.Calendar}
        title={formatMovieTitle(movie)}
        subtitle={genres}
        accessories={[{ tag: { value: status, color: statusColor } }]}
        detail={
          <List.Item.Detail
            markdown={`# ${formatMovieTitle(movie)}

${poster ? `![Poster](${poster})` : ""}

## Overview
${overview}

## Release Information
${releaseInfo}

## Details
- **Status:** ${status}
- **Monitored:** ${movie.monitored ? "Yes" : "No"}
- **Runtime:** ${movie.runtime ? `${movie.runtime} minutes` : "Unknown"}
- **Genres:** ${genres || "Not specified"}
${movie.imdbId ? `- **IMDb:** [${movie.imdbId}](https://imdb.com/title/${movie.imdbId})` : ""}`}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Radarr"
                url={`${selectedInstance.url}/movie/${movie.tmdbId}`}
                icon={Icon.Globe}
              />
              {movie.imdbId && (
                <Action.OpenInBrowser
                  title="Open in Imdb"
                  url={`https://imdb.com/title/${movie.imdbId}`}
                  icon={Icon.Globe}
                />
              )}
              {movie.tmdbId && (
                <Action.OpenInBrowser
                  title="Open in Tmdb"
                  url={`https://themoviedb.org/movie/${movie.tmdbId}`}
                  icon={Icon.Globe}
                />
              )}
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
          title="Failed to Load Calendar"
          description={`Error: ${error.message}`}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => window.location.reload()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const sortedMovies =
    calendarMovies?.sort((a, b) => {
      const dateA = a.inCinemas || a.digitalRelease || a.physicalRelease || "";
      const dateB = b.inCinemas || b.digitalRelease || b.physicalRelease || "";
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    }) || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search upcoming releases on ${selectedInstance.name}...`}
      isShowingDetail
    >
      <List.EmptyView
        title="No Upcoming Releases"
        description="No movies found in the next 2 months"
        icon={Icon.Calendar}
      />

      {sortedMovies.map(movieListItem)}
    </List>
  );
}
