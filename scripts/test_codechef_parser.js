const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scripts/bright_vibe_09.html', 'utf8');

function parseCodeChef(html) {
  const $ = cheerio.load(html);

  // 1. Rating
  const ratingText = $('.rating-number').first().text().trim();
  const rating = Number(ratingText.replace(/[^0-9]/g, '')) || null;

  // 2. Highest Rating
  const maxText = $('.rating-header small').text().trim();
  const maxRating = Number(maxText.replace(/[^0-9]/g, '')) || rating;

  // 3. Total Solved
  const solvedH3 = $('h3:contains("Total Problems Solved")').first().text().trim();
  const totalSolved = Number(solvedH3.replace(/[^0-9]/g, '')) || null;

  // 4. Global Rank
  const rankText = $('.rating-ranks a strong').first().text().trim();
  const rank = Number(rankText.replace(/[^0-9]/g, '')) || null;

  // 5. Contests Attended
  const contestH3 = $('h3:contains("Contests")').first().text().trim();
  const contestsAttended = Number(contestH3.replace(/[^0-9]/g, '')) || null;

  // 6. Stars
  const starsCount = $('.rating-star span').length || (html.match(/★/g) || []).length || null;
  const stars = starsCount > 0 && starsCount <= 7 ? starsCount : null;

  return { rating, maxRating, totalSolved, rank, contestsAttended, stars };
}

console.log('Parsed CodeChef Data:', parseCodeChef(html));
