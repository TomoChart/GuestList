import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const LoginPage: React.FC = () => {
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'hostess' | 'admin' | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await axios.post('/api/auth/login', { role, pin });
      if (response.status === 200) {
        router.push(role === 'hostess' ? '/kiosk' : '/admin');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Invalid PIN');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <div className="flex space-x-4 mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => setRole('hostess')}
        >
          Hostess
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={() => setRole('admin')}
        >
          Admin
        </button>
      </div>
      {role && (
        <div className="flex flex-col items-center">
          <input
            type="password"
            className="border px-4 py-2 rounded mb-4"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;