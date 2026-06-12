// Command tuissh serves amirsalarsafaei.com as a terminal UI over SSH.
// Connect with:
//
//	ssh ssh.amirsalarsafaei.com
//
// It renders a Bubble Tea UI (Wish + Lip Gloss v2) — blog posts, an about
// page and the currently playing track, with album art rendered inline and an
// animated shader banner on capable terminals.
package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/wish/v2"
	"charm.land/wish/v2/activeterm"
	bm "charm.land/wish/v2/bubbletea"
	"charm.land/wish/v2/logging"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/rpc"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/termcaps"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/ui"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/web"
	"github.com/charmbracelet/log"
	"github.com/charmbracelet/ssh"
)

func main() {
	cfg := loadConfig()

	client, err := rpc.Dial(cfg.grpcAddr, cfg.grpcTLS)
	if err != nil {
		log.Fatal("could not create gRPC client", "err", err)
	}
	defer client.Close()

	srv, err := wish.NewServer(
		wish.WithAddress(net.JoinHostPort(cfg.host, cfg.port)),
		wish.WithHostKeyPath(cfg.hostKeyPath),
		wish.WithMiddleware(
			bm.Middleware(teaHandler(client)),
			activeterm.Middleware(), // only allow interactive terminals
			logging.Middleware(),
		),
	)
	if err != nil {
		log.Fatal("could not create server", "err", err)
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	log.Info("starting SSH server", "addr", net.JoinHostPort(cfg.host, cfg.port), "backend", cfg.grpcAddr)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, ssh.ErrServerClosed) {
			log.Fatal("server error", "err", err)
		}
	}()

	// Browser bridge: the same TUI over a WebSocket for xterm.js clients.
	var webSrv *http.Server
	if cfg.webAddr != "" {
		webSrv = &http.Server{Addr: cfg.webAddr, Handler: web.Handler(client)}
		log.Info("starting web terminal bridge", "addr", cfg.webAddr)
		go func() {
			if err := webSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Fatal("web bridge error", "err", err)
			}
		}()
	}

	<-done
	log.Info("shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if webSrv != nil {
		_ = webSrv.Shutdown(ctx)
	}
	if err := srv.Shutdown(ctx); err != nil && !errors.Is(err, ssh.ErrServerClosed) {
		log.Error("could not shut down cleanly", "err", err)
	}
}

// teaHandler builds a Bubble Tea program for each SSH session.
func teaHandler(client *rpc.Client) bm.Handler {
	return func(s ssh.Session) (tea.Model, []tea.ProgramOption) {
		pty, _, active := s.Pty()
		if !active {
			wish.Fatalln(s, "no active terminal — allocate a PTY (ssh -t)")
			return nil, nil
		}

		caps := termcaps.Detect(pty.Term, s.Environ())
		m := ui.New(s.Context(), client, pty.Window.Width, pty.Window.Height, caps)
		return m, nil
	}
}

type config struct {
	host        string
	port        string
	hostKeyPath string
	grpcAddr    string
	grpcTLS     bool
	webAddr     string
}

func loadConfig() config {
	return config{
		host:        env("SSH_HOST", "0.0.0.0"),
		port:        env("SSH_PORT", "23234"),
		hostKeyPath: env("SSH_HOST_KEY_PATH", ".ssh/id_ed25519"),
		grpcAddr:    env("GRPC_ADDR", "localhost:8000"),
		grpcTLS:     envBool("GRPC_TLS", false),
		// WEB_ADDR="" disables the browser bridge.
		webAddr: env("WEB_ADDR", ":2223"),
	}
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	if v, ok := os.LookupEnv(key); ok {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}
