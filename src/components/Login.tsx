import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { ChefHat, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Credenciales incorrectas');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden">
      {/* Left Side - Image & Overlay */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          }}
        />
        <div className="absolute inset-0 bg-slate-900/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/60 via-orange-500/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute top-12 left-12 text-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg"
            >
              <ChefHat className="w-8 h-8 text-white" />
            </motion.div>
            <span className="text-3xl font-bold tracking-wide">Kitch One</span>
          </div>
          <p className="text-white/80 max-w-md text-lg leading-relaxed font-light">
            Gestiona tu restaurante con elegancia y eficiencia. El sabor de la excelencia comienza en la cocina.
          </p>
        </motion.div>

        {/* Bottom decorative stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute bottom-12 left-12 right-12 flex gap-6"
        >
          {[
            { label: 'Órdenes diarias', value: '120+' },
            { label: 'Clientes satisfechos', value: '98%' },
            { label: 'Platillos', value: '85+' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/10">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-white/60 text-sm">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Wave Separator */}
      <div className="hidden lg:block absolute top-0 bottom-0 left-[50%] -translate-x-[45%] z-10 h-full w-32 pointer-events-none">
        <svg viewBox="0 0 200 800" className="h-full w-full text-white fill-current" preserveAspectRatio="none" style={{ filter: 'drop-shadow(-10px 0 20px rgba(0,0,0,0.06))' }}>
          <path d="M0,0 C80,250 150,400 60,800 L200,800 L200,0 Z" />
        </svg>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-2">Bienvenido</h2>
            <p className="text-slate-400">Ingresa a tu cuenta para continuar</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors duration-300" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="usuario@kitchone.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-300 bg-slate-50/50 focus:bg-white font-medium"
                  required
                  disabled={loading}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors duration-300" />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-300 bg-slate-50/50 focus:bg-white font-medium"
                  required
                  disabled={loading}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-end"
            >
              <a href="#" className="text-sm font-medium text-slate-400 hover:text-orange-500 transition-colors duration-300">
                ¿Olvidaste tu contraseña?
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>INGRESAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-2 mt-8"
            >
              <p className="text-sm text-slate-400">¿No tienes cuenta?</p>
              <a href="#" className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">
                Regístrate
              </a>
            </motion.div>
          </form>

          {/* Error Toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="fixed bottom-6 right-6 bg-white border border-red-200 text-red-700 px-5 py-4 rounded-2xl shadow-xl shadow-red-100/50 flex items-center gap-3 max-w-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-sm">Error de Acceso</p>
                  <p className="text-xs text-red-500/80">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
