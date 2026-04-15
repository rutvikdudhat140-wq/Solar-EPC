import re

# Read file
with open('frontend/src/pages/ProjectPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all broken characters
# 1. Fix the currency symbol (broken char followed by number or ()
content = re.sub(r'([^A-Za-z0-9\s])', 'INR ', content)

# 2. Fix the separator in titles - replace  between word and variable with " - "
content = re.sub(r'([a-zA-Z])([A-Z$])', r'\1 - \2', content)

# 3. Fix empty fallback strings
content = re.sub(r"\|\|\s*''", "|| '-", content)
content = re.sub(r"\?\?\s*''", "?? '-", content)

# 4. Fix search placeholders
content = content.replace('Search projects', 'Search projects...')

# 5. Fix file header comment
content = content.replace('Solar OS  EPC Edition ProjectPage.js', 'Solar OS - EPC Edition - ProjectPage.js')

# Write back
with open('frontend/src/pages/ProjectPage.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed all broken characters')
