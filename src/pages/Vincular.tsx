import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Vincular() {
  const { codigo } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (codigo) {
      localStorage.setItem('vendpro_seller_code', codigo);
      alert(`Vínculo com vendedor ${codigo} realizado com sucesso!`);
      navigate('/');
    }
  }, [codigo, navigate]);

  return <div className="p-6">Vinculando...</div>;
}
