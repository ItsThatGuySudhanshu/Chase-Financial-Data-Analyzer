package main

import (
	"os"
	"path/filepath"
)

func GetWorkspaceDir() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	exeDir := filepath.Dir(exe)
	return filepath.Join(exeDir, "chase-analyzer-data"), nil
}

func GetDBPath() (string, error) {
	dir, err := GetWorkspaceDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "spending.db"), nil
}

func GetSheetsDir() (string, error) {
	dir, err := GetWorkspaceDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "sheets"), nil
}

func IsInitialized() bool {
	dir, err := GetWorkspaceDir()
	if err != nil {
		return false
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

	// Create sheets directory
	sheets, _ := GetSheetsDir()
	if err := os.MkdirAll(sheets, 0755); err != nil {
		return err
	}

	// Create marker file
	return os.WriteFile(filepath.Join(dir, ".initialized"), []byte("granted"), 0644)
}
