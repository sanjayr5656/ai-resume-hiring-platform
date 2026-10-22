const axios = require('axios');

async function test(username) {
  console.log(`\nTesting user: ${username}`);
  try {
    const res = await axios.get(`https://www.codechef.com/users/${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
      timeout: 10000,
    });
    console.log('Status:', res.status, 'HTML length:', res.data.length);
    const html = res.data;

    // Check if redirected to home
    if (html.includes('<title>Competitive Programming | CodeChef</title>') && !html.includes(username)) {
      console.log('Redirected to CodeChef homepage (user not found or blocked)');
      return;
    }

    const ratingMatch = html.match(/class="rating"[^>]*>(\d+)/i) || html.match(/(\d+)<\/div>\s*<div class="rating-title"/i);
    console.log('Rating match:', ratingMatch ? ratingMatch[1] : null);

    const maxRatingMatch = html.match(/highest-rating[^>]*>\s*\(?(\d+)/i) || html.match(/Highest Rating\s*(\d+)/i);
    console.log('Max Rating match:', maxRatingMatch ? maxRatingMatch[1] : null);

    const starsMatch = html.match(/(\d+)\s*★/i) || html.match(/rating-star[^>]*>(\d+)/i);
    console.log('Stars match:', starsMatch ? starsMatch[1] : null);

    const solvedMatch = html.match(/Total Problems Solved:\s*(\d+)/i) || html.match(/<h3>\s*Total Problems Solved:\s*(\d+)\s*<\/h3>/i) || html.match(/problems-solved[^>]*>.*?(\d+)/is);
    console.log('Solved match:', solvedMatch ? solvedMatch[1] : null);

    const globalRankMatch = html.match(/Global Rank[^>]*>.*?(\d+)/is) || html.match(/global-rank[^>]*>.*?(\d+)/is);
    console.log('Global rank:', globalRankMatch ? globalRankMatch[1] : null);
  } catch (err) {
    console.error('Error fetching HTML:', err.message);
  }
}

async function run() {
  await test('tourist');
  await test('sanjaysathya2007');
}

run();
