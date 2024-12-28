import type { MermaidConfig } from 'mermaid';
export const mermaidConfig: MermaidConfig = {
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#0a0c0b',
    primaryColor: '#2bbc8a',
    secondaryColor: '#36b37e',
    tertiaryColor: '#1c2721',
    primaryTextColor: '#dfe4ea',
    secondaryTextColor: '#98a3a0',
    lineColor: '#4ae168',
    fontSize: '16px',
    fontFamily: '"Fira Code", monospace',
    curve: 'basis',
    cornerRadius: '10',
    messageFontWeight: '400',
    wrap: true,
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 15,
      useMaxWidth: true,
      diagramPadding: 8,
      cornerRadius: '10'
    },
    themeCSS: `
      g.classGroup rect {
        rx: 10;
        ry: 10;
      }
      .node rect, .node circle, .node ellipse, .node polygon, .node path {
        rx: 10;
        ry: 10;
        stroke-width: 2px;
      }
      .node .label {
        font-weight: normal;
      }
      .edgePath .path {
        stroke-width: 2px;
      }
      .cluster rect {
        rx: 10;
        ry: 10;
        stroke-width: 2px;
      }
    `
  }
};
