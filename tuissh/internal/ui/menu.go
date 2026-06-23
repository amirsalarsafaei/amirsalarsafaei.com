package ui

import (
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/shader"
)

type menuEntry struct {
	title string
	desc  string
	view  view
}

var menuEntries = []menuEntry{
	{"About Me", "Who I am and what I build", viewAbout},
	{"Blog", "Latest writing, fresh from the backend", viewBlogList},
	{"Links", "Where to find me", viewLinks},
}

func (m Model) updateMenu(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "up", "k":
		if m.menuIdx > 0 {
			m.menuIdx--
		}
	case "down", "j":
		if m.menuIdx < len(menuEntries)-1 {
			m.menuIdx++
		}
	case "enter", "right", "l":
		return m.enterMenu(menuEntries[m.menuIdx].view)
	}
	return m, nil
}

func (m Model) enterMenu(v view) (tea.Model, tea.Cmd) {
	m.view = v
	switch v {
	case viewAbout:
		if m.profileLoaded {
			m.showAbout()
		}
	case viewLinks:
		if m.profileLoaded {
			m.showMarkdown(linksMarkdown(m.profile))
		}
	case viewBlogList:
		if !m.blogsLoaded {
			return m, m.loadBlogs()
		}
	}
	return m, nil
}

// shaderBanner renders the animated plasma strip with the site name beneath
// it. Falls back to a static subtitle when the terminal lacks colour or the
// shader is toggled off.
func (m Model) shaderBanner() string {
	tagline := m.styles.Subtitle.Render(
		"Software Engineer · Distributed Systems · UBC M.Sc.")

	if !m.shaderOn || !m.colorful {
		return lipgloss.JoinVertical(lipgloss.Center,
			m.styles.BannerName.Render("a m i r s a l a r"),
			tagline,
		)
	}

	w := m.contentWidth()
	t := float64(m.frame) * 0.12
	strip := shader.Render(w, 3, t, shader.Plasma)
	name := lipgloss.Place(w, 1, lipgloss.Center, lipgloss.Center,
		m.styles.BannerName.Render("~/amirsalar  ·  terminal"))

	return lipgloss.JoinVertical(lipgloss.Center,
		strip,
		name,
		tagline,
	)
}

func (m Model) menuView() string {
	banner := m.shaderBanner()

	var rows []string
	for i, e := range menuEntries {
		if i == m.menuIdx {
			line := m.styles.MenuItemSelected.Render() + m.styles.BlogItemSelected.Render(e.title)
			desc := m.styles.MenuDescSelected.Render(e.desc)
			rows = append(rows, line, desc)
		} else {
			rows = append(rows, m.styles.MenuItem.Render(e.title), m.styles.MenuDesc.Render(e.desc))
		}
	}
	menu := lipgloss.JoinVertical(lipgloss.Left, rows...)

	// The now-playing card lives front-and-centre on the main menu rather than
	// behind a menu entry.
	card := m.nowPlayingCard()

	sections := []string{card, "", menu}
	if m.cowOn {
		cow := m.styles.Subtitle.Render(cowsay(cowFortunes[m.cowIdx%len(cowFortunes)]))
		sections = append(sections, "", cow)
	}
	body := lipgloss.JoinVertical(lipgloss.Center, sections...)

	// Centre the whole thing across the full content area.
	return lipgloss.Place(
		m.contentWidth(), m.contentHeight(),
		lipgloss.Center, lipgloss.Center,
		lipgloss.JoinVertical(lipgloss.Center, banner, "", body),
	)
}
