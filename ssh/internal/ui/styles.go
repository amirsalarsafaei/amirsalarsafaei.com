package ui

import "github.com/charmbracelet/lipgloss"

// Palette — a charm-ish blue/green theme that reads well on dark terminals.
var (
	colorPrimary   = lipgloss.Color("#38BDF8") // sky blue
	colorSecondary = lipgloss.Color("#2DD4BF") // teal
	colorAccent    = lipgloss.Color("#34D399") // green (matches the site's prompt)
	colorMuted     = lipgloss.Color("#64748B") // slate gray
	colorText      = lipgloss.Color("#E2E8F0") // near-white
	colorBg        = lipgloss.Color("#0F172A") // deep navy
)

// Styles holds every lipgloss style used by the UI, built from a per-session
// renderer so colors degrade correctly for each client's terminal.
type Styles struct {
	r *lipgloss.Renderer

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

// NewStyles builds the style set for a renderer.
func NewStyles(r *lipgloss.Renderer) *Styles {
	s := &Styles{r: r}

	s.App = r.NewStyle().Padding(1, 2)

	s.Title = r.NewStyle().
		Foreground(colorText).
		Background(colorPrimary).
		Bold(true).
		Padding(0, 1)

	s.Subtitle = r.NewStyle().Foreground(colorMuted).Italic(true)

	s.Logo = r.NewStyle().Foreground(colorSecondary).Bold(true)

	s.Help = r.NewStyle().Foreground(colorMuted)

	s.Err = r.NewStyle().Foreground(lipgloss.Color("#F87171")).Bold(true)

	s.Spinner = r.NewStyle().Foreground(colorPrimary)

	s.StatusBar = r.NewStyle().
		Foreground(colorMuted).
		BorderStyle(lipgloss.NormalBorder()).
		BorderTop(true).
		BorderForeground(colorMuted)

	s.MenuItem = r.NewStyle().Foreground(colorText).PaddingLeft(2)
	s.MenuItemSelected = r.NewStyle().
		Foreground(colorSecondary).
		Bold(true).
		PaddingLeft(0).
		SetString("▸ ")
	s.MenuDesc = r.NewStyle().Foreground(colorMuted).PaddingLeft(4)
	s.MenuDescSelected = r.NewStyle().Foreground(colorPrimary).PaddingLeft(4)

	s.BlogItem = r.NewStyle().Foreground(colorText).PaddingLeft(2)
	s.BlogItemSelected = r.NewStyle().Foreground(colorSecondary).Bold(true)
	s.BlogMeta = r.NewStyle().Foreground(colorMuted)

	s.Tag = r.NewStyle().
		Foreground(colorBg).
		Background(colorAccent).
		Padding(0, 1).
		MarginRight(1)

	s.NowPlaying = r.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorPrimary).
		Padding(1, 3)

	s.Pill = r.NewStyle().Foreground(colorBg).Background(colorMuted).Padding(0, 1).Bold(true)
	s.PillLive = r.NewStyle().Foreground(colorBg).Background(colorAccent).Padding(0, 1).Bold(true)

	return s
}
