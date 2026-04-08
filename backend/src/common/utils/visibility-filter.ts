import { Types } from 'mongoose';

export interface UserWithVisibility {
  _id?: Types.ObjectId;
  id?: string;
  email?: string;
  tenantId?: string | Types.ObjectId;
  dataScope: 'ALL' | 'ASSIGNED';
  role?: string;
  isSuperAdmin?: boolean;
  teamMemberIds?: string[]; // For MANAGER role - list of team member IDs
}

/**
 * Builds visibility filter for database queries based on user dataScope
 * @param user - User object with dataScope and id
 * @returns Filter object to be merged into query
 * 
 * DataScope Rules:
 * - ALL: Returns {} (no visibility restriction, sees all tenant data)
 * - ASSIGNED: Returns { $or: [{ createdBy: userId }, { assignedTo: userId }] }
 * - No user context: Returns {} (safest default - no additional restrictions)
 */
export function buildVisibilityFilter(
  user: UserWithVisibility | null | undefined,
  options?: { allowCrossTenant?: boolean }
): Record<string, any> {
  // Debug logging
  console.log("[VISIBILITY]", {
    userId: user?.id || user?._id,
    role: user?.role,
    dataScope: user?.dataScope,
    isSuperAdmin: user?.isSuperAdmin
  });

  if (!user) {
    // No user context - return no additional visibility restrictions
    return {};
  }

  // FULL ACCESS USERS (ALL dataScope, SuperAdmin, or Admin-like roles)
  const roleLower = (user.role || '').toLowerCase();
  const isAdminLike = user.isSuperAdmin 
    || roleLower === 'admin'
    || roleLower === 'superadmin'
    || roleLower === 'super-admin'
    || roleLower === 'super_admin';

  // Users with ALL scope get no visibility restrictions
  if (user.dataScope === 'ALL' || isAdminLike) {
    console.log("[VISIBILITY] Granting full access (dataScope=ALL or Admin)");
    return {};
  }

  // LIMITED ACCESS USERS (ASSIGNED dataScope or no dataScope)
  const userId = user._id || user.id;

  if (!userId) {
    console.log("[VISIBILITY] No userId found, returning empty filter");
    return {};
  }

  const objectId =
    typeof userId === 'string' && Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

  console.log("[VISIBILITY] Applying ASSIGNED filter for user:", userId.toString());

  return {
    $or: [
      { createdBy: objectId },
      { assignedTo: objectId }
    ]
  };
}

/**
 * Combines base filter with visibility filter
 * @param baseFilter - Existing query filter
 * @param user - User object with dataScope
 * @returns Combined filter
 */
export function applyVisibilityFilter(
  baseFilter: Record<string, any>,
  user: UserWithVisibility | null | undefined
): Record<string, any> {
  const visibilityFilter = buildVisibilityFilter(user);
  
  // If no visibility restriction, return base filter
  if (Object.keys(visibilityFilter).length === 0) {
    return baseFilter;
  }

  // If base filter has $and, append to it
  if (baseFilter.$and) {
    return {
      ...baseFilter,
      $and: [
        ...baseFilter.$and,
        visibilityFilter
      ]
    };
  }

  // Combine filters with $and
  return {
    $and: [
      baseFilter,
      visibilityFilter
    ]
  };
}

/**
 * Builds complete database query filter including tenant isolation and visibility
 * @param tenantId - The tenant ID to filter by (or undefined for super admin)
 * @param user - User object with dataScope and role info
 * @param additionalFilters - Any additional query filters
 * @returns Complete filter object ready for database query
 * 
 * This is the recommended function to use in service layer methods
 */
