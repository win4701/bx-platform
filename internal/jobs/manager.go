package jobs

import (
	"context"
	"sync"
)

type Job interface {
	Start(ctx context.Context)
}

type Manager struct {
	jobs []Job
}

func New() *Manager {
	return &Manager{}
}

func (m *Manager) Register(job Job) {
	m.jobs = append(m.jobs, job)
}

func (m *Manager) Start(ctx context.Context) {

	var wg sync.WaitGroup

	for _, job := range m.jobs {
		wg.Add(1)

		go func(j Job) {
			defer wg.Done()
			j.Start(ctx)
		}(job)
	}

	<-ctx.Done()
	wg.Wait()
}
