// Package ui implements the Bubble Tea program that renders the
// amirsalarsafaei.com experience inside an SSH session.
package ui

import (
	"context"
	"time"

	"charm.land/bubbles/v2/spinner"
	"charm.land/bubbles/v2/viewport"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/rpc"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/termcaps"
	"github.com/charmbracelet/colorprofile"
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

// frameInterval drives the shader animation (~12fps — smooth but light on the
// wire for a remote session).
const frameInterval = 80 * time.Millisecond

// Model is the root Bubble Tea model for one SSH session.
type Model struct {
	ctx    context.Context
	client *rpc.Client
	styles *Styles
	caps   termcaps.Caps

	width  int
	height int

	view     view
	menuIdx  int
	quitting bool

	// terminal colour capability, learned at runtime from Bubble Tea.
	colorProfile colorprofile.Profile
	colorful     bool // truecolor or 256 — worth animating
	trueColor    bool // worth half-block image rendering

	// shader (animated banner) state
	shaderOn      bool
	shaderTicking bool
	frame         int

	// image rendering toggle
	imagesOn bool

	// cowsay easter egg: a fortune-spouting cow on the home screen, cycled
	// each time the user presses 'c'.
	cowOn  bool
	cowIdx int

	spinner spinner.Model

	// blog state
	blogs       []blogItem
	blogIdx     int
	blogsLoaded bool
	blogsErr    error

	// blog reader
	viewport      viewport.Model
	readyViewport bool

	// spotify state (pushed over a live stream — see subscribeSong/recvSong)
	songStream rpc.SongStream
	song       *songInfo
	songLoaded bool
	songErr    error
	albumArt   *albumArt

	// profile state (shared about/links content, loaded once per session)
	profile       profileInfo
	profileLoaded bool
	profileErr    error
}

// New builds a root model for a session of the given size and capabilities.
// ctx is the session context; the now-playing stream lives for its lifetime
// and is torn down when the SSH session ends.
func New(ctx context.Context, client *rpc.Client, width, height int, caps termcaps.Caps) Model {
	styles := NewStyles()

	sp := spinner.New(
		spinner.WithSpinner(spinner.Dot),
		spinner.WithStyle(styles.Spinner),
	)

	return Model{
		ctx:      ctx,
		client:   client,
		styles:   styles,
		caps:     caps,
		width:    width,
		height:   height,
		view:     viewMenu,
		spinner:  sp,
		shaderOn: true,
		imagesOn: true,
	}
}

func (m Model) Init() tea.Cmd {
	// Eagerly fetch the shared profile (About/Links) and subscribe to the live
	// now-playing stream so the menu fills in as soon as data arrives.
	return tea.Batch(m.spinner.Tick, m.loadProfile(), m.subscribeSong())
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.resizeViewport()
		m.renderAlbumArt()
		return m, nil

	case tea.ColorProfileMsg:
		m.colorProfile = msg.Profile
		m.trueColor = msg.Profile == colorprofile.TrueColor
		m.colorful = msg.Profile == colorprofile.TrueColor || msg.Profile == colorprofile.ANSI256
		// Half-block rendering needs the colour profile, which we only learn
		// now — re-render any art that loaded before this message arrived.
		m.renderAlbumArt()
		return m, tea.Batch(m.maybeStartShader(), m.maybeLoadAlbumArt())

	case tea.KeyPressMsg:
		return m.handleKey(msg)

	case frameMsg:
		m.frame++
		if m.shaderRunning() {
			return m, frameCmd()
		}
		m.shaderTicking = false
		return m, nil

	case blogsLoadedMsg:
		m.blogsLoaded = true
		m.blogsErr = msg.err
		m.blogs = msg.blogs
		return m, nil

	case songStreamMsg:
		if msg.err != nil {
			// Couldn't open the stream — show the error and retry shortly.
			m.songLoaded = true
			m.songErr = msg.err
			return m, resubscribeCmd()
		}
		m.songStream = msg.stream
		m.songErr = nil
		return m, recvSong(m.songStream)

	case songLoadedMsg:
		if msg.err != nil {
			// Stream dropped — reconnect after a short backoff.
			m.songErr = msg.err
			m.songStream = nil
			return m, resubscribeCmd()
		}
		m.songLoaded = true
		m.songErr = nil
		m.song = msg.song
		return m, tea.Batch(m.maybeLoadAlbumArt(), recvSong(m.songStream))

	case resubscribeMsg:
		return m, m.subscribeSong()

	case albumArtMsg:
		if msg.err == nil && msg.img != nil {
			m.albumArt = &albumArt{url: msg.url, img: msg.img}
			m.renderAlbumArt()
		}
		return m, nil

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
		return m, m.maybeStartShader()

	case "esc", "left", "h":
		if m.view != viewMenu {
			if m.view == viewBlogRead {
				m.view = viewBlogList
			} else {
				m.view = viewMenu
			}
		}
		return m, m.maybeStartShader()

	case "s":
		// Toggle the animated shader banner (only meaningful on the menu).
		if m.view == viewMenu {
			m.shaderOn = !m.shaderOn
			return m, m.maybeStartShader()
		}
		return m, nil

	case "c":
		// Cow easter egg: first press wakes the cow, each subsequent press
		// gives it a new fortune; it goes quiet once it loops back around.
		if m.view == viewMenu {
			if !m.cowOn {
				m.cowOn = true
				m.cowIdx = 0
			} else {
				m.cowIdx++
				if m.cowIdx >= len(cowFortunes) {
					m.cowOn = false
				}
			}
		}
		return m, nil

	case "i":
		// Toggle inline album-art rendering.
		m.imagesOn = !m.imagesOn
		if !m.imagesOn {
			m.albumArt = nil
			return m, nil
		}
		return m, m.maybeLoadAlbumArt()
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

// shaderRunning reports whether the shader banner should keep animating.
func (m Model) shaderRunning() bool {
	return m.shaderOn && m.colorful && m.view == viewMenu
}

// maybeStartShader (re)starts the frame ticker if the shader should be running
// and isn't already.
func (m *Model) maybeStartShader() tea.Cmd {
	if m.shaderRunning() && !m.shaderTicking {
		m.shaderTicking = true
		return frameCmd()
	}
	return nil
}

func (m Model) View() tea.View {
	var v tea.View
	v.AltScreen = true

	if m.quitting {
		bye := lipgloss.JoinVertical(lipgloss.Left,
			m.styles.Subtitle.Render("Thanks for visiting — see you on amirsalarsafaei.com 👋"),
			"",
			m.styles.Subtitle.Render(cowsay("So long, and thanks for all the SSH.")),
		)
		v.Content = bye + "\n"
		return v
	}

	var body string
	switch m.view {
	case viewMenu:
		body = m.menuView()
	case viewAbout, viewLinks:
		if !m.profileLoaded {
			body = m.styles.Spinner.Render(m.spinner.View()) + " loading profile…"
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
		help = "↑/↓ move • enter select • s shader • i images • c cow • q quit"
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

// frameMsg advances the shader animation.
type frameMsg struct{}

func frameCmd() tea.Cmd {
	return tea.Tick(frameInterval, func(time.Time) tea.Msg { return frameMsg{} })
}
