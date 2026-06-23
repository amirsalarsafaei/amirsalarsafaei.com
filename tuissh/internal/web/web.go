// Package web bridges a browser terminal (xterm.js) to the exact same Bubble
// Tea program served over SSH. Each WebSocket connection runs one TUI session
// with the socket as its input/output, so the website can offer the full
// tuissh experience — album art, shader, blogs — with zero duplicated UI code.
//
// Wire protocol (text frames, browser → server):
//
//	"i" + bytes      raw keystrokes from xterm's onData
//	"r" + "cols,rows" a resize from xterm's onResize
//
// Server → browser frames are binary: raw terminal output to feed term.write.
package web

import (
	"context"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"

	tea "charm.land/bubbletea/v2"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/rpc"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/ui"
	"github.com/charmbracelet/colorprofile"
	"github.com/coder/websocket"
)

// Handler returns the HTTP handler for the browser bridge:
//
//	GET /ws  — the WebSocket that runs a TUI session
//	GET /    — a self-contained demo page (xterm.js via CDN) for quick testing
func Handler(client *rpc.Client) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", wsHandler(client))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, demoPage)
	})
	return mux
}

func wsHandler(client *rpc.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			// Prototype: accept any origin. Tighten with OriginPatterns in prod.
			InsecureSkipVerify: true,
		})
		if err != nil {
			return
		}
		// Generous read limit so pastes aren't truncated.
		conn.SetReadLimit(1 << 20)

		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()
		defer conn.CloseNow()

		cols := atoiDefault(r.URL.Query().Get("cols"), 100)
		rows := atoiDefault(r.URL.Query().Get("rows"), 30)

		// Browser keystrokes flow through this pipe into the program's input.
		pr, pw := io.Pipe()
		defer pw.Close()
		out := &wsWriter{ctx: ctx, conn: conn}

		m := ui.New(ctx, client, cols, rows)
		prog := tea.NewProgram(m,
			tea.WithContext(ctx),
			tea.WithInput(pr),
			tea.WithOutput(out),
			// Without an explicit environment Bubble Tea falls back to the
			// server process's os.Environ(), where TERM is unset. The renderer
			// derives its capabilities from TERM, so an empty value leaves it
			// with *no* capabilities — it loses absolute cursor positioning
			// (CHA/HPA) and erase-char (ECH), and full-screen redraws shift and
			// fail to clear. xterm.js is an xterm, so advertise that. (The SSH
			// path works precisely because Wish sets TERM from the pty-req.)
			tea.WithEnvironment([]string{"TERM=xterm-256color", "COLORTERM=truecolor"}),
			// Browsers (xterm.js) are truecolor; force it so colours aren't
			// stripped for a non-tty writer. This also makes Bubble Tea emit a
			// ColorProfileMsg, lighting up the shader and half-block album art.
			tea.WithColorProfile(colorprofile.TrueColor),
			tea.WithWindowSize(cols, rows),
		)

		go func() {
			_, _ = prog.Run()
			cancel()
			_ = conn.Close(websocket.StatusNormalClosure, "session ended")
		}()

		for {
			_, data, err := conn.Read(ctx)
			if err != nil {
				break
			}
			if len(data) == 0 {
				continue
			}
			switch data[0] {
			case 'i':
				if _, err := pw.Write(data[1:]); err != nil {
					cancel()
				}
			case 'r':
				if c, rr, ok := parseResize(string(data[1:])); ok {
					prog.Send(tea.WindowSizeMsg{Width: c, Height: rr})
				}
			}
		}

		cancel()
		prog.Kill()
	}
}

// wsWriter adapts the program's output to binary WebSocket frames. Only the
// renderer writes here, so a single mutex is ample.
type wsWriter struct {
	ctx  context.Context
	conn *websocket.Conn
	mu   sync.Mutex
}

func (w *wsWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if err := w.conn.Write(w.ctx, websocket.MessageBinary, p); err != nil {
		return 0, err
	}
	return len(p), nil
}

func parseResize(s string) (cols, rows int, ok bool) {
	c, r, found := strings.Cut(s, ",")
	if !found {
		return 0, 0, false
	}
	cols, err1 := strconv.Atoi(strings.TrimSpace(c))
	rows, err2 := strconv.Atoi(strings.TrimSpace(r))
	if err1 != nil || err2 != nil || cols <= 0 || rows <= 0 {
		return 0, 0, false
	}
	return cols, rows, true
}

func atoiDefault(s string, def int) int {
	if n, err := strconv.Atoi(s); err == nil && n > 0 {
		return n
	}
	return def
}
