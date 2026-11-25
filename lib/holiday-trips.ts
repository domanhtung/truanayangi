"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { HolidayTrip, HolidayTripDish } from "@/lib/holiday-types";

export type { HolidayTrip, HolidayTripDish };

type ErrorResponse = { error?: string };

async function readError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ErrorResponse;
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchHolidayTrips(): Promise<HolidayTrip[]> {
  const response = await fetch("/api/holiday-trips", { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response, "Không thể tải kỳ nghỉ."));
  const data = (await response.json()) as { trips: HolidayTrip[] };
  return Array.isArray(data.trips) ? data.trips : [];
}

export async function fetchActiveHolidayTrip(): Promise<HolidayTrip | null> {
  const response = await fetch("/api/holiday-trips?active=1", { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response, "Không thể tải kỳ nghỉ đang mở."));
  const data = (await response.json()) as { trip: HolidayTrip | null };
  return data.trip ?? null;
}

export async function saveHolidayTrip(trip: {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  targetDishCount?: number | null;
  isActive?: boolean;
}): Promise<HolidayTrip> {
  const response = await fetch("/api/holiday-trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trip),
  });
  if (!response.ok) throw new Error(await readError(response, "Không thể lưu kỳ nghỉ."));
  const data = (await response.json()) as { trip: HolidayTrip };
  return data.trip;
}

export async function patchHolidayTrip(
  id: string,
  patch: Partial<{
    name: string;
    startDate: string;
    endDate: string;
    targetDishCount: number | null;
    isActive: boolean;
  }>,
): Promise<HolidayTrip> {
  const response = await fetch(`/api/holiday-trips/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await readError(response, "Không thể cập nhật kỳ nghỉ."));
  const data = (await response.json()) as { trip: HolidayTrip };
  return data.trip;
}

export async function deleteHolidayTrip(id: string): Promise<void> {
  const response = await fetch(`/api/holiday-trips/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response, "Không thể xóa kỳ nghỉ."));
}

export async function fetchTripDishes(tripId: string): Promise<HolidayTripDish[]> {
  const response = await fetch(`/api/holiday-trips/${tripId}/dishes`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response, "Không thể tải món của kỳ nghỉ."));
  const data = (await response.json()) as { dishes: HolidayTripDish[] };
  return Array.isArray(data.dishes) ? data.dishes : [];
}

