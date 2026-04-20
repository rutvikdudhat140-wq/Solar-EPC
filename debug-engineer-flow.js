/**
 * Debug script to trace the engineer field flow
 * This simulates the exact user workflow to identify where the issue is
 */

console.log('=== DEBUGGING ENGINEER FIELD FLOW ===\n');

// Simulate the exact user workflow
const workflow = {
  step1: 'User creates new survey (or it appears from lead)',
  step2: 'Table shows engineer field (from lead.assignedTo?.name)',
  step3: 'User clicks Start button',
  step4: 'Assign Survey modal opens with engineer dropdown',
  step5: 'User selects engineer from dropdown',
  step6: 'Modal submits with engineer: selectedEngineerName',
  step7: 'Backend processes moveToActive with engineer field',
  step8: 'Frontend refreshes table via fetchSurveys()',
  step9: 'Table should show newly assigned engineer'
};

console.log('Workflow steps:');
Object.values(workflow).forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

console.log('\n=== POTENTIAL ISSUE POINTS ===\n');

const potentialIssues = [
  {
    id: 1,
    location: 'Frontend: PendingToActiveModal',
    issue: 'engineerName not being set correctly from dropdown selection',
    check: 'Lines 1037-1042: onChange sets engineerId and engineerName',
    status: '✓ Looks correct'
  },
  {
    id: 2,
    location: 'Frontend: PendingToActiveModal submit',
    issue: 'Not sending engineer field in onSubmit',
    check: 'Lines 996-1002: Sends engineer: formData.engineerName',
    status: '✓ Looks correct'
  },
  {
    id: 3,
    location: 'Frontend: handleMoveToActive',
    issue: 'leadData.engineer not using formData.engineer',
    check: 'Line 2307: engineer: formData.engineer || selectedSurvey.engineer || "Unassigned"',
    status: '✓ Should use formData.engineer (which is formData.engineerName from modal)'
  },
  {
    id: 4,
    location: 'Backend: createFromLead',
    issue: 'Not using leadData.engineer',
    check: 'Lines 619-620: engineer: leadData.engineer || "Unassigned"',
    status: '✓ Uses leadData.engineer'
  },
  {
    id: 5,
    location: 'Backend: moveToActive',
    issue: 'Not setting engineer field',
    check: 'Compiled JS line 306: engineer: moveDto.engineer || resolvedAssigneeName || survey.engineer',
    status: '✓ Sets engineer from moveDto.engineer'
  },
  {
    id: 6,
    location: 'Backend: findAll',
    issue: 'Overwriting survey.engineer with lead.assignedTo',
    check: 'Compiled JS lines 159-160: Conditional check preserves survey engineer',
    status: '✓ FIXED - Only overwrites if survey has no engineer'
  },
  {
    id: 7,
    location: 'Frontend: fetchSurveys',
    issue: 'Still showing lead placeholder instead of real survey',
    check: 'Lines 2207-2212: Filters out leads that have real surveys',
    status: '✓ Should filter out converted leads'
  },
  {
    id: 8,
    location: 'Frontend: fetchSurveys lead placeholder',
    issue: 'lead.assignedTo?.name might be different from survey.engineer',
    check: 'Line 2221: engineer: lead.assignedTo?.name || "Unassigned"',
    status: '⚠ This shows lead\'s engineer, not survey\'s engineer'
  }
];

console.log('Checking each potential issue point:');
potentialIssues.forEach(issue => {
  console.log(`\n${issue.id}. ${issue.location}`);
  console.log(`   Issue: ${issue.issue}`);
  console.log(`   Check: ${issue.check}`);
  console.log(`   Status: ${issue.status}`);
});

console.log('\n=== ROOT CAUSE ANALYSIS ===\n');

console.log('Based on the analysis, the most likely issue is #8:');
console.log('When a survey is created from a lead, two things happen:');
console.log('1. A real survey is created with the selected engineer');
console.log('2. The lead placeholder should be filtered out (lines 2207-2212)');
console.log('');
console.log('BUT if there\'s a timing issue or the filter doesn\'t work correctly,');
console.log('the lead placeholder might still show with lead.assignedTo?.name');
console.log('instead of the real survey with the selected engineer.');
console.log('');
console.log('The filter logic (lines 2207-2212) depends on:');
console.log('1. existingSurveyLeadIds being built correctly from real surveys');
console.log('2. The real survey being created and returned in surveyData');
console.log('3. The leadId matching between lead and survey');

console.log('\n=== TESTING THE FILTER LOGIC ===\n');

// Simulate the filter logic
const simulateFilterLogic = () => {
  console.log('Simulating fetchSurveys filter logic:');
  
  // Simulate real surveys from API
  const surveyData = [
    { _id: 'survey1', leadId: { _id: 'lead123' }, engineer: 'Selected Engineer' }
  ];
  
  // Simulate leads from leads API
  const leadsData = [
    { _id: 'lead123', assignedTo: { name: 'Lead Engineer' } },
    { _id: 'lead456', assignedTo: { name: 'Another Engineer' } }
  ];
  
  // Build existingSurveyLeadIds (lines 2171-2176)
  const existingSurveyLeadIds = new Set(
    surveyData
      .map(s => s?.leadId?._id ? s.leadId._id : s?.leadId)
      .filter(Boolean)
      .map(v => v.toString())
  );
  
  console.log('Real surveys:', surveyData.length);
  console.log('Existing survey lead IDs:', Array.from(existingSurveyLeadIds));
  console.log('Leads before filter:', leadsData.length);
  
  // Filter leads (lines 2207-2212)
  const filteredLeads = leadsData.filter(lead => {
    const leadId = (lead?._id || lead?.id)?.toString();
    if (!leadId) return false;
    return !existingSurveyLeadIds.has(leadId);
  });
  
  console.log('Leads after filter:', filteredLeads.length);
  console.log('Filtered out lead with ID:', 'lead123');
  console.log('Remaining lead with ID:', filteredLeads[0]?._id || 'none');
  
  if (filteredLeads.length === 1 && filteredLeads[0]._id === 'lead456') {
    console.log('✓ Filter logic works correctly');
  } else {
    console.log('✗ Filter logic has issues');
  }
};

simulateFilterLogic();

console.log('\n=== RECOMMENDED FIX ===\n');

console.log('If the issue is timing (survey not yet in surveyData when fetchSurveys runs):');
console.log('1. Ensure fetchSurveys waits for survey creation to complete');
console.log('2. Or add a small delay before refreshing');
console.log('');
console.log('If the issue is leadId mismatch:');
console.log('1. Check that survey.leadId matches lead._id');
console.log('2. The createFromLead method should use the same leadId');
console.log('');
console.log('Immediate workaround: Clear the lead placeholder from UI immediately');
console.log('after survey creation, not waiting for fetchSurveys to complete.');

console.log('\n=== QUICK FIX SUGGESTION ===\n');

console.log('In handleMoveToActive, after successful survey creation:');
console.log('1. Immediately update the surveys state to remove the lead placeholder');
console.log('2. Add the newly created survey to the surveys state');
console.log('3. Then call fetchSurveys() to get fresh data');
console.log('');
console.log('This ensures the UI updates immediately with the correct engineer.');