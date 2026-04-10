const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'PayrollPage.js');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Find the first occurrence of "export default PayrollPage;" and keep only up to that line
const exportIndex = content.indexOf('export default PayrollPage;');
if (exportIndex !== -1) {
  // Keep content up to and including the export statement
  content = content.substring(0, exportIndex + 'export default PayrollPage;'.length);
  
  // Add a newline at the end
  content = content + '\n';
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('File truncated successfully!');
} else {
  console.log('Export statement not found');
}
