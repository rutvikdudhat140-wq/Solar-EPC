const fs = require('fs');
const path = require('path');

// Files with remaining issues
const filesToFix = [
  'frontend/src/components/ProposalCanvasEditor.js',
  'frontend/src/components/dashboards/DesignEngineerDashboard.js',
  'frontend/src/components/dashboard/LeadAnalyticsDashboard.js',
  'frontend/src/components/dashboards/ProcurementOfficerDashboard.js',
  'frontend/src/components/dashboards/SurveyEngineerDashboard.js',
  'frontend/src/components/dashboards/ServiceManagerDashboard.js',
  'frontend/src/components/dashboards/StoreManagerDashboard.js',
  'frontend/src/components/dashboards/TechnicianDashboard.js',
  'frontend/src/components/documents/PDFTemplateCustomizer.js',
];

// Replacement patterns for specific garbled characters
const patterns = [
  // Phone icon
  { from: /Ã°Å¸"Å¾/g, to: '📞' },
  // Email icon 
  { from: /aÅ“"°Ã¯¸/g, to: '✉️' },
  // Website icon
  { from: /Ã°Å¸Å’/g, to: '🌐' },
  // X/multiplication sign
  { from: /Ãƒ""|ÃƒÂ—/g, to: 'x' },
  // Bullet points
  { from: /Ã‚/g, to: '•' },
  // Other common patterns
  { from: /â”€/g, to: '-' },
  { from: /â•/g, to: '=' },
  { from: /âœ“/g, to: '✓' },
  { from: /âš¡/g, to: '⚡' },
  { from: /âš /g, to: '⚠' },
  { from: /â„¹/g, to: 'i' },
];

console.log('Fixing remaining encoding issues...\n');

let totalFixed = 0;

for (const file of filesToFix) {
  const fullPath = path.join(__dirname, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Not found: ${file}`);
    continue;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;
    let fileFixed = 0;

    for (const { from, to } of patterns) {
      const matches = content.match(from);
      if (matches) {
        fileFixed += matches.length;
        content = content.replace(from, to);
      }
    }

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${fileFixed} issues in ${file}`);
      totalFixed += fileFixed;
    } else {
      console.log(`✓ Clean: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error in ${file}: ${err.message}`);
  }
}

console.log(`\n🎉 Done! Fixed ${totalFixed} issues.`);
