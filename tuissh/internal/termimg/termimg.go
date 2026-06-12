// Package termimg fetches a remote image and renders it inside a terminal.
//
// Three rendering strategies are supported, picked by the caller from the
// client's detected capabilities:
//
//   - Kitty graphics protocol  — crisp pixels (kitty, ghostty, konsole)
//   - iTerm2 inline images      — crisp pixels (iTerm2, WezTerm)
//   - Unicode half-blocks       — the universal fallback; every truecolor
//     terminal can show it, since it's "just" coloured text. Each character
//     cell ("▀") encodes two stacked pixels via its fg/bg colours.
package termimg

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"strings"
	"time"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"charm.land/lipgloss/v2"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/termcaps"
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

// Render turns an image into terminal output sized to cols × rows cells using
// the best strategy for the given pixel protocol. trueColor reports whether the
// half-block fallback is worth attempting (it needs at least decent colour).
func Render(img image.Image, cols, rows int, pixel termcaps.Pixel, trueColor bool) (string, bool) {
	switch pixel {
	case termcaps.PixelKitty:
		return renderKitty(img, cols, rows), true
	case termcaps.PixelITerm:
		return renderITerm(img, cols, rows), true
	default:
		if trueColor {
			return renderHalfBlocks(img, cols, rows), true
		}
		return "", false
	}
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

// resize does a nearest-neighbour rescale to w × h, returning rows of RGBA so
// the rest of the package never touches the source image's coordinate space.
func resize(img image.Image, w, h int) [][]color.RGBA {
	bounds := img.Bounds()
	sw, sh := bounds.Dx(), bounds.Dy()
	out := make([][]color.RGBA, h)
	for y := range h {
		row := make([]color.RGBA, w)
		sy := bounds.Min.Y + y*sh/h
		for x := range w {
			sx := bounds.Min.X + x*sw/w
			r, g, bl, a := img.At(sx, sy).RGBA()
			row[x] = color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(bl >> 8), uint8(a >> 8)}
		}
		out[y] = row
	}
	return out
}

// renderKitty emits the Kitty graphics protocol escape that displays a PNG
// scaled into cols × rows cells. C=1 keeps the cursor put so the caller can
// reserve the box with blank cells and keep its layout intact.
func renderKitty(img image.Image, cols, rows int) string {
	data, err := pngBytes(img)
	if err != nil {
		return reserveBox(cols, rows)
	}
	enc := base64.StdEncoding.EncodeToString(data)

	const chunk = 4096
	var b strings.Builder
	first := true
	for len(enc) > 0 {
		n := min(chunk, len(enc))
		piece := enc[:n]
		enc = enc[n:]
		more := 0
		if len(enc) > 0 {
			more = 1
		}
		b.WriteString("\x1b_G")
		if first {
			// a=T transmit+display, f=100 PNG, c/r target cell size, C=1 no cursor move.
			fmt.Fprintf(&b, "a=T,f=100,c=%d,r=%d,C=1,m=%d", cols, rows, more)
			first = false
		} else {
			fmt.Fprintf(&b, "m=%d", more)
		}
		b.WriteByte(';')
		b.WriteString(piece)
		b.WriteString("\x1b\\")
	}
	// Reserve the cells so surrounding layout flows correctly; the image is
	// drawn over these transparent (default-bg) cells.
	b.WriteString(reserveBox(cols, rows))
	return b.String()
}

// renderITerm emits the iTerm2 inline-image escape sized to cols × rows cells.
func renderITerm(img image.Image, cols, rows int) string {
	data, err := pngBytes(img)
	if err != nil {
		return reserveBox(cols, rows)
	}
	enc := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf(
		"\x1b]1337;File=inline=1;width=%d;height=%d;preserveAspectRatio=1:%s\a",
		cols, rows, enc,
	)
}

// reserveBox is rows lines of cols spaces — the placeholder a pixel image is
// painted over, and the graceful degradation if PNG encoding ever fails.
func reserveBox(cols, rows int) string {
	line := strings.Repeat(" ", cols)
	lines := make([]string, rows)
	for i := range lines {
		lines[i] = line
	}
	return strings.Join(lines, "\n")
}

func pngBytes(img image.Image) ([]byte, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
