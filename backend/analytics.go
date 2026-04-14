package main

import (
	"fmt"
	"sort"
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

	type transRecord struct {
		date   time.Time
		amount float64
	}

	groups := make(map[string][]transRecord)
	for rows.Next() {
		var desc string
		var amount float64
		var dateStr string
		if err := rows.Scan(&desc, &amount, &dateStr); err != nil {
			continue
		}

		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			date, _ = time.Parse("1/2/2006", dateStr)
		}

		groups[desc] = append(groups[desc], transRecord{date: date, amount: amount})
	}

	var subs []Subscription
	for desc, records := range groups {
		if len(records) < 3 {
			continue
		}

		// Check if they are in different months
		months := make(map[string]bool)
		latest := records[0].date
		totalAmount := 0.0

		for _, r := range records {
			months[r.date.Format("2006-01")] = true
			if r.date.After(latest) {
				latest = r.date
			}
			totalAmount += r.amount
		}

		if len(months) >= 3 {
			// Calculate the average amount spent per instance
			avgAmount := totalAmount / float64(len(records))
			subs = append(subs, Subscription{
				Description: desc,
				Amount:      -avgAmount,
				Frequency:   "Monthly",
				LastDate:    latest.Format("2006-01-02"),
			})
		}
	}

	return subs, nil
}

func getMonthlyTrends() ([]TrendData, error) {
	rows, err := db.Query("SELECT transaction_date, amount FROM transactions WHERE amount < 0")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	monthlyTotals := make(map[string]float64)
	var monthKeys []string

	for rows.Next() {
		var dateStr string
		var amount float64
		if err := rows.Scan(&dateStr, &amount); err != nil {
			continue
		}

		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			date, err = time.Parse("1/2/2006", dateStr)
			if err != nil {
				continue
			}
		}

		monthKey := date.Format("2006-01")
		if _, exists := monthlyTotals[monthKey]; !exists {
			monthKeys = append(monthKeys, monthKey)
		}
		monthlyTotals[monthKey] += amount
	}

	sort.Strings(monthKeys)

	var results []TrendData
	for _, m := range monthKeys {
		results = append(results, TrendData{
			Month:      m,
			TotalSpend: -monthlyTotals[m],
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
