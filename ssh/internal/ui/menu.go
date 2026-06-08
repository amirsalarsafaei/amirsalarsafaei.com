package ui

import (
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
)

type menuEntry struct {
	title string
	desc  string
	view  view
}

var menuEntries = []menuEntry{
	{"About Me", "Who I am and what I build", viewAbout},
	{"Blog", "Posts pulled live over gRPC", viewBlogList},
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
	case "r":
		return m, m.loadSong()
	}
	return m, nil
}

func (m Model) enterMenu(v view) (tea.Model, tea.Cmd) {
	m.view = v
	switch v {
	case viewAbout:
		if m.profileLoaded {
			m.showMarkdown(aboutMarkdown(m.profile))
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

func (m Model) menuView() string {
	banner := m.styles.Subtitle.Render(
		"Software Engineer · Distributed Systems · UBC M.Sc.\n" +
			"You're browsing my site over SSH. Pick a section:")

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

	body := lipgloss.JoinVertical(lipgloss.Center,
		card,
		"",
		menu,
	)

	// Centre the whole thing across the full content area.
	return lipgloss.Place(
		m.contentWidth(), m.contentHeight(),
		lipgloss.Center, lipgloss.Center,
		lipgloss.JoinVertical(lipgloss.Center, banner, "", body),
	)
}
