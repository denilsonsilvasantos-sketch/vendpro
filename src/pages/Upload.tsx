import React from 'react';
import { Upload } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Upload de Catálogo</h1>
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <Upload size={48} className="text-primary mb-4" />
        <h2 className="text-lg font-bold">Arraste seu arquivo aqui</h2>
        <p className="text-slate-500">ou clique para selecionar o arquivo do catálogo</p>
        <button className="mt-6 bg-primary text-white px-6 py-2 rounded-lg">Selecionar Arquivo</button>
      </div>
    </div>
  );
}
