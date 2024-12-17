const axios = require("axios");
const tough = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const cheerio = require("cheerio");

exports.handler = async (event, context) => {
  try {
    const gameId = event.queryStringParameters.gameId;

    if (!gameId) {
      throw new Error("gameIdが提供されていません。");
    }

    const steamUrl = `https://store.steampowered.com/recommended/morelike/app/${gameId}/`;

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

    // Cookieの設定を維持
    await cookieJar.setCookie('birthtime=946652401; Path=/; Domain=.steampowered.com', steamUrl);
    await cookieJar.setCookie('lastagecheckage=1-January-2000; Path=/; Domain=.steampowered.com', steamUrl);
    await cookieJar.setCookie('wants_mature_content=1; Path=/; Domain=.steampowered.com', steamUrl);

    await cookieJar.setCookie(`wants_mature_content_apps=${gameId}; Path=/; Domain=.steampowered.com`, steamUrl);
    await cookieJar.setCookie(`recentlyVisitedAppHubs=${gameId}; Path=/; Domain=.steampowered.com`, steamUrl);

    // GETリクエストを送信
    const response = await client.get(steamUrl);
    const html = response.data;

    if (html.includes("agecheck_form")) {
      throw new Error("クッキーを設定したにも関わらず、年齢確認ページが表示されました。");
    }

    if (html.includes("wants_mature_content")) {
      throw new Error("Mature content verification required even after setting cookies.");
    }

    const $ = cheerio.load(html);

    const sectionIds = ["released", "comingsoon", "freegames3", "demogames3", "newreleases", "topselling"];

    const data = {};

    sectionIds.forEach((sectionId) => {
      const sectionDiv = $(`#${sectionId}`);

      if (sectionDiv.length === 0) {
        console.warn(`指定されたセクションID "${sectionId}" が見つかりませんでした。`);
        return;
      }

      const gameIds = [];
      sectionDiv.find('div.similar_grid_item a[data-ds-appid]').each((i, elem) => {
        const appId = $(elem).attr('data-ds-appid');
        if (appId) {
          gameIds.push(appId);
        }
      });

      if (gameIds.length === 0) {
        console.warn(`指定されたセクションID "${sectionId}" 内にゲームIDが見つかりませんでした。`);
        return;
      }

      const uniqueGameIds = [...new Set(gameIds)];
      data[sectionId] = uniqueGameIds;
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameId,
        similarGames: data
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `エラー: ${error.message}`,
    };
  }
};
