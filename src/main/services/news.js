const Parser = require('rss-parser');

const parser = new Parser();

const RSS_URL = 'https://news.google.com/rss/search?q=AI%20LLM%20when%3A7d&hl=en-US&gl=US&ceid=US:en';

async function getNewsItems() {
  try {
    const feed = await parser.parseURL(RSS_URL);
    const items = (feed.items || []).slice(0, 5).map((item) => ({
      title: item.title,
      link: item.link,
      source: item.creator || item.source || 'Google News',
      pubDate: item.isoDate || item.pubDate || null,
    }));

    return { status: 'ok', items };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

module.exports = {
  getNewsItems,
};
