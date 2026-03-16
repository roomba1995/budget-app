"use client";

import { useState, useEffect, useCallback } from "react";
import { Hotel, CostItem, Group } from "@/types";

const STORAGE_KEY = "hotel-budget-data-v1";

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
        category: "客室料金",
        description: "スタンダードルーム（15泊）",
        budgetAmount: 18000000,
        actualAmount: 17500000,
        notes: "",
      },
      {
        id: "ci-1-2",
        category: "客室料金",
        description: "デラックスルーム（15泊）",
        budgetAmount: 6000000,
        actualAmount: 6000000,
        notes: "",
      },
      {
        id: "ci-1-3",
        category: "ファンクションルーム料金",
        description: "大会議室（15日間）",
        budgetAmount: 3000000,
        actualAmount: 2800000,
        notes: "",
      },
      {
        id: "ci-1-4",
        category: "食費",
        description: "朝食・夕食（選手団・技術役員）",
        budgetAmount: 8000000,
        actualAmount: 8200000,
        notes: "人数増加のため超過",
      },
      {
        id: "ci-1-5",
        category: "営業補償費",
        description: "一般客室ブロック費",
        budgetAmount: 2000000,
        actualAmount: 2000000,
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
        category: "客室料金",
        description: "シングルルーム（10泊）",
        budgetAmount: 7200000,
        actualAmount: 7000000,
        notes: "",
      },
      {
        id: "ci-2-2",
        category: "客室料金",
        description: "ツインルーム（10泊）",
        budgetAmount: 4500000,
        actualAmount: 4200000,
        notes: "",
      },
      {
        id: "ci-2-3",
        category: "食費",
        description: "朝食",
        budgetAmount: 1800000,
        actualAmount: 1850000,
        notes: "",
      },
      {
        id: "ci-2-4",
        category: "ファンクションルーム料金",
        description: "プレスルーム（10日間）",
        budgetAmount: 500000,
        actualAmount: 500000,
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
        category: "客室料金",
        description: "スタンダードルーム（5泊）",
        budgetAmount: 3000000,
        actualAmount: 3000000,
        notes: "",
      },
      {
        id: "ci-3-2",
        category: "客室料金",
        description: "オーシャンビュー（5泊）",
        budgetAmount: 2250000,
        actualAmount: 2250000,
        notes: "",
      },
      {
        id: "ci-3-3",
        category: "食費",
        description: "朝食・夕食",
        budgetAmount: 1500000,
        actualAmount: 1450000,
        notes: "",
      },
      {
        id: "ci-3-4",
        category: "営業補償費",
        description: "施設クローズ補償",
        budgetAmount: 500000,
        actualAmount: 0,
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
  };
}
