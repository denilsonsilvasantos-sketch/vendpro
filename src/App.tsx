import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { getProducts } from "./services/productService";
import { validateSellerCode } from './services/sellerService';
import { registerCompany, loginCompany, getCompanyById } from './services/companyService';
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
  Check,
  Copy,
  Send,
  Share2,
  Eye,
  EyeOff,
  Mail,
  Shield,
  Layout,
  Loader2,
  DollarSign,
  Bell,
  BellRing,
  Mic,
  Camera
} from 'lucide-react';
import { useCart } from './hooks/useCart';
import { useNotifications } from './hooks/useNotifications';
import { subscribeToPush, isPushSupported } from './services/pushService';
import SalesAIChat from './components/SalesAIChat';
import { Product, Category, Seller, Customer, UserRole, CartItem, Company, Brand, BannerData } from './types';
import { searchProductByImage } from './services/aiService';
import { validateCNPJ, validateCPFOrCNPJ, formatCPFOrCNPJ, formatCNPJ, formatPhone } from './lib/validators';
import { Card } from './components/Card';
import { Badge } from './components/Badge';
import CartScreen from './pages/CartScreen';
import Banner from './components/Banner';
import { formatWhatsAppMessage } from './utils/whatsapp';
import { getBanners, getTopBarMessages } from './services/bannerService';

