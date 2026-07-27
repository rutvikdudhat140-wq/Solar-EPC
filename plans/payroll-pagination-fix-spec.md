# PayrollPage.js Pagination Fix - Technical Specification

## Current Issues
1. **No server-side pagination**: `payrollApi.getAll()` fetches all records without pagination params
2. **Client-side filtering only**: Search works on already-fetched data
3. **No pagination UI**: DataTable lacks pagination props
4. **Inefficient for large datasets**: Could cause performance issues as payroll data grows

## Required Changes

### 1. Backend API Updates (Prerequisite)

#### Update `GetPayrollQueryDto` in `backend/src/modules/hrm/dto/payroll.dto.ts`:
```typescript
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class GetPayrollQueryDto extends PaginatedQueryDto {
  @IsMongoId()
  @IsOptional()
  employeeId?: string;

  @IsNumber()
  @IsOptional()
  month?: number;

  @IsNumber()
  @IsOptional()
  year?: number;
}
```

#### Update `PayrollService.findAll` in `backend/src/modules/hrm/services/payroll.service.ts`:
```typescript
async findAll(
  employeeId?: string,
  month?: number,
  year?: number,
  page: number = 1,
  limit: number = 20,
  search?: string,
  tenantId?: string,
  user?: UserWithVisibility
): Promise<PaginatedResponse<Payroll>> {
  const skip = (page - 1) * limit;
  const query: any = {};

  // Existing tenant/employee/month/year filtering...
  
  // Add search functionality
  if (search) {
    query.$or = [
      { 'employeeId.firstName': { $regex: search, $options: 'i' } },
      { 'employeeId.lastName': { $regex: search, $options: 'i' } },
      { 'employeeId.employeeId': { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    this.payrollModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId email department')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    this.payrollModel.countDocuments(query)
  ]);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
```

#### Update `PayrollController.findAll` to pass pagination params:
```typescript
@Get()
async findAll(@Query() query: GetPayrollQueryDto, @Req() req: any) {
  await this.checkPermission(req, 'payroll.view');
  const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

  const scope = await this.getDataScope(req, 'payroll');
  const targetEmployeeId = scope === 'own' ? req.user.sub : query.employeeId;

  const data = await this.payrollService.findAll(
    targetEmployeeId,
    query.month,
    query.year,
    query.page,
    query.limit,
    query.search,
    tenantId,
    req.user
  );
  return data;
}
```

### 2. Frontend Updates

#### Update `PayrollPage.js` state:
```javascript
const PayrollPage = () => {
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [manualPayrolls, setManualPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  
  // Add pagination state
  const [pagination, setPagination] = useState({ 
    page: 1, 
    limit: 20, 
    total: 0, 
    pages: 0 
  });
```

#### Update `fetchPayrolls` function:
```javascript
const fetchPayrolls = async () => {
  try {
    setLoading(true);
    const response = await payrollApi.getAll({
      page: pagination.page,
      limit: pagination.limit,
      search: search.trim() || undefined,
      // Optional: month, year filters if needed
    });
    
    if (response.success) {
      setPayrolls(response.data);
      setPagination(response.pagination);
    }
  } catch (error) {
    toast.error('Failed to fetch payroll records');
    setPayrolls([]);
  } finally {
    setLoading(false);
  }
};
```

#### Update `useEffect` dependencies:
```javascript
useEffect(() => {
  fetchEmployees();
  fetchPayrolls();
}, [pagination.page, pagination.limit]); // Add pagination dependencies

// Add useEffect for search with debounce
useEffect(() => {
  const timer = setTimeout(() => {
    if (pagination.page === 1) {
      fetchPayrolls();
    } else {
      // Reset to page 1 when search changes
      setPagination(p => ({ ...p, page: 1 }));
    }
  }, 500); // 500ms debounce

  return () => clearTimeout(timer);
}, [search]);
```

