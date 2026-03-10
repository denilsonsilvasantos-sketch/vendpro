import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product } from '../types';
import { AlertTriangle, Edit } from 'lucide-react';

export default function Pendencias() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPendencies() {
      if (!supabase) return;
      const { data, error } = await supabase.from('products').select('*').or('categoria_pendente.eq.true,imagem_pendente.eq.true');
      if (error) console.error(error);
      else setProducts(data || []);
      setLoading(false);
    }
    fetchPendencies();
  }, []);

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="text-yellow-500" /> Pendências</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-bold">{product.nome}</h3>
              <p className="text-sm text-slate-500">SKU: {product.sku}</p>
              <div className="flex gap-2 mt-2">
                {product.categoria_pendente && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Categoria Pendente</span>}
                {product.imagem_pendente && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Imagem Pendente</span>}
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:text-primary"><Edit size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
