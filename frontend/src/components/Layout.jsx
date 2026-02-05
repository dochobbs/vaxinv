import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/receive', label: 'Receive' },
  { to: '/administer', label: 'Administer' },
  { to: '/adjustments', label: 'Adjustments' },
  { to: '/temperature', label: 'Temperature' },
  { to: '/reports', label: 'Reports' },
];

const adminItems = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/vaccines', label: 'Vaccines' },
  { to: '/admin/locations', label: 'Locations' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-blue-600 mr-4">VaxInv</span>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded text-sm font-medium ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin && (
              <>
                <span className="text-gray-300 mx-1">|</span>
                {adminItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded text-sm font-medium ${
                        isActive ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name} ({user?.role})</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
