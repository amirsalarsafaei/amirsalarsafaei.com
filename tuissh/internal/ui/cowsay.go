package ui

import "strings"

// cowsay renders the classic ASCII cow with a speech bubble holding msg.
// The bubble word-wraps to wrapAt columns so long fortunes stay readable in a
// narrow SSH window.
func cowsay(msg string) string {
	lines := wrapWords(msg, 38)

	width := 0
	for _, l := range lines {
		if n := len([]rune(l)); n > width {
			width = n
		}
	}

	var b strings.Builder
	// Top border.
	b.WriteString(" " + strings.Repeat("_", width+2) + "\n")

	// Bubble body. A single line uses < >; multiple lines use / \ | brackets.
	for i, l := range lines {
		left, right := "|", "|"
		switch {
		case len(lines) == 1:
			left, right = "<", ">"
		case i == 0:
			left, right = "/", "\\"
		case i == len(lines)-1:
			left, right = "\\", "/"
		}
		pad := width - len([]rune(l))
		b.WriteString(left + " " + l + strings.Repeat(" ", pad) + " " + right + "\n")
	}

	// Bottom border.
	b.WriteString(" " + strings.Repeat("-", width+2) + "\n")

	// The cow itself.
	b.WriteString(cowBody)
	return b.String()
}

const cowBody = `        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||`

// wrapWords greedily wraps text to at most width runes per line, preserving
// existing newlines.
func wrapWords(text string, width int) []string {
	var out []string
	for _, paragraph := range strings.Split(text, "\n") {
		words := strings.Fields(paragraph)
		if len(words) == 0 {
			out = append(out, "")
			continue
		}
		line := words[0]
		for _, w := range words[1:] {
			if len([]rune(line))+1+len([]rune(w)) > width {
				out = append(out, line)
				line = w
			} else {
				line += " " + w
			}
		}
		out = append(out, line)
	}
	return out
}

// cowFortunes are the one-liners the home-screen cow cycles through.
var cowFortunes = []string{
	"Welcome to my terminal. Pull up a chair.",
	"Moo. You found the easter egg.",
	"Distributed systems are just cows agreeing on the herd's state.",
	"There is no cloud — it's just someone else's pasture.",
	"git commit -m 'moo'",
	"Press 'c' again to silence the cow. (You won't.)",
	"Built with Bubble Tea, served over SSH.",
	"Ship it. The cow believes in you.",
}
