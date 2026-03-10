import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product } from '../types';
import { Package, Edit, Trash2, Plus } from 'lucide-react';

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      if (!supabase) return;
      const { data, error } = await supabase.from('products').select('*');
      if (error) console.error(error);
      else setProducts(data || []);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Novo Produto
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
            <img src={product.imagem || 'https://via.placeholder.com/150'} alt={product.nome} className="w-16 h-16 rounded-lg object-cover" />
            <div className="flex-1">
              <h3 className="font-bold">{product.nome}</h3>
              <p className="text-sm text-slate-500">R$ {product.preco_unitario}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-primary"><Edit size={18} /></button>
              <button className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
