package web

// demoPage is a self-contained xterm.js client (loaded from a CDN) so the
// bridge can be tested without the Next.js frontend: run the server and open
// it in a browser. The production site uses its own React component instead.
const demoPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>amirsalar — terminal</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css" />
  <style>
    html, body { margin: 0; height: 100%; background: #0F172A; }
    #term { position: fixed; inset: 0; padding: 8px; }
  </style>
</head>
<body>
  <div id="term"></div>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.js"></script>
  <script>
    const term = new Terminal({
      cursorBlink: true,
      allowProposedApi: true,
      fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
      fontSize: 14,
      theme: { background: '#0F172A', foreground: '#E2E8F0' },
    });
    const fit = new FitAddon.FitAddon();
    term.loadAddon(fit);
    term.open(document.getElementById('term'));
    fit.fit();

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(proto + '://' + location.host + '/ws?cols=' + term.cols + '&rows=' + term.rows);
    ws.binaryType = 'arraybuffer';

    const send = (s) => { if (ws.readyState === WebSocket.OPEN) ws.send(s); };

    ws.onopen = () => {
      // Re-fit now that the socket is up, then keep size in sync.
      fit.fit();
      send('r' + term.cols + ',' + term.rows);
      term.onData((d) => send('i' + d));
      term.onResize(({ cols, rows }) => send('r' + cols + ',' + rows));
      window.addEventListener('resize', () => fit.fit());
      term.focus();
    };
    ws.onmessage = (e) => term.write(new Uint8Array(e.data));
    ws.onclose = () => term.write('\r\n\x1b[31m• connection closed\x1b[0m\r\n');
  </script>
</body>
</html>`
