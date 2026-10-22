require('dotenv').config();
const mongoose = require('mongoose');
const UserProfile = require('../models/UserProfile');
const { fetchCodeChef } = require('../services/codingPlatforms/codechef');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const fresh = await fetchCodeChef('bright_vibe_09');
  await UserProfile.updateOne(
    { 'platformLinks.username': 'bright_vibe_09', 'platformLinks.platform': 'codechef' },
    { $set: { 'codingStats.$[elem]': fresh } },
    { arrayFilters: [{ 'elem.platform': 'codechef' }] }
  );
  console.log('UserProfile updated successfully for bright_vibe_09:', fresh);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
