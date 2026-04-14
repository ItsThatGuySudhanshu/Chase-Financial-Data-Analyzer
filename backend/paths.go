package main

import (
	"os"
	"path/filepath"
	"strings"
)

func GetWorkspaceDir() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	exeDir := filepath.Dir(exe)
	
	// When using "go run", the compiled executable goes to the Temp directory.
	// If so, fallback to the current working directory.
	if strings.HasPrefix(strings.ToLower(exeDir), strings.ToLower(os.TempDir())) || strings.Contains(strings.ToLower(exeDir), "go-build") {
		cwd, err := os.Getwd()
		if err == nil {
			return filepath.Join(cwd, "chase-analyzer-data"), nil
		}
	}

	return filepath.Join(exeDir, "chase-analyzer-data"), nil
}

func GetDBPath() (string, error) {
	dir, err := GetWorkspaceDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "spending.db"), nil
}



func IsInitialized() bool {
	dir, err := GetWorkspaceDir()
	if err != nil {
		return false
	}
	
	if db != nil {
		var count int
		if err := db.QueryRow("SELECT COUNT(*) FROM transactions").Scan(&count); err == nil && count > 0 {
			return true
		}
	}

	// Check for a marker file that indicates permission was granted
	_, err = os.Stat(filepath.Join(dir, ".initialized"))
	return err == nil
}

func InitializeWorkspace() error {
	dir, err := GetWorkspaceDir()
	if err != nil {
		return err
	}

	// Create main directory
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}



	// Create marker file
	return os.WriteFile(filepath.Join(dir, ".initialized"), []byte("granted"), 0644)
}
