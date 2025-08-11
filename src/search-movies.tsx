import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LaunchProps,
  Icon,
  Keyboard,
} from "@raycast/api";

import { getRadarrInstances, getDefaultRadarrInstance } from "./config";
import { searchMovies, addMovie } from "./hooks/useRadarrAPI";
import { formatMovieTitle, getMoviePoster, getRatingDisplay, getGenresDisplay, truncateText } from "./utils";
import type { MovieLookup, RadarrInstance } from "./types";

interface Arguments {
  query?: string;
}

export default function SearchMovies(props: LaunchProps<{ arguments: Arguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const [searchResults, setSearchResults] = useState<MovieLookup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchText.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      searchMovies(selectedInstance, searchText)
        .then((results) => setSearchResults(results))
        .catch((error) => {
          console.error("Search error:", error);
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, selectedInstance]);

  const handleAddMovie = async (movie: MovieLookup) => {
    try {
      await addMovie(
        selectedInstance,
        movie,
        1, // Default quality profile ID
        "/movies", // Default root folder - this would need to be configured
        true, // Monitored
        true, // Search on add
      );

      showToast({
        style: Toast.Style.Success,
        title: "Movie Added",
        message: `${formatMovieTitle(movie)} added successfully`,
      });
    } catch (error) {
      console.error("Add movie error:", error);
    }
  };

  const movieListItem = (movie: MovieLookup) => {
    const poster = getMoviePoster(movie);
    const rating = getRatingDisplay(movie);
    const genres = getGenresDisplay(movie.genres);
    const overview = movie.overview ? truncateText(movie.overview, 150) : "No overview available";

    const accessories = [
      ...(rating ? [{ text: rating }] : []),
      ...(movie.runtime ? [{ text: `${movie.runtime}min` }] : []),
      ...(movie.added ? [{ icon: Icon.Check, tooltip: "Already in library" }] : []),
    ];

    return (
      <List.Item
        key={movie.tmdbId}
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
- **Runtime:** ${movie.runtime ? `${movie.runtime} minutes` : "Unknown"}
- **Status:** ${movie.status}
- **Genres:** ${genres || "Not specified"}
- **Studio:** ${movie.studio || "Not specified"}
${rating ? `- **Ratings:** ${rating}` : ""}
${movie.imdbId ? `- **IMDb:** [${movie.imdbId}](https://imdb.com/title/${movie.imdbId})` : ""}
${movie.website ? `- **Website:** [${movie.website}](${movie.website})` : ""}

## Release Information
${movie.inCinemas ? `- **In Cinemas:** ${new Date(movie.inCinemas).toDateString()}` : ""}
${movie.certification ? `- **Certification:** ${movie.certification}` : ""}`}
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {!movie.added && (
                <Action
                  title="Add Movie"
                  icon={Icon.Plus}
                  onAction={() => handleAddMovie(movie)}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
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

  return (
    <List
      isLoading={isSearching}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search movies on ${selectedInstance.name}...`}
      throttle
      isShowingDetail
    >
      <List.EmptyView
        title={searchText.trim() ? "No Results Found" : "Start Typing to Search"}
        description={
          searchText.trim() ? `No movies found for "${searchText}"` : "Enter a movie title to begin searching"
        }
        icon={searchText.trim() ? Icon.MagnifyingGlass : Icon.Video}
      />

      {searchResults.map(movieListItem)}
    </List>
  );
}
