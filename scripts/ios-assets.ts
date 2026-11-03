import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { demoSchedule } from '../src/lib/demo';
const root = 'ios/OpenSync';
await mkdir(`${root}/Assets.xcassets/AppIcon.appiconset`, { recursive: true });
await writeFile(`${root}/demo.json`, JSON.stringify(demoSchedule, null, 2) + '\n');
await writeFile(
  `${root}/Assets.xcassets/Contents.json`,
  JSON.stringify({ info: { author: 'xcode', version: 1 } }),
);
await writeFile(
  `${root}/Assets.xcassets/AppIcon.appiconset/Contents.json`,
  JSON.stringify(
    {
      images: [{ filename: 'AppIcon.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
      info: { author: 'xcode', version: 1 },
    },
    null,
    2,
  ),
);
await sharp('public/icon.svg', { density: 1152 })
  .resize(1024, 1024)
  .flatten({ background: '#5155d9' })
  .png()
  .toFile(`${root}/Assets.xcassets/AppIcon.appiconset/AppIcon.png`);
console.log('Generated native icon and shared demo schedule.');
