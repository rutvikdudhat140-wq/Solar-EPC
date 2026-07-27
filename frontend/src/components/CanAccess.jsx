/**
 * Solar OS   <CanAccess> Higher-Order Guard Component
 *
 * Uses the full priority-chain permission resolver:
 *   User Override   Custom Role   Base RBAC   Feature Flag gate
 *
 * Usage:
 *   <CanAccess module="finance" action="view"> </CanAccess>
 *   <CanAccess module="crm" feature="ai_scoring"> </CanAccess>
 *   <CanAccess module="finance" fallback={<p>No access</p>}> </CanAccess>
 *   <CanAccess module="crm" action="delete" disabled> </CanAccess>
 *
 * Props:
 *   module      moduleId (required)
 *   action      actionId (optional)
 *   feature     featureId (optional)
 *   fallback    rendered when check fails (default: null)
 *   disabled    if true renders children greyed-out instead of hiding
 */
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

const CanAccess = ({
    module,
    action,
    feature,
    fallback = null,
    disabled: disabledMode = false,
    children,
}) => {
    const { can, featureOn, moduleOn } = usePermissions(module);

    if (!moduleOn(module)) return fallback;
    if (feature && !featureOn(module, feature)) return fallback;
    if (action && !can(action)) {
        if (disabledMode) {
            return (
                <span
                    style={{ opacity: 0.35, pointerEvents: 'none', cursor: 'not-allowed', display: 'contents' }}
                    title={`No '${action}' permission on '${module}'`}
                >
                    {children}
                </span>
            );
        }
        return fallback;
    }

    return <>{children}</>;
};

/** Convenience alias: <CanEdit module="crm"> */
export const CanEdit = (props) => <CanAccess action="edit"   {...props} />;
export const CanCreate = (props) => <CanAccess action="create" {...props} />;
export const CanDelete = (props) => <CanAccess action="delete" {...props} />;
export const CanView = (props) => <CanAccess action="view"   {...props} />;

export default CanAccess;
