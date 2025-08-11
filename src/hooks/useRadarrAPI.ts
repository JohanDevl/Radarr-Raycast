import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import type {
  Movie,
  QueueItem,
  CalendarMovie,
  HealthCheck,
  SystemStatus,
  HistoryRecord,
  MovieLookup,
  RadarrInstance,
} from "../types";

interface APIResponse<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
}

export function useRadarrAPI<T>(
  instance: RadarrInstance,
  endpoint: string,
  options?: {
    execute?: boolean;
    onError?: (error: Error) => void;
    onData?: (data: T) => void;
  },
): APIResponse<T> {
  const url = `${instance.url}/api/v3${endpoint}`;

  const { data, error, isLoading, mutate } = useFetch<T>(url, {
    headers: {
      "X-Api-Key": instance.apiKey,
      "Content-Type": "application/json",
    },
    execute: options?.execute !== false,
    onError: (error) => {
      console.error(`Radarr API Error (${instance.name}):`, error);
      showToast({
        style: Toast.Style.Failure,
        title: "Radarr Error",
        message: `Failed to connect to ${instance.name}: ${error.message}`,
      });
      options?.onError?.(error);
    },
    onData: options?.onData,
  });

  return { data, error, isLoading, mutate };
}

export function useMovies(instance: RadarrInstance) {
  return useRadarrAPI<Movie[]>(instance, "/movie");
}

export function useQueue(instance: RadarrInstance) {
  return useRadarrAPI<{ records: QueueItem[] }>(instance, "/queue");
}

export function useCalendar(instance: RadarrInstance, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const endpoint = `/calendar${params.toString() ? `?${params.toString()}` : ""}`;

  return useRadarrAPI<CalendarMovie[]>(instance, endpoint);
}

export function useHealth(instance: RadarrInstance) {
  return useRadarrAPI<HealthCheck[]>(instance, "/health");
}

export function useSystemStatus(instance: RadarrInstance) {
  return useRadarrAPI<SystemStatus>(instance, "/system/status");
}

export function useHistory(instance: RadarrInstance, movieId?: number) {
  const params = new URLSearchParams();
  if (movieId) params.set("movieId", movieId.toString());
  const endpoint = `/history${params.toString() ? `?${params.toString()}` : ""}`;

  return useRadarrAPI<{ records: HistoryRecord[] }>(instance, endpoint);
}

export function useMissingMovies(instance: RadarrInstance) {
  return useRadarrAPI<{ records: Movie[] }>(instance, "/wanted/missing");
}

export async function searchMovies(instance: RadarrInstance, query: string): Promise<MovieLookup[]> {
  try {
    const url = `${instance.url}/api/v3/movie/lookup?term=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Movie search error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message: `Failed to search movies: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    throw error;
  }
}

export async function addMovie(
  instance: RadarrInstance,
  movie: MovieLookup,
  qualityProfileId: number,
  rootFolderPath: string,
  monitored: boolean = true,
  searchOnAdd: boolean = true,
): Promise<Movie> {
  try {
    const url = `${instance.url}/api/v3/movie`;
    const payload = {
      title: movie.title,
      originalTitle: movie.originalTitle,
      sortTitle: movie.sortTitle,
      status: movie.status,
      overview: movie.overview,
      inCinemas: movie.inCinemas,
      images: movie.images,
      website: movie.website,
      year: movie.year,
      runtime: movie.runtime,
      imdbId: movie.imdbId,
      tmdbId: movie.tmdbId,
      genres: movie.genres,
      ratings: movie.ratings,
      qualityProfileId,
      rootFolderPath,
      monitored,
      addOptions: {
        searchForMovie: searchOnAdd,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const addedMovie = await response.json();

    showToast({
      style: Toast.Style.Success,
      title: "Movie Added",
      message: `${movie.title} (${movie.year}) added to ${instance.name}`,
    });

    return addedMovie;
  } catch (error) {
    console.error("Add movie error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Add Movie",
      message: `Could not add ${movie.title}: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    throw error;
  }
}

export async function removeQueueItem(instance: RadarrInstance, id: number): Promise<void> {
  try {
    const url = `${instance.url}/api/v3/queue/${id}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-Api-Key": instance.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    showToast({
      style: Toast.Style.Success,
      title: "Queue Item Removed",
      message: "Item removed from download queue",
    });
  } catch (error) {
    console.error("Remove queue item error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Remove Item",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function testConnection(instance: RadarrInstance): Promise<boolean> {
  try {
    const url = `${instance.url}/api/v3/system/status`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
