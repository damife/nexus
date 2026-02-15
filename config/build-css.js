import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../assets/css/tailwind.css');
const outputFile = path.join(__dirname, '../assets/css/root.css');

console.log('🎨 Building Tailwind CSS...');
console.log(`   Input:  ${inputFile}`);
console.log(`   Output: ${outputFile}`);

fs.readFile(inputFile, 'utf8', (err, css) => {
  if (err) {
    console.error('❌ Error reading input file:', err);
    process.exit(1);
  }

  postcss([tailwindcss, autoprefixer])
    .process(css, { from: inputFile, to: outputFile })
    .then(result => {
      fs.writeFile(outputFile, result.css, (err) => {
        if (err) {
          console.error('❌ Error writing output file:', err);
          process.exit(1);
        }
        if (result.map) {
          fs.writeFile(outputFile + '.map', result.map.toString(), () => {});
        }
        console.log('✅ Tailwind CSS built successfully!');
        console.log(`   Size: ${(result.css.length / 1024).toFixed(2)} KB`);
      });
    })
    .catch(err => {
      console.error('❌ Error processing CSS:', err);
      process.exit(1);
    });
});
