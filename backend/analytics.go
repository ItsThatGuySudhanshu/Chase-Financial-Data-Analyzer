package main

import (
	"fmt"
	"strings"
	"time"
)

type Subscription struct {
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	Frequency   string  `json:"frequency"`
	LastDate    string  `json:"last_date"`
}

type TrendData struct {
	Month       string  `json:"month"`
	TotalSpend  float64 `json:"total_spend"`
	PrevMonth   float64 `json:"prev_month"`
	PercentChange float64 `json:"percent_change"`
}

func detectSubscriptions() ([]Subscription, error) {
	rows, err := db.Query("SELECT description, amount, transaction_date FROM transactions WHERE amount < 0")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type transKey struct {
		desc   string
		amount float64
	}

	groups := make(map[transKey][]time.Time)
	for rows.Next() {
		var desc string
		var amount float64
		var dateStr string
		if err := rows.Scan(&desc, &amount, &dateStr); err != nil {
			continue
		}

		// Clean description to group similar ones (e.g. "Netflix.com" and "Netflix")
		// For simplicity we'll just use exact for now, but usually we filter out dates/IDs
		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			// Try other formats if needed
			date, _ = time.Parse("1/2/2006", dateStr)
		}

		key := transKey{desc: desc, amount: amount}
		groups[key] = append(groups[key], date)
	}

	var subs []Subscription
	for key, dates := range groups {
		if len(dates) < 3 {
			continue
		}

		// Check if they are in different months
		months := make(map[string]bool)
		latest := dates[0]
		for _, d := range dates {
			months[d.Format("2006-01")] = true
			if d.After(latest) {
				latest = d
			}
		}

		if len(months) >= 3 {
			subs = append(subs, Subscription{
				Description: key.desc,
				Amount:      -key.amount,
				Frequency:   "Monthly",
				LastDate:    latest.Format("2006-01-02"),
			})
		}
	}

	return subs, nil
}

func getMonthlyTrends() ([]TrendData, error) {
	rows, err := db.Query(`
		SELECT strftime('%Y-%m', transaction_date) as month, SUM(amount) 
		FROM transactions 
		WHERE amount < 0 
		GROUP BY month 
		ORDER BY month ASC
	`)
	if err != nil {
		// If sqlite version doesn't support strftime nicely on some date formats, 
		// we might need more robust parsing.
		return nil, err
	}
	defer rows.Close()

	var results []TrendData
	for rows.Next() {
		var m string
		var total float64
		if err := rows.Scan(&m, &total); err != nil {
			continue
		}
		results = append(results, TrendData{
			Month:      m,
			TotalSpend: -total,
		})
	}

	for i := 1; i < len(results); i++ {
		prev := results[i-1].TotalSpend
		curr := results[i].TotalSpend
		results[i].PrevMonth = prev
		if prev != 0 {
			results[i].PercentChange = ((curr - prev) / prev) * 100
		}
	}

	return results, nil
}

func generateCSVData() (string, error) {
	rows, err := db.Query("SELECT transaction_date, description, category, amount FROM transactions ORDER BY transaction_date DESC")
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var sb strings.Builder
	sb.WriteString("Date,Description,Category,Amount\n")
	for rows.Next() {
		var date, desc, cat string
		var amount float64
		if err := rows.Scan(&date, &desc, &cat, &amount); err != nil {
			continue
		}
		sb.WriteString(fmt.Sprintf("%s,\"%s\",\"%s\",%.2f\n", date, strings.ReplaceAll(desc, "\"", "\"\""), cat, amount))
	}

	return sb.String(), nil
}