#### Update DataTable component:
```javascript
<DataTable
  columns={tableColumns}
  data={payrolls}
  loading={loading}
  rowKey="id"
  emptyText="No payroll records found."
  hideSearch
  onRowClick={(record) => handleOpenPayroll(record, 'preview')}
  // Add pagination props
  pagination={{
    page: pagination.page,
    pageSize: pagination.limit,
    total: pagination.total,
    onChange: (page) => setPagination(p => ({ ...p, page })),
    onPageSizeChange: (size) => setPagination(p => ({ ...p, limit: size, page: 1 }))
  }}
/>
```

#### Remove client-side filtering logic:
Remove or update the `filteredRecords` useMemo since filtering will now be server-side:
```javascript
// Remove or modify this section:
const filteredRecords = useMemo(() => {
  if (!search.trim()) return records;
  const query = search.toLowerCase();
  return records.filter((record) => (
    record.employee.name.toLowerCase().includes(query)
    || record.employee.employeeId.toLowerCase().includes(query)
    || record.employee.department.toLowerCase().includes(query)
    || record.payPeriodLabel.toLowerCase().includes(query)
  ));
}, [records, search]);

// Update stats to use payrolls instead of filteredRecords
const stats = useMemo(() => {
  const totalNet = payrolls.reduce((sum, item) => sum + item.netSalary, 0);
  const totalGross = payrolls.reduce((sum, item) => sum + item.grossSalary, 0);
  const paidCount = payrolls.filter((item) => item.status === 'paid').length;
  const pendingCount = payrolls.filter((item) => item.status !== 'paid').length;

  return { totalNet, totalGross, paidCount, pendingCount };
}, [payrolls]);
```

### 3. Update API Service

Ensure `payrollApi.getAll` in `frontend/src/services/hrmApi.js` accepts params:
```javascript
export const payrollApi = {
  getAll: (params) => apiClient.get('/hrm/payroll', { params }),
  // ... other methods
};
```

## Implementation Steps

### Step 1: Create Backend Pagination Utilities (if not existing)
1. Create `PaginatedQueryDto` in `backend/src/common/dto/`
2. Create `PaginatedResponse` interface in `backend/src/common/interfaces/`

### Step 2: Update Backend Payroll Module
1. Update `GetPayrollQueryDto` to extend `PaginatedQueryDto`
2. Update `PayrollService.findAll` to support pagination and search
3. Update `PayrollController.findAll` to pass pagination params

### Step 3: Update Frontend PayrollPage.js
1. Add pagination state
2. Update `fetchPayrolls` to include pagination params
3. Update `useEffect` dependencies
4. Add search debounce with page reset
5. Update DataTable with pagination props
6. Remove client-side filtering logic
7. Update stats calculation

### Step 4: Testing
1. Test pagination with small dataset
2. Test search functionality
3. Test page size changes
4. Test edge cases (empty results, single page)
5. Verify backward compatibility

## Dependencies
1. **Backend**: Requires `PaginatedQueryDto` and `PaginatedResponse` interfaces
2. **Frontend**: DataTable component must support pagination props (already does)

## Rollback Plan
1. Keep original `fetchPayrolls` logic commented
2. Use feature flag if needed
3. Can revert backend DTO changes if issues arise

## Success Metrics
1. ✅ Payroll list loads faster with large datasets
2. ✅ Search works with server-side filtering
3. ✅ Pagination controls appear and function correctly
4. ✅ Page size changes work
5. ✅ Total count and page numbers display correctly
6. ✅ No breaking changes to existing functionality

## Estimated Effort
- Backend changes: 4-6 hours
- Frontend changes: 3-4 hours  
- Testing: 2-3 hours
- **Total**: 9-13 hours

## Notes
1. Consider adding loading states during page changes
2. Implement proper error handling for failed pagination requests
3. Consider caching strategies for better UX
4. Document the new pagination pattern for other modules to follow