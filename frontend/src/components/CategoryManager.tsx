'use client';

import { useState } from 'react';
import api from '@/services/api';

interface Category {
  category_id: string;
  category_name: string;
}

interface CategoryManagerProps {
  categories: Category[];
  workspaceId: string;
  onCategoryCreated: (newCategory: Category) => void;
}

export default function CategoryManager({ categories, workspaceId, onCategoryCreated }: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const response = await api.post('/categories', {
        workspace_id: workspaceId,
        category_name: newCategoryName,
      });
      onCategoryCreated(response.data);
      setNewCategoryName('');
    } catch (error) {
      console.error('Failed to create category', error);
      // You might want to show an error message to the user
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Gerenciar Categorias</h2>
      <div className="rounded-lg bg-white p-6 shadow-md">
        {/* Form to add new category */}
        <form onSubmit={handleCreateCategory} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nome da nova categoria"
            className="flex-grow rounded-md border-gray-300 shadow-sm"
          />
          <button type="submit" className="rounded-md bg-blue-600 py-2 px-4 text-white hover:bg-blue-700">
            Adicionar
          </button>
        </form>

        {/* List of existing categories */}
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.category_id} className="flex justify-between rounded-md bg-gray-100 p-2">
              <span>{c.category_name}</span>
              {/* Edit/Delete buttons will go here */}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
