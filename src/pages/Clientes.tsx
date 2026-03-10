import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Customer } from '../types';
import { Users, Edit, Trash2, Plus } from 'lucide-react';

export default function Clientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      if (!supabase) return;
      const { data, error } = await supabase.from('customers').select('*');
      if (error) console.error(error);
      else setCustomers(data || []);
      setLoading(false);
    }
    fetchCustomers();
  }, []);

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Novo Cliente
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left">Nome</th>
              <th className="p-4 text-left">Telefone</th>
              <th className="p-4 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id} className="border-t">
                <td className="p-4">{customer.empresa}</td>
                <td className="p-4">{customer.telefone}</td>
                <td className="p-4 flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-primary"><Edit size={18} /></button>
                  <button className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
