const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/SiteSurveyPage.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Count occurrences before
const beforeCount = (content.match(/�/g) || []).length;
console.log(`Found ${beforeCount} instances of � before fixing`);

// Fix patterns
// 1. �’ as placeholder -> '-'
content = content.replace(/�’/g, '-');

// 2. �’�’ as comment separators -> '=========='
content = content.replace(/�’�’/g, '==========');

// 3. �’�¡· -> '·'
content = content.replace(/�’�¡·/g, '·');

// 4. �’�¢ -> '→'
content = content.replace(/�’�¢/g, '→');

// 5. �’Select Engineer �’ -> '→ Select Engineer →'
content = content.replace(/�’Select Engineer �’/g, '→ Select Engineer →');

// 6. �’Make changes -> 'Make changes' (remove the corrupted character)
content = content.replace(/�’Make changes/g, 'Make changes');

// 7. �’�¡ -> '°' (degree symbol)
content = content.replace(/�’�¡/g, '°');

// Count occurrences after
const afterCount = (content.match(/�/g) || []).length;
console.log(`Found ${afterCount} instances of � after fixing`);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log(`Fixed ${beforeCount - afterCount} instances`);