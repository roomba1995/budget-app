"use client";

import { useState, useEffect, useCallback } from "react";
import { Hotel, CostItem, Group } from "@/types";

const STORAGE_KEY = "hotel-budget-data-v2";

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

const SAMPLE_HOTELS: Hotel[] = [
  {
    id: "hotel-1",
    name: "グランドホテル東京",
    location: "東京都港区赤坂",
    groups: ["選手団", "技術役員"],
    contractStartDate: "2024-07-10",
    contractEndDate: "2024-07-25",
    roomTypes: [
      { id: "rt-1-1", typeName: "スタンダード", contractQuantity: 80 },
      { id: "rt-1-2", typeName: "デラックス", contractQuantity: 20 },
      { id: "rt-1-3", typeName: "スイート", contractQuantity: 5 },
    ],
    costItems: [
      {
        id: "ci-1-1",
        category: "客室確保費",
        description: "スタンダードルーム（選手団）",
        event: "asia",
        unitPrice: 15000,
        personCount: 80,
        nights: 15,
        budgetAmount: 18000000,
        actualAmount: 17500000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-1-2",
        category: "客室確保費",
        description: "デラックスルーム（技術役員）",
        event: "para",
        unitPrice: 20000,
        personCount: 20,
        nights: 15,
        budgetAmount: 6000000,
        actualAmount: 6000000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-1-3",
        category: "会議室等確保費",
        description: "大会議室（15日間）",
        event: "asia",
        unitPrice: 200000,
        personCount: 1,
        nights: 15,
        budgetAmount: 3000000,
        actualAmount: 2800000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-1-4",
        category: "飲食費",
        description: "朝食・夕食（選手団・技術役員）",
        event: "asia",
        unitPrice: 5000,
        personCount: 100,
        nights: 15,
        budgetAmount: 8000000,
        actualAmount: 8200000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "人数増加のため超過",
      },
      {
        id: "ci-1-5",
        category: "営業補償費",
        description: "一般客室ブロック費",
        event: "asia",
        unitPrice: 0,
        personCount: 0,
        nights: 0,
        budgetAmount: 2000000,
        actualAmount: 2000000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-1-6",
        category: "ランドリーサービス費",
        description: "選手団・技術役員ランドリー",
        event: "asia",
        unitPrice: 1500,
        personCount: 100,
        nights: 15,
        budgetAmount: 2250000,
        actualAmount: 2100000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-1-7",
        category: "その他",
        description: "通信・インターネット費",
        event: "asia",
        unitPrice: 0,
        personCount: 0,
        nights: 0,
        budgetAmount: 500000,
        actualAmount: 480000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
    ],
    notes: "VIPスイートは技術役員専用。チェックイン手続きは別途調整要。",
  },
  {
    id: "hotel-2",
    name: "シティホテル横浜",
    location: "神奈川県横浜市西区",
    groups: ["メディア", "スポンサー"],
    contractStartDate: "2024-07-12",
    contractEndDate: "2024-07-22",
    roomTypes: [
      { id: "rt-2-1", typeName: "シングル", contractQuantity: 60 },
      { id: "rt-2-2", typeName: "ツイン", contractQuantity: 30 },
    ],
    costItems: [
      {
        id: "ci-2-1",
        category: "客室確保費",
        description: "シングルルーム（メディア）",
        event: "asia",
        unitPrice: 12000,
        personCount: 60,
        nights: 10,
        budgetAmount: 7200000,
        actualAmount: 7000000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-2-2",
        category: "客室確保費",
        description: "ツインルーム（スポンサー）",
        event: "para",
        unitPrice: 15000,
        personCount: 30,
        nights: 10,
        budgetAmount: 4500000,
        actualAmount: 4200000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-2-3",
        category: "飲食費",
        description: "朝食",
        event: "para",
        unitPrice: 2000,
        personCount: 90,
        nights: 10,
        budgetAmount: 1800000,
        actualAmount: 1850000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-2-4",
        category: "会議室等確保費",
        description: "プレスルーム（10日間）",
        event: "asia",
        unitPrice: 50000,
        personCount: 1,
        nights: 10,
        budgetAmount: 500000,
        actualAmount: 500000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "24時間利用",
      },
    ],
    notes: "プレスルームは24時間オープン。Wi-Fi環境要確認。",
  },
  {
    id: "hotel-3",
    name: "リゾートホテル葉山",
    location: "神奈川県三浦郡葉山町",
    groups: ["ファミリー", "WF"],
    contractStartDate: "2024-07-15",
    contractEndDate: "2024-07-20",
    roomTypes: [
      { id: "rt-3-1", typeName: "スタンダード", contractQuantity: 30 },
      { id: "rt-3-2", typeName: "オーシャンビュー", contractQuantity: 15 },
    ],
    costItems: [
      {
        id: "ci-3-1",
        category: "客室確保費",
        description: "スタンダードルーム（ファミリー）",
        event: "para",
        unitPrice: 20000,
        personCount: 30,
        nights: 5,
        budgetAmount: 3000000,
        actualAmount: 3000000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-3-2",
        category: "客室確保費",
        description: "オーシャンビュー（WF役員）",
        event: "para",
        unitPrice: 30000,
        personCount: 15,
        nights: 5,
        budgetAmount: 2250000,
        actualAmount: 2250000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-3-3",
        category: "飲食費",
        description: "朝食・夕食",
        event: "para",
        unitPrice: 4000,
        personCount: 45,
        nights: 5,
        budgetAmount: 1500000,
        actualAmount: 1450000,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "",
      },
      {
        id: "ci-3-4",
        category: "営業補償費",
        description: "施設クローズ補償",
        event: "para",
        unitPrice: 0,
        personCount: 0,
        nights: 0,
        budgetAmount: 500000,
        actualAmount: 0,
        executedAmount: 0,
        plannedAmount: 0,
        forecastAmount: 0,
        notes: "交渉中",
      },
    ],
    notes: "WF役員はオーシャンビュー確定。ファミリープログラムあり。",
  },
];

export function useHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setHotels(stored ? JSON.parse(stored) : SAMPLE_HOTELS);
    } catch {
      setHotels(SAMPLE_HOTELS);
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

  const resetToSample = useCallback(() => {
    setHotels(SAMPLE_HOTELS);
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
    resetToSample,
    importHotels,
  };
}
