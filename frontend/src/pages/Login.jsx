import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [mode, setMode] = useState('pin');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginPin, login } = useAuth();
  const navigate = useNavigate();

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (pin.length < 6) { toast.error('PIN must be at least 6 digits'); return; }
    setLoading(true);
    try {
      await loginPin(pin);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Username and password required'); return; }
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-2">VaxInv</h1>
        <p className="text-center text-gray-500 mb-6">Vaccine Inventory Management</p>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('pin')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'pin' ? 'bg-white shadow text-blue-700' : 'text-gray-500'
            }`}
          >
            PIN Login
          </button>
          <button
            onClick={() => setMode('password')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'password' ? 'bg-white shadow text-blue-700' : 'text-gray-500'
            }`}
          >
            Admin Login
          </button>
        </div>

        {mode === 'pin' ? (
          <form onSubmit={handlePinLogin}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter your PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="6+ digit PIN"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-2xl text-center tracking-widest mb-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              autoFocus
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
