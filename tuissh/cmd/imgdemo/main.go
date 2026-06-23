// Command imgdemo renders a local image as terminal half-blocks using the exact
// renderer the SSH/web TUI uses for album art. It's a dev aid for eyeballing the
// output in a real terminal (kitty, ghostty, tmux, …) when there's no Spotify
// data wired up:
//
//	go run ./cmd/imgdemo ../frontend/public/amirsalar-photo.jpg
//	go run ./cmd/imgdemo path/to/cover.png 40 20   # custom box (cols rows)
//
// This is a throwaway helper — delete cmd/imgdemo whenever you like.
package main

import (
	"fmt"
	"image"
	"os"
	"strconv"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/termimg"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: imgdemo <image-file> [maxCols] [maxRows]")
		os.Exit(2)
	}

	f, err := os.Open(os.Args[1])
	if err != nil {
		fatal(err)
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	if err != nil {
		fatal(err)
	}

	maxCols, maxRows := 40, 20
	if len(os.Args) > 2 {
		maxCols = atoi(os.Args[2], maxCols)
	}
	if len(os.Args) > 3 {
		maxRows = atoi(os.Args[3], maxRows)
	}

	b := img.Bounds()
	cols, rows := termimg.FitBox(b.Dx(), b.Dy(), maxCols, maxRows)
	out, ok := termimg.Render(img, cols, rows, true)
	if !ok {
		fatal(fmt.Errorf("render returned ok=false"))
	}
	fmt.Printf("%s\n(%dx%d source → %d×%d cells)\n", out, b.Dx(), b.Dy(), cols, rows)
}

func atoi(s string, def int) int {
	if n, err := strconv.Atoi(s); err == nil && n > 0 {
		return n
	}
	return def
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "imgdemo:", err)
	os.Exit(1)
}
