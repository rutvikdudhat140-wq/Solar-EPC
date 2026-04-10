const fs = require('fs');
const path = require('path');

// Find all JS/JSX files recursively
function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules')) {
      getAllFiles(fullPath, files);
    } else if (/\.(js|jsx)$/.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Comprehensive replacements
const replacements = [
  // Arrows
  { from: /â†‘/g, to: '↑' },
  { from: /â†“/g, to: '↓' },
  { from: /â†’/g, to: '→' },
  { from: /â†/g, to: '←' },
  
  // Currency
  { from: /â‚¹/g, to: '₹' },
  { from: /â‚¬/g, to: '€' },
  
  // Quotes and punctuation
  { from: /â€œ/g, to: '"' },
  { from: /â€/g, to: '"' },
  { from: /â€™/g, to: "'" },
  { from: /â€˜/g, to: "'" },
  { from: /â€"/g, to: '—' },
  { from: /â€“/g, to: '–' },
  { from: /â€¦/g, to: '…' },
  { from: /â€¢/g, to: '•' },
  
  // Math symbols
  { from: /Ã—/g, to: '×' },
  { from: /Ã·/g, to: '÷' },
  { from: /Â±/g, to: '±' },
  { from: /âˆž/g, to: '∞' },
  { from: /âˆš/g, to: '√' },
  { from: /âˆ‘/g, to: '∑' },
  { from: /âˆ’/g, to: '−' },
  { from: /âˆ«/g, to: '∫' },
  
  // Special symbols
  { from: /â„¢/g, to: '™' },
  { from: /Â©/g, to: '©' },
  { from: /Â®/g, to: '®' },
  { from: /Â§/g, to: '§' },
  { from: /Â°/g, to: '°' },
  { from: /Âµ/g, to: 'µ' },
  { from: /Â¶/g, to: '¶' },
  { from: /Â·/g, to: '·' },
  { from: /Â¹/g, to: '¹' },
  { from: /Â²/g, to: '²' },
  { from: /Â³/g, to: '³' },
  { from: /Âª/g, to: 'ª' },
  { from: /Âº/g, to: 'º' },
  { from: /Â¼/g, to: '¼' },
  { from: /Â½/g, to: '½' },
  { from: /Â¾/g, to: '¾' },
  { from: /Â¿/g, to: '¿' },
  
  // Accented chars
  { from: /Ã©/g, to: 'é' },
  { from: /Ã¨/g, to: 'è' },
  { from: /Ãª/g, to: 'ê' },
  { from: /Ã /g, to: 'à' },
  { from: /Ã¡/g, to: 'á' },
  { from: /Ã¢/g, to: 'â' },
  { from: /Ã£/g, to: 'ã' },
  { from: /Ã¤/g, to: 'ä' },
  { from: /Ã¥/g, to: 'å' },
  { from: /Ã§/g, to: 'ç' },
  { from: /Ã±/g, to: 'ñ' },
  { from: /Ã´/g, to: 'ô' },
  { from: /Ã¶/g, to: 'ö' },
  { from: /Ã¸/g, to: 'ø' },
  { from: /Ã¹/g, to: 'ù' },
  { from: /Ãº/g, to: 'ú' },
  { from: /Ã»/g, to: 'û' },
  { from: /Ã¼/g, to: 'ü' },
  { from: /Ã½/g, to: 'ý' },
  { from: /Ã¿/g, to: 'ÿ' },
  
  // Clean up isolated bad chars
  { from: /Â¢/g, to: '' },
  { from: /Â¦/g, to: '' },
  { from: /Â¨/g, to: '' },
  { from: /Â´/g, to: '' },
  { from: /Â¸/g, to: '' },
  { from: /Â»/g, to: '' },
  
  // Complex patterns
  { from: /ï¿½/g, to: '' },
  { from: /Æ’/g, to: 'f' },
  { from: /â€™/g, to: "'" },
  
  // Remove isolated Â
  { from: /Â(?![a-zA-Z])/g, to: '' },
];

console.log('🔧 Scanning entire src folder...\n');

const srcDir = path.join(__dirname, 'frontend', 'src');
const allFiles = getAllFiles(srcDir);

let totalFiles = 0;
let totalIssues = 0;

for (const file of allFiles) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    let count = 0;

    for (const { from, to } of replacements) {
      const matches = content.match(from);
      if (matches) {
        count += matches.length;
        content = content.replace(from, to);
      }
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      const relPath = path.relative(__dirname, file);
      console.log(`✅ Fixed ${count} issues in ${relPath}`);
      totalFiles++;
      totalIssues += count;
    }
  } catch (err) {
    console.error(`❌ Error: ${file}: ${err.message}`);
  }
}

console.log(`\n🎉 Done! Fixed ${totalIssues} issues in ${totalFiles} files.`);
