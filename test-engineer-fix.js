/**
 * Test script to verify engineer field is preserved after moving survey to active
 */

console.log('Testing engineer field preservation...');

// Simulate the issue
const testScenario = () => {
  // Scenario 1: Survey with engineer set from moveToActive
  const surveyFromMoveToActive = {
    _id: 'survey123',
    surveyId: 'SURV-001',
    clientName: 'Test Client',
    engineer: 'John Doe', // Set by moveToActive
    solarConsultant: 'John Doe',
    status: 'active',
    leadId: 'lead123'
  };

  // Scenario 2: Lead data that might override engineer
  const leadData = {
    _id: 'lead123',
    name: 'Test Client',
    assignedTo: 'Old Engineer', // Different from survey's engineer
    city: 'Test City',
    kw: 10
  };

  // Old logic (buggy):
  console.log('\n=== OLD LOGIC (BUG) ===');
  console.log('Survey engineer before:', surveyFromMoveToActive.engineer);
  
  if (leadData.assignedTo) {
    const engineerName = typeof leadData.assignedTo === 'string' ? leadData.assignedTo : String(leadData.assignedTo);
    // This would overwrite the survey's engineer
    surveyFromMoveToActive.engineer = engineerName;
    surveyFromMoveToActive.solarConsultant = engineerName;
  }
  
  console.log('Survey engineer after (BUG):', surveyFromMoveToActive.engineer);
  console.log('Expected: John Doe, Actual:', surveyFromMoveToActive.engineer);
  console.log('Result:', surveyFromMoveToActive.engineer === 'John Doe' ? '✓ CORRECT' : '✗ WRONG - Engineer was overwritten!');

  // Reset for new logic test
  surveyFromMoveToActive.engineer = 'John Doe';
  surveyFromMoveToActive.solarConsultant = 'John Doe';

  // New logic (fixed):
  console.log('\n=== NEW LOGIC (FIXED) ===');
  console.log('Survey engineer before:', surveyFromMoveToActive.engineer);
  
  if (leadData.assignedTo) {
    const engineerName = typeof leadData.assignedTo === 'string' ? leadData.assignedTo : String(leadData.assignedTo);
    
    // Only override engineer field if survey doesn't already have one
    if (!surveyFromMoveToActive.engineer || surveyFromMoveToActive.engineer === 'Unassigned' || surveyFromMoveToActive.engineer === '') {
      surveyFromMoveToActive.engineer = engineerName;
    }
    
    // Only override solarConsultant field if survey doesn't already have one
    if (!surveyFromMoveToActive.solarConsultant || surveyFromMoveToActive.solarConsultant === 'Unassigned' || surveyFromMoveToActive.solarConsultant === '') {
      surveyFromMoveToActive.solarConsultant = engineerName;
    }
  }
  
  console.log('Survey engineer after (FIXED):', surveyFromMoveToActive.engineer);
  console.log('Expected: John Doe, Actual:', surveyFromMoveToActive.engineer);
  console.log('Result:', surveyFromMoveToActive.engineer === 'John Doe' ? '✓ CORRECT - Engineer preserved!' : '✗ WRONG');

  // Test case 2: Survey with no engineer (should get from lead)
  console.log('\n=== TEST CASE 2: Survey with no engineer ===');
  const surveyNoEngineer = {
    _id: 'survey456',
    surveyId: 'SURV-002',
    clientName: 'Test Client 2',
    engineer: '', // Empty engineer
    solarConsultant: '',
    status: 'pending',
    leadId: 'lead456'
  };

  if (leadData.assignedTo) {
    const engineerName = typeof leadData.assignedTo === 'string' ? leadData.assignedTo : String(leadData.assignedTo);
    
    if (!surveyNoEngineer.engineer || surveyNoEngineer.engineer === 'Unassigned' || surveyNoEngineer.engineer === '') {
      surveyNoEngineer.engineer = engineerName;
    }
    
    if (!surveyNoEngineer.solarConsultant || surveyNoEngineer.solarConsultant === 'Unassigned' || surveyNoEngineer.solarConsultant === '') {
      surveyNoEngineer.solarConsultant = engineerName;
    }
  }
  
  console.log('Survey engineer (was empty):', surveyNoEngineer.engineer);
  console.log('Expected: Old Engineer, Actual:', surveyNoEngineer.engineer);
  console.log('Result:', surveyNoEngineer.engineer === 'Old Engineer' ? '✓ CORRECT - Engineer set from lead' : '✗ WRONG');
};

testScenario();

console.log('\n=== SUMMARY ===');
console.log('The fix ensures:');
console.log('1. Surveys with already-assigned engineers keep their engineer');
console.log('2. Surveys without engineers get engineer from lead data');
console.log('3. "Unassigned" or empty engineer fields are treated as not having an engineer');