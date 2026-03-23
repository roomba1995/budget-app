#!/usr/bin/env python3
import openpyxl

wb = openpyxl.load_workbook('/workspaces/budget-app/20260206　宿泊費積算根拠.xlsm', data_only=True)
all_sheets = wb.sheetnames

print(f"Total sheets: {len(all_sheets)}\n")

# Find sheets with "別紙"
target_sheets = [s for s in all_sheets if '別紙' in s]
print(f"Sheets with '別紙' ({len(target_sheets)}):")
for i, s in enumerate(target_sheets[:50]):
    print(f"  {i+1}. {s}")

# Find specific example: "2022_ラフォーレ修善寺 別紙1-1"
example = [s for s in all_sheets if '修善寺' in s and '別紙1-1' in s]
if example:
    print(f"\nFound target example: {example[0]}")
else:
    print("\nTarget example not found. Similar sheets:")
    for s in all_sheets:
        if '修善寺' in s or 'ラフォーレ' in s:
            print(f"  - {s}")

wb.close()
