const fs = require('fs');
const path = require('path');

const pagesDir = 'frontend/src/pages';

// Read all files
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Fix 1: API_BASE_URL with double single quotes
  content = content.replace(
    /const API_BASE_URL = process\.env\.REACT_APP_API_BASE_URL \|\| ''http:\/\/localhost:3001\/api\/v1;?/g,
    "const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';"
  );

  // Fix 2: Empty useState values
  content = content.replace(/useState\(\.\.\.\.\.\.\)/g, "useState('')");

  // Fix 3: Empty object property values (key: , -> key: '',)
  content = content.replace(/: ,/g, ": '',");

  // Fix 4: Unquoted property keys in column definitions (key: id, -> key: 'id',)
  content = content.replace(/\{ key: ([a-zA-Z][a-zA-Z0-9]*),/g, "{ key: '$1',");
  content = content.replace(/\{ key: ([a-zA-Z][a-zA-Z0-9]*),/g, "{ key: '$1',");

  // Fix 5: Unquoted header values (header: PO Number, -> header: 'PO Number',)
  content = content.replace(/header: ([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*),/g, "header: '$1',");

  // Fix 6: Unquoted text in return statements (text: Overdue, -> text: 'Overdue',)
  content = content.replace(/text: ([A-Z][a-zA-Z]*),/g, "text: '$1',");
  content = content.replace(/text: ([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*),/g, "text: '$1',");

  // Fix 7: Unquoted strings in setError/setSuccess
  content = content.replace(/setError\(([A-Z][a-zA-Z].*?)\);/g, "setError('$1');");

  // Fix 8: Unquoted Tailwind classes in variable declarations
  content = content.replace(/const \w+ = ([a-z-]+(?:-[a-z]+)*);/g, (match, cls) => {
    if (cls.includes('var(') || cls.includes('bg-') || cls.includes('text-') || cls.includes('max-w')) {
      return `const w = '${cls}';`;
    }
    return match;
  });

  // Fix 9: Fix specific patterns in SettingsPage.js
  content = content.replace(
    /const w = size === 'sm' \? w-7 h-4 : w-10 h-5;/g,
    "const w = size === 'sm' ? 'w-7 h-4' : 'w-10 h-5';"
  );
  content = content.replace(
    /const k = size === 'sm' \? w-3 h-3 : w-4 h-4;/g,
    "const k = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';"
  );
  content = content.replace(
    /const t = size === 'sm' \? \(on \? translate-x-3 : translate-x-0\) : \(on \? translate-x-5 : translate-x-0\);/g,
    "const t = size === 'sm' ? (on ? 'translate-x-3' : 'translate-x-0') : (on ? 'translate-x-5' : 'translate-x-0');"
  );

  // Fix 10: Reserved word keys (in-progress: -> 'in-progress':)
  content = content.replace(/\bin-progress\b:/g, "'in-progress':");

  // Fix 11: Fix bgColor values
  content = content.replace(/bgColor: bg-([a-z]+)-(\d+)\/\d+/g, "bgColor: 'bg-$1-$2/10'");

  // Fix 12: Fix SiteSurveyPage - identifiers starting with numbers (7ft, 10ft)
  content = content.replace(/\{ id: 7ft,/g, "{ id: '7ft',");
  content = content.replace(/label: 7 Ft \}/g, "label: '7 Ft' }");
  content = content.replace(/\{ id: 9ft,/g, "{ id: '9ft',");
  content = content.replace(/label: 9 Ft \}/g, "label: '9 Ft' }");
  content = content.replace(/\{ id: 10ft,/g, "{ id: '10ft',");
  content = content.replace(/label: 10 Ft \}/g, "label: '10 Ft' }");

  // Fix 13: Fix TeamManagementPage - unquoted class names
  content = content.replace(/sm: max-w-md,/g, "sm: 'max-w-md',");
  content = content.replace(/md: max-w-lg,/g, "md: 'max-w-lg',");
  content = content.replace(/lg: max-w-2xl,/g, "lg: 'max-w-2xl',");
  content = content.replace(/xl: max-w-4xl/g, "xl: 'max-w-4xl'");

  // Fix 14: Fix UserManagementPage - unquoted CSS variables in style
  content = content.replace(/style=\{\{ borderColor: var\(--border-base\) \}\}/g, "style={{ borderColor: 'var(--border-base)' }}");
  content = content.replace(/style=\{\{ color: var\(--text-primary\) \}\}/g, "style={{ color: 'var(--text-primary)' }}");

  // Fix 15: Fix ResetPasswordPage - unquoted error message
  content = content.replace(
    /setError\(Password must be at least 6 characters long\);/g,
    "setError('Password must be at least 6 characters long');"
  );

  // Fix 16: Fix ServicePage.js - unquoted Tailwind classes
  content = content.replace(
    /const NEUTRAL_BADGE = bg-\[var\(--bg-elevated\)\] text-\[var\(--text-muted\)\] border-\[var\(--border-muted\)\];/g,
    "const NEUTRAL_BADGE = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';"
  );

  // Fix 17: Fix unquoted class names in arrays
  content = content.replace(/size: md/g, "size: 'md'");
  content = content.replace(/size: sm/g, "size: 'sm'");
  content = content.replace(/activeTab: all/g, "activeTab: 'all'");
  content = content.replace(/viewMode: table/g, "viewMode: 'table'");

  // Fix 18: Fix location and notes with four quotes
  content = content.replace(/location: ''''/g, "location: ''");
  content = content.replace(/notes: ''''/g, "notes: ''");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    console.log(`Fixed ${file}`);
  }
});

console.log(`\nTotal: Fixed ${totalFixed} files`);
