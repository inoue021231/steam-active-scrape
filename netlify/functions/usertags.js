const axios = require("axios");
const tough = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

exports.handler = async (event, context) => {
  try {
    const gameId = event.queryStringParameters.gameId;

    if (!gameId) {
      throw new Error("gameId is NaN");
    }

    const steamUrl = `https://store.steampowered.com/app/${gameId}`;

    const cookieJar = new tough.CookieJar();

    const client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' + 
                      'AppleWebKit/537.36 (KHTML, like Gecko) ' + 
                      'Chrome/58.0.3029.110 Safari/537.3',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Referer': 'https://store.steampowered.com/',
      }
    }));

    await cookieJar.setCookie('birthtime=946652401; Path=/; Domain=.steampowered.com', steamUrl);
    await cookieJar.setCookie('lastagecheckage=1-January-2000; Path=/; Domain=.steampowered.com', steamUrl);
    await cookieJar.setCookie('wants_mature_content=1; Path=/; Domain=.steampowered.com', steamUrl);

    await cookieJar.setCookie(`wants_mature_content_apps=${gameId}; Path=/; Domain=.steampowered.com`, steamUrl);
    await cookieJar.setCookie(`recentlyVisitedAppHubs=${gameId}; Path=/; Domain=.steampowered.com`, steamUrl);

    let response = await client.get(steamUrl);
    let html = response.data;

    if (html.includes("agecheck_form")) {
      throw new Error("Age verification page detected even after setting cookies.");
    }

    if (html.includes("wants_mature_content")) {
      throw new Error("Mature content verification required even after setting cookies.");
    }

    const tagsRegex = /<div[^>]*class="glance_tags popular_tags"[^>]*>([\s\S]*?)<\/div>/;
    const anchorContentRegex = /<a[^>]*>([\s\S]*?)<\/a>/g;

    const tagsMatch = html.match(tagsRegex);
    if (!tagsMatch) {
      throw new Error("No tags div found");
    }
    
    const tagsHtml = tagsMatch[1].trim();

    const anchorMatches = Array.from(tagsHtml.matchAll(anchorContentRegex), match => match[1].trim());

    const extractSeries = (html) => {
      const seriesRegex = /<div[^>]*class="dev_row"[^>]*>\s*<b>シリーズ:<\/b>\s*<a[^>]*>([^<]+)<\/a>\s*<\/div>/i;
      const match = html.match(seriesRegex);
      if (match && match[1]) {
        return match[1].trim();
      }
      return "";
    };

    const series = extractSeries(html);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: anchorMatches,
        series: series
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`,
    };
  }
};
