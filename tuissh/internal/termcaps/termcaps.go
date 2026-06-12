// Package termcaps figures out what a connecting client's terminal can do.
//
// Over SSH the only thing we can reliably see is the TERM value from the
// pty-req (plus whatever the client chose to forward via SendEnv). That's
// enough to know whether the terminal speaks a pixel-graphics protocol; the
// finer-grained colour capability (truecolor vs 256 vs none) is reported back
// to us at runtime by Bubble Tea as a tea.ColorProfileMsg, so we don't guess
// it here.
package termcaps

import "strings"

// Pixel identifies the best inline-image protocol a terminal understands.
type Pixel int

const (
	// PixelNone means no pixel protocol — fall back to Unicode half-blocks
	// (which only needs colour, decided from the runtime colour profile).
	PixelNone Pixel = iota
	// PixelKitty is the Kitty graphics protocol (kitty, ghostty, konsole…).
	PixelKitty
	// PixelITerm is the iTerm2 inline-image protocol (iTerm2, WezTerm…).
	PixelITerm
)

func (p Pixel) String() string {
	switch p {
	case PixelKitty:
		return "kitty"
	case PixelITerm:
		return "iterm"
	default:
		return "none"
	}
}

// Caps is what we managed to learn about a session's terminal.
type Caps struct {
	Term  string
	Pixel Pixel
}

// Detect inspects the TERM value and the (possibly forwarded) environment to
// decide which image protocol, if any, the client supports.
func Detect(term string, environ []string) Caps {
	env := envMap(environ)
	c := Caps{Term: term}
	c.Pixel = detectPixel(strings.ToLower(term), env)
	return c
}

func detectPixel(term string, env map[string]string) Pixel {
	prog := strings.ToLower(env["TERM_PROGRAM"])

	// Kitty graphics protocol.
	switch {
	case strings.Contains(term, "kitty"),
		strings.Contains(term, "ghostty"),
		env["KITTY_WINDOW_ID"] != "",
		env["GHOSTTY_RESOURCES_DIR"] != "",
		env["GHOSTTY_BIN_DIR"] != "",
		prog == "ghostty",
		prog == "kitty":
		return PixelKitty
	}

	// iTerm2 inline-image protocol.
	switch {
	case strings.Contains(term, "iterm"),
		prog == "iterm.app",
		prog == "wezterm",
		env["WEZTERM_PANE"] != "":
		return PixelITerm
	}

	return PixelNone
}

func envMap(environ []string) map[string]string {
	m := make(map[string]string, len(environ))
	for _, kv := range environ {
		if i := strings.IndexByte(kv, '='); i > 0 {
			m[kv[:i]] = kv[i+1:]
		}
	}
	return m
}
