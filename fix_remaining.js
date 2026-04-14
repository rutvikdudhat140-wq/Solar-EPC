const fs = require('fs');
const path = require('path');

const pagesDir = 'frontend/src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Fix 1: from date-fns; -> from 'date-fns';
  content = content.replace(/from\s+date-fns\s*;/g, "from 'date-fns';");

  // Fix 2: from framer-motion; -> from 'framer-motion';
  content = content.replace(/from\s+framer-motion\s*;/g, "from 'framer-motion';");

  // Fix 3: from @fullcalendar/...; -> from '@fullcalendar/...';
  content = content.replace(/from\s+@fullcalendar\/([a-z-]+)\s*;/g, "from '@fullcalendar/$1';");

  // Fix 4: from react; -> from 'react';
  content = content.replace(/from\s+react\s*;/g, "from 'react';");

  // Fix 5: from @tanstack/react-query; -> from '@tanstack/react-query';
  content = content.replace(/from\s+@tanstack\/react-query\s*;/g, "from '@tanstack/react-query';");

  // Fix 6: API_BASE_URL corrupted strings with ' -'http://
  content = content.replace(/process\.env\.REACT_APP_API_BASE_URL\s*\|\|\s*'\s*-\s*'http:\/\/localhost:\d+\/api\/v\d+'\s*-\s*'/g, 
    "process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1'");

  // Fix 7: Fix tenant_id localStorage with unquoted key
  content = content.replace(/localStorage\.getItem\(tenantId\)/g, "localStorage.getItem('tenantId')");
  content = content.replace(/localStorage\.getItem\(token\)/g, "localStorage.getItem('token')");
  content = content.replace(/localStorage\.getItem\(user\)/g, "localStorage.getItem('user')");

  // Fix 8: TENANT_ID = solarcorp; -> TENANT_ID = 'solarcorp';
  content = content.replace(/TENANT_ID\s*=\s*solarcorp\s*;/g, "TENANT_ID = 'solarcorp';");

  // Fix 9: Status colors and other hex colors as property values
  content = content.replace(/:\s*#([a-fA-F0-9]{3,6})\s*[,}]/g, ": '#$1',$2");

  // Fix 10: Panel type values with spaces - Mono PERC -> 'Mono PERC'
  content = content.replace(/panelType:\s*([^'"{},\n]+?)(?=,|})/g, (match, val) => {
    if (val.includes(' ') && !val.startsWith("'") && !val.startsWith('"')) {
      return `panelType: '${val.trim()}'`;
    }
    return match;
  });

  // Fix 11: Mounting type values - Rooftop Fixed Tilt -> 'Rooftop Fixed Tilt'
  content = content.replace(/mountingType:\s*([^'"{},\n]+?)(?=,|})/g, (match, val) => {
    if (val.includes(' ') && !val.startsWith("'") && !val.startsWith('"')) {
      return `mountingType: '${val.trim()}'`;
    }
    return match;
  });

  // Fix 12: id and label values in kanban arrays
  content = content.replace(/id:\s*([A-Z][a-zA-Z\s]+),/g, (match, val) => {
    if (!val.startsWith("'") && !val.startsWith('"')) {
      return `id: '${val.trim()}',`;
    }
    return match;
  });

  content = content.replace(/label:\s*([A-Z][a-zA-Z\s]+),/g, (match, val) => {
    if (!val.startsWith("'") && !val.startsWith('"')) {
      return `label: '${val.trim()}',`;
    }
    return match;
  });

  // Fix 13: Fix color values in INSTALL_STAGES etc
  content = content.replace(/color:\s*(#[a-fA-F0-9]{3,6}),/g, "color: '$1',");
  content = content.replace(/bg:\s*rgba\((\d+,\s*\d+,\s*\d+,\s*[\d.]+)\),/g, "bg: 'rgba($1)',");

  // Fix 14: className =  } -> className = '' }
  content = content.replace(/className\s*=\s*(?!["'])([}\);,])/g, "className = ''$1");

  // Fix 15: API endpoints in api.post(/... -> api.post('/...
  content = content.replace(/api\.(post|get|put|delete|patch)\(\/([a-z/]+)/g, "api.$1('/$2");

  // Fix 16: setError(Text without quotes) -> setError('Text')
  content = content.replace(/setError\(([A-Z][a-zA-Z\s]+)\)/g, "setError('$1')");

  // Fix 17: status === active -> status === 'active'
  content = content.replace(/===\s*([a-z]+)(?![a-zA-Z0-9_'"])(?=\s*[,;)])/g, "=== '$1'");
  content = content.replace(/!==\s*([a-z]+)(?![a-zA-Z0-9_'"])(?=\s*[,;)])/g, "!== '$1'");

  // Fix 18: Fix inline string concatenation artifacts
  content = content.replace(/\|\|\s*'\s*-\s*'\s*([a-zA-Z]+)\s*'\s*-\s*'/g, "|| '$1'");
  content = content.replace(/'\s*-\s*''\s*-\s*'/g, "''");
  content = content.replace(/'\s*-\s*'/g, "''");

  // Fix 19: Corrupted strings like ' -'text' -' -> 'text'
  content = content.replace(/'\s*-\s*'([^'\n]+)'\s*-\s*'/g, "'$1'");

  // Fix 20: Fix import { ... } from ../... without quotes at end of line
  content = content.replace(/from\s+\.\.\/([a-zA-Z/]+);$/gm, "from '../$1';");
  content = content.replace(/from\s+\.\/([a-zA-Z/]+);$/gm, "from './$1';");

  // Fix 21: Fix import { ... } from @... without quotes
  content = content.replace(/from\s+@([a-z-]+)\/([a-z-]+);$/gm, "from '@$1/$2';");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    console.log(`Fixed remaining issues in ${file}`);
  }
});

console.log(`\nTotal: Fixed ${totalFixed} files`);
