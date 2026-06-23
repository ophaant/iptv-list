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
  'sbs': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/SBS_Logo_2018.svg/512px-SBS_Logo_2018.svg.png',
  'sportstars1': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Sportstars.png',
  'sportstars2': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Sportstars_2.png',
  'sportstars3': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Sportstars_3.png',
  'sportstars4': 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Sportstars_4.png',
  'tvrisport': 'https://i.imgur.com/QMDLXBK.jpeg',
  'beinsportsxtra': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/BeIN_Sports_logo_%28vertical_version%29.svg/500px-BeIN_Sports_logo_%28vertical_version%29.svg.png',
  'beinsportsxtraespanol': 'https://i.imgur.com/V562tpO.png',
  'espn8theocho': 'https://images.fubo.tv/channel-config-ui/station-logos/on-dark/espn_8_the_ocho_bw.png',
  'tracesportstars': 'https://i.imgur.com/FabFP5A.png',
  'mojiproliga': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Moji_blue.svg/1024px-Moji_blue.svg.png',
  'fifaplus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png',
  'fubosports': 'https://i.imgur.com/qFNRJLb.png',
  'mutv': 'https://d2n0069hmnqmmx.cloudfront.net/epgdata/1.0/newchanlogos/512/512/skychb1834.png',
  'fightnetwork': 'https://i.imgur.com/vlKPZHR.png',
  'draftkings': 'https://i.imgur.com/SFYhgrt.png',
  'ddsports': 'https://i.imgur.com/bPWFXkL.png',
  'cazetv': 'https://upload.wikimedia.org/wikipedia/en/thumb/6/64/Caz%C3%A9TV_logo.svg/1280px-Caz%C3%A9TV_logo.svg.png',
  'morethansportstv': 'https://i.imgur.com/SLrjImc.png',
  'cbsgolazo': 'https://i.imgur.com/eMjutHS.png',
  'lequipe': 'https://i.imgur.com/t35zhM9.png',
  'fite247': 'https://i.imgur.com/ESV6qgH.png',
  'combateglobal': 'https://i.imgur.com/ZPYK5jr.png',
  'spotv': 'https://warningfm.github.io/v3/img/zfcBrM4.png?v=1.0.0.1',
  'spotv2': 'https://warningfm.github.io/v3/img/wDbt2cl.png?v=1.0.0.1',
  'beinsports1': 'https://raw.githubusercontent.com/whs4030/Logo/refs/heads/main/Bein-MY1.png',
  'beinsports2': 'https://raw.githubusercontent.com/whs4030/Logo/refs/heads/main/Bein-MY2.png',
  'beinsports3': 'https://raw.githubusercontent.com/whs4030/Logo/refs/heads/main/Bein-MY3.png',
  'daznlaliga1': 'https://raw.githubusercontent.com/whs4030/Logo/refs/heads/main/DaznLaliga1.png',
  'daznlaliga2': 'https://raw.githubusercontent.com/whs4030/Logo/refs/heads/main/DaznLaliga2.png',
  'movistarlaliga': 'https://raw.githubusercontent.com/whs4030/Logo/refs/heads/main/M%2BLaliga-picsay.png',
  'skysportspremierleague': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Sky_Sports_Premier_League_logo_2020.svg/512px-Sky_Sports_Premier_League_logo_2020.svg.png',
  'skysportseriea': 'https://seeklogo.com/images/S/sky-sport-serie-a-logo-68A36EAF5C-seeklogo.com.png',
  'skysportbundesliga': 'https://seeklogo.com/images/S/sky-sport-bundesliga-logo-27807C2755-seeklogo.com.png',
  'espnpremium': 'https://images.indihometv.com/images/channels/image_ch_espn.png',
  'espn2': 'https://images.indihometv.com/images/channels/image_ch_espn2.png'
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
    url: 'https://cdn4.skygo.mn/live/disk1/KBSWorld/HLSv3-FTA/KBSWorld.m3u8'
  },
  {
    tvgId: 'tvN.kr',
    logo: CUSTOM_LOGOS['tvn'],
    group: 'Korea',
    name: 'tvN Asia',
    url: 'https://fta1-cdn-flr.visionplus.id/out/v1/6dc5412d26ea4e65961c825d866f2a34/index.mpd',
    headers: {
      'Referer': 'https://www.visionplus.id/',
      'User-Agent': 'Mozilla'
    },
    drmKey: '2e8cbd6f664b4ace966d3edfad94c18e:cff33777777f7e61078ae2ae41ed0636'
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
    url: 'http://123.140.197.22/stream/1/play.m3u8'
  },
  {
    tvgId: 'KPlus.kr',
    logo: 'https://images.indihometv.com/images/channels/image_ch_kplus.png',
    group: 'Korea',
    name: 'K-Plus',
    url: 'https://cdn10jtedge.indihometv.com/atm/DASH/kplus/manifest.mpd',
    headers: {
      'Referer': 'https://www.indihometv.com/',
      'User-Agent': 'Mozilla'
    }
  }
];

