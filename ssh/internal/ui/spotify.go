package ui

import (
	"context"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type songInfo struct {
	track    string
	artist   string
	playing  bool
	albumArt string
}

type songLoadedMsg struct {
	song *songInfo
	err  error
}

// loadSong calls Spotify.GetRecentlyPlayedSong — the same RPC the website's
// playground uses to show what I'm listening to.
func (m Model) loadSong() tea.Cmd {
	client := m.client
	return func() tea.Msg {
		resp, err := client.RecentlyPlayed(context.Background())
		if err != nil {
			return songLoadedMsg{err: err}
		}
		return songLoadedMsg{song: &songInfo{
			track:    resp.GetTrack(),
			artist:   resp.GetArtist(),
			playing:  resp.GetPlaying(),
			albumArt: resp.GetAlbumArtUrl(),
		}}
	}
}

// nowPlayingCard renders the Spotify "now playing" card shown centred on the
// main menu.
func (m Model) nowPlayingCard() string {
	if !m.songLoaded {
		return m.styles.NowPlaying.Render(
			m.styles.Spinner.Render(m.spinner.View()) + " asking Spotify over gRPC…")
	}
	if m.songErr != nil {
		return m.styles.NowPlaying.Render(
			m.styles.Err.Render("Couldn't reach Spotify: " + m.songErr.Error()))
	}
	if m.song == nil || m.song.track == "" {
		return m.styles.NowPlaying.Render(m.styles.Subtitle.Render("Nothing playing right now."))
	}

	status := m.styles.Pill.Render("LAST PLAYED")
	if m.song.playing {
		status = m.styles.PillLive.Render("● NOW PLAYING")
	}

	card := lipgloss.JoinVertical(lipgloss.Center,
		status,
		"",
		m.styles.Logo.Render(m.song.track),
		m.styles.Subtitle.Render("by "+m.song.artist),
	)
	return m.styles.NowPlaying.Render(card)
}
