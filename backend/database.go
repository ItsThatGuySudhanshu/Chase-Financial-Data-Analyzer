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
		custom_category TEXT,
		UNIQUE(transaction_date, amount, description)
	);
	`
	if _, err := db.Exec(createTableQuery); err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	// Migrations for existing database
	_, _ = db.Exec("ALTER TABLE transactions ADD COLUMN custom_category TEXT")

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

	createRulesTable := `
	CREATE TABLE IF NOT EXISTS rules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		description_pattern TEXT UNIQUE,
		category_to_apply TEXT
	);`
	if _, err := db.Exec(createRulesTable); err != nil {
		log.Fatalf("Failed to create rules table: %v", err)
	}

	createTagsTable := `
	CREATE TABLE IF NOT EXISTS tags (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE
	);`
	if _, err := db.Exec(createTagsTable); err != nil {
		log.Fatalf("Failed to create tags table: %v", err)
	}

	createTransactionTagsTable := `
	CREATE TABLE IF NOT EXISTS transaction_tags (
		transaction_id INTEGER,
		tag_id INTEGER,
		PRIMARY KEY(transaction_id, tag_id),
		FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
		FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
	);`
	if _, err := db.Exec(createTransactionTagsTable); err != nil {
		log.Fatalf("Failed to create transaction_tags table: %v", err)
	}
}

type Transaction struct {
	ID              int      `json:"id"`
	TransactionDate string   `json:"transaction_date"`
	PostDate        string   `json:"post_date"`
	Description     string   `json:"description"`
	Category        string   `json:"category"`
	Type            string   `json:"type"`
	Amount          float64  `json:"amount"`
	Memo            string   `json:"memo"`
	CustomCategory  string   `json:"custom_category"`
	Tags            []string `json:"tags"`
}
