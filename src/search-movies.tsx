import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, LaunchProps, Icon } from "@raycast/api";

import { getRadarrInstances, getActiveRadarrInstance } from "./config";
import { searchMovies, addMovie, getRootFolders, getQualityProfiles, useMovies } from "./hooks/useRadarrAPI";
import { formatMovieTitle, getMoviePoster, getRatingDisplay, getGenresDisplay, truncateText } from "./utils";
import type { MovieLookup, RadarrInstance } from "./types";

interface Arguments {
  query?: string;
}

export default function SearchMovies(props: LaunchProps<{ arguments: Arguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const [searchResults, setSearchResults] = useState<MovieLookup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [existingMovies, setExistingMovies] = useState<Set<number>>(new Set());
  const [selectedInstance] = useState<RadarrInstance>(() => {
    try {
      return getActiveRadarrInstance();
    } catch (error) {
      console.error("Failed to get active instance:", error);
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

  const { data: existingMoviesList } = useMovies(selectedInstance);

  // Update existing movies set when movies or instance changes
  useEffect(() => {
    if (existingMoviesList) {
      const tmdbIds = new Set(existingMoviesList.map((movie) => movie.tmdbId));
      setExistingMovies(tmdbIds);
    }
  }, [existingMoviesList, selectedInstance]);

  // Force initial search if query is provided
  useEffect(() => {
    if (props.arguments.query && props.arguments.query.trim() && selectedInstance.url && selectedInstance.apiKey) {
      setIsSearching(true);
      searchMovies(selectedInstance, props.arguments.query)
        .then((results) => setSearchResults(results))
        .catch((error) => {
          console.error("Initial search error:", error);
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }
  }, [selectedInstance.url, selectedInstance.apiKey]); // Only run when instance is ready

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchText.trim() || !selectedInstance.url || !selectedInstance.apiKey) {
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
      // Get root folders and quality profiles
      const [rootFolders, qualityProfiles] = await Promise.all([
        getRootFolders(selectedInstance),
        getQualityProfiles(selectedInstance),
      ]);

      if (rootFolders.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Root Folders",
          message: "Please configure root folders in Radarr first",
        });
        return;
      }

      if (qualityProfiles.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Quality Profiles",
          message: "Please configure quality profiles in Radarr first",
        });
        return;
      }

      // Use first available root folder and quality profile
      const rootFolderPath = rootFolders[0].path;
      const qualityProfileId = qualityProfiles[0].id;

      await addMovie(
        selectedInstance,
        movie,
        qualityProfileId,
        rootFolderPath,
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
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Movie",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const movieListItem = (movie: MovieLookup) => {
    const poster = getMoviePoster(movie);
    const rating = getRatingDisplay(movie);
    const genres = getGenresDisplay(movie.genres);
    const overview = movie.overview ? truncateText(movie.overview, 150) : "No overview available";

    // Check if movie is already in library using our manual verification
    const isAlreadyAdded = existingMovies.has(movie.tmdbId);

    const accessories = [
      ...(rating ? [{ text: rating }] : []),
      ...(movie.runtime ? [{ text: `${movie.runtime}min` }] : []),
      ...(isAlreadyAdded ? [{ icon: Icon.Check, tooltip: "Already in library" }] : []),
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

${poster ? `<img src="${poster}" alt="Poster" width="200" />` : ""}

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
              {isAlreadyAdded ? (
                <Action.OpenInBrowser
                  title="Open in Radarr"
                  url={`${selectedInstance.url}/movie/${movie.tmdbId}`}
                  icon={Icon.Globe}
                />
              ) : (
                <Action title="Add Movie" icon={Icon.Plus} onAction={() => handleAddMovie(movie)} />
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
              {movie.title && (
                <Action.OpenInBrowser
                  title="Search in Tvdb"
                  url={`https://www.thetvdb.com/search?query=${encodeURIComponent(movie.title)}`}
                  icon={Icon.Globe}
                />
              )}
            </ActionPanel.Section>
            {instances.length > 1 && (
              <ActionPanel.Section title="Instance">
                <Action.Open
                  title="Switch Active Instance"
                  target="raycast://extensions/preferences"
                  icon={Icon.Gear}
                />
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
      searchText={searchText}
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
