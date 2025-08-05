import ansis from 'ansis';
import { version, homepage } from '../../package.json';

export function displayBanner(subtitle?: string) {
  const defaultSubtitle = 'One-click configuration tool for Claude Code';
  const subtitleText = subtitle || defaultSubtitle;
  const paddedSubtitle = subtitleText.padEnd(60, ' ');

  console.log(
    ansis.cyan.bold(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ███████╗  ██████╗ ███████╗                                   ║
║       ██╔╝  ██╔═══╝  ██╔═══╝                                   ║
║      ██╔╝   ██║      █████╗                                    ║
║    ██╔╝     ██║      ██╔══╝                                    ║
║   ███████╗  ╚██████╗ ██║                                       ║
║   ╚══════╝   ╚═════╝ ╚═╝                                       ║
║                                                                ║
║   ${ansis.white.bold('Zero-Config Claude-Code Flow')}                                 ║
║   ${ansis.gray(paddedSubtitle)} ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`)
  );
}

export function displayBannerWithInfo(subtitle?: string) {
  displayBanner(subtitle);
  console.log(ansis.gray(`  Version: ${ansis.cyan(version)}  |  ${ansis.cyan(homepage)}\n`));
}
