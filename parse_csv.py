import csv

with open('sheet.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    print("Header:")
    for i, h in enumerate(header):
        print(f"[{i}]: {h}")
        
    row2 = next(reader)
    print("\nRow 2:")
    for i, c in enumerate(row2):
        print(f"[{i}]: {c[:50]}...")