// Lazy load heavy pages — só carrega quando o usuário navega até elas
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Produtos = lazy(() => import('./pages/Produtos'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Pedidos = lazy(() => import('./pages/Pedidos'));
const Comissao = lazy(() => import('./pages/Comissao'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Marcas = lazy(() => import('./pages/Marcas'));
const Upload = lazy(() => import('./pages/Upload'));
const Vendedores = lazy(() => import('./pages/Vendedores'));
const BannerManager = lazy(() => import('./pages/BannerManager'));
const ProductFormModal = lazy(() => import('./components/ProductFormModal'));
const Pendencias = lazy(() => import('./pages/Pendencias'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <Loader2 className="animate-spin text-primary" size={24} />
  </div>
);

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
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold text-[11px] transition-all ${active ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
    >
      {icon}
      <span className="uppercase tracking-[0.08em]">{label}</span>
    </button>
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showCartDisclaimer, setShowCartDisclaimer] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'customer'>('admin');
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [showCompanyWarning, setShowCompanyWarning] = useState(false);
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [topBarMessages, setTopBarMessages] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { cart, carts, addToCart, removeFromCart, updateQuantity, clearCart, total } = useCart(selectedBrand);

  // Reset selected brand if it becomes blocked
  useEffect(() => {
    if (selectedBrand && brands.length > 0) {
      const isStillAvailable = brands.some(b => b.id === selectedBrand);
      if (!isStillAvailable) {
        setSelectedBrand(brands[0]?.id || null);
      }
    }
  }, [brands, selectedBrand]);

  const { notifications, unreadCount, markAllRead, requestBrowserPermission } = useNotifications(
    activeCompanyId, role, role === 'seller' ? user?.id : null
  );
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(() => localStorage.getItem('vendpro_push_dismissed') === '1');
  const [pushSubscribed, setPushSubscribed] = useState(false);

  async function handleEnablePush() {
    if (!user?.id || !activeCompanyId) return;
    const ok = await subscribeToPush(user.id, activeCompanyId);
    if (ok) { setPushSubscribed(true); setPushPromptDismissed(true); localStorage.setItem('vendpro_push_dismissed', '1'); }
  }

  const effectiveRole = viewMode === 'customer' ? 'customer' : role;

  const handleAddToCart = (product: Product, quantity: number, selected_variation?: Record<string, string>) => {
    if (cart.length === 0) {
      setShowCartDisclaimer(true);
    }
    addToCart(product, quantity, selected_variation);
  };

  const handleSendOrder = async (manualClientName?: string, paymentMethod?: string, selectedCustomerId?: string, selectedSellerId?: string) => {
    let whatsappNumber = '';
    
    if (role === 'customer' && user) {
      // Customer sends to seller or company
      whatsappNumber = user.vendedor_whatsapp || company?.telefone || '';
    } else if (role === 'seller' && selectedCustomerId) {
      // Seller sends to selected customer
      const targetCustomer = customers.find(c => c.id === selectedCustomerId);
      whatsappNumber = targetCustomer?.whatsapp || company?.telefone || '';
    } else if (role === 'company' && selectedSellerId) {
      // Company sends to selected seller
      const targetSeller = sellers.find(s => s.id === selectedSellerId);
      whatsappNumber = targetSeller?.whatsapp || company?.telefone || '';
    } else if (company && company.telefone) {
      whatsappNumber = company.telefone;
    }

    if (whatsappNumber) {
      if (cart.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
      }

      const clientName = manualClientName || (role === 'customer' ? user?.nome : (role === 'seller' ? `Vendedor: ${user?.nome}` : ''));
      
      if (supabase && activeCompanyId && selectedBrand) {
        try {
          const orderData = {
            company_id: activeCompanyId,
            customer_id: selectedCustomerId || (role === 'customer' ? user.id : null),
            seller_id: selectedSellerId || (role === 'customer' ? user.seller_id : (role === 'seller' ? user.id : null)),
            brand_id: selectedBrand,
            subtotal: total,
            discount_value: 0,
            discount_type: 'fixed',
            total: total,
            status: 'pending',
            whatsapp_sent: true,
            client_name: clientName,
            payment_method: paymentMethod || null
          };

          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select('id')
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
              subtotal: item.quantity * unitPrice,
              variacoes: item.selected_variation || null
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

      const currentBrand = brands.find(b => b.id === selectedBrand);
      const message = formatWhatsAppMessage(cart, clientName, currentBrand?.name);
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

        // Fetch customers and sellers if role is seller or company
        if (supabase && (role === 'seller' || role === 'company')) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('company_id', activeCompanyId)
            .eq('ativo', true)
            .order('nome');
          setCustomers(customerData || []);

          if (role === 'company') {
            const { data: sellerData } = await supabase
              .from('sellers')
              .select('*')
              .eq('company_id', activeCompanyId)
              .eq('ativo', true)
              .order('nome');
            setSellers(sellerData || []);
          } else if (role === 'seller' && user?.id) {
            // Refresh current seller data
            const { data: currentSeller } = await supabase
              .from('sellers')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            if (currentSeller) {
              setUser((prev: any) => ({ ...prev, ...currentSeller }));
            }
          }
        } else if (supabase && role === 'customer' && user?.id) {
          // Refresh current customer data to get latest blocked brands from seller
          const { data: currentCustomer } = await supabase
            .from('customers')
            .select('*, sellers!customers_seller_id_fkey(*)')
            .eq('id', user.id)
            .maybeSingle();
            
          if (currentCustomer) {
            const updatedUser = {
              ...user,
              ...currentCustomer,
              vendedor_nome: currentCustomer.sellers?.nome,
              vendedor_whatsapp: currentCustomer.sellers?.whatsapp,
              vendedor_marcas_bloqueadas: currentCustomer.sellers?.marcas_bloqueadas || [],
            };
            setUser(updatedUser);
          }
        }

        // Also fetch categories and brands for this company
        if (supabase) {
          const { data: catData } = await supabase.from('categories').select('*').eq('company_id', activeCompanyId).order('nome');

          let blockedBrandIds: string[] = [];
          
          if (role === 'seller' && user?.id) {
            blockedBrandIds = user.marcas_bloqueadas || [];
            
            if (blockedBrandIds.length > 0) {
              finalProducts = fetchedProducts.filter(p => !p.brand_id || !blockedBrandIds.includes(p.brand_id));
            }
          } else if (role === 'customer' && user?.vendedor_marcas_bloqueadas?.length > 0) {
            blockedBrandIds = user.vendedor_marcas_bloqueadas;
            finalProducts = fetchedProducts.filter(p => !p.brand_id || !blockedBrandIds.includes(p.brand_id));
          }

          let filteredCats = catData || [];
          
          let brandQuery = supabase.from('brands').select('*').eq('company_id', activeCompanyId).order('name');
          
          if (role === 'seller') {
            if (blockedBrandIds.length > 0) {
              brandQuery = brandQuery.not('id', 'in', `(${blockedBrandIds.join(',')})`);
              filteredCats = filteredCats.filter((c: any) => !c.brand_id || !blockedBrandIds.includes(c.brand_id));
            }
          } else if (role === 'customer' && blockedBrandIds.length > 0) {
            brandQuery = brandQuery.not('id', 'in', `(${blockedBrandIds.join(',')})`);
            filteredCats = filteredCats.filter((c: any) => !c.brand_id || !blockedBrandIds.includes(c.brand_id));
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

  useEffect(() => {
    if (user) {
      localStorage.setItem('vendpro_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vendpro_user');
    }
  }, [user]);

  const userRefreshed = useRef(false);
  useEffect(() => {
    async function refreshUserData() {
      if (!supabase || !user?.id || !role || userRefreshed.current) return;
      
      try {
        let table = '';
        if (role === 'company') table = 'companies';
        else if (role === 'seller') table = 'sellers';
        else if (role === 'customer') table = 'customers';
        
        if (!table) return;
        
        const { data, error } = await supabase.from(table).select('*').eq('id', user.id).maybeSingle();
        
        if (error) {
          console.error("Erro ao atualizar dados do usuário:", error);
          return;
        }
        
        if (data) {
          userRefreshed.current = true;
          if (role === 'customer' && data.seller_id) {
            const { data: sellerData } = await supabase.from('sellers').select('*').eq('id', data.seller_id).maybeSingle();
            if (sellerData) {
              setUser({
                ...data,
                vendedor_nome: sellerData.nome,
                vendedor_whatsapp: sellerData.whatsapp,
                vendedor_marcas_bloqueadas: sellerData.marcas_bloqueadas || []
              });
              return;
            }
          }
          setUser(data);
        }
      } catch (err) {
        console.error("Erro ao atualizar dados do usuário:", err);
      }
    }
    
    refreshUserData();
  }, [role, supabase, user?.id]);

  const handleLogin = (selectedRole: UserRole, userData: any, companies: any[] = [], sellers: any[] = []) => {
    userRefreshed.current = true;
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
    localStorage.setItem('vendpro_available_companies', JSON.stringify(companies));
    localStorage.setItem('vendpro_sellers', JSON.stringify(sellers));
    setActiveTab('catalog');
  };

  const handleLogout = async () => {
    userRefreshed.current = false;
    setRole(null);
    setUser(null);
    setAvailableCompanies([]);
    setAvailableSellers([]);
    setActiveCompanyId(null);
    localStorage.removeItem('vendpro_role');
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
            }
          }
          
          setShowCompanyInfo(true);
          // fetchData(); // Assuming fetchData is defined elsewhere or not needed
        }} 
      />
    );
  }

  const path = window.location.pathname;
  if (path === '/lgpd') {
    return <iframe src="/lgpd.html" className="fixed inset-0 w-full h-full border-none z-[200] bg-white" />;
  }
  if (path === '/privacidade') {
    return <iframe src="/politica-de-privacidade.html" className="fixed inset-0 w-full h-full border-none z-[200] bg-white" />;
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

      {/* Header */}
      <header className="glass-effect px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:text-primary transition-colors">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.nome} className="w-14 h-14 rounded-xl object-contain shadow-sm bg-white p-0.5" />
            ) : (
              <div className="w-10 h-10 pink-gradient rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                <CheckCircle2 size={24} />
              </div>
            )}
            
            <div className="hidden sm:block">
              {availableCompanies.length > 1 ? (
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
          <div className="flex items-center gap-2 md:gap-4">
            {(role === 'seller' || role === 'company') && (
              <button
                onClick={() => { setShowNotifPanel(p => !p); if (unreadCount > 0) markAllRead(); requestBrowserPermission(); }}
                className="relative p-2.5 bg-white text-slate-600 hover:text-primary hover:bg-primary/5 rounded-full transition-all shadow-sm border border-slate-100"
              >
                {unreadCount > 0 ? <BellRing size={20} className="text-primary animate-[wiggle_0.5s_ease-in-out]" /> : <Bell size={20} />}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setIsCartOpen(true)} className="relative flex items-center gap-2 px-3 py-2.5 bg-white text-slate-600 hover:text-primary hover:bg-primary/5 rounded-full transition-all shadow-sm border border-slate-100">
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <>
                  <span className="text-xs font-black text-primary">
                    R$ {total.toFixed(2)}
                  </span>
                  <span className="absolute -top-1 -right-1 w-5 h-5 pink-gradient text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-white">
                    {cart.length}
                  </span>
                </>
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

      {showNotifPanel && (role === 'seller' || role === 'company') && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
          <div className="fixed top-16 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-primary" />
                <p className="text-sm font-black text-slate-800">Notificações</p>
              </div>
              {notifications.some(n => !n.read) && (
                <button onClick={markAllRead} className="text-[10px] font-bold text-primary hover:underline">Marcar todas lidas</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-400 font-medium">Nenhuma notificação</p>
                </div>
              ) : notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => { setActiveTab('pedidos'); setShowNotifPanel(false); }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-primary' : 'bg-slate-200'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Novo pedido — {n.client_name}</p>
                    <p className="text-xs text-primary font-black">R$ {n.total.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <button onClick={() => { setActiveTab('pedidos'); setShowNotifPanel(false); }}
                className="w-full text-center text-xs font-bold text-primary hover:underline">
                Ver todos os pedidos
              </button>
            </div>
          </div>
        </>
      )}

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
              className="fixed inset-y-0 left-0 w-80 bg-white z-50 shadow-2xl p-8 flex flex-col rounded-r-[48px]"
            >
              <div className="flex items-center justify-between mb-12 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 pink-gradient rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">VendPro</h2>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-full"><X size={24} /></button>
              </div>

              <nav className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <SidebarItem icon={<LayoutGrid size={16}/>} label="Catálogo" active={activeTab === 'catalog'} onClick={() => { setActiveTab('catalog'); setIsSidebarOpen(false); }} />
                
                {effectiveRole !== 'customer' && (
                  <>
                    <SidebarItem icon={<LayoutGrid size={16}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
                    
                    {role !== 'seller' && (
                      <>
                        <SidebarItem icon={<Layout size={16}/>} label="Banners" active={activeTab === 'banners'} onClick={() => { setActiveTab('banners'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Package size={16}/>} label="Produtos" active={activeTab === 'produtos'} onClick={() => { setActiveTab('produtos'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<UploadIcon size={16}/>} label="Upload" active={activeTab === 'upload'} onClick={() => { setActiveTab('upload'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<AlertTriangle size={16}/>} label="Pendências" active={activeTab === 'pendencias'} onClick={() => { setActiveTab('pendencias'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Tag size={16}/>} label="Marcas" active={activeTab === 'marcas'} onClick={() => { setActiveTab('marcas'); setIsSidebarOpen(false); }} />
                        <SidebarItem icon={<Users size={16}/>} label="Vendedores" active={activeTab === 'vendedores'} onClick={() => { setActiveTab('vendedores'); setIsSidebarOpen(false); }} />
                      </>
                    )}
                    
                    <SidebarItem icon={<Users size={16}/>} label="Clientes" active={activeTab === 'clientes'} onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<FileText size={16}/>} label="Pedidos" active={activeTab === 'pedidos'} onClick={() => { setActiveTab('pedidos'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<DollarSign size={16}/>} label="Comissões" active={activeTab === 'comissoes'} onClick={() => { setActiveTab('comissoes'); setIsSidebarOpen(false); }} />
                  </>
                )}

                {effectiveRole === 'customer' && (
                  <SidebarItem icon={<FileText size={16}/>} label="Meus Pedidos" active={activeTab === 'pedidos'} onClick={() => { setActiveTab('pedidos'); setIsSidebarOpen(false); }} />
                )}
                    
                {role !== 'seller' && role !== 'customer' && (
                  <SidebarItem 
                    icon={<User size={16}/>} 
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
                <SidebarItem icon={<User size={16}/>} label="Minha Conta" active={activeTab === 'account'} onClick={() => { setActiveTab('account'); setIsSidebarOpen(false); }} />
                
                {availableCompanies.length > 1 && (
                  <SidebarItem 
                    icon={<LayoutGrid size={16}/>} 
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

      {/* Main Content */}
      <main className="flex-1 w-full relative min-w-0 overflow-x-hidden">
        {role === 'seller' && !pushPromptDismissed && isPushSupported() && (
          <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl text-xs">
            <BellRing size={16} className="text-primary shrink-0" />
            <p className="flex-1 text-slate-700 font-medium"><span className="font-black text-primary">Ative as notificações</span> para receber avisos de novos pedidos no celular.</p>
            <button onClick={handleEnablePush} className="shrink-0 px-3 py-1.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all">Ativar</button>
            <button onClick={() => { setPushPromptDismissed(true); localStorage.setItem('vendpro_push_dismissed', '1'); }} className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none">×</button>
          </div>
        )}
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
              onGoToCart={() => setIsCartOpen(true)}
            />
          )}
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'dashboard' && <Dashboard companyId={activeCompanyId} role={role} user={user} banners={banners} />}
            {activeTab === 'banners' && role === 'company' && <BannerManager companyId={activeCompanyId!} />}
            {activeTab === 'produtos' && <Produtos companyId={activeCompanyId} onRefresh={loadData} />}
            {activeTab === 'upload' && <Upload companyId={activeCompanyId} onRefresh={loadData} />}
            {activeTab === 'pendencias' && <Pendencias companyId={activeCompanyId} onRefresh={loadData} />}
            {activeTab === 'marcas' && <Marcas companyId={activeCompanyId} />}
            {activeTab === 'vendedores' && <Vendedores companyId={activeCompanyId} />}
            {activeTab === 'clientes' && <Clientes companyId={activeCompanyId} role={role} user={user} />}
            {activeTab === 'pedidos' && <Pedidos companyId={activeCompanyId} role={role} user={user} />}
            {activeTab === 'comissoes' && (role === 'seller' || role === 'company') && <Comissao companyId={activeCompanyId} role={role} user={user} />}
            {activeTab === 'account' && <Configuracoes companyId={activeCompanyId} user={user} role={role} onLogout={handleLogout} onUpdateUser={setUser} />}
          </Suspense>
        </div>
      </main>

      <AnimatePresence>
        {editingProduct && (
          <Suspense fallback={<PageLoader />}>
            <ProductFormModal 
              product={editingProduct.id === 'new' ? undefined : editingProduct} 
              companyId={activeCompanyId}
              onClose={() => setEditingProduct(null)} 
              onSave={() => { 
                setEditingProduct(null);
                loadData();
              }} 
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <ShoppingCart size={20} className="text-primary" />
                  <span className="font-black text-slate-900 uppercase tracking-tight text-sm">Meu Carrinho</span>
                  {cart.length > 0 && (
                    <span className="text-xs font-black text-white bg-primary px-2 py-0.5 rounded-full">{cart.length}</span>
                  )}
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body — scrollable */}
              <div className="flex-1 overflow-y-auto">
                <CartScreen
                  cart={cart}
                  total={total}
                  onUpdateQuantity={(id, q, v) => updateQuantity(id, q, undefined, v)}
                  onRemove={(id, v) => removeFromCart(id, undefined, v)}
                  onSendOrder={(clientName, paymentMethod, customerId, sellerId) => {
                    handleSendOrder(clientName, paymentMethod, customerId, sellerId);
                    setIsCartOpen(false);
                  }}
                  selectedBrand={selectedBrand}
                  brands={brands}
                  role={role}
                  customers={customers}
                  sellers={sellers}
                  isDrawer={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer LGPD */}
      <footer className="text-center py-2.5 border-t border-slate-100 bg-white/60">
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => window.open('/politica-de-privacidade.html', '_blank')} className="text-[10px] text-slate-400 hover:text-primary transition-colors font-medium">Política de Privacidade</button>
          <span className="text-slate-200 text-xs">·</span>
          <button onClick={() => window.open('/lgpd.html', '_blank')} className="text-[10px] text-slate-400 hover:text-primary transition-colors font-medium">LGPD</button>
          <span className="text-slate-200 text-xs">·</span>
          <span className="text-[10px] text-slate-300">VendPro © {new Date().getFullYear()}</span>
        </div>
      </footer>

      <SalesAIChat companyId={activeCompanyId} role={role} />
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
  const [view, setView] = useState<'role' | 'seller-code' | 'customer-form' | 'customer-login' | 'company-login' | 'company-register'>('role');
  const [loginType, setLoginType] = useState<'seller' | 'customer' | 'admin' | 'company' | null>(null);
  const [sellerCode, setSellerCode] = useState('');
  const [sellerPassword, setSellerPassword] = useState('');
  const [showSellerPassword, setShowSellerPassword] = useState(false);
  const [customerData, setCustomerData] = useState({ nome: '', nome_empresa: '', cnpj: '', whatsapp: '', senha: '', confirmarSenha: '' });
  const [customerLoginCnpj, setCustomerLoginCnpj] = useState('');
  const [customerLoginSenha, setCustomerLoginSenha] = useState('');
  const [companyData, setCompanyData] = useState({ nome: '', cnpj: '', telefone: '', responsavel: '', senha: '', confirmarSenha: '' });
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
  const [createdCustomer, setCreatedCustomer] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Auto-validar código de vendedor se presente no localStorage
  useEffect(() => {
    const savedCode = safeLocalStorage.getItem('vendpro_seller_code');
    if (savedCode && view === 'role' && supabase) {
      console.log("Auto-validando código do vendedor salvo:", savedCode);
      const autoValidate = async () => {
        try {
          // Use type: 'customer' for auto-validation from URL link
          const result = await validateSellerCode(savedCode, 'customer');
          if (result.success && result.sellers && result.sellers.length > 0) {
            const mainSeller = result.sellers[0];
            console.log("Código validado com sucesso:", mainSeller.nome);
            setSellerCode(savedCode);
            setSellerInfo(mainSeller);
            setAvailableCompanies(result.companies || []);
            setLoginType('customer');
            setView('customer-form');
          } else {
            console.warn("Código salvo no localStorage é inválido para cliente:", savedCode);
            // Se o código for inválido, removemos para não tentar novamente
            safeLocalStorage.removeItem('vendpro_seller_code');
          }
        } catch (err) {
          console.error("Erro na auto-validação do código:", err);
        }
      };
      autoValidate();
    }
  }, [view, supabase]);

  const handleSellerCodeSubmit = async () => {
    const code = sellerCode.trim().toUpperCase();
    const password = sellerPassword.trim();

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

    if (!code) return alert('Por favor, digite o código');
    
    // For sellers, password is required
    if (loginType === 'seller' && !password) return alert('Por favor, digite a senha');
    
    // Use the correct validation type based on loginType
    const validationType = loginType === 'seller' ? 'seller' : 'customer';
    
    try {
      if (loginType === 'seller') {
        const { validateSellerCode } = await import('./services/sellerService');
        const result = await validateSellerCode(code, password, 'seller');
        
        if (result.success && result.sellers && result.sellers.length > 0) {
          const mainSeller = result.sellers[0];
          setSellerInfo(mainSeller);
          setAvailableCompanies(result.companies || []);
          onLogin('seller', mainSeller, result.companies, result.sellers);
        } else {
          alert('Código ou senha de vendedor inválidos.');
        }
      } else {
        // Customer login or link
        const { validateCustomerCode } = await import('./services/customerService');
        const { validateSellerCode } = await import('./services/sellerService');
        
        // First, try to see if it's a customer login
        const customerResult = await validateCustomerCode(code, password);
        if (customerResult.success && customerResult.customer) {
          // Customer login success
          onLogin('customer', customerResult.customer, [customerResult.company], [customerResult.seller]);
          return;
        }

        // If not a customer login, check if it's a seller's link code
        const sellerResult = await validateSellerCode(code, undefined, 'customer');
        if (sellerResult.success && sellerResult.sellers && sellerResult.sellers.length > 0) {
          const mainSeller = sellerResult.sellers[0];
          setSellerInfo(mainSeller);
          setAvailableCompanies(sellerResult.companies || []);
          setView('customer-form');
        } else {
          alert('Código inválido. Verifique se digitou corretamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao validar código:', error);
      alert('Erro ao validar código');
    }
  };

  const handleCustomerLogin = async () => {
    if (!customerLoginCnpj || !customerLoginSenha) {
      alert('Por favor, informe o CNPJ e a senha');
      return;
    }

    try {
      const { validateCustomerLogin } = await import('./services/customerService');
      const result = await validateCustomerLogin(customerLoginCnpj, customerLoginSenha);

      if (result.success && result.customer) {
        onLogin('customer', { 
          ...result.customer, 
          vendedor_nome: result.seller?.nome,
          vendedor_whatsapp: result.seller?.whatsapp,
          vendedor_marcas_bloqueadas: result.seller?.marcas_bloqueadas || [],
        }, [result.company]);
      } else {
        alert(result.error || 'Erro ao realizar login');
      }
    } catch (error) {
      console.error('Erro no login do cliente:', error);
      alert('Erro ao realizar login');
    }
  };

  const handleCustomerSubmit = async () => {
    if (!customerData.nome || !customerData.nome_empresa || !customerData.cnpj || !customerData.whatsapp || !customerData.senha) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (customerData.senha !== customerData.confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    if (!validateCPFOrCNPJ(customerData.cnpj)) {
      alert("Por favor, informe um CNPJ válido.");
      return;
    }

    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Erro: Conexão com o banco de dados não disponível.');
      setLoading(false);
      return;
    }
    try {
      const { createCustomer } = await import('./services/customerService');
      
      // Try to find existing customer by CNPJ globally
      const { data: existingCustomers, error: searchError } = await supabase
        .from('customers')
        .select('*, sellers!customers_seller_id_fkey(*)')
        .eq('cnpj', customerData.cnpj.replace(/\D/g, ''))
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingCustomers) {
        setError('Este CNPJ já está cadastrado no sistema. Por favor, faça login.');
        setView('customer-login');
        setCustomerLoginCnpj(customerData.cnpj);
      } else {
        // Validate required IDs
        if (!sellerInfo.id || !sellerInfo.company_id) {
          console.error("Informações do vendedor incompletas:", sellerInfo);
          setError("Erro: Informações do vendedor estão incompletas. Por favor, recarregue a página.");
          return;
        }

        // Create new customer using the service to generate credentials
        const result = await createCustomer(sellerInfo.company_id, {
          nome: customerData.nome,
          nome_empresa: customerData.nome_empresa,
          cnpj: customerData.cnpj,
          whatsapp: customerData.whatsapp,
          senha: customerData.senha,
          seller_id: sellerInfo.id,
          ativo: true,
          vendedor_marcas_bloqueadas: sellerInfo.marcas_bloqueadas || [],
          responsavel: customerData.nome || '', // Preenche responsavel com o mesmo valor de nome
        });

        if (result && result.data) {
          if (result.warning) {
            setError(result.warning);
          }
          
          setCreatedCustomer(result.data);
        } else {
          const errorMsg = result?.error || 'Erro desconhecido';
          console.error("Erro no cadastro (result.error):", errorMsg);
          setError(`Erro ao criar cadastro: ${typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg}`);
        }
      }
    } catch (err: any) {
      console.error("Erro no cadastro (catch):", err);
      setError(`Erro ao realizar cadastro: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyCustomerToClipboard = () => {
    if (!createdCustomer) return;
    const text = `*Acesso VendPro*\n\nCódigo de Acesso: ${createdCustomer.codigo_acesso}\nSenha: ${createdCustomer.senha}\n\nEntre no app com esses dados para fazer seus pedidos!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCompanyRegister = async () => {
    if (!companyData.nome || !companyData.cnpj || !companyData.responsavel || !companyData.telefone || !companyData.senha) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (companyData.senha !== companyData.confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }
    if (!validateCNPJ(companyData.cnpj)) {
      alert("Por favor, informe um CNPJ válido.");
      return;
    }
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

    if (!cnpj || !validateCNPJ(cnpj)) {
      alert("Por favor, informe um CNPJ válido.");
      return;
    }
    
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{background: 'linear-gradient(160deg, #f8f6ff 0%, #fff5f9 50%, #f0f4ff 100%)'}}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header — logo real em fundo branco */}
        <div className="bg-white rounded-t-2xl px-8 py-8 text-center border-b border-slate-100 shadow-sm">
          <img
            src="https://res.cloudinary.com/dgzu0ppsf/image/upload/v1774141089/pbf3bo9tdvbcpxfkhxvq.jpg"
            alt="VendPro"
            className="h-60 w-auto mx-auto object-contain"
          />
          <div className="logo-fallback hidden flex-col items-center justify-center py-2">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M4 6l10 16L24 6" stroke="#C21863" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-black text-slate-900 tracking-widest uppercase">Vend<span className="text-primary">Pro</span></span>
            <span className="text-[9px] text-slate-400 tracking-[3px] uppercase">Catálogos Inteligentes</span>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white rounded-b-2xl px-6 py-6 shadow-2xl shadow-slate-200/60">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-2 text-rose-600 text-[10px] font-bold mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

        {createdCustomer && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <Check size={32} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cadastro Realizado!</h2>
              <p className="text-sm text-slate-500 mt-1">Anote seus dados de acesso para entrar no app futuramente.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código de Acesso</p>
                <p className="text-2xl font-black text-primary tracking-wider uppercase">{createdCustomer.codigo_acesso}</p>
              </div>
              <div className="h-px bg-slate-200 w-12 mx-auto" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sua Senha</p>
                <p className="text-2xl font-black text-slate-700 tracking-widest">{createdCustomer.senha}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={copyCustomerToClipboard} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Dados de Acesso'}
              </button>
              <button onClick={() => onLogin('customer', { ...createdCustomer, sellerCode, vendedor_nome: sellerInfo.nome, vendedor_whatsapp: sellerInfo.whatsapp, vendedor_marcas_bloqueadas: sellerInfo.marcas_bloqueadas || [] }, availableCompanies)} className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all">
                Entrar no App
              </button>
            </div>
          </motion.div>
        )}

        {!createdCustomer && view === 'role' && (
          <div className="space-y-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Como deseja entrar?</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Empresa',
                  desc: 'Gerencie seu catálogo',
                  color: '#1B2A4A',
                  bg: '#EEF1F8',
                  svg: (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="4" y="10" width="20" height="14" rx="2" fill="#1B2A4A" opacity="0.15"/>
                      <rect x="8" y="6" width="12" height="18" rx="2" fill="#1B2A4A" opacity="0.3"/>
                      <rect x="11" y="2" width="6" height="22" rx="2" fill="#1B2A4A"/>
                      <rect x="12" y="16" width="4" height="6" rx="1" fill="white"/>
                    </svg>
                  ),
                  action: () => { setLoginType('company'); setView('company-login'); }
                },
                {
                  label: 'Vendedor',
                  desc: 'Acesse seu painel',
                  color: '#B8952A',
                  bg: '#FBF5E6',
                  svg: (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <circle cx="14" cy="9" r="5" fill="#B8952A" opacity="0.3"/>
                      <circle cx="14" cy="9" r="3" fill="#B8952A"/>
                      <path d="M5 24c0-5 4-8 9-8s9 3 9 8" stroke="#B8952A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                      <circle cx="21" cy="8" r="3" fill="#B8952A" opacity="0.5"/>
                      <path d="M24 16c2 1 3 3 3 5" stroke="#B8952A" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
                    </svg>
                  ),
                  action: () => { setLoginType('seller'); setView('seller-code'); }
                },
                {
                  label: 'Cliente',
                  desc: 'Ver catálogo',
                  color: '#C21863',
                  bg: '#FDF0F6',
                  svg: (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <circle cx="14" cy="9" r="5" fill="#C21863" opacity="0.2"/>
                      <circle cx="14" cy="9" r="3" fill="#C21863"/>
                      <path d="M5 24c0-5 4-8 9-8s9 3 9 8" stroke="#C21863" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                      <path d="M19 18l3 3-3 3" stroke="#C21863" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                    </svg>
                  ),
                  action: () => { setLoginType('customer'); setView('seller-code'); }
                },
              ].map(opt => (
                <button key={opt.label} onClick={opt.action}
                  className="rounded-xl py-4 px-2 text-center transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md border border-transparent"
                  style={{ background: opt.bg }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = opt.color + '40')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                >
                  <div className="flex justify-center mb-2">{opt.svg}</div>
                  <div className="text-[11px] font-black uppercase tracking-wide" style={{ color: opt.color }}>{opt.label}</div>
                  <div className="text-[9px] font-medium mt-0.5" style={{ color: opt.color + 'aa' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
            <button 
              onClick={() => { setLoginType('admin'); setView('seller-code'); }}
              className="w-full py-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-primary transition-colors"
            >
              Acesso Administrativo
            </button>
          </div>
        )}

        {view === 'company-login' && (
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Acesso Empresa</p>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">CNPJ</label>
              <input type="text" placeholder="Digite seu CNPJ" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-bold text-slate-700" value={companyLoginCnpj} onChange={e => setCompanyLoginCnpj(formatCNPJ(e.target.value))} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-bold text-slate-700 pr-9" value={companyLoginSenha} onChange={e => setCompanyLoginSenha(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button onClick={handleCompanyLogin} className="w-full py-2.5 bg-gradient-to-r from-[#e91e8c] to-[#7c3aed] text-white rounded-lg font-black text-xs uppercase tracking-wide shadow-lg hover:-translate-y-0.5 transition-all mt-1">Entrar</button>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setShowForgotPassword(true)} className="text-[10px] font-bold text-primary hover:underline">Esqueci a senha</button>
              <button onClick={() => setView('company-register')} className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors">Cadastrar empresa</button>
            </div>
            <button onClick={() => setView('role')} className="w-full text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest hover:text-primary transition-colors pt-1">← Voltar</button>
          </div>
        )}

        {view === 'company-register' && (
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Cadastro de Empresa</p>
            {[
              { ph: 'Seu Nome (Responsável)', key: 'responsavel', type: 'text' },
              { ph: 'Nome da Empresa', key: 'nome', type: 'text' },
              { ph: 'CNPJ', key: 'cnpj', type: 'text' },
              { ph: 'WhatsApp', key: 'telefone', type: 'text' },
            ].map(f => (
              <input key={f.key} type={f.type} placeholder={f.ph} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-bold text-slate-700" value={(companyData as any)[f.key]} onChange={e => setCompanyData({...companyData, [f.key]: f.key === 'cnpj' ? formatCNPJ(e.target.value) : (f.key === 'telefone' ? formatPhone(e.target.value) : e.target.value)})} />
            ))}
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Senha de Acesso" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-bold text-slate-700 pr-9" value={companyData.senha} onChange={e => setCompanyData({...companyData, senha: e.target.value})} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary"><EyeOff size={14} /></button>
            </div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Confirmar Senha" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-bold text-slate-700 pr-9" value={companyData.confirmarSenha} onChange={e => setCompanyData({...companyData, confirmarSenha: e.target.value})} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary"><EyeOff size={14} /></button>
            </div>
            <button onClick={handleCompanyRegister} className="w-full py-2.5 bg-gradient-to-r from-[#e91e8c] to-[#7c3aed] text-white rounded-lg font-black text-xs uppercase tracking-wide shadow-lg hover:-translate-y-0.5 transition-all mt-2">Finalizar Cadastro</button>
            <button onClick={() => setView('company-login')} className="w-full text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest hover:text-primary transition-colors pt-1">← Voltar</button>
          </div>
        )}

        {view === 'seller-code' && (
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
              {loginType === 'seller' ? 'Acesso Vendedor' : loginType === 'customer' ? 'Acesso Cliente' : 'Acesso Admin'}
            </p>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Código de Vínculo</label>
              <input type="text" placeholder="Ex: VEND-1234" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-black uppercase text-slate-700 text-center" value={sellerCode} onChange={e => setSellerCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleSellerCodeSubmit()} />
            </div>
            {loginType === 'seller' && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha</label>
                <div className="relative">
                  <input type={showSellerPassword ? "text" : "password"} placeholder="••••" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-black text-slate-700 text-center pr-10" value={sellerPassword} onChange={e => setSellerPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSellerCodeSubmit()} />
                  <button type="button" onClick={() => setShowSellerPassword(!showSellerPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                    {showSellerPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}
            <button onClick={handleSellerCodeSubmit} className="w-full py-2.5 bg-gradient-to-r from-[#e91e8c] to-[#7c3aed] text-white rounded-lg font-black text-xs uppercase tracking-wide shadow-lg hover:-translate-y-0.5 transition-all">
              {loginType === 'seller' ? 'Entrar' : 'Próximo'}
            </button>
            <div className="flex flex-col items-center gap-2 pt-1">
              {loginType === 'customer' && (
                <button onClick={() => setView('customer-login')} className="text-[10px] font-bold text-primary hover:underline">Já sou cadastrado</button>
              )}
              <div className="flex items-center justify-between w-full">
                <button onClick={() => setShowForgotCode(true)} className="text-[10px] font-bold text-slate-400 hover:underline">Esqueci meu código</button>
                <button onClick={() => setView('role')} className="text-[10px] font-bold text-slate-300 hover:text-primary transition-colors">← Voltar</button>
              </div>
            </div>
          </div>
        )}

        {view === 'customer-login' && (
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Acesso Cliente</p>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">CNPJ</label>
              <input type="text" placeholder="Digite seu CNPJ" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-bold text-slate-700" value={customerLoginCnpj} onChange={e => setCustomerLoginCnpj(formatCNPJ(e.target.value))} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-primary/40 outline-none text-sm font-bold text-slate-700 pr-9" value={customerLoginSenha} onChange={e => setCustomerLoginSenha(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button onClick={handleCustomerLogin} className="w-full py-2.5 bg-gradient-to-r from-[#e91e8c] to-[#7c3aed] text-white rounded-lg font-black text-xs uppercase tracking-wide shadow-lg hover:-translate-y-0.5 transition-all mt-1">Entrar</button>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setView('seller-code')} className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors">Novo cadastro</button>
              <button onClick={() => setView('role')} className="text-[10px] font-bold text-slate-300 hover:text-primary transition-colors">← Voltar</button>
            </div>
          </div>
        )}

        {showForgotPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-4xl p-10 w-full max-w-sm shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4 shadow-inner">
                  <Mail size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recuperar Senha</h3>
                <p className="text-sm text-slate-500 font-medium">Informe seu e-mail cadastrado para receber as instruções de recuperação.</p>
              </div>
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                className="w-full p-5 bg-slate-50 rounded-3xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-bold text-slate-700 shadow-inner"
                value={forgotPasswordEmail}
                onChange={e => setForgotPasswordEmail(e.target.value)}
              />
              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    if (!forgotPasswordEmail) return alert('Informe seu e-mail');
                    
                    if (supabase) {
                      try {
                        // Primeiro verifica se o e-mail existe na tabela de empresas
                        const { data: company, error: searchError } = await supabase
                          .from('companies')
                          .select('id')
                          .eq('email', forgotPasswordEmail)
                          .maybeSingle();

                        if (searchError && !searchError.message.includes('column')) {
                          console.error('Erro ao buscar empresa:', searchError);
                        }

                        // Dispara o reset de senha do Supabase Auth
                        // Nota: Para que isso funcione, o usuário deve existir no Supabase Auth.
                        // Se o usuário foi criado apenas na tabela 'companies', o e-mail não será enviado.
                        const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
                          redirectTo: `${window.location.origin}`,
                        });

                        if (resetError) {
                          console.error('Erro ao solicitar reset de senha:', resetError);
                        }
                      } catch (err) {
                        console.error('Erro inesperado no reset de senha:', err);
                      }
                    }
                    
                    alert('Se o e-mail estiver cadastrado em nosso sistema de autenticação, você receberá um link para redefinir sua senha em instantes. Verifique também sua caixa de spam.');
                    setShowForgotPassword(false);
                  }}
                  className="w-full py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                >
                  Enviar Link
                </button>
                <button 
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest"
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
              className="bg-white rounded-4xl p-10 w-full max-w-sm shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4 shadow-inner">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Código de Acesso</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  {loginType === 'customer' 
                    ? 'Por favor, entre em contato com seu vendedor para que ele forneça seu código de acesso ao catálogo.' 
                    : loginType === 'seller'
                    ? 'Por favor, entre em contato com a empresa para que ela forneça seu código de acesso ao sistema.'
                    : 'Por favor, entre em contato com o suporte do sistema.'}
                </p>
              </div>
              <button 
                onClick={() => setShowForgotCode(false)}
                className="w-full py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}

        {showResetPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-4xl p-10 w-full max-w-sm shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4 shadow-inner">
                  <Shield size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nova Senha</h3>
                <p className="text-sm text-slate-500 font-medium">Digite sua nova senha de acesso.</p>
              </div>
              <input 
                type="password" 
                placeholder="Nova senha" 
                className="w-full p-5 bg-slate-50 rounded-3xl border border-slate-100 focus:ring-2 focus:ring-primary outline-none text-center font-bold text-slate-700 shadow-inner"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button 
                onClick={async () => {
                  if (!newPassword) return alert('Digite a nova senha');
                  if (!supabase) return alert('Erro: Supabase não inicializado');
                  
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) {
                    alert('Erro ao atualizar senha: ' + error.message);
                  } else {
                    // Tenta atualizar também na tabela companies para manter sincronia
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.email) {
                      await supabase.from('companies').update({ senha: newPassword }).eq('email', user.email);
                    }
                    alert('Senha atualizada com sucesso!');
                    setShowResetPassword(false);
                    setView('company-login');
                  }
                }}
                className="w-full py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
              >
                Atualizar Senha
              </button>
            </motion.div>
          </div>
        )}

        {view === 'customer-form' && (
          <div className="space-y-4 text-left">
            <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Identificação do Cliente</p>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4 block">Seu Nome</label>
                <input placeholder="Seu Nome" className="w-full p-4 bg-white rounded-3xl border border-slate-100 font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" value={customerData.nome} onChange={e => setCustomerData({...customerData, nome: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4 block">Nome da Empresa</label>
                <input placeholder="Nome da Empresa" className="w-full p-4 bg-white rounded-3xl border border-slate-100 font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" value={customerData.nome_empresa} onChange={e => setCustomerData({...customerData, nome_empresa: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4 block">CNPJ</label>
                <input placeholder="CNPJ" className="w-full p-4 bg-white rounded-3xl border border-slate-100 font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" value={customerData.cnpj} onChange={e => setCustomerData({...customerData, cnpj: formatCNPJ(e.target.value)})} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4 block">WhatsApp</label>
                <input placeholder="WhatsApp" className="w-full p-4 bg-white rounded-3xl border border-slate-100 font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" value={customerData.whatsapp} onChange={e => setCustomerData({...customerData, whatsapp: formatPhone(e.target.value)})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4 block">Senha</label>
                  <input type="password" placeholder="Senha" className="w-full p-4 bg-white rounded-3xl border border-slate-100 font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" value={customerData.senha} onChange={e => setCustomerData({...customerData, senha: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-4 block">Confirmar</label>
                  <input type="password" placeholder="Confirmar" className="w-full p-4 bg-white rounded-3xl border border-slate-100 font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" value={customerData.confirmarSenha} onChange={e => setCustomerData({...customerData, confirmarSenha: e.target.value})} />
                </div>
              </div>
            </div>
            <button 
              onClick={handleCustomerSubmit}
              disabled={loading}
              className="w-full py-5 bg-primary text-white rounded-full font-black uppercase tracking-widest text-xs mt-6 shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Cadastrando...' : 'Cadastrar e Acessar'}
            </button>
            <button onClick={() => setView('seller-code')} className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 hover:text-primary transition-colors">Voltar</button>
          </div>
        )}
        </div>{/* end body */}

        {/* LGPD footer */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-100">
          <button onClick={() => window.open('/politica-de-privacidade.html', '_blank')} className="text-xs text-slate-500 hover:text-primary transition-colors font-semibold underline underline-offset-2">Política de Privacidade</button>
          <span className="text-slate-300">·</span>
          <button onClick={() => window.open('/lgpd.html', '_blank')} className="text-xs text-slate-500 hover:text-primary transition-colors font-semibold underline underline-offset-2">LGPD</button>
        </div>

      </motion.div>
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
  onAddToCart: (p: Product, q: number, v?: Record<string, string>) => void, 
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
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta busca por voz.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
    };
    recognition.start();
  };

  const handlePhotoSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const keywords = await searchProductByImage(base64, file.type);
        if (keywords) {
          setSearch(keywords);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };
  const [pendingBrandId, setPendingBrandId] = useState<string | null>(null);
  const [acknowledgedBrands, setAcknowledgedBrands] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('vendpro_acknowledged_brands');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

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
      setAcknowledgedBrands(prev => {
        const next = new Set([...prev, selectedBrand]);
        try { localStorage.setItem('vendpro_acknowledged_brands', JSON.stringify([...next])); } catch {}
        return next;
      });
    }
    setShowConditions(false);
  };

  const handleWhatsAppSupport = () => {
    let whatsappNumber = '';
    
    if (role === 'customer') {
      whatsappNumber = user?.vendedor_whatsapp || company?.telefone || '';
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
    if (!searchLower) return (selectedCategory ? p.category_id === selectedCategory : true) && (selectedBrand ? p.brand_id === selectedBrand : true);
    
    const searchTerms = searchLower.split(/\s+/);
    const nome = (p.nome || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    
    // Check variety SKUs
    const varietySkus = (p.variacoes_flat || []).map(v => (v.sku || '').toLowerCase());
    
    const matchesSearch = searchTerms.every(term => 
      nome.includes(term) || 
      sku.includes(term) || 
      varietySkus.some(vSku => vSku.includes(term))
    );
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesBrand = selectedBrand ? p.brand_id === selectedBrand : true;
    return matchesSearch && matchesCategory && matchesBrand;
  }).sort((a, b) => {
    const isEsgotadoA = a.status_estoque === 'esgotado';
    const isEsgotadoB = b.status_estoque === 'esgotado';

    // Se estiver em "Todas as Categorias", esgotados vão para o final absoluto
    if (!selectedCategory) {
      if (isEsgotadoA && !isEsgotadoB) return 1;
      if (!isEsgotadoA && isEsgotadoB) return -1;
    }

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

    // Se NÃO estiver em "Todas", esgotados ficam no final da sua categoria
    if (selectedCategory) {
      if (isEsgotadoA && !isEsgotadoB) return 1;
      if (!isEsgotadoA && isEsgotadoB) return -1;
    }

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

      <div className="w-full px-2 sm:px-4 md:px-8 pt-4 sm:pt-6 max-w-7xl mx-auto">
        <Banner banners={banners} />
      </div>

      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Search Bar */}
        <div className="mb-8 max-w-2xl">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar produtos (Nome ou SKU)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-14 pr-32 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-black uppercase tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-xl shadow-slate-200/50"
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              <button
                onClick={startVoiceSearch}
                className={`p-3 rounded-full transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-50 hover:text-primary'}`}
                title="Busca por voz"
              >
                <Mic size={20} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-full transition-all ${isAnalyzingPhoto ? 'bg-primary text-white animate-spin' : 'text-slate-400 hover:bg-slate-50 hover:text-primary'}`}
                title="Busca por foto"
              >
                {isAnalyzingPhoto ? <Loader2 size={20} /> : <Camera size={20} />}
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoSearch} 
            />
          </div>
        </div>

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
          {/* Sidebar Filters */}
          <aside className="lg:w-64 shrink-0 space-y-12">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-slate-400">Categorias</h3>
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
              <div className="p-8 bg-slate-900 rounded-[40px] text-white relative overflow-hidden group shadow-2xl">
                <div className="relative z-10">
                  <h4 className="text-lg font-black uppercase tracking-tight mb-2">Suporte VIP</h4>
                  <p className="text-[10px] font-bold text-white/50 mb-8 leading-relaxed uppercase tracking-widest">Dúvidas sobre produtos ou pedidos? Fale com seu consultor.</p>
                  <button 
                    onClick={handleWhatsAppSupport}
                    className="w-full py-4 bg-white text-slate-900 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
                  >
                    WhatsApp Direto
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </div>
            )}
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Mostrando <span className="text-slate-900">{filtered.length}</span> produtos
                </p>
                {currentBrand && (
                  <button
                    onClick={() => setShowConditions(true)}
                    className="text-[10px] font-black text-primary/70 hover:text-primary uppercase tracking-[0.15em] flex items-center gap-1 transition-colors border-b border-primary/30 hover:border-primary pb-px"
                  >
                    <FileText size={10} strokeWidth={2.5} />
                    Ver Condições
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <select 
                  className="bg-white border-none text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-xl px-4 py-2 outline-none cursor-pointer shadow-sm"
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
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

function VarietiesModal({ 
  product, 
  onClose, 
  onAdd, 
  varietiesQty, 
  onQtyChange 
}: { 
  product: Product, 
  onClose: () => void, 
  onAdd: () => void,
  varietiesQty: Record<string, number>,
  onQtyChange: (sku: string, val: number) => void
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm shrink-0">
              <img src={product.imagem || `https://picsum.photos/seed/${product.sku}/100/100`} className="w-full h-full object-contain p-1" alt={product.nome} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1">{product.nome}</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Escolha as variedades</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-100 text-slate-400 hover:text-rose-500 transition-all shadow-sm">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {product.variacoes_flat?.map(v => (
            <div key={v.sku} className={`flex items-center justify-between gap-4 p-4 rounded-3xl border transition-all ${varietiesQty[v.sku] > 0 ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white border-slate-100'} ${v.esgotado ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{v.nome}</p>
                  {v.esgotado && <span className="bg-rose-100 text-rose-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Esgotado</span>}
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">SKU: {v.sku}</p>
              </div>
              
              <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
                <button 
                  disabled={v.esgotado}
                  onClick={() => onQtyChange(v.sku, (varietiesQty[v.sku] || 0) - 1)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-slate-50"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <input 
                  type="number" 
                  disabled={v.esgotado}
                  value={varietiesQty[v.sku] || 0}
                  onChange={e => onQtyChange(v.sku, parseInt(e.target.value) || 0)}
                  className="w-12 text-center text-sm font-black bg-transparent outline-none text-slate-800"
                />
                <button 
                  disabled={v.esgotado}
                  onClick={() => onQtyChange(v.sku, (varietiesQty[v.sku] || 0) + 1)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-slate-50"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={onAdd}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 hover:scale-[0.98] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <ShoppingCart size={18} strokeWidth={2.5} />
            Adicionar ao Carrinho
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ProductCard({ product, onAdd, onEdit, role, onZoom, isInCart, ...props }: { product: Product, onAdd: (p: Product, q: number, v?: Record<string, string>) => void, onEdit: (p: Product) => void, role: UserRole, onZoom: (img: string) => void, isInCart?: boolean, [key: string]: any }) {
  const [qty, setQty] = useState(product.venda_somente_box ? 1 : (product.multiplo_venda || 1));
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [showVarieties, setShowVarieties] = useState(false);
  const [varietiesQty, setVarietiesQty] = useState<Record<string, number>>({});
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

  const handleVariationChange = (name: string, value: string) => {
    setSelectedVariations(prev => ({ ...prev, [name]: value }));
  };

  const isSelectionComplete = () => {
    if (product.tipo_variacao === 'variedades') return true;
    if (product.tipo_variacao !== 'escolha_livre') return true;
    if (!product.variacoes_disponiveis) return true;
    return product.variacoes_disponiveis.every(v => selectedVariations[v.nome]);
  };

  const handleVarietyQtyChange = (sku: string, value: number) => {
    setVarietiesQty(prev => ({ ...prev, [sku]: Math.max(0, value) }));
  };

  const handleAddVarietiesToCart = () => {
    let added = false;
    (product.variacoes_flat || []).forEach(v => {
      const q = varietiesQty[v.sku] || 0;
      if (q > 0) {
        onAdd(product, q, { "Variedade": v.nome, "SKU": v.sku });
        added = true;
      }
    });
    if (added) {
      setShowVarieties(false);
      setVarietiesQty({});
    } else {
      alert('Por favor, adicione a quantidade em pelo menos uma variedade.');
    }
  };

  return (
    <Card className={`p-3 md:p-4 flex flex-col group hover:border-primary/20 transition-all duration-500 neumorphic-shadow hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 rounded-[32px] relative ${isEsgotado ? 'opacity-75 grayscale-[0.5]' : ''}`}>
      {isInCart && (
        <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white p-2 rounded-full shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300">
          <CheckCircle2 size={16} />
        </div>
      )}
      <div className="relative aspect-square mb-4 rounded-[24px] overflow-hidden bg-slate-50 cursor-zoom-in group-hover:scale-[1.02] transition-transform duration-500 shadow-inner" onClick={() => onZoom(product.imagem || '')}>
        <img src={product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`} className="w-full h-full object-contain p-2" alt={product.nome} referrerPolicy="no-referrer" />
        <div className="absolute top-3 w-full flex flex-col gap-1 items-center">
          {isEsgotado && <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">ESGOTADO</span>}
          {!isEsgotado && product.is_last_units && <span className="bg-rose-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">ÚLTIMAS UNIDADES</span>}
          {product.venda_somente_box && <span className="bg-amber-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">SOMENTE NO BOX</span>}
        </div>
      </div>
      
      <div className="text-center mb-4">
        <h3 className="font-black text-slate-800 text-[11px] md:text-xs leading-tight mb-2 h-10 flex items-center justify-center overflow-hidden line-clamp-2 uppercase tracking-tight">{product.nome}</h3>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3">SKU: {product.sku}</p>
        
        {!isEsgotado && (
          <p className="text-lg md:text-xl font-black text-[#C21863] tracking-tight">R$ {(product.preco_unitario || 0).toFixed(2)}</p>
        )}
      </div>

      {!isEsgotado && product.tipo_variacao === 'escolha_livre' && product.variacoes_disponiveis && (
        <div className="mb-4 space-y-3">
          {product.variacoes_disponiveis.map(v => (
            <div key={v.nome} className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{v.nome}</p>
              <div className="flex flex-wrap gap-1.5">
                {v.opcoes.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleVariationChange(v.nome, opt)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedVariations[v.nome] === opt ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-primary/30'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showVarieties && (
          <VarietiesModal 
            product={product}
            varietiesQty={varietiesQty}
            onQtyChange={handleVarietyQtyChange}
            onClose={() => setShowVarieties(false)}
            onAdd={handleAddVarietiesToCart}
          />
        )}
      </AnimatePresence>

      {(product.has_box_discount || product.venda_somente_box) && !isEsgotado && (
        <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-2xl text-center flex flex-col items-center justify-center">
          <span className="text-base font-black text-rose-700 tracking-tight">R$ {(product.preco_box || 0).toFixed(2)}</span>
          <p className="text-[9px] uppercase font-black text-rose-600 tracking-widest mt-0.5">
            {product.venda_somente_box ? 'SOMENTE NO BOX:' : 'A PARTIR DE:'} {product.qtd_box} UN
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-3">
        {product.tipo_variacao !== 'variedades' && (
          <div className="flex items-center bg-slate-50 rounded-[20px] p-1.5 w-full justify-between shadow-inner border border-slate-100">
            <button onClick={handleSubQty} disabled={isEsgotado} className="p-2 text-slate-400 hover:bg-white hover:text-primary rounded-xl disabled:opacity-50 transition-all shadow-sm"><Minus size={14}/></button>
            <span className="text-xs font-black text-slate-700">{qty}</span>
            <button onClick={handleAddQty} disabled={isEsgotado} className="p-2 text-slate-400 hover:bg-white hover:text-primary rounded-xl disabled:opacity-50 transition-all shadow-sm"><Plus size={14}/></button>
          </div>
        )}
        
        <button 
          onClick={() => {
            if (product.tipo_variacao === 'variedades') {
              setShowVarieties(true);
              return;
            }
            if (!isSelectionComplete()) {
              alert('Por favor, selecione todas as variações.');
              return;
            }
            onAdd(product, qty, selectedVariations);
          }} 
          disabled={isEsgotado}
          className="w-full py-4 text-white rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-[0.98] active:scale-95 disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #C21863, #E8257A)' }}
        >
          <ShoppingCart size={14} className="inline-block mr-2" />
          {product.tipo_variacao === 'variedades' ? 'Escolher Variedades' : 'Adicionar'}
        </button>
      </div>
    </Card>
  );
}