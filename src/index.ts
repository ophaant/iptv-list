import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface Channel {
  tvgId: string;
  logo: string;
  group: string;
  name: string;
  url: string;
  headers?: { [key: string]: string };
}

const SOURCES = [
  {
    url: 'https://mgi24.github.io/tvdigital/idwork.m3u',
    groupName: 'Indonesia',
    filter: (ch: Channel) => true,
  },
  {
    url: 'https://iptv.riotryulianto.workers.dev/',
    groupName: 'Indonesia',
    filter: (ch: Channel) => true,
  },
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

// Curated active MNC channels that are referer-protected but work without Widevine DRM keys
const CORE_INDONESIA_CHANNELS: Channel[] = [
  {
    tvgId: 'RCTI.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/RCTI_logo_2015.svg/960px-RCTI_logo_2015.svg.png',
    group: 'Indonesia (Populer)',
    name: 'RCTI',
    url: 'https://allcutv.rctiplus.id/rcti2023.m3u8',
    headers: {
      'Referer': 'https://www.rctiplus.com/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'MNCTV.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/MNCTV_logo_2015.svg/960px-MNCTV_logo_2015.svg.png',
    group: 'Indonesia (Populer)',
    name: 'MNC TV',
    url: 'https://allcutv.rctiplus.id/mnctv2023.m3u8',
    headers: {
      'Referer': 'https://www.rctiplus.com/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'GTV.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/GTV_logo_2017.svg/960px-GTV_logo_2017.svg.png',
    group: 'Indonesia (Populer)',
    name: 'GTV (Global TV)',
    url: 'https://allcutv.rctiplus.id/gtv2023.m3u8',
    headers: {
      'Referer': 'https://www.rctiplus.com/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'iNews.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/INews_logo_2023.svg/960px-INews_logo_2023.svg.png',
    group: 'Indonesia (Populer)',
    name: 'iNews',
    url: 'https://allcutv.rctiplus.id/inews2023.m3u8',
    headers: {
      'Referer': 'https://www.rctiplus.com/',
      'User-Agent': 'Mozilla'
    }
  }
];

// Helper to categorize popular Indonesian national TV channels
function getIndonesianGroup(name: string): string {
  const popularRegex = /rcti|mnc\s*tv|gtv|global\s*tv|inews|sctv|indosiar|antv|trans\s*tv|trans\s*7|net\s*tv|net\.|tvone|metro\s*tv|kompas\s*tv|rtv|rajawali\s*tv|cnn\s*indonesia|cnbc\s*indonesia/i;
  return popularRegex.test(name) ? 'Indonesia (Populer)' : 'Indonesia (Lokal)';
}

// Parser function for M3U content supporting headers
function parseM3U(content: string, defaultGroup: string): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  
  let currentInfo: Partial<Channel> | null = null;
  let currentHeaders: { [key: string]: string } = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      
      const commaIndex = line.lastIndexOf(',');
      let name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Unknown Channel';

      // Clean name: remove geoblocked indicator if we're injecting referrer
      name = name.replace(/\[Geo-blocked\]/gi, '').replace(/\s+/g, ' ').trim();

      // Dynamically group Indonesian channels into Populer or Lokal
      let group = defaultGroup;
      if (group === 'Indonesia') {
        group = getIndonesianGroup(name);
      }

      currentInfo = {
        tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
        logo: logoMatch ? logoMatch[1] : '',
        group: group,
        name: name,
      };
    } else if (line.startsWith('#EXTVLCOPT:')) {
      const optMatch = line.match(/#EXTVLCOPT:(.*)/);
      if (optMatch) {
        const option = optMatch[1].trim();
        const eqIndex = option.indexOf('=');
        if (eqIndex !== -1) {
          const key = option.substring(0, eqIndex).toLowerCase();
          const val = option.substring(eqIndex + 1).trim();
          if (key === 'http-referrer' || key === 'referrer') {
            currentHeaders['Referer'] = val;
          } else if (key === 'http-user-agent' || key === 'user-agent') {
            // Strip spaces from UA to prevent URL-parsing issues in strict mobile players
            currentHeaders['User-Agent'] = val.includes(' ') ? 'Mozilla' : val;
          }
        }
      }
    } else if (line.startsWith('#')) {
      continue;
    } else {
      // This is the URL line
      if (currentInfo) {
        let streamUrl = line;
        
        // Parse trailing parameters separated by "|"
        const pipeIndex = streamUrl.indexOf('|');
        if (pipeIndex !== -1) {
          const paramsStr = streamUrl.substring(pipeIndex + 1);
          streamUrl = streamUrl.substring(0, pipeIndex).trim();
          
          const params = paramsStr.split('&');
          for (const param of params) {
            const eqIndex = param.indexOf('=');
            if (eqIndex !== -1) {
              const k = param.substring(0, eqIndex).trim().toLowerCase();
              const v = param.substring(eqIndex + 1).trim();
              if (k === 'referer') {
                currentHeaders['Referer'] = v;
              } else if (k === 'user-agent') {
                // Strip spaces from UA to prevent URL-parsing issues in strict mobile players
                currentHeaders['User-Agent'] = v.includes(' ') ? 'Mozilla' : v;
              }
            }
          }
        }

        // Apply auto-injection of referrers/UAs based on domain
        const lowerUrl = streamUrl.toLowerCase();
        
        // Dens.tv auto-inject
        if (
          lowerUrl.includes('dens.tv') ||
          lowerUrl.includes('210.210.155.') ||
          lowerUrl.includes('45.126.83.') ||
          lowerUrl.includes('203.77.246.')
        ) {
          if (!currentHeaders['Referer']) {
            currentHeaders['Referer'] = 'http://www.dens.tv/';
          }
          if (!currentHeaders['User-Agent']) {
            currentHeaders['User-Agent'] = 'Mozilla';
          }
        }
        
        // MNC/Vision+ auto-inject
        if (
          lowerUrl.includes('rctiplus') ||
          lowerUrl.includes('visionplus') ||
          lowerUrl.includes('ptmnc01') ||
          lowerUrl.includes('cloudfront.net/live/eds/') ||
          lowerUrl.includes('liveaneviadev') ||
          lowerUrl.includes('mncnow')
        ) {
          if (!currentHeaders['Referer']) {
            currentHeaders['Referer'] = 'https://www.rctiplus.com/';
          }
          if (!currentHeaders['User-Agent']) {
            currentHeaders['User-Agent'] = 'Mozilla';
          }
        }

        // Clean user-agent in case it has spaces from source
        if (currentHeaders['User-Agent'] && currentHeaders['User-Agent'].includes(' ')) {
          currentHeaders['User-Agent'] = 'Mozilla';
        }

        channels.push({
          tvgId: currentInfo.tvgId || '',
          logo: currentInfo.logo || '',
          group: currentInfo.group || defaultGroup,
          name: currentInfo.name || 'Unknown Channel',
          url: streamUrl,
          headers: { ...currentHeaders },
        });

        currentInfo = null;
        currentHeaders = {};
      }
    }
  }

  return channels;
}

// Function to test if a stream is online, including appropriate headers
async function checkStreamOnline(url: string, chHeaders?: { [key: string]: string }): Promise<boolean> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...chHeaders,
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

  // Prepend core Indonesian channels first
  allChannels.push(...CORE_INDONESIA_CHANNELS);

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
    // Bypass online check for Indonesian channels because they are geo-blocked on US/EU runners but work for domestic users
    const isOnline = ch.group.startsWith('Indonesia') ? true : await checkStreamOnline(ch.url, ch.headers);
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

      // Output URL with parameters (TiviMate/OTT Player style) - NO space inside headers
      let displayUrl = ch.url;
      const urlParams: string[] = [];
      if (ch.headers) {
        if (ch.headers['Referer']) {
          urlParams.push(`Referer=${ch.headers['Referer']}`);
        }
        if (ch.headers['User-Agent']) {
          urlParams.push(`User-Agent=${ch.headers['User-Agent']}`);
        }
      }
      if (urlParams.length > 0) {
        displayUrl += '|' + urlParams.join('&');
      }

      m3uContent += `${displayUrl}\n`;
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
