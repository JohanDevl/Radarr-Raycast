import React, { useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { getRadarrInstances, getDefaultRadarrInstance } from "./config";
import { useMissingMovies } from "./hooks/useRadarrAPI";
import {
  formatMovieTitle,
  getMoviePoster,
  getRatingDisplay,
  getGenresDisplay,
  truncateText,
  formatReleaseDate,
} from "./utils";
import type { Movie, RadarrInstance } from "./types";

export default function MissingMovies() {
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

  const { data: missingMovies, isLoading, error, mutate } = useMissingMovies(selectedInstance);

  const getAvailabilityColor = (movie: Movie): Color => {
    if (!movie.inCinemas && !movie.digitalRelease && !movie.physicalRelease) {
      return Color.SecondaryText; // Not released yet
    }

    const now = new Date();
    const releaseDate = new Date(movie.inCinemas || movie.digitalRelease || movie.physicalRelease || "");

    if (releaseDate > now) {
      return Color.Yellow; // Future release
    }

    return Color.Red; // Available but missing
  };

  const getAvailabilityStatus = (movie: Movie): string => {
    if (!movie.inCinemas && !movie.digitalRelease && !movie.physicalRelease) {
      return "Not Released";
    }

    const now = new Date();
    const releaseDate = new Date(movie.inCinemas || movie.digitalRelease || movie.physicalRelease || "");

    if (releaseDate > now) {
      return "Upcoming";
    }

    const daysSinceRelease = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceRelease < 30) {
      return "Recent";
    } else if (daysSinceRelease < 90) {
      return "Available";
    } else {
      return "Long Available";
    }
  };

  const movieListItem = (movie: Movie) => {
    const poster = getMoviePoster(movie);
    const rating = getRatingDisplay(movie);
    const genres = getGenresDisplay(movie.genres);
    const overview = movie.overview ? truncateText(movie.overview, 150) : "No overview available";
    const availabilityStatus = getAvailabilityStatus(movie);
    const availabilityColor = getAvailabilityColor(movie);

    let releaseInfo = "";
    if (movie.inCinemas) {
      releaseInfo = `Cinema: ${formatReleaseDate(movie.inCinemas)}`;
    }
    if (movie.digitalRelease && movie.digitalRelease !== movie.inCinemas) {
      if (releaseInfo) releaseInfo += " • ";
      releaseInfo += `Digital: ${formatReleaseDate(movie.digitalRelease)}`;
    }
    if (movie.physicalRelease && movie.physicalRelease !== movie.digitalRelease) {
      if (releaseInfo) releaseInfo += " • ";
      releaseInfo += `Physical: ${formatReleaseDate(movie.physicalRelease)}`;
    }

    return (
      <List.Item
        key={movie.id}
        icon={poster || Icon.QuestionMark}
        title={formatMovieTitle(movie)}
        subtitle={genres}
        accessories={[{ tag: { value: availabilityStatus, color: availabilityColor } }]}
        detail={
          <List.Item.Detail
            markdown={`# ${formatMovieTitle(movie)}

${poster ? `![Poster](${poster})` : ""}

## Overview
${overview}

## Release Information
${releaseInfo || "Release dates not available"}

## Details
- **Status:** ${movie.status}
- **Monitored:** ${movie.monitored ? "Yes" : "No"}
- **Availability:** ${availabilityStatus}
- **Runtime:** ${movie.runtime ? `${movie.runtime} minutes` : "Unknown"}
- **Genres:** ${genres || "Not specified"}
${rating ? `- **Ratings:** ${rating}` : ""}
${movie.imdbId ? `- **IMDb:** [${movie.imdbId}](https://imdb.com/title/${movie.imdbId})` : ""}

## Technical Details
- **Quality Profile ID:** ${movie.qualityProfileId}
- **Root Folder:** ${movie.rootFolderPath}
${movie.folder ? `- **Movie Folder:** ${movie.folder}` : ""}`}
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
              <Action.OpenInBrowser
                title="Search for Movie"
                url={`${selectedInstance.url}/movie/${movie.tmdbId}#search`}
                icon={Icon.MagnifyingGlass}
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
          title="Failed to Load Missing Movies"
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

  const sortedMovies = missingMovies
    ? [...missingMovies].sort((a, b) => {
        // Sort by release date, with most recent releases first
        const dateA = a.inCinemas || a.digitalRelease || a.physicalRelease || "";
        const dateB = b.inCinemas || b.digitalRelease || b.physicalRelease || "";

        if (!dateA && !dateB) return a.sortTitle.localeCompare(b.sortTitle);
        if (!dateA) return 1;
        if (!dateB) return -1;

        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
    : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search missing movies on ${selectedInstance.name}...`}
      isShowingDetail
    >
      {sortedMovies.length === 0 ? (
        <List.EmptyView
          title="No Missing Movies"
          description="All monitored movies have been downloaded"
          icon={Icon.Check}
        />
      ) : (
        sortedMovies.map(movieListItem)
      )}
    </List>
  );
}
