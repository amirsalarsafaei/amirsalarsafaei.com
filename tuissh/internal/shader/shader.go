// Package shader renders small animated, GPU-shader-style effects as coloured
// text. Each cell's colour is a pure function of its position and a time value,
// exactly like a fragment shader — we just sample it onto a character grid.
//
// Output is plain styled text (one "▀" per cell, two stacked sub-pixels), so it
// composes with the rest of the Lip Gloss UI and Bubble Tea downsamples the
// colours to whatever the client's terminal actually supports.
package shader

import (
	"image/color"
	"math"
	"strings"

	"charm.land/lipgloss/v2"
)

// Frag maps a normalised coordinate (uv in [0,1]) and time to an RGB colour.
type Frag func(u, v, t float64) color.RGBA

// Render samples frag across a cols × rows grid (with doubled vertical
// resolution via half-blocks) at time t and returns the styled string.
func Render(cols, rows int, t float64, frag Frag) string {
	if cols < 1 || rows < 1 {
		return ""
	}
	h := rows * 2
	var b strings.Builder
	cell := lipgloss.NewStyle()
	for r := range rows {
		for c := range cols {
			u := float64(c) / float64(cols-1+1)
			topV := float64(2*r) / float64(h)
			botV := float64(2*r+1) / float64(h)
			top := frag(u, topV, t)
			bot := frag(u, botV, t)
			b.WriteString(cell.Foreground(top).Background(bot).Render("▀"))
		}
		if r < rows-1 {
			b.WriteByte('\n')
		}
	}
	return b.String()
}

// Plasma is a classic multi-wave plasma fragment shader in the site's
// blue→teal→green palette. t advances the animation.
func Plasma(u, v, t float64) color.RGBA {
	x := u * 6.0
	y := v * 6.0
	val := math.Sin(x+t) +
		math.Sin((y+t)*0.7) +
		math.Sin((x+y+t)*0.5) +
		math.Sin(math.Hypot(x-3, y-2)*1.3-t*1.2)
	// Normalise roughly to [0,1].
	n := (val + 4) / 8
	return palette(n)
}

// palette maps n∈[0,1] through deep-navy → sky-blue → teal → green, matching
// the site's accent colours.
func palette(n float64) color.RGBA {
	n = clamp01(n)
	stops := []color.RGBA{
		{0x0F, 0x17, 0x2A, 0xFF}, // deep navy
		{0x38, 0xBD, 0xF8, 0xFF}, // sky blue
		{0x2D, 0xD4, 0xBF, 0xFF}, // teal
		{0x34, 0xD3, 0x99, 0xFF}, // green
	}
	seg := n * float64(len(stops)-1)
	i := int(seg)
	if i >= len(stops)-1 {
		return stops[len(stops)-1]
	}
	f := seg - float64(i)
	return lerp(stops[i], stops[i+1], f)
}

func lerp(a, b color.RGBA, f float64) color.RGBA {
	return color.RGBA{
		R: uint8(float64(a.R) + (float64(b.R)-float64(a.R))*f),
		G: uint8(float64(a.G) + (float64(b.G)-float64(a.G))*f),
		B: uint8(float64(a.B) + (float64(b.B)-float64(a.B))*f),
		A: 0xFF,
	}
}

func clamp01(f float64) float64 {
	if f < 0 {
		return 0
	}
	if f > 1 {
		return 1
	}
	return f
}
