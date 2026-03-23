#!/usr/bin/env python3
"""Extract specific contract sheet template"""
import openpyxl
import json

# Target sheet name
target_name = "2022_ラフォーレ修善寺 別紙1-1"

wb = openpyxl.load_workbook('/workspaces/budget-app/20260206　宿泊費積算根拠.xlsm', data_only=True)

# First, check if exact name exists
if target_name in wb.sheetnames:
    ws = wb[target_name]
    print(f"Found exact sheet: {target_name}\n")
    
    # Extract first 10 rows with data
    rows = []
    for row in ws.iter_rows(values_only=True):
        rows.append(list(row))
        if len(rows) >= 20:
            break
    
    # Print header
    if rows:
        print("First 20 rows:")
        for i, row in enumerate(rows):
            print(f"Row {i}: {row[:15]}")  # First 15 cols
else:
    # Search for similar sheets
    print(f"Exact match not found. Searching for similar sheets...\n")
    
    for sheet_name in wb.sheetnames:
        if '別紙1-1' in sheet_name and ('2022' in sheet_name or '修善寺' in sheet_name or 'ラフォーレ' in sheet_name):
            print(f"Found: {sheet_name}")

wb.close()
