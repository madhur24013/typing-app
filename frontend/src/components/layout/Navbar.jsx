import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaFire } from 'react-icons/fa';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                Typing Practice
              </Link>
            </div>
            
            {/* Desktop menu */}
            {isAuthenticated && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className="border-transparent text-gray-500 hover:border-blue-500 hover:text-blue-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/practice"
                  className="border-transparent text-gray-500 hover:border-blue-500 hover:text-blue-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Practice
                </Link>
                <Link
                  to="/documents"
                  className="border-transparent text-gray-500 hover:border-blue-500 hover:text-blue-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  My Documents
                </Link>
                <Link
                  to="/statistics"
                  className="border-transparent text-gray-500 hover:border-blue-500 hover:text-blue-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Statistics
                </Link>
                <Link
                  to="/progress"
                  className="border-transparent text-gray-500 hover:border-blue-500 hover:text-blue-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Progress
                </Link>
                <Link
                  to="/streaks"
                  className="border-transparent text-gray-500 hover:border-blue-500 hover:text-blue-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  <FaFire className="mr-1 text-orange-500" />
                  Streaks
                </Link>
              </div>
            )}
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <div className="flex items-center">
                <span className="text-gray-700 mr-4">Hello, {user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="btn btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {menuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="bg-gray-50 border-blue-500 text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/practice"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Practice
                </Link>
                <Link
                  to="/documents"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  My Documents
                </Link>
                <Link
                  to="/statistics"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Statistics
                </Link>
                <Link
                  to="/progress"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Progress
                </Link>
                <Link
                  to="/streaks"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <FaFire className="mr-1 text-orange-500" />
                    Streaks
                  </div>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-red-500 hover:text-red-700 block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 