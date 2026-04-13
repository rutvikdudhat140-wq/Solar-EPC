# Reminder System Tenant Isolation Test Plan

## Overview
This document outlines the test scenarios and validation steps for ensuring complete tenant isolation in the Solar EPC OS reminder system.

## Test Environment Setup
1. **Database**: MongoDB with at least 2 active tenants
2. **Backend**: NestJS application running on localhost:3000
3. **Frontend**: React application (optional for manual testing)
4. **Test Users**: 
   - SuperAdmin (can create tenants)
   - TenantA Admin (userA@tenantA.com)
   - TenantB Admin (userB@tenantB.com)
   - Regular User in TenantA (user1@tenantA.com)

## Test Scenarios

### Scenario 1: Cross-Tenant Data Leak Prevention
**Objective**: Verify that reminders from TenantA are not visible to TenantB users.

**Steps**:
1. Login as TenantA Admin
2. Create 3 reminders in TenantA
3. Logout
4. Login as TenantB Admin  
5. List all reminders via API
6. Verify count = 0 (no TenantA reminders visible)

**API Calls**:
```bash
# Create reminders in TenantA
curl -X POST http://localhost:3000/api/reminders \
  -H "Authorization: Bearer {tenantA_token}" \
  -H "x-tenant-id: tenantA_id" \
  -d '{"title":"TenantA Reminder 1","module":"crm","dueDate":"2026-04-15T10:00:00Z","assignedTo":"userA_id"}'

# List reminders as TenantB
curl -X GET http://localhost:3000/api/reminders \
  -H "Authorization: Bearer {tenantB_token}" \
  -H "x-tenant-id: tenantB_id"
```

**Expected Results**:
- TenantB GET /reminders returns empty array
- Database queries include `tenantId` filter
- No errors in logs about unauthorized access

### Scenario 2: Auto-Reminder Generation Tenant Isolation
**Objective**: Verify that auto-generated reminders include correct tenantId.

**Steps**:
1. Login as TenantA Admin
2. Create a task with due date in TenantA
3. Trigger task overdue event
4. Check auto-reminder creation in database
5. Verify reminder has `tenantId: tenantA_id`
6. Login as TenantB Admin
7. Verify no auto-reminders visible

**Validation Points**:
- AutoReminderService extracts tenantId from event payload
- Created reminder includes correct tenantId
- TenantB cannot see TenantA's auto-reminders

### Scenario 3: Scheduler Tenant Grouping
**Objective**: Verify scheduler processes reminders per tenant.

**Steps**:
1. Create reminders in TenantA and TenantB with past `remindAt` dates
2. Run scheduler manually or wait for next minute
3. Check logs for tenant-specific processing
4. Verify notifications sent to correct tenant rooms

**Validation**:
- Scheduler logs show "Tenant {slug}: Found X reminders to trigger"
- Notifications sent to `tenant:{tenantId}` socket room
- No cross-tenant notification mixing

### Scenario 4: WebSocket Notification Isolation
**Objective**: Verify real-time notifications are tenant-scoped.

**Steps**:
1. Connect WebSocket as TenantA user
2. Connect WebSocket as TenantB user  
3. Create reminder in TenantA
4. Verify only TenantA socket receives notification
5. TenantB socket receives no notification

**Validation**:
- Socket joins `tenant:{tenantId}` room on connection
- `broadcastToTenant()` sends to correct room only
- No notifications leaked between tenants

### Scenario 5: Permission Boundary Enforcement
**Objective**: Verify users can only see their assigned reminders within tenant.

**Steps**:
1. Create User1 and User2 in TenantA
2. Create reminder assigned to User1
3. Login as User2
4. Attempt to access User1's reminder
5. Verify access denied

**API Calls**:
```bash
# User2 tries to access User1's reminder
curl -X GET http://localhost:3000/api/reminders/{user1_reminder_id} \
  -H "Authorization: Bearer {user2_token}" \
  -H "x-tenant-id: tenantA_id"
```

**Expected Results**:
- Returns 404 Not Found (not 403 Forbidden for data isolation)
- Service filters by `assignedTo` for non-admin users

## Automated Test Script

Create a test file `reminder-tenant-isolation.test.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ReminderModule } from '../src/modules/reminders/reminders.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

describe('Reminder Tenant Isolation', () => {
  let app: INestApplication;
  let reminderModel: Model<any>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ReminderModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    reminderModel = app.get(getModelToken('Reminder'));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Cross-tenant data access', () => {
    it('should not return reminders from other tenants', async () => {
      // Create reminder in TenantA
      await reminderModel.create({
        title: 'TenantA Reminder',
        tenantId: 'tenantA_id',
        assignedTo: 'userA_id',
        status: 'pending',
        dueDate: new Date(),
      });

      // Simulate TenantB request
      const response = await request(app.getHttpServer())
        .get('/reminders')
        .set('x-tenant-id', 'tenantB_id')
        .set('Authorization', 'Bearer tenantB_token');

      expect(response.status).toBe(200);
      expect(response.body.reminders).toHaveLength(0);
    });
  });
});
```

## Manual Validation Steps

### 1. Database Verification
```javascript
// Check tenantId field exists in all reminders
db.reminders.find({ tenantId: { $exists: false } }).count();
// Should return 0

// Check indexes include tenantId
db.reminders.getIndexes();
// Should show indexes with tenantId
```

### 2. API Endpoint Testing
Use Postman or curl to test:
- `GET /reminders` with different tenant headers
- `POST /reminders` with cross-tenant assignedTo (should fail)
- `GET /reminders/:id` with wrong tenant (should return 404)

### 3. Log Analysis
Check application logs for:
- Tenant context in log messages: `[Tenant:tenantA]`
- No cross-tenant data mixing in query logs
- Proper error handling for unauthorized access attempts

## Success Criteria

1. **100% Data Isolation**: No reminders visible across tenants
2. **Correct Tenant Context**: All auto-reminders include proper tenantId
3. **Secure API**: All endpoints enforce tenant boundaries
4. **Proper Logging**: All operations include tenant context
5. **Performance**: Tenant-specific queries perform efficiently

## Rollback Plan

If issues are found:
1. Revert scheduler changes to original implementation
2. Keep tenantId filtering in service layer (non-breaking)
3. Add logging to identify any remaining cross-tenant access
4. Schedule fix for next release

## Post-Implementation Verification

After deployment:
1. Monitor error logs for tenant-related issues
2. Verify scheduler logs show tenant grouping
3. Test with real multi-tenant data
4. Update documentation with tenant isolation details

---

*Test Plan Version: 1.0*  
*Last Updated: April 13, 2026*  
*Author: Solar EPC OS Development Team*