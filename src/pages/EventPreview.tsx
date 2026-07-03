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
  Zap,
  TrendingUp,
  Sparkles,
  Award,
} from 'lucide-react';
import { MapPreviewSVG } from '@/components/MapStudio/MapPreviewSVG';
import { getMapContentExtent } from '@/lib/mapUtils';
import type { Sector, VenueElement, TextElement, Seat } from '@/types/mapStudio';

type Device = 'desktop' | 'mobile';
type CartItem = { sectorId: string; name: string; price: number; qty: number; color: string };

// Tipos de ingresso do simulado (fixos). factor = multiplicador sobre o preço do setor.
const TICKET_TYPES: { id: string; label: string; factor: number; hint: string }[] = [
  { id: 'inteira', label: 'Inteira', factor: 1, hint: 'Valor cheio' },
  { id: 'meia', label: 'Meia', factor: 0.5, hint: 'Estudante, idoso, PCD e demais previstos em lei' },
  { id: 'meia-solidaria', label: 'Meia solidária', factor: 0.5, hint: 'Mediante doação de 1kg de alimento não perecível' },
];

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

// Modelo: Circo Mirage Circus Ribeirão Preto
const eventInfo = {
  title: 'Circo Mirage Circus Ribeirão Preto',
  subtitle: 'Marcos Frota apresenta: o gigante está de volta - Tour 2026',
  date: '11 de Julho de 2026',
  doors: '15:30h',
  venue: 'Circo Mirage Circus - Rodovia Antônio Machado Sant\'Anna',
  city: 'RIBEIRÃO PRETO / SP',
  rating: 4.9,
  reviews: 3120,
  heroBanner: 'https://s3.guicheweb.com.br/imagenseventos/15-06-2026_12-55-36.jpg',
  posterImage: 'https://s3.guicheweb.com.br/imagenseventos/01-06-2026_21-06-51.png',
  description: `O maior circo do Brasil retorna a Ribeirão Preto com o espetáculo Mirage Circus Tour 2026, comandado por Marcos Frota.

Um show inesquecível para toda a família com acrobatas internacionais, palhaços, ilusionismo, roda da morte e muito mais, em uma estrutura moderna, climatizada e com poltronas numeradas.

Garanta seu ingresso e viva uma experiência mágica no picadeiro do Circo Mirage.`,
};

const upcomingEvents = [
  { title: 'Circo Mirage - Campinas/SP', city: 'Campinas / SP', date: '25 JUL',
    img: 'https://s3.guicheweb.com.br/imagenseventos/01-06-2026_21-06-51.png' },
  { title: 'Circo Mirage - São José do Rio Preto', city: 'S. J. do Rio Preto / SP', date: '08 AGO',
    img: 'https://s3.guicheweb.com.br/imagenseventos/15-06-2026_12-55-36.jpg' },
  { title: 'Turnê Manifesto Musical 2026', city: 'São Paulo / SP', date: '15 FEV',
    img: 'https://s3.guicheweb.com.br/banners/20-01-2026_11-45-24.jpg' },
  { title: 'Henrique e Juliano Em Casa', city: 'Palmas / TO', date: '12 SET',
    img: 'https://s3.guicheweb.com.br/banners/27-05-2026_16-27-13.jpg' },
  { title: 'Oba Festival 2027', city: 'Goiânia / GO', date: '03 a 05 JAN',
    img: 'https://s3.guicheweb.com.br/banners/17-06-2026_14-19-42.png' },
  { title: 'Manifesto Musical - BH', city: 'Belo Horizonte / MG', date: '18 JUL',
    img: 'https://s3.guicheweb.com.br/banners/20-01-2026_11-45-26.jpg' },
];

const sectorDescriptions = [
  { name: 'VIP OURO', age: 'Livre', notes: ['Melhor visão do picadeiro', 'Poltronas numeradas premium', 'Setor mais próximo ao show'] },
  { name: 'VIP PRATA', age: 'Livre', notes: ['Excelente visão central', 'Poltronas numeradas', 'Setor VIP com conforto premium'] },
  { name: 'CENTRAL OURO', age: 'Livre', notes: ['Visão central privilegiada', 'Poltronas numeradas', 'Ótimo custo-benefício'] },
  { name: 'CENTRAL PRATA', age: 'Livre', notes: ['Visão central confortável', 'Poltronas numeradas'] },
  { name: 'LATERAL OURO', age: 'Livre', notes: ['Visão lateral premium', 'Poltronas numeradas'] },
  { name: 'LATERAL PRATA', age: 'Livre', notes: ['Setor de entrada com ótimo preço', 'Poltronas numeradas'] },
];

const faqs = [
  { q: 'Menores de idade podem entrar?',
    a: 'Sim. Crianças de até 2 anos não pagam desde que fiquem no colo dos responsáveis. Menores de 12 anos devem estar acompanhados dos pais ou responsáveis legais.' },
  { q: 'O circo é climatizado?',
    a: 'Sim, toda a estrutura do Circo Mirage é totalmente climatizada, com poltronas numeradas e ambiente coberto.' },
  { q: 'Qual o horário de abertura das portas?', a: 'A abertura dos portões acontece 30 minutos antes do início do espetáculo (15:00h).' },
  { q: 'Terá estacionamento no local?', a: 'Sim, há estacionamento terceirizado próximo ao circo. A produção não se responsabiliza pelos veículos.' },
  { q: 'Como funciona a meia-entrada?', a: 'Meia-entrada mediante comprovação no local conforme legislação vigente (estudante, idoso, PCD, doador de sangue e demais previstos em lei).' },
];

