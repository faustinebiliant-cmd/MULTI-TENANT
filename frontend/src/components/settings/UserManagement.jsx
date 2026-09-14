// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - User Management (redirect stub)
// ============================================================

import { Navigate } from 'react-router-dom';

// Legacy path — staff management lives at /staff now
const UserManagement = () => <Navigate to="/staff" replace />;

export default UserManagement;