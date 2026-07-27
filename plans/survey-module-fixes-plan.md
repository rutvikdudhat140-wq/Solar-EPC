# Survey Module Completion Plan

## Overview
The survey module at `http://localhost:3001/survey` (which uses `SiteSurveyPage.js`) has two main issues:
1. **Font support issues** - Special characters not rendering correctly
2. **Logical issues** - Problems with API integration, data flow, and status handling

## Issues Identified

### 1. Font Support Issues
- **Problem**: Special characters `�'`, `�'`, `�'` appear throughout the codebase
- **Root Cause**: UTF-8 encoding problems where special characters are not displaying correctly
- **Impact**: These characters may cause font rendering issues and visual glitches
- **Files Affected**:
  - `frontend/src/pages/SiteSurveyPage.js` (main survey page)
  - `frontend/src/pages/SurveyPage.js` (alternative survey page)
  - Multiple other files across the codebase (300+ occurrences found)

### 2. Logical Issues
- **API Integration**: The frontend uses `siteSurveysApi.js` but there may be mismatches with backend endpoints
- **Data Flow**: Complex logic for combining survey data with lead data
- **Status Handling**: Issues with survey status transitions (pending → active → complete)
- **Error Handling**: Inconsistent error handling in API calls
- **Permission Checks**: Role-based access control may not be properly implemented

## Detailed Analysis

### Font Issues
The special characters `�` (U+FFFD REPLACEMENT CHARACTER) appear in:
1. Comments and documentation lines
2. String literals (especially in placeholder text)
3. CSS class names and styling
4. Component labels and descriptions

These are likely the result of:
- Copy-pasting from sources with different encoding
- File corruption during transfer
- Incorrect character encoding settings in the editor

### Logical Issues Found
1. **Dual Data Sources**: The page fetches from both `siteSurveysApi.getAll()` and `leadsApi.getAll()` with statusKey='survey'
2. **Complex Filtering**: Client-side filtering of leads with 'survey' stage when backend filtering fails
3. **Status Transition Logic**: `moveToActive` and `moveToComplete` functions may have race conditions
4. **Error Handling**: Some API calls have minimal error handling
5. **Permission Checks**: Admin vs non-admin logic may not be consistent

## Solution Plan

### Phase 1: Fix Font Support Issues
1. **Identify and Replace Special Characters**:
   - Scan all survey-related files for `�` characters
   - Replace with appropriate Unicode characters or remove if unnecessary
   - Fix encoding in `SiteSurveyPage.js` and `SurveyPage.js`

2. **CSS Font Declarations**:
   - Ensure proper font-family fallbacks
   - Check for missing font imports
   - Standardize font usage across the survey module

3. **Encoding Correction**:
   - Convert files to UTF-8 encoding
   - Remove BOM (Byte Order Mark) if present
   - Validate all string literals

### Phase 2: Fix Logical Issues
1. **API Integration**:
   - Verify all endpoints in `siteSurveysApi.js` match backend routes
   - Test each API call with real data
   - Add proper error handling and loading states

2. **Data Flow Improvements**:
   - Simplify the dual data source logic
   - Implement proper caching for lead data
   - Add debouncing for search functionality

3. **Status Management**:
   - Ensure status transitions follow proper workflow
   - Add validation for required fields during transitions
   - Implement proper state management for survey status

4. **Error Handling**:
   - Add comprehensive error handling for all API calls
   - Implement retry logic for failed requests
   - Add user-friendly error messages

5. **Permission System**:
   - Verify role-based access controls
   - Implement proper permission checks for all actions
   - Add visual indicators for restricted actions

### Phase 3: Connect SurveyPage.js to Real APIs
1. **Current State**: `SurveyPage.js` uses mock data
2. **Target State**: Connect to real `surveysApi.js` or `siteSurveysApi.js`
3. **Implementation Steps**:
   - Replace mock data with API calls
   - Implement proper state management
   - Add loading and error states
   - Ensure compatibility with existing survey data structure

### Phase 4: Testing and Validation
1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test API integration and data flow
3. **User Acceptance Testing**: Verify all functionality works as expected
4. **Cross-browser Testing**: Ensure font rendering works across browsers

## Technical Implementation Details

### Font Fix Implementation
```javascript
// Example: Replace special characters
const cleanText = text.replace(/[�'�'�']/g, "'");
```

### API Integration Improvements
```javascript
// Improved error handling example
const fetchSurveys = async () => {
  try {
    setLoading(true);
    const response = await siteSurveysApi.getAll(params);
    // Process data...
  } catch (error) {
    console.error('Failed to fetch surveys:', error);
    toast.error(error.message || 'Failed to load surveys');
  } finally {
    setLoading(false);
  }
};
```

### Status Transition Validation
```javascript
const validateMoveToActive = (survey, formData) => {
  if (!survey) throw new Error('No survey selected');
  if (!formData.engineerId) throw new Error('Engineer assignment required');
  if (!formData.scheduledDate) throw new Error('Scheduled date required');
  return true;
};
```

## Files to Modify

### Primary Files:
1. `frontend/src/pages/SiteSurveyPage.js` (3372 lines)
2. `frontend/src/pages/SurveyPage.js` (401 lines)
3. `frontend/src/services/siteSurveysApi.js` (85 lines)
4. `frontend/src/services/surveysApi.js` (if exists)

### Supporting Files:
1. CSS files with font declarations
2. Any component files used by the survey module
3. Backend controller and service files if API changes needed

## Success Criteria
1. All special characters `�` removed from survey module
2. Fonts render correctly across all browsers
3. All API calls work without errors
4. Survey status transitions work correctly
5. Permission system functions properly
6. Error handling provides useful feedback
7. `SurveyPage.js` uses real API data instead of mock data

## Risks and Mitigations
1. **Risk**: Breaking existing functionality
   - **Mitigation**: Thorough testing before deployment
2. **Risk**: Encoding changes affecting other parts of application
   - **Mitigation**: Isolate changes to survey module files
3. **Risk**: API compatibility issues
   - **Mitigation**: Verify backend API contracts before implementation

## Timeline
The implementation should be broken into manageable chunks with regular testing between phases.

## Next Steps
1. Begin with Phase 1 (font fixes) as they are visible issues
2. Move to Phase 2 (logical fixes) to ensure core functionality
3. Implement Phase 3 (API integration) for complete functionality
4. Complete with Phase 4 (testing) to validate all fixes