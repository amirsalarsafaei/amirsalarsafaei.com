package ui

import "charm.land/lipgloss/v2"

// Palette — a charm-ish blue/green theme that reads well on dark terminals.
var (
	colorPrimary   = lipgloss.Color("#38BDF8") // sky blue
	colorSecondary = lipgloss.Color("#2DD4BF") // teal
	colorAccent    = lipgloss.Color("#34D399") // green (matches the site's prompt)
	colorMuted     = lipgloss.Color("#64748B") // slate gray
	colorText      = lipgloss.Color("#E2E8F0") // near-white
	colorBg        = lipgloss.Color("#0F172A") // deep navy
)

// Styles holds every lipgloss style used by the UI. With Lip Gloss v2 styles
// are pure values (no per-session renderer): Bubble Tea handles color
// downsampling for each client's terminal automatically.
type Styles struct {
	App       lipgloss.Style
	Title     lipgloss.Style
	Subtitle  lipgloss.Style
	Logo      lipgloss.Style
	Help      lipgloss.Style
	Err       lipgloss.Style
	Spinner   lipgloss.Style
	StatusBar lipgloss.Style

	MenuItem         lipgloss.Style
	MenuItemSelected lipgloss.Style
	MenuDesc         lipgloss.Style
	MenuDescSelected lipgloss.Style

	BlogItem         lipgloss.Style
	BlogItemSelected lipgloss.Style
	BlogMeta         lipgloss.Style
	Tag              lipgloss.Style

	NowPlaying lipgloss.Style
	Pill       lipgloss.Style
	PillLive   lipgloss.Style
}

// NewStyles builds the style set.
func NewStyles() *Styles {
	s := &Styles{}

	s.App = lipgloss.NewStyle().Padding(1, 2)

	s.Title = lipgloss.NewStyle().
		Foreground(colorText).
		Background(colorPrimary).
		Bold(true).
		Padding(0, 1)

	s.Subtitle = lipgloss.NewStyle().Foreground(colorMuted).Italic(true)

	s.Logo = lipgloss.NewStyle().Foreground(colorSecondary).Bold(true)

	s.Help = lipgloss.NewStyle().Foreground(colorMuted)

	s.Err = lipgloss.NewStyle().Foreground(lipgloss.Color("#F87171")).Bold(true)

	s.Spinner = lipgloss.NewStyle().Foreground(colorPrimary)

	s.StatusBar = lipgloss.NewStyle().
		Foreground(colorMuted).
		BorderStyle(lipgloss.NormalBorder()).
		BorderTop(true).
		BorderForeground(colorMuted)

	s.MenuItem = lipgloss.NewStyle().Foreground(colorText).PaddingLeft(2)
	s.MenuItemSelected = lipgloss.NewStyle().
		Foreground(colorSecondary).
		Bold(true).
		PaddingLeft(0).
		SetString("▸ ")
	s.MenuDesc = lipgloss.NewStyle().Foreground(colorMuted).PaddingLeft(4)
	s.MenuDescSelected = lipgloss.NewStyle().Foreground(colorPrimary).PaddingLeft(4)

	s.BlogItem = lipgloss.NewStyle().Foreground(colorText).PaddingLeft(2)
	s.BlogItemSelected = lipgloss.NewStyle().Foreground(colorSecondary).Bold(true)
	s.BlogMeta = lipgloss.NewStyle().Foreground(colorMuted)

	s.Tag = lipgloss.NewStyle().
		Foreground(colorBg).
		Background(colorAccent).
		Padding(0, 1).
		MarginRight(1)

	s.NowPlaying = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorPrimary).
		Padding(1, 3)

	s.Pill = lipgloss.NewStyle().Foreground(colorBg).Background(colorMuted).Padding(0, 1).Bold(true)
	s.PillLive = lipgloss.NewStyle().Foreground(colorBg).Background(colorAccent).Padding(0, 1).Bold(true)

	return s
}
