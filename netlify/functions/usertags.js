const axios = require("axios");

exports.handler = async (event, context) => {
  try {
    const gameId = event.queryStringParameters.gameId;
    
    if (!gameId) {
      throw new Error("gameId is NaN");
    }

    const steamUrl = `https://store.steampowered.com/app/${gameId}`;
    const response = await axios.get(steamUrl, {
      headers: {
        "Accept-Language": "ja"
      }
    });

    let html = response.data;

    const tagsRegex = /<div[^>]*class="glance_tags popular_tags"[^>]*>([\s\S]*?)<\/div>/;
    const anchorContentRegex = /<a[^>]*>([\s\S]*?)<\/a>/g;

    const tagsMatch = html.match(tagsRegex);
    if (!tagsMatch) {
      throw new Error("No tags div found");
    }
    
    const tagsHtml = tagsMatch[1].trim();

    const anchorMatches = Array.from(tagsHtml.matchAll(anchorContentRegex), match => match[1].trim());

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tags: anchorMatches
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`,
    };
  }
};
