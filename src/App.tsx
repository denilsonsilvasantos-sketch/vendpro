import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  User, 
  Settings, 
  Package, 
  Users, 
  Upload, 
  AlertCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Trash2,
  FileText,
  Menu,
  X,
  Search,
  CheckCircle2,
  Send,
  Share2
} from 'lucide-react';
import { useCart } from './hooks/useCart';
import { Product, Category, Seller, Customer, UserRole, CartItem, Company } from './types';
import { mockProducts, mockCategories, mockCompany } from './lib/mockData';

// --- Main App ---

export default function App() {
  const [role, setRole] = useState<UserRole>(() => localStorage.getItem('vendpro_role') as UserRole || null);
  const [user, setUser] = useState<any>(() => JSON.parse(localStorage.getItem('vendpro_user') || 'null'));
  const [activeTab, setActiveTab] = useState('catalog');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [company, setCompany] = useState<any>(mockCompany);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>(() => JSON.parse(localStorage.getItem('vendpro_available_companies') || '[]'));
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(() => {
    const saved = localStorage.getItem('vendpro_active_company_id');
    return saved ? parseInt(saved) : null;
  });
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showCartDisclaimer, setShowCartDisclaimer] = useState(false);
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, total } = useCart();

  const handleAddToCart = (product: Product, quantity: number) => {
    if (cart.length === 0) {
      setShowCartDisclaimer(true);
    }
    addToCart(product, quantity);
  };

  useEffect(() => {
    // Mock data fetching
    setLoading(false);
  }, [role]);

  const handleLogin = (selectedRole: UserRole, userData: any, companies: any[] = []) => {
    setRole(selectedRole);
    setUser(userData);
    setAvailableCompanies(companies);
    
    if (companies.length === 1) {
      setActiveCompanyId(companies[0].id);
      localStorage.setItem('vendpro_active_company_id', companies[0].id.toString());
    } else if (companies.length > 1) {
      setActiveCompanyId(null);
      localStorage.removeItem('vendpro_active_company_id');
    } else if (selectedRole === 'company') {
      setActiveCompanyId(userData.id);
      localStorage.setItem('vendpro_active_company_id', userData.id.toString());
    }

    localStorage.setItem('vendpro_role', selectedRole as string);
    localStorage.setItem('vendpro_user', JSON.stringify(userData));
    localStorage.setItem('vendpro_available_companies', JSON.stringify(companies));
    setActiveTab('catalog');
  };

  const handleLogout = () => {
    setRole(null);
    setUser(null);
    setAvailableCompanies([]);
    setActiveCompanyId(null);
    localStorage.removeItem('vendpro_role');
    localStorage.removeItem('vendpro_user');
    localStorage.removeItem('vendpro_seller_code');
    localStorage.removeItem('vendpro_available_companies');
    localStorage.removeItem('vendpro_active_company_id');
  };

  if (!role) {
    return <div>Login Screen Placeholder</div>;
  }

  const isMultiBrand = role !== 'company' && availableCompanies.length > 1;
  if (isMultiBrand && !activeCompanyId) {
    return (
      <CompanySelectionScreen 
        companies={availableCompanies} 
        onSelect={(c) => {
          setActiveCompanyId(c.id);
          localStorage.setItem('vendpro_active_company_id', c.id.toString());
          setShowCompanyInfo(true);
          fetchData();
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-nude font-sans text-slate-800 pb-24">
      <AnimatePresence>
        {zoomImage && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
            onClick={() => setZoomImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={zoomImage} 
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              alt="Zoom"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCartDisclaimer && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight text-center">Aviso Importante</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Este é apenas um **orçamento**. A venda será confirmada somente após o vendedor processar o pedido. 
                  <br/><br/>
                  Note que alguns produtos podem se esgotar antes da finalização.
                </p>
              </div>
              <button 
                onClick={() => setShowCartDisclaimer(false)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Entendi, continuar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompanyInfo && company && (
          <CompanyInfoModal company={company} onClose={() => setShowCompanyInfo(false)} />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="glass-effect px-6 py-4 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:text-primary transition-colors">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.nome} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
          ) : (
            <div className="w-8 h-8 blue-gradient rounded-lg flex items-center justify-center text-white shadow-sm">
              <CheckCircle2 size={18} />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{company?.nome || 'VendPro'}</h1>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/20 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                  {company?.logo_url ? (
                    <img src={company.logo_url} alt={company.nome} className="w-10 h-10 rounded-xl object-cover shadow-md" />
                  ) : (
                    <div className="w-10 h-10 blue-gradient rounded-xl flex items-center justify-center text-white shadow-md">
                      <CheckCircle2 size={24} />
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-slate-900">{company?.nome || 'VendPro'}</h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-primary transition-colors"><X size={24} /></button>
              </div>

              <nav className="space-y-1.5 flex-1">
                <SidebarItem icon={<LayoutGrid size={20}/>} label="Catálogo" active={activeTab === 'catalog'} onClick={() => { setActiveTab('catalog'); setIsSidebarOpen(false); }} />
                
                {role === 'company' && (
                  <>
                    <div className="h-px bg-slate-100 my-6 mx-2" />
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 px-4 mb-3">Administração</p>
                    <SidebarItem icon={<LayoutGrid size={20}/>} label="Minhas Marcas" active={activeTab === 'admin-companies'} onClick={() => { setActiveTab('admin-companies'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Users size={20}/>} label="Vendedores" active={activeTab === 'admin-sellers'} onClick={() => { setActiveTab('admin-sellers'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Users size={20}/>} label="Clientes" active={activeTab === 'admin-customers'} onClick={() => { setActiveTab('admin-customers'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Package size={20}/>} label="Categorias" active={activeTab === 'admin-categories'} onClick={() => { setActiveTab('admin-categories'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Upload size={20}/>} label="Upload Catálogo" active={activeTab === 'admin-upload'} onClick={() => { setActiveTab('admin-upload'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<AlertCircle size={20}/>} label="Pendências" active={activeTab === 'admin-pending'} onClick={() => { setActiveTab('admin-pending'); setIsSidebarOpen(false); }} />
                  </>
                )}

                {role === 'seller' && (
                  <>
                    <div className="h-px bg-slate-100 my-6 mx-2" />
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 px-4 mb-3">Vendedor</p>
                    <SidebarItem icon={<Users size={20}/>} label="Meus Clientes" active={activeTab === 'seller-customers'} onClick={() => { setActiveTab('seller-customers'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Package size={20}/>} label="Pedidos Recebidos" active={activeTab === 'seller-orders'} onClick={() => { setActiveTab('seller-orders'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Share2 size={20}/>} label="Compartilhar App" active={false} onClick={() => { 
                      if (navigator.share) {
                        navigator.share({
                          title: 'VendPro Catálogo',
                          text: `Use meu código de vendedor: ${user?.codigo_vinculo}`,
                          url: window.location.origin
                        });
                      } else {
                        alert(`Compartilhe o link: ${window.location.origin}\nSeu código: ${user?.codigo_vinculo}`);
                      }
                      setIsSidebarOpen(false);
                    }} />
                  </>
                )}

                <div className="h-px bg-slate-100 my-6 mx-2" />
                <SidebarItem icon={<User size={20}/>} label="Minha Conta" active={activeTab === 'account'} onClick={() => { setActiveTab('account'); setIsSidebarOpen(false); }} />
                
                {availableCompanies.length > 1 && (
                  <SidebarItem 
                    icon={<LayoutGrid size={20}/>} 
                    label="Trocar Marca" 
                    active={false} 
                    onClick={() => { 
                      setActiveCompanyId(null); 
                      localStorage.removeItem('vendpro_active_company_id');
                      setIsSidebarOpen(false); 
                    }} 
                  />
                )}
              </nav>

              <button 
                onClick={handleLogout}
                className="mt-auto flex items-center gap-3 px-4 py-4 text-rose-500 font-semibold hover:bg-rose-50 rounded-2xl transition-all active:scale-95"
              >
                <LogOut size={20} />
                Sair da Conta
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="p-4 max-w-5xl mx-auto">
        {activeTab === 'catalog' && (
          <CatalogScreen 
            products={products} 
            categories={categories} 
            onAddToCart={handleAddToCart} 
            onEdit={setEditingProduct} 
            role={role} 
            onZoom={setZoomImage}
          />
        )}
        {activeTab === 'cart' && <CartScreen cart={cart} total={total} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onSendOrder={clearCart} user={user} role={role} minOrder={company?.minimum_order_value || 0} />}
        {activeTab === 'admin-companies' && <AdminCompaniesScreen onRefresh={fetchData} />}
        {activeTab === 'admin-sellers' && <AdminSellersScreen companyId={company?.id || 1} />}
        {activeTab === 'admin-customers' && <AdminCustomersScreen companyId={company?.id || 1} />}
        {activeTab === 'admin-categories' && <AdminCategoriesScreen categories={categories} onRefresh={fetchData} companyId={company?.id || 1} />}
        {activeTab === 'admin-upload' && <AdminUploadScreen categories={categories} onRefresh={fetchData} companyId={company?.id || 1} />}
        {activeTab === 'admin-pending' && <AdminPendingScreen products={products} categories={categories} onRefresh={fetchData} onEdit={setEditingProduct} />}
        {activeTab === 'seller-customers' && <SellerCustomersScreen user={user} />}
        {activeTab === 'seller-orders' && <SellerOrdersScreen user={user} />}
        {activeTab === 'account' && <AccountScreen user={user} role={role} />}
      </main>

      <AnimatePresence>
        {editingProduct && (
          <ProductEditModal 
            product={editingProduct} 
            categories={categories} 
            onClose={() => setEditingProduct(null)} 
            onSave={() => { setEditingProduct(null); fetchData(); }} 
          />
        )}
      </AnimatePresence>

      {/* Bottom Tabs */}
      <nav className="fixed bottom-0 inset-x-0 glass-effect px-8 py-4 flex items-center justify-around z-40 rounded-t-[32px] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <TabItem icon={<LayoutGrid size={24} />} label="Catálogo" active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} />
        <TabItem icon={<ShoppingCart size={24} />} label="Carrinho" active={activeTab === 'cart'} badge={cart.length > 0 ? cart.length : undefined} onClick={() => setActiveTab('cart')} />
        <TabItem icon={<Settings size={24} />} label="Menu" active={activeTab.startsWith('admin')} onClick={() => setIsSidebarOpen(true)} />
      </nav>
    </div>
  );
}

// --- Sub-Screens ---

function CompanySelectionScreen({ companies, onSelect }: { companies: any[], onSelect: (c: any) => void }) {
  return (
    <div className="min-h-screen bg-nude flex flex-col items-center justify-center p-8">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Selecione a Marca</h2>
        <p className="text-slate-500 mb-10">Com qual catálogo deseja trabalhar agora?</p>
        
        <div className="grid grid-cols-1 gap-4">
          {companies.map(c => (
            <button 
              key={c.id} 
              onClick={() => onSelect(c)}
              className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all flex items-center gap-6 text-left group"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.nome} className="w-full h-full object-cover" />
                ) : (
                  <Package size={32} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl text-slate-800 group-hover:text-primary transition-colors">{c.nome}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mínimo: R$ {c.minimum_order_value?.toFixed(2)}</p>
              </div>
              <ChevronRight size={24} className="text-slate-300 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function CompanyInfoModal({ company, onClose }: { company: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative z-10 p-10 text-center space-y-8"
      >
        <div className="w-24 h-24 bg-slate-50 rounded-[32px] mx-auto flex items-center justify-center overflow-hidden shadow-inner">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.nome} className="w-full h-full object-cover" />
          ) : (
            <Package size={48} className="text-slate-200" />
          )}
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">{company.nome}</h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Políticas da Empresa</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Pedido Mínimo</p>
            <p className="font-bold text-slate-700">R$ {company.minimum_order_value?.toFixed(2)}</p>
          </div>
          
          {company.payment_policy && (
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Pagamento</p>
              <p className="text-sm text-slate-600 leading-relaxed">{company.payment_policy}</p>
            </div>
          )}

          {company.shipping_policy && (
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Envio / Frete</p>
              <p className="text-sm text-slate-600 leading-relaxed">{company.shipping_policy}</p>
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-5 bg-primary text-white rounded-[24px] font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          Entendi, vamos lá!
        </button>
      </motion.div>
    </div>
  );
}
function LoginScreen({ onLogin }: { onLogin: (role: UserRole, user: any, companies?: any[]) => void }) {
  const [view, setView] = useState<'role' | 'seller-code' | 'customer-form' | 'company-login' | 'company-register'>('role');
  const [loginType, setLoginType] = useState<'seller' | 'customer' | 'admin' | 'company' | null>(null);
  const [sellerCode, setSellerCode] = useState('');
  const [customerData, setCustomerData] = useState({ empresa: '', cnpj: '', telefone: '', responsavel: '' });
  const [companyData, setCompanyData] = useState({ nome: '', cnpj: '', telefone: '' });
  const [companyLoginCnpj, setCompanyLoginCnpj] = useState('');
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

  const handleSellerCodeSubmit = async () => {
    const code = sellerCode.trim().toUpperCase();
    if (code === 'ADMIN') {
      onLogin('company', { id: 1, nome: 'Admin' }, [{ id: 1, nome: 'Admin' }]);
      return;
    }
    
    try {
      const res = await fetch(`/api/sellers/validate/${code}`);
      if (!res.ok) throw new Error('Falha ao validar código');
      const data = await res.json();
      if (data.success) {
        setSellerInfo(data.seller);
        setAvailableCompanies(data.companies || []);
        if (loginType === 'seller') {
          onLogin('seller', data.seller, data.companies);
        } else {
          setView('customer-form');
        }
      } else {
        alert('Código inválido. Tente ADMIN ou um código de vendedor válido.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao validar código. Verifique sua conexão.');
    }
  };

  const handleCustomerSubmit = () => {
    onLogin('customer', { 
      ...customerData, 
      sellerCode,
      vendedor_nome: sellerInfo?.nome,
      vendedor_whatsapp: sellerInfo?.whatsapp
    }, availableCompanies);
  };

  const handleCompanyRegister = async () => {
    try {
      const res = await fetch('/api/company/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });
      const data = await res.json();
      if (data.success) {
        onLogin('company', data.company);
      } else {
        alert(data.message || 'Erro ao cadastrar empresa');
      }
    } catch (e) {
      alert('Erro ao cadastrar empresa');
    }
  };

  const handleCompanyLogin = async () => {
    const cnpj = companyLoginCnpj.trim().toUpperCase();
    if (cnpj === 'ADMIN') {
      onLogin('company', { id: 1, nome: 'VendPro Matriz' });
      return;
    }
    try {
      const res = await fetch('/api/company/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj })
      });
      const data = await res.json();
      if (data.success) {
        onLogin('company', data.company);
      } else {
        alert(data.message || 'Empresa não encontrada');
      }
    } catch (e) {
      alert('Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen bg-nude flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-24 h-24 blue-gradient rounded-[32px] mx-auto mb-8 flex items-center justify-center text-white shadow-lg shadow-primary/20 rotate-3">
          <CheckCircle2 size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-slate-900">VendPro</h1>
        <p className="text-primary font-medium mb-12 tracking-wide uppercase text-[10px]">Catálogo Premium de Beleza</p>

        {view === 'role' && (
          <div className="space-y-4">
            <button 
              onClick={() => { setLoginType('seller'); setView('seller-code'); }}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Sou Vendedor
              <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => { setLoginType('customer'); setView('seller-code'); }}
              className="w-full py-4 bg-white text-primary border border-primary/10 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-primary-light/20 transition-colors"
            >
              Sou Cliente
              <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => { setLoginType('company'); setView('company-login'); }}
              className="w-full mt-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-primary transition-colors"
            >
              Sou Empresa (Criar Catálogo)
            </button>
            <button 
              onClick={() => { setLoginType('admin'); setView('seller-code'); }}
              className="w-full mt-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-primary transition-colors"
            >
              Acesso Administrativo
            </button>
          </div>
        )}

        {view === 'company-login' && (
          <div className="space-y-4">
            <p className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2">
              Acesso Empresa
            </p>
            <input 
              type="text" 
              placeholder="CNPJ da Empresa" 
              className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-bold uppercase text-slate-700 shadow-sm"
              value={companyLoginCnpj}
              onChange={e => setCompanyLoginCnpj(e.target.value)}
            />
            <button 
              onClick={handleCompanyLogin}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => setView('company-register')}
              className="w-full py-4 bg-white text-primary border border-primary/10 rounded-2xl font-semibold hover:bg-primary-light/20 transition-colors"
            >
              Cadastrar Nova Empresa
            </button>
            <button onClick={() => setView('role')} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}

        {view === 'company-register' && (
          <div className="space-y-3 text-left">
            <p className="font-bold text-sm mb-6 text-center text-slate-700">Cadastro de Empresa</p>
            <div className="space-y-3">
              <input placeholder="Nome da Empresa" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCompanyData({...companyData, nome: e.target.value})} />
              <input placeholder="CNPJ" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} />
              <input placeholder="Telefone" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCompanyData({...companyData, telefone: e.target.value})} />
            </div>
            <button 
              onClick={handleCompanyRegister}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold mt-6 shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Finalizar Cadastro
            </button>
            <button onClick={() => setView('company-login')} className="w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}

        {view === 'seller-code' && (
          <div className="space-y-4">
            <p className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-2">
              {loginType === 'seller' ? 'Acesso Vendedor' : loginType === 'customer' ? 'Acesso Cliente' : 'Acesso Admin'}
            </p>
            <input 
              type="text" 
              placeholder={loginType === 'admin' ? "Código de Acesso" : "Código do Vendedor"} 
              className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-bold uppercase text-slate-700 shadow-sm"
              value={sellerCode}
              onChange={e => setSellerCode(e.target.value)}
            />
            <button 
              onClick={handleSellerCodeSubmit}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Validar Código
            </button>
            <button onClick={() => setView('role')} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}

        {view === 'customer-form' && (
          <div className="space-y-3 text-left">
            <p className="font-bold text-sm mb-6 text-center text-slate-700">Complete seu cadastro</p>
            <div className="space-y-3">
              <input placeholder="Nome da Empresa" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, empresa: e.target.value})} />
              <input placeholder="CNPJ" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, cnpj: e.target.value})} />
              <input placeholder="Telefone" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, telefone: e.target.value})} />
              <input placeholder="Seu Nome" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, responsavel: e.target.value})} />
            </div>
            <button 
              onClick={handleCustomerSubmit}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold mt-6 shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Finalizar Cadastro
            </button>
            <button onClick={() => setView('seller-code')} className="w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function CatalogScreen({ products, categories, onAddToCart, onEdit, role, onZoom }: { products: Product[], categories: Category[], onAddToCart: (p: Product, q: number) => void, onEdit: (p: Product) => void, role: UserRole, onZoom: (img: string) => void }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? p.categoria_id === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, itemsPerPage]);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="blue-gradient rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-primary/20"
      >
        <div className="relative z-10 max-w-[60%]">
          <h2 className="text-3xl font-bold mb-2 leading-tight">Beleza que Transforma</h2>
          <p className="text-white/80 text-xs font-medium uppercase tracking-widest mb-6">Coleção Premium 2026</p>
          <div className="flex gap-3">
            {role === 'company' && (
              <button 
                onClick={() => onEdit({ id: 0, company_id: 0, sku: '', nome: '', preco_unitario: 0, preco_box: 0, qtd_box: 0, venda_somente_box: false, status_estoque: 'normal', categoria_pendente: false, imagem_pendente: false, ativo: true } as any)}
                className="bg-white text-primary px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-transform flex items-center gap-2"
              >
                <Plus size={14} />
                Novo Produto
              </button>
            )}
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute right-4 bottom-4 opacity-20">
          <Package size={120} strokeWidth={1} />
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative group w-full md:max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="O que você procura hoje?" 
            className="w-full pl-14 pr-6 py-4.5 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Exibir:</span>
          <select 
            value={itemsPerPage}
            onChange={e => setItemsPerPage(Number(e.target.value))}
            className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-primary"
          >
            <option value={12}>12 itens</option>
            <option value={24}>24 itens</option>
            <option value={48}>48 itens</option>
            <option value={96}>96 itens</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        <button 
          onClick={() => setSelectedCategory(null)}
          className={`px-6 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${!selectedCategory ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/30'}`}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/30'}`}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      {paginatedProducts.length === 0 ? (
        <div className="py-32 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <Search size={40} />
          </div>
          <p className="text-slate-400 font-medium">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAdd={onAddToCart} 
                onEdit={onEdit} 
                role={role} 
                onZoom={onZoom}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-10">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 disabled:opacity-30 hover:text-primary transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button 
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${currentPage === page ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100 hover:border-primary/30'}`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="text-slate-300 px-1">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 disabled:opacity-30 hover:text-primary transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd, onEdit, role, onZoom, ...props }: { product: Product, onAdd: (p: Product, q: number) => void, onEdit: (p: Product) => void, role: UserRole, onZoom: (img: string) => void, [key: string]: any }) {
  const [qty, setQty] = useState(product.venda_somente_box ? 1 : (product.multiplo_venda || 1));

  const handleAdd = () => {
    onAdd(product, qty);
    setQty(product.venda_somente_box ? 1 : (product.multiplo_venda || 1));
  };

  const productImage = product.imagem || `https://picsum.photos/seed/${product.sku}/400/500`;

  return (
    <Card className="flex flex-col h-full relative group hover:translate-y-[-4px] transition-all duration-300" {...props}>
      {role === 'company' && (
        <button 
          onClick={() => onEdit(product)}
          className="absolute top-3 right-3 z-10 p-2.5 bg-white/90 backdrop-blur shadow-md rounded-full text-slate-400 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
        >
          <Settings size={14} />
        </button>
      )}
      <div 
        className="aspect-[4/5] bg-white relative overflow-hidden cursor-zoom-in"
        onClick={() => onZoom(productImage)}
      >
        <img 
          src={productImage} 
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
          alt={product.nome}
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.status_estoque === 'baixo' && <Badge color="gold">Estoque Baixo</Badge>}
          {product.status_estoque === 'ultimas' && <Badge color="red">Últimas Unidades</Badge>}
          {product.status_estoque === 'esgotado' && <Badge color="gray">Esgotado</Badge>}
          {!!product.venda_somente_box && (
            <div className="w-12 h-12 bg-[#8B5A8C] rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-tight text-center shadow-md">
              SÓ NO<br/>BOX
            </div>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1.5">
          <p className="text-[9px] text-primary font-bold uppercase tracking-widest">{product.marca || 'VendPro Exclusive'}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Cód: {product.sku}</p>
        </div>
        <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 mb-3 leading-snug">{product.nome}</h3>
        
        <div className="mt-auto">
          <div className="flex flex-col gap-0.5 mb-4">
            {product.venda_somente_box ? (
              <>
                <div className="flex justify-between items-center bg-[#FBC02D] text-slate-900 px-2 py-1 rounded-sm">
                  <span className="text-[11px] font-bold">Preço unitário</span>
                  <span className="text-[11px] font-bold">R$ {(product.preco_unitario || (product.preco_box / (product.qtd_box || 1))).toFixed(2)} un</span>
                </div>
                <div className="flex justify-between items-center bg-[#F5F5F5] text-slate-900 px-2 py-1 rounded-sm">
                  <span className="text-[11px] font-bold">Box {product.qtd_box} un+Prov</span>
                  <span className="text-[11px] font-bold">R$ {product.preco_box.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <>
                {product.qtd_box > 0 && product.preco_box > 0 && (
                  <div className="flex justify-between items-center bg-[#F5F5F5] text-slate-900 px-2 py-1 rounded-sm">
                    <span className="text-[11px] font-bold">Box {product.qtd_box} un</span>
                    <span className="text-[11px] font-bold">R$ {(product.preco_box / product.qtd_box).toFixed(2)} un</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-[#F5F5F5] text-slate-900 px-2 py-1 rounded-sm">
                  <span className="text-[11px] font-bold">Avulso</span>
                  <span className="text-[11px] font-bold">R$ {product.preco_unitario.toFixed(2)} un</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
              <button onClick={() => setQty(Math.max(product.venda_somente_box ? 1 : (product.multiplo_venda || 1), qty - (product.venda_somente_box ? 1 : (product.multiplo_venda || 1))))} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><Minus size={14}/></button>
              <span className="w-8 text-center text-xs font-bold text-slate-700">{qty}</span>
              <button onClick={() => setQty(qty + (product.venda_somente_box ? 1 : (product.multiplo_venda || 1)))} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><Plus size={14}/></button>
            </div>
            <button 
              onClick={handleAdd}
              disabled={product.status_estoque === 'esgotado'}
              className="flex-1 bg-primary text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider disabled:opacity-30 shadow-md shadow-primary/10 active:scale-95 transition-all"
            >
              Comprar {product.venda_somente_box ? 'Box' : ''}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CartScreen({ cart, total, onUpdateQuantity, onRemove, onSendOrder, user, role, minOrder }: { cart: CartItem[], total: number, onUpdateQuantity: (id: number, q: number) => void, onRemove: (id: number) => void, onSendOrder: () => void, user: any, role: UserRole, minOrder: number }) {
  const isBelowMin = total < minOrder;

  const generatePDF = () => {
    const doc = new jsPDF();
    const companyName = "VendPro Catálogo - B2B";
    
    doc.setFontSize(22);
    doc.setTextColor(0, 114, 255); // primary color
    doc.text("Orçamento VendPro", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Empresa: ${companyName}`, 20, 40);
    doc.text(`Cliente: ${user?.empresa || 'N/A'}`, 20, 45);
    doc.text(`Vendedor: ${user?.vendedor_nome || 'N/A'}`, 20, 50);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 55);

    const tableData = cart.map(item => {
      let unitPrice = item.preco_unitario;
      if (item.venda_somente_box) {
        unitPrice = item.preco_box / item.qtd_box;
      } else if (item.quantity >= item.qtd_box && item.qtd_box > 0) {
        unitPrice = item.preco_box / item.qtd_box;
      }
      return [
        item.sku,
        item.nome,
        item.venda_somente_box ? `${item.quantity} cx` : `${item.quantity} un`,
        `R$ ${unitPrice.toFixed(2)}`,
        `R$ ${(item.venda_somente_box ? item.quantity * item.preco_box : item.quantity * unitPrice).toFixed(2)}`
      ];
    });

    (doc as any).autoTable({
      startY: 65,
      head: [['SKU', 'Produto', 'Qtd', 'Unit.', 'Total']],
      body: tableData,
      foot: [['', '', '', 'TOTAL', `R$ ${total.toFixed(2)}`]],
      theme: 'grid',
      headStyles: { fillColor: [0, 114, 255] }, // primary color
      footStyles: { fillColor: [240, 247, 255], textColor: [0, 114, 255], fontStyle: 'bold' }
    });

    return doc.output('blob');
  };

  const handleSend = async () => {
    if (total < minOrder) {
      alert(`O pedido mínimo é de R$ ${minOrder.toFixed(2)}. Seu pedido atual é de R$ ${total.toFixed(2)}.`);
      return;
    }

    // Save order to DB first
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          customer_id: user?.id,
          seller_id: user?.seller_id,
          company_id: cart[0]?.company_id,
          items: cart,
          total
        })
      });
    } catch (e) {
      console.error('Failed to save order record', e);
    }

    const pdfBlob = generatePDF();
    const whatsappNumber = user?.vendedor_whatsapp || '5511999999999';
    
    // Create a detailed text summary for WhatsApp (Direct approach)
    const itemSummary = cart.map(item => `• ${item.quantity}x ${item.nome} (R$ ${(item.venda_somente_box ? item.preco_box : item.preco_unitario).toFixed(2)})`).join('\n');
    const message = `*NOVO ORÇAMENTO - VENDPRO*\n\n*Cliente:* ${user?.empresa || 'Não identificado'}\n*Total:* R$ ${total.toFixed(2)}\n\n*Produtos:*\n${itemSummary}\n\n_O PDF detalhado foi gerado. Por favor, solicite o arquivo se necessário._`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    // Fallback: Download PDF
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orcamento_${user?.empresa || 'cliente'}.pdf`;
    link.click();

    window.open(whatsappUrl, '_blank');
    onSendOrder();
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-24 h-24 bg-primary-light/30 rounded-full flex items-center justify-center mb-6 text-primary/40">
          <ShoppingCart size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sua sacola está vazia</h2>
        <p className="text-slate-400 text-sm max-w-[200px]">Adicione produtos do catálogo para começar seu pedido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Minha Sacola</h2>
      
      <div className="space-y-4">
        {cart.map(item => {
          let currentPrice = item.preco_unitario;
          if (item.venda_somente_box) {
            currentPrice = item.preco_box;
          } else if (item.quantity >= item.qtd_box && item.qtd_box > 0) {
            currentPrice = item.preco_box / item.qtd_box;
          }
          
          return (
            <Card key={item.id} className="p-4 flex gap-4 hover:border-primary/20 transition-colors">
              <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden border border-slate-50 flex-shrink-0">
                <img 
                  src={item.imagem || `https://picsum.photos/seed/${item.sku}/100/100`} 
                  className="w-full h-full object-contain p-1" 
                  alt={item.nome} 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="flex-1 flex flex-col">
                <h4 className="font-semibold text-sm text-slate-800 leading-tight mb-1">{item.nome}</h4>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-3">
                  R$ {currentPrice.toFixed(2)} / {item.venda_somente_box ? 'box' : 'un'}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                    <button onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - (item.venda_somente_box ? 1 : (item.multiplo_venda || 1))))} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><Minus size={14}/></button>
                    <span className="w-8 text-center text-xs font-bold text-slate-700">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity + (item.venda_somente_box ? 1 : (item.multiplo_venda || 1)))} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><Plus size={14}/></button>
                  </div>
                  <button onClick={() => onRemove(item.id)} className="text-rose-400 p-2 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-24 inset-x-0 p-6 glass-effect z-30 rounded-t-[32px] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <div className="max-w-xl mx-auto space-y-4">
          {isBelowMin && (
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700">
              <AlertCircle size={18} />
              <p className="text-[10px] font-bold uppercase tracking-wider">Pedido abaixo do mínimo (R$ {minOrder.toFixed(2)})</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Total do Orçamento</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">R$ {total.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleSend}
            className="w-full py-4 bg-primary text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Send size={18} />
            Finalizar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSellersScreen({ companyId }: { companyId: number }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Partial<Seller> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/sellers?company_id=${companyId}`, { headers: getHeaders(false) }),
        fetch(`/api/companies`, { headers: getHeaders(false) })
      ]);
      if (sRes.ok) setSellers(await sRes.json());
      if (cRes.ok) setCompanies(await cRes.json());
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleSave = async () => {
    if (!editingSeller?.nome || !editingSeller?.codigo_vinculo) {
      alert('Nome e Código são obrigatórios');
      return;
    }
    
    try {
      const method = editingSeller.id ? 'PUT' : 'POST';
      const url = editingSeller.id ? `/api/sellers/${editingSeller.id}` : '/api/sellers';
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({ 
          ...editingSeller, 
          company_id: companyId, 
          ativo: editingSeller.ativo !== undefined ? editingSeller.ativo : 1
        })
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        setIsModalOpen(false);
        setEditingSeller(null);
        fetchData();
      } else {
        throw new Error(result.message || 'Erro ao salvar vendedor');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar vendedor: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Vendedores</h2>
        <button 
          onClick={() => { setEditingSeller({ nome: '', codigo_vinculo: '', whatsapp: '', ativo: 1 }); setIsModalOpen(true); }}
          className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus size={24}/>
        </button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Carregando vendedores...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sellers.map(s => (
            <Card key={s.id} className="p-5 flex items-center justify-between group hover:border-primary/20 transition-all">
              <div onClick={() => { setEditingSeller(s); setIsModalOpen(true); }} className="cursor-pointer flex-1">
                <p className="font-bold text-slate-800 text-lg mb-1">{s.nome}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código: {s.codigo_vinculo} • {s.whatsapp}</p>
              </div>
              <Badge color={s.ativo ? 'green' : 'red'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 p-8 space-y-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{editingSeller?.id ? 'Editar' : 'Novo'} Vendedor</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Nome Completo</label>
                  <input placeholder="Ex: Maria Silva" value={editingSeller?.nome || ''} onChange={e => setEditingSeller({...editingSeller, nome: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">WhatsApp</label>
                  <input placeholder="Ex: 5511999999999" value={editingSeller?.whatsapp || ''} onChange={e => setEditingSeller({...editingSeller, whatsapp: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Código de Vínculo</label>
                  <input placeholder="Ex: MARIAPRO" value={editingSeller?.codigo_vinculo || ''} onChange={e => setEditingSeller({...editingSeller, codigo_vinculo: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold uppercase outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Vendedor Ativo</span>
                  <input type="checkbox" checked={!!editingSeller?.ativo} onChange={e => setEditingSeller({...editingSeller, ativo: e.target.checked ? 1 : 0})} className="w-6 h-6 accent-primary rounded-lg" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-semibold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-4 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-all">Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminCustomersScreen({ companyId }: { companyId: number }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/customers?company_id=${companyId}`, { headers: getHeaders(false) }),
        fetch(`/api/sellers?company_id=${companyId}`, { headers: getHeaders(false) })
      ]);
      
      if (!cRes.ok || !sRes.ok) {
        const cErr = !cRes.ok ? await cRes.json().catch(() => ({})) : {};
        const sErr = !sRes.ok ? await sRes.json().catch(() => ({})) : {};
        throw new Error(cErr.message || sErr.message || 'Erro ao carregar dados');
      }
      
      setCustomers(await cRes.json());
      setSellers(await sRes.json());
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleSave = async () => {
    if (!editingCustomer?.empresa || !editingCustomer?.seller_id) return;
    
    const method = editingCustomer.id ? 'PUT' : 'POST';
    const url = editingCustomer.id ? `/api/customers/${editingCustomer.id}` : '/api/customers';
    
    await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify({ ...editingCustomer, ativo: 1 })
    });
    
    setIsModalOpen(false);
    setEditingCustomer(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Clientes</h2>
        <button 
          onClick={() => { setEditingCustomer({ empresa: '', cnpj: '', telefone: '', responsavel: '', seller_id: sellers[0]?.id }); setIsModalOpen(true); }}
          className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus size={24}/>
        </button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Carregando clientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map(c => {
            const seller = sellers.find(s => s.id === c.seller_id);
            return (
              <Card key={c.id} className="p-5 flex items-center justify-between group hover:border-primary/20 transition-all">
                <div onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }} className="cursor-pointer flex-1">
                  <p className="font-bold text-slate-800 text-lg mb-1">{c.empresa}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resp: {c.responsavel} • Vendedor: {seller?.nome || 'N/A'}</p>
                </div>
                <Badge color={c.ativo ? 'green' : 'red'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </Card>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 p-8 space-y-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{editingCustomer?.id ? 'Editar' : 'Novo'} Cliente</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Nome da Empresa / Fantasia</label>
                  <input placeholder="Ex: Boutique da Beleza" value={editingCustomer?.empresa || ''} onChange={e => setEditingCustomer({...editingCustomer, empresa: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">CNPJ / CPF</label>
                    <input placeholder="00.000.000/0001-00" value={editingCustomer?.cnpj || ''} onChange={e => setEditingCustomer({...editingCustomer, cnpj: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Responsável</label>
                    <input placeholder="Nome do contato" value={editingCustomer?.responsavel || ''} onChange={e => setEditingCustomer({...editingCustomer, responsavel: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Telefone / WhatsApp</label>
                  <input placeholder="Ex: 11 99999-9999" value={editingCustomer?.telefone || ''} onChange={e => setEditingCustomer({...editingCustomer, telefone: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Vendedor Responsável</label>
                  <select 
                    value={editingCustomer?.seller_id || ''} 
                    onChange={e => setEditingCustomer({...editingCustomer, seller_id: parseInt(e.target.value)})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                  >
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Cliente Ativo</span>
                  <input type="checkbox" checked={!!editingCustomer?.ativo} onChange={e => setEditingCustomer({...editingCustomer, ativo: e.target.checked ? 1 : 0})} className="w-6 h-6 accent-primary rounded-lg" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-semibold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-4 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-all">Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminCategoriesScreen({ categories, onRefresh, companyId }: { categories: Category[], onRefresh: () => void, companyId: number }) {
  const [newCat, setNewCat] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newCat) return;
    setLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ nome: newCat, palavras_chave: newKeywords, company_id: companyId })
      });
      const data = await res.json();
      if (data.success) {
        setNewCat('');
        setNewKeywords('');
        onRefresh();
      } else {
        alert(data.message || 'Erro ao adicionar categoria');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar categoria. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.message || 'Erro ao excluir categoria');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir categoria');
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Categorias</h2>
      
      <Card className="p-8 space-y-6">
        <h3 className="text-xl font-bold text-slate-900">Nova Categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Nome da Categoria</label>
            <input 
              placeholder="Ex: Maquiagem" 
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
              value={newCat} 
              onChange={e => setNewCat(e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Palavras-chave (ajuda na IA)</label>
            <input 
              placeholder="Ex: batom, rimel, base, corretivo" 
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
              value={newKeywords} 
              onChange={e => setNewKeywords(e.target.value)} 
            />
          </div>
        </div>
        <button 
          onClick={handleAdd} 
          disabled={loading}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Adicionando...' : 'Adicionar Categoria'}
        </button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(c => (
          <Card key={c.id} className="p-5 flex items-center justify-between group hover:border-primary/20 transition-all">
            <div>
              <p className="font-bold text-slate-800">{c.nome}</p>
              {c.palavras_chave && (
                <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">Keywords: {c.palavras_chave}</p>
              )}
            </div>
            <button 
              onClick={() => handleDelete(c.id)} 
              className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"
            >
              <Trash2 size={18} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminUploadScreen({ categories, onRefresh, companyId }: { categories: Category[], onRefresh: () => void, companyId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'extracting' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [catalogType, setCatalogType] = useState<'full' | 'partial'>('full');
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);
  const [totalProductsExtracted, setTotalProductsExtracted] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('extracting');
    setProgress(5);
    
    // Start session if it's a full catalog and no session is active
    let currentSessionTime = sessionStartTime;
    if (catalogType === 'full' && !currentSessionTime) {
      currentSessionTime = new Date().toISOString();
      setSessionStartTime(currentSessionTime);
    }

    try {
      setProgress(20);
      const extracted = await geminiService.extractProductsFromPDF(file, categories);
      
      if (!extracted || extracted.length === 0) {
        throw new Error("Nenhum produto extraído. Verifique se o PDF contém dados legíveis.");
      }

      setProgress(70);
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          products: extracted, 
          catalogType, 
          company_id: companyId,
          sessionStartTime: currentSessionTime 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao salvar produtos no servidor.");
      }
      
      setProgress(100);
      setTotalProductsExtracted(prev => prev + extracted.length);
      setUploadedFilesCount(prev => prev + 1);
      setStatus('done');
      setFile(null);
      onRefresh();
    } catch (err: any) {
      console.error("Erro no upload:", err);
      alert(`Erro no processamento: ${err.message || 'Erro desconhecido'}`);
      setStatus('idle');
      setProgress(0);
    }
  };

  const handleFinalizeSession = async () => {
    if (!sessionStartTime) return;
    setLoading(true);
    try {
      const res = await fetch('/api/products/finalize-session', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ company_id: companyId, sessionStartTime })
      });
      if (res.ok) {
        alert('Processamento finalizado! Verifique os itens não encontrados na aba de Pendências.');
        setSessionStartTime(null);
        setUploadedFilesCount(0);
        setTotalProductsExtracted(0);
        onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Deseja apagar TODOS os produtos do catálogo? Isso não afetará categorias, vendedores ou clientes.')) {
      try {
        const res = await fetch('/api/products/reset', { 
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ company_id: companyId })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          onRefresh();
          alert('Catálogo resetado com sucesso!');
        } else {
          throw new Error(result.message || 'Erro ao resetar catálogo');
        }
      } catch (e: any) {
        alert(`Erro: ${e.message}`);
      }
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Atualizar Catálogo</h2>
        <button 
          onClick={handleReset}
          className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95"
        >
          Resetar Catálogo
        </button>
      </div>

      {sessionStartTime && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-primary/5 border border-primary/20 rounded-[32px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-900">Sessão de Upload Ativa</p>
              <p className="text-xs text-slate-500">{uploadedFilesCount} arquivos processados • {totalProductsExtracted} produtos</p>
            </div>
          </div>
          <button 
            onClick={handleFinalizeSession}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            Finalizar e Verificar Faltantes
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => { setCatalogType('full'); setSessionStartTime(null); setUploadedFilesCount(0); setTotalProductsExtracted(0); }}
          className={`p-8 rounded-[32px] border-2 transition-all text-left space-y-4 relative overflow-hidden ${catalogType === 'full' ? 'border-primary bg-primary text-white shadow-xl shadow-primary/20' : 'border-slate-100 bg-white text-slate-400 hover:border-primary/30'}`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`p-3 rounded-2xl ${catalogType === 'full' ? 'bg-white/20' : 'bg-slate-50'}`}>
              <FileText size={28} className={catalogType === 'full' ? 'text-white' : 'text-slate-400'} />
            </div>
            {catalogType === 'full' && <CheckCircle2 size={24} />}
          </div>
          <div className="relative z-10">
            <p className="font-bold text-xl mb-1">Catálogo Completo</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Snapshot Semanal • Suporta múltiplos PDFs</p>
          </div>
          {catalogType === 'full' && <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />}
        </button>

        <button 
          onClick={() => { setCatalogType('partial'); setSessionStartTime(null); setUploadedFilesCount(0); setTotalProductsExtracted(0); }}
          className={`p-8 rounded-[32px] border-2 transition-all text-left space-y-4 relative overflow-hidden ${catalogType === 'partial' ? 'border-gold bg-gold text-white shadow-xl shadow-gold/20' : 'border-slate-100 bg-white text-slate-400 hover:border-primary/30'}`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`p-3 rounded-2xl ${catalogType === 'partial' ? 'bg-white/20' : 'bg-slate-50'}`}>
              <Plus size={28} className={catalogType === 'partial' ? 'text-white' : 'text-slate-400'} />
            </div>
            {catalogType === 'partial' && <CheckCircle2 size={24} />}
          </div>
          <div className="relative z-10">
            <p className="font-bold text-xl mb-1">Catálogo Parcial</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Novidades • Adiciona ao Existente</p>
          </div>
          {catalogType === 'partial' && <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />}
        </button>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm text-center space-y-6">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
          <Upload size={48} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Upload do PDF</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            {catalogType === 'full' 
              ? 'Você pode subir vários arquivos um por um. O sistema só desativará itens não encontrados após você clicar em "Finalizar".' 
              : 'Selecione o arquivo para adicionar novos produtos ao catálogo.'}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="pdf-upload"
          />
          <label 
            htmlFor="pdf-upload"
            className="flex items-center justify-center gap-3 p-5 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-primary/50 hover:bg-primary-light/10 transition-all group"
          >
            <FileText size={20} className="text-slate-400 group-hover:text-primary transition-colors" />
            <span className="text-sm font-semibold text-slate-500 group-hover:text-primary transition-colors">
              {file ? file.name : 'Selecionar arquivo PDF'}
            </span>
          </label>
        </div>

        {status === 'idle' && file && (
          <button 
            onClick={handleUpload}
            className="w-full max-w-md py-4 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            {catalogType === 'full' && sessionStartTime ? 'Processar Próximo PDF' : 'Iniciar Extração IA'}
          </button>
        )}

        {status === 'extracting' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
              {progress < 30 ? 'Lendo PDF...' : progress < 70 ? 'IA Extraindo Produtos...' : 'Finalizando...'}
            </p>
          </div>
        )}

        {status === 'done' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-500 font-bold">
              <CheckCircle2 size={24} />
              <span>Arquivo Processado!</span>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => { setStatus('idle'); setFile(null); setProgress(0); }}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-semibold"
              >
                Subir Outro PDF
              </button>
              {catalogType === 'full' && (
                <button 
                  onClick={handleFinalizeSession}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/20"
                >
                  Finalizar Tudo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminCompaniesScreen({ onRefresh }: { onRefresh: () => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCompany, setNewCompany] = useState({ nome: '', cnpj: '', telefone: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies', { headers: getHeaders(false) });
      if (res.ok) setCompanies(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const res = await fetch('/api/company/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCompany)
    });
    if (res.ok) {
      setShowAdd(false);
      fetchCompanies();
      onRefresh();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Minhas Marcas</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          Nova Marca
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map(c => (
            <Card key={c.id} className="p-6 flex items-center gap-6 group hover:border-primary/20 transition-all">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.nome} className="w-full h-full object-cover" />
                ) : (
                  <Package size={32} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-slate-800">{c.nome}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CNPJ: {c.cnpj}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge color="primary">Ativa</Badge>
                <button 
                  onClick={async () => {
                    if (confirm(`Deseja realmente excluir a marca ${c.nome}?`)) {
                      const res = await fetch(`/api/company/${c.id}`, { method: 'DELETE', headers: getHeaders(false) });
                      if (res.ok) fetchCompanies();
                    }
                  }}
                  className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 p-8 space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Cadastrar Nova Marca</h3>
              <div className="space-y-4">
                <input placeholder="Nome da Marca" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-primary/20" onChange={e => setNewCompany({...newCompany, nome: e.target.value})} />
                <input placeholder="CNPJ" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-primary/20" onChange={e => setNewCompany({...newCompany, cnpj: e.target.value})} />
                <input placeholder="Telefone" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-primary/20" onChange={e => setNewCompany({...newCompany, telefone: e.target.value})} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                <button onClick={handleAdd} className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20">Cadastrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function AdminPendingScreen({ products, categories, onRefresh, onEdit }: { products: Product[], categories: Category[], onRefresh: () => void, onEdit: (p: Product) => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'updates' | 'missing'>('updates');
  
  const updates = products.filter(p => 
    (p.categoria_pendente || p.imagem_pendente || (p.pending_status && p.pending_status !== 'none')) &&
    p.pending_status !== 'not_found_full'
  );

  const missing = products.filter(p => p.pending_status === 'not_found_full');

  const handleResolve = async (product: Product, updates: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...product, ...updates, pending_status: 'none' })
      });
      if (!res.ok) throw new Error('Falha ao resolver pendência');
      onRefresh();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    }
  };

  const currentList = activeSubTab === 'updates' ? updates : missing;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Pendências</h2>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveSubTab('updates')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeSubTab === 'updates' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
          >
            Atualizações ({updates.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('missing')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${activeSubTab === 'missing' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}
          >
            Não Encontrados ({missing.length})
          </button>
        </div>
      </div>

      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className={`w-24 h-24 ${activeSubTab === 'updates' ? 'bg-green-50 text-green-500' : 'bg-slate-50 text-slate-300'} rounded-full flex items-center justify-center mb-6 shadow-sm`}>
            {activeSubTab === 'updates' ? <CheckCircle2 size={48} strokeWidth={1.5} /> : <Search size={48} strokeWidth={1.5} />}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Tudo em ordem!</h3>
          <p className="text-slate-400 text-sm max-w-xs">Não há itens nesta categoria para revisar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentList.map(p => (
            <Card key={p.id} className="p-6 flex flex-col group hover:border-primary/20 transition-all">
              <div className="flex gap-5 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden border border-slate-50 shadow-sm flex-shrink-0">
                    <img 
                      src={p.imagem || `https://picsum.photos/seed/${p.sku}/100/100`} 
                      className="w-full h-full object-contain p-1" 
                      alt={p.nome} 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow-md border border-slate-50">
                    <AlertCircle size={14} className={activeSubTab === 'missing' ? 'text-rose-500' : 'text-amber-500'} />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2">{p.nome}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SKU: {p.sku}</p>
                  <div className="mt-3">
                    <button 
                      onClick={() => onEdit(p)} 
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark transition-colors"
                    >
                      <Settings size={12}/>
                      Editar Produto
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto space-y-4">
                {p.pending_status === 'not_found_full' && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Item não presente no último catálogo</p>
                    <p className="text-[10px] text-rose-400 leading-tight">Este item não foi encontrado nos PDFs processados. Deseja desativá-lo ou mantê-lo ativo?</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleResolve(p, { ativo: false })}
                        className="flex-1 py-2.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-sm active:scale-95 transition-all"
                      >
                        Desativar
                      </button>
                      <button 
                        onClick={() => handleResolve(p, { ativo: true })}
                        className="flex-1 py-2.5 bg-white text-rose-600 border border-rose-200 text-[10px] font-bold uppercase tracking-widest rounded-xl active:scale-95 transition-all"
                      >
                        Manter Ativo
                      </button>
                    </div>
                  </div>
                )}

                {p.pending_status === 'price_changed' && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Alteração de Preço</p>
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-amber-100/50">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase text-slate-400 font-bold">Anterior</span>
                        <span className="text-xs font-bold text-slate-500 line-through">R$ {p.last_price?.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] uppercase text-amber-600 font-bold">Novo</span>
                        <span className="text-sm font-bold text-amber-600">R$ {p.preco_unitario?.toFixed(2)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolve(p, {})}
                      className="w-full py-3 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                      Confirmar Novo Preço
                    </button>
                  </div>
                )}

                {p.pending_status === 'box_changed' && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Alteração de Caixa</p>
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-blue-100/50">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase text-slate-400 font-bold">Anterior</span>
                        <span className="text-xs font-bold text-slate-500">{p.last_box_qty} un</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] uppercase text-blue-600 font-bold">Novo</span>
                        <span className="text-sm font-bold text-blue-600">{p.qtd_box} un</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolve(p, {})}
                      className="w-full py-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                      Confirmar Nova Caixa
                    </button>
                  </div>
                )}

                {p.categoria_pendente && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categoria Pendente</p>
                    <select 
                      className="w-full p-3 bg-white rounded-xl text-xs font-bold outline-none border border-slate-200 focus:border-primary transition-all appearance-none"
                      onChange={(e) => {
                        const catId = e.target.value;
                        if (!catId) return;
                        handleResolve(p, { categoria_id: parseInt(catId), categoria_pendente: false });
                      }}
                    >
                      <option value="">Escolher Categoria...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                )}

                {p.imagem_pendente && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Imagem Pendente</p>
                    <button 
                      onClick={() => onEdit(p)}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                    >
                      Ajustar Imagem
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductEditModal({ product, categories, onClose, onSave }: { product: Product, categories: Category[], onClose: () => void, onSave: () => void }) {
  const [data, setData] = useState<Partial<Product>>({ ...product });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const isNew = !product.id;
      const url = isNew ? '/api/products' : `/api/products/${product.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          ...data,
          pending_status: 'none', // Manual save resolves pendencies
          categoria_pendente: false,
          imagem_pendente: false,
          company_id: data.company_id || parseInt(localStorage.getItem('vendpro_active_company_id') || '1')
        })
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        onSave();
      } else {
        throw new Error(result.message || 'Erro ao salvar produto');
      }
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setData({ ...data, imagem: ev.target?.result as string, imagem_pendente: false });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{product.id ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-primary transition-colors"><X size={24}/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          {/* Image Section */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Imagem do Produto</label>
            <div className="flex gap-6 items-start">
              <div className="w-32 h-32 bg-slate-50 rounded-[24px] overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                <img src={data.imagem || `https://picsum.photos/seed/${data.sku}/200/200`} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 space-y-3">
                <input 
                  type="text" 
                  placeholder="URL da Imagem" 
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={data.imagem || ''}
                  onChange={e => setData({ ...data, imagem: e.target.value, imagem_pendente: false })}
                />
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    id="edit-img-upload" 
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="edit-img-upload" className="w-full p-4 bg-primary text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95">
                    <Upload size={16} />
                    Upload Arquivo
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Nome</label>
              <input value={data.nome || ''} onChange={e => setData({...data, nome: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">SKU</label>
              <input value={data.sku || ''} onChange={e => setData({...data, sku: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Preço Unit.</label>
              <input type="number" value={data.preco_unitario || 0} onChange={e => setData({...data, preco_unitario: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Preço Box</label>
              <input type="number" value={data.preco_box || 0} onChange={e => setData({...data, preco_box: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Qtd Box</label>
              <input type="number" value={data.qtd_box || 0} onChange={e => setData({...data, qtd_box: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-sm font-bold text-slate-700">Venda Somente Box</span>
              <input 
                type="checkbox" 
                checked={!!data.venda_somente_box} 
                onChange={e => setData({...data, venda_somente_box: e.target.checked})}
                className="w-6 h-6 accent-primary rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-sm font-bold text-slate-700">Produto Ativo</span>
              <input 
                type="checkbox" 
                checked={data.ativo !== false} 
                onChange={e => setData({...data, ativo: e.target.checked})}
                className="w-6 h-6 accent-primary rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status Estoque</label>
              <select 
                value={data.status_estoque || 'normal'} 
                onChange={e => setData({...data, status_estoque: e.target.value as any})}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="normal">Normal</option>
                <option value="baixo">Estoque Baixo</option>
                <option value="ultimas">Últimas Unidades</option>
                <option value="esgotado">Esgotado</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Categoria</label>
              <select 
                value={data.categoria_id || ''} 
                onChange={e => setData({...data, categoria_id: parseInt(e.target.value), categoria_pendente: false})}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="">Sem Categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl font-semibold border border-slate-200 hover:bg-slate-100 transition-all">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="flex-1 py-4 bg-primary text-white rounded-2xl font-semibold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SellerCustomersScreen({ user }: { user: any }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/customers?seller_id=${user.id}`, { headers: getHeaders(false) })
      .then(r => {
        if (!r.ok) throw new Error('Erro ao carregar clientes');
        return r.json();
      })
      .then(data => {
        setCustomers(data.filter((c: any) => c.seller_id === user.id));
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user.id]);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Meus Clientes</h2>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium">Carregando seus clientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map(c => (
            <Card key={c.id} className="p-6 hover:border-primary/20 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-light/20 rounded-2xl flex items-center justify-center text-primary">
                  <User size={24} />
                </div>
                <Badge color={c.ativo ? 'green' : 'red'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{c.empresa}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Resp: {c.responsavel}</p>
              
              <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                <div className="flex-1">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">CNPJ / CPF</p>
                  <p className="text-xs font-semibold text-slate-600">{c.cnpj || 'Não informado'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Telefone</p>
                  <p className="text-xs font-semibold text-slate-600">{c.telefone || 'Não informado'}</p>
                </div>
              </div>
            </Card>
          ))}
          {customers.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-400 font-medium">Nenhum cliente vinculado à sua conta.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SellerOrdersScreen({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tighter">Pedidos Recebidos</h2>
      <Card className="p-10 text-center bg-black/5 border-none">
        <Package size={48} className="mx-auto mb-4 text-black/20" />
        <p className="font-bold">Em breve</p>
        <p className="text-xs text-black/40">Os pedidos enviados via WhatsApp serão listados aqui para seu controle.</p>
      </Card>
    </div>
  );
}

function AccountScreen({ user, role }: { user: any, role: UserRole }) {
  const [companyData, setCompanyData] = useState<any>(null);

  useEffect(() => {
    if (role === 'company') {
      fetch(`/api/company/${user?.id || 1}`, { headers: getHeaders(false) })
        .then(r => {
          if (!r.ok) throw new Error('Erro ao carregar dados da empresa');
          return r.json();
        })
        .then(setCompanyData)
        .catch(err => console.error(err));
    }
  }, [role, user]);

  const handleSaveCompany = async () => {
    await fetch(`/api/company/${user?.id || 1}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(companyData)
    });
    alert('Configurações salvas!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyData({ ...companyData, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Minha Conta</h2>
      
      <Card className="p-8">
        <div className="flex items-center gap-6 mb-10">
          {role === 'company' && companyData?.logo_url ? (
            <img src={companyData.logo_url} alt={companyData.nome} className="w-20 h-20 rounded-[24px] object-cover shadow-lg shadow-primary/20" />
          ) : (
            <div className="w-20 h-20 blue-gradient rounded-[24px] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/20">
              {user?.nome?.[0] || user?.empresa?.[0] || 'U'}
            </div>
          )}
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">{user?.nome || user?.empresa || companyData?.nome}</h3>
            <Badge color="primary">{role === 'company' ? 'Administrador' : role === 'seller' ? 'Vendedor' : 'Cliente'}</Badge>
          </div>
        </div>

        <div className="space-y-1 mb-10">
          <InfoRow label="CNPJ/CPF" value={role === 'company' ? companyData?.cnpj : user?.cnpj || 'Não informado'} />
          <InfoRow label="Telefone" value={role === 'company' ? companyData?.telefone : user?.telefone || 'Não informado'} />
          {role === 'customer' && <InfoRow label="Vendedor Vinculado" value={user?.sellerCode} />}
        </div>

        {role === 'company' && companyData && (
          <div className="space-y-6 pt-8 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Configurações da Empresa</p>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Pedido Mínimo (R$)</label>
                <input 
                  type="number" 
                  value={companyData.minimum_order_value || 0} 
                  onChange={e => setCompanyData({...companyData, minimum_order_value: parseFloat(e.target.value)})} 
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Política de Pagamento</label>
                <textarea 
                  placeholder="Ex: Boleto 30/60 ou 5% desc. no PIX" 
                  value={companyData.payment_policy || ''} 
                  onChange={e => setCompanyData({...companyData, payment_policy: e.target.value})} 
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px]" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Política de Envio / Frete</label>
                <textarea 
                  placeholder="Ex: Frete grátis acima de R$ 1.500,00" 
                  value={companyData.shipping_policy || ''} 
                  onChange={e => setCompanyData({...companyData, shipping_policy: e.target.value})} 
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px]" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Logo da Empresa</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id="company-logo-upload" 
                      onChange={handleLogoUpload}
                    />
                    <label htmlFor="company-logo-upload" className="w-full p-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer border border-slate-200 hover:bg-slate-100 transition-all">
                      <Upload size={18} />
                      Fazer Upload do Logo
                    </label>
                  </div>
                  {companyData.logo_url && (
                    <button onClick={() => setCompanyData({...companyData, logo_url: null})} className="p-4 text-rose-500 bg-rose-50 rounded-2xl hover:bg-rose-100 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Telefone</label>
                <input 
                  type="text"
                  value={companyData.telefone || ''} 
                  onChange={e => setCompanyData({...companyData, telefone: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 px-1 tracking-wider">Pedido Mínimo (R$)</label>
                <input 
                  type="number"
                  value={companyData.minimum_order_value || 0} 
                  onChange={e => setCompanyData({...companyData, minimum_order_value: parseFloat(e.target.value)})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
                />
              </div>
              <button 
                onClick={handleSaveCompany}
                className="w-full py-4 bg-primary text-white rounded-2xl font-semibold mt-4 shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

        {role === 'seller' && (
          <div className="space-y-4 pt-8 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Seu Link de Vendedor</p>
            <div className="p-5 bg-primary-light/30 rounded-2xl break-all font-mono text-xs leading-relaxed text-primary border border-primary/10">
              {window.location.origin}?code={user.codigo_vinculo}
            </div>
            <p className="text-[10px] font-medium text-slate-400 leading-relaxed">Compartilhe este link com seus clientes para que eles se vinculem automaticamente a você.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value?: string }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );
}

// --- UI Helpers ---

function TabItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 relative transition-all duration-300 ${active ? 'text-primary scale-110' : 'text-slate-300'}`}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
          {badge}
        </span>
      )}
    </button>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-semibold transition-all relative overflow-hidden ${
        active 
          ? 'bg-primary-light/50 text-primary' 
          : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      {active && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />}
      <span className={active ? 'text-primary' : 'text-slate-400'}>{icon}</span>
      {label}
    </button>
  );
}
