import { useState, useEffect } from 'react';
import { getProducts } from "./services/productService";
import { validateSellerCode } from './services/sellerService';
import { registerCompany, loginCompany, getCompanyById } from './services/companyService';
import { createOrder } from './services/orderService';
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
  Share2,
  Eye,
  EyeOff,
  Mail,
  Shield
} from 'lucide-react';
import { useCart } from './hooks/useCart';
import { Product, Category, Seller, Customer, UserRole, CartItem, Company, Brand } from './types';
import { mockProducts, mockCategories, mockCompany } from './lib/mockData';
import { Card } from './components/Card';
import { Badge } from './components/Badge';
import { Dashboard, Produtos, Clientes, Pedidos, Configuracoes, Marcas, Upload, Pendencias, Vendedores } from './pages';
import ProductFormModal from './components/ProductFormModal';
import CartScreen from './pages/CartScreen';
import { formatWhatsAppMessage } from './utils/whatsapp';

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

  const handleSendOrder = () => {
    let whatsappNumber = '';
    
    if (role === 'customer' && user && user.vendedor_whatsapp) {
      whatsappNumber = user.vendedor_whatsapp;
    } else if (role === 'seller' && company && company.telefone) {
      whatsappNumber = company.telefone;
    } else if (role === 'company' && company && company.telefone) {
      whatsappNumber = company.telefone;
    }

    if (whatsappNumber) {
      const message = formatWhatsAppMessage(cart);
      const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      clearCart();
      setActiveTab('catalog');
    } else {
      alert('Número de WhatsApp não encontrado para enviar o pedido.');
    }
  };

  const loadData = async () => {
    if (activeCompanyId) {
      setLoading(true);
      try {
        const [fetchedProducts, fetchedCompany] = await Promise.all([
          getProducts(activeCompanyId.toString()),
          getCompanyById(activeCompanyId)
        ]);
        setProducts(fetchedProducts);
        
        // Apply local logo if present
        if (fetchedCompany) {
          const savedLogo = localStorage.getItem(`vendpro_company_logo_${activeCompanyId}`);
          if (savedLogo && !fetchedCompany.logo_url) {
            fetchedCompany.logo_url = savedLogo;
          }
        }
        setCompany(fetchedCompany);
        
        // Apply primary color if present
        if (fetchedCompany?.primary_color) {
          document.documentElement.style.setProperty('--vendpro-primary', fetchedCompany.primary_color);
        } else {
          const savedColor = localStorage.getItem(`vendpro_company_color_${activeCompanyId}`);
          if (savedColor) {
            document.documentElement.style.setProperty('--vendpro-primary', savedColor);
          }
        }
        
        // Also fetch categories and brands for this company
        if (supabase) {
          const { data: catData } = await supabase.from('categories').select('*').eq('company_id', activeCompanyId).order('nome');
          setCategories((catData || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
          const { data: brandData } = await supabase.from('brands').select('*').eq('company_id', activeCompanyId).order('name');
          setBrands((brandData || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    console.log("Active Company ID:", activeCompanyId);
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
            onAddToCart={handleAddToCart} 
            onEdit={setEditingProduct} 
            role={effectiveRole} 
            onZoom={setZoomImage}
          />
        )}
        {activeTab === 'cart' && <CartScreen cart={cart} total={total} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onSendOrder={handleSendOrder} />}
        {activeTab === 'dashboard' && <Dashboard companyId={activeCompanyId} />}
        {activeTab === 'produtos' && <Produtos companyId={activeCompanyId} onRefresh={loadData} />}
        {activeTab === 'upload' && <Upload companyId={activeCompanyId} onRefresh={loadData} />}
        {activeTab === 'pendencias' && <Pendencias companyId={activeCompanyId} onRefresh={loadData} />}
        {activeTab === 'marcas' && <Marcas companyId={activeCompanyId} />}
        {activeTab === 'vendedores' && <Vendedores companyId={activeCompanyId} />}
        {activeTab === 'clientes' && <Clientes companyId={activeCompanyId} />}
        {activeTab === 'pedidos' && <Pedidos companyId={activeCompanyId} />}
        {activeTab === 'account' && <Configuracoes companyId={activeCompanyId} user={user} role={role} onLogout={handleLogout} />}
      </main>

      <AnimatePresence>
        {editingProduct && (
          <ProductFormModal 
            product={editingProduct.id === 'new' ? undefined : editingProduct} 
            companyId={activeCompanyId}
            onClose={() => setEditingProduct(null)} 
            onSave={() => { 
              setEditingProduct(null);
              loadData();
            }} 
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
  const [companyData, setCompanyData] = useState({ nome: '', cnpj: '', telefone: '', responsavel: '', email: '', senha: '' });
  const [companyLoginCnpj, setCompanyLoginCnpj] = useState('');
  const [companyLoginSenha, setCompanyLoginSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotCode, setShowForgotCode] = useState(false);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

  const handleSellerCodeSubmit = async () => {
    const code = sellerCode.trim().toUpperCase();
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
      if (loginType === 'seller') {
        onLogin('seller', result.seller, result.companies);
      } else {
        setView('customer-form');
      }
    } else {
      alert('Código inválido. Tente ADMIN ou um código de vendedor válido.');
    }
  };

  const handleCustomerSubmit = async () => {
    if (!customerData.nome || !customerData.telefone) {
      alert("Por favor, preencha o nome e o telefone.");
      return;
    }

    if (supabase && sellerInfo) {
      try {
        // Try to find existing customer by phone or name under this seller
        const { data: existingCustomers, error: searchError } = await supabase
          .from('customers')
          .select('*')
          .eq('seller_id', sellerInfo.id)
          .or(`telefone.eq.${customerData.telefone},nome.ilike.%${customerData.nome}%`);

        if (searchError) throw searchError;

        let finalCustomer;

        if (existingCustomers && existingCustomers.length > 0) {
          // Found existing customer
          finalCustomer = existingCustomers[0];
        } else {
          // Create new customer
          const { data: newCustomer, error: insertError } = await supabase
            .from('customers')
            .insert([{
              seller_id: sellerInfo.id,
              nome: customerData.nome,
              telefone: customerData.telefone,
              ativo: true
            }])
            .select()
            .single();

          if (insertError) throw insertError;
          finalCustomer = newCustomer;
        }

        onLogin('customer', { 
          ...finalCustomer, 
          sellerCode,
          vendedor_nome: sellerInfo.nome,
          vendedor_whatsapp: sellerInfo.whatsapp
        }, availableCompanies);

      } catch (error: any) {
        console.error("Erro ao processar cliente:", error);
        alert("Erro ao processar login do cliente: " + error.message);
      }
    } else {
      // Fallback if no supabase (shouldn't happen)
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
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Senha" 
                className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-bold text-slate-700 shadow-sm"
                value={companyLoginSenha}
                onChange={e => setCompanyLoginSenha(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button 
              onClick={handleCompanyLogin}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Entrar
            </button>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowForgotPassword(true)}
                className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
              >
                Esqueci minha senha
              </button>
              <button 
                onClick={() => setView('company-register')}
                className="w-full py-4 bg-white text-primary border border-primary/10 rounded-2xl font-semibold hover:bg-primary-light/20 transition-colors"
              >
                Cadastrar Nova Empresa
              </button>
            </div>
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
              <input placeholder="E-mail (Para recuperação de senha)" type="email" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} required />
              <input placeholder="Telefone" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" value={companyData.telefone} onChange={e => setCompanyData({...companyData, telefone: e.target.value})} />
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Senha de Acesso" 
                  className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" 
                  value={companyData.senha} 
                  onChange={e => setCompanyData({...companyData, senha: e.target.value})} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
            <button 
              onClick={() => setShowForgotCode(true)}
              className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
            >
              Esqueci meu código
            </button>
            <button onClick={() => setView('role')} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}

        {showForgotPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                  <Mail size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Recuperar Senha</h3>
                <p className="text-sm text-slate-500">Informe seu e-mail cadastrado para receber as instruções de recuperação.</p>
              </div>
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-medium text-slate-700"
                value={forgotPasswordEmail}
                onChange={e => setForgotPasswordEmail(e.target.value)}
              />
              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    if (!forgotPasswordEmail) return alert('Informe seu e-mail');
                    
                    if (supabase) {
                      const { data, error } = await supabase.from('companies').select('id').eq('email', forgotPasswordEmail).maybeSingle();
                      if (error && (error.message.includes('column') || error.message.includes('schema cache'))) {
                        alert('A recuperação de senha por e-mail ainda não está configurada no banco de dados. Por favor, entre em contato com o suporte.');
                        setShowForgotPassword(false);
                        return;
                      }
                    }
                    
                    alert('Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.');
                    setShowForgotPassword(false);
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
                >
                  Enviar Link
                </button>
                <button 
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showForgotCode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Código de Acesso</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {loginType === 'customer' 
                    ? 'Por favor, entre em contato com seu vendedor para que ele forneça seu código de acesso ao catálogo.' 
                    : loginType === 'seller'
                    ? 'Por favor, entre em contato com a empresa para que ela forneça seu código de acesso ao sistema.'
                    : 'Por favor, entre em contato com o suporte do sistema.'}
                </p>
              </div>
              <button 
                onClick={() => setShowForgotCode(false)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}

        {view === 'customer-form' && (
          <div className="space-y-3 text-left">
            <p className="font-bold text-sm mb-6 text-center text-slate-700">Identificação do Cliente</p>
            <div className="space-y-3">
              <input placeholder="Seu Nome ou Nome da Empresa" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, nome: e.target.value})} />
              <input placeholder="Telefone / WhatsApp" className="w-full p-4 bg-white rounded-xl border border-slate-100 font-medium focus:ring-2 focus:ring-primary outline-none shadow-sm" onChange={e => setCustomerData({...customerData, telefone: e.target.value})} />
            </div>
            <button 
              onClick={handleCustomerSubmit}
              className="w-full py-4 bg-primary text-white rounded-2xl font-semibold mt-6 shadow-md shadow-primary/10 hover:bg-primary-dark transition-colors"
            >
              Acessar Catálogo
            </button>
            <button onClick={() => setView('seller-code')} className="w-full text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function CatalogScreen({ products, categories, brands, onAddToCart, onEdit, role, onZoom }: { products: Product[], categories: Category[], brands: Brand[], onAddToCart: (p: Product, q: number) => void, onEdit: (p: Product) => void, role: UserRole, onZoom: (img: string) => void }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = products.filter(p => {
    const searchLower = search.trim().toLowerCase();
    const nome = p.nome || '';
    const sku = p.sku || '';
    const matchesSearch = nome.toLowerCase().includes(searchLower) || sku.toLowerCase().includes(searchLower);
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesBrand = selectedBrand ? p.brand_id === selectedBrand : true;
    return matchesSearch && matchesCategory && matchesBrand;
  }).sort((a, b) => {
    const brandA = brands.find(br => br.id === a.brand_id);
    const brandB = brands.find(br => br.id === b.brand_id);
    const brandOrderA = brandA?.order_index ?? 999999;
    const brandOrderB = brandB?.order_index ?? 999999;

    if (brandOrderA !== brandOrderB) {
      return brandOrderA - brandOrderB;
    }

    const catA = categories.find(c => c.id === a.category_id);
    const catB = categories.find(c => c.id === b.category_id);
    const orderA = catA?.order_index ?? 999999;
    const orderB = catB?.order_index ?? 999999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Sort out of stock items to the end of the category
    const isEsgotadoA = a.status_estoque === 'esgotado';
    const isEsgotadoB = b.status_estoque === 'esgotado';
    
    if (isEsgotadoA && !isEsgotadoB) return 1;
    if (!isEsgotadoA && isEsgotadoB) return -1;

    const nomeA = a.nome || '';
    const nomeB = b.nome || '';
    return nomeA.localeCompare(nomeB);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedBrand, itemsPerPage]);

  const visibleCategories = selectedBrand ? categories.filter(c => c.brand_id === selectedBrand) : categories;

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
                onClick={() => onEdit({ id: 'new', company_id: '', sku: '', nome: '', preco_unitario: 0, preco_box: 0, qtd_box: 0, venda_somente_box: false, status_estoque: 'normal', categoria_pendente: true, imagem_pendente: true, has_box_discount: false, is_last_units: false } as any)}
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

      <div className="space-y-4">
        {brands.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button 
              onClick={() => { setSelectedBrand(null); setSelectedCategory(null); }}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${!selectedBrand ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300'}`}
            >
              Todas as Marcas
            </button>
            {[...brands].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(brand => (
              <button 
                key={brand.id}
                onClick={() => { setSelectedBrand(brand.id); setSelectedCategory(null); }}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedBrand === brand.id ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300'}`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${!selectedCategory ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/30'}`}
          >
            Todas as Categorias
          </button>
          {[...visibleCategories].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/30'}`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
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
  const isEsgotado = product.status_estoque === 'esgotado';

  const handleAddQty = () => {
    setQty(prev => prev + (product.venda_somente_box ? 1 : (product.multiplo_venda || 1)));
  };

  const handleSubQty = () => {
    setQty(prev => {
      const step = product.venda_somente_box ? 1 : (product.multiplo_venda || 1);
      return prev > step ? prev - step : step;
    });
  };

  return (
    <Card className={`p-4 flex flex-col group hover:border-primary/20 transition-all ${isEsgotado ? 'opacity-75 grayscale-[0.5]' : ''}`}>
      <div className="relative aspect-square mb-4 rounded-2xl overflow-hidden bg-slate-50 cursor-zoom-in" onClick={() => onZoom(product.imagem || '')}>
        <img src={product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`} className="w-full h-full object-contain p-2" alt={product.nome} referrerPolicy="no-referrer" />
        <div className="absolute top-2 w-full flex flex-col gap-1.5 items-center">
          {isEsgotado && <span className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow-lg uppercase tracking-wider">Esgotado</span>}
          {!isEsgotado && product.is_last_units && <span className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow-lg uppercase tracking-wider">Últimas Unidades</span>}
          {product.venda_somente_box && <span className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow-lg uppercase tracking-wider">Somente Box</span>}
        </div>
      </div>
      
      <div className="text-center mb-4">
        <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{product.nome}</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">SKU: {product.sku}</p>
        
        {!isEsgotado && (
          <p className="text-xl font-black text-primary">R$ {(product.preco_unitario || 0).toFixed(2)}</p>
        )}
      </div>

      {(product.has_box_discount || product.venda_somente_box) && !isEsgotado && (
        <div className="mb-4 pt-3 border-t border-slate-50 text-sm font-bold text-emerald-600 text-center">
          {!product.venda_somente_box ? (
            `A partir de ${product.qtd_box} un: R$ ${(product.preco_box || 0).toFixed(2)}`
          ) : (
            `Box com ${product.qtd_box} un: R$ ${(product.preco_box || 0).toFixed(2)}`
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="flex items-center bg-slate-100 rounded-xl p-1.5">
          <button onClick={handleSubQty} disabled={isEsgotado} className="p-1.5 text-slate-600 hover:bg-white rounded-lg disabled:opacity-50 transition-colors"><Minus size={18}/></button>
          <span className="text-sm font-bold w-10 text-center">{qty}</span>
          <button onClick={handleAddQty} disabled={isEsgotado} className="p-1.5 text-slate-600 hover:bg-white rounded-lg disabled:opacity-50 transition-colors"><Plus size={18}/></button>
        </div>
        <button 
          onClick={() => onAdd(product, qty)} 
          disabled={isEsgotado}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          <ShoppingCart size={18} />
          Adicionar
        </button>
      </div>
    </Card>
  );
}
