import React from 'react';
import AdminPersonaData from './AdminPersonaData';

interface AdminMockDataProps {
  isAdmin: boolean;
  currentUserId?: string;
}

/**
 * AdminMockData Component - Legacy Wrapper
 * 
 * This component now acts as a wrapper for the new AdminPersonaData component
 * to maintain backward compatibility while using the new persona-based system.
 * 
 * The old mock data system has been completely replaced by the persona system
 * which provides:
 * - Pre-defined, realistic financial personas
 * - Consistent data across demos
 * - Better net worth trends and charts
 * - Advanced validation and monitoring
 */
const AdminMockData: React.FC<AdminMockDataProps> = ({ isAdmin, currentUserId }) => {
  // This component now acts as a wrapper for the new AdminPersonaData component
  // to maintain backward compatibility while using the new persona system
  return (
    <AdminPersonaData isAdmin={isAdmin} currentUserId={currentUserId} />
  );
};

export default AdminMockData;