package main

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var db *sql.DB

func InitDB() {
	var err error
	db, err = sql.Open("sqlite", "./spending.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Create table if not exists
	// We'll use a combination of transaction_date, amount, and description as a unique key for deduplication.
	// We generate a deterministic hash or just use a UNIQUE constraint on these three fields.
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS transactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		transaction_date TEXT,
		post_date TEXT,
		description TEXT,
		category TEXT,
		type TEXT,
		amount REAL,
		memo TEXT,
		UNIQUE(transaction_date, amount, description)
	);
	`
	if _, err := db.Exec(createTableQuery); err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	createBudgetsTable := `
	CREATE TABLE IF NOT EXISTS budgets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		month TEXT,
		category TEXT,
		amount REAL,
		UNIQUE(month, category)
	);`
	if _, err := db.Exec(createBudgetsTable); err != nil {
		log.Fatalf("Failed to create budgets table: %v", err)
	}
}

type Transaction struct {
	ID              int     `json:"id"`
	TransactionDate string  `json:"transaction_date"`
	PostDate        string  `json:"post_date"`
	Description     string  `json:"description"`
	Category        string  `json:"category"`
	Type            string  `json:"type"`
	Amount          float64 `json:"amount"`
	Memo            string  `json:"memo"`
}
