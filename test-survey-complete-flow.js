/**
 * Test script to verify the complete survey workflow
 * 
 * Workflow to test:
 * 1. Create a new survey
 * 2. Start the survey (move from pending to active)
 * 3. Select engineer from dropdown
 * 4. After completion, "Fill Form" button appears
 * 5. Fill details (completeData)
 * 6. Survey status becomes complete
 * 7. PDF download available for completed surveys
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_TENANT_ID = 'test-tenant'; // Will need actual tenant ID
const TEST_USER_TOKEN = 'test-token'; // Will need actual auth token

// Create axios instance with default headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'X-Tenant-Id': TEST_TENANT_ID,
  },
});

// Test data
const testSurveyData = {
  clientName: 'Test Client - Survey Workflow',
  city: 'Test City',
  projectCapacity: '10 kW',
  roofType: 'Flat',
  structureType: 'RCC',
  structureHeight: '10-15 ft',
  moduleType: 'Mono PERC',
  solarConsultant: 'Test Consultant',
  floors: 2,
  notes: 'Test survey for workflow verification',
};

const testCompleteData = {
  finalImages: [],
  finalRoofLayout: 'Test layout data',
  panelPlacementDetails: 'South facing, 30 degree tilt',
  finalNotes: 'Survey completed successfully',
  engineerApproval: true,
  engineerName: 'Test Engineer',
  completionDate: new Date().toISOString(),
  approvedAt: new Date().toISOString(),
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

function logTest(name, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    if (error) {
      console.log(`   Error: ${error.message || error}`);
      testResults.errors.push({ name, error });
    }
  }
}

async function testApiEndpoint(method, url, data = null, expectedStatus = 200) {
  try {
    const response = await api({
      method,
      url,
      data,
    });
    
    if (response.status === expectedStatus) {
      return { success: true, data: response.data };
    } else {
      return { 
        success: false, 
        error: `Expected status ${expectedStatus}, got ${response.status}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

async function testSurveyWorkflow() {
  console.log('🚀 Starting Survey Workflow Test');
  console.log('='.repeat(50));
  
  let createdSurveyId = null;
  
  // Step 1: Create a new survey
  console.log('\n1. Testing: Create a new survey');
  const createResult = await testApiEndpoint('POST', '/site-surveys', testSurveyData, 201);
  if (createResult.success) {
    createdSurveyId = createResult.data._id || createResult.data.id;
    logTest('Create survey', true);
    console.log(`   Created survey ID: ${createdSurveyId}`);
  } else {
    logTest('Create survey', false, createResult.error);
    console.log('   Skipping further tests due to create failure');
    return;
  }
  
  // Step 2: Start the survey (move from pending to active)
  console.log('\n2. Testing: Start survey (move to active)');
  const moveToActiveData = {
    assignedTo: 'test-engineer-id', // Would need actual engineer ID
    scheduledDate: new Date().toISOString(),
    notes: 'Starting survey',
  };
  
  const activeResult = await testApiEndpoint(
    'PATCH', 
    `/site-surveys/${createdSurveyId}/move-to-active`, 
    moveToActiveData,
    200
  );
  
  if (activeResult.success) {
    logTest('Move to active', true);
    console.log(`   Survey status: ${activeResult.data.status}`);
  } else {
    logTest('Move to active', false, activeResult.error);
  }
  
  // Step 3: Verify survey is now active
  console.log('\n3. Testing: Verify survey is active');
  const getSurveyResult = await testApiEndpoint('GET', `/site-surveys/${createdSurveyId}`, null, 200);
  if (getSurveyResult.success && getSurveyResult.data.status === 'active') {
    logTest('Survey status is active', true);
  } else {
    logTest('Survey status is active', false, 
      `Expected status 'active', got '${getSurveyResult.data?.status}'`);
  }
  
  // Step 4: Complete the survey (move to complete with completeData)
  console.log('\n4. Testing: Complete survey (move to complete)');
  const moveToCompleteData = {
    completeData: testCompleteData,
    notes: 'Survey completed with all details',
  };
  
  const completeResult = await testApiEndpoint(
    'PATCH', 
    `/site-surveys/${createdSurveyId}/move-to-complete`, 
    moveToCompleteData,
    200
  );
  
  if (completeResult.success) {
    logTest('Move to complete', true);
    console.log(`   Survey status: ${completeResult.data.status}`);
  } else {
    logTest('Move to complete', false, completeResult.error);
  }
  
  // Step 5: Verify survey is now complete
  console.log('\n5. Testing: Verify survey is complete');
  const getCompleteResult = await testApiEndpoint('GET', `/site-surveys/${createdSurveyId}`, null, 200);
  if (getCompleteResult.success && getCompleteResult.data.status === 'complete') {
    logTest('Survey status is complete', true);
    console.log(`   Complete data saved: ${!!getCompleteResult.data.completeData}`);
  } else {
    logTest('Survey status is complete', false, 
      `Expected status 'complete', got '${getCompleteResult.data?.status}'`);
  }
  
  // Step 6: Test PDF generation (frontend would call this)
  console.log('\n6. Testing: PDF download availability');
  // Note: PDF generation is frontend-only, but we can verify the data needed for PDF exists
  if (getCompleteResult.success && getCompleteResult.data.completeData) {
    logTest('Survey has complete data for PDF', true);
    console.log(`   Engineer approval: ${getCompleteResult.data.completeData.engineerApproval}`);
    console.log(`   Engineer name: ${getCompleteResult.data.completeData.engineerName}`);
  } else {
    logTest('Survey has complete data for PDF', false, 'Missing completeData');
  }
  
  // Step 7: Cleanup - delete test survey
  console.log('\n7. Testing: Cleanup - delete test survey');
  const deleteResult = await testApiEndpoint('DELETE', `/site-surveys/${createdSurveyId}`, null, 200);
  if (deleteResult.success) {
    logTest('Delete survey', true);
  } else {
    logTest('Delete survey', false, deleteResult.error);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log(`Total tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.name}: ${err.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Survey workflow is working correctly.');
    process.exit(0);
  }
}

// Handle authentication issues
async function checkAuth() {
  console.log('🔐 Checking authentication...');
  console.log('Note: This test requires valid authentication tokens.');
  console.log('For a full test, you need to:');
  console.log('1. Login and get a valid JWT token');
  console.log('2. Set TEST_USER_TOKEN with the token');
  console.log('3. Set TEST_TENANT_ID with your tenant ID');
  console.log('\nRunning test with placeholder credentials...');
}

// Run tests
async function runTests() {
  await checkAuth();
  await testSurveyWorkflow();
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});