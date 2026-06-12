package ui

import (
	"context"
	"image"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/rpc"
	"github.com/amirsalarsafaei/amirsalarsafaei.com/tuissh/internal/termimg"
)

// songResubscribeDelay is how long to wait before reopening the now-playing
// stream after it drops (network blip, backend restart).
const songResubscribeDelay = 5 * time.Second

// Album-art box bounds (in terminal cells); the picture is fit inside this
// preserving aspect ratio.
const (
	albumArtMaxCols = 18
	albumArtMaxRows = 9
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

// albumArt caches the decoded cover image and its rendered terminal form for
// the current track, so we don't re-fetch or re-render on every frame.
type albumArt struct {
	url      string
	img      image.Image
	rendered string
}

type albumArtMsg struct {
	url string
	img image.Image
	err error
}

// songStreamMsg carries the opened now-playing stream (or the error from
// trying to open it).
type songStreamMsg struct {
	stream rpc.SongStream
	err    error
}

// resubscribeMsg asks the model to reopen the now-playing stream.
type resubscribeMsg struct{}

// subscribeSong opens the live now-playing stream for this session.
func (m Model) subscribeSong() tea.Cmd {
	client, ctx := m.client, m.ctx
	return func() tea.Msg {
		stream, err := client.StreamRecentlyPlayed(ctx)
		return songStreamMsg{stream: stream, err: err}
	}
}

// recvSong reads the next pushed track from the stream. Each received update
// re-issues this command, so the model stays subscribed without polling.
func recvSong(stream rpc.SongStream) tea.Cmd {
	return func() tea.Msg {
		resp, err := stream.Recv()
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

// resubscribeCmd waits a short backoff then asks to reopen the stream.
func resubscribeCmd() tea.Cmd {
	return tea.Tick(songResubscribeDelay, func(time.Time) tea.Msg { return resubscribeMsg{} })
}

// maybeLoadAlbumArt kicks off an album-art download when images are enabled and
// the current track has cover art we haven't already loaded.
func (m Model) maybeLoadAlbumArt() tea.Cmd {
	if !m.imagesOn || m.song == nil || m.song.albumArt == "" {
		return nil
	}
	url := m.song.albumArt
	if m.albumArt != nil && m.albumArt.url == url {
		return nil
	}
	return func() tea.Msg {
		img, err := termimg.Fetch(context.Background(), url)
		return albumArtMsg{url: url, img: img, err: err}
	}
}

// renderAlbumArt (re)renders the cached cover image to the current terminal's
// best image strategy and size. Cheap and idempotent — safe to call on resize
// or when the colour profile is learned.
func (m *Model) renderAlbumArt() {
	if m.albumArt == nil || m.albumArt.img == nil {
		return
	}
	maxCols := max(min(albumArtMaxCols, m.contentWidth()/3), 6)
	b := m.albumArt.img.Bounds()
	cols, rows := termimg.FitBox(b.Dx(), b.Dy(), maxCols, albumArtMaxRows)
	if s, ok := termimg.Render(m.albumArt.img, cols, rows, m.caps.Pixel, m.trueColor); ok {
		m.albumArt.rendered = s
	} else {
		m.albumArt.rendered = ""
	}
}

// nowPlayingCard renders the Spotify "now playing" card shown centred on the
// main menu, with album art beside the track when available.
func (m Model) nowPlayingCard() string {
	if !m.songLoaded {
		return m.styles.NowPlaying.Render(
			m.styles.Spinner.Render(m.spinner.View()) + " checking Spotify…")
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

	info := lipgloss.JoinVertical(lipgloss.Left,
		status,
		"",
		m.styles.TrackTitle.Render(m.song.track),
		m.styles.Subtitle.Render("by "+m.song.artist),
	)

	body := info
	if m.imagesOn && m.albumArt != nil && m.albumArt.rendered != "" {
		body = lipgloss.JoinHorizontal(lipgloss.Center,
			m.albumArt.rendered,
			"  ",
			info,
		)
	}
	return m.styles.NowPlaying.Render(body)
}
