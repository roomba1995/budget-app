"use client";

import { useState, useEffect, useCallback } from "react";
import { Hotel, CostItem } from "@/types";

const STORAGE_KEY = "hotel-budget-data-v2";

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

export interface MergeAlert {
  facilityNo: string;
  existingName: string;
  newName: string;
}

export interface MergeResult {
  result: Hotel[];
  alerts: MergeAlert[];
  addedCount: number;
  updatedCount: number;
}

export function mergeHotels(existing: Hotel[], incoming: Hotel[]): MergeResult {
  const alerts: MergeAlert[] = [];
  const result = [...existing];
  let addedCount = 0;
  let updatedCount = 0;

  for (const newHotel of incoming) {
    if (!newHotel.facilityNo) {
      result.push({ ...newHotel, id: genId() });
      addedCount++;
      continue;
    }

    const existingIdx = result.findIndex(
      (h) => h.facilityNo === newHotel.facilityNo
    );

    if (existingIdx === -1) {
      result.push({ ...newHotel, id: genId() });
      addedCount++;
    } else {
      const existingHotel = result[existingIdx];
      if (existingHotel.name === newHotel.name) {
        // 同一施設名 → グループ情報のみ更新、既存データ（費用等）は保持
        result[existingIdx] = {
          ...existingHotel,
          groups: newHotel.groups,
        };
        updatedCount++;
      } else {
        // 施設名不一致 → 両方取り込み＋アラート
        alerts.push({
          facilityNo: newHotel.facilityNo,
          existingName: existingHotel.name,
          newName: newHotel.name,
        });
        result.push({ ...newHotel, id: genId() });
        addedCount++;
      }
    }
  }

  return { result, alerts, addedCount, updatedCount };
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

  const mergeImportHotels = useCallback(
    (incoming: Hotel[]): MergeResult => {
      const mergeResult = mergeHotels(
        hotels.map((h) => ({ ...h })),
        incoming
      );
      setHotels(
        mergeResult.result.map((hotel) => ({
          ...hotel,
          id: hotel.id || genId(),
          costItems: hotel.costItems || [],
        }))
      );
      return mergeResult;
    },
    [hotels]
  );

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
    mergeImportHotels,
  };
}
