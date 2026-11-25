"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Dish } from "@/lib/dish-types";

export type { Dish };

type DishesResponse = { dishes: Dish[] };
type SaveResponse = { dish: Dish };
type DeleteResponse = { removedCount: number };
type ErrorResponse = { error?: string };

type StoreSnapshot = {
  dishes: Dish[];
  storageError: boolean;
  loading: boolean;
  version: number;
};

const listeners = new Set<() => void>();

let snapshot: StoreSnapshot = {
  dishes: [],
  storageError: false,
  loading: true,
  version: 0,
};

let loadPromise: Promise<Dish[]> | null = null;

function emit(next: Omit<StoreSnapshot, "version">) {
  snapshot = { ...next, version: snapshot.version + 1 };
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot() {
  return snapshot;
}

const serverSnapshot: StoreSnapshot = {
  dishes: [],
  storageError: false,
  loading: true,
  version: 0,
};

function getServerSnapshot(): StoreSnapshot {
  return serverSnapshot;
}

async function readError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ErrorResponse;
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchDishes(): Promise<Dish[]> {
  const response = await fetch("/api/dishes", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response, "Không thể tải danh sách món ăn."));
  }
  const data = (await response.json()) as DishesResponse;
  if (!Array.isArray(data.dishes)) {
    throw new Error("Invalid dish list");
  }
  return data.dishes;
}

export async function saveDishToServer(dish: Dish): Promise<Dish> {
  const response = await fetch("/api/dishes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dish),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Không thể lưu món ăn."));
  }
  const data = (await response.json()) as SaveResponse;
  return data.dish;
}

export async function deleteDishesFromServer(ids: string[]): Promise<number> {
  const response = await fetch("/api/dishes", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Không thể xóa món ăn."));
  }
  const data = (await response.json()) as DeleteResponse;
  return data.removedCount ?? 0;
}

async function loadDishes() {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const dishes = await fetchDishes();
        emit({ dishes, storageError: false, loading: false });
        return dishes;
      } catch {
        emit({ dishes: [], storageError: true, loading: false });
        return [] as Dish[];
      } finally {
        loadPromise = null;
      }
    })();
  }
  return loadPromise;
}

if (typeof window !== "undefined") {
  void loadDishes();
}

export function useDishes() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refresh = useCallback(async () => loadDishes(), []);

  return {
    dishes: current.dishes,
    storageError: current.storageError,
    loading: current.loading,
    refresh,
  };
}
