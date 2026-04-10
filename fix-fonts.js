const fs = require('fs');
const path = require('path');

// Common encoding corruption patterns and their fixes
const encodingFixes = [
  // Arrows
  { pattern: /â†‘/g, replacement: '↑' },
  { pattern: /â†“/g, replacement: '↓' },
  { pattern: /â†’/g, replacement: '→' },
  { pattern: /â†/g, replacement: '←' },
  { pattern: /â†•/g, replacement: '↕' },
  { pattern: /â‡‘/g, replacement: '⇑' },
  { pattern: /â‡“/g, replacement: '⇓' },
  { pattern: /â‡’/g, replacement: '⇒' },

  // Currency
  { pattern: /â‚¹/g, replacement: '₹' },
  { pattern: /â‚¬/g, replacement: '€' },
  { pattern: /Â£/g, replacement: '£' },
  { pattern: /Â¥/g, replacement: '¥' },

  // Quotes and dashes
  { pattern: /â€œ/g, replacement: '"' },
  { pattern: /â€/g, replacement: '"' },
  { pattern: /â€˜/g, replacement: "'" },
  { pattern: /â€™/g, replacement: "'" },
  { pattern: /â€"/g, replacement: '—' },
  { pattern: /â€"/g, replacement: '–' },
  { pattern: /â€¦/g, replacement: '…' },

  // Mathematical symbols
  { pattern: /Ã—/g, replacement: '×' },
  { pattern: /Ã·/g, replacement: '÷' },
  { pattern: /Â±/g, replacement: '±' },
  { pattern: /âˆž/g, replacement: '∞' },
  { pattern: /âˆš/g, replacement: '√' },
  { pattern: /âˆ‘/g, replacement: '∑' },
  { pattern: /âˆ’/g, replacement: '−' },
  { pattern: /âˆ«/g, replacement: '∫' },

  // Common accented characters
  { pattern: /Ã©/g, replacement: 'é' },
  { pattern: /Ã¨/g, replacement: 'è' },
  { pattern: /Ãª/g, replacement: 'ê' },
  { pattern: /Ã /g, replacement: 'à' },
  { pattern: /Ã¡/g, replacement: 'á' },
  { pattern: /Ã¢/g, replacement: 'â' },
  { pattern: /Ã£/g, replacement: 'ã' },
  { pattern: /Ã¤/g, replacement: 'ä' },
  { pattern: /Ã¥/g, replacement: 'å' },
  { pattern: /Ã§/g, replacement: 'ç' },
  { pattern: /Ã±/g, replacement: 'ñ' },
  { pattern: /Ã´/g, replacement: 'ô' },
  { pattern: /Ã¶/g, replacement: 'ö' },
  { pattern: /Ã¸/g, replacement: 'ø' },
  { pattern: /Ã¹/g, replacement: 'ù' },
  { pattern: /Ãº/g, replacement: 'ú' },
  { pattern: /Ã»/g, replacement: 'û' },
  { pattern: /Ã¼/g, replacement: 'ü' },
  { pattern: /Ã½/g, replacement: 'ý' },
  { pattern: /Ã¿/g, replacement: 'ÿ' },

  // Special characters that appear in garbled form
  { pattern: /ï¿½/g, replacement: '' },
  { pattern: /Â /g, replacement: ' ' },
  { pattern: /Â¢/g, replacement: '¢' },
  { pattern: /Â¦/g, replacement: '¦' },
  { pattern: /Â¨/g, replacement: '¨' },
  { pattern: /Â´/g, replacement: '´' },
  { pattern: /Â¸/g, replacement: '¸' },
  { pattern: /Âº/g, replacement: 'º' },
  { pattern: /Â»/g, replacement: '»' },
  { pattern: /Â¼/g, replacement: '¼' },
  { pattern: /Â½/g, replacement: '½' },
  { pattern: /Â¾/g, replacement: '¾' },
  { pattern: /Â¿/g, replacement: '¿' },

  // Degree and other symbols
  { pattern: /Â°/g, replacement: '°' },
  { pattern: /Âµ/g, replacement: 'µ' },
  { pattern: /Â¶/g, replacement: '¶' },
  { pattern: /Â·/g, replacement: '·' },
  { pattern: /Â¸/g, replacement: '¸' },
  { pattern: /Â¹/g, replacement: '¹' },
  { pattern: /Â²/g, replacement: '²' },
  { pattern: /Â³/g, replacement: '³' },
  { pattern: /Âª/g, replacement: 'ª' },
  { pattern: /Âº/g, replacement: 'º' },

  // Complex garbled patterns seen in DocumentPage.js
  { pattern: /â€™/g, replacement: "'" },
  { pattern: /â€"/g, replacement: '-' },
  { pattern: /â€“/g, replacement: '–' },
  { pattern: /â€”/g, replacement: '—' },
  { pattern: /â€¦/g, replacement: '…' },
  { pattern: /â€¢/g, replacement: '•' },
  { pattern: /â„¢/g, replacement: '™' },
  { pattern: /Â©/g, replacement: '©' },
  { pattern: /Â®/g, replacement: '®' },
  { pattern: /Â§/g, replacement: '§' },

  // Clean up any remaining isolated Â characters
  { pattern: /Â([a-zA-Z])/g, replacement: '$1' },
];

// Files to fix (most commonly affected)
const filesToFix = [
  'src/pages/DocumentPage.js',
  'src/components/dashboards/AdminDashboard.js',
  'src/components/Layout.js',
  'src/components/dashboards/SalesDashboard.js',
  'src/components/ProposalCanvasEditor.js',
  'src/components/CreateReminderModal.js',
  'src/pages/SettingsPage.js',
  'src/components/dashboard/LeadAnalyticsDashboard.js',
  'src/components/dashboards/FinanceDashboard.js',
  'src/components/documents/PDFTemplateCustomizer.js',
  'src/pages/SiteSurveyPage.js',
  'src/pages/InventoryPage.js',
  'src/components/dashboards/ServiceManagerDashboard.js',
  'src/components/dashboards/SurveyEngineerDashboard.js',
  'src/components/dashboards/TechnicianDashboard.js',
  'src/components/ui/Toast.js',
  'src/pages/CRMPage.backup.js',
  'src/pages/CRMPage.js',
  'src/pages/DesignPage.js',
  'src/pages/FinancePage.js',
];

function fixFile(filePath) {
  try {
    const fullPath = path.join(__dirname, 'frontend', filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    let fixCount = 0;

    encodingFixes.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        fixCount += matches.length;
        content = content.replace(pattern, replacement);
      }
    });

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${fixCount} issues in: ${filePath}`);
    } else {
      console.log(`✓ No issues found in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Starting font encoding fix...\n');

filesToFix.forEach(fixFile);

console.log('\n🎉 Font fix complete!');
