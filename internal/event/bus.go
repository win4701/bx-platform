package event

import "sync"

type Handler func(payload interface{})

type Bus struct {
	handlers map[string][]Handler
	mu       sync.RWMutex
}

func NewBus() *Bus {
	return &Bus{
		handlers: make(map[string][]Handler),
	}
}

func (b *Bus) Subscribe(event string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.handlers[event] = append(b.handlers[event], handler)
}

func (b *Bus) Publish(event string, payload interface{}) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if hs, ok := b.handlers[event]; ok {
		for _, h := range hs {
			go h(payload)
		}
	}
}
