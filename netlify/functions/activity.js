const axios = require("axios");

exports.handler = async (event, context) => {

  try {
    const gameId = event.queryStringParameters.gameId;
    
    if(!gameId) {
      throw new Error("gameId is NaN");
    }

    const steamUrl = `https://steamcommunity.com/app/${gameId}`;
    const response = await axios.get(steamUrl);

    let html = response.data;

    const activeUserRegex = /<span class="apphub_NumInApp">([\s\S]*?)<\/span>/;

    const activeUserMatch = parseInt(html.match(activeUserRegex)[1].trim().replace(" In-Game","").replace(/,/g, ""), 10);

    if(!activeUserMatch) {
      throw new Error("No user found");
    }

    const activeChatRegex = /<span class="apphub_Chat apphub_ResponsiveMenuItem">([\s\S]*?)<a href/;

    const activeChatMatch = parseInt(html.match(activeChatRegex)[1].trim().replace(" in","").replace(/,/g, ""), 10);

    if(!activeChatMatch) {
      throw new Error("No chat found");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userCount: activeUserMatch,
        chatCount: activeChatMatch
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`,
    };
  }
};
