import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Clock,
  User,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ShieldCheck,
  CreditCard,
  Info,
  Star,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  CheckCircle2,
  X,
  Search,
  Menu,
  LifeBuoy,
  Ticket,
  UserCircle,
  Eye,
  Bell,
  Flame,
  Timer,
} from 'lucide-react';
import { MapPreviewSVG } from '@/components/MapStudio/MapPreviewSVG';
import type { Sector, VenueElement, TextElement } from '@/types/mapStudio';

type Device = 'desktop' | 'mobile';
type CartItem = { sectorId: string; name: string; price: number; qty: number; color: string };

interface PreviewSnapshot {
  mapName: string;
  width: number;
  height: number;
  sectors: Sector[];
  elements: VenueElement[];
  textElements: TextElement[];
  backgroundImage: string | null;
  bgConfig: { url: string; opacity: number; scale: number; x: number; y: number } | null;
}

const SNAPSHOT_KEY = 'mapstudio.preview.snapshot';

// Brand tokens (Guichê Web)
const BRAND = {
  green: '#11CC35',
  greenDark: '#0fb02e',
  magenta: '#da15ff',
  cyan: '#00a5ff',
  yellow: '#ffce00',
};

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const GW_LOGO = 'https://s3.guicheweb.com.br/nova_marca/logogw.png';

// Modelo: 54ª Exposete Rodeio Festival
const eventInfo = {
  title: '54ª Exposete Rodeio Festival',
  subtitle: 'A maior festa do interior de Minas Gerais',
  date: '09 a 19 de Julho de 2026',
  doors: '18:00h',
  venue: 'Parque de Exposições Edgar Maffei',
  city: 'SETE LAGOAS / MG',
  rating: 4.9,
  reviews: 4820,
  heroBanner: 'https://s3.guicheweb.com.br/banners/19-06-2026_10-39-35.png',
  description: `A Exposete chega à sua 54ª edição como uma das maiores festas agropecuárias do país, reunindo rodeio profissional, shows nacionais, parque de diversões, praça de alimentação e leilões.

Durante 11 dias de programação, o Parque de Exposições Edgar Maffei recebe mais de 300 mil visitantes e atrações de primeira linha do sertanejo, pagode e piseiro.

Garanta seu ingresso e viva uma experiência inesquecível em Sete Lagoas / MG.`,
};

const upcomingEvents = [
  { title: 'Turnê Manifesto Musical 2026 - SP', city: 'São Paulo / SP', date: '15 FEV',
    img: 'https://s3.guicheweb.com.br/banners/20-01-2026_11-45-24.jpg' },
  { title: 'Henrique e Juliano Em Casa', city: 'Palmas / TO', date: '12 SET',
    img: 'https://s3.guicheweb.com.br/banners/27-05-2026_16-27-13.jpg' },
  { title: 'Festa do Peão de Salto de Pirapora', city: 'Salto de Pirapora / SP', date: '20 a 28 JUN',
    img: 'https://s3.guicheweb.com.br/banners/20-05-2026_10-41-16.png' },
  { title: 'Oba Festival 2027', city: 'Goiânia / GO', date: '03 a 05 JAN',
    img: 'https://s3.guicheweb.com.br/banners/17-06-2026_14-19-42.png' },
  { title: 'Tangará Festival Music', city: 'Tangará da Serra / MT', date: '22 AGO',
    img: 'https://s3.guicheweb.com.br/banners/19-06-2026_10-39-35.png' },
  { title: 'Manifesto Musical - BH', city: 'Belo Horizonte / MG', date: '18 JUL',
    img: 'https://s3.guicheweb.com.br/banners/20-01-2026_11-45-26.jpg' },
];

const sectorDescriptions = [
  { name: 'CAMAROTE NASALA', age: '18 anos', notes: ['Open bar premium: cerveja, vodka, gin, whisky, refrigerante, tônica e água', 'Acesso exclusivo e vista privilegiada', 'Área elevada • Experiências exclusivas'] },
  { name: 'ESPAÇO ÚLTIMA SAUDADE', age: '18 anos', notes: ['Open bar: cerveja, água e refrigerante', 'Haverá venda de destilados'] },
  { name: 'GRAMADO', age: '16 anos', notes: ['Área localizada no gramado do parque', 'Venda de bebidas', 'Área de alimentação'] },
  { name: 'ARQUIBANCADA', age: '16 anos', notes: ['Venda de bebidas', 'Área de alimentação'] },
];

