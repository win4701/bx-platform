package audit

import (
	"database/sql"
	"time"
)

type Service struct {
	db *sql.DB
}

func New(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) Log(uid int, action string, metadata string) {

	s.db.Exec(`
	INSERT INTO audit_logs(uid, action, metadata, created_at)
	VALUES (?, ?, ?, ?)
	`, uid, action, metadata, time.Now().Unix())
}
