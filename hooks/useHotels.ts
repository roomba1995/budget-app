"use client";

import { useState, useEffect, useCallback } from "react";
import { Hotel, CostItem } from "@/types";

const STORAGE_KEY = "hotel-budget-data-v2";

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

export function useHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setHotels(stored ? JSON.parse(stored) : []);
    } catch {
      setHotels([]);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hotels));
    }
  }, [hotels, initialized]);

  const addHotel = useCallback(
    (data: Omit<Hotel, "id" | "costItems">): string => {
      const id = genId();
      setHotels((prev) => [...prev, { ...data, id, costItems: [] }]);
      return id;
    },
    []
  );

  const updateHotel = useCallback(
    (id: string, updates: Partial<Omit<Hotel, "id" | "costItems">>) => {
      setHotels((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
      );
    },
    []
  );

  const deleteHotel = useCallback((id: string) => {
    setHotels((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const addCostItem = useCallback(
    (hotelId: string, data: Omit<CostItem, "id">): string => {
      const id = genId();
      setHotels((prev) =>
        prev.map((h) =>
          h.id === hotelId
            ? { ...h, costItems: [...h.costItems, { ...data, id }] }
            : h
        )
      );
      return id;
    },
    []
  );

  const updateCostItem = useCallback(
    (
      hotelId: string,
      itemId: string,
      updates: Partial<Omit<CostItem, "id">>
    ) => {
      setHotels((prev) =>
        prev.map((h) =>
          h.id === hotelId
            ? {
                ...h,
                costItems: h.costItems.map((i) =>
                  i.id === itemId ? { ...i, ...updates } : i
                ),
              }
            : h
        )
      );
    },
    []
  );

  const deleteCostItem = useCallback((hotelId: string, itemId: string) => {
    setHotels((prev) =>
      prev.map((h) =>
        h.id === hotelId
          ? { ...h, costItems: h.costItems.filter((i) => i.id !== itemId) }
          : h
      )
    );
  }, []);

  const importHotels = useCallback((newHotels: Hotel[]) => {
    setHotels(
      newHotels.map((hotel) => ({
        ...hotel,
        id: hotel.id || genId(),
        costItems: hotel.costItems || [],
      }))
    );
  }, []);

  return {
    hotels,
    initialized,
    addHotel,
    updateHotel,
    deleteHotel,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    importHotels,
  };
}
