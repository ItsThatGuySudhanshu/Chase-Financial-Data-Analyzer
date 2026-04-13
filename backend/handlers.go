package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
)

type Budget struct {
	ID       int     `json:"id"`
	Month    string  `json:"month"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

func getBudgets(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, month, category, amount FROM budgets")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var budgets []Budget
	for rows.Next() {
		var b Budget
		if err := rows.Scan(&b.ID, &b.Month, &b.Category, &b.Amount); err == nil {
			budgets = append(budgets, b)
		}
	}
	if budgets == nil {
		budgets = []Budget{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(budgets)
}

func setBudget(w http.ResponseWriter, r *http.Request) {
	var b Budget
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	query := `INSERT INTO budgets (month, category, amount) 
	          VALUES (?, ?, ?) 
	          ON CONFLICT(month, category) 
	          DO UPDATE SET amount = excluded.amount`
	_, err := db.Exec(query, b.Month, b.Category, b.Amount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func setBudgetsBulk(w http.ResponseWriter, r *http.Request) {
	var budgets []Budget
	if err := json.NewDecoder(r.Body).Decode(&budgets); err != nil {
		http.Error(w, "Invalid input payload", http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "Failed to start tx", http.StatusInternalServerError)
		return
	}

	query := `INSERT INTO budgets (month, category, amount) 
	          VALUES (?, ?, ?) 
	          ON CONFLICT(month, category) 
	          DO UPDATE SET amount = excluded.amount`
	          
	stmt, err := tx.Prepare(query)
	if err != nil {
	    tx.Rollback()
		http.Error(w, "Failed to prep tx", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	for _, b := range budgets {
	    if b.Amount > 0 { // Safety skip
		    _, err = stmt.Exec(b.Month, b.Category, b.Amount)
		    if err != nil {
			    tx.Rollback()
			    http.Error(w, err.Error(), http.StatusInternalServerError)
			    return
		    }
		}
	}
	
	if err := tx.Commit(); err != nil {
	    http.Error(w, "Failed to commit tx", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "count": fmt.Sprintf("%d", len(budgets))})
}

func deleteBudget(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Missing budget id", http.StatusBadRequest)
		return
	}

	_, err := db.Exec("DELETE FROM budgets WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func getTransactions(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT t.id, t.transaction_date, t.post_date, t.description, t.category, t.type, t.amount, t.memo, t.custom_category,
		       GROUP_CONCAT(tg.name) as tags
		FROM transactions t
		LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
		LEFT JOIN tags tg ON tt.tag_id = tg.id
		GROUP BY t.id
		ORDER BY t.transaction_date DESC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var t Transaction
		var tags sql.NullString
		if err := rows.Scan(&t.ID, &t.TransactionDate, &t.PostDate, &t.Description, &t.Category, &t.Type, &t.Amount, &t.Memo, &t.CustomCategory, &tags); err != nil {
			continue
		}
		if tags.Valid {
			t.Tags = strings.Split(tags.String, ",")
		} else {
			t.Tags = []string{}
		}
		transactions = append(transactions, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

// Rules Handlers

type Rule struct {
	ID                 int    `json:"id"`
	DescriptionPattern string `json:"description_pattern"`
	CategoryToApply    string `json:"category_to_apply"`
}

func getRules(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, description_pattern, category_to_apply FROM rules")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var rules []Rule
	for rows.Next() {
		var rule Rule
		if err := rows.Scan(&rule.ID, &rule.DescriptionPattern, &rule.CategoryToApply); err == nil {
			rules = append(rules, rule)
		}
	}
	if rules == nil {
		rules = []Rule{}
	}
	json.NewEncoder(w).Encode(rules)
}

func addRule(w http.ResponseWriter, r *http.Request) {
	var rule Rule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	_, err := db.Exec("INSERT INTO rules (description_pattern, category_to_apply) VALUES (?, ?)", rule.DescriptionPattern, rule.CategoryToApply)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	// Apply rule to existing transactions
	_, _ = db.Exec("UPDATE transactions SET custom_category = ? WHERE description LIKE ?", rule.CategoryToApply, "%"+rule.DescriptionPattern+"%")

	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func deleteRule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := db.Exec("DELETE FROM rules WHERE id = ?", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// Tagging Handlers

func addTag(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TransactionID int    `json:"transaction_id"`
		TagName       string `json:"tag_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Insert tag if not exists
	_, _ = db.Exec("INSERT OR IGNORE INTO tags (name) VALUES (?)", input.TagName)
	
	var tagID int
	err := db.QueryRow("SELECT id FROM tags WHERE name = ?", input.TagName).Scan(&tagID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)", input.TransactionID, tagID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func updateTransactionCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input struct {
		Category string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	_, err := db.Exec("UPDATE transactions SET custom_category = ? WHERE id = ?", input.Category, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// Analytics Handlers

func getSubscriptionsHandler(w http.ResponseWriter, r *http.Request) {
	subs, err := detectSubscriptions()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(subs)
}

func getTrendsHandler(w http.ResponseWriter, r *http.Request) {
	trends, err := getMonthlyTrends()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(trends)
}

func exportCSVHandler(w http.ResponseWriter, r *http.Request) {
	csvData, err := generateCSVData()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment;filename=transactions.csv")
	w.Write([]byte(csvData))
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
	sheetsDir, err := GetSheetsDir()
	if err != nil {
		log.Printf("Error getting sheets dir: %v\n", err)
		return 0
	}
	
	files, err := os.ReadDir(sheetsDir)
	if err != nil {
		return 0
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

// Setup Handlers

func getSetupStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"initialized": IsInitialized(),
	})
}

func initializeSetup(w http.ResponseWriter, r *http.Request) {
	err := InitializeWorkspace()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to initialize workspace: %v", err), http.StatusInternalServerError)
		return
	}

	// Re-initialize DB now that directory exists
	InitDB()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
	})
}
