// Package termimg fetches a remote image and renders it inside a terminal.
//
// Rendering uses Unicode half-blocks ("▀"): each character cell encodes two
// vertically-stacked pixels via its foreground (top pixel) and background
// (bottom pixel) colours, doubling vertical resolution.
//
// Half-blocks are the only viable strategy here. The UI is a Bubble Tea v2
// program, whose renderer (ultraviolet) composes the screen into a grid of
// grapheme cells and DISCARDS embedded pixel-graphics escape sequences — the
// Kitty graphics protocol and the iTerm2 inline-image protocol both get parsed
// as zero-width "unknown" sequences during cell composition and dropped, so
// they never reach the terminal. Half-blocks are "just" coloured text, so they
// survive composition and render identically on any truecolor terminal,
// through tmux/screen, and over the xterm.js web bridge.
//
// (Crisp pixel output would require the Kitty Unicode-placeholder scheme, whose
// placeholder glyphs are real cells; that's a larger change and isn't done
// here.)
package termimg

import (
	"context"
	"fmt"
	"image"
	"image/color"
	"io"
	"net/http"
	"strings"
	"time"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"charm.land/lipgloss/v2"
)

// maxDownload caps how much of a remote image we'll read, so a hostile or
// broken URL can't exhaust memory.
const maxDownload = 8 << 20 // 8 MiB

var httpClient = &http.Client{Timeout: 8 * time.Second}

// Fetch downloads and decodes an image from a URL.
func Fetch(ctx context.Context, url string) (image.Image, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("image fetch: status %d", resp.StatusCode)
	}
	img, _, err := image.Decode(io.LimitReader(resp.Body, maxDownload))
	if err != nil {
		return nil, err
	}
	return img, nil
}

// FitBox returns the cell dimensions an image should occupy inside a maxCols ×
// maxRows box, preserving aspect ratio. Terminal cells are roughly twice as
// tall as they are wide, which is accounted for so the picture isn't squashed.
func FitBox(imgW, imgH, maxCols, maxRows int) (cols, rows int) {
	if imgW <= 0 || imgH <= 0 {
		return maxCols, maxRows
	}
	// Aspect ratio in cells: divide height by 2 to compensate for tall cells.
	aspect := float64(imgW) / float64(imgH) * 2.0
	cols, rows = maxCols, maxRows
	if float64(cols)/float64(rows) > aspect {
		cols = int(float64(rows) * aspect)
	} else {
		rows = int(float64(cols) / aspect)
	}
	if cols < 1 {
		cols = 1
	}
	if rows < 1 {
		rows = 1
	}
	return cols, rows
}

// Render draws the image as cols × rows cells of Unicode half-blocks. hasColor
// reports whether the terminal can show colour at all (256-colour or truecolor,
// from the runtime colour profile); without it, ok is false and the caller
// should skip the image. Note we deliberately accept 256-colour, not just
// truecolor: inside tmux/screen the real terminal is masked and the profile is
// capped at ANSI256 (tmux ignores COLORTERM), but the bubbletea renderer
// downsamples the cell colours to the active profile, so the picture still
// shows — just with a smaller palette.
func Render(img image.Image, cols, rows int, hasColor bool) (string, bool) {
	if !hasColor {
		return "", false
	}
	return renderHalfBlocks(img, cols, rows), true
}

// renderHalfBlocks draws the image as cols × rows cells of "▀" where the upper
// half-block's foreground is the top pixel and its background is the bottom
// pixel — doubling vertical resolution.
func renderHalfBlocks(img image.Image, cols, rows int) string {
	px := resize(img, cols, rows*2) // two vertical pixels per cell row
	var b strings.Builder
	cell := lipgloss.NewStyle()
	for r := range rows {
		top, bottom := px[2*r], px[2*r+1]
		for c := range cols {
			b.WriteString(cell.
				Foreground(top[c]).
				Background(bottom[c]).
				Render("▀"))
		}
		if r < rows-1 {
			b.WriteByte('\n')
		}
	}
	return b.String()
}

// resize rescales img to w × h, returning rows of RGBA so the rest of the
// package never touches the source image's coordinate space. It area-averages
// the source pixels covering each destination cell, which keeps a heavily
// downscaled cover (e.g. 300×300 → 18×18) far cleaner than nearest-neighbour.
func resize(img image.Image, w, h int) [][]color.RGBA {
	bounds := img.Bounds()
	sw, sh := bounds.Dx(), bounds.Dy()
	out := make([][]color.RGBA, h)
	if sw <= 0 || sh <= 0 || w <= 0 || h <= 0 {
		for y := range out {
			out[y] = make([]color.RGBA, max(w, 0))
		}
		return out
	}
	for y := range h {
		row := make([]color.RGBA, w)
		sy0 := bounds.Min.Y + y*sh/h
		sy1 := bounds.Min.Y + (y+1)*sh/h
		if sy1 <= sy0 {
			sy1 = sy0 + 1
		}
		for x := range w {
			sx0 := bounds.Min.X + x*sw/w
			sx1 := bounds.Min.X + (x+1)*sw/w
			if sx1 <= sx0 {
				sx1 = sx0 + 1
			}
			var rs, gs, bs, as, n uint64
			for sy := sy0; sy < sy1; sy++ {
				for sx := sx0; sx < sx1; sx++ {
					r, g, bl, a := img.At(sx, sy).RGBA() // 16-bit channels
					rs += uint64(r)
					gs += uint64(g)
					bs += uint64(bl)
					as += uint64(a)
					n++
				}
			}
			if n == 0 {
				n = 1
			}
			row[x] = color.RGBA{
				uint8((rs / n) >> 8),
				uint8((gs / n) >> 8),
				uint8((bs / n) >> 8),
				uint8((as / n) >> 8),
			}
		}
		out[y] = row
	}
	return out
}
