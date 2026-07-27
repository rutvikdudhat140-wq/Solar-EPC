const axios = require('axios');

async function testEngineerField() {
  console.log('Testing engineer field fix in site-surveys API...\n');
  
  try {
    // Test with different statuses
    const statuses = ['pending', 'active', 'complete'];
    
    for (const status of statuses) {
      console.log(`\n=== Testing surveys with status: ${status} ===`);
      
      const response = await axios.get(`http://localhost:3000/api/site-surveys?status=${status}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const surveys = response.data;
      console.log(`Found ${surveys.length} surveys with status ${status}`);
      
      if (surveys.length > 0) {
        // Check first few surveys
        const sampleSize = Math.min(3, surveys.length);
        for (let i = 0; i < sampleSize; i++) {
          const survey = surveys[i];
          console.log(`\nSurvey ${i + 1}:`);
          console.log(`  ID: ${survey._id || survey.id}`);
          console.log(`  Lead Name: ${survey.leadName || 'N/A'}`);
          console.log(`  Engineer: "${survey.engineer}" (type: ${typeof survey.engineer})`);
          console.log(`  Status: ${survey.status}`);
          console.log(`  Has engineer field: ${'engineer' in survey}`);
          
          // Check if engineer field is properly set (not empty or 'Unassigned' unless it should be)
          if (survey.engineer && survey.engineer !== 'Unassigned' && survey.engineer !== '') {
            console.log(`  ✓ Engineer field is properly set: "${survey.engineer}"`);
          } else if (survey.status === 'pending') {
            console.log(`  ⚠ Engineer field is "${survey.engineer}" - expected for pending surveys`);
          } else {
            console.log(`  ⚠ Engineer field is "${survey.engineer}" - check if this is correct`);
          }
        }
      }
    }
    
    // Test a specific survey if we can find one
    console.log('\n=== Looking for a survey with engineer assignment ===');
    const allResponse = await axios.get('http://localhost:3000/api/site-surveys', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const allSurveys = allResponse.data;
    const surveysWithEngineer = allSurveys.filter(s => 
      s.engineer && s.engineer !== 'Unassigned' && s.engineer !== ''
    );
    
    console.log(`Total surveys: ${allSurveys.length}`);
    console.log(`Surveys with assigned engineer: ${surveysWithEngineer.length}`);
    
    if (surveysWithEngineer.length > 0) {
      console.log('\nSample of surveys with assigned engineers:');
      surveysWithEngineer.slice(0, 3).forEach((survey, i) => {
        console.log(`  ${i + 1}. ${survey.leadName || 'Unknown'} - Engineer: "${survey.engineer}" - Status: ${survey.status}`);
      });
    } else {
      console.log('\nNo surveys with assigned engineers found. This could mean:');
      console.log('  1. No engineers have been assigned yet');
      console.log('  2. The fix is not working');
      console.log('  3. There are no active/complete surveys');
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testEngineerField();