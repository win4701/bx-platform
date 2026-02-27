type Listener struct {
	bscClient *bsc.Client
	tonClient *ton.Client
	db        *sql.DB
}

func (l *Listener) Start() {

	go l.watchBSC()
	go l.watchTON()
}
