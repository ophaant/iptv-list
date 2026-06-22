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
  drmKey?: string;
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
const CUSTOM_LOGOS: { [key: string]: string } = {
  'sctv': 'https://thumbor.prod.vidiocdn.com/kH-K9J4cROqL0TZrAyQhw7P5pBk=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/204/4e9f5c.png',
  'indosiar': 'https://thumbor.prod.vidiocdn.com/0plBZ7Gso7gNBJxid9ksA8HMGxc=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/205/54ab19.png',
  'tvri': 'https://thumbor.prod.vidiocdn.com/F6W__Y0wn_7mFW0cOuz7mi7qjWU=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/6441/528cc9.png',
  'rcti': 'https://thumbor.prod.vidiocdn.com/9c-sEWp6Du7DoWDn56cjma0gMpY=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/665/337c4d.png',
  'transtv': 'https://thumbor.prod.vidiocdn.com/__j35q7LPpcS2EgkR7v8GpE4USQ=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/733/ecaa60.png',
  'tvone': 'https://thumbor.prod.vidiocdn.com/APQ6a9vXvN6lU1zjeyL15IV_AJQ=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/783/07750c.png',
  'trans7': 'https://thumbor.prod.vidiocdn.com/-MEB2a6J4sB6SvBDimCb7JYP6WY=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/734/131514.png',
  'moji': 'https://thumbor.prod.vidiocdn.com/g7gTjD2Il1GI4DJULOZ1cv6NSj4=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/206/1823dc.png',
  'antv': 'https://thumbor.prod.vidiocdn.com/IRVkD3QGRzroJ4IZzXBpS-0MRls=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/782/e1af8b.png',
  'mnctv': 'https://thumbor.prod.vidiocdn.com/H-nyot3OCOIHY7qtKmguKyIUeBw=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/870/ca65b5.png',
  'kompastv': 'https://thumbor.prod.vidiocdn.com/Pf8yLSfHEUZeRI9tUzLDR2U8Zow=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/874/042ca3.png',
  'metrotv': 'https://thumbor.prod.vidiocdn.com/u0aa_S_rQeujrp5eR6LwXdertrI=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/777/ea8483.png',
  'gtv': 'https://thumbor.prod.vidiocdn.com/6uEQ8IC06gH6XiMTVHtlRr1HAOE=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/778/810229.png',
  'inews': 'https://thumbor.prod.vidiocdn.com/BmeGg2IWkB_FAVPDviCk8gP8qcw=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/5409/c40666.png',
  'rtv': 'https://thumbor.prod.vidiocdn.com/cStgoV5oqj2Om_6NMOzK0AFY-sg=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/1561/665aea.png',
  'mentari': 'https://thumbor.prod.vidiocdn.com/59CZO-IVdps6hUK6gEQqn-w-bCw=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/8237/18585d.png',
  'mentaritv': 'https://thumbor.prod.vidiocdn.com/59CZO-IVdps6hUK6gEQqn-w-bCw=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/8237/18585d.png',
  'mdtv': 'https://thumbor.prod.vidiocdn.com/LCZH_yEBnTYEQzrU1pB7w7ev-Bw=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/875/325605.png',
  'beritasatu': 'https://thumbor.prod.vidiocdn.com/cSyueV9bIgkdLkvVWqIZOlR6TFQ=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/18280/c7fc8f.png',
  'btv': 'https://thumbor.prod.vidiocdn.com/DoRk_b8tcmbwDHroNxP2-o6QRKU=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/6165/8c950f.png',
  'garuda': 'https://thumbor.prod.vidiocdn.com/qtIYvE-mjwMPwd-VUxilo2gFiAI=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/18162/b4bea2.png',
  'garudatv': 'https://thumbor.prod.vidiocdn.com/qtIYvE-mjwMPwd-VUxilo2gFiAI=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/18162/b4bea2.png',
  'ggstv': 'https://thumbor.prod.vidiocdn.com/mKMJ1J-ffUe8NpZ3ky3Ve5oDzuI=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/18105/25d569.png',
  'hiphiphoree': 'https://thumbor.prod.vidiocdn.com/EOkH5JDfHzAnCeGKEXiY12G36Qw=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7052/63032e.png',
  'nusantara': 'https://thumbor.prod.vidiocdn.com/npPL9VlWMJ5owmeupR7ucPjdGl4=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7432/bfecbc.png',
  'nusantaratv': 'https://thumbor.prod.vidiocdn.com/npPL9VlWMJ5owmeupR7ucPjdGl4=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7432/bfecbc.png',
  'jtv': 'https://thumbor.prod.vidiocdn.com/RFPy_yTRC9PPPbHGeJlLQgt-RaE=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/9713/a11faf.png',
  'horee': 'https://thumbor.prod.vidiocdn.com/lfyNbk-BG70u8ahFpO9I0HhV3bM=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/6397/d422cd.png',
  'sinpo': 'https://thumbor.prod.vidiocdn.com/j6L0yLX8CtZTUnIO5aMzs0tNkvI=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/19046/aaa3fa.png',
  'sinpotv': 'https://thumbor.prod.vidiocdn.com/j6L0yLX8CtZTUnIO5aMzs0tNkvI=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/19046/aaa3fa.png',
  'ajwa': 'https://thumbor.prod.vidiocdn.com/GydAc8ocolWIwQ2A_1xFv0iQ3GM=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7464/e69965.png',
  'ajwatv': 'https://thumbor.prod.vidiocdn.com/GydAc8ocolWIwQ2A_1xFv0iQ3GM=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7464/e69965.png',
  'daai': 'https://thumbor.prod.vidiocdn.com/0r_rhIVANc6dsGvQ76616ZSqF04=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/6482/e83fcf.png',
  'daaitv': 'https://thumbor.prod.vidiocdn.com/0r_rhIVANc6dsGvQ76616ZSqF04=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/6482/e83fcf.png',
  'musica': 'https://thumbor.prod.vidiocdn.com/I6siEUUN1ga4mYcu0Ysr9BlHeH4=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7619/379f71.png',
  'uchannel': 'https://thumbor.prod.vidiocdn.com/yw_pUKLmZyf5rwqDqh-FvU2llv8=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/6898/7e119a.png',
  'uchanneltv': 'https://thumbor.prod.vidiocdn.com/yw_pUKLmZyf5rwqDqh-FvU2llv8=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/6898/7e119a.png',
  'jawapos': 'https://thumbor.prod.vidiocdn.com/yo9zkfT4I-17_keD5cai7XRKEE0=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/9714/5a2fad.jpg',
  'jawapostv': 'https://thumbor.prod.vidiocdn.com/yo9zkfT4I-17_keD5cai7XRKEE0=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/9714/5a2fad.jpg',
  'dmi': 'https://thumbor.prod.vidiocdn.com/XudiSJe7FNdZ4dBfDmy-5X0MwZo=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/12607/de1855.png',
  'dmitv': 'https://thumbor.prod.vidiocdn.com/XudiSJe7FNdZ4dBfDmy-5X0MwZo=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/12607/de1855.png',
  'elshinta': 'https://thumbor.prod.vidiocdn.com/9Ai_9ibLKhC4czfgMXnw3P-uSyA=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/10975/0dc2d8.png',
  'elshintatv': 'https://thumbor.prod.vidiocdn.com/9Ai_9ibLKhC4czfgMXnw3P-uSyA=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/10975/0dc2d8.png',
  'magna': 'https://thumbor.prod.vidiocdn.com/43T_Bt_R_JSQugV3MxoAeYze7OQ=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7230/7d6bf5.jpg',
  'magnatv': 'https://thumbor.prod.vidiocdn.com/43T_Bt_R_JSQugV3MxoAeYze7OQ=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/7230/7d6bf5.jpg',
  'jak': 'https://thumbor.prod.vidiocdn.com/lJ0VbXBqgieZcVnLJ-Beck84Idk=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/5415/802b76.png',
  'jaktv': 'https://thumbor.prod.vidiocdn.com/lJ0VbXBqgieZcVnLJ-Beck84Idk=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/5415/802b76.png',
  'citra': 'https://thumbor.prod.vidiocdn.com/-8PUJArasi4xed1VWjzmbdSkVWg=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/21179/13c032.png',
  'citradrama': 'https://thumbor.prod.vidiocdn.com/-8PUJArasi4xed1VWjzmbdSkVWg=/230x230/filters:quality(70)/vidio-web-prod-livestreaming/uploads/livestreaming/square_image/21179/13c032.png',
  'cnbc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/CNBC_Indonesia_2025.svg/960px-CNBC_Indonesia_2025.svg.png',
  'cnn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/CNN_Indonesia_2023.svg/960px-CNN_Indonesia_2023.svg.png',
  'kbsworld': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/KBS_World_2018.png',
  'tvn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/TvN_Logo.svg/512px-TvN_Logo.svg.png',
  'tvnmovies': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/TvN_Movies_logo.svg/512px-TvN_Movies_logo.svg.png',
  'sbs': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/SBS_Logo_2018.svg/512px-SBS_Logo_2018.svg.png'
};