const CORE_SPORTS_CHANNELS: Channel[] = [
  {
    tvgId: 'Sportstars.id',
    logo: CUSTOM_LOGOS['sportstars1'],
    group: 'Olahraga',
    name: 'Sportstars 1',
    url: 'https://d2tjypxxy769fn.cloudfront.net/out/v1/89a6e4261cd7470f83e5869e90440cff/index.mpd',
    headers: {
      'Referer': 'https://www.visionplus.id/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    drmKey: '39c4dc6704cf4ceea2fd4863b88d8a7d:4e9d7954c2ff46759289da4fc9f018ea'
  },
  {
    tvgId: 'Sportstars2.id',
    logo: CUSTOM_LOGOS['sportstars2'],
    group: 'Olahraga',
    name: 'Sportstars 2',
    url: 'https://d3b0v7fggu5zwm.cloudfront.net/out/v1/d2c68a3dfb644808b416bd90dcc92d5f/index.mpd',
    headers: {
      'Referer': 'https://www.visionplus.id/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    drmKey: '911e72adf36946afbdbb4f80782a8394:08aec548a851ba64b7172ae7f05cb91c'
  },
  {
    tvgId: 'Sportstars3.id',
    logo: CUSTOM_LOGOS['sportstars3'],
    group: 'Olahraga',
    name: 'Sportstars 3',
    url: 'https://d84q7nw4qf3j3.cloudfront.net/out/v1/eb98aca0a1be41f7b9c05dac051a250e/index.mpd',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    drmKey: 'ed1723eb360145ccafa1b466130186da:c7c4171e98de14c23be427f6ab16ef72'
  },
  {
    tvgId: 'Sportstars4.id',
    logo: CUSTOM_LOGOS['sportstars4'],
    group: 'Olahraga',
    name: 'Sportstars 4',
    url: 'https://d2xz2v5wuvgur6.cloudfront.net/out/v1/2fcc58ccec8c45e9aa094fb980eb642d/index.mpd',
    headers: {
      'Referer': 'https://www.visionplus.id/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    drmKey: 'b576e5f5f1bc4cbaa866e5b0face5a30:3377be6c3b5f688ebed687312c9b9d95'
  },
  {
    tvgId: 'TVRINasional.id',
    logo: CUSTOM_LOGOS['tvri'],
    group: 'Olahraga',
    name: 'TVRI (Piala Dunia 2026)',
    url: 'https://ott-balancer.tvri.go.id/live/eds/Nasional/hls/Nasional.m3u8',
    headers: {
      'Referer': 'https://tvri.go.id/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'TVRISport.id',
    logo: CUSTOM_LOGOS['tvrisport'],
    group: 'Olahraga',
    name: 'TVRI Sport',
    url: 'https://ott-balancer.tvri.go.id/live/eds/SportHD/hls/SportHD.m3u8',
    headers: {
      'Referer': 'https://tvri.go.id/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'SCTV.id',
    logo: CUSTOM_LOGOS['sctv'],
    group: 'Olahraga',
    name: 'SCTV Sports',
    url: 'https://d3b0v7fggu5zwm.cloudfront.net/out/v1/9e9aba7068ca4c7f8a73381bef5f8742/index.mpd',
    headers: {
      'Referer': 'https://www.visionplus.id/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G9980) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
    },
    drmKey: '93d5b9f9d5d14f15b1ba9582f332d1fc:116e4014a662fef4ea5d7671dd5120d8'
  },
  {
    tvgId: 'Indosiar.id',
    logo: CUSTOM_LOGOS['indosiar'],
    group: 'Olahraga',
    name: 'Indosiar Sports',
    url: 'https://tvratu.my.id/vid/index.mpd?id=205&type=dash',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleCoreMedia/537.36'
    },
    drmKey: '6a8b65c83036329e7185b9cd8cbdee29:0eb2beb5633f8e35cafab45af3d21de0'
  },
  {
    tvgId: 'Moji.id',
    logo: CUSTOM_LOGOS['moji'],
    group: 'Olahraga',
    name: 'Moji Sports',
    url: 'https://aspaltvpasti.top/Drmvidbos/Akun121/bosstv.m3u8?id=206'
  },
  {
    tvgId: 'beINSportsXTRA.us',
    logo: CUSTOM_LOGOS['beinsportsxtra'],
    group: 'Olahraga',
    name: 'beIN Sports XTRA',
    url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8'
  },
  {
    tvgId: 'beINSportsXTRAespanol.us',
    logo: CUSTOM_LOGOS['beinsportsxtraespanol'],
    group: 'Olahraga',
    name: 'beIN Sports XTRA Español',
    url: 'https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol.m3u8'
  },
  {
    tvgId: 'ESPN8TheOcho.us',
    logo: CUSTOM_LOGOS['espn8theocho'],
    group: 'Olahraga',
    name: 'ESPN8 The Ocho',
    url: 'https://d3b6q2ou5kp8ke.cloudfront.net/ESPNTheOcho.m3u8'
  },
  {
    tvgId: 'TraceSportStars.fr',
    logo: CUSTOM_LOGOS['tracesportstars'],
    group: 'Olahraga',
    name: 'Trace Sport Stars',
    url: 'https://lightning-tracesport-samsungau.amagi.tv/playlist.m3u8'
  },
  {
    tvgId: 'MojiProLiga.id',
    logo: CUSTOM_LOGOS['mojiproliga'],
    group: 'Olahraga',
    name: 'MOJI Pro Liga',
    url: 'http://op-group1-swiftservehd-1.dens.tv/h/h207/02.m3u8',
    headers: {
      'Referer': 'https://www.dens.tv/',
      'User-Agent': 'Mozilla'
    }
  },
  {
    tvgId: 'FIFAPlus.int',
    logo: CUSTOM_LOGOS['fifaplus'],
    group: 'Olahraga',
    name: 'FIFA+',
    url: 'https://jmp2.uk/plu-660c29b5aec9680008f5b4a4.m3u8'
  },
  {
    tvgId: 'FuboSportsNetwork.us',
    logo: CUSTOM_LOGOS['fubosports'],
    group: 'Olahraga',
    name: 'fubo Sports Network',
    url: 'https://dnf08l6u6uxnz.cloudfront.net/master.m3u8'
  },
  {
    tvgId: 'MUTV.uk',
    logo: CUSTOM_LOGOS['mutv'],
    group: 'Olahraga',
    name: 'MUTV',
    url: 'https://bcovlive-a.akamaihd.net/r2d2c4ca5bf57456fb1d16255c1a535c8/eu-west-1/6058004203001/playlist.m3u8'
  },
  {
    tvgId: 'FightNetwork.ca',
    logo: CUSTOM_LOGOS['fightnetwork'],
    group: 'Olahraga',
    name: 'Fight Network',
    url: 'https://d12a2vxqkkh1bo.cloudfront.net/hls/main.m3u8'
  },
  {
    tvgId: 'DraftKingsNetwork.us',
    logo: CUSTOM_LOGOS['draftkings'],
    group: 'Olahraga',
    name: 'DraftKings Network',
    url: 'https://na.linear.zype.com/e0bd0e23-a958-4e43-8164-4f2fef8876a8/fd3614bd-90bf-4530-a277-65ae3a1720c8-zype/live.m3u8'
  },
  {
    tvgId: 'DDSports.in',
    logo: CUSTOM_LOGOS['ddsports'],
    group: 'Olahraga',
    name: 'DD Sports',
    url: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8'
  },
  {
    tvgId: 'CazeTV.br',
    logo: CUSTOM_LOGOS['cazetv'],
    group: 'Olahraga',
    name: 'CazeTV',
    url: 'https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8'
  },
  {
    tvgId: 'MoreThanSportsTV.de',
    logo: CUSTOM_LOGOS['morethansportstv'],
    group: 'Olahraga',
    name: 'More Than Sports TV',
    url: 'https://mts1.iptv-playoutcenter.de/mts/mts-web/playlist.m3u8'
  },
  {
    tvgId: 'CBSSportsGolazo.us',
    logo: CUSTOM_LOGOS['cbsgolazo'],
    group: 'Olahraga',
    name: 'CBS Sports Golazo',
    url: 'https://proped3fhg87.airspace-cdn.cbsivideo.com/golazo-live-dai/master/golazo-live-dai.m3u8'
  },
  {
    tvgId: 'LEquipe.fr',
    logo: CUSTOM_LOGOS['lequipe'],
    group: 'Olahraga',
    name: "L'Equipe",
    url: 'https://dshn8inoshngm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-gac2i63dmu8b7/LEquipe_FR.m3u8'
  },
  {
    tvgId: 'FITE247.us',
    logo: CUSTOM_LOGOS['fite247'],
    group: 'Olahraga',
    name: 'FITE 24/7',
    url: 'https://d3d85c7qkywguj.cloudfront.net/scheduler/scheduleMaster/263.m3u8'
  },
  {
    tvgId: 'CombateGlobal.us',
    logo: CUSTOM_LOGOS['combateglobal'],
    group: 'Olahraga',
    name: 'Combate Global',
    url: 'https://stream.ads.ottera.tv/playlist.m3u8?network_id=960'
  },
  {
    tvgId: 'SPOTV.id',
    logo: CUSTOM_LOGOS['spotv'],
    group: 'Olahraga',
    name: 'SPOTV',
    url: 'http://202.80.222.20/cdn/iptv/Tvod/001/channel2000160/1024.m3u8'
  },
  {
    tvgId: 'SPOTV2.id',
    logo: CUSTOM_LOGOS['spotv2'],
    group: 'Olahraga',
    name: 'SPOTV 2',
    url: 'http://202.80.222.20/cdn/iptv/Tvod/001/channel2000138/1024.m3u8'
  },
  {
    tvgId: 'beINSports1.id',
    logo: CUSTOM_LOGOS['beinsports1'],
    group: 'Olahraga',
    name: 'beIN Sports 1',
    url: 'https://wahyu1ptv.pages.dev/AstroBein1.m3u8'
  },
  {
    tvgId: 'beINSports2.id',
    logo: CUSTOM_LOGOS['beinsports2'],
    group: 'Olahraga',
    name: 'beIN Sports 2',
    url: 'https://wahyu1ptv.pages.dev/AstroBein2.m3u8'
  },
  {
    tvgId: 'beINSports3.id',
    logo: CUSTOM_LOGOS['beinsports3'],
    group: 'Olahraga',
    name: 'beIN Sports 3',
    url: 'https://wahyu1ptv.pages.dev/AstroBein3.m3u8'
  },
  {
    tvgId: 'DAZNLaliga1.id',
    logo: CUSTOM_LOGOS['daznlaliga1'],
    group: 'Olahraga',
    name: 'DAZN LaLiga 1',
    url: 'http://013tv.com:8080/vtprotonium/CuUWPf5b7jywB68SxZ5/297787'
  },
  {
    tvgId: 'DAZNLaliga2.id',
    logo: CUSTOM_LOGOS['daznlaliga2'],
    group: 'Olahraga',
    name: 'DAZN LaLiga 2',
    url: 'http://013tv.com:8080/vtprotonium/CuUWPf5b7jywB68SxZ5/298745'
  },
  {
    tvgId: 'MovistarLaliga.id',
    logo: CUSTOM_LOGOS['movistarlaliga'],
    group: 'Olahraga',
    name: 'Movistar LaLiga',
    url: 'http://013tv.com:8080/vtprotonium/CuUWPf5b7jywB68SxZ5/302296'
  },
  {
    tvgId: 'SkySportsPremierLeague.id',
    logo: CUSTOM_LOGOS['skysportspremierleague'],
    group: 'Olahraga',
    name: 'Sky Sports Premier League',
    url: 'https://nijineh-lalajo.hf.space/watch/aHR0cHM6Ly9kb2trbzFuZXcubmV3a3NvLnJ1L2Rva2tvMS9wcmVtaXVtMTMwL21vbm8ubTN1OA==.m3u8'
  },
  {
    tvgId: 'CanalPlusPremierLeague.id',
    logo: CUSTOM_LOGOS['skysportspremierleague'],
    group: 'Olahraga',
    name: 'CANAL+ Premier League',
    url: 'http://013tv.com:8080/vtprotonium/CuUWPf5b7jywB68SxZ5/286794'
  },
  {
    tvgId: 'SkySportSerieA.id',
    logo: CUSTOM_LOGOS['skysportseriea'],
    group: 'Olahraga',
    name: 'Sky Sport Serie A',
    url: 'http://013tv.com:8080/vtprotonium/CuUWPf5b7jywB68SxZ5/2546'
  },
  {
    tvgId: 'SkySportBundesliga1.id',
    logo: CUSTOM_LOGOS['skysportbundesliga'],
    group: 'Olahraga',
    name: 'Sky Sport Bundesliga 1',
    url: 'https://wahyu1ptv.pages.dev/SkySportBundesliga1-HD.m3u8'
  },
  {
    tvgId: 'SkySportBundesliga2.id',
    logo: CUSTOM_LOGOS['skysportbundesliga'],
    group: 'Olahraga',
    name: 'Sky Sport Bundesliga 2',
    url: 'https://wahyu1ptv.pages.dev/SkySportBundesliga2-HD.m3u8'
  },
  {
    tvgId: 'ESPNPremium.id',
    logo: CUSTOM_LOGOS['espnpremium'],
    group: 'Olahraga',
    name: 'ESPN Premium',
    url: 'http://013tv.com:8080/vtprotonium/CuUWPf5b7jywB68SxZ5/298158'
  },
  {
    tvgId: 'ESPN2.id',
    logo: CUSTOM_LOGOS['espn2'],
    group: 'Olahraga',
    name: 'ESPN 2',
    url: 'http://013tv.com:8080/vtprotonium/CuUWPf5b7jywB68SxZ5/35326'
  }
];

// Helper to skip appending headers for domains that play fine without them (avoiding pipe character for OTT Player)
function shouldSkipHeadersInUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('013tv.com') ||
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
    lowerUrl.includes('203.77.246.') ||
    lowerUrl.includes('wahyu1ptv.pages.dev') ||
    lowerUrl.includes('hf.space') ||
    lowerUrl.includes('202.80.222.20')
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
  if (normalized === 'kplus') return 'kplus';
  if (normalized === 'sportstars1' || normalized === 'sportstars') return 'sportstars1';
  if (normalized === 'sportstars2') return 'sportstars2';
  if (normalized === 'sportstars3') return 'sportstars3';
  if (normalized === 'sportstars4') return 'sportstars4';
  if (normalized === 'tvrisport' || normalized === 'tvrisports') return 'tvrisport';
  if (normalized === 'sctvsports') return 'sctvsports';
  if (normalized === 'indosiarsports') return 'indosiarsports';
  if (normalized === 'mojisports') return 'mojisports';
  if (normalized === 'beinsportsxtra') return 'beinsportsxtra';
  if (normalized === 'beinsportsxtraespanol' || normalized === 'beinsportsxtraenespanol') return 'beinsportsxtraespanol';
  if (normalized === 'espn8theocho' || normalized === 'espn8') return 'espn8theocho';
  if (normalized === 'tracesportstars' || normalized === 'tracesport') return 'tracesportstars';
  if (normalized === 'mojiproliga') return 'mojiproliga';
  if (normalized === 'fifaplus' || normalized === 'fifa') return 'fifaplus';
  if (normalized === 'fubosports' || normalized === 'fubo') return 'fubosports';
  if (normalized === 'mutv') return 'mutv';
  if (normalized === 'fightnetwork') return 'fightnetwork';
  if (normalized === 'draftkings') return 'draftkings';
  if (normalized === 'ddsports') return 'ddsports';
  if (normalized === 'cazetv') return 'cazetv';
  if (normalized === 'morethansportstv') return 'morethansportstv';
  if (normalized === 'cbsgolazo' || normalized.includes('golazo')) return 'cbsgolazo';
  if (normalized === 'lequipe') return 'lequipe';
  if (normalized === 'fite247' || normalized === 'fite') return 'fite247';
  if (normalized === 'combateglobal' || normalized.includes('combate')) return 'combateglobal';
  
  if (normalized === 'spotv') return 'spotv';
  if (normalized === 'spotv2') return 'spotv2';
  if (normalized === 'beinsports1' || normalized === 'beinsport1') return 'beinsports1';
  if (normalized === 'beinsports2' || normalized === 'beinsport2') return 'beinsports2';
  if (normalized === 'beinsports3' || normalized === 'beinsport3') return 'beinsports3';
  if (normalized === 'daznlaliga1' || normalized === 'daznlaliga1hd') return 'daznlaliga1';
  if (normalized === 'daznlaliga2' || normalized === 'daznlaliga2hd') return 'daznlaliga2';
  if (normalized === 'movistarlaliga' || normalized === 'mlaliga' || normalized === 'skysportslaliga') return 'movistarlaliga';
  if (normalized === 'skysportspremierleague' || normalized === 'skysportpremierleague' || normalized === 'premierleague') return 'skysportspremierleague';
  if (normalized === 'canalpluspremierleague' || normalized === 'canalpremierleague') return 'skysportspremierleague';
  if (normalized === 'skysportseriea' || normalized === 'skysportsseriea') return 'skysportseriea';
  if (normalized === 'skysportbundesliga' || normalized === 'skysportbundesliga1' || normalized === 'skysportbundesliga2' || normalized === 'skybundesliga') return 'skysportbundesliga';
  if (normalized === 'espnpremium' || normalized === 'espnpremiuml') return 'espnpremium';
  if (normalized === 'espn2') return 'espn2';
  
  if (normalized.includes('fifaplus') || normalized.includes('fifa+')) return 'fifaplus';
  if (normalized.includes('fubosports')) return 'fubosports';
  if (normalized.includes('fightnetwork')) return 'fightnetwork';
  if (normalized.includes('draftkings')) return 'draftkings';
  if (normalized.includes('ddsports')) return 'ddsports';
  if (normalized.includes('cazetv')) return 'cazetv';
  if (normalized.includes('morethansports')) return 'morethansportstv';
  if (normalized.includes('lequipe')) return 'lequipe';
  if (normalized.includes('fite247')) return 'fite247';
  if (normalized.includes('combateglobal')) return 'combateglobal';
  
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

        // IndiHomeTV auto-inject
        if (lowerUrl.includes('indihometv.com')) {
          if (!currentHeaders['Referer']) {
            currentHeaders['Referer'] = 'https://www.indihometv.com/';
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
  // Prepend core Sports channels
  allChannels.push(...CORE_SPORTS_CHANNELS);

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
    // Bypass online check for Indonesian, Korean and Olahraga channels because they are geo-blocked on US/EU runners but work for domestic users
    const isOnline = (ch.group.startsWith('Indonesia') || ch.group === 'Korea' || ch.group === 'Olahraga') ? true : await checkStreamOnline(ch.url, ch.headers);
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
