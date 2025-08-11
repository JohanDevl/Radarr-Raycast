import React, { useState } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { getRadarrInstances, getDefaultRadarrInstance } from "./config";
import { useMovies } from "./hooks/useRadarrAPI";
import {
  formatMovieTitle,
  getMoviePoster,
  getRatingDisplay,
  getGenresDisplay,
  truncateText,
  getMovieStatus,
  formatFileSize,
} from "./utils";
import type { Movie, RadarrInstance } from "./types";

export default function MovieLibrary() {
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

  const { data: movies, isLoading, error, mutate } = useMovies(selectedInstance);

  const getStatusColor = (movie: Movie): Color => {
    if (movie.hasFile && movie.downloaded) return Color.Green;
    if (movie.monitored) return Color.Blue;
    return Color.SecondaryText;
  };

  const movieListItem = (movie: Movie) => {
    const poster = getMoviePoster(movie);
    const rating = getRatingDisplay(movie);
    const genres = getGenresDisplay(movie.genres);
    const overview = movie.overview ? truncateText(movie.overview, 150) : "No overview available";
    const status = getMovieStatus(movie);
    const statusColor = getStatusColor(movie);

    const accessories = [
      ...(movie.movieFile ? [{ text: formatFileSize(movie.movieFile.size) }] : []),
      { tag: { value: status, color: statusColor } },
    ];

    return (
      <List.Item
        key={movie.id}
        icon={poster || Icon.Video}
        title={formatMovieTitle(movie)}
        subtitle={genres}
        accessories={accessories}
        detail={
          <List.Item.Detail
            markdown={`# ${formatMovieTitle(movie)}

${poster ? `![Poster](${poster})` : ""}

## Overview
${overview}

## Details
- **Status:** ${status}
- **Monitored:** ${movie.monitored ? "Yes" : "No"}
- **Runtime:** ${movie.runtime ? `${movie.runtime} minutes` : "Unknown"}
- **Genres:** ${genres || "Not specified"}
${rating ? `- **Ratings:** ${rating}` : ""}
${movie.imdbId ? `- **IMDb:** [${movie.imdbId}](https://imdb.com/title/${movie.imdbId})` : ""}

## Technical Details
- **Quality Profile ID:** ${movie.qualityProfileId}
- **Root Folder:** ${movie.rootFolderPath}
${movie.folder ? `- **Movie Folder:** ${movie.folder}` : ""}

${
  movie.movieFile
    ? `## File Information
- **Path:** ${movie.movieFile.path}
- **Size:** ${formatFileSize(movie.movieFile.size)}
- **Quality:** ${movie.movieFile.quality.quality.name}
- **Date Added:** ${new Date(movie.movieFile.dateAdded).toLocaleDateString()}`
    : ""
}

## Release Information
${movie.inCinemas ? `- **In Cinemas:** ${new Date(movie.inCinemas).toDateString()}` : ""}
${movie.digitalRelease ? `- **Digital Release:** ${new Date(movie.digitalRelease).toDateString()}` : ""}
${movie.physicalRelease ? `- **Physical Release:** ${new Date(movie.physicalRelease).toDateString()}` : ""}`}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Radarr"
                url={`${selectedInstance.url}/movie/${movie.id}`}
                icon={Icon.Globe}
              />
              {movie.movieFile && (
                <Action.CopyToClipboard title="Copy File Path" content={movie.movieFile.path} icon={Icon.Clipboard} />
              )}
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
          title="Failed to Load Movies"
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

  const sortedMovies = movies?.sort((a, b) => a.sortTitle.localeCompare(b.sortTitle)) || [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search movie library on ${selectedInstance.name}...`}
      isShowingDetail
    >
      {sortedMovies.length === 0 ? (
        <List.EmptyView title="No Movies Found" description="Your movie library is empty" icon={Icon.Video} />
      ) : (
        sortedMovies.map(movieListItem)
      )}
    </List>
  );
}