const rules = [
  'Apresentação obrigatória do ingresso impresso ou digital, junto com documento oficial com foto.',
  'Tolerância de 15 minutos após o horário do espetáculo. Após esse período, a entrada é permitida somente em intervalos.',
  'Meia-entrada apenas mediante comprovação no local conforme legislação vigente.',
  'Proibida a entrada com alimentos, bebidas, objetos pontiagudos ou perigosos.',
  'Solicitações de cancelamento podem ser feitas em até 7 dias da compra, com no mínimo 48h de antecedência do evento.',
];

const pointsOfSale = [
  { city: 'Ribeirão Preto/SP', name: 'Bilheteria Oficial do Circo', address: 'Rod. Antônio Machado Sant\'Anna, km 321', phone: '(16) 3600-2020' },
  { city: 'Ribeirão Preto/SP', name: 'Shopping Iguatemi', address: 'Av. Luiz Eduardo Toledo Prado, 900', phone: '(16) 3877-1010' },
  { city: 'Ribeirão Preto/SP', name: 'Ribeirão Shopping', address: 'Av. Cel. Fernando Ferreira Leite, 1540', phone: '(16) 3877-2020' },
  { city: 'Sertãozinho/SP', name: 'Shopping Sertãozinho', address: 'Av. Antônio Paschoal, 2000', phone: '(16) 3945-3030' },
];

