package ui

import (
	"context"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

type profileLink struct {
	label string
	url   string
}

type profileInfo struct {
	name  string
	title string
	bio   string // markdown
	links []profileLink
}

type profileLoadedMsg struct {
	profile profileInfo
	err     error
}

// fallbackProfile is rendered only if the backend is unreachable, so the
// terminal still shows something useful.
var fallbackProfile = profileInfo{
	name:  "AmirSalar Safaei",
	title: "Software Engineer & System Architect",
	bio: "Hello! I'm a passionate software engineer. The backend was unreachable, " +
		"so this is a fallback bio — visit https://amirsalarsafaei.com for the real thing.",
	links: []profileLink{
		{label: "Website", url: "https://amirsalarsafaei.com"},
		{label: "GitHub", url: "https://github.com/amirsalarsafaei"},
	},
}

// loadProfile calls Profile.GetProfile — the same RPC the website's about page
// uses, so the bio/links have a single source of truth in the backend.
func (m Model) loadProfile() tea.Cmd {
	client := m.client
	return func() tea.Msg {
		resp, err := client.GetProfile(context.Background())
		if err != nil {
			return profileLoadedMsg{profile: fallbackProfile, err: err}
		}
		links := make([]profileLink, 0, len(resp.GetLinks()))
		for _, l := range resp.GetLinks() {
			links = append(links, profileLink{label: l.GetLabel(), url: l.GetUrl()})
		}
		return profileLoadedMsg{profile: profileInfo{
			name:  resp.GetName(),
			title: resp.GetTitle(),
			bio:   resp.GetBio(),
			links: links,
		}}
	}
}

func aboutMarkdown(p profileInfo) string {
	var sb strings.Builder
	sb.WriteString("# " + p.name + "\n\n")
	sb.WriteString("**" + p.title + "**\n\n")
	sb.WriteString(p.bio)
	sb.WriteString("\n\n---\n\n")
	sb.WriteString("_This page is served over SSH — the same backend gRPC services " +
		"that power the website are answering your terminal._\n")
	return sb.String()
}

func linksMarkdown(p profileInfo) string {
	var sb strings.Builder
	sb.WriteString("# Links\n\n")
	sb.WriteString("| Where | What |\n|-------|------|\n")
	for _, l := range p.links {
		sb.WriteString("| " + l.label + " | " + l.url + " |\n")
	}
	sb.WriteString("\nThanks for stopping by. Press `esc` to go back.\n")
	return sb.String()
}
