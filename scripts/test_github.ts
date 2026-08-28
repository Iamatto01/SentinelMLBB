import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { listUserRepositories, explainRepositoryWithHirara } from '../src/lib/github';

async function testGitHub() {
  console.log('🐙 Testing GitHub Repository Listing...');
  const repos = await listUserRepositories('Iamatto01');
  console.log(`Found ${repos.length} repositories:`);
  repos.forEach((r) => console.log(`- ${r.name} (${r.language}) ⭐${r.stars}: ${r.description}`));

  if (repos.length > 0) {
    const testRepo = repos[0].name;
    console.log(`\n🧠 Testing Hirara AI Explanation on "${testRepo}"...`);
    const explanation = await explainRepositoryWithHirara(testRepo, undefined, 'Iamatto01', 'awak_saya');
    console.log('\n--- HIRARA EXPLANATION ---');
    console.log(explanation);
    console.log('--------------------------\n');
  }
}

testGitHub().catch(console.error);
