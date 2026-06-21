import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface Channel {
  tvgId: string;
  logo: string;
  group: string;
  name: string;
  url: string;
}

const SOURCES = [
  {
    url: 'https://iptv-org.github.io/iptv/countries/id.m3u',
    groupName: 'Indonesia',
    filter: (ch: Channel) => true,
  },
  {
    url: 'https://iptv-org.github.io/iptv/countries/kr.m3u',
    groupName: 'Korea',
    filter: (ch: Channel) => true,
  },
  {
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    groupName: 'Olahraga',
    filter: (ch: Channel) => true,
  },
  {
    url: 'https://iptv-org.github.io/iptv/categories/animation.m3u',
    groupName: 'Anime',
    filter: (ch: Channel) => {
      // Filter for anime-related channel names
      const animeRegex = /anime|animax|aniplus|ani-one|muse|gundam|tokusatsu|bilibili|crunchyroll|doraemon|shin-chan|naruto|one piece/i;
      return animeRegex.test(ch.name) || animeRegex.test(ch.tvgId);
    },
  },
];

// Parser function for M3U content
function parseM3U(content: string, defaultGroup: string): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  let currentInfo: Partial<Channel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse tag details
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      
      // Name is everything after the last comma
      const commaIndex = line.lastIndexOf(',');
      const name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Unknown Channel';

      currentInfo = {
        tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
        logo: logoMatch ? logoMatch[1] : '',
        group: defaultGroup,
        name: name,
      };
    } else if (line.startsWith('#')) {
      // Ignore other metadata lines
      continue;
    } else {
      // This is the URL line
      if (currentInfo) {
        channels.push({
          tvgId: currentInfo.tvgId || '',
          logo: currentInfo.logo || '',
          group: currentInfo.group || defaultGroup,
          name: currentInfo.name || 'Unknown Channel',
          url: line,
        });
        currentInfo = null;
      }
    }
  }

  return channels;
}

// Function to test if a stream is online
async function checkStreamOnline(url: string): Promise<boolean> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  try {
    const response = await axios.head(url, {
      headers,
      timeout: 3000,
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 400) {
      return true;
    }
  } catch (e) {
    // Fallback to GET
  }

  try {
    const response = await axios.get(url, {
      headers,
      timeout: 3000,
      responseType: 'stream',
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 400) {
      response.data.destroy(); // close stream immediately
      return true;
    }
  } catch (e) {
    // Ignore
  }

  return false;
}

// Concurrency pool helper
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<any>[] = [];

  for (const item of items) {
    const p = fn(item).then((res) => {
      results.push(res);
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

async function main() {
  console.log('Starting IPTV playlist generation...');
  const allChannels: Channel[] = [];

  for (const source of SOURCES) {
    try {
      console.log(`Fetching: ${source.groupName} from ${source.url}`);
      const response = await axios.get(source.url, { timeout: 10000 });
      const parsed = parseM3U(response.data, source.groupName);
      const filtered = parsed.filter(source.filter);
      
      console.log(`Parsed ${parsed.length} channels, filtered to ${filtered.length} for ${source.groupName}`);
      allChannels.push(...filtered);
    } catch (error: any) {
      console.error(`Error fetching/parsing ${source.groupName}:`, error.message);
    }
  }

  console.log(`Total channels collected for validation: ${allChannels.length}`);
  
  // De-duplicate channels by URL to avoid redundant checking
  const uniqueChannelsMap = new Map<string, Channel>();
  for (const ch of allChannels) {
    uniqueChannelsMap.set(ch.url, ch);
  }
  const uniqueChannels = Array.from(uniqueChannelsMap.values());
  console.log(`Unique channels: ${uniqueChannels.length}`);

  console.log('Validating streams (this might take a few minutes)...');
  
  // Validate channels with limit of 15 concurrent checks
  const onlineChannels: Channel[] = [];
  let checkedCount = 0;

  await runWithConcurrency(uniqueChannels, 15, async (ch) => {
    const isOnline = await checkStreamOnline(ch.url);
    checkedCount++;
    if (checkedCount % 20 === 0 || checkedCount === uniqueChannels.length) {
      console.log(`Progress: ${checkedCount}/${uniqueChannels.length} validated`);
    }
    if (isOnline) {
      onlineChannels.push(ch);
    }
  });

  console.log(`Validation complete. Online channels: ${onlineChannels.length}`);

  // Generate M3U playlist file
  let m3uContent = '#EXTM3U\n';
  
  // Group by category/groupName for clean playlist organization
  const groupedChannels: { [key: string]: Channel[] } = {};
  for (const ch of onlineChannels) {
    if (!groupedChannels[ch.group]) {
      groupedChannels[ch.group] = [];
    }
    groupedChannels[ch.group].push(ch);
  }

  for (const group of Object.keys(groupedChannels).sort()) {
    for (const ch of groupedChannels[group]) {
      m3uContent += `#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
      m3uContent += `${ch.url}\n`;
    }
  }

  const outputPath = path.join(__dirname, '..', 'playlist.m3u');
  fs.writeFileSync(outputPath, m3uContent, 'utf8');
  console.log(`IPTV playlist saved successfully to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error running updater:', err);
  process.exit(1);
});
