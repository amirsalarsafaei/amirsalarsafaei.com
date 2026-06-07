// Command ssh-site serves amirsalarsafaei.com over SSH. Connect with:
//
//	ssh ssh.amirsalarsafaei.com
//
// It renders a Bubble Tea UI (Wish + Lip Gloss) whose content — blog posts and
// the currently playing Spotify track — is fetched from the very same backend
// gRPC services the website consumes over gRPC-Web.
package main

import (
	"context"
	"errors"
	"net"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/amirsalarsafaei/amirsalarsafaei.com/ssh/internal/rpc"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/ssh/internal/ui"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/log"
	"github.com/charmbracelet/ssh"
	"github.com/charmbracelet/wish"
	"github.com/charmbracelet/wish/activeterm"
	bm "github.com/charmbracelet/wish/bubbletea"
	"github.com/charmbracelet/wish/logging"
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

	<-done
	log.Info("shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
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

		renderer := bm.MakeRenderer(s)
		m := ui.New(client, renderer, pty.Window.Width, pty.Window.Height)
		return m, []tea.ProgramOption{tea.WithAltScreen()}
	}
}

type config struct {
	host        string
	port        string
	hostKeyPath string
	grpcAddr    string
	grpcTLS     bool
}

func loadConfig() config {
	return config{
		host:        env("SSH_HOST", "0.0.0.0"),
		port:        env("SSH_PORT", "23234"),
		hostKeyPath: env("SSH_HOST_KEY_PATH", ".ssh/id_ed25519"),
		grpcAddr:    env("GRPC_ADDR", "localhost:8000"),
		grpcTLS:     envBool("GRPC_TLS", false),
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
