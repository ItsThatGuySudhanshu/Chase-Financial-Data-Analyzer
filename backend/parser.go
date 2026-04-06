package main

import (
	"encoding/csv"
	"io"
	"log"
	"strconv"
	"strings"
)

// ParseChaseCSV reads a CSV from the given reader and inserts it into DB.
func ParseChaseCSV(reader io.Reader) (int, error) {
	csvReader := csv.NewReader(reader)
	// Sometimes Chase CSVs have extra fields or commas, let's be flexible
	csvReader.FieldsPerRecord = -1
	csvReader.LazyQuotes = true

	records, err := csvReader.ReadAll()
	if err != nil {
		return 0, err
	}

	if len(records) < 2 {
		return 0, nil // Nothing to parse
	}

	inserted := 0
	// Try to find column mapping
	header := records[0]
	colMap := make(map[string]int)
	for i, col := range header {
		colMap[strings.TrimSpace(col)] = i
	}

	for _, row := range records[1:] {
		if len(row) == 0 {
			continue
		}

		t := Transaction{}
		
		if idx, ok := colMap["Transaction Date"]; ok && idx < len(row) {
			t.TransactionDate = row[idx]
		}
		if idx, ok := colMap["Post Date"]; ok && idx < len(row) {
			t.PostDate = row[idx]
		}
		if idx, ok := colMap["Description"]; ok && idx < len(row) {
			t.Description = row[idx]
		}
		if idx, ok := colMap["Category"]; ok && idx < len(row) {
			t.Category = row[idx]
		}
		if idx, ok := colMap["Type"]; ok && idx < len(row) {
			t.Type = row[idx]
		}
		if idx, ok := colMap["Amount"]; ok && idx < len(row) {
			amountStr := strings.TrimSpace(row[idx])
			if amountStr != "" {
				parsedAmount, err := strconv.ParseFloat(amountStr, 64)
				if err == nil {
					t.Amount = parsedAmount
				} else {
					log.Printf("Error parsing amount '%s': %v\n", amountStr, err)
				}
			}
		}
		if idx, ok := colMap["Memo"]; ok && idx < len(row) {
			t.Memo = row[idx]
		}

		// Insert into db using OR IGNORE for deduplication
		insertQuery := `
		INSERT OR IGNORE INTO transactions (transaction_date, post_date, description, category, type, amount, memo)
		VALUES (?, ?, ?, ?, ?, ?, ?)`
		
		res, err := db.Exec(insertQuery, t.TransactionDate, t.PostDate, t.Description, t.Category, t.Type, t.Amount, t.Memo)
		if err == nil {
			rowsAffected, _ := res.RowsAffected()
			if rowsAffected > 0 {
				inserted++
			}
		} else {
			log.Printf("DB error: %v", err)
		}
	}

	return inserted, nil
}
