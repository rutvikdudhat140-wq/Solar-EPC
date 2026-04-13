const fs = require('fs');
const path = require('path');

// Files with encoding issues
const files = [
  'frontend/src/pages/DocumentPage.js',
  'frontend/src/components/dashboards/AdminDashboard.js',
  'frontend/src/components/Layout.js',
  'frontend/src/components/dashboards/SalesDashboard.js',
  'frontend/src/pages/ServicePage.js',
  'frontend/src/pages/ServiceDashboardPage.js',
  'frontend/src/components/dashboards/ServiceManagerDashboard.js',
  'frontend/src/components/dashboards/TechnicianDashboard.js',
  'frontend/src/pages/DashboardNew.jsx',
  'frontend/src/pages/SolarOSDashboard.jsx',
  'frontend/src/pages/TeamManagementPage.js',
  'frontend/src/services/dashboardApi.js',
  'frontend/src/components/CreateReminderModal.js',
  'frontend/src/components/dashboard/LeadAnalyticsDashboard.js',
  'frontend/src/components/dashboards/FinanceDashboard.js',
  'frontend/src/pages/CRMPage.js',
  'frontend/src/pages/CRMPage.backup.js',
  'frontend/src/pages/DesignPage.js',
  'frontend/src/pages/FinancePage.js',
  'frontend/src/pages/SettingsPage.js',
  'frontend/src/pages/SiteSurveyPage.js',
  'frontend/src/pages/InventoryPage.js',
  'frontend/src/components/ProposalCanvasEditor.js',
  'frontend/src/components/documents/PDFTemplateCustomizer.js',
  'frontend/src/pages/CommissioningPage.js',
  'frontend/src/pages/InstallationPage.js',
  'frontend/src/pages/ProjectPage.js',
  'frontend/src/components/ui/Toast.js',
  'frontend/src/components/ui/ImportExport.jsx',
  'frontend/src/pages/EstimatePage.js',
  'frontend/src/pages/DocumentsPage.js',
  'frontend/src/pages/ItemsPage.js',
  'frontend/src/pages/UsersPage.js',
  'frontend/src/pages/AttendancePageV3.js',
  'frontend/src/pages/HRMPage.js',
  'frontend/src/pages/CompliancePage.js',
];

// Simple replacements for common patterns
const replacements = [
  { from: /â†‘/g, to: '↑' },
  { from: /â†“/g, to: '↓' },
  { from: /â‚¹/g, to: '₹' },
  { from: /â€œ/g, to: '"' },
  { from: /â€/g, to: '"' },
  { from: /â€™/g, to: "'" },
  { from: /â€“/g, to: '-' },
  { from: /â€”/g, to: '--' },
  { from: /â€¦/g, to: '...' },
  { from: /â€¢/g, to: '*' },
  { from: /â„¢/g, to: '(TM)' },
  { from: /Â©/g, to: '(C)' },
  { from: /Â®/g, to: '(R)' },
  { from: /Â§/g, to: '§' },
  { from: /Â°/g, to: '°' },
  { from: /Âµ/g, to: 'u' },
  { from: /Â¶/g, to: 'P' },
  { from: /Â·/g, to: '.' },
  { from: /Â¹/g, to: '1' },
  { from: /Â²/g, to: '2' },
  { from: /Â³/g, to: '3' },
  { from: /Âª/g, to: 'a' },
  { from: /Âº/g, to: 'o' },
  { from: /Â/g, to: '' },
  { from: /Ã—/g, to: 'x' },
  { from: /Ã·/g, to: '/' },
  { from: /Â±/g, to: '+/-' },
  { from: /âˆž/g, to: '∞' },
  { from: /âˆš/g, to: 'sqrt' },
  { from: /âˆ‘/g, to: 'sum' },
  { from: /âˆ’/g, to: '-' },
  { from: /âˆ«/g, to: 'int' },
  { from: /Ã©/g, to: 'e' },
  { from: /Ã¨/g, to: 'e' },
  { from: /Ãª/g, to: 'e' },
  { from: /Ã /g, to: 'a' },
  { from: /Ã¡/g, to: 'a' },
  { from: /Ã¢/g, to: 'a' },
  { from: /Ã£/g, to: 'a' },
  { from: /Ã¤/g, to: 'a' },
  { from: /Ã¥/g, to: 'a' },
  { from: /Ã§/g, to: 'c' },
  { from: /Ã±/g, to: 'n' },
  { from: /Ã´/g, to: 'o' },
  { from: /Ã¶/g, to: 'o' },
  { from: /Ã¸/g, to: 'o' },
  { from: /Ã¹/g, to: 'u' },
  { from: /Ãº/g, to: 'u' },
  { from: /Ã»/g, to: 'u' },
  { from: /Ã¼/g, to: 'u' },
  { from: /Ã½/g, to: 'y' },
  { from: /Ã¿/g, to: 'y' },
  { from: /ï¿½/g, to: '' },
  { from: /Æ’/g, to: 'f' },
  { from: /â€™/g, to: "'" },
];

console.log('🔧 Fixing font encoding issues...\n');

files.forEach(file => {
  const fullPath = path.join(__dirname, file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Not found: ${file}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;
    let count = 0;

    replacements.forEach(({ from, to }) => {
      const matches = content.match(from);
      if (matches) {
        count += matches.length;
        content = content.replace(from, to);
      }
    });

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${count} issues in ${file}`);
    } else {
      console.log(`✓ Clean: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error in ${file}: ${err.message}`);
  }
});

console.log('\n🎉 Done!');
