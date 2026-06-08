// Package ui implements the Bubble Tea program that renders the
// amirsalarsafaei.com experience inside an SSH session.
package ui

import (
	"charm.land/bubbles/v2/spinner"
	"charm.land/bubbles/v2/viewport"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/ssh/internal/rpc"
	"github.com/charmbracelet/glamour"
)

type view int

const (
	viewMenu view = iota
	viewAbout
	viewBlogList
	viewBlogRead
	viewLinks
)

// Model is the root Bubble Tea model for one SSH session.
type Model struct {
	client *rpc.Client
	styles *Styles

	width  int
	height int

	view     view
	menuIdx  int
	quitting bool

	spinner spinner.Model

	// blog state
	blogs       []blogItem
	blogIdx     int
	blogsLoaded bool
	blogsErr    error

	// blog reader
	viewport      viewport.Model
	readyViewport bool

	// spotify state
	song       *songInfo
	songLoaded bool
	songErr    error

	// profile state (shared about/links content, loaded once per session)
	profile       profileInfo
	profileLoaded bool
	profileErr    error
}

// New builds a root model for a session of the given size.
func New(client *rpc.Client, width, height int) Model {
	styles := NewStyles()

	sp := spinner.New(
		spinner.WithSpinner(spinner.Dot),
		spinner.WithStyle(styles.Spinner),
	)

	return Model{
		client:  client,
		styles:  styles,
		width:   width,
		height:  height,
		view:    viewMenu,
		spinner: sp,
	}
}

func (m Model) Init() tea.Cmd {
	// Eagerly fetch the shared profile (About/Links) and the now-playing song
	// (shown on the main menu) so both are ready up front, and start the
	// ticker that periodically refreshes the now-playing song.
	return tea.Batch(m.spinner.Tick, m.loadProfile(), m.loadSong(), tickCmd())
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.resizeViewport()
		return m, nil

	case tea.KeyPressMsg:
		return m.handleKey(msg)

	case blogsLoadedMsg:
		m.blogsLoaded = true
		m.blogsErr = msg.err
		m.blogs = msg.blogs
		return m, nil

	case songLoadedMsg:
		m.songLoaded = true
		m.songErr = msg.err
		m.song = msg.song
		return m, nil

	case tickMsg:
		// On each tick, refresh the now-playing song and schedule the next tick.
		return m, tea.Batch(m.loadSong(), tickCmd())

	case profileLoadedMsg:
		m.profileLoaded = true
		m.profileErr = msg.err
		m.profile = msg.profile
		// If the user is already waiting on About/Links, fill the viewport now.
		switch m.view {
		case viewAbout:
			m.showMarkdown(aboutMarkdown(m.profile))
		case viewLinks:
			m.showMarkdown(linksMarkdown(m.profile))
		}
		return m, nil

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	}

	// Forward anything else to the active viewport when reading.
	if m.view == viewBlogRead || m.view == viewAbout || m.view == viewLinks {
		var cmd tea.Cmd
		m.viewport, cmd = m.viewport.Update(msg)
		return m, cmd
	}
	return m, nil
}

func (m Model) handleKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		if m.view == viewMenu || msg.String() == "ctrl+c" {
			m.quitting = true
			return m, tea.Quit
		}
		// In a sub-view "q" goes back to the menu.
		m.view = viewMenu
		return m, nil

	case "esc", "left", "h":
		if m.view != viewMenu {
			if m.view == viewBlogRead {
				m.view = viewBlogList
			} else {
				m.view = viewMenu
			}
		}
		return m, nil
	}

	switch m.view {
	case viewMenu:
		return m.updateMenu(msg)
	case viewBlogList:
		return m.updateBlogList(msg)
	case viewBlogRead, viewAbout, viewLinks:
		var cmd tea.Cmd
		m.viewport, cmd = m.viewport.Update(msg)
		return m, cmd
	}
	return m, nil
}

func (m Model) View() tea.View {
	var v tea.View
	v.AltScreen = true

	if m.quitting {
		v.Content = m.styles.Subtitle.Render("Thanks for visiting — see you on amirsalarsafaei.com 👋") + "\n"
		return v
	}

	var body string
	switch m.view {
	case viewMenu:
		body = m.menuView()
	case viewAbout, viewLinks:
		if !m.profileLoaded {
			body = m.styles.Spinner.Render(m.spinner.View()) + " loading profile over gRPC…"
		} else {
			body = m.viewport.View()
		}
	case viewBlogRead:
		body = m.viewport.View()
	case viewBlogList:
		body = m.blogListView()
	}

	v.Content = m.styles.App.Render(
		lipgloss.JoinVertical(lipgloss.Left,
			m.header(),
			"",
			body,
			"",
			m.footer(),
		),
	)
	return v
}

func (m Model) header() string {
	logo := m.styles.Logo.Render("~/amirsalar")
	title := m.styles.Title.Render(m.headerTitle())
	return lipgloss.JoinHorizontal(lipgloss.Center, logo, "  ", title)
}

func (m Model) headerTitle() string {
	switch m.view {
	case viewAbout:
		return "about me"
	case viewBlogList, viewBlogRead:
		return "blog"
	case viewLinks:
		return "links"
	default:
		return "home"
	}
}

func (m Model) footer() string {
	var help string
	switch m.view {
	case viewMenu:
		help = "↑/↓ move • enter select • r refresh song • q quit"
	case viewBlogList:
		help = "↑/↓ move • enter read • esc back • q menu"
	case viewBlogRead, viewAbout, viewLinks:
		help = "↑/↓ scroll • esc back • q menu"
	}
	return m.styles.Help.Render(help)
}

// contentWidth / contentHeight give the usable area inside the app padding.
func (m Model) contentWidth() int {
	w := m.width - 4 // App padding 1,2 -> 4 horizontal
	if w < 20 {
		w = 20
	}
	return w
}

func (m Model) contentHeight() int {
	// Reserve rows for header, footer and spacing.
	h := m.height - 8
	if h < 5 {
		h = 5
	}
	return h
}

func (m *Model) resizeViewport() {
	w, h := m.contentWidth(), m.contentHeight()
	if !m.readyViewport {
		m.viewport = viewport.New(viewport.WithWidth(w), viewport.WithHeight(h))
		m.readyViewport = true
	} else {
		m.viewport.SetWidth(w)
		m.viewport.SetHeight(h)
	}
}

// renderMarkdown turns markdown into terminal output wrapped to the content width.
func (m Model) renderMarkdown(md string) string {
	r, err := glamour.NewTermRenderer(
		glamour.WithStandardStyle("dark"),
		glamour.WithWordWrap(m.contentWidth()),
	)
	if err != nil {
		return md
	}
	out, err := r.Render(md)
	if err != nil {
		return md
	}
	return out
}

func (m *Model) showMarkdown(md string) {
	m.resizeViewport()
	m.viewport.SetContent(m.renderMarkdown(md))
	m.viewport.GotoTop()
}
