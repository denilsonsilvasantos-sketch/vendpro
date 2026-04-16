import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { X, Eye, ShoppingBag, TrendingUp, AlertTriangle, PackageSearch, Calendar, CreditCard, Filter, Trash2, AlertCircle, Search, Send, Edit2, Check, Plus, FileSpreadsheet, Keyboard, Upload, User as UserIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { getCartItemPrice } from '../utils/prices';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateInput(dateStr: string) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

export default function Pedidos({ companyId, role, user }: { companyId: string | null, role?: string | null, user?: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [removedItems, setRemovedItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [abcCurve, setAbcCurve] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number>(0);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [editingPayment, setEditingPayment] = useState(false);
  const [tempPaymentMethod, setTempPaymentMethod] = useState('');
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [tempCustomerId, setTempCustomerId] = useState('');
  const [tempDiscountValue, setTempDiscountValue] = useState(0);
  const [tempDiscountType, setTempDiscountType] = useState<'fixed' | 'percentage'>('fixed');

  const [newSku, setNewSku] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [addingItemLoading, setAddingItemLoading] = useState(false);
  const [foundProductName, setFoundProductName] = useState<string | null>(null);
  const [searchingSku, setSearchingSku] = useState(false);

  // --- Novas States para Digitação Manual e Importação ---
  const [isTypingModalOpen, setIsTypingModalOpen] = useState(false);
  const [typingItems, setTypingItems] = useState<any[]>([]);
  const [typingSku, setTypingSku] = useState('');
  const [typingQty, setTypingQty] = useState<string>('1');
  const [typingPrice, setTypingPrice] = useState<string>('');
  const [typingProduct, setTypingProduct] = useState<any>(null);
  const [typingBrandId, setTypingBrandId] = useState('');
  const [typingSellers, setTypingSellers] = useState<any[]>([]);
  const [typingCustomerId, setTypingCustomerId] = useState('');
  const [typingSellerId, setTypingSellerId] = useState(role === 'seller' ? user?.id : '');
  const [typingStep, setTypingStep] = useState<'items' | 'config'>('items');
  const [importingOrders, setImportingOrders] = useState(false);

  const skuInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const orderImportRef = useRef<HTMLInputElement>(null);

  // Efeito para buscar produto na digitação manual
  useEffect(() => {
    const searchTypingProduct = async () => {
      if (!typingSku || !supabase || !companyId) {
        setTypingProduct(null);
        setTypingPrice('');
        return;
      }
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('sku', typingSku.trim().toUpperCase());
      
      if (typingBrandId) query = query.eq('brand_id', typingBrandId);

      const { data } = await query.maybeSingle();
      
      if (data) {
        setTypingProduct(data);
        setTypingPrice(data.preco_unitario?.toString() || '');
        if (!typingBrandId) setTypingBrandId(data.brand_id);
      } else {
        setTypingProduct(null);
      }
    };

    const timer = setTimeout(searchTypingProduct, 300);
    return () => clearTimeout(timer);
  }, [typingSku, companyId, typingBrandId]);

  const handleManualKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      if (target.name === 'sku' && typingProduct) {
        // Se deu tab no SKU e achou produto, vai pra Qty
        e.preventDefault();
        qtyInputRef.current?.focus();
      } else if (target.name === 'qty') {
        // Se deu tab na Qty, vai pro Preço
        e.preventDefault();
        priceInputRef.current?.focus();
      } else if (target.name === 'price') {
        // Se deu tab no Preço, confirma e volta pro SKU
        e.preventDefault();
        handleAddTypingItem();
      }
    }
  };

  const handleAddTypingItem = () => {
    if (!typingProduct && typingSku) {
      alert('Produto não encontrado para o SKU informado.');
      return;
    }
    if (!typingProduct) return;

    const newItem = {
      product_id: typingProduct.id,
      sku: typingProduct.sku,
      nome: typingProduct.nome,
      brand_id: typingProduct.brand_id,
      quantidade: parseInt(typingQty) || 1,
      preco_unitario: parseFloat(typingPrice) || typingProduct.preco_unitario || 0,
    };

    setTypingItems(prev => [...prev, newItem]);
    
    // Reset fields
    setTypingSku('');
    setTypingQty('1');
    setTypingPrice('');
    setTypingProduct(null);
    
    // Voltar o foco para o SKU
    setTimeout(() => skuInputRef.current?.focus(), 10);
  };

  const handleSaveTypedOrder = async () => {
    if (!supabase || typingItems.length === 0) return;
    if (!typingCustomerId) {
      alert('Selecione um cliente antes de finalizar.');
      return;
    }
    setIsProcessing(true);

    try {
      const selectedCust = customers.find(c => c.id === typingCustomerId);
      const subtotal = typingItems.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0);

      const orderData = {
        company_id: companyId,
        customer_id: typingCustomerId,
        seller_id: typingSellerId || null,
        brand_id: typingBrandId || typingItems[0].brand_id,
        subtotal: subtotal,
        total: subtotal,
        status: 'typed',
        client_name: selectedCust?.nome_empresa || selectedCust?.nome || 'Manual',
        created_at: new Date().toISOString()
      };

      const { data: order, error: orderErr } = await supabase.from('orders').insert([orderData]).select().single();
      if (orderErr) throw orderErr;

      const itemsToInsert = typingItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        sku: item.sku,
        nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.quantidade * item.preco_unitario,
        company_id: companyId
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      setIsTypingModalOpen(false);
      setTypingItems([]);
      setTypingStep('items');
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar pedido: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExcelOrderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !companyId) return;
    setImportingOrders(true);
    e.target.value = '';

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      const skus = Array.from(new Set(rows.map(r => {
        const val = Object.values(r)[0];
        return val ? String(val).trim().toUpperCase() : null;
      }).filter(Boolean)));
      
      if (skus.length === 0) {
        alert('Nenhum SKU encontrado na primeira coluna do arquivo.');
        return;
      }

      // Batch fetch products by SKU
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .in('sku', skus);
      
      if (!products || products.length === 0) {
        alert('Nenhum SKU do arquivo foi encontrado no banco de dados.');
        return;
      }

      const productMap = new Map(products.map((p: any) => [p.sku, p]));
      const brandId = products[0].brand_id; // Assume same brand for simplicity unless mixed

      const validItems = rows.map(row => {
        const values = Object.values(row);
        const sku = String(values[0]).trim().toUpperCase();
        const product = productMap.get(sku);
        if (!product) return null;

        const qty = parseInt(String(values[1])) || 1;
        const price = parseFloat(String(values[2])) || product.preco_unitario || 0;

        return {
          product_id: product.id,
          sku: product.sku,
          nome: product.nome,
          quantidade: qty,
          preco_unitario: price,
          subtotal: qty * price,
          company_id: companyId
        };
      }).filter(Boolean);

      if (validItems.length === 0) {
        alert('Nenhum item válido encontrado no Excel.');
        return;
      }

      const subtotal = validItems.reduce((acc, i: any) => acc + i.subtotal, 0);

      const orderData = {
        company_id: companyId,
        brand_id: brandId,
        subtotal: subtotal,
        total: subtotal,
        status: 'draft',
        client_name: 'Importado (Sem Cliente)',
        created_at: new Date().toISOString()
      };

      const { data: order, error: orderErr } = await supabase.from('orders').insert([orderData]).select().single();
      if (orderErr) throw orderErr;

      const itemsWithOrderId = validItems.map(i => ({ ...i, order_id: order.id }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsWithOrderId);
      if (itemsErr) throw itemsErr;

      alert('Pedido importado como rascunho com sucesso!');
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao importar Excel: ' + err.message);
    } finally {
      setImportingOrders(false);
    }
  };

  useEffect(() => {
    const searchProduct = async () => {
      if (!newSku || !supabase || !companyId) {
        setFoundProductName(null);
        return;
      }
      setSearchingSku(true);
      let query = supabase
        .from('products')
        .select('nome')
        .eq('company_id', companyId)
        .eq('sku', newSku);
      
      if (selectedOrder?.brand_id) {
        query = query.eq('brand_id', selectedOrder.brand_id);
      }

      const { data } = await query.maybeSingle();
      
      if (data) {
        setFoundProductName(data.nome);
      } else {
        setFoundProductName('SKU não encontrado');
      }
      setSearchingSku(false);
    };

    const timer = setTimeout(searchProduct, 600);
    return () => clearTimeout(timer);
  }, [newSku, companyId, selectedOrder?.brand_id]);

  async function fetchOrders(silent = false) {
    if (!supabase || companyId === null) return;
    if (!silent) setLoading(true);
    console.log('fetchOrders - role:', role, 'user.id:', user?.id, 'companyId:', companyId);

    let query = supabase
      .from('orders')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    console.log('fetchOrders - Iniciando busca para empresa:', companyId);

    if (role === 'seller' && user?.id) {
      console.log('fetchOrders - Filtrando por vendedor:', user.id);
      query = query.eq('seller_id', user.id);
    } else if (role === 'customer' && user?.id) {
      console.log('fetchOrders - Filtrando por cliente:', user.id);
      query = query.eq('customer_id', user.id);
    }

    const { data: ordersData, error: ordersError } = await query;
    
    if (ordersError) {
      console.error('Erro na consulta de pedidos:', ordersError);
      setLoading(false);
      return;
    }

    // Fetch customers for this company to merge with orders
    const { data: customersData } = await supabase
      .from('customers')
      .select('id, nome, nome_empresa, whatsapp')
      .eq('company_id', companyId);
    
    setCustomers(customersData || []);

    // Merge orders with customer data
    const mergedOrders = (ordersData || []).map(order => {
      const customer = (customersData || []).find(c => c.id === order.customer_id);
      return { ...order, customer };
    });

    setOrders(mergedOrders);
    
    if (role === 'customer' && mergedOrders.length > 0) {
      fetchAbcCurve(mergedOrders.map((o: any) => o.id));
    }

    // Fetch brands for filtering
    const { data: brandsData } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
    setBrands(brandsData || []);
    
    if (!silent) setLoading(false);
  }

  async function fetchAbcCurve(orderIds: string[]) {
    if (!supabase || orderIds.length === 0) return;
    const { data, error } = await supabase
      .from('order_items')
      .select('product_id, nome, sku, quantidade, subtotal')
      .in('order_id', orderIds);
    if (error) return;
    const grouped = data.reduce((acc: any, item: any) => {
      if (!acc[item.product_id]) acc[item.product_id] = { nome: item.nome, sku: item.sku, total_qtd: 0, total_valor: 0 };
      acc[item.product_id].total_qtd += item.quantidade;
      acc[item.product_id].total_valor += Number(item.subtotal);
      return acc;
    }, {});
    setAbcCurve(Object.values(grouped).sort((a: any, b: any) => b.total_valor - a.total_valor).slice(0, 5));
  }

  useEffect(() => {
    fetchOrders();
    if (!supabase || companyId === null) return;
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, () => fetchOrders(true))
      .subscribe();
    return () => { if (supabase && channel) supabase.removeChannel(channel); };
  }, [companyId, role, user?.id]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterBrand && o.brand_id !== filterBrand) return false;
      if (filterDateFrom) {
        const from = new Date(filterDateFrom + 'T00:00:00');
        if (new Date(o.created_at) < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo + 'T23:59:59');
        if (new Date(o.created_at) > to) return false;
      }
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        const clientName = (o.customers?.nome || o.client_name || '').toLowerCase();
        if (!clientName.includes(s)) return false;
      }
      return true;
    });
  }, [orders, filterStatus, filterDateFrom, filterDateTo, filterSearch]);

  const hasActiveFilters = filterStatus || filterBrand || filterDateFrom || filterDateTo || filterSearch;

  function clearFilters() {
    setFilterStatus('');
    setFilterBrand('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterSearch('');
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) { alert('Erro ao atualizar status.'); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
  };

  const handlePaymentMethodChange = async (orderId: string, newMethod: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('orders').update({ payment_method: newMethod }).eq('id', orderId);
    if (error) { alert('Erro ao atualizar pagamento.'); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_method: newMethod } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, payment_method: newMethod }));
    setEditingPayment(false);
  };

  const handleCustomerChange = async (orderId: string, newCustomerId: string) => {
    if (!supabase || !newCustomerId) return;
    
    const newCustomer = customers.find(c => c.id === newCustomerId);
    
    const updateData: any = { 
      customer_id: newCustomerId,
      client_name: newCustomer?.nome || ''
    };

    // Se for vendedor, garante que o pedido esteja vinculado a ele para evitar problemas de RLS
    if (role === 'seller' && user?.id) {
      updateData.seller_id = user.id;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) { 
      console.error('Erro ao atualizar cliente:', error);
      alert('Erro ao atualizar cliente: ' + error.message); 
      return; 
    }

    if (!data) {
      alert('Não foi possível atualizar o pedido. Verifique suas permissões.');
      return;
    }
    
    const fullData = { ...data, customer: newCustomer };
    setOrders(prev => prev.map(o => o.id === orderId ? fullData : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(fullData);
    setEditingCustomer(false);
  };

  const handleDateChange = async (orderId: string, newDate: string) => {
    if (!supabase || !newDate) return;
    
    try {
      const dateToSave = new Date(newDate).toISOString();

      const { error } = await supabase.from('orders').update({ created_at: dateToSave }).eq('id', orderId);
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, created_at: dateToSave } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev: any) => ({ ...prev, created_at: dateToSave }));
      setEditingDate(false);
    } catch (err: any) {
      alert('Erro ao atualizar data: ' + err.message);
    }
  };

  const handleDiscountChange = async (orderId: string, value: number, type: 'fixed' | 'percentage') => {
    if (!supabase || !selectedOrder) return;
    
    const subtotal = Number(selectedOrder.subtotal || selectedOrder.total || 0);
    let discountAmount = 0;
    if (type === 'percentage') {
      discountAmount = (subtotal * value) / 100;
    } else {
      discountAmount = value;
    }
    
    const newTotal = Math.max(0, subtotal - discountAmount);

    const { error } = await supabase.from('orders').update({ 
      discount_value: value, 
      discount_type: type,
      total: newTotal
    }).eq('id', orderId);

    if (error) { alert('Erro ao atualizar desconto.'); return; }
    
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, discount_value: value, discount_type: type, total: newTotal } : o));
    setSelectedOrder((prev: any) => ({ ...prev, discount_value: value, discount_type: type, total: newTotal }));
    setEditingDiscount(false);
  };

  const handleAddItem = async () => {
    if (!supabase || !selectedOrder || !newSku || newQuantity <= 0) return;
    setAddingItemLoading(true);

    try {
      // 1. Find product by SKU
      let query = supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('sku', newSku);
      
      if (selectedOrder.brand_id) {
        query = query.eq('brand_id', selectedOrder.brand_id);
      }

      const { data: product, error: productError } = await query.single();

      if (productError || !product) {
        alert('Produto não encontrado com este SKU.');
        setAddingItemLoading(false);
        return;
      }

      // 2. Get brand margin (from the brand of the order)
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('margin_percentage')
        .eq('id', selectedOrder.brand_id)
        .single();

      const margin = brand?.margin_percentage || 0;
      const marginMultiplier = 1 + margin / 100;
      
      // Prepare product object with margin applied to base prices (matching productService logic)
      const productWithMargin = {
        ...product,
        preco_unitario: (product.preco_unitario || 0) * marginMultiplier,
        preco_box: (product.preco_box || 0) * marginMultiplier,
        quantity: newQuantity
      };
      
      const precoUnitario = getCartItemPrice(productWithMargin as any);
      const subtotalItem = precoUnitario * newQuantity;

      // 3. Insert into order_items
      const { data: newItem, error: insertError } = await supabase
        .from('order_items')
        .insert({
          order_id: selectedOrder.id,
          product_id: product.id,
          sku: product.sku,
          nome: product.nome,
          quantidade: newQuantity,
          preco_unitario: precoUnitario,
          subtotal: subtotalItem,
          company_id: companyId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir item:', insertError);
        alert(`Erro ao adicionar item: ${insertError.message}`);
        setAddingItemLoading(false);
        return;
      }

      // 4. Update order subtotal and total
      const currentSubtotal = Number(selectedOrder.subtotal) || Number(selectedOrder.total) || 0;
      const newSubtotal = currentSubtotal + subtotalItem;
      
      let newTotal = newSubtotal;
      if (selectedOrder.discount_value > 0) {
        if (selectedOrder.discount_type === 'percentage') {
          newTotal = newSubtotal * (1 - selectedOrder.discount_value / 100);
        } else {
          newTotal = newSubtotal - selectedOrder.discount_value;
        }
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          subtotal: newSubtotal,
          total: newTotal
        })
        .eq('id', selectedOrder.id);

      if (updateError) {
        console.error('Erro ao atualizar pedido:', updateError);
      }

      // 5. Update local state
      setOrderItems(prev => [...prev, newItem]);
      setSelectedOrder((prev: any) => ({
        ...prev,
        subtotal: newSubtotal,
        total: newTotal
      }));
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, subtotal: newSubtotal, total: newTotal } : o));
      
      // Reset form
      setNewSku('');
      setNewQuantity(1);
      setIsAddingItem(false);
      setFoundProductName(null);
      
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setAddingItemLoading(false);
    }
  };

  const handleNotifyCustomer = (order: any) => {
    const phone = order.customer?.whatsapp;
    if (!phone) {
      alert('Cliente não possui WhatsApp cadastrado.');
      return;
    }

    const statusMsg = {
      pending: 'está Pendente',
      typed: 'foi Digitado',
      finished: 'foi Finalizado',
      cancelled: 'foi Cancelado'
    }[order.status as string] || 'teve o status atualizado';

    const brandName = getBrandName(order.brand_id);
    const message = `Olá! Passando para avisar que seu pedido #${order.id.slice(-4)} da marca ${brandName} ${statusMsg}. Você pode acompanhar os detalhes no nosso aplicativo!`;
    
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    setItemsError(null);
    setOrderItems([]);
    setRemovedItems([]);
    setEditingDiscount(false);
    setEditingPayment(false);
    setEditingCustomer(false);
    setEditingDate(false);
    setTempDiscountValue(order.discount_value || 0);
    setTempDiscountType(order.discount_type || 'fixed');
    if (!supabase) { setItemsError('Conexão indisponível.'); setLoadingItems(false); return; }
    try {
      const [{ data: items, error: e1 }, { data: removed, error: e2 }] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', order.id),
        supabase.from('order_removed_items').select('*').eq('order_id', order.id),
      ]);
      if (e1) { setItemsError(`Erro: ${e1.message}`); return; }
      setOrderItems(items || []);
      setRemovedItems(removed || []);
    } catch (err: any) {
      setItemsError(`Erro inesperado: ${err.message}`);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!supabase || !selectedOrder) return;
    if (!confirm(`Remover "${item.nome}" do pedido?`)) return;
    setDeletingItem(item.id);
    try {
      const { error: insertErr } = await supabase.from('order_removed_items').insert({
        order_id: selectedOrder.id,
        product_id: item.product_id,
        nome: item.nome,
        sku: item.sku,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
        company_id: companyId
      });
      if (insertErr) throw insertErr;

      const { error: deleteErr } = await supabase.from('order_items').delete().eq('id', item.id);
      if (deleteErr) throw deleteErr;

      const newSubtotal = orderItems
        .filter(i => i.id !== item.id)
        .reduce((acc: number, i: any) => acc + Number(i.subtotal), 0);

      let newTotal = newSubtotal;
      if (selectedOrder.discount_value > 0) {
        if (selectedOrder.discount_type === 'percentage') {
          newTotal = newSubtotal * (1 - selectedOrder.discount_value / 100);
        } else {
          newTotal = newSubtotal - selectedOrder.discount_value;
        }
      }

      await supabase.from('orders').update({ 
        subtotal: newSubtotal,
        total: newTotal 
      }).eq('id', selectedOrder.id);

      setOrderItems(prev => prev.filter(i => i.id !== item.id));
      setRemovedItems(prev => [...prev, { ...item }]);
      setSelectedOrder((prev: any) => ({ ...prev, subtotal: newSubtotal, total: newTotal }));
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, subtotal: newSubtotal, total: newTotal } : o));
    } catch (err: any) {
      alert(`Erro ao remover item: ${err.message}`);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleUpdateItem = async (item: any, newQty: number, newPrice: number) => {
    if (!supabase || !selectedOrder || newQty <= 0 || newPrice < 0) return;
    if (newQty === item.quantidade && newPrice === Number(item.preco_unitario)) {
      setEditingItemId(null);
      return;
    }

    try {
      const newSubtotalItem = newPrice * newQty;
      
      const { error: itemError } = await supabase
        .from('order_items')
        .update({ 
          quantidade: newQty,
          preco_unitario: newPrice,
          subtotal: newSubtotalItem
        })
        .eq('id', item.id);

      if (itemError) throw itemError;

      const newItems = orderItems.map(i => i.id === item.id ? { ...i, quantidade: newQty, preco_unitario: newPrice, subtotal: newSubtotalItem } : i);
      const newSubtotal = newItems.reduce((acc: number, i: any) => acc + Number(i.subtotal), 0);
      
      let newTotal = newSubtotal;
      if (selectedOrder.discount_value > 0) {
        if (selectedOrder.discount_type === 'percentage') {
          newTotal = newSubtotal * (1 - selectedOrder.discount_value / 100);
        } else {
          newTotal = newSubtotal - selectedOrder.discount_value;
        }
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          subtotal: newSubtotal,
          total: newTotal 
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      setOrderItems(newItems);
      setSelectedOrder((prev: any) => ({ ...prev, subtotal: newSubtotal, total: newTotal }));
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, subtotal: newSubtotal, total: newTotal } : o));
      setEditingItemId(null);
    } catch (err: any) {
      alert(`Erro ao atualizar item: ${err.message}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!supabase) return;
    setIsProcessing(true);
    try {
      // Delete items first (though Supabase might have cascade, let's be safe)
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('order_removed_items').delete().eq('order_id', orderId);
      
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      setShowDeleteConfirm(null);
    } catch (err: any) {
      alert(`Erro ao excluir pedido: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeOrders = async () => {
    if (!supabase || selectedOrderIds.length < 2) return;
    setIsProcessing(true);
    
    try {
      const ordersToMerge = orders.filter(o => selectedOrderIds.includes(o.id));
      
      // Validation: Same customer and same brand
      const firstOrder = ordersToMerge[0];
      const sameCustomer = ordersToMerge.every(o => o.customer_id === firstOrder.customer_id);
      const sameBrand = ordersToMerge.every(o => o.brand_id === firstOrder.brand_id);
      
      if (!sameCustomer || !sameBrand) {
        alert('Para ajuntar pedidos, eles devem ser do mesmo cliente e da mesma marca.');
        setIsProcessing(false);
        return;
      }

      // Target order is the first one (usually the oldest due to sorting)
      const targetOrder = ordersToMerge[ordersToMerge.length - 1]; // Oldest
      const sourceOrderIds = selectedOrderIds.filter(id => id !== targetOrder.id);

      // 1. Move items from source orders to target order
      // We need to handle potential duplicate SKUs by summing quantities
      const { data: allItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', selectedOrderIds);
      
      if (itemsError) throw itemsError;

      // Group items by product_id/sku to sum them up
      const mergedItemsMap = new Map<string, any>();
      
      allItems?.forEach(item => {
        const key = `${item.product_id}_${JSON.stringify(item.variacoes || {})}`;
        if (mergedItemsMap.has(key)) {
          const existing = mergedItemsMap.get(key);
          existing.quantidade += item.quantidade;
          existing.subtotal = Number(existing.subtotal) + Number(item.subtotal);
        } else {
          mergedItemsMap.set(key, { ...item, order_id: targetOrder.id });
        }
      });

      // 2. Delete all current items of selected orders
      await supabase.from('order_items').delete().in('order_id', selectedOrderIds);

      // 3. Insert merged items
      const itemsToInsert = Array.from(mergedItemsMap.values()).map(item => {
        const { id, created_at, ...rest } = item;
        return rest;
      });
      
      const { error: insertError } = await supabase.from('order_items').insert(itemsToInsert);
      if (insertError) throw insertError;

      // 4. Update target order totals
      const newSubtotal = itemsToInsert.reduce((acc, i) => acc + Number(i.subtotal), 0);
      let newTotal = newSubtotal;
      if (targetOrder.discount_value > 0) {
        if (targetOrder.discount_type === 'percentage') {
          newTotal = newSubtotal * (1 - targetOrder.discount_value / 100);
        } else {
          newTotal = newSubtotal - targetOrder.discount_value;
        }
      }

      await supabase.from('orders').update({
        subtotal: newSubtotal,
        total: newTotal
      }).eq('id', targetOrder.id);

      // 5. Delete source orders
      await supabase.from('orders').delete().in('id', sourceOrderIds);

      // 6. Refresh local state
      await fetchOrders(true);
      setSelectedOrderIds([]);
      setIsSelectionMode(false);
      setShowMergeConfirm(false);
      
    } catch (err: any) {
      alert(`Erro ao ajuntar pedidos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async (order: any) => {
    if (!order || !orderItems.length || !supabase) return;
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF() as any;
      const margin = 14;
      let currentY = 15;

      // 1. Fetch Company Data
      const { data: company } = await supabase.from('companies').select('*').eq('id', companyId).single();

      // Header - logo
      if (company?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous"; // Tentativa de evitar problemas de CORS
          img.src = company.logo_url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          // Redimensionar mantendo proporção (largura fixa 30)
          const ratio = img.height / img.width;
          doc.addImage(img, 'PNG', margin, currentY, 30, 30 * ratio);
        } catch (e) {
          console.error('Error adding logo to PDF', e);
        }
      }

      // 2. Company Info
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(company?.nome || 'Minha Empresa', 50, currentY + 5);
      doc.setFontSize(8);
      if (company?.cnpj) doc.text(`CNPJ: ${company.cnpj}`, 50, currentY + 10);
      if (company?.telefone) doc.text(`TEL: ${company.telefone}`, 50, currentY + 14);

      // Order Title
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(`PEDIDO #${order.id.slice(-6).toUpperCase()}`, 196, currentY + 5, { align: 'right' });
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`DATA: ${formatDate(order.created_at)}`, 196, currentY + 10, { align: 'right' });
      doc.text(`MARCA: ${getBrandName(order.brand_id)}`, 196, currentY + 14, { align: 'right' });

      currentY += 25;

      // 3. Customer Info Section
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, currentY, 182, 22, 2, 2, 'FD');
      
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('DADOS DO CLIENTE', margin + 5, currentY + 6);
      
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(order.customer?.nome_empresa || order.customer?.nome || order.client_name || 'N/A', margin + 5, currentY + 12);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      if (order.customer?.cnpj) doc.text(`CNPJ: ${order.customer.cnpj}`, margin + 5, currentY + 17);
      if (order.customer?.whatsapp) doc.text(`TEL: ${order.customer.whatsapp}`, 100, currentY + 17);
      if (order.customer?.cidade) doc.text(`CIDADE: ${order.customer.cidade}`, margin + 5, currentY + 21);
      
      currentY += 28;

      // 4. Items Table
      autoTable(doc, {
        startY: currentY,
        head: [['CÓD/SKU', 'DESCRIÇÃO DO PRODUTO', { content: 'QNT', styles: { halign: 'center' } }, { content: 'VALOR UN.', styles: { halign: 'right' } }, { content: 'TOTAL', styles: { halign: 'right' } }]],
        body: orderItems.map(item => [
          item.sku,
          item.nome,
          { content: item.quantidade, styles: { halign: 'center' } },
          { content: `R$ ${Number(item.preco_unitario || 0).toFixed(2)}`, styles: { halign: 'right' } },
          { content: `R$ ${Number(item.subtotal || 0).toFixed(2)}`, styles: { halign: 'right' } }
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 3,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [30, 41, 59], // slate-800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50
        },
        margin: { left: margin, right: margin },
      });

      // 5. Summary Section
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const summaryWidth = 70;
      const summaryX = 130;

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Subtotal:', summaryX, finalY);
      doc.setTextColor(30, 41, 59);
      doc.text(`R$ ${Number(order.subtotal || order.total).toFixed(2)}`, 196, finalY, { align: 'right' });

      if (order.discount_value > 0) {
        const discountAmount = order.discount_type === 'percentage' 
          ? (Number(order.subtotal || 0) * order.discount_value) / 100
          : order.discount_value;
        
        doc.setTextColor(244, 63, 94); // rose-500
        doc.text(`Desconto (${order.discount_type === 'percentage' ? `${order.discount_value}%` : `R$ ${order.discount_value}`}):`, summaryX, finalY + 5);
        doc.text(`- R$ ${discountAmount.toFixed(2)}`, 196, finalY + 5, { align: 'right' });
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('TOTAL FINAL:', summaryX, finalY + 12);
      doc.setTextColor(236, 72, 153); // pink-500
      doc.text(`R$ ${Number(order.total).toFixed(2)}`, 196, finalY + 12, { align: 'right' });

      // Footer extra info
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      const totalItems = orderItems.length;
      const totalProducts = orderItems.reduce((acc, i) => acc + i.quantidade, 0);
      doc.text(`ITENS EXCLUSIVOS: ${totalItems} | TOTAL DE PRODUTOS: ${totalProducts}`, margin, finalY + 12);
      
      if (order.payment_method) {
        doc.text(`CONDIÇÃO DE PAGAMENTO: ${order.payment_method.toUpperCase()}`, margin, finalY + 16);
      }

      doc.save(`Pedido_${order.id.slice(-6).toUpperCase()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('Erro ao gerar PDF do pedido.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const statusLabel = (s: string) => ({ pending: 'Pendente', typed: 'Digitado', finished: 'Finalizado', cancelled: 'Cancelado' }[s] || s);
  const statusClass = (s: string) => ({
    pending: 'bg-amber-50 text-amber-600',
    typed: 'bg-blue-50 text-blue-600',
    finished: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-rose-50 text-rose-600',
  }[s] || 'bg-slate-100 text-slate-600');

  const canEditOrder = role === 'seller' || role === 'company';
  const showRemovedToCustomer = role === 'customer' && selectedOrder?.status === 'finished';

  const getBrandName = (brandId: string) =>
    brands.find((b: any) => b.id === brandId)?.name || '—';

  // Refresh sellers for manual typing
  useEffect(() => {
    async function fetchSellers() {
      if (!supabase || !companyId || role !== 'company') return;
      const { data } = await supabase.from('sellers').select('*').eq('company_id', companyId).eq('ativo', true).order('nome');
      setTypingSellers(data || []);
    }
    if (isTypingModalOpen) {
      fetchSellers();
    }
  }, [isTypingModalOpen, companyId, role]);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {role === 'customer' ? 'Meus Pedidos' : 'Pedidos'}
        </h1>
        <div className="flex items-center gap-2">
          {canEditOrder && (
            <>
              <button
                onClick={() => setIsTypingModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <Keyboard size={13} />
                Digitar Pedido
              </button>

              <button
                onClick={() => orderImportRef.current?.click()}
                disabled={importingOrders}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white text-slate-500 border border-slate-200 hover:border-primary/40 transition-all disabled:opacity-50"
              >
                {importingOrders ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                ) : (
                  <Upload size={13} />
                )}
                Importar Pedido
              </button>
              <input 
                type="file" 
                ref={orderImportRef} 
                onChange={handleExcelOrderImport} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
            </>
          )}

          {canEditOrder && (
            <button
              onClick={() => {
                if (isSelectionMode) {
                  if (selectedOrderIds.length >= 2) setShowMergeConfirm(true);
                  else { setIsSelectionMode(false); setSelectedOrderIds([]); }
                } else {
                  setIsSelectionMode(true);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${isSelectionMode ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'}`}
            >
              <Plus size={13} className={isSelectionMode ? 'rotate-45 transition-transform' : ''} />
              {isSelectionMode ? (selectedOrderIds.length >= 2 ? 'Confirmar Junção' : 'Cancelar') : 'Ajuntar Pedidos'}
            </button>
          )}
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${showFilters || hasActiveFilters ? 'bg-primary text-white border-primary shadow-md shadow-primary/30' : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'}`}
          >
            <Filter size={13} />
            Filtros
            {hasActiveFilters && <span className="w-4 h-4 bg-white text-primary rounded-full text-[9px] font-black flex items-center justify-center">{[filterStatus, filterBrand, filterDateFrom, filterDateTo, filterSearch].filter(Boolean).length}</span>}
          </button>
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-xs font-bold text-slate-500">
            {filteredOrders.length} pedidos
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Filtrar Pedidos</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[10px] font-bold text-rose-500 hover:underline">Limpar filtros</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {role !== 'customer' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Buscar cliente</label>
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={filterSearch}
                        onChange={e => setFilterSearch(e.target.value)}
                        placeholder="Nome do cliente..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-bold text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Marca</label>
                  <select
                    value={filterBrand}
                    onChange={e => setFilterBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-bold text-slate-900"
                  >
                    <option value="">Todas</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-bold text-slate-900"
                  >
                    <option value="">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="typed">Digitado</option>
                    <option value="finished">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data de</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Até</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary/40 font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {role === 'customer' && abcCurve.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Seus Mais Comprados</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {abcCurve.map((item: any, idx) => (
              <motion.div key={item.sku} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>{idx + 1}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.sku}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-2">{item.nome}</h3>
                <div className="flex justify-between items-end">
                  <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Qtd</p><p className="text-sm font-black text-slate-700">{item.total_qtd}</p></div>
                  <div className="text-right"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p><p className="text-sm font-black text-primary">R$ {item.total_valor.toFixed(2)}</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {isSelectionMode && <th className="p-6 text-left w-10"></th>}
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">ID</th>
                {role !== 'customer' && (
                  <>
                    <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Empresa</th>
                    <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Responsável</th>
                  </>
                )}
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Marca</th>
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Data</th>
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</th>
                {canEditOrder && <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden md:table-cell">Pagamento</th>}
                <th className="p-6 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-6 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order, index) => (
                <tr key={order.id} className={`hover:bg-slate-50/50 transition-colors ${selectedOrderIds.includes(order.id) ? 'bg-primary/5' : ''}`}>
                  {isSelectionMode && (
                    <td className="p-6">
                      <input 
                        type="checkbox" 
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    </td>
                  )}
                  <td className="p-6">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">#{filteredOrders.length - index}</span>
                  </td>
                  {role !== 'customer' && (
                    <>
                      <td className="p-6">
                        <button onClick={() => openOrderDetails(order)} className="text-xs font-bold text-slate-800 hover:text-primary transition-colors text-left uppercase">
                          {order.customer?.nome_empresa || '—'}
                        </button>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-bold text-slate-600 uppercase">
                          {order.customer?.nome || order.client_name || '—'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="p-6">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                      {getBrandName(order.brand_id)}
                    </span>
                  </td>
                  <td className="p-6 hidden sm:table-cell">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-300" />
                      {formatDate(order.created_at)}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className="font-black text-primary">R$ {Number(order.total || 0).toFixed(2)}</span>
                  </td>
                  {canEditOrder && (
                    <td className="p-6 hidden md:table-cell">
                      {order.payment_method
                        ? <span className="flex items-center gap-1.5 text-xs text-slate-600 font-bold"><CreditCard size={12} className="text-slate-300" />{order.payment_method}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                  )}
                  <td className="p-6">
                    {role === 'customer' ? (
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                    ) : (
                      <select value={order.status || 'pending'} onChange={e => handleStatusChange(order.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-none outline-none cursor-pointer ${statusClass(order.status)}`}>
                        <option value="pending">Pendente</option>
                        <option value="typed">Digitado</option>
                        <option value="finished">Finalizado</option>
                      </select>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEditOrder && (
                        <button 
                          onClick={() => setShowDeleteConfirm(order.id)} 
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <ShoppingBag size={40} />
            </div>
            <p className="text-slate-400 font-medium">{hasActiveFilters ? 'Nenhum pedido encontrado com esses filtros.' : 'Nenhum pedido encontrado.'}</p>
            {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-xs text-primary font-bold hover:underline">Limpar filtros</button>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Excluir Pedido?</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Esta ação não pode ser desfeita. Todos os itens deste pedido serão removidos permanentemente.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteOrder(showDeleteConfirm)}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showMergeConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMergeConfirm(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <Plus size={40} className="rotate-45" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Ajuntar {selectedOrderIds.length} Pedidos?</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Os itens de todos os pedidos selecionados serão combinados em um único pedido. Os pedidos originais serão excluídos.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowMergeConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleMergeOrders}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Processando...' : 'Sim, Ajuntar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelectedOrder(null); setEditingPayment(false); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">

              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Detalhes do Pedido</h3>
                    {canEditOrder && !editingCustomer && (
                      <button 
                        onClick={() => {
                          setTempCustomerId(selectedOrder.customer_id);
                          setEditingCustomer(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  {editingCustomer ? (
                    <div className="flex items-center gap-2 mt-2 max-w-md">
                      <select
                        value={tempCustomerId}
                        onChange={e => setTempCustomerId(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        <option value="">Selecionar Empresa</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nome_empresa || c.nome}
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={() => handleCustomerChange(selectedOrder.id, tempCustomerId)}
                        className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingCustomer(false)}
                        className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <p className="text-primary font-black text-xs uppercase tracking-tight">
                        {selectedOrder.customer?.nome_empresa || 'Empresa não definida'}
                      </p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        Responsável: {selectedOrder.customer?.nome || selectedOrder.client_name || '—'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDownloadPDF(selectedOrder)}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-xs hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                    ) : (
                      <FileSpreadsheet size={14} />
                    )}
                    Baixar PDF
                  </button>
                  <button onClick={() => { setSelectedOrder(null); setEditingPayment(false); setEditingCustomer(false); setEditingDate(false); }} className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                {loadingItems ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Carregando...</span>
                    </div>
                  </div>
                ) : itemsError ? (
                  <div className="p-12 text-center bg-rose-50 rounded-[32px] border-2 border-dashed border-rose-100">
                    <div className="flex flex-col items-center gap-4">
                      <AlertTriangle size={32} className="text-rose-500" />
                      <p className="text-rose-900 font-black">{itemsError}</p>
                      <button onClick={() => openOrderDetails(selectedOrder)} className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm">Tentar Novamente</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><PackageSearch size={10} /> Marca</p>
                        <p className="text-sm font-bold text-slate-700">{getBrandName(selectedOrder.brand_id)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Calendar size={10} /> Data</span>
                          {canEditOrder && !editingDate && (
                            <button 
                              onClick={() => {
                                setTempDate(selectedOrder.created_at ? selectedOrder.created_at.slice(0, 16) : '');
                                setEditingDate(true);
                              }}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </p>
                        {editingDate ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="datetime-local"
                              value={tempDate}
                              onChange={(e) => setTempDate(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                            <button 
                              onClick={() => handleDateChange(selectedOrder.id, tempDate)}
                              className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingDate(false)}
                              className="p-1.5 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-700">{formatDate(selectedOrder.created_at)}</p>
                        )}
                      </div>
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-3">Resumo de Valores</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal:</span>
                            <span className="font-bold text-slate-700">R$ {Number(selectedOrder.subtotal || selectedOrder.total || 0).toFixed(2)}</span>
                          </div>

                          {canEditOrder ? (
                            <div className="flex justify-between text-sm items-center gap-2">
                              <span className="text-rose-500 font-medium shrink-0">Desconto:</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={tempDiscountValue || ''}
                                  placeholder="0"
                                  onChange={e => setTempDiscountValue(Number(e.target.value))}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-right text-xs font-bold bg-white focus:outline-none focus:border-primary"
                                />
                                <select
                                  value={tempDiscountType}
                                  onChange={e => setTempDiscountType(e.target.value as any)}
                                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-primary"
                                >
                                  <option value="fixed">R$</option>
                                  <option value="percentage">%</option>
                                </select>
                                <button
                                  onClick={() => handleDiscountChange(selectedOrder.id, tempDiscountValue, tempDiscountType)}
                                  className="w-7 h-7 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                  title="Confirmar desconto"
                                >
                                  <Check size={13} />
                                </button>
                                {(tempDiscountValue > 0 || selectedOrder.discount_value > 0) && (
                                  <button
                                    onClick={() => { setTempDiscountValue(0); handleDiscountChange(selectedOrder.id, 0, tempDiscountType); }}
                                    className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-400 transition-colors"
                                    title="Remover desconto"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : selectedOrder.discount_value > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-rose-500">Desconto:</span>
                              <span className="font-bold text-rose-500">
                                - R$ {selectedOrder.discount_type === 'percentage'
                                  ? ((Number(selectedOrder.subtotal || 0) * selectedOrder.discount_value) / 100).toFixed(2)
                                  : Number(selectedOrder.discount_value).toFixed(2)}
                                <span className="text-[10px] ml-1">({selectedOrder.discount_value}{selectedOrder.discount_type === 'percentage' ? '%' : ' R$'})</span>
                              </span>
                            </div>
                          ) : null}

                          <div className="pt-2 border-t border-primary/10 flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-900">Total Líquido:</span>
                            <span className="text-2xl font-black text-primary">R$ {Number(selectedOrder.total || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Itens</p>
                        <p className="text-xl font-black text-slate-800">{orderItems.reduce((a, i) => a + i.quantidade, 0)}</p>
                      </div>
                      {canEditOrder && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><CreditCard size={10} /> Pagamento</span>
                            {!editingPayment && (
                              <button 
                                onClick={() => {
                                  setTempPaymentMethod(selectedOrder.payment_method || '');
                                  setEditingPayment(true);
                                }}
                                className="text-primary hover:text-primary/80 transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                          </p>
                          {editingPayment ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                autoFocus
                                value={tempPaymentMethod}
                                onChange={(e) => setTempPaymentMethod(e.target.value)}
                                placeholder="Definir pagamento..."
                                className="flex-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none"
                              />
                              <button 
                                onClick={() => handlePaymentMethodChange(selectedOrder.id, tempPaymentMethod)}
                                className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => setEditingPayment(false)}
                                className="p-1.5 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-slate-700">{selectedOrder.payment_method || '—'}</p>
                          )}
                        </div>
                      )}
                      {!canEditOrder && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><CreditCard size={10} /> Pagamento</p>
                          <p className="text-sm font-bold text-slate-700">{selectedOrder.payment_method || '—'}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Itens do Pedido</h4>
                        {canEditOrder && !isAddingItem && (
                          <button 
                            onClick={() => setIsAddingItem(true)}
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus size={10} /> Adicionar Item
                          </button>
                        )}
                      </div>

                      {isAddingItem && (
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Novo Item</span>
                            <button onClick={() => setIsAddingItem(false)} className="text-slate-400 hover:text-rose-500"><X size={14}/></button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">SKU</label>
                              <input 
                                type="text" 
                                value={newSku}
                                onChange={e => setNewSku(e.target.value)}
                                placeholder="Ex: SKU001"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              {newSku && (
                                <p className={`text-[10px] font-bold mt-1 ${foundProductName === 'SKU não encontrado' ? 'text-rose-500' : 'text-primary'}`}>
                                  {searchingSku ? 'Buscando...' : foundProductName}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd</label>
                              <input 
                                type="number" 
                                value={newQuantity}
                                onChange={e => setNewQuantity(Number(e.target.value))}
                                min="1"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={handleAddItem}
                            disabled={addingItemLoading || !newSku}
                            className="w-full py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {addingItemLoading ? (
                              <div className="w-3 h-3 border-b-2 border-white rounded-full animate-spin" />
                            ) : (
                              <><Check size={14} /> Confirmar Adição</>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="space-y-2">
                        <AnimatePresence>
                          {orderItems.length > 0 ? orderItems.map((item, idx) => (
                            <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                              <div className="flex-1 flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}.</span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{item.sku}</span>
                                    <h5 className="font-bold text-slate-800 text-sm">{item.nome}</h5>
                                  </div>
                                  {item.variacoes && Object.entries(item.variacoes as Record<string, string>).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Object.entries(item.variacoes as Record<string, string>).map(([key, value]) => (
                                        <span key={key} className="text-[8px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-100">
                                          {key}: {value}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {editingItemId === item.id ? (
                                    <div className="flex flex-col gap-2 mt-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col">
                                          <label className="text-[8px] font-bold text-slate-400 uppercase">Qtd</label>
                                          <input 
                                            type="number"
                                            value={tempQuantity}
                                            onChange={e => setTempQuantity(Number(e.target.value))}
                                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-primary"
                                          />
                                        </div>
                                        <div className="flex flex-col">
                                          <label className="text-[8px] font-bold text-slate-400 uppercase">Preço Unit.</label>
                                          <input 
                                            type="number"
                                            step="0.01"
                                            value={tempPrice}
                                            onChange={e => setTempPrice(Number(e.target.value))}
                                            className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-primary"
                                          />
                                        </div>
                                        <div className="flex items-end gap-1 pb-0.5">
                                          <button onClick={() => handleUpdateItem(item, tempQuantity, tempPrice)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all">
                                            <Check size={12} />
                                          </button>
                                          <button onClick={() => setEditingItemId(null)} className="p-1.5 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-all">
                                            <X size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-xs text-slate-400">{item.quantidade} x R$ {Number(item.preco_unitario).toFixed(2)}</p>
                                      {canEditOrder && (
                                        <button 
                                          onClick={() => { 
                                            setEditingItemId(item.id); 
                                            setTempQuantity(item.quantidade);
                                            setTempPrice(Number(item.preco_unitario));
                                          }}
                                          className="text-primary hover:text-primary/80 transition-colors"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-black text-slate-900">R$ {Number(item.subtotal).toFixed(2)}</p>
                                {canEditOrder && (
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    disabled={deletingItem === item.id}
                                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                                    title="Remover item do pedido"
                                  >
                                    {deletingItem === item.id
                                      ? <div className="w-3.5 h-3.5 border-b-2 border-rose-400 rounded-full animate-spin" />
                                      : <Trash2 size={14} />}
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )) : (
                            <div className="p-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                              <PackageSearch size={32} className="text-slate-200 mx-auto mb-3" />
                              <p className="text-slate-900 font-black">Nenhum item encontrado.</p>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {(canEditOrder ? removedItems.length > 0 : showRemovedToCustomer && removedItems.length > 0) && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-rose-500" />
                          <h4 className="text-xs font-bold uppercase tracking-widest text-rose-500">Itens Esgotados / Removidos</h4>
                        </div>
                        <div className="space-y-2">
                          {removedItems.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-400 px-1.5 py-0.5 rounded line-through">{item.sku}</span>
                                  <h5 className="font-bold text-rose-700 text-sm line-through">{item.nome}</h5>
                                </div>
                                {item.variacoes && Object.entries(item.variacoes as Record<string, string>).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1 opacity-50">
                                    {Object.entries(item.variacoes as Record<string, string>).map(([key, value]) => (
                                      <span key={key} className="text-[8px] bg-rose-100 text-rose-500 px-1.5 py-0.5 rounded font-bold uppercase border border-rose-200 line-through">
                                        {key}: {value}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-rose-400 mt-1">{item.quantidade} x R$ {Number(item.preco_unitario).toFixed(2)}</p>
                              </div>
                              <p className="font-black text-rose-400 line-through">R$ {Number(item.subtotal).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                        {role === 'customer' && (
                          <p className="text-[10px] text-rose-400 font-medium text-center">Estes itens foram removidos do seu pedido pela empresa.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${selectedOrder.status === 'pending' ? 'bg-amber-500' : selectedOrder.status === 'typed' ? 'bg-blue-500' : selectedOrder.status === 'finished' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Status: {statusLabel(selectedOrder.status)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {canEditOrder && selectedOrder.customer?.whatsapp && (
                    <button 
                      onClick={() => handleNotifyCustomer(selectedOrder)}
                      className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2"
                    >
                      <Send size={16} />
                      Notificar Cliente
                    </button>
                  )}
                  <button onClick={() => { setSelectedOrder(null); setEditingPayment(false); setEditingDate(false); }} className="px-8 py-3 bg-white text-slate-600 rounded-xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Digitação Manual Modal */}
      <AnimatePresence>
        {isTypingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Keyboard size={20} className="text-primary" />
                    {typingStep === 'items' ? 'Digitação Rápida de Itens' : 'Configuração do Pedido'}
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {typingStep === 'items' ? 'Adicione os itens usando SKU e TAB' : 'Selecione o cliente e finalize'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsTypingModalOpen(false)} 
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {typingStep === 'items' ? (
                  <div className="space-y-6">
                    {/* Input Row */}
                    <div className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="col-span-4 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU (Foco Automático)</label>
                        <input
                          ref={skuInputRef}
                          name="sku"
                          autoFocus
                          type="text"
                          value={typingSku}
                          onChange={e => setTypingSku(e.target.value)}
                          onKeyDown={handleManualKeyDown}
                          placeholder="Digite o SKU..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd</label>
                        <input
                          ref={qtyInputRef}
                          name="qty"
                          type="text"
                          value={typingQty}
                          onChange={e => setTypingQty(e.target.value)}
                          onKeyDown={handleManualKeyDown}
                          placeholder="Qtd"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Sugerido</label>
                        <input
                          ref={priceInputRef}
                          name="price"
                          type="text"
                          value={typingPrice}
                          onChange={e => setTypingPrice(e.target.value)}
                          onKeyDown={handleManualKeyDown}
                          placeholder="0,00"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-right outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preview</label>
                        <div className="h-[42px] flex items-center px-1">
                          {typingProduct ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-800 line-clamp-1">{typingProduct.nome}</span>
                              <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">
                                {getBrandName(typingProduct.brand_id)} • R$ {Number(typingProduct.preco_unitario).toFixed(2)}
                              </span>
                            </div>
                          ) : typingSku ? (
                            <span className="text-[10px] font-bold text-rose-400 uppercase italic">Produto não localizado...</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 uppercase italic">Aguardando SKU...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table of items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Itens Adicionados ({typingItems.length})</h3>
                        <span className="text-sm font-black text-primary">Subtotal: R$ {typingItems.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0).toFixed(2)}</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {typingItems.length > 0 ? typingItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-300">{idx + 1}.</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-800">{item.nome}</span>
                                <span className="text-[10px] font-bold text-slate-400">SKU: {item.sku} • {item.quantidade} un x R$ {item.preco_unitario.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-slate-900">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</span>
                              <button 
                                onClick={() => setTypingItems(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )).reverse() : (
                          <div className="py-12 text-center bg-slate-50/50 rounded-[28px] border-2 border-dashed border-slate-100">
                             <PackageSearch size={24} className="text-slate-200 mx-auto mb-2" />
                             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum item adicionado ainda</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto space-y-6 py-8">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Empresa</label>
                        <div className="relative">
                          <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            value={typingCustomerId}
                            onChange={e => setTypingCustomerId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                          >
                            <option value="">Selecione o Cliente...</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>{c.nome_empresa || c.nome}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {role === 'company' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedor Responsável</label>
                          <select
                            value={typingSellerId}
                            onChange={e => setTypingSellerId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                          >
                            <option value="">Nenhum Vendedor (Empresa)</option>
                            {typingSellers.map(s => (
                              <option key={s.id} value={s.id}>{s.nome}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">Total do Pedido</span>
                        <span className="text-2xl font-black text-primary">R$ {typingItems.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <button 
                  onClick={() => setIsTypingModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-widest"
                >
                  Descartar
                </button>
                <div className="flex items-center gap-3">
                  {typingStep === 'items' ? (
                    <button
                      disabled={typingItems.length === 0}
                      onClick={() => setTypingStep('config')}
                      className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      Próximo: Identificar Cliente
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setTypingStep('items')}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        <ChevronLeft size={16} />
                        Voltar aos Itens
                      </button>
                      <button
                        onClick={handleSaveTypedOrder}
                        disabled={isProcessing || !typingCustomerId}
                        className="flex items-center gap-2 px-10 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin" />
                        ) : (
                          <><Check size={16} /> Finalizar e Salvar</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
