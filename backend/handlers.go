package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func getTransactions(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, transaction_date, post_date, description, category, type, amount, memo FROM transactions ORDER BY transaction_date DESC")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(&t.ID, &t.TransactionDate, &t.PostDate, &t.Description, &t.Category, &t.Type, &t.Amount, &t.Memo); err != nil {
			continue
		}
		transactions = append(transactions, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

func getSummary(w http.ResponseWriter, r *http.Request) {
	// Summary by category for negative amounts (spending)
	rows, err := db.Query("SELECT category, SUM(amount) FROM transactions WHERE amount < 0 GROUP BY category")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	summary := make(map[string]float64)
	for rows.Next() {
		var category string
		var total float64
		if err := rows.Scan(&category, &total); err != nil {
			continue
		}
		// Convert to positive for easier display
		summary[category] = -total
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func ScanLocalSheetsDir() int {
	sheetsDir := filepath.Join("..", "sheets")
	files, err := os.ReadDir(sheetsDir)
	if err != nil {
		sheetsDir = "sheets"
		files, err = os.ReadDir(sheetsDir)
		if err != nil {
			return 0
		}
	}

	totalInserted := 0
	for _, file := range files {
		if !file.IsDir() && strings.ToLower(filepath.Ext(file.Name())) == ".csv" {
			filePath := filepath.Join(sheetsDir, file.Name())
			f, err := os.Open(filePath)
			if err != nil {
				continue
			}
			inserted, _ := ParseChaseCSV(f)
			totalInserted += inserted
			f.Close()
		}
	}
	return totalInserted
}

func scanSheets(w http.ResponseWriter, r *http.Request) {
	totalInserted := ScanLocalSheetsDir()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"inserted": totalInserted,
	})
}

func uploadSheet(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(10 << 20) // 10 MB max
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	inserted, err := ParseChaseCSV(file)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error parsing CSV: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"inserted": inserted,
	})
}
