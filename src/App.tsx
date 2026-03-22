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
  Shield,
  Layout,
  Home
} from 'lucide-react';
import { useCart } from './hooks/useCart';
import { Product, Category, Seller, Customer, UserRole, CartItem, Company, Brand, BannerData } from './types';
import { mockProducts, mockCategories, mockCompany } from './lib/mockData';
import { Card } from './components/Card';
import { Badge } from './components/Badge';
import { Dashboard, Produtos, Clientes, Pedidos, Configuracoes, Marcas, Upload, Pendencias, Vendedores, BannerManager } from './pages';
import Privacidade from './pages/privacidade';
import Lgpd from './pages/lgpd';
import ProductFormModal from './components/ProductFormModal';
import CartScreen from './pages/CartScreen';
import Banner from './components/Banner';
import { formatWhatsAppMessage } from './utils/whatsapp';
import { getBanners, getTopBarMessages } from './services/bannerService';

// --- Helper Components ---

function TopBar({ messages }: { messages?: string[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!messages || messages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [messages?.length]);

  if (!messages || messages.length === 0) return null;

  return (
    <div className="purple-gradient text-white/90 text-[11px] md:text-xs text-center py-2 px-4 letter-spacing-[0.4px] relative z-[110]">
      <AnimatePresence mode="wait">
        <motion.span
          key={current}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="inline-block"
        >
          {messages[current]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-full font-black text-sm transition-all ${active ? 'bg-primary text-white neumorphic-shadow' : 'text-slate-600 hover:bg-white/50'}`}
    >
      {icon}
      <span className="uppercase tracking-[0.1em]">{label}</span>
    </button>
  );
}

function Footer() {
  return (
    <footer className="w-full py-12 px-6 bg-white border-t border-slate-100 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 pink-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">VendPro</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs">
            A plataforma definitiva para orçamentos e catálogos digitais premium. Transforme sua forma de vender.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Legal</h3>
          <nav className="flex flex-col gap-3">
            <a href="/privacidade" className="text-xs font-black text-slate-600 uppercase tracking-widest hover:text-primary transition-colors">Política de Privacidade</a>
            <a href="/lgpd" className="text-xs font-black text-slate-600 uppercase tracking-widest hover:text-primary transition-colors">LGPD</a>
          </nav>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Suporte</h3>
          <p className="text-xs font-black text-slate-600 uppercase tracking-widest">contato@vendpro.com.br</p>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer">
              <Share2 size={16} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2026 VendPro. Todos os direitos reservados.</p>
        <div className="flex items-center gap-2">
          <Shield size={12} className="text-slate-300" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Ambiente Seguro</span>
        </div>
      </div>
    </footer>
  );
}

function TabItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 relative transition-all ${active ? 'text-primary scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-sm border-2 border-white">
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

const safeLocalStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
};

export default function App() {
  const path = window.location.pathname;
  if (path === '/lgpd') {
    return <Lgpd />;
  }
  if (path === '/privacidade') {
    return <Privacidade />;
  }

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
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('vincular');
      if (code) {
        console.log("Detectado código de vínculo na URL:", code);
        safeLocalStorage.setItem('vendpro_seller_code', code);
        // Limpa o parâmetro da URL sem recarregar a página
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (err) {
      console.error("Erro ao processar parâmetro de vínculo:", err);
    }
  }, []);
  const [activeTab, setActiveTab] = useState('catalog');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>(() => JSON.parse(localStorage.getItem('vendpro_available_companies') || '[]'));
  const [availableSellers, setAvailableSellers] = useState<any[]>(() => JSON.parse(localStorage.getItem('vendpro_sellers') || '[]'));
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
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [topBarMessages, setTopBarMessages] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { cart, carts, addToCart, removeFromCart, updateQuantity, clearCart, total } = useCart(selectedBrand);

  const effectiveRole = viewMode === 'customer' ? 'customer' : role;

  const handleAddToCart = (product: Product, quantity: number) => {
    if (cart.length === 0) {
      setShowCartDisclaimer(true);
    }
    addToCart(product, quantity);
  };

  const handleSendOrder = async (manualClientName?: string) => {
    let whatsappNumber = '';
    
    if (role === 'customer' && user) {
      whatsappNumber = user.vendedor_whatsapp || user.vendedor_telefone || company?.telefone || '';
    } else if (role === 'seller' && company && company.telefone) {
      whatsappNumber = company.telefone;
    } else if (role === 'company' && company && company.telefone) {
      whatsappNumber = company.telefone;
    }

    if (whatsappNumber) {
      if (cart.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
      }

      const clientName = manualClientName || (role === 'customer' ? user?.nome : (role === 'seller' ? `Vendedor: ${user?.nome}` : ''));
      
      // Save order to database if supabase is available
      if (supabase && activeCompanyId && selectedBrand) {
        try {
          const orderData = {
            company_id: activeCompanyId,
            customer_id: role === 'customer' ? user.id : null,
            seller_id: role === 'customer' ? user.seller_id : (role === 'seller' ? user.id : null),
            brand_id: selectedBrand,
            total: total,
            status: 'pending',
            whatsapp_sent: true,
            client_name: clientName
          };

          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

          if (orderError) throw orderError;

          const orderItems = cart.map(item => {
            const marginMultiplier = 1 + (item.margin_percentage || 0) / 100;
            const isBoxDiscount = item.has_box_discount && !item.venda_somente_box && item.quantity >= (item.qtd_box || 0);
            const unitPrice = item.venda_somente_box 
              ? item.preco_box * marginMultiplier
              : (isBoxDiscount ? item.preco_box * marginMultiplier : item.preco_unitario * marginMultiplier);
            
            return {
              order_id: order.id,
              product_id: item.id,
              sku: item.sku,
              nome: item.nome,
              quantidade: item.quantity,
              preco_unitario: unitPrice,
              subtotal: item.quantity * unitPrice
            };
          });

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (itemsError) throw itemsError;
          
          console.log("Pedido salvo com sucesso no banco de dados.");
        } catch (err: any) {
          console.error("Erro ao salvar pedido no banco de dados:", err);
          alert(`O pedido foi enviado via WhatsApp, mas houve um erro ao salvar no histórico: ${err.message || 'Erro desconhecido'}`);
        }
      }

      const message = formatWhatsAppMessage(cart, clientName);
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
        
        let finalProducts = fetchedProducts;
        
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
          document.documentElement.style.setProperty('--vendpro-primary-dark', fetchedCompany.primary_color);
          document.documentElement.style.setProperty('--vendpro-primary-light', fetchedCompany.primary_color);
        } else {
          const savedColor = localStorage.getItem(`vendpro_company_color_${activeCompanyId}`);
          if (savedColor) {
            document.documentElement.style.setProperty('--vendpro-primary', savedColor);
            document.documentElement.style.setProperty('--vendpro-primary-dark', savedColor);
            document.documentElement.style.setProperty('--vendpro-primary-light', savedColor);
          }
        }
        
        // Fetch banners and top bar messages (handles localStorage fallback)
        const [bannerData, topBarData] = await Promise.all([
          getBanners(activeCompanyId),
          getTopBarMessages(activeCompanyId)
        ]);
        setBanners(bannerData);
        setTopBarMessages(topBarData.map(m => m.text));

        // Also fetch categories and brands for this company
        if (supabase) {
          const { data: catData } = await supabase.from('categories').select('*').eq('company_id', activeCompanyId).order('nome');

          let releasedBrandIds: string[] = [];
          
          if (role === 'seller' && user?.id) {
            releasedBrandIds = user.marcas_liberadas || [];
            
            // Filter products
            finalProducts = fetchedProducts.filter(p => p.brand_id && releasedBrandIds.includes(p.brand_id));
          }

          let filteredCats = catData || [];
          
          let brandQuery = supabase.from('brands').select('*').eq('company_id', activeCompanyId).order('name');
          
          if (role === 'seller' && releasedBrandIds.length > 0) {
            brandQuery = brandQuery.in('id', releasedBrandIds);
            filteredCats = filteredCats.filter(c => c.brand_id && releasedBrandIds.includes(c.brand_id));
          }

          const { data: brandData } = await brandQuery;
          
          const sortedBrands = (brandData || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
          setCategories(filteredCats.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)));
          setBrands(sortedBrands);
          
          if (sortedBrands.length > 0 && !selectedBrand) {
            setSelectedBrand(sortedBrands[0].id);
          }
        }
        
        setProducts(finalProducts);
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

  const handleLogin = (selectedRole: UserRole, userData: any, companies: any[] = [], sellers: any[] = []) => {
    setRole(selectedRole);
    setUser(userData);
    setAvailableCompanies(companies);
    setAvailableSellers(sellers);
    
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
    localStorage.setItem('vendpro_sellers', JSON.stringify(sellers));
    setActiveTab('catalog');
  };

  const handleLogout = async () => {
    setRole(null);
    setUser(null);
    setAvailableCompanies([]);
    setAvailableSellers([]);
    setActiveCompanyId(null);
    localStorage.removeItem('vendpro_role');
    localStorage.removeItem('vendpro_user');
    localStorage.removeItem('vendpro_seller_code');
    localStorage.removeItem('vendpro_available_companies');
    localStorage.removeItem('vendpro_active_company_id');
    localStorage.removeItem('vendpro_sellers');
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
          
          // If seller, find the corresponding seller record for this company
          if (role === 'seller' && availableSellers.length > 0) {
            const sellerForCompany = availableSellers.find(s => s.company_id === c.id);
            if (sellerForCompany) {
              setUser(sellerForCompany);
              localStorage.setItem('vendpro_user', JSON.stringify(sellerForCompany));
            }
          }
          
          setShowCompanyInfo(true);
          // fetchData(); // Assuming fetchData is defined elsewhere or not needed
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-nude font-sans text-slate-800">
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

      <TopBar messages={topBarMessages} />

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:text-primary transition-colors">
          <Menu size={24} />
        </button>
        
        <div className="flex-1 flex justify-center">
          <h1 className="text-sm font-black uppercase tracking-[2px] text-slate-900 truncate max-w-[150px]">
            {company?.nome || 'VendPro'}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setActiveTab('catalog')} className="p-2 text-slate-600 hover:text-primary transition-colors">
            <Search size={20} />
          </button>
          <button onClick={() => setActiveTab('cart')} className="relative p-2 text-slate-600 hover:text-primary transition-colors">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 pink-gradient text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-lg border border-white">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 md:px-12 py-4 md:py-6 items-center justify-between">
        <div className="flex items-center gap-4 md:gap-12">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white text-slate-600 hover:text-primary hover:bg-primary/5 rounded-full transition-all shadow-sm border border-slate-100">
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 pink-gradient rounded-[14px] flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <CheckCircle2 size={24} className="md:w-8 md:h-8" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[2px] mb-0.5">Distribuidor Oficial</span>
              {availableCompanies.length > 1 && role !== 'customer' ? (
                <select 
                  value={activeCompanyId || ''} 
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="bg-transparent text-xl font-bold tracking-tight text-slate-900 outline-none cursor-pointer appearance-none"
                >
                  {availableCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              ) : (
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{company?.nome || 'VendPro'}</h1>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden lg:flex items-center bg-slate-100 rounded-full px-6 py-2.5 w-80 shadow-inner border border-slate-200/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
            <Search size={18} className="text-slate-400 mr-3" />
            <input 
              type="text" 
              placeholder="Buscar produtos..." 
              className="bg-transparent border-none outline-none text-sm w-full font-black uppercase tracking-widest placeholder:text-slate-400"
              onFocus={() => setActiveTab('catalog')}
            />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setActiveTab('cart')} className="relative p-3 bg-white text-slate-600 hover:text-primary hover:bg-primary/5 rounded-full transition-all shadow-sm border border-slate-100">
              <ShoppingCart size={22} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 pink-gradient text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                  {cart.length}
                </span>
              )}
            </button>
            
            {effectiveRole !== 'customer' && (
              <button onClick={() => setActiveTab('account')} className="p-3 bg-white text-slate-600 hover:text-primary hover:bg-primary/5 rounded-full transition-all shadow-sm border border-slate-100">
                <User size={22} />
              </button>
            )}
          </div>
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
              className="fixed inset-0 bg-slate-900/40 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-80 bg-white z-50 shadow-2xl p-8 flex flex-col rounded-r-[14px]"
            >
              <div className="flex items-center justify-between mb-12 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 pink-gradient rounded-[10px] flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">VendPro</h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-full"><X size={24} /></button>
              </div>

              <nav className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <SidebarItem icon={<LayoutGrid size={20}/>} label="Catálogo" active={activeTab === 'catalog'} onClick={() => { setActiveTab('catalog'); setIsSidebarOpen(false); }} />
                
                {effectiveRole !== 'customer' && (
                  <>
                    <SidebarItem icon={<LayoutGrid size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
                    
                    {role !== 'seller' && (
                      <>
                        <SidebarItem icon={<Layout size={20}/>} label="Banners" active={activeTab === 'banners'} onClick={() => { setActiveTab('banners'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Package size={20}/>} label="Produtos" active={activeTab === 'produtos'} onClick={() => { setActiveTab('produtos'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<UploadIcon size={20}/>} label="Upload" active={activeTab === 'upload'} onClick={() => { setActiveTab('upload'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<AlertTriangle size={20}/>} label="Pendências" active={activeTab === 'pendencias'} onClick={() => { setActiveTab('pendencias'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Tag size={20}/>} label="Marcas" active={activeTab === 'marcas'} onClick={() => { setActiveTab('marcas'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Users size={20}/>} label="Vendedores" active={activeTab === 'vendedores'} onClick={() => { setActiveTab('vendedores'); setIsSidebarOpen(false); }} />
                      </>
                    )}
                    
                    <SidebarItem icon={<Users size={20}/>} label="Clientes" active={activeTab === 'clientes'} onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<FileText size={20}/>} label="Pedidos" active={activeTab === 'pedidos'} onClick={() => { setActiveTab('pedidos'); setIsSidebarOpen(false); }} />
                  </>
                )}

                {effectiveRole === 'customer' && (
                  <SidebarItem icon={<FileText size={20}/>} label="Meus Pedidos" active={activeTab === 'pedidos'} onClick={() => { setActiveTab('pedidos'); setIsSidebarOpen(false); }} />
                )}
                    
                {role !== 'seller' && role !== 'customer' && (
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

              <div className="mt-auto pt-8 border-t border-slate-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-rose-500 transition-colors"
                >
                  <LogOut size={18} />
                  Sair do Sistema
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('catalog')} className={`flex flex-col items-center gap-1 ${activeTab === 'catalog' ? 'text-primary' : 'text-slate-400'}`}>
          <Home size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Início</span>
        </button>
        <button onClick={() => setActiveTab('catalog')} className={`flex flex-col items-center gap-1 ${activeTab === 'catalog' ? 'text-primary' : 'text-slate-400'}`}>
          <LayoutGrid size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Catálogo</span>
        </button>
        <button onClick={() => setActiveTab('cart')} className={`relative flex flex-col items-center gap-1 ${activeTab === 'cart' ? 'text-primary' : 'text-slate-400'}`}>
          <ShoppingCart size={20} />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 pink-gradient text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-lg border border-white">
              {cart.length}
            </span>
          )}
          <span className="text-[8px] font-black uppercase tracking-widest">Carrinho</span>
        </button>
        <button onClick={() => setActiveTab('pedidos')} className={`flex flex-col items-center gap-1 ${activeTab === 'pedidos' ? 'text-primary' : 'text-slate-400'}`}>
          <FileText size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">Pedidos</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full relative min-w-0 overflow-x-hidden pb-20 md:pb-0">
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
              banners={banners}
              user={user}
              company={company}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              carts={carts}
              onGoToCart={() => setActiveTab('cart')}
            />
          )}
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {activeTab === 'cart' && (
            <CartScreen 
              cart={cart} 
              total={total} 
              onUpdateQuantity={updateQuantity} 
              onRemove={removeFromCart} 
              onSendOrder={handleSendOrder} 
              selectedBrand={selectedBrand}
              brands={brands}
              role={role}
            />
          )}
          {activeTab === 'dashboard' && <Dashboard companyId={activeCompanyId} role={role} user={user} banners={banners} />}
          {activeTab === 'banners' && role === 'company' && <BannerManager companyId={activeCompanyId!} />}
          {activeTab === 'produtos' && <Produtos companyId={activeCompanyId} onRefresh={loadData} />}
          {activeTab === 'upload' && <Upload companyId={activeCompanyId} onRefresh={loadData} />}
          {activeTab === 'pendencias' && <Pendencias companyId={activeCompanyId} onRefresh={loadData} />}
          {activeTab === 'marcas' && <Marcas companyId={activeCompanyId} />}
          {activeTab === 'vendedores' && <Vendedores companyId={activeCompanyId} />}
          {activeTab === 'clientes' && <Clientes companyId={activeCompanyId} role={role} user={user} />}
          {activeTab === 'pedidos' && <Pedidos companyId={activeCompanyId} role={role} user={user} />}
          {activeTab === 'account' && <Configuracoes companyId={activeCompanyId} user={user} role={role} onLogout={handleLogout} />}
        </div>
        <Footer />
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
    <div className="min-h-screen bg-fixed bg-gradient-to-br from-white via-soft-pink to-white flex flex-col items-center justify-center p-8">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md text-center">
        <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Selecione a Marca</h2>
        <p className="text-slate-500 mb-10 font-medium">Com qual catálogo deseja trabalhar agora?</p>
        
        <div className="grid grid-cols-1 gap-6">
          {companies.map(c => (
            <button 
              key={c.id} 
              onClick={() => onSelect(c)}
              className="p-6 bg-white rounded-[40px] border border-slate-100 shadow-sm hover:neumorphic-shadow transition-all flex items-center gap-6 text-left group"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center overflow-hidden shadow-inner">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.nome} className="w-full h-full object-cover" />
                ) : (
                  <Package size={32} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-black text-xl text-slate-800 group-hover:text-primary transition-colors uppercase tracking-tight">{c.nome}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mínimo: R$ {c.minimum_order_value?.toFixed(2)}</p>
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
        <div className="w-24 h-24 bg-slate-50 rounded-[28px] mx-auto flex items-center justify-center overflow-hidden shadow-inner">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.nome} className="w-full h-full object-cover" />
          ) : (
            <Package size={48} className="text-slate-200" />
          )}
        </div>
        
        <div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">{company.nome}</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Políticas da Empresa</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pedido Mínimo</p>
            <p className="font-black text-slate-700">R$ {company.minimum_order_value?.toFixed(2)}</p>
          </div>
          
          {company.payment_policy && (
            <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pagamento</p>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{company.payment_policy}</p>
            </div>
          )}

          {company.shipping_policy && (
            <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Envio / Frete</p>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{company.shipping_policy}</p>
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          Entendi, vamos lá!
        </button>
      </motion.div>
    </div>
  );
}
function LoginScreen({ onLogin }: { onLogin: (role: UserRole, user: any, companies?: any[], sellers?: any[]) => void }) {
  const [view, setView] = useState<'role' | 'seller-code' | 'customer-form' | 'company-login' | 'company-register'>('role');
  const [loginType, setLoginType] = useState<'seller' | 'customer' | 'company' | null>(null);
  const [sellerCode, setSellerCode] = useState('');
  const [customerData, setCustomerData] = useState({ nome: '', cnpj: '', telefone: '', responsavel: '' });
  const [companyData, setCompanyData] = useState({ nome: '', cnpj: '', telefone: '', responsavel: '', email: '', senha: '' });
  const [companyLoginCnpj, setCompanyLoginCnpj] = useState('');
  const [companyLoginSenha, setCompanyLoginSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotCode, setShowForgotCode] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

  useEffect(() => {
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setShowResetPassword(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSellerCodeSubmit = async () => {
    const code = sellerCode.trim().toUpperCase();
    const validationType = loginType === 'seller' ? 'seller' : 'customer';
    const result = await validateSellerCode(code, validationType);
    
    if (result.success && result.sellers && result.sellers.length > 0) {
      const mainSeller = result.sellers[0];
      setSellerInfo(mainSeller);
      setAvailableCompanies(result.companies || []);
      if (loginType === 'seller') {
        onLogin('seller', mainSeller, result.companies, result.sellers);
      } else {
        setView('customer-form');
      }
    } else {
      alert(loginType === 'seller' ? 'Código de vendedor inválido.' : 'Código de vínculo inválido.');
    }
  };

  const handleCustomerSubmit = async () => {
    if (!customerData.nome || !customerData.telefone || !customerData.cnpj) {
      alert("Por favor, preencha o nome, o CNPJ e o telefone.");
      return;
    }

    if (supabase && sellerInfo) {
      try {
        const { data: existingCustomers } = await supabase
          .from('customers')
          .select('*')
          .eq('seller_id', sellerInfo.id)
          .or(`telefone.eq.${customerData.telefone},nome.ilike.%${customerData.nome}%,cnpj.eq.${customerData.cnpj}`);

        let finalCustomer;
        if (existingCustomers && existingCustomers.length > 0) {
          finalCustomer = existingCustomers[0];
        } else {
          const { data: newCustomer, error: insertError } = await supabase
            .from('customers')
            .insert([{
              company_id: sellerInfo.company_id,
              seller_id: sellerInfo.id,
              nome: customerData.nome,
              telefone: customerData.telefone,
              cnpj: customerData.cnpj,
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
          vendedor_whatsapp: sellerInfo.whatsapp,
          vendedor_telefone: sellerInfo.telefone
        }, availableCompanies);

      } catch (error: any) {
        alert("Erro ao processar login do cliente: " + error.message);
      }
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header com degradê roxo escuro */}
      <div className="w-full bg-gradient-to-br from-[#2D1B69] to-[#7C3AED] pt-16 pb-12 px-8 text-center flex flex-col items-center">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-4 border border-white/30"
        >
          <span className="text-3xl font-black">V</span>
        </motion.div>
        <h1 className="text-3xl font-black text-white tracking-tight uppercase">VendPro</h1>
        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Catálogo Premium de Beleza</p>
      </div>

      <div className="flex-1 -mt-6 bg-white rounded-t-[32px] px-8 pt-8 pb-12 shadow-2xl">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-sm mx-auto"
        >
          {/* Seletor de Perfil */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { id: 'company', label: 'Empresa', icon: <Package size={20} /> },
              { id: 'seller', label: 'Vendedor', icon: <Users size={20} /> },
              { id: 'customer', label: 'Cliente', icon: <User size={20} /> }
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => {
                  setLoginType(role.id as any);
                  if (role.id === 'company') setView('company-login');
                  else setView('seller-code');
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  loginType === role.id 
                    ? 'border-[#7C3AED] bg-[#7C3AED]/5 text-[#7C3AED]' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                {role.icon}
                <span className="text-[9px] font-black uppercase tracking-tight">{role.label}</span>
              </button>
            ))}
          </div>

          {/* Formulário */}
          <div className="bg-[#FAFAFA] border-[0.5px] border-slate-200 rounded-[32px] p-[24px_28px] space-y-4">
            {view === 'company-login' && (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">E-mail ou CNPJ</label>
                  <input 
                    type="text" 
                    placeholder="empresa@email.com ou 00.000.000/0000-00" 
                    className="w-full p-4 bg-white rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-[#7C3AED]/20 font-bold text-slate-700"
                    value={companyLoginCnpj}
                    onChange={e => setCompanyLoginCnpj(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="w-full p-4 bg-white rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-[#7C3AED]/20 font-bold text-slate-700"
                      value={companyLoginSenha}
                      onChange={e => setCompanyLoginSenha(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleCompanyLogin}
                  className="w-full py-4 bg-gradient-to-r from-[#E91E8C] to-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#7C3AED]/20 mt-4"
                >
                  Entrar
                </button>
                <div className="flex flex-col gap-3 pt-2">
                  <button onClick={() => setShowForgotPassword(true)} className="text-[9px] font-black text-[#7C3AED] uppercase tracking-widest text-center">Esqueci minha senha</button>
                  <button onClick={() => setView('company-register')} className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Criar nova conta empresa</button>
                </div>
              </>
            )}

            {view === 'seller-code' && (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Código de Acesso</label>
                  <input 
                    type="text" 
                    placeholder="EX: VEND-001" 
                    className="w-full p-4 bg-white rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-[#7C3AED]/20 font-black uppercase text-center text-slate-700"
                    value={sellerCode}
                    onChange={e => setSellerCode(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleSellerCodeSubmit}
                  className="w-full py-4 bg-gradient-to-r from-[#E91E8C] to-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#7C3AED]/20 mt-4"
                >
                  Validar Código
                </button>
                <button onClick={() => setShowForgotCode(true)} className="w-full text-[9px] font-black text-[#7C3AED] uppercase tracking-widest text-center pt-2">Esqueci meu código</button>
              </>
            )}

            {view === 'customer-form' && (
              <>
                <div className="space-y-3">
                  <input placeholder="Nome Completo" className="w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold outline-none" onChange={e => setCustomerData({...customerData, nome: e.target.value})} />
                  <input placeholder="CNPJ / CPF" className="w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold outline-none" onChange={e => setCustomerData({...customerData, cnpj: e.target.value})} />
                  <input placeholder="WhatsApp" className="w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold outline-none" onChange={e => setCustomerData({...customerData, telefone: e.target.value})} />
                </div>
                <button 
                  onClick={handleCustomerSubmit}
                  className="w-full py-4 bg-gradient-to-r from-[#E91E8C] to-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#7C3AED]/20 mt-4"
                >
                  Acessar Catálogo
                </button>
                <div className="mt-4 text-center">
                  <p className="text-[8px] text-slate-400 font-medium leading-relaxed">
                    Ao acessar, você concorda com nossa <br/>
                    <a href="/privacidade" className="text-[#7C3AED] font-black uppercase hover:underline">Política de Privacidade</a> e <a href="/lgpd" className="text-[#7C3AED] font-black uppercase hover:underline">LGPD</a>.
                  </p>
                </div>
              </>
            )}

            {view === 'company-register' && (
              <>
                <div className="space-y-3">
                  <input placeholder="Nome da Empresa" className="w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold outline-none" value={companyData.nome} onChange={e => setCompanyData({...companyData, nome: e.target.value})} />
                  <input placeholder="CNPJ" className="w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold outline-none" value={companyData.cnpj} onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} />
                  <input placeholder="E-mail" type="email" className="w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold outline-none" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} />
                  <input placeholder="Senha" type="password" className="w-full p-4 bg-white rounded-2xl border border-slate-100 font-bold outline-none" value={companyData.senha} onChange={e => setCompanyData({...companyData, senha: e.target.value})} />
                </div>
                <button 
                  onClick={handleCompanyRegister}
                  className="w-full py-4 bg-gradient-to-r from-[#E91E8C] to-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#7C3AED]/20 mt-4"
                >
                  Finalizar Cadastro
                </button>
                <div className="mt-4 text-center">
                  <p className="text-[8px] text-slate-400 font-medium leading-relaxed">
                    Ao cadastrar, você concorda com nossa <br/>
                    <a href="/privacidade" className="text-[#7C3AED] font-black uppercase hover:underline">Política de Privacidade</a> e <a href="/lgpd" className="text-[#7C3AED] font-black uppercase hover:underline">LGPD</a>.
                  </p>
                </div>
                <button onClick={() => setView('company-login')} className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest text-center pt-2">Já tenho conta</button>
              </>
            )}
          </div>

          {view === 'role' && (
            <div className="text-center mt-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Selecione seu perfil acima para entrar</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modais de Recuperação (Mantidos os originais simplificados) */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight text-center">Recuperar Senha</h3>
            <input 
              type="email" 
              placeholder="Seu e-mail" 
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-center"
              value={forgotPasswordEmail}
              onChange={e => setForgotPasswordEmail(e.target.value)}
            />
            <div className="space-y-2">
              <button onClick={() => setShowForgotPassword(false)} className="w-full py-4 bg-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-xs">Enviar Link</button>
              <button onClick={() => setShowForgotPassword(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[9px] tracking-widest">Cancelar</button>
            </div>
          </motion.div>
        </div>
      )}

      {showForgotCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6 text-center">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Código de Acesso</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Entre em contato com seu vendedor ou empresa para obter seu código de acesso.
            </p>
            <button onClick={() => setShowForgotCode(false)} className="w-full py-4 bg-[#7C3AED] text-white rounded-2xl font-black uppercase tracking-widest text-xs">Entendi</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function CatalogScreen({ 
  products, 
  categories, 
  brands, 
  onAddToCart, 
  onEdit, 
  role, 
  onZoom,
  banners,
  user,
  company,
  selectedBrand,
  setSelectedBrand,
  selectedCategory,
  setSelectedCategory,
  carts,
  onGoToCart
}: { 
  products: Product[], 
  categories: Category[], 
  brands: Brand[], 
  onAddToCart: (p: Product, q: number) => void, 
  onEdit: (p: Product) => void, 
  role: UserRole, 
  onZoom: (img: string) => void,
  banners?: BannerData[],
  user: any,
  company: any,
  selectedBrand: string | null,
  setSelectedBrand: (id: string | null) => void,
  selectedCategory: string | null,
  setSelectedCategory: (id: string | null) => void,
  carts: { [brandId: string]: CartItem[] },
  onGoToCart: () => void
}) {
  const [search, setSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConditions, setShowConditions] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [showLogisticsWarning, setShowLogisticsWarning] = useState(false);
  const [pendingBrandId, setPendingBrandId] = useState<string | null>(null);
  const [acknowledgedBrands, setAcknowledgedBrands] = useState<Set<string>>(new Set());

  const currentBrand = brands.find(b => b.id === selectedBrand);

  useEffect(() => {
    if (selectedBrand && !acknowledgedBrands.has(selectedBrand) && role === 'customer') {
      setShowConditions(true);
    }
  }, [selectedBrand, role]);

  const handleBrandChange = (brandId: string) => {
    if (brandId === selectedBrand) return;

    const currentCart = carts[selectedBrand || ''] || [];
    if (currentCart.length > 0) {
      setPendingBrandId(brandId);
      setShowSwitchWarning(true);
    } else {
      setPendingBrandId(brandId);
      setShowLogisticsWarning(true);
    }
  };

  const confirmBrandSwitch = (save: boolean) => {
    setShowSwitchWarning(false);
    setShowLogisticsWarning(true);
  };

  const handleAcknowledgeLogistics = () => {
    if (pendingBrandId) {
      setSelectedBrand(pendingBrandId);
      setSelectedCategory(null);
      setPendingBrandId(null);
    }
    setShowLogisticsWarning(false);
  };

  const handleAcknowledgeConditions = () => {
    if (selectedBrand) {
      setAcknowledgedBrands(prev => new Set([...prev, selectedBrand]));
    }
    setShowConditions(false);
  };

  const handleWhatsAppSupport = () => {
    let whatsappNumber = '';
    
    if (role === 'customer') {
      whatsappNumber = user?.vendedor_whatsapp || user?.vendedor_telefone || company?.telefone || '';
    } else if (role === 'seller') {
      whatsappNumber = company?.telefone || '';
    } else {
      whatsappNumber = company?.telefone || '';
    }

    if (!whatsappNumber) {
      alert('Número de suporte não encontrado.');
      return;
    }
    let cleanPhone = whatsappNumber.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
      cleanPhone = `55${cleanPhone}`;
    }
    const message = `Olá! Estou no catálogo da ${company?.nome} e gostaria de tirar uma dúvida.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

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
    <div className="space-y-0">
      <AnimatePresence>
        {showConditions && currentBrand && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 p-10 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex items-center justify-center mx-auto text-primary shadow-inner">
                  <FileText size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Condições Comerciais</h3>
                <p className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">{currentBrand.name}</p>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Pedido Mínimo</p>
                  <p className="font-black text-slate-700 text-lg">R$ {currentBrand.minimum_order_value?.toFixed(2)}</p>
                </div>
                {currentBrand.payment_policy && (
                  <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Pagamento</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{currentBrand.payment_policy}</p>
                  </div>
                )}
                {currentBrand.shipping_policy && (
                  <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Envio / Frete</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{currentBrand.shipping_policy}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleAcknowledgeConditions}
                className="w-full py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Ciente, continuar
              </button>
            </motion.div>
          </div>
        )}

        {showSwitchWarning && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative z-10 p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-amber-50 rounded-[28px] flex items-center justify-center mx-auto text-amber-500 shadow-inner">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Mudar de Marca?</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Você tem itens no carrinho desta marca. Deseja finalizar este pedido agora ou salvar para depois?
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={onGoToCart}
                  className="w-full py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  Finalizar Pedido Atual
                </button>
                <button 
                  onClick={() => confirmBrandSwitch(true)}
                  className="w-full py-5 bg-slate-100 text-slate-600 rounded-full font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Salvar e Mudar de Marca
                </button>
                <button 
                  onClick={() => setShowSwitchWarning(false)}
                  className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showLogisticsWarning && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative z-10 p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-rose-50 rounded-[28px] flex items-center justify-center mx-auto text-rose-500 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Aviso de Logística</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Cada marca possui suas próprias **condições comerciais, estoque e envios**. 
                  <br/><br/>
                  Os pedidos não poderão ser somados entre as marcas.
                </p>
              </div>
              <button 
                onClick={handleAcknowledgeLogistics}
                className="w-full py-5 bg-rose-500 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                Estou ciente
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-8 pt-4 sm:pt-8">
        <Banner banners={banners} />
      </div>

      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Category Bar */}
        <div className="flex items-center gap-4 mb-12 overflow-x-auto pb-4 custom-scrollbar">
          {brands.map(brand => (
            <button 
              key={brand.id}
              onClick={() => handleBrandChange(brand.id)}
              className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedBrand === brand.id ? 'pink-gradient text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-500 hover:bg-slate-50 shadow-sm rounded-full'}`}
            >
              {brand.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block lg:w-64 shrink-0 space-y-12">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[2px] mb-6 text-slate-400">Categorias</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-5 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${!selectedCategory ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Todas
                </button>
                {[...visibleCategories].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-5 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat.id ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {cat.nome}
                  </button>
                ))}
              </div>
            </div>

            {role === 'customer' && (
              <div className="p-8 bg-slate-900 rounded-[10px] text-white relative overflow-hidden group shadow-2xl">
                <div className="relative z-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[2px] mb-2">Suporte VIP</h4>
                  <p className="text-[9px] font-bold text-white/50 mb-8 leading-relaxed uppercase tracking-widest">Dúvidas sobre produtos ou pedidos? Fale com seu consultor.</p>
                  <button 
                    onClick={handleWhatsAppSupport}
                    className="w-full py-4 bg-white text-slate-900 rounded-[6px] text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
                  >
                    WhatsApp Direto
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            )}
          </aside>

          {/* Mobile Category Pills */}
          <div className="lg:hidden mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[2px] mb-4 text-slate-400 px-4">Categorias</h3>
            <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 custom-scrollbar no-scrollbar">
              <button 
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${!selectedCategory ? 'pink-gradient text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-500 border border-slate-100 shadow-sm'}`}
              >
                Todas
              </button>
              {[...visibleCategories].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'pink-gradient text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-500 border border-slate-100 shadow-sm'}`}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-8 px-4 lg:px-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">
                Mostrando <span className="text-slate-900">{filtered.length}</span> produtos
              </p>
              
              <div className="flex items-center gap-4">
                <select 
                  className="bg-white border-none text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-[6px] px-4 py-2 outline-none cursor-pointer shadow-sm"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={24}>24 por página</option>
                  <option value={48}>48 por página</option>
                  <option value={96}>96 por página</option>
                </select>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 px-2 lg:px-0">
                {paginatedProducts.map(p => {
                  const currentCart = carts[p.brand_id || ''] || [];
                  const isInCart = currentCart.some(item => item.id === p.id);
                  return (
                    <ProductCard 
                      key={p.id} 
                      product={p} 
                      onAdd={onAddToCart} 
                      onEdit={onEdit} 
                      role={role} 
                      onZoom={onZoom}
                      isInCart={isInCart}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-3 bg-white rounded-xl text-slate-400 hover:text-primary disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-2">
                  {(() => {
                    const pages = [];
                    const maxVisible = 5;
                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

                    if (start > 1) {
                      pages.push(
                        <button key={1} onClick={() => setCurrentPage(1)} className="w-10 h-10 rounded-xl text-sm font-bold bg-white text-slate-400 hover:bg-slate-50">1</button>
                      );
                      if (start > 2) pages.push(<span key="sep1" className="text-slate-300">...</span>);
                    }

                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <button 
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentPage === i ? 'pink-gradient text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                        >
                          {i}
                        </button>
                      );
                    }

                    if (end < totalPages) {
                      if (end < totalPages - 1) pages.push(<span key="sep2" className="text-slate-300">...</span>);
                      pages.push(
                        <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-xl text-sm font-bold bg-white text-slate-400 hover:bg-slate-50">{totalPages}</button>
                      );
                    }
                    return pages;
                  })()}
                </div>

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-3 bg-white rounded-xl text-slate-400 hover:text-primary disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAdd, onEdit, role, onZoom, isInCart, ...props }: { product: Product, onAdd: (p: Product, q: number) => void, onEdit: (p: Product) => void, role: UserRole, onZoom: (img: string) => void, isInCart?: boolean, [key: string]: any }) {
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
    <Card className={`p-2 flex flex-col group hover:border-primary/20 transition-all duration-300 rounded-[10px] relative ${isEsgotado ? 'opacity-75 grayscale-[0.5]' : ''}`}>
      {isInCart && (
        <div className="absolute top-2 right-2 z-10 bg-emerald-500 text-white p-1 rounded-full shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300">
          <CheckCircle2 size={12} />
        </div>
      )}
      <div className="relative aspect-square mb-2 rounded-[8px] overflow-hidden bg-slate-50 cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-500 shadow-inner" onClick={() => onZoom(product.imagem || '')}>
        <img src={product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`} className="w-full h-full object-contain p-1" alt={product.nome} referrerPolicy="no-referrer" />
        <div className="absolute top-2 w-full flex flex-col gap-1 items-center">
          {isEsgotado && <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-widest">ESGOTADO</span>}
          {!isEsgotado && product.is_last_units && <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-widest">ÚLTIMAS UNIDADES</span>}
          {product.venda_somente_box && <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-widest">SOMENTE NO BOX</span>}
        </div>
      </div>
      
      <div className="text-center mb-2">
        <h3 className="font-black text-slate-800 text-[11px] leading-tight mb-1 h-8 flex items-center justify-center overflow-hidden line-clamp-2 uppercase tracking-tight">{product.nome}</h3>
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.1em] mb-2">SKU: {product.sku}</p>
        
        {!isEsgotado && (
          <p className="text-[13px] font-black text-primary tracking-tight">R$ {(product.preco_unitario || 0).toFixed(2)}</p>
        )}
      </div>

      {(product.has_box_discount || product.venda_somente_box) && !isEsgotado && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-100 rounded-[8px] text-center shadow-inner flex flex-col items-center justify-center">
          <span className="text-[13px] font-black text-amber-700 tracking-tight">R$ {(product.preco_box || 0).toFixed(2)}</span>
          <p className="text-[8px] uppercase font-black text-amber-600 tracking-widest mt-0.5">
            {product.venda_somente_box ? 'SOMENTE NO BOX:' : 'A PARTIR DE:'} {product.qtd_box} UNIDADES
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="flex items-center bg-slate-50 rounded-[6px] p-1 w-full justify-between shadow-inner border border-slate-100">
          <button onClick={handleSubQty} disabled={isEsgotado} className="p-1 text-slate-400 hover:bg-white hover:text-primary rounded-[4px] disabled:opacity-50 transition-all shadow-sm"><Minus size={12}/></button>
          <span className="text-[11px] font-black text-slate-700">{qty}</span>
          <button onClick={handleAddQty} disabled={isEsgotado} className="p-1 text-slate-400 hover:bg-white hover:text-primary rounded-[4px] disabled:opacity-50 transition-all shadow-sm"><Plus size={12}/></button>
        </div>
        <button 
          onClick={() => onAdd(product, qty)} 
          disabled={isEsgotado}
          className="w-full py-[5px] pink-gradient text-white rounded-[6px] font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20 hover:scale-[0.98] active:scale-95 disabled:opacity-50 transition-all"
        >
          <ShoppingCart size={12} className="inline-block mr-1" />
          Adicionar
        </button>
      </div>
    </Card>
  );
}
