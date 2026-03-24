"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Hotel, Group } from "@/types";

// C列(index2)〜L列(index11) → グループのマッピング
// A列: 施設番号, B列: 施設名, C列以降: 配宿グループ
const COLUMN_GROUP_MAP: Record<number, Group> = {
  2: "アジア選手団",  // C: アジア選手
  3: "パラ選手団",   // D: パラ選手
  4: "アジアファミリー", // E: アジアファミリー
  5: "パラファミリー",  // F: パラファミリー
  6: "アジア技術役員",  // G: アジア技術役員
  7: "アジアスポンサー", // H: アジアスポンサー
  8: "アジアメディア",  // I: アジアメディア
  9: "パラ技術役員",   // J: パラ技術役員
  10: "パラスポンサー", // K: パラスポンサー
  11: "パラメディア",  // L: パラメディア
};

const COLUMN_LABELS: Record<number, string> = {
  2: "アジア選手",
  3: "パラ選手",
  4: "アジアファミリー",
  5: "パラファミリー",
  6: "アジア技術役員",
  7: "アジアスポンサー",
  8: "アジアメディア",
  9: "パラ技術役員",
  10: "パラスポンサー",
  11: "パラメディア",
};

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function parseHotelsFromSheet(sheet: XLSX.WorkSheet): Hotel[] {
  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  });

  const hotels: Hotel[] = [];

  for (const row of rows) {
    const facilityNo = row[0]; // A列: 施設番号
    const name = row[1];       // B列: 施設名

    // 施設名が空の行はスキップ
    if (!name || String(name).trim() === "") continue;
    // 施設名が文字列でない（ヘッダー行等）はスキップ
    const nameStr = String(name).trim();
    if (nameStr === "施設名" || nameStr === "名称" || nameStr === "施設番号") continue;

    // D〜M列の有無でグループを決定（重複除去）
    const groupSet = new Set<Group>();
    for (const colIdx of Object.keys(COLUMN_GROUP_MAP).map(Number)) {
      const cell = row[colIdx];
      if (cell !== null && cell !== undefined && String(cell).trim() !== "") {
        groupSet.add(COLUMN_GROUP_MAP[colIdx]);
      }
    }

    hotels.push({
      id: genId(),
      facilityNo: facilityNo !== null && facilityNo !== undefined
        ? String(facilityNo).trim()
        : undefined,
      name: nameStr,
      location: "",
      groups: Array.from(groupSet),
      contractStatus: "未着手",
      contractStartDate: "",
      contractEndDate: "",
      roomTypes: [],
      costItems: [],
      notes: "",
    });
  }

  return hotels;
}

interface Props {
  onImport: (hotels: Hotel[]) => void;
  onClose: () => void;
}

export default function ExcelImportModal({ onImport, onClose }: Props) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");
  const [preview, setPreview] = useState<Hotel[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        setWorkbook(wb);
        setSelectedSheet(wb.SheetNames[0]);
        const parsed = parseHotelsFromSheet(wb.Sheets[wb.SheetNames[0]]);
        setPreview(parsed);
      } catch {
        setError("Excelファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      const parsed = parseHotelsFromSheet(workbook.Sheets[sheetName]);
      setPreview(parsed);
    }
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    if (confirm(`${preview.length}件の施設をインポートします。現在のデータはすべて置き換えられます。よろしいですか？`)) {
      onImport(preview);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Excelから施設をインポート</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 列マッピング説明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-2">読み込む列の構成</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
              <div>A列: 施設番号</div>
              <div>B列: 施設名</div>
              {Object.entries(COLUMN_LABELS).map(([col, label]) => (
                <div key={col}>
                  {String.fromCharCode(65 + Number(col))}列: {label}
                </div>
              ))}
            </div>
          </div>

          {/* ファイル選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excelファイルを選択
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {fileName && (
              <p className="mt-1 text-xs text-gray-500">{fileName}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* シート選択 */}
          {workbook && workbook.SheetNames.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                シートを選択（全{workbook.SheetNames.length}シート）
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {workbook.SheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* プレビュー */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                プレビュー（{preview.length}件の施設が見つかりました）
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 border-b">施設番号</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 border-b">施設名</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 border-b">グループ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {h.facilityNo || "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-900 whitespace-nowrap">
                            {h.name}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {h.groups.length === 0 ? (
                                <span className="text-gray-400 text-xs">—</span>
                              ) : (
                                h.groups.map((g) => (
                                  <span
                                    key={g}
                                    className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700"
                                  >
                                    {g}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {workbook && preview.length === 0 && !error && (
            <p className="text-sm text-gray-500 text-center py-4">
              選択したシートに施設データが見つかりませんでした。シートを変更してください。
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleImport}
            disabled={preview.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {preview.length > 0 ? `${preview.length}件をインポート` : "インポート"}
          </button>
        </div>
      </div>
    </div>
  );
}
