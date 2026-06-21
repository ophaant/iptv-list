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
    url: 'https://raw.githubusercontent.com/dhasap/dhanytv/main/dhanytv-ott.m3u',
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
// Curated active Indonesian channels (MNC channels need referer, others play without headers)
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
  },
  {
    tvgId: 'ANTV.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Antv_logo.svg/960px-Antv_logo.svg.png',
    group: 'Indonesia (Populer)',
    name: 'ANTV',
    url: 'https://op-group1-swiftservehd-1.dens.tv/s/s07/index.m3u8'
  },
  {
    tvgId: 'Indosiar.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Indosiar_logo_2015.svg/1200px-Indosiar_logo_2015.svg.png',
    group: 'Indonesia (Populer)',
    name: 'Indosiar',
    url: 'https://op-group1-swiftservehd-1.dens.tv/h/h235/index.m3u8'
  },
  {
    tvgId: 'SCTV.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/SCTV_Logo.svg/1200px-SCTV_Logo.svg.png',
    group: 'Indonesia (Populer)',
    name: 'SCTV',
    url: 'https://op-group1-swiftservehd-1.dens.tv/h/h217/index.m3u8'
  },
  {
    tvgId: 'tvOne.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/TvOne_logo_2013.svg/960px-TvOne_logo_2013.svg.png',
    group: 'Indonesia (Populer)',
    name: 'tvOne',
    url: 'https://op-group1-swiftservehd-1.dens.tv/h/h224/index.m3u8'
  },
  {
    tvgId: 'NET.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/NET_logo.svg/960px-NET_logo.svg.png',
    group: 'Indonesia (Populer)',
    name: 'NET TV',
    url: 'https://op-group1-swiftservehd-1.dens.tv/h/h223/index.m3u8'
  },
  {
    tvgId: 'RTV.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Rajawali_Televisi_logo_2014.svg/960px-Rajawali_Televisi_logo_2014.svg.png',
    group: 'Indonesia (Populer)',
    name: 'RTV',
    url: 'https://rtvstream.rtv.co.id:4555/hls/rtv.m3u8'
  },
  {
    tvgId: 'TransTV.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Trans_TV_2013.svg/960px-Trans_TV_2013.svg.png',
    group: 'Indonesia (Populer)',
    name: 'Trans TV',
    url: 'https://video.detik.com/transtv/smil:transtv.smil/playlist.m3u8'
  },
  {
    tvgId: 'Trans7.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Trans7_logo_2013.svg/960px-Trans7_logo_2013.svg.png',
    group: 'Indonesia (Populer)',
    name: 'Trans 7',
    url: 'https://video.detik.com/trans7/smil:trans7.smil/playlist.m3u8'
  },
  {
    tvgId: 'CNBCIndonesia.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/CNBC_Indonesia_2025.svg/960px-CNBC_Indonesia_2025.svg.png',
    group: 'Indonesia (Populer)',
    name: 'CNBC Indonesia',
    url: 'https://live.cnbcindonesia.com/livecnbc/smil:cnbctv.smil/playlist.m3u8'
  },
  {
    tvgId: 'CNNIndonesia.id',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/CNN_Indonesia_2023.svg/960px-CNN_Indonesia_2023.svg.png',
    group: 'Indonesia (Populer)',
    name: 'CNN Indonesia',
    url: 'https://live.cnnindonesia.com/livecnn/smil:cnntv.smil/playlist.m3u8'
  }
];

// Helper to skip appending headers for domains that play fine without them (avoiding pipe character for OTT Player)
function shouldSkipHeadersInUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('dens.tv') ||
    lowerUrl.includes('detik.com') ||
    lowerUrl.includes('cnbcindonesia.com') ||
    lowerUrl.includes('cnnindonesia.com') ||
    lowerUrl.includes('rtv.co.id') ||
    lowerUrl.includes('rtvstream.rtv.co.id') ||
    lowerUrl.includes('siar.us') ||
    lowerUrl.includes('carubantv.id') ||
    lowerUrl.includes('streamlock.net') ||
    lowerUrl.includes('medcom.id') ||
    lowerUrl.includes('metrotvnews.com') ||
    lowerUrl.includes('210.210.155.') ||
    lowerUrl.includes('45.126.83.') ||
    lowerUrl.includes('203.77.246.')
  );
}

