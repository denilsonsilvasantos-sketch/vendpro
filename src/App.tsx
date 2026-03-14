import { useState, useEffect } from 'react';
import { getProducts } from "./services/productService";
import { validateSellerCode } from './services/sellerService';
import { registerCompany, loginCompany, getCompanyById } from './services/companyService';
import { getCustomerByCnpj, createCustomer } from './services/customerService';
import { supabase } from './integrations/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  User, 
  Settings, 
  Package, 
  Users, 
  Upload as UploadIcon, 
  Tag,
  AlertTriangle,
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
import { Product, Category, Seller, Customer, UserRole, CartItem, Company, Brand } from './types';
import { mockProducts, mockCategories, mockCompany } from './lib/mockData';
import { Card } from './components/Card';
import { Badge } from './components/Badge';
import { Dashboard, Produtos, Clientes, Pedidos, Marcas, Upload, Pendencias, Account, Vendedores } from './pages';
import ProductFormModal from './components/ProductFormModal';
import CartScreen from './pages/CartScreen';

// --- Helper Components ---

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-slate-50'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function TabItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 relative ${active ? 'text-primary' : 'text-slate-400'}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
          {badge}
        </span>
      )}
    </button>
  );
}

function getHeaders() {
  const user = JSON.parse(localStorage.getItem('vendpro_user') || '{}');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token || ''}`
  };
}

export default function App() {
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('vendpro_role');
    const activeCompanyId = localStorage.getItem('vendpro_active_company_id');
    const isValidUUID = activeCompanyId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeCompanyId);
    
    if (activeCompanyId && !isValidUUID) {
      localStorage.removeItem('vendpro_active_company_id');
      localStorage.removeItem('vendpro_role');
      localStorage.removeItem('vendpro_user');
      return null;
    }
    return saved ? (saved as UserRole) : null;
  });
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('vendpro_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [profile, setProfile] = useState<any>(null);

  const handleCompanyChange = (newCompanyId: string) => {
    if (cart.length > 0) {
      setPendingCompanyId(newCompanyId);
      setShowCompanyWarning(true);
    } else {
      setActiveCompanyId(newCompanyId);
      localStorage.setItem('vendpro_active_company_id', newCompanyId);
    }
  };

  const confirmCompanyChange = () => {
    if (pendingCompanyId) {
      clearCart();
      setActiveCompanyId(pendingCompanyId);
      localStorage.setItem('vendpro_active_company_id', pendingCompanyId);
      setPendingCompanyId(null);
      setShowCompanyWarning(false);
    }
  };

  const cancelCompanyChange = () => {
    setPendingCompanyId(null);
    setShowCompanyWarning(false);
  };

  const handleBrandChange = (newBrandId: string) => {
    if (cart.length > 0) {
      setPendingBrandId(newBrandId);
      setShowBrandWarning(true);
    } else {
      setActiveBrandId(newBrandId);
    }
  };

  const confirmBrandChange = () => {
    if (pendingBrandId) {
      clearCart();
      setActiveBrandId(pendingBrandId);
      setPendingBrandId(null);
      setShowBrandWarning(false);
    }
  };

  const cancelBrandChange = () => {
    setPendingBrandId(null);
    setShowBrandWarning(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('vincular');
    if (code) {
      localStorage.setItem('vendpro_seller_code', code);
    }
  }, []);
  const [activeTab, setActiveTab] = useState('catalog');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [pendingBrandId, setPendingBrandId] = useState<string | null>(null);
  const [showBrandWarning, setShowBrandWarning] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>(() => JSON.parse(localStorage.getItem('vendpro_available_companies') || '[]'));
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(() => {
    const saved = localStorage.getItem('vendpro_active_company_id');
    const isValidUUID = saved && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved);
    if (saved && !isValidUUID) {
      localStorage.removeItem('vendpro_active_company_id');
      localStorage.removeItem('vendpro_role');
      localStorage.removeItem('vendpro_user');
      return null;
    }
    return saved ? saved : null;
  });
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showCartDisclaimer, setShowCartDisclaimer] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'customer'>('admin');
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [showCompanyWarning, setShowCompanyWarning] = useState(false);
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, total } = useCart();

  const effectiveRole = viewMode === 'customer' ? 'customer' : role;

  const handleAddToCart = (product: Product, quantity: number) => {
    if (cart.length === 0) {
      setShowCartDisclaimer(true);
    }
    addToCart(product, quantity);
  };

  useEffect(() => {
    console.log("Active Company ID:", activeCompanyId);
    async function loadData() {
      if (activeCompanyId) {
        setLoading(true);
        try {
          const [fetchedProducts, fetchedCompany] = await Promise.all([
            getProducts(activeCompanyId.toString()),
            getCompanyById(activeCompanyId)
          ]);
          setProducts(fetchedProducts);
          setCompany(fetchedCompany);
          
          // Also fetch categories and brands for this company
          if (supabase) {
            const { data: catData } = await supabase.from('categories').select('*').eq('company_id', activeCompanyId).order('ordem', { ascending: true }).order('nome');
            setCategories(catData || []);
            
            const { data: brandData } = await supabase.from('brands').select('*').eq('company_id', activeCompanyId).order('ordem', { ascending: true }).order('name');
            setBrands(brandData || []);
            if (brandData && brandData.length > 0) {
              setActiveBrandId(brandData[0].id);
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    loadData();
  }, [activeCompanyId]);

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

  const handleLogout = async () => {
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
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
      </>
    );
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
          // fetchData(); // Assuming fetchData is defined elsewhere or not needed
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
        {showCompanyWarning && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight text-center">Atenção</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Você tem itens no carrinho. Cada marca opera individualmente com suas próprias políticas comerciais.
                  <br/><br/>
                  Ao mudar de marca, seu carrinho atual será esvaziado. Deseja continuar?
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={cancelCompanyChange}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmCompanyChange}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                  Esvaziar e Mudar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBrandWarning && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight text-center">Atenção</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Você tem itens no carrinho. Cada marca opera individualmente com suas próprias políticas comerciais.
                  <br/><br/>
                  Ao mudar de marca, seu carrinho atual será esvaziado. Deseja continuar?
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={cancelBrandChange}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmBrandChange}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                  Esvaziar e Mudar
                </button>
              </div>
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
        <div className="flex items-center gap-2 flex-1 ml-2">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.nome} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
          ) : (
            <div className="w-8 h-8 blue-gradient rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <CheckCircle2 size={18} />
            </div>
          )}
          
          {availableCompanies.length > 1 ? (
            <select 
              value={activeCompanyId || ''} 
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="bg-transparent text-xl font-bold tracking-tight text-slate-900 outline-none cursor-pointer appearance-none truncate max-w-[150px] sm:max-w-xs"
            >
              {availableCompanies.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">{company?.nome || 'VendPro'}</h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab('cart')} className="relative p-2 text-slate-600 hover:text-primary transition-colors">
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                {cart.length}
              </span>
            )}
          </button>
        </div>
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

              <nav className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <SidebarItem icon={<LayoutGrid size={20}/>} label="Catálogo" active={activeTab === 'catalog'} onClick={() => { setActiveTab('catalog'); setIsSidebarOpen(false); }} />
                
                {effectiveRole !== 'customer' && (
                  <>
                    <SidebarItem icon={<LayoutGrid size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Package size={20}/>} label="Produtos" active={activeTab === 'produtos'} onClick={() => { setActiveTab('produtos'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<UploadIcon size={20}/>} label="Upload" active={activeTab === 'upload'} onClick={() => { setActiveTab('upload'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<AlertTriangle size={20}/>} label="Pendências" active={activeTab === 'pendencias'} onClick={() => { setActiveTab('pendencias'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Tag size={20}/>} label="Marcas" active={activeTab === 'marcas'} onClick={() => { setActiveTab('marcas'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Users size={20}/>} label="Vendedores" active={activeTab === 'vendedores'} onClick={() => { setActiveTab('vendedores'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Users size={20}/>} label="Clientes" active={activeTab === 'clientes'} onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<FileText size={20}/>} label="Pedidos" active={activeTab === 'pedidos'} onClick={() => { setActiveTab('pedidos'); setIsSidebarOpen(false); }} />
                    
                    <div className="h-px bg-slate-100 my-6 mx-2" />
                    
                    <SidebarItem 
                      icon={<User size={20}/>} 
                      label="Visão do Cliente" 
                      active={false} 
                      onClick={() => { 
                        setViewMode('customer'); 
                        setActiveTab('catalog');
                        setIsSidebarOpen(false); 
                      }} 
                    />
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
      <main className="p-4 max-w-5xl mx-auto relative">
        {viewMode === 'customer' && role !== 'customer' && (
          <button
            onClick={() => setViewMode('admin')}
            className="fixed bottom-6 left-6 z-50 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl hover:bg-slate-700 transition-all flex items-center gap-2 opacity-50 hover:opacity-100"
          >
            <LogOut size={14} className="rotate-180" />
            Voltar para Admin
          </button>
        )}

        {activeTab === 'catalog' && (
          <CatalogScreen 
            products={products} 
            categories={categories} 
            brands={brands}
            activeBrandId={activeBrandId}
            onBrandChange={handleBrandChange}
            onAddToCart={handleAddToCart} 
            onEdit={setEditingProduct} 
            role={effectiveRole} 
            onZoom={setZoomImage}
          />
        )}
        {activeTab === 'cart' && <CartScreen cart={cart} total={total} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onSendOrder={clearCart} />}
        {activeTab === 'dashboard' && <Dashboard companyId={activeCompanyId} />}
        {activeTab === 'produtos' && <Produtos companyId={activeCompanyId} />}
        {activeTab === 'upload' && <Upload companyId={activeCompanyId} />}
        {activeTab === 'pendencias' && <Pendencias companyId={activeCompanyId} />}
        {activeTab === 'marcas' && <Marcas companyId={activeCompanyId} />}
        {activeTab === 'vendedores' && <Vendedores companyId={activeCompanyId} />}
        {activeTab === 'clientes' && <Clientes companyId={activeCompanyId} />}
        {activeTab === 'pedidos' && <Pedidos companyId={activeCompanyId} />}
        {activeTab === 'account' && <Account user={user} role={role} companyId={activeCompanyId} onLogout={handleLogout} />}
      </main>

      <AnimatePresence>
        {editingProduct && (
          <ProductFormModal 
            product={editingProduct} 
            companyId={activeCompanyId}
            onClose={() => setEditingProduct(null)} 
            onSave={() => { setEditingProduct(null); }} 
          />
        )}
      </AnimatePresence>

      {/* Bottom Tabs removed */}
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
  const [customerData, setCustomerData] = useState({ nome: '', cnpj: '', telefone: '', responsavel: '' });
  const [companyData, setCompanyData] = useState({ nome: '', cnpj: '', telefone: '', responsavel: '', senha: '' });
  const [companyLoginCnpj, setCompanyLoginCnpj] = useState('');
  const [companyLoginSenha, setCompanyLoginSenha] = useState('');
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

  useEffect(() => {
    const savedCode = localStorage.getItem('vendpro_seller_code');
    if (savedCode) {
      setSellerCode(savedCode);
      setLoginType('customer');
      setView('seller-code');
      // Automatically try to validate if we have a saved code
      handleSellerCodeSubmit(savedCode);
    }
  }, []);

  const handleSellerCodeSubmit = async (codeToValidate?: string) => {
    const code = (codeToValidate || sellerCode).trim().toUpperCase();
    if (code === 'ADMIN') {
      if (supabase) {
        const { data } = await supabase.from('companies').select('*').limit(1);
        if (data && data.length > 0) {
          onLogin('company', data[0], [data[0]]);
        } else {
          const { data: newCompany, error } = await supabase.from('companies').insert([{ nome: 'VendPro Matriz' }]).select().single();
          if (newCompany) {
            onLogin('company', newCompany, [newCompany]);
          } else {
            alert('Erro ao criar empresa padrão: ' + (error?.message || 'Erro desconhecido'));
          }
        }
      }
      return;
    }
    
    const result = await validateSellerCode(code);
    if (result.success) {
      setSellerInfo(result.seller);
      setAvailableCompanies(result.companies || []);
      if (loginType === 'seller' && !codeToValidate) {
        onLogin('seller', result.seller, result.companies);
      } else {
        setView('customer-form');
      }
    } else {
      if (!codeToValidate) {
        alert('Código inválido. Tente ADMIN ou um código de vendedor válido.');
      } else {
        localStorage.removeItem('vendpro_seller_code');
        setView('role');
      }
    }
  };

  const handleCustomerSubmit = async () => {
    if (!customerData.cnpj) {
      alert('Por favor, informe seu CNPJ.');
      return;
    }

    if (sellerInfo && availableCompanies.length > 0) {
      // Check if customer exists
      const existingCustomer = await getCustomerByCnpj(customerData.cnpj, sellerInfo.id);
      
      if (existingCustomer) {
        // Login existing customer
        onLogin('customer', { 
          ...existingCustomer, 
          sellerCode,
          vendedor_nome: sellerInfo.nome,
          vendedor_whatsapp: sellerInfo.whatsapp
        }, availableCompanies);
      } else {
        // Create new customer
        if (!customerData.nome || !customerData.telefone) {
          alert('Para o primeiro acesso, preencha todos os campos.');
          return;
        }
        
        const newCustomer = await createCustomer(availableCompanies[0].id, {
          nome: customerData.nome,
          cnpj: customerData.cnpj,
          telefone: customerData.telefone,
          responsavel: customerData.responsavel,
          seller_id: sellerInfo.id
        });

        if (newCustomer) {
          onLogin('customer', { 
            ...newCustomer, 
            sellerCode,
            vendedor_nome: sellerInfo.nome,
            vendedor_whatsapp: sellerInfo.whatsapp
          }, availableCompanies);
        } else {
          alert('Erro ao criar cadastro. Tente novamente.');
        }
      }
    } else {
      // Fallback if no seller info (should not happen if flow is correct)
      onLogin('customer', { 
        ...customerData, 
        sellerCode,
        vendedor_nome: sellerInfo?.nome,
        vendedor_whatsapp: sellerInfo?.whatsapp
      }, availableCompanies);
    }
  };

  const handleCompanyRegister = async () => {
    const result = await registerCompany(companyData);
    if (result.success) {
      onLogin('company', result.company);
    } else {
      alert(result.message || 'Erro ao cadastrar empresa');
    }
  };

  const handleCompanyLogin = async () => {
    const cnpj = companyLoginCnpj.trim();
    const senha = companyLoginSenha.trim();
    
    if (cnpj.toUpperCase() === 'ADMIN') {
      if (supabase) {
        const { data } = await supabase.from('companies').select('*').limit(1);
        if (data && data.length > 0) {
          onLogin('company', data[0]);
        } else {
          const { data: newCompany, error } = await supabase.from('companies').insert([{ nome: 'VendPro Matriz' }]).select().single();
          if (newCompany) {
            onLogin('company', newCompany);
          } else {
            alert('Erro ao criar empresa padrão: ' + (error?.message || 'Erro desconhecido'));
          }
        }
      }
      return;
    }
    
    if (!cnpj || !senha) {
      alert('Preencha o CNPJ e a senha.');
      return;
    }

    const result = await loginCompany(cnpj, senha);
    if (result.success) {
      onLogin('company', result.company);
    } else {
      alert(result.message || 'Empresa não encontrada ou senha incorreta');
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
              placeholder="CNPJ" 
              className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-bold uppercase text-slate-700 shadow-sm"
              value={companyLoginCnpj}
              onChange={e => setCompanyLoginCnpj(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Senha" 
              className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-bold text-slate-700 shadow-sm"
              value={companyLoginSenha}
              onChange={e => setCompanyLoginSenha(e.target.value)}
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
              <input placeholder="Nome da Empresa" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" value={companyData.nome} onChange={e => setCompanyData({...companyData, nome: e.target.value})} />
              <input placeholder="CNPJ" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" value={companyData.cnpj} onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} />
              <input placeholder="Responsável" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" value={companyData.responsavel} onChange={e => setCompanyData({...companyData, responsavel: e.target.value})} />
              <input placeholder="Telefone" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" value={companyData.telefone} onChange={e => setCompanyData({...companyData, telefone: e.target.value})} />
              <input type="password" placeholder="Senha de Acesso" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" value={companyData.senha} onChange={e => setCompanyData({...companyData, senha: e.target.value})} />
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
              onClick={() => handleSellerCodeSubmit()}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Validar Código
            </button>
            <button onClick={() => setView('role')} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}

        {view === 'customer-form' && (
          <div className="space-y-3 text-left">
            <p className="font-bold text-sm mb-6 text-center text-slate-700">Acesse ou crie sua conta</p>
            <div className="space-y-3">
              <input placeholder="CNPJ (Apenas números)" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, cnpj: e.target.value})} />
              <p className="text-xs text-slate-500 text-center my-2">Se for seu primeiro acesso, preencha os dados abaixo:</p>
              <input placeholder="Nome da Empresa" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, nome: e.target.value})} />
              <input placeholder="Telefone" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, telefone: e.target.value})} />
              <input placeholder="Seu Nome" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, responsavel: e.target.value})} />
            </div>
            <button 
              onClick={handleCustomerSubmit}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold mt-6 shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Entrar / Cadastrar
            </button>
            <button onClick={() => setView('seller-code')} className="w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function CatalogScreen({ products, categories, brands, activeBrandId, onBrandChange, onAddToCart, onEdit, role, onZoom }: { products: Product[], categories: Category[], brands: Brand[], activeBrandId: string | null, onBrandChange: (id: string) => void, onAddToCart: (p: Product, q: number) => void, onEdit: (p: Product) => void, role: UserRole, onZoom: (img: string) => void }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesBrand = activeBrandId ? p.brand_id === activeBrandId : true;
    return matchesSearch && matchesCategory && matchesBrand;
  }).sort((a, b) => {
    const catA = categories.find(c => c.id === a.category_id);
    const catB = categories.find(c => c.id === b.category_id);
    const orderA = catA?.ordem ?? 9999;
    const orderB = catB?.ordem ?? 9999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.nome.localeCompare(b.nome);
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
                onClick={() => onEdit({ id: 0, company_id: 0, sku: '', nome: '', preco_unitario: 0, preco_box: 0, qtd_box: 0, venda_somente_box: false, status_estoque: 'normal', categoria_pendente: false, imagem_pendente: false } as any)}
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
        {brands.length > 0 && (
          <div className="w-full md:w-auto">
            <select 
              value={activeBrandId || ''} 
              onChange={(e) => onBrandChange(e.target.value)}
              className="w-full md:w-auto bg-white border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 outline-none focus:border-primary shadow-sm"
            >
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="relative group w-full md:flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="O que você procura hoje?" 
            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 font-medium"
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
          Todas as Categorias
        </button>
        {categories.filter(c => !activeBrandId || c.brand_id === activeBrandId).map(cat => (
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
  const [qty, setQty] = useState(product.venda_somente_box ? (product.qtd_box || 1) : (product.multiplo_venda || 1));
  const isEsgotado = product.status_estoque === 'esgotado';

  const handleAddQty = () => {
    setQty(prev => prev + (product.venda_somente_box ? (product.qtd_box || 1) : (product.multiplo_venda || 1)));
  };

  const handleSubQty = () => {
    setQty(prev => {
      const step = product.venda_somente_box ? (product.qtd_box || 1) : (product.multiplo_venda || 1);
      return prev > step ? prev - step : step;
    });
  };

  return (
    <Card className={`p-4 flex flex-col group hover:border-primary/20 transition-all ${isEsgotado ? 'opacity-75 grayscale-[0.5]' : ''}`}>
      <div className="relative aspect-square mb-4 rounded-2xl overflow-hidden bg-slate-50 cursor-zoom-in" onClick={() => onZoom(product.imagem || '')}>
        <img src={product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`} className="w-full h-full object-contain p-2" alt={product.nome} referrerPolicy="no-referrer" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 items-center w-full px-2">
          {isEsgotado && <span className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider text-center">Esgotado</span>}
          {!isEsgotado && product.is_last_units && <span className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider text-center">Últimas Unidades</span>}
          {product.venda_somente_box && <span className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider text-center">Somente Box</span>}
        </div>
      </div>
      <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{product.nome}</h3>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">SKU: {product.sku}</p>

      {!isEsgotado && (product.has_box_discount || product.venda_somente_box) && (
        <div className="mb-3 pt-3 border-t border-slate-50 text-sm font-bold text-emerald-600">
          {!product.venda_somente_box ? (
            `A partir de ${product.qtd_box} un: R$ ${(product.qtd_box > 0 ? product.preco_box / product.qtd_box : 0).toFixed(2)} un`
          ) : (
            <div className="flex flex-col gap-0.5">
              <span>Box com {product.qtd_box} un: R$ {product.preco_box.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">R$ {(product.qtd_box > 0 ? product.preco_box / product.qtd_box : 0).toFixed(2)} por unidade</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-3">
        {!isEsgotado && (
          <p className="text-xl font-black text-primary w-full text-center">
            R$ {product.venda_somente_box ? product.preco_box.toFixed(2) : product.preco_unitario.toFixed(2)}
          </p>
        )}
        <div className="flex items-center gap-2 w-full justify-center">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={handleSubQty} disabled={isEsgotado} className="p-2 text-slate-600 hover:bg-white rounded-md disabled:opacity-50 transition-colors"><Minus size={16}/></button>
            <span className="text-sm font-bold w-8 text-center">{qty}</span>
            <button onClick={handleAddQty} disabled={isEsgotado} className="p-2 text-slate-600 hover:bg-white rounded-md disabled:opacity-50 transition-colors"><Plus size={16}/></button>
          </div>
          <button 
            onClick={() => onAdd(product, qty)} 
            disabled={isEsgotado}
            className="p-3 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex-1 flex justify-center items-center"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </Card>
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
          company_id: data.company_id || localStorage.getItem('vendpro_active_company_id')
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
                    <UploadIcon size={16} />
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
              <span className="text-sm font-bold text-slate-700">Esgotado</span>
              <input 
                type="checkbox" 
                checked={data.status_estoque === 'esgotado'} 
                onChange={e => setData({...data, status_estoque: e.target.checked ? 'esgotado' : 'normal'})}
                className="w-6 h-6 accent-rose-500 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-sm font-bold text-slate-700">Últimas Unidades</span>
              <input 
                type="checkbox" 
                checked={data.status_estoque === 'ultimas'} 
                onChange={e => setData({...data, status_estoque: e.target.checked ? 'ultimas' : 'normal'})}
                className="w-6 h-6 accent-amber-500 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Categoria</label>
              <select 
                value={data.category_id || ''} 
                onChange={e => setData({...data, category_id: e.target.value, categoria_pendente: false})}
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
