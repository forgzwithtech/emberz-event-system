import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import LoginScreen from './screens/LoginScreen';
import EventsListScreen from './screens/EventsListScreen';
import EventDetailsScreen from './screens/EventDetailsScreen';
import type { JSX } from 'react';

// A simple wrapper to protect dashboard routes
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('emberz_admin_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginScreen />} />

        {/* Protected Dashboard Routes (Wrapped in the Layout) */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default view when hitting '/' */}
          <Route index element={<EventsListScreen />} />
          {/* Details view for a specific event */}
          <Route path="events/:id" element={<EventDetailsScreen />} />
        </Route>

        {/* Catch-all route to redirect unknown URLs */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;