export async function addDishToActiveTrip(dishId: string): Promise<{ added: boolean; trip: HolidayTrip }> {
  const trip = await fetchActiveHolidayTrip();
  if (!trip) throw new Error("Chưa có kỳ nghỉ đang mở.");
  const response = await fetch(`/api/holiday-trips/${trip.id}/dishes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dishId }),
  });
  if (!response.ok) throw new Error(await readError(response, "Không thể thêm món vào kỳ nghỉ."));
  const data = (await response.json()) as { added: boolean };
  await refreshHolidayTripCaches(trip.id);
  const refreshed = await fetchActiveHolidayTrip();
  return { added: data.added, trip: refreshed ?? trip };
}

export async function removeDishFromTrip(tripId: string, dishId: string): Promise<void> {
  const response = await fetch(`/api/holiday-trips/${tripId}/dishes`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dishId }),
  });
  if (!response.ok) throw new Error(await readError(response, "Không thể xóa món khỏi kỳ nghỉ."));
}

type ActiveSnapshot = {
  trip: HolidayTrip | null;
  error: boolean;
  loading: boolean;
  version: number;
};

const listeners = new Set<() => void>();
let snapshot: ActiveSnapshot = { trip: null, error: false, loading: true, version: 0 };
let loadPromise: Promise<HolidayTrip | null> | null = null;

function emit(next: Omit<ActiveSnapshot, "version">) {
  snapshot = { ...next, version: snapshot.version + 1 };
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

async function loadActiveTrip(force = false) {
  if (force) loadPromise = null;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const trip = await fetchActiveHolidayTrip();
        emit({ trip, error: false, loading: false });
        return trip;
      } catch {
        emit({ trip: null, error: true, loading: false });
        return null;
      } finally {
        loadPromise = null;
      }
    })();
  }
  return loadPromise;
}

if (typeof window !== "undefined") {
  void loadActiveTrip();
}

const activeServerSnapshot: ActiveSnapshot = {
  trip: null,
  error: false,
  loading: true,
  version: 0,
};

export function useActiveHolidayTrip() {
  const current = useSyncExternalStore(subscribe, () => snapshot, () => activeServerSnapshot);

  const refresh = useCallback(async () => loadActiveTrip(), []);

  return {
    trip: current.trip,
    error: current.error,
    loading: current.loading,
    refresh,
  };
}

type TripsSnapshot = {
  trips: HolidayTrip[];
  error: boolean;
  loading: boolean;
  version: number;
};

const tripListeners = new Set<() => void>();
let tripsSnapshot: TripsSnapshot = {
  trips: [],
  error: false,
  loading: true,
  version: 0,
};
let tripsLoadPromise: Promise<HolidayTrip[]> | null = null;

function emitTrips(next: Omit<TripsSnapshot, "version">) {
  tripsSnapshot = { ...next, version: tripsSnapshot.version + 1 };
  tripListeners.forEach((listener) => listener());
}

function subscribeTrips(onChange: () => void) {
  tripListeners.add(onChange);
  queueMicrotask(() => {
    void loadHolidayTrips(true);
  });
  return () => {
    tripListeners.delete(onChange);
  };
}

async function loadHolidayTrips(force = false) {
  if (force) tripsLoadPromise = null;
  if (!tripsLoadPromise) {
    tripsLoadPromise = (async () => {
      try {
        const trips = await fetchHolidayTrips();
        emitTrips({ trips, error: false, loading: false });
        emit({
          trip: trips.find((trip) => trip.isActive) ?? null,
          error: false,
          loading: false,
        });
        return trips;
      } catch {
        emitTrips({ trips: [], error: true, loading: false });
        return [] as HolidayTrip[];
      } finally {
        tripsLoadPromise = null;
      }
    })();
  }
  return tripsLoadPromise;
}

if (typeof window !== "undefined") {
  void loadHolidayTrips();
}

const tripsServerSnapshot: TripsSnapshot = {
  trips: [],
  error: false,
  loading: true,
  version: 0,
};

export function useHolidayTrips() {
  const current = useSyncExternalStore(subscribeTrips, () => tripsSnapshot, () => tripsServerSnapshot);

  const refresh = useCallback(async () => {
    const trips = await loadHolidayTrips(true);
    await loadActiveTrip(true);
    return trips;
  }, []);

  return {
    trips: current.trips,
    error: current.error,
    loading: current.loading,
    refresh,
  };
}

export function newTripId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-");
}

type DishCache = {
  tripId: string | null;
  dishes: HolidayTripDish[];
  loading: boolean;
  error: boolean;
  version: number;
};

const dishListeners = new Set<() => void>();
let dishCache: DishCache = {
  tripId: null,
  dishes: [],
  loading: false,
  error: false,
  version: 0,
};
let dishLoadPromise: Promise<HolidayTripDish[]> | null = null;
let dishLoadToken = 0;

const dishServerSnapshot: DishCache = {
  tripId: null,
  dishes: [],
  loading: false,
  error: false,
  version: 0,
};

function emitDishes(next: Omit<DishCache, "version">) {
  dishCache = { ...next, version: dishCache.version + 1 };
  dishListeners.forEach((listener) => listener());
}

async function loadDishesForTrip(tripId: string | null, force = false) {
  if (!tripId) {
    dishLoadToken += 1;
    dishLoadPromise = null;
    if (dishCache.tripId !== null || dishCache.dishes.length || dishCache.loading || dishCache.error) {
      emitDishes({ tripId: null, dishes: [], loading: false, error: false });
    }
    return [] as HolidayTripDish[];
  }

  if (!force && dishCache.tripId === tripId && !dishCache.loading && !dishLoadPromise) {
    return dishCache.dishes;
  }

  const token = ++dishLoadToken;
  emitDishes({
    tripId,
    dishes: !force && dishCache.tripId === tripId ? dishCache.dishes : [],
    loading: true,
    error: false,
  });

  dishLoadPromise = (async () => {
    try {
      const dishes = await fetchTripDishes(tripId);
      if (token !== dishLoadToken) return dishes;
      emitDishes({ tripId, dishes, loading: false, error: false });
      return dishes;
    } catch {
      if (token !== dishLoadToken) return [] as HolidayTripDish[];
      emitDishes({ tripId, dishes: [], loading: false, error: true });
      return [] as HolidayTripDish[];
    } finally {
      if (token === dishLoadToken) dishLoadPromise = null;
    }
  })();

  return dishLoadPromise;
}

function scheduleDishLoad(tripId: string | null) {
  queueMicrotask(() => {
    void loadDishesForTrip(tripId, true);
  });
}

export async function refreshHolidayTripCaches(tripId?: string | null) {
  await loadHolidayTrips(true);
  await loadActiveTrip(true);
  if (tripId !== undefined) {
    await loadDishesForTrip(tripId, true);
  }
}

export function useTripDishes(tripId: string | null) {
  const subscribe = useCallback((onChange: () => void) => {
    dishListeners.add(onChange);
    scheduleDishLoad(tripId);
    return () => {
      dishListeners.delete(onChange);
    };
  }, [tripId]);

  const snapshot = useSyncExternalStore(subscribe, () => dishCache, () => dishServerSnapshot);
  const matches = snapshot.tripId === tripId;

  const refresh = useCallback(() => loadDishesForTrip(tripId, true), [tripId]);
  const replace = useCallback((dishes: HolidayTripDish[]) => {
    if (!tripId) return;
    emitDishes({ tripId, dishes, loading: false, error: false });
  }, [tripId]);

  return {
    dishes: matches ? snapshot.dishes : [],
    loading: Boolean(tripId) && (!matches || snapshot.loading),
    error: matches && snapshot.error,
    refresh,
    replace,
  };
}
