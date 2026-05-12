import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  productName?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  productName
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Eliminar Producto
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          {productName ? (
            <>
              ¿Estás seguro de que quieres eliminar el producto <strong>"{productName}"</strong>? 
              Esta acción eliminará permanentemente el producto del sistema.
            </>
          ) : (
            '¿Estás seguro de que quieres eliminar este producto? Esta acción eliminará permanentemente el producto del sistema.'
          )}
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
} 