// Preços de referência do Circo Mirage (fallback quando o setor não tem preço definido)
const MOCK_PRICES = [105, 90, 80, 65, 30, 25, 210, 180, 160, 130];
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
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Array<{ id: string; sectorId: string; row: string; number: string; price: number; sectorName: string; color: string; ticketType: string }>>([]);
  // Modal de escolha do ingresso ao clicar num assento
  const [pendingSeat, setPendingSeat] = useState<{ seat: Seat; sector: Sector } | null>(null);
  const [pendingTicketType, setPendingTicketType] = useState<string>('inteira');
  // Zoom/pan do mapa dentro do modal
  const [mapView, setMapView] = useState<{ scale: number; panX: number; panY: number }>({ scale: 1, panX: 0, panY: 0 });
  const mapWrapperRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);

  // === Conversion boosters ===
  const [viewers, setViewers] = useState(() => 87 + Math.floor(Math.random() * 60));
  const [now, setNow] = useState(Date.now());
  // Deadline: data simulada do evento (09/Jul/2026 18:00 BRT)
  const deadline = useMemo(() => new Date('2026-07-09T18:00:00-03:00').getTime(), []);

  // Mostrar barra fixa apenas após scroll (sai do hero) e esconder próximo do footer
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      const nearBottom = y + winH > docH - 220;
      setShowStickyCTA(y > 360 && !nearBottom);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);




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
  const maxPrice = sectorsForSale.length ? Math.max(...sectorsForSale.map((s) => s.price)) : 0;

  // Focus bounds para "zoom" no setor selecionado no mapa da página
  const mapFocusBounds = useMemo(() => {
    if (!snapshot || !mapFocusId) return null;
    const s = snapshot.sectors.find((x) => x.id === mapFocusId);
    if (!s) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    s.vertices.forEach((v) => {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    });
    if (!isFinite(minX)) return null;
    const w = maxX - minX;
    const h = maxY - minY;
    const pad = Math.max(w, h) * 0.6;
    return { x: minX - pad, y: minY - pad, w: w + pad * 2, h: h + pad * 2 };
  }, [snapshot, mapFocusId]);

  // Focus bounds do modal — quando um setor é selecionado, dá zoom pra ver os assentos
  // (considerando a rotação do setor)
  const salesFocusBounds = useMemo(() => {
    if (!snapshot || !selectedSectorId) return null;
    const s = snapshot.sectors.find((x) => x.id === selectedSectorId);
    if (!s) return null;
    const ext = getMapContentExtent([s]);
    if (!ext) return null;
    const w = ext.maxX - ext.minX;
    const h = ext.maxY - ext.minY;
    const pad = Math.max(w, h) * 0.15;
    return { x: ext.minX - pad, y: ext.minY - pad, w: w + pad * 2, h: h + pad * 2 };
  }, [snapshot, selectedSectorId]);

  // Bounds do mapa inteiro (setores + elementos como palco/telão + textos), considerando a
  // rotação de cada item — garante que nada seja cortado no enquadramento inicial.
  const wholeMapBounds = useMemo(() => {
    if (!snapshot) return null;
    const ext = getMapContentExtent(snapshot.sectors, snapshot.elements || [], snapshot.textElements || []);
    if (!ext) return { x: 0, y: 0, w: snapshot.width, h: snapshot.height };
    const w = ext.maxX - ext.minX;
    const h = ext.maxY - ext.minY;
    const pad = Math.max(w, h) * 0.08;
    return { x: ext.minX - pad, y: ext.minY - pad, w: w + pad * 2, h: h + pad * 2 };
  }, [snapshot]);

  // Base SEMPRE o mapa inteiro + zoom/pan aplicados. Selecionar um setor apenas
  // ajusta scale/pan (foco), permitindo navegar/panorâmica por todos os setores.
  const effectiveMapBounds = useMemo(() => {
    const base = wholeMapBounds;
    if (!base) return null;
    const scale = mapView.scale;
    const w = base.w / scale;
    const h = base.h / scale;
    const cx = base.x + base.w / 2 - mapView.panX;
    const cy = base.y + base.h / 2 - mapView.panY;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }, [wholeMapBounds, mapView]);

  // Ao selecionar um setor, dá zoom/centraliza nele (sem travar a base — dá pra panoramizar
  // até outro setor). Ao fechar o modal ou desmarcar, volta ao mapa inteiro.
  useEffect(() => {
    if (!salesOpen || !selectedSectorId || !salesFocusBounds || !wholeMapBounds) {
      setMapView({ scale: 1, panX: 0, panY: 0 });
      return;
    }
    const targetScale = Math.max(1, Math.min(8, Math.min(
      (wholeMapBounds.w * 0.75) / salesFocusBounds.w,
      (wholeMapBounds.h * 0.75) / salesFocusBounds.h,
    )));
    const sectorCx = salesFocusBounds.x + salesFocusBounds.w / 2;
    const sectorCy = salesFocusBounds.y + salesFocusBounds.h / 2;
    setMapView({
      scale: targetScale,
      panX: wholeMapBounds.x + wholeMapBounds.w / 2 - sectorCx,
      panY: wholeMapBounds.y + wholeMapBounds.h / 2 - sectorCy,
    });
  }, [selectedSectorId, salesOpen, salesFocusBounds, wholeMapBounds]);

  // Fecha o modal de escolha de ingresso se o modal de vendas fechar
  useEffect(() => {
    if (!salesOpen) setPendingSeat(null);
  }, [salesOpen]);

  // Lock body scroll enquanto qualquer overlay (vendas ou carrinho) está aberto
  useEffect(() => {
    if (!salesOpen && !cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [salesOpen, cartOpen]);

  const zoomBy = (factor: number) => {
    setMapView((v) => {
      const scale = Math.max(1, Math.min(8, v.scale * factor));
      // Ao voltar ao zoom mínimo, recentraliza o mapa inteiro
      return scale <= 1.001 ? { scale: 1, panX: 0, panY: 0 } : { ...v, scale };
    });
  };
  const resetView = () => setMapView({ scale: 1, panX: 0, panY: 0 });

  const onMapWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setMapView((v) => {
      const scale = Math.max(1, Math.min(8, v.scale * factor));
      return scale <= 1.001 ? { scale: 1, panX: 0, panY: 0 } : { ...v, scale };
    });
  };
  const onMapMouseDown = (e: React.MouseEvent) => {
    // pan somente com botão do meio ou quando já em zoom (>1). Deixa clique normal para setores/assentos.
    if (mapView.scale <= 1 && e.button !== 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: mapView.panX, panY: mapView.panY, moved: false };
  };
  const onMapMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !effectiveMapBounds || !mapWrapperRef.current) return;
    const rect = mapWrapperRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.x) * (effectiveMapBounds.w / rect.width);
    const dy = (e.clientY - dragRef.current.y) * (effectiveMapBounds.h / rect.height);
    if (Math.abs(e.clientX - dragRef.current.x) + Math.abs(e.clientY - dragRef.current.y) > 4) dragRef.current.moved = true;
    setMapView((v) => ({ ...v, panX: dragRef.current!.panX + dx, panY: dragRef.current!.panY + dy }));
  };
  const onMapMouseUp = () => { dragRef.current = null; };

  const selectedSeatIds = useMemo(() => selectedSeats.map((s) => s.id), [selectedSeats]);
  const selectedSeatsTotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  // Clique no assento: se já selecionado, remove; senão abre o modal de escolha do ingresso.
  const onSeatClicked = (seat: Seat, sector: Sector) => {
    if (selectedSeats.some((s) => s.id === seat.id)) {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      return;
    }
    setPendingSeat({ seat, sector });
    setPendingTicketType('inteira');
  };

  const pendingBasePrice = useMemo(() => {
    if (!pendingSeat) return 0;
    return sectorsForSale.find((s) => s.id === pendingSeat.sector.id)?.price ?? 0;
  }, [pendingSeat, sectorsForSale]);

  const pendingFinalPrice = useMemo(() => {
    const tt = TICKET_TYPES.find((t) => t.id === pendingTicketType) ?? TICKET_TYPES[0];
    return Math.round(pendingBasePrice * tt.factor);
  }, [pendingBasePrice, pendingTicketType]);

  const confirmSeatSelection = () => {
    if (!pendingSeat) return;
    const { seat, sector } = pendingSeat;
    const tt = TICKET_TYPES.find((t) => t.id === pendingTicketType) ?? TICKET_TYPES[0];
    setSelectedSeats((prev) => [
      ...prev,
      {
        id: seat.id,
        sectorId: sector.id,
        row: seat.row,
        number: seat.number,
        price: Math.round(pendingBasePrice * tt.factor),
        sectorName: sector.name,
        color: sector.color,
        ticketType: tt.label,
      },
    ]);
    setPendingSeat(null);
  };


  // === Inteligência de conversão ===
  // Melhor custo-benefício: setor com >=15 disponíveis mais próximo da mediana de preço
  const bestValueSectorId = useMemo(() => {
    if (!sectorsForSale.length) return null;
    const candidates = sectorsForSale.filter((s) => s.available >= 10);
    const pool = candidates.length ? candidates : sectorsForSale;
    const sorted = [...pool].sort((a, b) => a.price - b.price);
    // pega o do "meio-baixo" — bom equilíbrio entre preço e experiência
    return sorted[Math.min(Math.floor(sorted.length / 3), sorted.length - 1)]?.id ?? null;
  }, [sectorsForSale]);

  // Próxima virada de lote simulada (em 5 dias) e desconto estimado de 12%
  const nextLoteDays = 5;
  const loteSavings = minPrice ? Math.round(minPrice * 0.12) : 0;

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

  // CTA dinâmico baseado em contexto (declarado depois de cartCount)
  const dynamicCta = useMemo(() => {
    if (cartCount > 0) return { label: 'Finalizar compra', micro: 'Garanta antes que esgote' };
    if (countdown.d <= 2) return { label: 'Garantir meu ingresso', micro: 'Últimas horas · evento se aproxima' };
    if (sectorsForSale.some((s) => s.available <= 20)) return { label: 'Últimos ingressos', micro: 'Setores quase esgotados' };
    if (nextLoteDays <= 7) return { label: 'Comprar antes da virada de lote', micro: `Lote sobe em ${nextLoteDays} dias` };
    return { label: 'Comprar ingresso', micro: 'Compra 100% segura' };
  }, [sectorsForSale, countdown.d, cartCount]);

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
    <div className="min-h-screen bg-[#eef0f3] flex flex-col gw-preview" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* === Scoped animations & utilities === */}
      <style>{`
        @keyframes gw-marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes gw-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes gw-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes gw-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(17,204,53,0.35), 0 10px 30px -8px rgba(17,204,53,0.45) } 50% { box-shadow: 0 0 0 8px rgba(17,204,53,0.0), 0 14px 36px -8px rgba(17,204,53,0.55) } }
        @keyframes gw-blob { 0%,100% { transform: translate(0,0) scale(1) } 33% { transform: translate(20px,-15px) scale(1.05) } 66% { transform: translate(-15px,10px) scale(0.97) } }
        @keyframes gw-rise { 0% { opacity: 0; transform: translateY(18px) } 100% { opacity: 1; transform: translateY(0) } }
        @keyframes gw-pulse-dot { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .55; transform: scale(1.35) } }
        .gw-marquee-track { display: inline-flex; animation: gw-marquee 28s linear infinite; }
        .gw-cta-glow { animation: gw-glow 2.6s ease-in-out infinite; }
        .gw-float { animation: gw-float 5s ease-in-out infinite; }
        .gw-rise { animation: gw-rise .7s cubic-bezier(.22,.61,.36,1) both; }
        .gw-rise-delay-1 { animation-delay: .08s; }
        .gw-rise-delay-2 { animation-delay: .16s; }
        .gw-rise-delay-3 { animation-delay: .24s; }
        .gw-grad-text { background: linear-gradient(92deg, ${BRAND.green}, ${BRAND.cyan} 45%, ${BRAND.magenta}); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .gw-shimmer-text { background: linear-gradient(90deg, #fff 0%, #fff 40%, ${BRAND.green} 50%, #fff 60%, #fff 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: gw-shimmer 4s linear infinite; }
        .gw-dot-pulse { animation: gw-pulse-dot 1.4s ease-in-out infinite; }
        .gw-card-hover { transition: transform .35s cubic-bezier(.22,.61,.36,1), box-shadow .35s, border-color .35s; }
        .gw-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -18px rgba(17,204,53,.35); }
        .gw-event-card { transition: transform .4s cubic-bezier(.22,.61,.36,1), box-shadow .4s; }
        .gw-event-card:hover { transform: translateY(-6px); }
        .gw-event-card:hover .gw-event-img { transform: scale(1.08); }
        .gw-event-img { transition: transform .8s cubic-bezier(.22,.61,.36,1); }
        .gw-noise { background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px); background-size: 3px 3px; }
        .gw-ticker-strip { background: linear-gradient(90deg, ${BRAND.green}, #0fb02e); }
        .gw-section-title-bar { display:inline-block; width:34px; height:3px; background: ${BRAND.green}; border-radius: 2px; vertical-align: middle; margin-right: 10px; }
        .gw-display { font-family: 'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.025em; font-variation-settings: "opsz" 96; }
        .gw-display-md { font-family: 'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.02em; font-variation-settings: "opsz" 48; }
      `}</style>
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
            {/* HERO — estilo Guichê Web: fundo blur da mesma imagem + banner nítido + borda serrilhada */}
            <section className="relative overflow-hidden">
              {/* Fundo: mesma imagem em blur escuro (estilo Guichê Web) */}
              <div
                aria-hidden
                className="absolute inset-0 bg-center bg-cover scale-110"
                style={{
                  backgroundImage: `url(${eventInfo.heroBanner})`,
                  filter: 'blur(28px) brightness(0.45) saturate(1.1)',
                }}
              />
              <div aria-hidden className="absolute inset-0 bg-black/55" />

              <div className={cn('relative mx-auto w-full', isMobile ? 'px-0 pt-0 pb-0' : 'px-8 pt-8 pb-8 max-w-6xl')}>
                {!isMobile && (
                  <div className="flex items-center gap-3 mb-5">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
                      <span className="h-1.5 w-1.5 rounded-full gw-dot-pulse" style={{ background: BRAND.green }} />
                      Vendas abertas
                    </span>
                    <span className="text-[11px] text-white/60 font-medium uppercase tracking-[0.16em]">
                      Sete Lagoas · MG · Julho 2026
                    </span>
                  </div>
                )}

                <div className={cn(
                  'relative overflow-hidden bg-slate-100 group',
                  isMobile ? 'aspect-[16/10]' : 'rounded-2xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] ring-1 ring-white/10 aspect-[1920/720]'
                )}>
                  <img
                    src={eventInfo.heroBanner}
                    alt={eventInfo.title}
                    className="w-full h-full object-contain transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
                    loading="eager"
                  />
                  <div className="absolute top-4 left-4 sm:top-5 sm:left-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-900 shadow-sm ring-1 ring-black/5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.green }} />
                      54ª Edição · Confirmado
                    </span>
                  </div>
                </div>
              </div>
            </section>



            {/* URGÊNCIA & PROVA SOCIAL (strip discreta) */}
            <section className="bg-white border-b border-slate-200">
              <div className={cn('mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2', isMobile ? 'px-4 py-3 text-[11px]' : 'px-8 py-3.5 text-xs max-w-6xl')}>
                <div className="flex items-center gap-2 text-slate-600">
                  <Timer className="h-3.5 w-3.5 gw-dot-pulse" style={{ color: BRAND.green }} />
                  <span className="font-medium">Faltam</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {countdown.d}d {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:<span style={{ color: BRAND.green }}>{String(countdown.s).padStart(2, '0')}</span>
                  </span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: BRAND.green }} />
                  <span>Compra <span className="font-semibold text-slate-900">100% segura</span></span>
                </div>
                <div className="hidden sm:block h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-600">
                  <CreditCard className="h-3.5 w-3.5" style={{ color: BRAND.green }} />
                  <span>Em até <span className="font-semibold text-slate-900">10x sem juros</span></span>
                </div>
              </div>
            </section>





            {/* Info do evento + card de preço */}
            <section className={cn('container mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-6xl')}>
              <div className={cn('grid gap-8', isMobile ? 'grid-cols-1' : 'grid-cols-[1fr_360px]')}>
                <div>
                  {/* Badge de categoria */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                      style={{ background: `${BRAND.green}14`, color: BRAND.green }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.green }} />
                      Festival · Rodeio
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Julho · 2026</span>
                  </div>

                  <h1 className={cn(
                    'gw-display text-slate-900 leading-[1.02] gw-rise break-words',
                    isMobile ? 'text-[2rem]' : 'text-[3rem] lg:text-[3.5rem]'
                  )}>
                    54ª Exposete{' '}
                    <span className="text-slate-900">Rodeio Festival</span>
                  </h1>
                  <p className="text-base text-slate-500 mt-2 max-w-2xl">{eventInfo.subtitle}</p>

                  <div className="flex items-center gap-1 mt-4 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={cn('h-4 w-4', i <= Math.round(eventInfo.rating) ? 'fill-amber-500' : '')} />
                    ))}
                    <span className="text-xs text-slate-600 ml-2">
                      <span className="font-bold text-slate-900">{eventInfo.rating}</span> · {eventInfo.reviews.toLocaleString('pt-BR')} avaliações
                    </span>
                  </div>

                  {/* Meta cards */}
                  <div className={cn('mt-6 grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                    <div className="gw-card-hover flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.08]" style={{ background: BRAND.green }} />
                      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${BRAND.green}1a`, color: BRAND.green }}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 relative">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Data</p>
                        <p className="text-sm font-semibold text-slate-900 leading-tight mt-0.5">{eventInfo.date}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> Abertura {eventInfo.doors}
                        </p>
                      </div>
                    </div>
                    <div className="gw-card-hover flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.08]" style={{ background: BRAND.cyan }} />
                      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${BRAND.cyan}1a`, color: BRAND.cyan }}>
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 relative">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Local</p>
                        <p className="text-sm font-semibold text-slate-900 leading-tight mt-0.5 truncate">{eventInfo.venue}</p>
                        <p className="text-xs text-slate-500 mt-1">{eventInfo.city}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button className="h-10 px-4 rounded-full border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition">
                      <Heart className="h-4 w-4" /> Favoritar
                    </button>
                    <button className="h-10 px-4 rounded-full border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition">
                      <Share2 className="h-4 w-4" /> Compartilhar
                    </button>
                  </div>
                </div>



                <aside className="relative h-fit sticky top-20 gw-rise gw-rise-delay-2">
                  {/* glow halo */}
                  <div className="pointer-events-none absolute -inset-[1px] rounded-[20px] opacity-60 blur-xl"
                    style={{ background: `linear-gradient(140deg, ${BRAND.green}55, ${BRAND.cyan}33, ${BRAND.magenta}33)` }} />
                  <div className="relative rounded-2xl p-6 border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">A partir de</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${BRAND.green}1a`, color: BRAND.green }}>
                        <span className="h-1.5 w-1.5 rounded-full gw-dot-pulse" style={{ background: BRAND.green }} /> Disponível
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-4xl font-black text-slate-900 leading-none tracking-tight">{minPrice ? brl(minPrice) : '—'}</p>
                      {maxPrice > minPrice && (
                        <p className="text-xs text-slate-400 line-through tabular-nums">{brl(maxPrice)}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      ou <span className="font-semibold text-slate-700">10x de {brl((minPrice || 0) / 10)}</span> sem juros
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Lote atual · + taxa de serviço</p>

                    {/* Ancoragem: economia antes da virada de lote */}
                    {loteSavings > 0 && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold"
                        style={{ background: `${BRAND.yellow}1f`, color: '#7a5b00' }}>
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span>Economize <span className="font-black">{brl(loteSavings)}</span> comprando antes do próximo lote ({nextLoteDays} dias)</span>
                      </div>
                    )}

                    <Button
                      className="gw-cta-glow w-full font-bold h-12 text-white mt-4 rounded-xl border-0"
                      style={{ background: `linear-gradient(120deg, ${BRAND.green}, #0fb02e)` }}
                      onClick={() => setSalesOpen(true)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {dynamicCta.label}
                    </Button>
                    <p className="text-[11px] text-center text-slate-500 mt-1.5 flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3 w-3" style={{ color: BRAND.green }} />
                      {dynamicCta.micro}
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full mt-1 h-9 text-xs font-semibold text-slate-500 hover:text-slate-900"
                      onClick={handleRemindMe}
                    >
                      <Bell className="h-3.5 w-3.5 mr-1.5" /> Lembre-me deste evento
                    </Button>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                      <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: BRAND.green }} /> Compra 100% segura · SSL
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: BRAND.green }} /> Ingresso digital no e-mail
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                      <Info className="h-4 w-4 shrink-0" style={{ color: BRAND.green }} /> Cancelamento grátis em até 7 dias
                    </div>
                  </div>

                  {/* Formas de pagamento */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Formas de pagamento</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['Visa', 'Master', 'Elo', 'Amex', 'Pix', 'Boleto'].map((m) => (
                        <span key={m} className="px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 tracking-wide">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  </div>
                </aside>

              </div>
            </section>

            {/* Mapa do evento — imagem estática + CTA para abrir seleção */}
            <section id="preview-sectors" className="bg-slate-50">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-6xl')}>
                <div className="text-center mb-6">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND.green }}>Mapa do evento</p>
                  <h3 className={cn('gw-display-md text-slate-900', isMobile ? 'text-2xl' : 'text-4xl')}>{snapshot.mapName}</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Veja abaixo a distribuição dos setores. Clique em "Comprar ingresso" para escolher setor, fila e assento.
                  </p>
                </div>

                <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="aspect-[16/9] relative bg-slate-100">
                    {snapshot.backgroundImage ? (
                      <img
                        src={snapshot.backgroundImage}
                        alt={`Mapa ${snapshot.mapName}`}
                        className="absolute inset-0 w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0">
                        <MapPreviewSVG
                          sectors={snapshot.sectors}
                          elements={snapshot.elements}
                          textElements={snapshot.textElements}
                          width={snapshot.width}
                          height={snapshot.height}
                          backgroundImage={null}
                          bgConfig={null}
                          interactive={false}
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-center sm:text-left text-white">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-white/80">Ingressos disponíveis</p>
                        <p className="text-lg font-black">
                          A partir de <span style={{ color: BRAND.green }}>{brl(minPrice)}</span>
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="text-white font-bold shadow-lg"
                        style={{ background: BRAND.green }}
                        onClick={() => setSalesOpen(true)}
                        disabled={sectorsForSale.length === 0}
                      >
                        <Ticket className="h-4 w-4 mr-2" />
                        {sectorsForSale.length === 0 ? 'Mapa indisponível' : 'Comprar ingresso'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Chips com resumo dos setores (não interativo, só informativo) */}
                {sectorsForSale.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {sectorsForSale.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-2 pr-3 py-1.5 text-xs"
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-bold" style={{ color: BRAND.green }}>{brl(s.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                    <h3 className={cn('gw-display-md text-slate-900', isMobile ? 'text-xl' : 'text-2xl')}>Você também pode gostar</h3>
                  </div>
                  <button className="text-xs font-semibold hover:underline hidden sm:block" style={{ color: BRAND.green }}>Ver todos →</button>
                </div>
                <div className={cn('grid gap-4', isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-6')}>
                  {upcomingEvents.map((e, i) => {
                    const accent = [BRAND.green, BRAND.magenta, BRAND.cyan, BRAND.yellow][i % 4];
                    return (
                      <a key={e.title} href="#" className="gw-event-card group cursor-pointer block">
                        <div className="relative aspect-[800/400] rounded-2xl overflow-hidden bg-slate-200 ring-1 ring-slate-200 shadow-sm">
                          <img src={e.img} alt={e.title} loading="lazy" className="gw-event-img w-full h-full object-cover" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300"
                            style={{ background: `linear-gradient(180deg, transparent 40%, ${accent}cc)` }} />
                          <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-white shadow"
                            style={{ background: accent }}>{e.date}</span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-900 leading-tight line-clamp-2 group-hover:underline underline-offset-4 decoration-2" style={{ textDecorationColor: accent }}>{e.title}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {e.city}
                        </p>
                      </a>
                    );
                  })}
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

          {/* ============ Mobile bottom bar — aparece ao scroll ============ */}
          {isMobile && !salesOpen && !cartOpen && (
            <div
              className={cn(
                'fixed bottom-0 left-0 right-0 z-[60] transition-all duration-300 ease-out',
                showStickyCTA ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0 pointer-events-none',
              )}
            >
              <div
                className="mx-3 mb-3 rounded-2xl bg-white border border-slate-200/80 p-2 flex items-center gap-2.5"
                style={{ boxShadow: '0 -10px 40px -10px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.04)' }}
              >
                <div className="relative h-11 w-11 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                  <img
                    src={eventInfo.heroBanner}
                    alt={eventInfo.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">A partir de</p>
                  <p className="text-base font-black text-slate-900 leading-tight tabular-nums mt-1">
                    {minPrice ? brl(minPrice) : '—'}
                  </p>
                </div>
                <Button
                  className="h-11 px-4 font-bold text-white rounded-xl relative text-sm"
                  style={{ background: BRAND.green, boxShadow: `0 8px 20px -6px ${BRAND.green}aa` }}
                  onClick={() => setSalesOpen(true)}
                >
                  {cartCount > 0 ? 'Finalizar' : dynamicCta.label}
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 bg-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center shadow ring-2 ring-white"
                      style={{ color: BRAND.green }}
                    >
                      {cartCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ============ Desktop floating CTA bar — aparece ao scroll ============ */}
          {!isMobile && !salesOpen && !cartOpen && (
            <div
              className={cn(
                'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ease-out',
                showStickyCTA ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none',
              )}
            >
              <div
                className="flex items-stretch gap-0 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 p-2"
                style={{ boxShadow: '0 24px 60px -20px rgba(15,23,42,0.35), 0 4px 12px rgba(15,23,42,0.06)' }}
              >
                {/* Identidade compacta */}
                <div className="flex items-center gap-3 pl-2 pr-5">
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                    <img
                      src={eventInfo.heroBanner}
                      alt={eventInfo.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 leading-tight truncate max-w-[240px]">
                      {eventInfo.title}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-tight flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> {eventInfo.city}
                    </p>
                  </div>
                </div>

                <div className="w-px bg-slate-200/80 my-1" />

                {/* Preço */}
                <div className="hidden md:flex flex-col justify-center px-5">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">A partir de</p>
                  <p className="text-lg font-black text-slate-900 leading-tight tabular-nums mt-1">
                    {minPrice ? brl(minPrice) : '—'}
                  </p>
                </div>

                {/* Cart pill se houver itens */}
                {cartCount > 0 && (
                  <>
                    <div className="w-px bg-slate-200/80 my-1" />
                    <button
                      onClick={() => setCartOpen(true)}
                      className="hidden lg:flex items-center gap-2 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition rounded-xl"
                    >
                      <ShoppingCart className="h-4 w-4" style={{ color: BRAND.green }} />
                      <span>
                        {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                        <span className="block text-[10px] font-semibold text-slate-500 tabular-nums">{brl(subtotal)}</span>
                      </span>
                    </button>
                  </>
                )}

                {/* CTA dinâmico */}
                <div className="flex flex-col items-stretch pl-2">
                  <Button
                    className="h-12 px-7 font-bold text-white rounded-xl border-0 text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.green} 0%, ${BRAND.greenDark} 100%)`,
                      boxShadow: `0 12px 24px -8px ${BRAND.green}aa`,
                    }}
                    onClick={() => setSalesOpen(true)}
                  >
                    {dynamicCta.label}
                    <ChevronDown className="h-4 w-4 ml-1 -rotate-90" />
                  </Button>
                  <p className="text-[10px] text-center text-slate-500 mt-1 flex items-center justify-center gap-1 font-medium">
                    <ShieldCheck className="h-2.5 w-2.5" style={{ color: BRAND.green }} />
                    {dynamicCta.micro}
                  </p>
                </div>
              </div>
            </div>
          )}




          {/* ============ WhatsApp FAB — sempre visível ============ */}
          {!salesOpen && !cartOpen && (
            <a
              href="https://wa.me/553132267272"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fale conosco no WhatsApp"
              className={cn('group fixed z-[60] h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-105 active:scale-95 transition-transform animate-fade-in',
                isMobile ? 'bottom-24 right-3' : 'bottom-6 right-6')}
              style={{ background: '#25D366', boxShadow: '0 12px 32px -8px rgba(37,211,102,0.55)' }}
            >
              <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: '#25D366' }} />
              <svg viewBox="0 0 24 24" className="relative h-7 w-7 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>
          )}








          {/* ============ SALES MODAL ============ */}
          {salesOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4" onClick={() => setSalesOpen(false)}>
              <div
                className="bg-white w-full max-w-6xl rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[100dvh] sm:h-[90vh]"
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


                <div className={cn('flex-1 grid overflow-hidden min-h-0', isMobile ? 'grid-cols-1 grid-rows-[minmax(260px,45vh)_1fr]' : 'grid-cols-[1.4fr_1fr]')}>
                  <div
                    ref={mapWrapperRef}
                    className="relative bg-slate-50 border-r border-b sm:border-b-0 border-slate-200 overflow-hidden select-none"
                    onWheel={onMapWheel}
                    onMouseDown={onMapMouseDown}
                    onMouseMove={onMapMouseMove}
                    onMouseUp={onMapMouseUp}
                    onMouseLeave={onMapMouseUp}
                    style={{ cursor: mapView.scale > 1 ? (dragRef.current ? 'grabbing' : 'grab') : 'default' }}
                  >
                    {sectorsForSale.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 text-center p-6">
                        Nenhum setor disponível no mapa.
                      </div>
                    ) : (
                      <div className="absolute inset-0">
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
                          onClickSector={(id) => {
                            if (dragRef.current?.moved) return;
                            setSelectedSectorId((prev) => (prev === id ? null : id));
                          }}
                          focusBounds={effectiveMapBounds}
                          showSeatLabels={!!selectedSectorId || mapView.scale >= 2.5}
                          sectorLabelMode="hover"
                          selectedSeatIds={selectedSeatIds}
                          onClickSeat={(seat, sector) => {
                            if (dragRef.current?.moved) return;
                            onSeatClicked(seat, sector);
                          }}
                        />
                      </div>
                    )}
                    {/* Controle: voltar do zoom */}
                    {selectedSectorId && (
                      <button
                        onClick={() => setSelectedSectorId(null)}
                        className="absolute top-3 left-3 bg-white/95 border border-slate-200 rounded-full px-3 py-1 text-[11px] font-bold text-slate-700 shadow hover:bg-white z-10"
                      >
                        ← Ver mapa completo
                      </button>
                    )}
                    {/* Zoom controls */}
                    <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow p-1">
                      <button
                        onClick={() => zoomBy(1.4)}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100"
                        aria-label="Aproximar"
                        title="Aproximar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => zoomBy(1 / 1.4)}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        disabled={mapView.scale <= 1.001}
                        aria-label="Afastar"
                        title="Afastar"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={resetView}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 text-[10px] font-bold disabled:opacity-40"
                        disabled={mapView.scale === 1 && mapView.panX === 0 && mapView.panY === 0}
                        aria-label="Reenquadrar"
                        title="Reenquadrar"
                      >
                        ⤢
                      </button>
                    </div>
                    {/* Indicador de zoom */}
                    {mapView.scale > 1.01 && (
                      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/85 text-white text-[10px] font-bold rounded-full px-2.5 py-1 shadow">
                        {Math.round(mapView.scale * 100)}%
                      </div>
                    )}
                    {/* Instrução flutuante */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-[10px] uppercase tracking-wider text-slate-600 font-bold rounded-full px-3 py-1 shadow z-10">
                      {selectedSectorId
                        ? 'Clique nos assentos • arraste para mover'
                        : mapView.scale > 1
                        ? 'Arraste para mover • scroll para zoom'
                        : 'Clique em um setor • scroll para zoom'}
                    </div>
                    {(hoveredSectorId || selectedSectorId) && (
                      <div className="absolute bottom-14 left-3 right-3 bg-slate-900/90 text-white text-xs rounded-md px-3 py-2 flex items-center justify-between pointer-events-none z-10">
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
                      {selectedSectorId ? (
                        <div className="mb-3">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Assentos selecionados</p>
                          {selectedSeats.length === 0 ? (
                            <p className="text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg p-3">
                              Clique nos assentos do mapa para escolher fila e número.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {selectedSeats.map((seat) => (
                                <div key={seat.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seat.color }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-slate-800 truncate">{seat.sectorName}</p>
                                    <p className="text-[10px] text-slate-500">Fila {seat.row || '—'} · Nº {seat.number || '—'}</p>
                                    {seat.ticketType && (
                                      <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wide rounded px-1 py-px" style={{ background: 'rgba(17,204,53,0.12)', color: BRAND.greenDark }}>
                                        {seat.ticketType}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 tabular-nums">{brl(seat.price)}</span>
                                  <button
                                    onClick={() => setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id))}
                                    className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    aria-label="Remover assento"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-[11px] text-slate-500">Total assentos</span>
                                <span className="text-sm font-black text-slate-900 tabular-nums">{brl(selectedSeatsTotal)}</span>
                              </div>
                              <Button
                                size="sm"
                                className="w-full text-white mt-1"
                                style={{ background: BRAND.green }}
                                onClick={() => {
                                  // Consolida no carrinho por setor
                                  selectedSeats.forEach((seat) => {
                                    const sector = sectorsForSale.find((s) => s.id === seat.sectorId);
                                    if (sector) addToCart(sector);
                                  });
                                  setSelectedSeats([]);
                                  toast.success(`${selectedSeats.length} ${selectedSeats.length === 1 ? 'assento adicionado' : 'assentos adicionados'} ao carrinho`);
                                }}
                              >
                                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                                Adicionar {selectedSeats.length} ao carrinho
                              </Button>
                            </div>
                          )}
                          <div className="my-3 border-t border-slate-100" />
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Outros setores</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 mb-2">
                          Clique em um setor — no mapa ou na lista — para dar zoom e escolher os assentos.
                        </p>
                      )}

                      {sectorsForSale.map((s) => {
                        const isActive = (selectedSectorId || hoveredSectorId) === s.id;
                        const inCart = cart.find((i) => i.sectorId === s.id);
                        const isBest = s.id === bestValueSectorId;
                        return (
                          <div
                            key={s.id}
                            onMouseEnter={() => setHoveredSectorId(s.id)}
                            onMouseLeave={() => setHoveredSectorId(null)}
                            onClick={() => setSelectedSectorId(s.id)}
                            className={cn(
                              'relative flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition',
                              isActive ? 'shadow-md' : 'border-slate-200 hover:border-slate-300',
                              isBest && !isActive && 'border-transparent',
                            )}
                            style={
                              isActive
                                ? { borderColor: BRAND.green, boxShadow: `0 0 0 3px ${BRAND.green}26` }
                                : isBest
                                ? { background: `linear-gradient(180deg, ${BRAND.green}08, #fff)`, boxShadow: `0 0 0 1.5px ${BRAND.green}55` }
                                : undefined
                            }
                          >
                            {isBest && (
                              <span className="absolute -top-2 left-3 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow"
                                style={{ background: BRAND.green }}>
                                <Award className="h-2.5 w-2.5" /> Melhor escolha
                              </span>
                            )}
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

          {/* ============ MODAL: ESCOLHA DO INGRESSO DO ASSENTO ============ */}
          {pendingSeat && (
            <div
              className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setPendingSeat(null)}
            >
              <div
                className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cabeçalho + foto da visão do assento */}
                <div className="relative">
                  {pendingSeat.seat.viewImageUrl ? (
                    <img
                      src={pendingSeat.seat.viewImageUrl}
                      alt="Visão do assento para o palco"
                      className="w-full h-44 object-cover bg-slate-100"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = 'none';
                        el.parentElement?.querySelector('[data-fallback]')?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    data-fallback
                    className={cn(
                      'w-full h-44 flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400',
                      pendingSeat.seat.viewImageUrl ? 'hidden flex' : 'flex',
                    )}
                  >
                    <Eye className="h-7 w-7 opacity-50" />
                    <span className="text-xs font-medium">Sem foto da visão cadastrada</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-2">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-white/80">Visão do assento para o palco</p>
                  </div>
                  <button
                    onClick={() => setPendingSeat(null)}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center text-slate-700 hover:bg-white shadow"
                    aria-label="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto">
                  {/* Resumo do assento */}
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: pendingSeat.sector.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{pendingSeat.sector.name}</p>
                      <p className="text-xs text-slate-500">
                        Fila {pendingSeat.seat.row || '—'} · Nº {pendingSeat.seat.number || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Tipo do ingresso */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">Tipo do ingresso</p>
                    <div className="space-y-1.5">
                      {TICKET_TYPES.map((tt) => {
                        const active = pendingTicketType === tt.id;
                        const price = Math.round(pendingBasePrice * tt.factor);
                        return (
                          <button
                            key={tt.id}
                            onClick={() => setPendingTicketType(tt.id)}
                            className={cn(
                              'w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition',
                              active ? 'border-transparent ring-2' : 'border-slate-200 hover:border-slate-300',
                            )}
                            style={active ? ({ '--tw-ring-color': BRAND.green, background: 'rgba(17,204,53,0.06)' } as React.CSSProperties) : undefined}
                          >
                            <span
                              className="h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0"
                              style={{ borderColor: active ? BRAND.green : '#cbd5e1' }}
                            >
                              {active && <span className="h-2 w-2 rounded-full" style={{ background: BRAND.green }} />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{tt.label}</p>
                              <p className="text-[10px] text-slate-500 truncate">{tt.hint}</p>
                            </div>
                            <span className="text-sm font-black text-slate-900 tabular-nums">{brl(price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Rodapé: total + ações */}
                <div className="border-t bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Valor do ingresso</p>
                    <p className="text-lg font-black text-slate-900 tabular-nums">{brl(pendingFinalPrice)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPendingSeat(null)}>Cancelar</Button>
                    <Button size="sm" className="text-white font-bold" style={{ background: BRAND.green }} onClick={confirmSeatSelection}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ CART DRAWER ============ */}
          {cartOpen && (
            <div className="fixed inset-0 z-[80] flex" onClick={() => setCartOpen(false)}>
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