const faqs = [
  { q: 'Será permitida a entrada de menores acompanhados e com autorização?',
    a: 'Menores com 16 e 17 anos devem estar acompanhados do responsável legal nos setores Gramado e Arquibancada. Não serão aceitos menores sozinhos. Nos setores open bar não serão permitidos menores de 18 anos mesmo que acompanhados.' },
  { q: 'Quais alimentos serão aceitos na portaria com ingresso solidário?',
    a: 'Apenas alimentos não perecíveis, embalados de fábrica, dentro do prazo de validade e que não sejam sal, cuscuz ou milharina.' },
  { q: 'Qual horário de abertura dos portões do evento?', a: 'Abertura dos portões prevista para 18 horas.' },
  { q: 'Terá estacionamento?', a: 'Sim, terceirizado. A produção não se responsabiliza pelos veículos.' },
  { q: 'Terá área PCD?', a: 'Sim, haverá área exclusiva para PCD e seus acompanhantes.' },
];

const rules = [
  'Apresentação obrigatória do ingresso impresso ou digital, juntamente com documento oficial com foto.',
  'O não comparecimento ao evento invalidará o ingresso e não permitirá reembolso.',
  'Meia-entrada apenas mediante comprovação no local conforme legislação vigente.',
  'Proibida a entrada com copos, latas, objetos pontiagudos, guarda-chuvas, drones e armas.',
  'Solicitações de cancelamento podem ser feitas em até 7 dias da compra, com no mínimo 48h de antecedência do evento.',
];

const pointsOfSale = [
  { city: 'Sete Lagoas/MG', name: 'Loja Centro', address: 'Av. Brasil, 1502', phone: '(31) 3035-9080' },
  { city: 'Belo Horizonte/MG', name: 'Shopping Diamond Mall', address: 'Av. Olegário Maciel, 1600', phone: '(31) 3033-2210' },
  { city: 'Belo Horizonte/MG', name: 'BH Shopping', address: 'BR-356, 3049 - Belvedere', phone: '(31) 3033-1622' },
  { city: 'Contagem/MG', name: 'ItaúPower Shopping', address: 'Av. João César de Oliveira, 1275', phone: '(31) 3244-1199' },
];

const MOCK_PRICES = [480, 280, 220, 180, 150, 120, 90, 380, 650, 420];
const getSectorPrice = (s: Sector, idx: number): number => {
  const seatWithPrice = s.seats.find((x) => typeof x.price === 'number' && x.price! > 0);
  if (seatWithPrice?.price) return seatWithPrice.price;
  return MOCK_PRICES[idx % MOCK_PRICES.length];
};

const EventPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);
  const [salesOpen, setSalesOpen] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // === Conversion boosters ===
  const [viewers, setViewers] = useState(() => 87 + Math.floor(Math.random() * 60));
  const [now, setNow] = useState(Date.now());
  // Deadline: data simulada do evento (09/Jul/2026 18:00 BRT)
  const deadline = useMemo(() => new Date('2026-07-09T18:00:00-03:00').getTime(), []);


  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SNAPSHOT_KEY);
      if (raw) setSnapshot(JSON.parse(raw) as PreviewSnapshot);
    } catch (e) {
      console.error('Falha ao carregar snapshot do mapa', e);
    }
  }, []);

  // Tick do contador (1s)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Variação suave de viewers
  useEffect(() => {
    const t = setInterval(() => {
      setViewers((v) => Math.max(60, Math.min(180, v + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 2 : 1))));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Rotação de prova social
  useEffect(() => {
    const t = setInterval(() => setProofIdx((i) => (i + 1) % socialProofs.length), 6000);
    return () => clearInterval(t);
  }, [socialProofs.length]);

  // Fecha menu mobile ao mudar rota
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const countdown = useMemo(() => {
    const diff = Math.max(0, deadline - now);
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    return { d, h, m, s };
  }, [deadline, now]);

  const handleRemindMe = () => {
    toast.success('Pronto! Vamos te avisar', {
      description: 'Você receberá um alerta antes do evento esgotar.',
    });
  };

  const sectorsForSale = useMemo(() => {
    if (!snapshot) return [] as Array<{ id: string; name: string; color: string; price: number; available: number }>;
    return snapshot.sectors
      .filter((s) => s.visible !== false)
      .map((s, idx) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        price: getSectorPrice(s, idx),
        available: s.seats.length || 50,
      }));
  }, [snapshot]);

  const minPrice = sectorsForSale.length ? Math.min(...sectorsForSale.map((s) => s.price)) : 0;

  const addToCart = (s: { id: string; name: string; price: number; color: string }) => {
    setCart((prev) => {
      const found = prev.find((i) => i.sectorId === s.id);
      if (found) return prev.map((i) => (i.sectorId === s.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { sectorId: s.id, name: s.name, price: s.price, qty: 1, color: s.color }];
    });
    setCartOpen(true);
  };
  const updateQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev.map((i) => (i.sectorId === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0),
    );
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.sectorId !== id));

  const cartCount = cart.reduce((a, b) => a + b.qty, 0);
  const subtotal = cart.reduce((a, b) => a + b.qty * b.price, 0);
  const fee = subtotal * 0.1;
  const total = subtotal + fee;

  const isMobile = device === 'mobile';

  if (!snapshot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-slate-700 font-medium mb-2">Nenhum mapa em pré-visualização</p>
        <p className="text-sm text-slate-500 mb-6">
          Abra o construtor de mapas e clique em "Preview Página do Evento".
        </p>
        <Button onClick={() => navigate('/mapstudio')} variant="default">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao mapa
        </Button>
      </div>
    );
  }

  const mobileMenuItems = [
    { label: 'Meus Dados', icon: UserCircle, active: false },
    { label: 'Meus Ingressos', icon: Ticket, active: false },
    { label: 'Carrinho', icon: ShoppingCart, active: false, onClick: () => { setMobileMenuOpen(false); setCartOpen(true); } },
    { label: 'Suporte', icon: LifeBuoy, active: false },
  ];

  return (
    <div className="min-h-screen bg-[#eef0f3] flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Botão flutuante: voltar ao mapa + toggle device */}
      <div className="fixed top-3 left-3 z-[100] flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate(-1)}
          className="shadow-lg bg-slate-900 hover:bg-slate-800 text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao mapa
        </Button>
        <div className="flex items-center bg-white/95 backdrop-blur rounded-md p-0.5 shadow-lg border border-slate-200">
          <Button
            variant={device === 'desktop' ? 'default' : 'ghost'}
            size="sm" className="h-7 px-2"
            onClick={() => setDevice('desktop')} title="Desktop"
          ><Monitor className="h-3.5 w-3.5" /></Button>
          <Button
            variant={device === 'mobile' ? 'default' : 'ghost'}
            size="sm" className="h-7 px-2"
            onClick={() => setDevice('mobile')} title="Mobile"
          ><Smartphone className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Container da preview (simula viewport) */}
      <div className={cn('flex-1 flex justify-center', isMobile && 'py-6 px-4')}>
        <div
          className={cn(
            'bg-white transition-all duration-300 relative flex flex-col',
            isMobile
              ? 'w-[390px] shadow-2xl rounded-xl overflow-hidden min-h-[844px]'
              : 'w-full min-h-screen',
          )}
        >
          {/* ============ HEADER STICKY ============ */}
          <header className="sticky top-0 z-50 bg-black text-white border-b border-black shadow-sm">
            <div className={cn('flex items-center justify-between gap-3', isMobile ? 'px-4 h-14' : 'px-8 h-16')}>
              {/* Logo */}
              <div className="flex items-center gap-2">
                <img
                  src={GW_LOGO}
                  alt="Guichê Web"
                  className={cn('w-auto object-contain', isMobile ? 'h-6' : 'h-8')}
                />
              </div>

              {/* Desktop nav */}
              {!isMobile && (
                <nav className="flex items-center gap-5 text-sm text-white/90">
                  <button className="hover:text-[color:var(--brand-green)] flex items-center gap-1" style={{ ['--brand-green' as never]: BRAND.green }}>
                    <Search className="h-4 w-4" /> Buscar evento
                  </button>
                  <button className="hover:text-[color:var(--brand-green)] flex items-center gap-1" style={{ ['--brand-green' as never]: BRAND.green }}>
                    <MapPin className="h-4 w-4" /> Localização <ChevronDown className="h-3 w-3" />
                  </button>
                  <Button
                    variant="outline"
                    className="rounded-full border-2 font-semibold bg-transparent hover:bg-white/10"
                    style={{ borderColor: BRAND.green, color: BRAND.green }}
                  >
                    Crie seu evento
                  </Button>
                  <div className="flex items-center gap-2 pl-3 border-l border-white/20">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-white/80" />
                    </div>
                    <button className="text-sm font-medium hover:underline">Conta</button>
                  </div>
                  <button
                    className="relative rounded-full p-2 text-white"
                    style={{ background: BRAND.green }}
                    onClick={() => setCartOpen(true)}
                    aria-label="Abrir carrinho"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center" style={{ color: BRAND.green }}>
                        {cartCount}
                      </span>
                    )}
                  </button>
                </nav>
              )}

              {/* Mobile: cart + hambúrguer */}
              {isMobile && (
                <div className="flex items-center gap-2">
                  <button
                    className="relative rounded-full p-2 text-white"
                    style={{ background: BRAND.green }}
                    onClick={() => setCartOpen(true)}
                    aria-label="Abrir carrinho"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center" style={{ color: BRAND.green }}>
                        {cartCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="h-10 w-10 rounded-md border border-white/20 flex items-center justify-center text-white"
                    aria-label="Abrir menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* ============ MOBILE MENU DRAWER ============ */}
          {isMobile && mobileMenuOpen && (
            <>
              <div className="absolute inset-0 z-[60] bg-black/50" onClick={() => setMobileMenuOpen(false)} />
              <aside className="absolute top-14 right-0 bottom-0 w-[280px] bg-white z-[61] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Perfil */}
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">Olá, Visitante</p>
                    <button className="text-xs font-medium" style={{ color: BRAND.green }}>Entrar ou cadastrar</button>
                  </div>
                </div>

                {/* Ícones busca/localização */}
                <div className="flex border-b border-slate-200">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-slate-700 hover:bg-slate-50">
                    <Search className="h-4 w-4" /> Buscar
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-slate-700 hover:bg-slate-50 border-l border-slate-200">
                    <MapPin className="h-4 w-4" /> Cidade
                  </button>
                </div>

                {/* Itens */}
                <nav className="flex-1 py-2">
                  {mobileMenuItems.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.label}
                        onClick={m.onClick}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition',
                          m.active && 'bg-primary/10 text-primary border-r-2 border-primary font-semibold',
                        )}
                      >
                        <Icon className="h-4 w-4" /> {m.label}
                      </button>
                    );
                  })}
                </nav>

                {/* Rodapé */}
                <div className="p-4 border-t border-slate-200">
                  <Button
                    className="w-full rounded-full font-semibold text-white"
                    style={{ background: BRAND.green }}
                  >
                    Crie seu evento
                  </Button>
                </div>
              </aside>
            </>
          )}

          {/* ============ MAIN ============ */}
          <main className="flex-1 flex flex-col">
            {/* HERO: APENAS A FOTO DO EVENTO */}
            <section className="bg-slate-100">
              <div className={cn('mx-auto w-full', isMobile ? 'px-0' : 'px-8 py-6 max-w-6xl')}>
                <div className={cn('overflow-hidden bg-slate-200', isMobile ? 'aspect-[16/9]' : 'rounded-2xl shadow-lg aspect-[1920/600]')}>
                  <img
                    src={eventInfo.heroBanner}
                    alt={eventInfo.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
              </div>
            </section>

            {/* URGÊNCIA & PROVA SOCIAL (strip discreta) */}
            <section className="bg-white border-y border-slate-200">
              <div className={cn('mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2', isMobile ? 'px-4 py-3 text-[11px]' : 'px-8 py-3 text-xs max-w-6xl')}>
                <div className="flex items-center gap-2 text-slate-700">
                  <Timer className="h-4 w-4" style={{ color: BRAND.green }} />
                  <span>Faltam</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {countdown.d}d {String(countdown.h).padStart(2, '0')}h {String(countdown.m).padStart(2, '0')}m {String(countdown.s).padStart(2, '0')}s
                  </span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: BRAND.green }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: BRAND.green }} />
                  </span>
                  <Eye className="h-4 w-4 text-slate-500" />
                  <span><span className="font-bold text-slate-900 tabular-nums">{viewers}</span> pessoas vendo este evento</span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-700">
                  <Flame className="h-4 w-4" style={{ color: BRAND.yellow, fill: BRAND.yellow }} />
                  <span>Camarote com <span className="font-bold text-slate-900">poucas unidades</span></span>
                </div>
              </div>
            </section>



            {/* Info do evento + card de preço */}
            <section className={cn('container mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-5xl')}>
              <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1fr_320px]')}>
                <div>
                  <h1 className={cn('font-black text-slate-900 leading-tight', isMobile ? 'text-2xl' : 'text-4xl')}>
                    {eventInfo.title}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">{eventInfo.subtitle}</p>

                  <div className="flex items-center gap-1 mt-3 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={cn('h-4 w-4', i <= Math.round(eventInfo.rating) ? 'fill-amber-500' : '')} />
                    ))}
                    <span className="text-xs text-slate-600 ml-2">
                      {eventInfo.rating} • {eventInfo.reviews.toLocaleString('pt-BR')} avaliações
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg p-2" style={{ background: `${BRAND.green}1a`, color: BRAND.green }}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{eventInfo.date}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Abertura {eventInfo.doors}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg p-2" style={{ background: `${BRAND.cyan}1a`, color: BRAND.cyan }}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{eventInfo.venue}</p>
                        <p className="text-xs text-slate-500">{eventInfo.city}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-rose-500 hover:bg-rose-50">
                      <Heart className="h-4 w-4" />
                    </button>
                    <button className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <aside
                  className="rounded-2xl p-5 h-fit sticky top-20 border"
                  style={{ background: `linear-gradient(180deg, ${BRAND.green}10, #ffffff)`, borderColor: `${BRAND.green}40` }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: BRAND.green }}>A partir de</p>
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 flex items-center gap-1" style={{ background: `${BRAND.cyan}1a`, color: BRAND.cyan }}>
                      <Eye className="h-3 w-3" /> {viewers} agora
                    </span>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-1">{minPrice ? brl(minPrice) : '—'}</p>
                  <p className="text-xs text-slate-500">
                    em até <span className="font-semibold text-slate-700">10x de {brl((minPrice || 0) / 10)}</span> sem juros
                  </p>
                  <p className="text-[11px] text-slate-500 mb-4">+ taxa de serviço</p>
                  <Button
                    className="w-full font-bold h-11 text-white"
                    style={{ background: BRAND.green }}
                    onClick={() => setSalesOpen(true)}
                  >
                    Comprar Ingresso
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full mt-2 h-10 font-semibold"
                    style={{ borderColor: `${BRAND.green}66`, color: BRAND.green }}
                    onClick={handleRemindMe}
                  >
                    <Bell className="h-4 w-4 mr-2" /> Lembre-me deste evento
                  </Button>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                    <ShieldCheck className="h-4 w-4" style={{ color: BRAND.green }} /> Compra 100% segura
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <CreditCard className="h-4 w-4" style={{ color: BRAND.green }} /> Parcele em até 10x sem juros
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center gap-2 text-[11px] text-slate-500">
                    <Flame className="h-3.5 w-3.5" style={{ color: BRAND.yellow }} /> Procura alta — preço pode subir
                  </div>
                </aside>
              </div>
            </section>

            {/* Mapa do evento (display-only) + descrições */}
            <section id="preview-sectors" className="bg-slate-50">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-6xl')}>
                <div className="text-center mb-6">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND.green }}>Mapa do evento</p>
                  <h3 className={cn('font-black text-slate-900', isMobile ? 'text-2xl' : 'text-4xl')}>{snapshot.mapName}</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Confira a distribuição dos setores. Clique em "Comprar ingresso" para escolher seu lugar.
                  </p>
                </div>

                <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1.4fr_1fr]')}>
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden aspect-[4/3] relative">
                    {snapshot.backgroundImage ? (
                      <img
                        src={snapshot.backgroundImage}
                        alt={`Mapa ${snapshot.mapName}`}
                        className="absolute inset-0 w-full h-full object-contain bg-slate-50 select-none pointer-events-none"
                        draggable={false}
                      />
                    ) : sectorsForSale.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 text-center p-6">
                        Nenhum setor criado no mapa ainda.
                      </div>
                    ) : (
                      <div className="absolute inset-0 pointer-events-none select-none">
                        <MapPreviewSVG
                          sectors={snapshot.sectors}
                          elements={snapshot.elements}
                          textElements={snapshot.textElements}
                          width={snapshot.width}
                          height={snapshot.height}
                          backgroundImage={snapshot.backgroundImage}
                          bgConfig={snapshot.bgConfig}
                        />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-[10px] uppercase tracking-wider text-slate-600 font-bold rounded-full px-3 py-1 shadow">
                      Apenas visualização
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sectorDescriptions.map((s) => (
                      <div key={s.name} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-bold text-slate-900">{s.name}</p>
                          <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: `${BRAND.yellow}33`, color: '#7a5b00' }}>
                            {s.age}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {s.notes.map((n, i) => (
                            <li key={i} className="text-xs text-slate-600 flex gap-2">
                              <span style={{ color: BRAND.green }} className="mt-0.5">•</span>{n}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <Button
                      className="w-full font-bold h-12 text-white"
                      style={{ background: BRAND.green }}
                      onClick={() => setSalesOpen(true)}
                    >
                      Comprar Ingresso
                    </Button>
                  </div>
                </div>

                <div className="mt-10 max-w-4xl mx-auto">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ color: BRAND.green }}>
                    <Info className="h-5 w-5" /> Sobre o evento
                  </h4>
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
                    {eventInfo.description}
                  </div>
                </div>
              </div>
            </section>

            {/* Info + Regras */}
            <section className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl')}>
              <div className={cn('grid gap-8', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                <div>
                  <h3 className="font-bold text-xl mb-4 flex items-center gap-2" style={{ color: BRAND.green }}>
                    <Info className="h-5 w-5" /> Informações
                  </h3>
                  <div className="space-y-2">
                    {faqs.map((f, i) => (
                      <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50"
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        >
                          <span className="text-sm font-medium text-slate-900">{f.q}</span>
                          <ChevronDown className={cn('h-4 w-4 transition', openFaq === i && 'rotate-180')} />
                        </button>
                        {openFaq === i && (
                          <div className="px-3 pb-3 text-sm text-slate-600 border-t border-slate-100 bg-slate-50">{f.a}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-xl mb-4 flex items-center gap-2" style={{ color: BRAND.green }}>
                    <ShieldCheck className="h-5 w-5" /> Regras da venda on-line
                  </h3>
                  <ul className="space-y-3">
                    {rules.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: BRAND.green }} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Pontos de venda */}
            <section className="bg-slate-50">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl')}>
                <h3 className="font-bold text-xl mb-4" style={{ color: BRAND.green }}>Pontos de venda</h3>
                <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-4')}>
                  {pointsOfSale.map((p, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <div className="bg-slate-800 text-white text-xs font-semibold px-3 py-2">{p.city}</div>
                      <div className="p-3">
                        <p className="text-sm font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{p.address}</p>
                        <p className="text-xs text-slate-500">{p.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Você também pode gostar */}
            <section className="bg-white">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-6xl')}>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND.green }}>Outros eventos</p>
                    <h3 className={cn('font-black text-slate-900', isMobile ? 'text-xl' : 'text-2xl')}>Você também pode gostar</h3>
                  </div>
                  <button className="text-xs font-semibold hover:underline hidden sm:block" style={{ color: BRAND.green }}>Ver todos →</button>
                </div>
                <div className={cn('grid gap-4', isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-6')}>
                  {upcomingEvents.map((e) => (
                    <div key={e.title} className="group cursor-pointer">
                      <div className="aspect-[800/400] rounded-xl overflow-hidden bg-slate-200 ring-1 ring-slate-200 group-hover:ring-[var(--bg)] transition shadow-sm" style={{ ['--bg' as never]: BRAND.green }}>
                        <img src={e.img} alt={e.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      </div>
                      <p className="mt-2 text-[11px] font-bold" style={{ color: BRAND.green }}>{e.date}</p>
                      <p className="text-xs font-semibold text-slate-900 leading-tight line-clamp-2">{e.title}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {e.city}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>

          {/* ============ FOOTER ============ */}
          <footer className="bg-black text-[#B3B3B3]">
            <div className={cn('mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-6xl')}>
              {/* Topo: logo + sociais + badges */}
              <div className={cn('flex gap-6 pb-6 border-b border-white/10', isMobile ? 'flex-col' : 'flex-row items-center justify-between')}>
                <img src={GW_LOGO} alt="Guichê Web" className="h-8 w-auto object-contain brightness-0 invert" />
                <div className="flex items-center gap-3">
                  {[Instagram, Facebook, Youtube, Linkedin].map((Icon, i) => (
                    <a key={i} href="#" className="h-9 w-9 rounded-full border border-white/30 hover:border-white flex items-center justify-center transition" aria-label="Rede social">
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-10 w-auto" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-10 w-auto" />
                </div>
              </div>

              {/* Meio */}
              {isMobile ? (
                <Accordion type="single" collapsible className="py-2">
                  {[
                    { t: 'Institucional', items: ['Página Inicial', 'Blog', 'Termos de Uso', 'Política de Privacidade'] },
                    { t: 'Eventos', items: ['Criar Evento', 'Procurar Evento', 'Categorias'] },
                    { t: 'Acesso Rápido', items: ['Esqueci minha senha', 'Formas de pagamento', 'Compras canceladas', 'Suporte'] },
                  ].map((s) => (
                    <AccordionItem key={s.t} value={s.t} className="border-white/10">
                      <AccordionTrigger className="text-sm font-bold uppercase hover:no-underline" style={{ color: BRAND.green }}>
                        {s.t}
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="text-sm text-slate-300 space-y-2">
                          {s.items.map((i) => <li key={i}>{i}</li>)}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="grid grid-cols-4 gap-6 py-8">
                  <div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Plataforma de venda de ingressos online para shows, festivais, esportes e eventos culturais em todo Brasil.
                    </p>
                  </div>
                  {[
                    { t: 'INSTITUCIONAL', items: ['Página Inicial', 'Blog', 'Termos de Uso', 'Política de Privacidade'] },
                    { t: 'EVENTOS', items: ['Criar Evento', 'Procurar Evento', 'Categorias', 'Suporte'] },
                    { t: 'ACESSO RÁPIDO', items: ['Esqueci minha senha', 'Formas de pagamento', 'Compras canceladas'] },
                  ].map((s) => (
                    <div key={s.t}>
                      <p className="font-bold text-xs mb-3 tracking-widest" style={{ color: BRAND.green }}>{s.t}</p>
                      <ul className="text-sm text-slate-300 space-y-2">
                        {s.items.map((i) => <li key={i} className="hover:text-white cursor-pointer transition">{i}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Rodapé legal */}
              <div className="pt-6 border-t border-white/10 text-center">
                <p className="text-[11px] text-slate-400">
                  Guichê Web Tecnologia LTDA • CNPJ 00.000.000/0001-00
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  © {new Date().getFullYear()} Todos os direitos reservados. Preview gerada a partir do mapa "{snapshot.mapName}".
                </p>
              </div>
            </div>
          </footer>

          {/* Mobile sticky CTA — sempre visível */}
          {isMobile && (
            <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 shadow-2xl z-40">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold rounded-full px-2 py-0.5 flex items-center gap-1" style={{ background: `${BRAND.yellow}33`, color: '#7a5b00' }}>
                  <Timer className="h-3 w-3" /> {countdown.d}d {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {viewers} agora
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500">A partir de</p>
                  <p className="text-base font-black text-slate-900 leading-tight">{minPrice ? brl(minPrice) : '—'}</p>
                  <p className="text-[10px] text-slate-500">10x de {brl((minPrice || 0) / 10)}</p>
                </div>
                <Button
                  variant="outline"
                  className="h-11 px-3"
                  style={{ borderColor: `${BRAND.green}66`, color: BRAND.green }}
                  onClick={handleRemindMe}
                  aria-label="Lembre-me"
                >
                  <Bell className="h-4 w-4" />
                </Button>
                <Button
                  className="flex-1 font-bold h-11 text-white relative"
                  style={{ background: BRAND.green }}
                  onClick={() => setSalesOpen(true)}
                >
                  Comprar
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center shadow" style={{ color: BRAND.green }}>
                      {cartCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* FAB de carrinho (desktop) — aparece quando há itens */}
          {!isMobile && cartCount > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform animate-scale-in"
              style={{ background: BRAND.green }}
              aria-label="Abrir carrinho"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 bg-white rounded-full h-6 min-w-6 px-1 text-xs font-bold flex items-center justify-center shadow" style={{ color: BRAND.green }}>
                {cartCount}
              </span>
            </button>
          )}

          {/* Prova social rotativa (toast discreto) */}
          {showProof && !salesOpen && !cartOpen && (
            <div className={cn('fixed z-40 animate-fade-in', isMobile ? 'bottom-24 left-3 right-3' : 'bottom-6 left-6 max-w-xs')}>
              <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 flex items-center gap-3 relative">
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${BRAND.green}1a` }}>
                  <CheckCircle2 className="h-5 w-5" style={{ color: BRAND.green }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{socialProofs[proofIdx].name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    comprou <span className="font-medium text-slate-700">{socialProofs[proofIdx].sector}</span> {socialProofs[proofIdx].ago}
                  </p>
                </div>
                <button
                  onClick={() => setShowProof(false)}
                  className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Dispensar"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}



          {/* ============ SALES MODAL ============ */}
          {salesOpen && (
            <div className="absolute inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-stretch justify-center p-0 sm:p-4" onClick={() => setSalesOpen(false)}>
              <div
                className="bg-white w-full max-w-6xl rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b bg-slate-50">
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: BRAND.green }}>Escolha seu lugar</p>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{eventInfo.title}</h4>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSalesOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Stepper de progresso */}
                  <div className="px-4 sm:px-6 pb-3 flex items-center gap-2 text-[11px] font-semibold">
                    {[
                      { n: 1, label: 'Setor', done: !!selectedSectorId || cartCount > 0 },
                      { n: 2, label: 'Quantidade', done: cartCount > 0 },
                      { n: 3, label: 'Pagamento', done: false },
                    ].map((step, i, arr) => {
                      const active = step.done || (i > 0 && arr[i - 1].done && !step.done);
                      return (
                        <React.Fragment key={step.n}>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition"
                              style={
                                step.done
                                  ? { background: BRAND.green, color: '#fff' }
                                  : active
                                  ? { background: '#fff', color: BRAND.green, border: `1.5px solid ${BRAND.green}` }
                                  : { background: '#e5e7eb', color: '#94a3b8' }
                              }
                            >
                              {step.done ? <CheckCircle2 className="h-3 w-3" /> : step.n}
                            </div>
                            <span className={cn('uppercase tracking-wider', step.done || active ? 'text-slate-900' : 'text-slate-400')}>
                              {step.label}
                            </span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="flex-1 h-px" style={{ background: step.done ? BRAND.green : '#e5e7eb' }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>


                <div className={cn('flex-1 grid overflow-hidden', isMobile ? 'grid-cols-1' : 'grid-cols-[1.4fr_1fr]')}>
                  <div className="relative bg-slate-50 border-r border-slate-200 min-h-[300px]">
                    {sectorsForSale.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 text-center p-6">
                        Nenhum setor disponível no mapa.
                      </div>
                    ) : (
                      <MapPreviewSVG
                        sectors={snapshot.sectors}
                        elements={snapshot.elements}
                        textElements={snapshot.textElements}
                        width={snapshot.width}
                        height={snapshot.height}
                        backgroundImage={snapshot.backgroundImage}
                        bgConfig={snapshot.bgConfig}
                        hoveredSectorId={hoveredSectorId}
                        selectedSectorId={selectedSectorId}
                        onHoverSector={setHoveredSectorId}
                        onClickSector={(id) => setSelectedSectorId(id)}
                      />
                    )}
                    {(hoveredSectorId || selectedSectorId) && (
                      <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 text-white text-xs rounded-md px-3 py-2 flex items-center justify-between pointer-events-none">
                        <span className="font-semibold truncate">
                          {sectorsForSale.find((s) => s.id === (hoveredSectorId || selectedSectorId))?.name}
                        </span>
                        <span className="font-bold" style={{ color: BRAND.green }}>
                          {brl(sectorsForSale.find((s) => s.id === (hoveredSectorId || selectedSectorId))?.price ?? 0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <ScrollArea className="bg-white">
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-slate-500 mb-2">
                        Clique em um setor — no mapa ou na lista — para destacar e adicionar ao carrinho.
                      </p>
                      {sectorsForSale.map((s) => {
                        const isActive = (selectedSectorId || hoveredSectorId) === s.id;
                        const inCart = cart.find((i) => i.sectorId === s.id);
                        return (
                          <div
                            key={s.id}
                            onMouseEnter={() => setHoveredSectorId(s.id)}
                            onMouseLeave={() => setHoveredSectorId(null)}
                            onClick={() => setSelectedSectorId(s.id)}
                            className={cn(
                              'flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition',
                              isActive ? 'shadow-md' : 'border-slate-200 hover:border-slate-300',
                            )}
                            style={isActive ? { borderColor: BRAND.green, boxShadow: `0 0 0 3px ${BRAND.green}26` } : undefined}
                          >
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                              style={{ background: s.color }}
                            >
                              {s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                                {s.available > 0 && s.available <= 20 && (
                                  <span className="text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wider flex items-center gap-0.5" style={{ background: `${BRAND.yellow}33`, color: '#7a5b00' }}>
                                    <Flame className="h-2.5 w-2.5" /> Últimas
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{s.available} disponíveis · 10x de {brl(s.price / 10)}</p>
                            </div>
                            <div className="text-right mr-2">
                              <p className="text-[10px] text-slate-400">a partir de</p>
                              <p className="text-sm font-bold" style={{ color: BRAND.green }}>{brl(s.price)}</p>
                            </div>
                            {inCart ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateQty(s.id, -1); }}
                                  className="h-7 w-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                                ><Minus className="h-3 w-3" /></button>
                                <span className="text-sm font-semibold w-5 text-center">{inCart.qty}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); addToCart(s); }}
                                  className="h-7 w-7 rounded text-white flex items-center justify-center"
                                  style={{ background: BRAND.green }}
                                ><Plus className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="text-white h-8"
                                style={{ background: BRAND.green }}
                                onClick={(e) => { e.stopPropagation(); addToCart(s); }}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Adicionar
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border-t bg-slate-50 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500">{cartCount} {cartCount === 1 ? 'ingresso' : 'ingressos'}</p>
                    <p className="text-base font-black text-slate-900">{brl(total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSalesOpen(false)}>Continuar olhando</Button>
                    <Button
                      className="font-bold text-white"
                      style={{ background: BRAND.green }}
                      disabled={cartCount === 0}
                      onClick={() => { setSalesOpen(false); setCartOpen(true); }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" /> Ver carrinho
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ CART DRAWER ============ */}
          {cartOpen && (
            <div className="absolute inset-0 z-[80] flex" onClick={() => setCartOpen(false)}>
              <div className="flex-1 bg-black/40" />
              <div
                className={cn('bg-white shadow-2xl flex flex-col', isMobile ? 'w-full' : 'w-[400px]')}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h4 className="font-bold text-slate-900">Seu carrinho</h4>
                    <p className="text-xs text-slate-500">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCartOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <ShoppingCart className="h-12 w-12 mx-auto opacity-30 mb-3" />
                      <p className="text-sm">Seu carrinho está vazio.</p>
                      <p className="text-xs mt-1">Abra "Comprar Ingresso" para escolher seu setor.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((i) => (
                        <div key={i.sectorId} className="flex gap-3 border border-slate-200 rounded-lg p-3">
                          <div
                            className="h-12 w-12 rounded-md flex items-center justify-center text-white font-bold shrink-0"
                            style={{ background: i.color }}
                          >
                            {i.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{i.name}</p>
                            <p className="text-xs text-slate-500">{brl(i.price)} cada</p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => updateQty(i.sectorId, -1)}
                                className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                              ><Minus className="h-3 w-3" /></button>
                              <span className="text-sm font-medium w-6 text-center">{i.qty}</span>
                              <button
                                onClick={() => updateQty(i.sectorId, 1)}
                                className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                              ><Plus className="h-3 w-3" /></button>
                              <button
                                onClick={() => removeFromCart(i.sectorId)}
                                className="ml-auto text-rose-500 hover:text-rose-700"
                              ><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                            {brl(i.qty * i.price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {cart.length > 0 && (
                  <div className="border-t p-4 space-y-3 bg-slate-50">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="text-slate-900 font-medium">{brl(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Taxa de serviço (10%)</span>
                      <span className="text-slate-900 font-medium">{brl(fee)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-900">Total</span>
                      <span className="font-black text-lg" style={{ color: BRAND.green }}>{brl(total)}</span>
                    </div>
                    <Button className="w-full font-bold h-11 text-white" style={{ background: BRAND.green }}>
                      Ir para o pagamento
                    </Button>
                    <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3 w-3" style={{ color: BRAND.green }} /> Pagamento criptografado
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventPreview;
