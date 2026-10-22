const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('scripts/bright_vibe_09.html', 'utf8');
const $ = cheerio.load(html);

console.log('Title:', $('title').text());
console.log('rating-number:', $('.rating-number').text().trim());
console.log('rating class:', $('.rating').text().trim());
console.log('rating-ranks:', $('.rating-ranks').text().trim().replace(/\s+/g, ' '));
console.log('highest rating:', $('.rating-header small').text().trim());
console.log('problems solved header:', $('h3:contains("Total Problems Solved")').text().trim());
console.log('h3 list:', $('h3').map((i, el) => $(el).text().trim()).get());
console.log('rating stars:', $('.rating-star').text().trim() || $('.rating-star span').length);
