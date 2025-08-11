import React, { useState } from "react";
import { Grid, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { getRadarrInstances, getDefaultRadarrInstance } from "./config";
import { useMovies } from "./hooks/useRadarrAPI";
import {
  getMoviePoster,
  getMovieStatus,
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

  const movieGridItem = (movie: Movie) => {
    const poster = getMoviePoster(movie);
    const status = getMovieStatus(movie);

    // Create subtitle with year and status
    const subtitle = `${movie.year} • ${status}`;

    return (
      <Grid.Item
        key={movie.id}
        content={{
          source: poster || Icon.Video,
          fallback: Icon.Video,
        }}
        title={movie.title}
        subtitle={subtitle}
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
      <Grid>
        <Grid.EmptyView
          title="No Radarr Instances Configured"
          description="Please configure your Radarr instances in preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open title="Open Preferences" target="raycast://extensions/preferences" icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  if (error) {
    return (
      <Grid>
        <Grid.EmptyView
          title="Failed to Load Movies"
          description={`Error: ${error.message}`}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={mutate} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  const sortedMovies = movies?.sort((a, b) => a.sortTitle.localeCompare(b.sortTitle)) || [];

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder={`Search movie library on ${selectedInstance.name}...`}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/4"
    >
      {sortedMovies.length === 0 ? (
        <Grid.EmptyView title="No Movies Found" description="Your movie library is empty" icon={Icon.Video} />
      ) : (
        sortedMovies.map(movieGridItem)
      )}
    </Grid>
  );
}
