const fs = require('fs');
fetch('https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api/mlbb/heroes')
  .then(r => r.json())
  .then(d => {
    const records = d.data.records;
    let content = fs.readFileSync('src/data/heroes-data.ts', 'utf-8');
    records.forEach(r => {
      const mlbbId = r.data.hero_id;
      const name = r.data.hero.data.name;
      // find the name in content
      const regex = new RegExp('name:\\s*"' + name + '"', 'i');
      if (regex.test(content)) {
        content = content.replace(regex, 'name: "' + name + '",\n    mlbbId: ' + mlbbId);
      }
    });
    fs.writeFileSync('src/data/heroes-data.ts', content);
    console.log('Updated heroes-data.ts');
  });
