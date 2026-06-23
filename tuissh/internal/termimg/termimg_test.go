package termimg

import (
	"image"
	"image/color"
	"strings"
	"testing"
)

func testImage() image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	for y := range 4 {
		for x := range 4 {
			img.Set(x, y, color.RGBA{R: uint8(x * 60), G: uint8(y * 60), B: 128, A: 255})
		}
	}
	return img
}

func TestRenderHalfBlocks(t *testing.T) {
	out, ok := Render(testImage(), 4, 2, true)
	if !ok {
		t.Fatal("Render should succeed with truecolor")
	}
	// One "▀" per cell, 4 cols × 2 rows.
	if got := strings.Count(out, "▀"); got != 8 {
		t.Errorf("half-block count = %d, want 8", got)
	}
	// Two rows means exactly one newline between them.
	if got := strings.Count(out, "\n"); got != 1 {
		t.Errorf("newline count = %d, want 1", got)
	}
	// Cells must carry colour (SGR), otherwise the picture is invisible.
	if !strings.Contains(out, "\x1b[") {
		t.Errorf("expected SGR colour sequences in output")
	}
	// No raw graphics escapes — those don't survive the cell renderer.
	if strings.Contains(out, "\x1b_G") || strings.Contains(out, "\x1b]1337") {
		t.Errorf("output must not contain pixel-graphics escapes")
	}
}

func TestRenderNeedsColor(t *testing.T) {
	if _, ok := Render(testImage(), 4, 2, false); ok {
		t.Errorf("Render should return ok=false without truecolor")
	}
}

func TestFitBoxPreservesAspect(t *testing.T) {
	// A square image in a wide box should be limited by rows (×2 cell aspect).
	cols, rows := FitBox(100, 100, 18, 9)
	if rows != 9 {
		t.Errorf("rows = %d, want 9 (square image fills the height)", rows)
	}
	if cols < 1 || cols > 18 {
		t.Errorf("cols = %d, want within [1,18]", cols)
	}
}

func TestResizeAverages(t *testing.T) {
	// A 2×2 image of distinct colours downscaled to 1×1 should average them.
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.RGBA{R: 100, A: 255})
	img.Set(1, 0, color.RGBA{R: 100, A: 255})
	img.Set(0, 1, color.RGBA{R: 200, A: 255})
	img.Set(1, 1, color.RGBA{R: 200, A: 255})

	px := resize(img, 1, 1)
	if got := px[0][0].R; got < 140 || got > 160 {
		t.Errorf("averaged red = %d, want ~150", got)
	}
}