// Curated active Indonesian channels (MNC channels need referer, others play without headers)
const CORE_INDONESIA_CHANNELS: Channel[] = [
  {
    tvgId: 'RCTI.id',
    logo: CUSTOM_LOGOS['rcti'],
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
    logo: CUSTOM_LOGOS['mnctv'],
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
    logo: CUSTOM_LOGOS['gtv'],
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
    logo: CUSTOM_LOGOS['inews'],
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
    logo: CUSTOM_LOGOS['antv'],
    group: 'Indonesia (Populer)',
    name: 'ANTV',
    url: 'https://aspaltvpasti.top/Drmvidbos/Akun121/bosstv.m3u8?id=782'
  },
  {
    tvgId: 'Indosiar.id',
    logo: CUSTOM_LOGOS['indosiar'],
    group: 'Indonesia (Populer)',
    name: 'Indosiar',
    url: 'https://tvratu.my.id/vid/index.mpd?id=205&type=dash',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleCoreMedia/537.36'
    },
    drmKey: '6a8b65c83036329e7185b9cd8cbdee29:0eb2beb5633f8e35cafab45af3d21de0'
  },
  {
    tvgId: 'SCTV.id',
    logo: CUSTOM_LOGOS['sctv'],
    group: 'Indonesia (Populer)',
    name: 'SCTV',
    url: 'https://d3b0v7fggu5zwm.cloudfront.net/out/v1/9e9aba7068ca4c7f8a73381bef5f8742/index.mpd',
    headers: {
      'Referer': 'https://www.visionplus.id/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G9980) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
    },
    drmKey: '93d5b9f9d5d14f15b1ba9582f332d1fc:116e4014a662fef4ea5d7671dd5120d8'
  },
  {
    tvgId: 'tvOne.id',
    logo: CUSTOM_LOGOS['tvone'],
    group: 'Indonesia (Populer)',
    name: 'tvOne',
    url: 'https://d3b0v7fggu5zwm.cloudfront.net/out/v1/f3df48faafaf4198a65b9763140fce30/index.mpd',
    headers: {
      'Referer': 'https://www.visionplus.id/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
    },
    drmKey: 'eab667a8f7f14ff7bf00d790314a10f0:1d6693bc942f036053fc1c3c3b3b5032'
  },
  {
    tvgId: 'MDTV.id',
    logo: CUSTOM_LOGOS['mdtv'],
    group: 'Indonesia (Populer)',
    name: 'MDTV',
    url: 'https://op-group1-swiftservesd-1.dens.tv/h/h06/index.m3u8'
  },
  {
    tvgId: 'RTV.id',
    logo: CUSTOM_LOGOS['rtv'],
    group: 'Indonesia (Populer)',
    name: 'RTV',
    url: 'https://rtvstream.rtv.co.id:4555/hls/rtv.m3u8'
  },
  {
    tvgId: 'TransTV.id',
    logo: CUSTOM_LOGOS['transtv'],
    group: 'Indonesia (Populer)',
    name: 'Trans TV',
    url: 'https://video.detik.com/transtv/smil:transtv.smil/playlist.m3u8'
  },
  {
    tvgId: 'Trans7.id',
    logo: CUSTOM_LOGOS['trans7'],
    group: 'Indonesia (Populer)',
    name: 'Trans 7',
    url: 'https://video.detik.com/trans7/smil:trans7.smil/playlist.m3u8'
  },
  {
    tvgId: 'CNBCIndonesia.id',
    logo: CUSTOM_LOGOS['cnbc'],
    group: 'Indonesia (Populer)',
    name: 'CNBC Indonesia',
    url: 'https://live.cnbcindonesia.com/livecnbc/smil:cnbctv.smil/playlist.m3u8'
  },
  {
    tvgId: 'CNNIndonesia.id',
    logo: CUSTOM_LOGOS['cnn'],
    group: 'Indonesia (Populer)',
    name: 'CNN Indonesia',
    url: 'https://live.cnnindonesia.com/livecnn/smil:cnntv.smil/playlist.m3u8'
  },
  {
    tvgId: 'Moji.id',
    logo: CUSTOM_LOGOS['moji'],
    group: 'Indonesia (Populer)',
    name: 'Moji',
    url: 'https://aspaltvpasti.top/Drmvidbos/Akun121/bosstv.m3u8?id=206'
  },
  {
    tvgId: 'KBSWorld.kr',
    logo: CUSTOM_LOGOS['kbsworld'],
    group: 'Korea',
    name: 'KBS World',
    url: 'https://kbsworld-ott.akamaized.net/hls/live/2002341/kbsworld/master.m3u8',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  {
    tvgId: 'tvN.kr',
    logo: CUSTOM_LOGOS['tvn'],
    group: 'Korea',
    name: 'tvN Asia',
    url: 'https://op-group1-swiftservehd-1.dens.tv/h/h20/index.m3u8',
    headers: {
      'Referer': 'http://www.dens.tv/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'tvNMovies.kr',
    logo: CUSTOM_LOGOS['tvnmovies'],
    group: 'Korea',
    name: 'tvN Movies Asia',
    url: 'https://op-group1-swiftservehd-1.dens.tv/h/h214/index.m3u8',
    headers: {
      'Referer': 'http://www.dens.tv/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'SBS.kr',
    logo: CUSTOM_LOGOS['sbs'],
    group: 'Korea',
    name: 'SBS',
    url: 'https://streaming-a-802.cdn.nextologies.com/SBS_Live_HD/live/SBS_Live_HD_1500k/chunks.m3u8'
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
  
  // Map specific variations strictly
  if (normalized === 'rcti') return 'rcti';
  if (normalized === 'mnc' || normalized === 'mnctv') return 'mnctv';
  if (normalized === 'gtv' || normalized === 'globaltv' || normalized === 'global') return 'gtv';
  if (normalized === 'inews') return 'inews';
  if (normalized === 'sctv') return 'sctv';
  if (normalized === 'indosiar') return 'indosiar';
  if (normalized === 'antv') return 'antv';
  if (normalized === 'tvone') return 'tvone';
  if (normalized === 'net' || normalized === 'nettv' || normalized === 'netdot') return 'mdtv';
  if (normalized === 'cnbc' || normalized === 'cnbcindonesia') return 'cnbc';
  if (normalized === 'cnn' || normalized === 'cnnindonesia') return 'cnn';
  if (normalized === 'rtv' || normalized === 'rajawalitv' || normalized === 'rajawali') return 'rtv';
  if (normalized === 'transtv' || normalized === 'trans') return 'transtv';
  if (normalized === 'trans7') return 'trans7';
  if (normalized === 'metrotv' || normalized === 'metro') return 'metrotv';
  if (normalized === 'kompastv' || normalized === 'kompas') return 'kompastv';
  if (normalized === 'moji') return 'moji';
  if (normalized === 'tvri') return 'tvri';
  if (normalized === 'mentari' || normalized === 'mentaritv') return 'mentaritv';
  if (normalized === 'mdtv' || normalized === 'md') return 'mdtv';
  if (normalized === 'beritasatu') return 'beritasatu';
  if (normalized === 'btv') return 'btv';
  if (normalized === 'garuda' || normalized === 'garudatv') return 'garudatv';
  if (normalized === 'ggs' || normalized === 'ggstv') return 'ggstv';
  if (normalized === 'hiphiphoree') return 'hiphiphoree';
  if (normalized === 'nusantara' || normalized === 'nusantaratv') return 'nusantaratv';
  if (normalized === 'jtv') return 'jtv';
  if (normalized === 'horee') return 'horee';
  if (normalized === 'sinpo' || normalized === 'sinpotv') return 'sinpotv';
  if (normalized === 'ajwa' || normalized === 'ajwatv') return 'ajwatv';
  if (normalized === 'daai' || normalized === 'daaitv') return 'daaitv';
  if (normalized === 'musica') return 'musica';
  if (normalized === 'uchannel' || normalized === 'uchanneltv') return 'uchanneltv';
  if (normalized === 'jawapos' || normalized === 'jawapostv') return 'jawapostv';
  if (normalized === 'dmi' || normalized === 'dmitv') return 'dmitv';
  if (normalized === 'elshinta' || normalized === 'elshintatv') return 'elshintatv';
  if (normalized === 'magna' || normalized === 'magnatv') return 'magnatv';
  if (normalized === 'jak' || normalized === 'jaktv') return 'jaktv';
  if (normalized === 'citra' || normalized === 'citradrama') return 'citradrama';
  if (normalized === 'kbsworld' || normalized === 'kbs') return 'kbsworld';
  if (normalized === 'tvn' || normalized === 'tvnasia') return 'tvn';
  if (normalized === 'tvnmovies' || normalized === 'tvnmovie') return 'tvnmovies';
  if (normalized === 'sbs') return 'sbs';
  
  return normalized;
}

// Scoring function to evaluate the quality and stability of streams
function getStreamScore(ch: Channel): number {
  let score = 0;
  const url = ch.url.toLowerCase();
  const name = ch.name.toLowerCase();

  // Curated core channels get a massive bonus because they are verified and DRM-configured
  if (ch.drmKey || CORE_INDONESIA_CHANNELS.some(c => c.url === ch.url)) {
    score += 500;
  }

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

        // Apply custom logo override if available
        let logo = currentInfo.logo || '';
        const canonical = getCanonicalChannelName(currentInfo.name || '');
        if (CUSTOM_LOGOS[canonical]) {
          logo = CUSTOM_LOGOS[canonical];
        }

        channels.push({
          tvgId: currentInfo.tvgId || '',
          logo: logo,
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
    // Bypass online check for Indonesian and Korean channels because they are geo-blocked on US/EU runners but work for domestic users
    const isOnline = (ch.group.startsWith('Indonesia') || ch.group === 'Korea') ? true : await checkStreamOnline(ch.url, ch.headers);
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
      // ClearKey DRM tags
      if (ch.drmKey) {
        m3uContent += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
        m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${ch.drmKey}\n`;
      }
      // VLC HTTP options
      if (ch.headers) {
        if (ch.headers['Referer']) {
          m3uContent += `#EXTVLCOPT:http-referrer=${ch.headers['Referer']}\n`;
        }
        if (ch.headers['User-Agent']) {
          m3uContent += `#EXTVLCOPT:http-user-agent=${ch.headers['User-Agent']}\n`;
        }
      }
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
