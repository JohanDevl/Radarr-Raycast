import React, { useState } from "react";
import { Grid, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { getRadarrInstances, getDefaultRadarrInstance } from "./config";
import { useMissingMovies } from "./hooks/useRadarrAPI";
import {
  getMoviePoster,
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

  const { data: missingMoviesResponse, isLoading, error, mutate } = useMissingMovies(selectedInstance);
  const missingMovies = missingMoviesResponse?.records;

  const getAvailabilityColor = (movie: Movie): Color => {
    if (!movie.inCinemas && !movie.digitalRelease && !movie.physicalRelease) {
      return Color.SecondaryText; // Not released yet
    }

    const now = new Date();
    const releaseDate = new Date(movie.inCinemas || movie.digitalRelease || movie.physicalRelease || "");

    if (releaseDate > now) {
      return Color.Yellow; // Future release
    }

    return Color.Red; // Missing (released but not downloaded)
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

    // If it's released and monitored but not downloaded, it's missing
    return "Missing";
  };

  const movieGridItem = (movie: Movie) => {
    const poster = getMoviePoster(movie);
    const availabilityStatus = getAvailabilityStatus(movie);
    const availabilityColor = getAvailabilityColor(movie);

    // Create subtitle with year and availability with colored indicator
    const availabilityIcon =
      availabilityColor === Color.Red
        ? "🔴"
        : availabilityColor === Color.Yellow
          ? "🟡"
          : availabilityColor === Color.SecondaryText
            ? "⚪"
            : "🟢";

    const subtitle = `${movie.year} • ${availabilityIcon} ${availabilityStatus}`;

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
          title="Failed to Load Missing Movies"
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
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder={`Search missing movies on ${selectedInstance.name}...`}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/4"
    >
      {sortedMovies.length === 0 ? (
        <Grid.EmptyView
          title="No Missing Movies"
          description="All monitored movies have been downloaded"
          icon={Icon.Check}
        />
      ) : (
        sortedMovies.map(movieGridItem)
      )}
    </Grid>
  );
}
