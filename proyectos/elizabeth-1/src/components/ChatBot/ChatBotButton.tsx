import { useState } from 'react';
import { MessageCircle, X, Bot } from 'lucide-react';
import ChatBot from './ChatBot';

interface ChatBotButtonProps {
  isSidebar?: boolean;
}

export default function ChatBotButton({ isSidebar = false }: ChatBotButtonProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const buttonClasses = isSidebar
    ? `w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 font-bold`
    : `fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-110 z-40 flex items-center justify-center group pointer-events-auto ${
        isOpen ? 'scale-110 rotate-45' : ''
      }`;

  const buttonContent = isSidebar ? (
    <>
      <MessageCircle className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium">Asistente IA</span>
      {unreadCount > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 animate-pulse">
          {unreadCount}
        </span>
      )}
    </>
  ) : (
    <>
      {isOpen ? (
        <X className="w-6 h-6" />
      ) : (
        <>
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
        style={!isSidebar ? { touchAction: 'manipulation' } : {}}
      >
        {buttonContent}
      </button>

      {/* Indicador de notificación solo para versión flotante */}
      {!isSidebar && !isOpen && (
        <div className="fixed bottom-24 right-8 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm shadow-lg z-30 pointer-events-none">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span>¡Necesitas ayuda?</span>
          </div>
        </div>
      )}

      {/* Componente del chatbot */}
      <ChatBot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
