import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginPage } from './pages/Auth/Login';
import { SignupPage } from './pages/Auth/Signup';
import { HomePage } from './pages/Home';
import { ProfilePage } from './pages/Profile';
import { ProfileViewPage } from './pages/ProfileView';
import { NetworkPage } from './pages/Network';
import { MessagesPage } from './pages/Messages';
import { NotificationsPage } from './pages/Notifications';
import { JobsPage } from './pages/Jobs';
import { SearchPage } from './pages/Search';

function AuthenticatedLayout() {
  const location = useLocation();
  const isMessagesPage = location.pathname === '/messages';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#F3F2EF]">
          <div className={`max-w-7xl mx-auto w-full flex ${isMessagesPage ? '' : 'gap-6'} ${isMessagesPage ? 'h-full' : 'py-6 px-0 md:px-6'}`}>
            <div className="flex-1 min-w-0">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:userId" element={<ProfileViewPage />} />
                <Route path="/network" element={<NetworkPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
            {!isMessagesPage && <RightSidebar />}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <AuthenticatedLayout />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
