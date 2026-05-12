import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';

interface InputFieldProps {
  id: string;
  name: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ElementType;
}

const InputField = ({ id, name, type, placeholder, value, onChange, icon: Icon }: InputFieldProps) => (
  <div className="relative">
    <span className="absolute inset-y-0 left-0 flex items-center pl-4">
      <Icon className="h-5 w-5 text-gray-400" />
    </span>
    <input
      id={id}
      name={name}
      type={type}
      required
      value={value}
      onChange={onChange}
      className="block w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:focus:bg-gray-700 transition"
      placeholder={placeholder}
    />
  </div>
);

interface SignInFormProps {
  loginData: { username: string; password: string };
  handleLoginChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLoginSubmit: (e: React.FormEvent) => Promise<void>;
  error: string;
  isLoading: boolean;
}

const SignInForm = ({
  loginData,
  handleLoginChange,
  handleLoginSubmit,
  error,
  isLoading,
}: SignInFormProps) => (
  <div>
    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Iniciar Sesión</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Usa tu cuenta para continuar</p>
    
    {error && (
      <div className="flex items-center space-x-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
      </div>
    )}

    <form onSubmit={handleLoginSubmit} className="space-y-5">
      <InputField id="username" name="username" type="text" placeholder="Usuario o Email" value={loginData.username} onChange={handleLoginChange} icon={User} />
      <InputField id="password" name="password" type="password" placeholder="Contraseña" value={loginData.password} onChange={handleLoginChange} icon={Lock} />
      <a href="#" className="block text-sm text-teal-600 hover:text-teal-500 text-right font-medium">
        ¿Olvidaste tu contraseña?
      </a>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 mt-4 font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 transition-all duration-300 transform hover:scale-105"
      >
        {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
      </button>
    </form>
  </div>
);

export default function LoginForm() {
  const { login } = useApp();
  
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const success = await login(loginData.username, loginData.password);
    if (!success) {
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
    setIsLoading(false);
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };
  
  interface OverlayProps {
    title: string;
    description: string;
  }

  const Overlay = ({ title, description }: OverlayProps) => (
    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
        <rect x="8" y="20" width="48" height="32" rx="8" fill="#fff" stroke="#14b8a6" strokeWidth="3"/>
        <path d="M20 20V16C20 10.4772 24.4772 6 30 6C35.5228 6 40 10.4772 40 16V20" stroke="#14b8a6" strokeWidth="3"/>
        <ellipse cx="24" cy="36" rx="2" ry="2.5" fill="#14b8a6"/>
        <ellipse cx="40" cy="36" rx="2" ry="2.5" fill="#14b8a6"/>
        <path d="M26 44C27.3333 46 32.6667 46 34 44" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 28H56" stroke="#14b8a6" strokeWidth="2"/>
      </svg>
      <h2 className="text-3xl lg:text-4xl font-bold mb-4">{title}</h2>
      <p className="text-base lg:text-lg mb-8 leading-relaxed max-w-sm">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="container mx-auto max-w-lg lg:max-w-4xl">
        <div className="flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden min-h-[600px]">
          
          <div className="w-full lg:w-1/2 p-8 lg:p-12 flex items-center justify-center order-2 lg:order-1">
            <div className="w-full max-w-sm">
              <SignInForm 
                loginData={loginData}
                handleLoginChange={handleLoginChange}
                handleLoginSubmit={handleLoginSubmit}
                error={error}
                isLoading={isLoading}
              />
            </div>
          </div>

          <div className="w-full lg:w-1/2 p-8 bg-gradient-to-br from-teal-700 to-cyan-800 text-white flex items-center justify-center order-1 lg:order-2">
            <Overlay
              title="FACTUSSOFT"
              description="solo los administradores pueden tener acceso completo al sistema..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}