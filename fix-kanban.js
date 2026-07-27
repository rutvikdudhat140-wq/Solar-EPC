const fs = require('fs');
const path = 'C:\\Users\\BoSS\\solar-EPC\\frontend\\src\\pages\\CRMPage.js';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `                const stageLeads = enhancedLeads.filter(lead => {
                  const leadStatus = normalizeStageKey(lead);

                  // Direct match
                  if (leadStatus === stageKeyLower) return true;

                  // Survey-related keys should match each other
                  if (isSurveyStage) {
                    const isLeadSurvey = leadStatus === 'survey' || leadStatus === 'site-survey' || leadStatus === 'site_survey' || leadStatus.includes('survey');
                    if (isLeadSurvey) return true;
                  }

                  return false;
                });`;

const newCode = `                // Helper: fuzzy match stage keys handling common variations
                const matchesStage = (leadStatus, stageKey) => {
                  const ls = leadStatus.toLowerCase();
                  const sk = stageKey.toLowerCase();

                  // Direct match
                  if (ls === sk) return true;

                  // Common key variations mapping
                  const variations = {
                    'new': ['new', 'lead', 'fresh', 'created'],
                    'contacted': ['contacted', 'contact', 'reach', 'reached', 'call', 'called'],
                    'qualified': ['qualified', 'qualify', 'qualification', 'hot', 'warm'],
                    'proposal': ['proposal', 'proposalsent', 'proposal_sent', 'proposal-sent', 'sent'],
                    'proposal sent': ['proposal', 'proposalsent', 'proposal_sent', 'proposal-sent', 'sent'],
                    'negotiation': ['negotiation', 'negotiate', 'discuss', 'discussion', 'nego'],
                    'won': ['won', 'win', 'closed-won', 'closed_won', 'success', 'converted', 'deal'],
                    'lost': ['lost', 'lose', 'closed-lost', 'closed_lost', 'dead', 'reject', 'rejected'],
                    'survey': ['survey', 'site-survey', 'site_survey', 'sitesurvey', 'site', 'visit'],
                    'site survey': ['survey', 'site-survey', 'site_survey', 'sitesurvey', 'site', 'visit'],
                  };

                  // Check if lead status matches any variation of the stage key
                  const stageVariations = variations[sk] || [sk];
                  if (stageVariations.some(v => ls === v || ls.includes(v) || v.includes(ls))) return true;

                  // Check if stage key matches any variation of the lead status
                  const leadVariations = variations[ls] || [ls];
                  if (leadVariations.some(v => sk === v || sk.includes(v) || v.includes(sk))) return true;

                  return false;
                };

                const stageLeads = enhancedLeads.filter(lead => {
                  const leadStatus = normalizeStageKey(lead);

                  // Fuzzy match with variations
                  if (matchesStage(leadStatus, stageKeyLower)) return true;

                  // Survey-related keys should match each other
                  if (isSurveyStage) {
                    const isLeadSurvey = leadStatus === 'survey' || leadStatus === 'site-survey' || leadStatus === 'site_survey' || leadStatus.includes('survey');
                    if (isLeadSurvey) return true;
                  }

                  return false;
                });`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully updated Kanban stage matching logic');
} else {
  console.log('Pattern not found - code may have changed');
  process.exit(1);
}