// Helper to normalize channel names to group duplicates
function getCanonicalChannelName(name: string): string {
  let normalized = name.toLowerCase();
  
  // Remove common suffixes/prefixes
  normalized = normalized.replace(/\[geo-blocked\]/gi, '');
  normalized = normalized.replace(/\b(hd|sd|fhd|uhd|hevc|h\.264|h\.265)\b/gi, '');
  normalized = normalized.replace(/\b(indonesia|indo|id|stream|streaming|tv|live|backup|cad|digital|720p|1080p|576i)\b/gi, '');
  normalized = normalized.replace(/\b(ch|channel)\b\s*\d*/gi, '');
  
  // Clean whitespace and non-alphanumeric (keep letters/numbers)
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  
  // Map specific variations
  if (normalized.includes('rcti')) return 'rcti';
  if (normalized.includes('mnc') || normalized.includes('mnctv')) return 'mnctv';
  if (normalized.includes('gtv') || normalized.includes('globaltv') || normalized.includes('global')) return 'gtv';
  if (normalized.includes('inews')) return 'inews';
  if (normalized.includes('sctv')) return 'sctv';
  if (normalized.includes('indosiar')) return 'indosiar';
  if (normalized.includes('antv')) return 'antv';
  if (normalized.includes('tvone')) return 'tvone';
  if (normalized.includes('net') || normalized.includes('nettv')) return 'nettv';
  if (normalized.includes('cnbc')) return 'cnbc';
  if (normalized.includes('cnn')) return 'cnn';
  if (normalized.includes('rtv') || normalized.includes('rajawali')) return 'rtv';
  if (normalized.includes('transtv') || normalized.includes('trans')) {
    if (normalized.includes('7') || normalized.includes('seven')) {
      return 'trans7';
    }
    return 'transtv';
  }
  if (normalized.includes('metro')) return 'metrotv';
  if (normalized.includes('kompas')) return 'kompastv';
  
  return normalized;
}

// Scoring function to evaluate the quality and stability of streams
function getStreamScore(ch: Channel): number {
  let score = 0;
  const url = ch.url.toLowerCase();
  const name = ch.name.toLowerCase();
  
  // Prefer HTTPS
  if (url.startsWith('https://')) {
    score += 10;
  }
  
  // Prefer Dens.tv / Detik / RTV official streams for popular Indonesian channels
  if (
    url.includes('op-group1-swiftservehd-1.dens.tv') ||
    url.includes('video.detik.com') ||
    url.includes('allcutv.rctiplus.id') ||
    url.includes('rtvstream.rtv.co.id')
  ) {
    score += 50;
  }
  
  // Penalize backup / low quality in the name
  if (name.includes('backup') || name.includes('cad') || name.includes('low') || name.includes('sd')) {
    score -= 20;
  }
  
  // Penalize UDP/RTP streams (unstable/special player needed)
  if (url.includes('/udp/') || url.includes('/rtp/') || url.startsWith('udp://') || url.startsWith('rtp://')) {
    score -= 100;
  }
  
  // Penalize bad cloudfront nodes (like d1abp075u76pbq which needs DASH/DRM)
  if (url.includes('d1abp075u76pbq.cloudfront.net')) {
    score -= 150;
  }
  
  return score;
}

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
  
  // De-duplicate channels globally by group and canonical name to keep only the single best stream per channel
  const bestChannelsMap = new Map<string, Channel>();
  for (const ch of allChannels) {
    const canonicalName = getCanonicalChannelName(ch.name);
    if (!canonicalName) continue;
    
    // De-duplicate Indonesian popular and local together (preferring popular)
    const globalKey = ch.group.startsWith('Indonesia') ? `Indonesia:${canonicalName}` : `${ch.group}:${canonicalName}`;
    const existing = bestChannelsMap.get(globalKey);
    
    if (!existing) {
      bestChannelsMap.set(globalKey, ch);
    } else {
      if (getStreamScore(ch) > getStreamScore(existing)) {
        bestChannelsMap.set(globalKey, ch);
      }
    }
  }
  
  const uniqueChannels = Array.from(bestChannelsMap.values());
  console.log(`Deduplicated to ${uniqueChannels.length} candidate channels`);

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
      
      // Do not append headers if the URL is clean and doesn't require headers to play
      if (ch.headers && !shouldSkipHeadersInUrl(ch.url)) {
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