export function buildCompleteFilter(
  tenantId: string | Types.ObjectId | undefined,
  user: UserWithVisibility | null | undefined,
  additionalFilters: Record<string, any> = {}
): Record<string, any> {
  // Debug logging
  console.log("[BUILD_FILTER]", {
    tenantId: tenantId?.toString(),
    userId: user?.id || user?._id,
    dataScope: user?.dataScope,
    role: user?.role
  });

  // Start with isDeleted filter (soft delete handling)
  const filter: Record<string, any> = { isDeleted: { $ne: true }, ...additionalFilters };

  // Check if user has ALL access (dataScope=ALL or is Admin/SuperAdmin)
  const roleLower = (user?.role || '').toLowerCase();
  const isAdminLike = user?.isSuperAdmin 
    || roleLower === 'admin'
    || roleLower === 'superadmin'
    || roleLower === 'super-admin'
    || roleLower === 'super_admin';
  const hasFullAccess = user?.dataScope === 'ALL' || isAdminLike;

  // All users except SuperAdmin in global view MUST have tenantId
  if (!tenantId && !user?.isSuperAdmin) {
    console.log("[BUILD_FILTER] No tenantId and not SuperAdmin - applying only visibility filter");
    // Skip tenant filter for non-superadmins without tenant context
    // but still apply visibility filters
  }

  // Apply tenant filter ONLY if tenantId is provided
  if (tenantId) {
    const tenantObjId = typeof tenantId === 'string' && Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;
    
    // For admins or users with full access, also include leads without tenantId
    // This allows viewing imported/legacy leads that don't have tenant context
    if (hasFullAccess) {
      filter.$or = [
        { tenantId: tenantObjId },
        { tenantId: { $exists: false } },
        { tenantId: null }
      ];
      console.log("[BUILD_FILTER] Applied tenant filter with OR (includes null/undefined):", tenantObjId.toString());
    } else {
      filter.tenantId = tenantObjId;
      console.log("[BUILD_FILTER] Applied tenant filter:", tenantObjId.toString());
    }
  } else {
    console.log("[BUILD_FILTER] No tenantId - skipping tenant filter");
  }

  // Apply visibility filter ONLY for users with ASSIGNED dataScope
  // AND when tenantId is provided (skip for leads without tenant context)
  if (!hasFullAccess && tenantId) {
    const visibilityFilter = buildVisibilityFilter(user);
    if (Object.keys(visibilityFilter).length > 0) {
      // Merge visibility filter
      Object.assign(filter, visibilityFilter);
      console.log("[BUILD_FILTER] Applied ASSIGNED visibility filter");
    }
  } else {
    console.log("[BUILD_FILTER] Skipping visibility filter (dataScope=ALL or Admin or No tenantId)");
  }

  console.log("[BUILD_FILTER] Final filter:", JSON.stringify(filter));
  return filter;
}

/**
 * Checks if user can access a specific record based on role-based rules
 * @param user - User object
 * @param record - The record to check (lead, project, etc.)
 * @param record.assignedTo - ID of user the record is assigned to
 * @param record.createdBy - ID of user who created the record
 * @returns boolean
 */
export function canAccessRecord(
  user: UserWithVisibility,
  record?: {
    assignedTo?: Types.ObjectId | string | null;
    createdBy?: Types.ObjectId | string | null;
    tenantId?: Types.ObjectId | string | null;
  }
): boolean {
  // Users with dataScope ALL (Admins) can access all records in their tenant
  const roleLower = (user?.role || '').toLowerCase();
  const isAdminLike = user?.isSuperAdmin 
    || roleLower === 'admin'
    || roleLower === 'superadmin'
    || roleLower === 'super-admin'
    || roleLower === 'super_admin';
  
  if (user?.dataScope === 'ALL' || isAdminLike) {
    return true;
  }

  // For ASSIGNED users - strict visibility
  // Everyone can only access records they created OR records assigned to them

  const userId = user._id?.toString() || user.id;

  if (!userId || !record) {
    return false;
  }

  const recordAssignedTo = record.assignedTo?.toString();
  const recordCreatedBy = record.createdBy?.toString();

  return recordAssignedTo === userId || recordCreatedBy === userId;
}
