const axios = require("axios");
const tough = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

exports.handler = async (event, context) => {
  try {
    const gameId = event.queryStringParameters.gameId;

    if (!gameId) {
      throw new Error("gameId is NaN");
    }

    const steamUrl = `https://steamcommunity.com/app/${gameId}`;

    const cookieJar = new tough.CookieJar();

    const client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' + 
                      'AppleWebKit/537.36 (KHTML, like Gecko) ' + 
                      'Chrome/58.0.3029.110 Safari/537.3',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://steamcommunity.com/',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }));

    await cookieJar.setCookie('birthtime=946652401; Path=/; Domain=.steamcommunity.com', steamUrl);
    await cookieJar.setCookie('lastagecheckage=1-January-2000; Path=/; Domain=.steamcommunity.com', steamUrl);
    await cookieJar.setCookie('wants_mature_content=1; Path=/; Domain=.steamcommunity.com', steamUrl);

    let response = await client.get(steamUrl);
    let html = response.data;

    if (html.includes("agecheck_form")) {
      throw new Error("Age verification page detected even after setting cookies.");
    }

    const activeUserRegex = /<span class="apphub_NumInApp">([\s\S]*?)<\/span>/;
    const activeUserMatch = html.match(activeUserRegex);
    if (!activeUserMatch || !activeUserMatch[1]) {
      throw new Error("No user found");
    }
    const activeUserCount = parseInt(activeUserMatch[1].trim().replace(" In-Game", "").replace(/,/g, ""), 10);

    const activeChatRegex = /<span class="apphub_Chat apphub_ResponsiveMenuItem">([\s\S]*?)<a href/;
    const activeChatMatch = html.match(activeChatRegex);
    if (!activeChatMatch || !activeChatMatch[1]) {
      throw new Error("No chat found");
    }
    const activeChatCount = parseInt(activeChatMatch[1].trim().replace(" in", "").replace(/,/g, ""), 10);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userCount: activeUserCount,
        chatCount: activeChatCount
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`,
    };
  }
};
