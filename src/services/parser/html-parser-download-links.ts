export function extractElAmigosDownloadLinks(html: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href="(https:\/\/mega\.nz\/[^"]+)"/gi,
    /href="(https:\/\/drive\.google\.com\/[^"]+)"/gi,
    /href="(https:\/\/www\.mediafire\.com\/[^"]+)"/gi,
    /href="(https:\/\/[^"]+1fichier[^"]+)"/gi,
    /href="(https:\/\/[^"]+uploaded[^"]+)"/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) links.push(m[1]!);
  }
  return [...new Set(links)];
}

export function extractGloadDownloadLinks(html: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href="(magnet:[^"]+)"/gi,
    /href="([^"]+\.torrent)"/gi,
    /href="(https:\/\/(?:[^"]*mega[^"]*|upload[^"]*)[^"]*)"/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) links.push(m[1]!);
  }
  return [...new Set(links)];
}

export function extractOvaGamesDownloadLinks(html: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href="(https:\/\/mega\.nz\/[^"]+)"/gi,
    /href="(https:\/\/www\.mediafire\.com\/[^"]+)"/gi,
    /href="(https:\/\/drive\.google\.com\/[^"]+)"/gi,
    /href="(magnet:[^"]+)"/gi,
    /href="([^"]+\.torrent)"/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) links.push(m[1]!);
  }
  return [...new Set(links)];
}

export function extractKaosKrewDownloadLinks(html: string): string[] {
  const links: string[] = [];
  const patterns = [/href="(magnet:[^"]+)"/gi];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) links.push(m[1]!);
  }
  return [...new Set(links)];
}

export function extractTorrminatorrDownloadLinks(html: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href="(magnet:[^"]+)"/gi,
    /href="([^"]+\.torrent)"/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) links.push(m[1]!);
  }
  return [...new Set(links)];
}

export function extractTapochekDownloadLinks(html: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href="(magnet:[^"]+)"/gi,
    /href="([^"]+\.torrent)"/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) links.push(m[1]!);
  }
  return [...new Set(links)];
}
