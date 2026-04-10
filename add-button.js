const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'PayrollPage.js');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Check if already has download button
if (content.includes('downloadPayrollReceipt(record)')) {
  console.log('Download button already added!');
  process.exit(0);
}

// Find the actions div and add download button before closing </div>
const searchPattern = /\{canDelete\(\) && \(
          <button
            onClick=\{\(e\) => \{
              e\.stopPropagation\(\);
              handleDeletePayroll\(record\._id\);
            \}\}
            className="p-2 text-red-400 hover:bg-red-500\/10 rounded-lg transition-colors"
            title="Delete"
          >
            <X size=\{14\} \/>
          <\/button>
        \)\}
      <\/div>/;

const replacement = `{canDelete() && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePayroll(record._id);
            }}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadPayrollReceipt(record);
          }}
          className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
          title="Download Receipt"
        >
          <Download size={14} />
        </button>
      </div>`;

if (searchPattern.test(content)) {
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Download button added successfully!');
} else {
  console.log('Pattern not found, trying alternative...');
  // Try simpler pattern
  const simplePattern = 'X size={14} />\n          </button>\n        )}\n      </div>';
  const simpleReplacement = `X size={14} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadPayrollReceipt(record);
          }}
          className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
          title="Download Receipt"
        >
          <Download size={14} />
        </button>
      </div>`;
  
  if (content.includes(simplePattern)) {
    content = content.replace(simplePattern, simpleReplacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Download button added with alternative pattern!');
  } else {
    console.log('Could not find the pattern to replace');
  }
}
