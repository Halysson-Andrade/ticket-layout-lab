import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  Flame,
  Zap,
  TrendingUp,
  Sparkles,
  Award,
  ExternalLink,
} from 'lucide-react';

import { MapPreviewSVG } from '@/components/MapStudio/MapPreviewSVG';
import { getMapContentExtent } from '@/lib/mapUtils';
import { Slider } from '@/components/ui/slider';
import type { Sector, VenueElement, TextElement, Seat, SeatType } from '@/types/mapStudio';
import { SEAT_COLORS, SEAT_TYPE_LABELS } from '@/types/mapStudio';
import mirageBannerAsset from '@/assets/mirage-banner.png.asset.json';

type Device = 'desktop' | 'mobile';
// Linha do carrinho: agregada por setor + tipo de ingresso (preços variam por tipo)
type CartItem = { id: string; sectorId: string; ticketType: string; ticketLabel: string; name: string; price: number; qty: number; color: string };
// Etapas do fluxo de compra dentro da moldura de preview
type FlowStep = 'detalhe' | 'ingressos' | 'resumo';

// Termos exibidos no resumo do pedido. No sistema real, ticketeira e produtor são configuráveis.
type TermSection = { title: string; html: string };
const TERMS: {
  ticketeira: { label: string; url: string };
  produtor: { label: string; sections: TermSection[] };
} = {
  ticketeira: {
    label: 'Termos e Política da Ticketeira',
    url: 'https://www.guicheweb.com.br/termos-de-uso',
  },
  produtor: {
    label: 'Termos e Política do Produtor',
    sections: [
      { title: 'Política de meia-entrada', html: '<p>A meia-entrada é concedida conforme a <strong>Lei Federal 12.933/13</strong> e o Decreto 8.537/15, mediante comprovação de documento no local do evento.</p>' },
      { title: 'Cancelamento e reembolso', html: '<p>Solicitações de cancelamento podem ser feitas em até <strong>7 dias</strong> após a compra, respeitando a antecedência mínima de 48h do início do evento.</p>' },
      { title: 'Regras do evento', html: '<ul><li>Apresentação obrigatória do ingresso (impresso ou digital) com documento oficial com foto.</li><li>Não é permitida a troca de data/horário nem devolução de valores após a compra.</li></ul>' },
    ],
  },
};

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

// Modelo: Circo Mirage Circus Ribeirão Preto - SP - 11.JUL às 15h30
// Fonte: https://www.guicheweb.com.br/circo-mirage-circus-ribeirao-preto-sp-11jul-as-15h30_52987
const eventInfo = {
  title: 'Circo Mirage Circus Ribeirão Preto. SP - 11.JUL às 15h30',
  subtitle: 'Marcos Frota apresenta: Mirage Circus - Tour 2026',
  date: '11/07/2026',
  doors: '15:30h',
  venue: 'Circo Mirage Circus',
  city: 'RIBEIRÃO PRETO / SP',
  rating: 4.9,
  reviews: 3120,
  heroBanner: mirageBannerAsset.url,
  posterImage: 'https://s3.guicheweb.com.br/imagenseventos/01-06-2026_21-06-51.png',
  description: `Tour 2026: O gigante está de volta a Ribeirão Preto!

Inspirado nos shows dos cassinos de Las Vegas, Marcos Frota apresenta: "Mirage Circus", o circo que vai te impressionar com um espetáculo diferente de tudo o que você já viu!

São mais de 800 toneladas de equipamentos de última geração! Estrutura moderna com ar-condicionado, som e iluminação digital, e um gigante telão de LED que dá um toque especial ao show! O circo Mirage conta ainda com duas praças de alimentação com deliciosas opções.

Artistas nacionais e internacionais! Malabaristas, trapezistas, bailarinas, mágicos, palhaços e o impressionante globo da morte!

Sem dúvida um evento incrível e inesquecível para toda a família!

Informações Técnicas:
- Duração média do espetáculo: 1h45
- Ar-condicionado
- Praça de Alimentação
- Assentos com lugar marcado
- As portas são abertas cerca de 30 minutos antes do início do espetáculo`,
};

// Datas disponíveis para o evento (permite múltiplas sessões).
const eventDates: Array<{ id: string; weekday: string; day: string; month: string; time: string; label: string }> = [
  { id: 'd1', weekday: 'SEX', day: '10', month: 'JUL', time: '20:30', label: '10 Jul • Sex • 20:30' },
  { id: 'd2', weekday: 'SÁB', day: '11', month: 'JUL', time: '15:30', label: '11 Jul • Sáb • 15:30' },
  { id: 'd3', weekday: 'SÁB', day: '11', month: 'JUL', time: '20:30', label: '11 Jul • Sáb • 20:30' },
  { id: 'd4', weekday: 'DOM', day: '12', month: 'JUL', time: '16:00', label: '12 Jul • Dom • 16:00' },
  { id: 'd5', weekday: 'DOM', day: '12', month: 'JUL', time: '19:30', label: '12 Jul • Dom • 19:30' },
];

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
  { name: 'VIP PREMIUM', age: 'Livre', notes: ['A partir de R$ 150,00', 'Poltronas premium mais próximas ao picadeiro', 'Área com acessibilidade para cadeirantes'] },
  { name: 'VIP OURO', age: 'Livre', notes: ['A partir de R$ 105,00', 'Excelente visão frontal do palco', 'Poltronas numeradas VIP'] },
  { name: 'VIP PRATA', age: 'Livre', notes: ['A partir de R$ 90,00', 'Visão central privilegiada', 'Poltronas numeradas'] },
  { name: 'CENTRAL OURO', age: 'Livre', notes: ['A partir de R$ 80,00', 'Ótima visão central', 'Poltronas numeradas'] },
  { name: 'CENTRAL PRATA', age: 'Livre', notes: ['A partir de R$ 65,00', 'Visão central confortável', 'Poltronas numeradas'] },
  { name: 'LATERAL OURO', age: 'Livre', notes: ['A partir de R$ 30,00', 'Visão lateral com bom ângulo', 'Poltronas numeradas'] },
  { name: 'LATERAL PRATA', age: 'Livre', notes: ['A partir de R$ 25,00', 'Setor de entrada com ótimo preço', 'Poltronas numeradas'] },
  { name: 'CAMAROTE FAMÍLIA', age: 'Livre', notes: ['A partir de R$ 990,00', 'Até 5 pessoas por camarote', 'Experiência exclusiva em família'] },
  { name: 'SETOR CADEIRANTE', age: 'Livre', notes: ['A partir de R$ 50,00', 'Exclusivo para portador de cadeira de rodas', 'Inclui 1 acompanhante por espaço'] },
];

const faqs = [
  { q: 'Qual a duração do espetáculo?',
    a: 'A duração média é de 1h45. Alguns números/apresentações podem sofrer alterações sem prévio aviso.' },
  { q: 'A que horas as portas abrem?',
    a: 'As portas são abertas cerca de 30 minutos antes do início do espetáculo (por volta das 15:00h).' },
  { q: 'O circo é climatizado?',
    a: 'Sim, toda a estrutura é climatizada, com poltronas numeradas, som e iluminação digital, telão de LED e duas praças de alimentação.' },
  { q: 'Como funciona a meia-entrada?',
    a: 'Meia-entrada conforme Lei Federal 12.933/13 e Decreto 8.537/15: estudantes com CIE, PCD e acompanhante quando necessário, jovens de baixa renda inscritos no CadÚnico, idosos a partir de 60 anos, crianças de 2 a 12 anos, militares, professores e doadores de sangue, mediante comprovação. Crianças de colo até 2 anos não pagam ingresso.' },
  { q: 'Há acessibilidade para cadeirantes?',
    a: 'Sim. O circo dispõe de área no setor VIP Premium para acomodar cadeiras de rodas, com 1 assento por espaço para acompanhante.' },
  { q: 'Quais as formas de pagamento?',
    a: 'No site: Pix e Cartão de Crédito (parcelamento em até 3x sem juros). Na bilheteria física: Pix, Dinheiro, Cartão de Débito e Crédito em até 3x sem juros.' },
];

const rules = [
  'Apresentação obrigatória do ingresso impresso ou digital pelo App Guichê Web, junto com documento oficial com foto.',
  'Não é possível a troca de data/horário do ingresso ou devolução de valores após a compra. Confirme a data antes de finalizar.',
  'Meia-entrada apenas mediante comprovação no local, conforme legislação vigente.',
  'Crianças de colo menores de 2 anos não pagam ingresso. Crianças de 2 a 12 anos pagam meia mediante documento oficial com foto.',
  'Solicitações de cancelamento podem ser feitas em até 7 dias da compra, com no mínimo 48h de antecedência do evento.',
  'As promoções (Bônus, Preço Único, etc.) não são cumulativas e incidem sempre sobre o valor de "INTEIRA".',
];

const pointsOfSale = [
  { city: 'Ribeirão Preto/SP', name: 'Bilheteria Oficial do Circo Mirage', address: 'Local do evento — Ribeirão Preto/SP', phone: 'Ter a Sex 13h–21h · Sáb/Dom/Feriado 10h–20h' },
];

// Preços de referência do Circo Mirage (fallback quando o setor não tem preço definido)
// Baseado nos valores "a partir de" do site: 25, 30, 65, 80, 90, 105, 150, 990, 50
const MOCK_PRICES = [25, 30, 65, 80, 90, 105, 150, 990, 50];
const getSectorPrice = (s: Sector, idx: number): number => {
  const seatWithPrice = s.seats.find((x) => typeof x.price === 'number' && x.price! > 0);
  if (seatWithPrice?.price) return seatWithPrice.price;
  // Match by sector name if possible
  const name = (s.name || '').toLowerCase();
  if (name.includes('camarote')) return 990;
  if (name.includes('vip premium')) return 150;
  if (name.includes('vip ouro')) return 105;
  if (name.includes('vip prata')) return 90;
  if (name.includes('central ouro')) return 80;
  if (name.includes('central prata')) return 65;
  if (name.includes('lateral ouro')) return 30;
  if (name.includes('lateral prata')) return 25;
  if (name.includes('cadeirante')) return 50;
  return MOCK_PRICES[idx % MOCK_PRICES.length];
};

const EventPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);
  // Fluxo em etapas (substitui o popup de vendas): detalhe -> ingressos -> resumo
  const [flowStep, setFlowStep] = useState<FlowStep>('detalhe');
  const [cartPanelOpen, setCartPanelOpen] = useState(false); // carrinho expansível dentro da etapa 'ingressos'
  const [produtorTermOpen, setProdutorTermOpen] = useState(false); // modal de termos do produtor
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedDateId, setSelectedDateId] = useState<string>(eventDates[1]?.id ?? eventDates[0].id);
  // Régua de preço (teto de orçamento). null = sem filtro (usa o preço máximo do mapa).
  const [budget, setBudget] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Array<{ id: string; sectorId: string; row: string; number: string; price: number; sectorName: string; color: string; ticketType: string }>>([]);
  // Modal de escolha do ingresso ao clicar num assento
  const [pendingSeat, setPendingSeat] = useState<{ seat: Seat; sector: Sector } | null>(null);
  const [pendingTicketType, setPendingTicketType] = useState<string>('inteira');
  // Zoom/pan do mapa dentro do modal
  const [mapView, setMapView] = useState<{ scale: number; panX: number; panY: number }>({ scale: 1, panX: 0, panY: 0 });
  const [videoPlaying, setVideoPlaying] = useState(false);
  const mapWrapperRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const priceCardRef = React.useRef<HTMLDivElement>(null);
  const pricePlaceholderRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLElement>(null);
  const [isPriceSticky, setIsPriceSticky] = useState(false);
  const [priceLeft, setPriceLeft] = useState<number | null>(null);
  const [priceTop, setPriceTop] = useState<number | null>(null);

  // === Conversion boosters ===
  const [viewers, setViewers] = useState(() => 87 + Math.floor(Math.random() * 60));
  const [now, setNow] = useState(Date.now());
  // Deadline: data simulada do evento (09/Jul/2026 18:00 BRT)
  const deadline = useMemo(() => new Date('2026-07-09T18:00:00-03:00').getTime(), []);

  // Preço desktop: começa no fluxo normal e só gruda quando o placeholder atinge o topo
  useEffect(() => {
    const handle = () => {
      if (!pricePlaceholderRef.current || !priceCardRef.current) return;
      const headerH = 64; // h-16 desktop
      const margin = 32;
      const threshold = headerH + margin; // 96px
      const rect = pricePlaceholderRef.current.getBoundingClientRect();
      const sticky = rect.top <= threshold;
      setIsPriceSticky(sticky);
      // Sempre atualiza o "left" a partir do placeholder para manter o card na mesma coluna
      if (!sticky) setPriceLeft(rect.left);

      // Limita a descida para não ultrapassar o rodapé
      if (sticky && footerRef.current) {
        const cardHeight = priceCardRef.current.offsetHeight;
        const footerTop = footerRef.current.getBoundingClientRect().top;
        const maxTop = footerTop - cardHeight - margin;
        setPriceTop(maxTop < threshold ? maxTop : threshold);
      } else {
        setPriceTop(null);
      }
    };
    handle();
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle);
      window.removeEventListener('resize', handle);
    };
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


  // Scroll reveal: usa IntersectionObserver com detecção do container scrollável
  // (necessário porque a moldura de preview mobile tem seu próprio scroll interno).
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    let safety: number | undefined;

    const findScrollAncestor = (el: HTMLElement): HTMLElement | null => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const s = getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight) {
          return p;
        }
        p = p.parentElement;
      }
      return null;
    };

    // Aguarda o DOM refletir a troca de device antes de observar
    const raf = window.requestAnimationFrame(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('.gw-reveal'));
      if (!els.length) return;

      // Reset: garante que a animação toque novamente ao trocar device
      els.forEach((el) => el.classList.remove('is-visible'));

      const root = findScrollAncestor(els[0]);
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io?.unobserve(entry.target);
            }
          });
        },
        { root, threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );
      els.forEach((el) => io!.observe(el));

      safety = window.setTimeout(() => {
        document.querySelectorAll<HTMLElement>('.gw-reveal:not(.is-visible)').forEach((el) => el.classList.add('is-visible'));
      }, 2500);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      io?.disconnect();
      if (safety) window.clearTimeout(safety);
    };
  }, [snapshot, device, flowStep]);

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

  // Teto efetivo do orçamento: enquanto o usuário não mexe na régua, vale o preço máximo (nada esmaecido).
  const effectiveBudget = budget ?? maxPrice;
  // Setores acima do orçamento → esmaecidos (apenas visual; continuam clicáveis).
  const dimmedSectorIds = useMemo(
    () => sectorsForSale.filter((s) => s.price > effectiveBudget).map((s) => s.id),
    [sectorsForSale, effectiveBudget],
  );
  const dimmedSet = useMemo(() => new Set(dimmedSectorIds), [dimmedSectorIds]);
  const withinBudgetCount = sectorsForSale.length - dimmedSectorIds.length;

  // Tipos de assento presentes no mapa (para montar a legenda dinâmica).
  const presentSeatTypes = useMemo(() => {
    const set = new Set<SeatType>();
    (snapshot?.sectors ?? []).forEach((s) => s.seats.forEach((seat) => seat.type && set.add(seat.type)));
    return set;
  }, [snapshot]);
  // Tipos especiais (excl. normal/blocked) que aparecem na legenda com cor de tipo.
  const specialLegendTypes = (['pcd', 'companion', 'obeso', 'vip'] as SeatType[]).filter((t) => presentSeatTypes.has(t));
  const hasBlockedSeats = presentSeatTypes.has('blocked');

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
    if (flowStep !== 'ingressos' || !selectedSectorId || !salesFocusBounds || !wholeMapBounds) {
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
  }, [selectedSectorId, flowStep, salesFocusBounds, wholeMapBounds]);

  // Fecha o modal de escolha de ingresso ao sair da etapa de ingressos
  useEffect(() => {
    if (flowStep !== 'ingressos') setPendingSeat(null);
  }, [flowStep]);

  // Lock body scroll apenas quando um overlay verdadeiro está aberto (as etapas são páginas roláveis)
  useEffect(() => {
    const overlayOpen = !!pendingSeat || produtorTermOpen || (device === 'mobile' && cartPanelOpen);
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [pendingSeat, produtorTermOpen, cartPanelOpen, device]);

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

  // Clique no assento: se já selecionado, remove (e decrementa o carrinho);
  // senão abre o modal para escolher o tipo de ingresso e ver a perspectiva.
  const onSeatClicked = (seat: Seat, sector: Sector) => {
    const existing = selectedSeats.find((s) => s.id === seat.id);
    if (existing) {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      updateQty(cartLineId(sector.id, existing.ticketType), -1);
      return;
    }
    setPendingTicketType('inteira');
    setPendingSeat({ seat, sector });
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
    const price = Math.round(pendingBasePrice * tt.factor);
    setSelectedSeats((prev) => [
      ...prev,
      {
        id: seat.id,
        sectorId: sector.id,
        row: seat.row,
        number: seat.number,
        price,
        sectorName: sector.name,
        color: sector.color,
        ticketType: tt.id,
      },
    ]);
    addToCart({ sectorId: sector.id, name: sector.name, color: sector.color, ticketType: tt.id, ticketLabel: tt.label, price });
    toast.success(`Assento ${seat.row}${seat.number} adicionado`, { description: `${sector.name} · ${tt.label}` });
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

  // id estável da linha do carrinho (setor + tipo de ingresso)
  const cartLineId = (sectorId: string, ticketType: string) => `${sectorId}::${ticketType}`;
  const addToCart = (it: { sectorId: string; name: string; color: string; ticketType: string; ticketLabel: string; price: number }) => {
    const id = cartLineId(it.sectorId, it.ticketType);
    setCart((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id, sectorId: it.sectorId, ticketType: it.ticketType, ticketLabel: it.ticketLabel, name: it.name, price: it.price, qty: 1, color: it.color }];
    });
  };
  const updateQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0),
    );
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const cartCount = cart.reduce((a, b) => a + b.qty, 0);
  const subtotal = cart.reduce((a, b) => a + b.qty * b.price, 0);
  const fee = subtotal * 0.1;
  const total = subtotal + fee;

  // CTA dinâmico baseado em contexto (declarado depois de cartCount)
  const dynamicCta = useMemo(() => {
    if (cartCount > 0) return { label: 'Finalizar compra', micro: 'Garanta antes que esgote' };
    if (countdown.d <= 2) return { label: 'Garantir meu ingresso', micro: 'Últimas horas · evento se aproxima' };
    if (sectorsForSale.some((s) => s.available <= 20)) return { label: 'Últimos ingressos', micro: 'Setores quase esgotados' };
    // "Lote sobe em X dias" removido a pedido do cliente
    return { label: 'Comprar ingresso', micro: 'Compra 100% segura' };
  }, [sectorsForSale, countdown.d, cartCount]);

  const isMobile = device === 'mobile';
  // Nas etapas de compra a moldura tem altura fixa (só a lista interna rola); em 'detalhe' a página rola normalmente
  const inFlowStep = flowStep !== 'detalhe';

  // Itens do carrinho — reutilizado no painel expansível da etapa 'ingressos' e no 'resumo'
  const renderCartItems = () => (
    cart.length === 0 ? (
      <div className="text-center py-10 text-slate-500">
        <ShoppingCart className="h-12 w-12 mx-auto opacity-30 mb-3" />
        <p className="text-sm">Seu carrinho está vazio.</p>
        <p className="text-xs mt-1">Escolha um setor no mapa para adicionar ingressos.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {cart.map((i) => (
          <div key={i.id} className="flex gap-3 border border-slate-200 rounded-lg p-3">
            <div className="h-12 w-12 rounded-md flex items-center justify-center text-white font-bold shrink-0" style={{ background: i.color }}>
              {i.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{i.name}</p>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">{i.ticketLabel}</span> · {brl(i.price)} cada
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => updateQty(i.id, -1)} className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus className="h-3 w-3" /></button>
                <span className="text-sm font-medium w-6 text-center">{i.qty}</span>
                <button onClick={() => updateQty(i.id, 1)} className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus className="h-3 w-3" /></button>
                <button onClick={() => removeFromCart(i.id)} className="ml-auto text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-900 whitespace-nowrap">{brl(i.qty * i.price)}</p>
          </div>
        ))}
      </div>
    )
  );

  // Bloco de totais (subtotal / taxa / total)
  const renderCartTotals = () => (
    <div className="space-y-3">
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
    </div>
  );

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
    { label: 'Carrinho', icon: ShoppingCart, active: false, onClick: () => { setMobileMenuOpen(false); setFlowStep('ingressos'); setCartPanelOpen(true); } },
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
        .gw-reveal { opacity: 0; transform: translateY(28px); transition: opacity .8s cubic-bezier(.22,.61,.36,1), transform .8s cubic-bezier(.22,.61,.36,1); will-change: opacity, transform; }
        .gw-reveal.is-visible { opacity: 1; transform: translateY(0); }
        .gw-reveal-delay-1 { transition-delay: .10s; }
        .gw-reveal-delay-2 { transition-delay: .20s; }
        .gw-reveal-delay-3 { transition-delay: .30s; }
        .gw-reveal-delay-4 { transition-delay: .40s; }
        @media (prefers-reduced-motion: reduce) { .gw-reveal { opacity: 1; transform: none; transition: none; } }
        @keyframes gw-step-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .gw-step { animation: gw-step-in .35s cubic-bezier(.22,.61,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .gw-step { animation: none } }
        .gw-hide-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .gw-hide-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
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
      {/* Barra flutuante (voltar ao mapa + toggle device) — só no detalhe; nas etapas o device definido no evento é mantido */}
      {!inFlowStep && (
      <div className="fixed top-20 left-3 z-[100] flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
        <button
          onClick={() => navigate(-1)}
          className="h-7 px-2.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-white text-[11px] font-medium flex items-center gap-1"
          title="Voltar ao mapa"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Voltar</span>
        </button>
        <div className="flex items-center bg-white/90 backdrop-blur rounded-full p-0.5 shadow-sm border border-slate-200">
          <button
            onClick={() => setDevice('desktop')}
            title="Desktop"
            className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center transition-colors',
              device === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            )}
          ><Monitor className="h-3 w-3" /></button>
          <button
            onClick={() => setDevice('mobile')}
            title="Mobile"
            className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center transition-colors',
              device === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            )}
          ><Smartphone className="h-3 w-3" /></button>
        </div>
      </div>
      )}

      {/* Container da preview (simula viewport) */}
      <div className={cn('flex-1 flex justify-center', isMobile && 'py-6 px-4')}>
        <div
          className={cn(
            'bg-white transition-all duration-300 relative flex flex-col',
            isMobile
              ? 'w-[390px] shadow-2xl rounded-xl overflow-hidden'
              : cn('w-full', inFlowStep ? 'h-screen overflow-hidden' : 'min-h-screen'),
          )}
          // Em mobile: coluna flex com altura limitada à viewport (nada é cortado); o scroll acontece
          // no container interno (sem barra de rolagem visível) e a barra de compra fica pinada por flex.
          // translateZ(0) mantém os modais `fixed` contidos dentro da moldura do celular.
          style={isMobile ? { transform: 'translateZ(0)', height: '844px', maxHeight: 'calc(100dvh - 3rem)' } : undefined}
        >
          {/* ============ HEADER ============ */}
          <header className={cn(
            'z-50 text-white border-b border-white/10',
            inFlowStep
              ? 'sticky top-0 bg-gradient-to-b from-black/90 to-black/70'
              : 'fixed top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/60 to-black/30 backdrop-blur-sm'
          )}>

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
                  <div className="flex items-center gap-2 pl-3 border-l border-white/20">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-white/80" />
                    </div>
                    <button className="text-sm font-medium hover:underline">Entrar</button>
                  </div>
                </nav>
              )}


              {/* Mobile: hambúrguer */}
              {isMobile && (
                <div className="flex items-center gap-2">
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

                {/* Ícones busca */}
                <div className="flex border-b border-slate-200">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-slate-700 hover:bg-slate-50">
                    <Search className="h-4 w-4" /> Buscar
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
                  <button className="w-full text-sm font-medium text-slate-600 hover:text-slate-900">
                    Entrar ou cadastrar
                  </button>
                </div>
              </aside>
            </>
          )}


          {/* ============ ETAPA: DETALHE DO EVENTO ============ */}
          {flowStep === 'detalhe' && (
          <>
          {/* Container rolável: no mobile rola por dentro (sem scrollbar); no desktop rola a janela */}
          <div className={cn(isMobile ? 'flex-1 min-h-0 overflow-y-auto gw-hide-scroll flex flex-col' : 'flex-1 flex flex-col')}>
          {/* ============ MAIN ============ */}
          <main className="flex-1 flex flex-col">
                        {/* HERO — banner da frente emergindo da mesma imagem expandida/desfocada no fundo */}
            <section className="relative overflow-hidden">
              {/* Fundo: mesma imagem expandida e desfocada, mais visível */}
              <div
                aria-hidden
                className="absolute inset-0 bg-center bg-cover scale-110"
                style={{
                  backgroundImage: `url(${eventInfo.heroBanner})`,
                  filter: 'blur(28px) brightness(0.75) saturate(1.1)',
                }}
              />
              <div aria-hidden className="absolute inset-0 bg-black/30" />

              <div className={cn('relative w-full', isMobile ? 'pt-14' : 'pt-16')}>
                <div className={cn(
                  'relative overflow-hidden group w-full',
                  isMobile ? 'aspect-[16/9] bg-transparent' : 'aspect-[1920/560] bg-transparent'
                )}>
                  <img
                    src={eventInfo.heroBanner}
                    alt={eventInfo.title}
                    className="w-full h-full object-contain object-center transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
                    loading="eager"
                  />
                </div>
              </div>
            </section>

            {/* Abas de navegação — sticky abaixo do header */}
            <nav
              className={cn(
                'sticky z-40 bg-white/95 backdrop-blur border-b border-slate-200',
                isMobile ? 'top-14' : 'top-16',
              )}
            >
              <div
                className={cn(
                  'mx-auto flex items-center gap-1 overflow-x-auto gw-hide-scroll',
                  isMobile ? 'px-2' : 'px-8 max-w-6xl',
                )}
              >
                {[
                  { id: 'tab-mapa', label: 'Mapa' },
                  { id: 'tab-informacoes', label: 'Informações' },
                  { id: 'tab-pontos', label: 'Pontos de venda' },
                  { id: 'tab-localizacao', label: 'Localização' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(t.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300 whitespace-nowrap transition"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Info do evento + card de preço */}
            <section className={cn('container mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-6xl')}>
              <div className={cn('grid gap-8 items-start', !isMobile && 'lg:grid-cols-[1fr_340px]')}>
                <div>
                  <h1 className={cn(
                    'gw-display text-slate-900 leading-[1.15] gw-rise break-words tracking-tight gw-reveal gw-reveal-delay-2',
                    isMobile ? 'text-[1.25rem]' : 'text-[1.5rem] lg:text-[1.875rem]'
                  )}>
                    Circo Mirage Circus Ribeirão Preto. SP - 11.JUL às 15h30
                  </h1>

                  {/* Meta cards */}
                  <div className={cn('mt-6 grid gap-3 gw-reveal gw-reveal-delay-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
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

                  <div className="mt-5 flex items-center gap-2 flex-wrap gw-reveal gw-reveal-delay-4">
                    <button className="h-10 px-4 rounded-full border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition">
                      <Heart className="h-4 w-4" /> Favoritar
                    </button>
                    <button className="h-10 px-4 rounded-full border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition">
                      <Share2 className="h-4 w-4" /> Compartilhar
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-1" />

                    <div className="flex items-center gap-2 flex-nowrap">
                      {[
                        { name: 'Instagram', href: 'https://instagram.com/miragecircus', color: '#E1306C', Icon: Instagram },
                        { name: 'Facebook', href: 'https://facebook.com/miragecircus', color: '#1877F2', Icon: Facebook },
                        { name: 'YouTube', href: 'https://youtube.com/@miragecircus', color: '#FF0000', Icon: Youtube },
                        { name: 'X (Twitter)', href: 'https://x.com/miragecircus', color: '#000000', Icon: null as unknown as typeof Instagram },
                        { name: 'Spotify', href: 'https://open.spotify.com/', color: '#1DB954', Icon: null as unknown as typeof Instagram },
                        { name: 'TikTok', href: 'https://tiktok.com/@miragecircus', color: '#010101', Icon: null as unknown as typeof Instagram },
                      ].map((s) => (
                        <a
                          key={s.name}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={s.name}
                          aria-label={s.name}
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-white transition-all hover:scale-110"
                          style={{ ['--hover-bg' as string]: s.color }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = s.color; e.currentTarget.style.borderColor = s.color; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = ''; }}
                        >
                          {s.name === 'X (Twitter)' ? (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          ) : s.name === 'Spotify' ? (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                          ) : s.name === 'TikTok' ? (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.94a8.16 8.16 0 0 0 4.77 1.52V7.05a4.85 4.85 0 0 1-1.84-.36z"/></svg>
                          ) : s.Icon ? (
                            <s.Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          ) : null}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Card de preço inline no mobile */}
                  {isMobile && (
                    <div className="relative mt-6 gw-rise gw-rise-delay-2">
                      <div className="pointer-events-none absolute -inset-[1px] rounded-[20px] opacity-60 blur-xl"
                        style={{ background: `linear-gradient(140deg, ${BRAND.green}55, ${BRAND.cyan}33, ${BRAND.magenta}33)` }} />
                      <div className="relative rounded-2xl p-6 border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">A partir de</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className="text-4xl font-black text-slate-900 leading-none tracking-tight">{minPrice ? brl(minPrice) : '—'}</p>
                        </div>
                        <Button
                          className="gw-cta-glow w-full font-bold h-12 text-white mt-4 rounded-xl border-0"
                          style={{ background: `linear-gradient(120deg, ${BRAND.green}, #0fb02e)` }}
                          onClick={() => setFlowStep('ingressos')}
                        >
                          <Ticket className="h-4 w-4 mr-2" />
                          Ingressos
                        </Button>
                        <p className="text-[11px] text-center text-slate-500 mt-1.5 flex items-center justify-center gap-1">
                          <ShieldCheck className="h-3 w-3" style={{ color: BRAND.green }} />
                          Compra 100% segura
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card de preço desktop: placeholder mantém o espaço; card gruda quando chega ao topo */}
                {!isMobile && (
                  <div
                    ref={pricePlaceholderRef}
                    className="relative hidden lg:block"
                    style={{ minHeight: isPriceSticky ? priceCardRef.current?.offsetHeight : undefined }}
                  >
                    <div
                      ref={priceCardRef}
                      data-price-card
                      className={cn(
                        'w-[340px] z-30',
                        isPriceSticky ? 'fixed' : 'relative top-0'
                      )}
                      style={isPriceSticky && priceLeft != null ? { left: priceLeft, top: priceTop ?? 96 } : undefined}
                    >
                      <div className="pointer-events-none absolute -inset-[1px] rounded-[20px] opacity-60 blur-xl"
                        style={{ background: `linear-gradient(140deg, ${BRAND.green}55, ${BRAND.cyan}33, ${BRAND.magenta}33)` }} />
                      <div className="relative rounded-2xl p-6 border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">A partir de</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className="text-4xl font-black text-slate-900 leading-none tracking-tight">{minPrice ? brl(minPrice) : '—'}</p>
                        </div>
                        <Button
                          className="gw-cta-glow w-full font-bold h-12 text-white mt-4 rounded-xl border-0"
                          style={{ background: `linear-gradient(120deg, ${BRAND.green}, #0fb02e)` }}
                          onClick={() => setFlowStep('ingressos')}
                        >
                          <Ticket className="h-4 w-4 mr-2" />
                          Ingressos
                        </Button>
                        <p className="text-[11px] text-center text-slate-500 mt-1.5 flex items-center justify-center gap-1">
                          <ShieldCheck className="h-3 w-3" style={{ color: BRAND.green }} />
                          Compra 100% segura
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>


            {/* Mapa do evento — imagem estática + CTA para abrir seleção */}
            <section id="tab-mapa" className="bg-slate-50 gw-reveal scroll-mt-24">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-6xl lg:pr-[372px]')}>
                <div className="text-center mb-6">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND.green }}>Mapa do evento</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Veja abaixo a distribuição dos setores. Clique em "Comprar ingresso" para escolher setor, fila e assento.
                  </p>
                </div>

                <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className={cn('relative bg-slate-100', isMobile ? 'aspect-[4/3]' : 'aspect-[16/9]')}>
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
                    {/* No desktop, preço + CTA sobrepõem o mapa; no mobile ficam numa barra abaixo (não cobrem o mapa) */}
                    {!isMobile && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-row items-center justify-between gap-3">
                          <div className="text-left text-white">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-white/80">Ingressos disponíveis</p>
                            <p className="text-lg font-black">
                              A partir de <span style={{ color: BRAND.green }}>{brl(minPrice)}</span>
                            </p>
                          </div>
                          <Button
                            size="lg"
                            className="text-white font-bold shadow-lg"
                            style={{ background: BRAND.green }}
                            onClick={() => setFlowStep('ingressos')}
                            disabled={sectorsForSale.length === 0}
                          >
                            <Ticket className="h-4 w-4 mr-2" />
                            {sectorsForSale.length === 0 ? 'Mapa indisponível' : 'Comprar ingresso'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  {isMobile && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Ingressos disponíveis</p>
                        <p className="text-base font-black text-slate-900">
                          A partir de <span style={{ color: BRAND.green }}>{brl(minPrice)}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="text-white font-bold shrink-0"
                        style={{ background: BRAND.green }}
                        onClick={() => setFlowStep('ingressos')}
                        disabled={sectorsForSale.length === 0}
                      >
                        <Ticket className="h-4 w-4 mr-1.5" />
                        {sectorsForSale.length === 0 ? 'Indisponível' : 'Comprar'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Setores agora aparecem apenas no modal "Comprar ingresso" (carrinho) */}

              </div>
            </section>

            {/* Vídeo do evento */}
            <section className="bg-white gw-reveal">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl lg:pr-[372px]')}>
                <div className="text-center mb-6">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND.green }}>Assista</p>
                  <h3 className={cn('gw-display-md text-slate-900', isMobile ? 'text-2xl' : 'text-3xl')}>Veja o espetáculo em ação</h3>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-black aspect-video">
                  {videoPlaying ? (
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src="https://www.youtube.com/embed/ZueIOvWJQdM?autoplay=1&rel=0"
                      title="Mirage Circus"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVideoPlaying(true)}
                      className="absolute inset-0 w-full h-full group"
                      aria-label="Reproduzir vídeo"
                    >
                      <img
                        src="https://img.youtube.com/vi/ZueIOvWJQdM/maxresdefault.jpg"
                        alt="Mirage Circus - vídeo"
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://img.youtube.com/vi/ZueIOvWJQdM/hqdefault.jpg'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20 group-hover:from-black/70 transition" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110" style={{ background: '#FF0000' }}>
                          <svg viewBox="0 0 24 24" className="h-9 w-9 ml-1" fill="#fff" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                        </span>
                      </span>
                      <span className="absolute bottom-4 left-4 right-4 text-left text-white">
                        <span className="block text-xs font-bold tracking-widest uppercase opacity-80">Trailer oficial</span>
                        <span className="block text-lg font-black mt-0.5">Circo Mirage Circus</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </section>


            {/* Info + Regras */}
            <section id="tab-informacoes" className={cn('mx-auto gw-reveal scroll-mt-24', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl lg:pr-[372px]')}>
              <div className="grid gap-8 grid-cols-1">
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
            <section id="tab-pontos" className="bg-slate-50 scroll-mt-24">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl lg:pr-[372px]')}>
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

            {/* Localização */}
            <section id="tab-localizacao" className="bg-white scroll-mt-24">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl lg:pr-[372px]')}>
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2" style={{ color: BRAND.green }}>
                  <MapPin className="h-5 w-5" /> Localização
                </h3>
                <p className="text-sm text-slate-600 mb-4">Ribeirão Preto · SP</p>
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <iframe
                    title="Localização do evento"
                    src="https://www.google.com/maps?q=Ribeir%C3%A3o+Preto+SP&output=embed"
                    className={cn('w-full border-0', isMobile ? 'h-64' : 'h-96')}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </section>

            {/* Você também pode gostar */}
            <section className="bg-white">
              <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-6xl lg:pr-[372px]')}>
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
          <footer ref={footerRef} className="bg-black text-[#B3B3B3]">
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

          {/* ============ Mobile bottom bar — pinada no rodapé por flex (sempre visível) ============ */}
          {isMobile && (
            <div className="shrink-0 bg-white border-t border-slate-200/60">
              <div className="m-3 rounded-2xl bg-white border border-slate-200/80 p-2 flex items-center gap-2.5">
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
                  onClick={() => setFlowStep('ingressos')}
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

          {/* ============ Desktop floating CTA bar — aparece apenas quando há itens no carrinho ============ */}
          {!isMobile && cartCount > 0 && (
            <div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ease-out translate-y-0 opacity-100"
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
                      onClick={() => { setFlowStep('ingressos'); setCartPanelOpen(true); }}
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
                    onClick={() => setFlowStep('ingressos')}
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




          {/* ============ WhatsApp FAB ============ */}
          {(
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








          </div>
          </>
          )}

          {/* ============ ETAPA: SELEÇÃO DE INGRESSOS ============ */}
          {flowStep === 'ingressos' && (
              <section key="ingressos" className="gw-step flex-1 flex flex-col min-h-0 bg-white relative overflow-hidden">
                <div className="border-b bg-slate-50">
                  <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-slate-600 hover:text-slate-900 shrink-0" onClick={() => setFlowStep('detalhe')}>
                      <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar</span>
                    </Button>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: BRAND.green }}>Escolha seu lugar</p>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{eventInfo.title}</h4>
                    </div>
                  </div>
                  {/* Stepper de progresso (oculto no mobile para dar mais espaço ao mapa) */}
                  <div className={cn('px-4 sm:px-6 pb-3 items-center gap-2 text-[11px] font-semibold', isMobile ? 'hidden' : 'flex')}>
                    {[
                      { n: 1, label: 'Setor', done: !!selectedSectorId || cartCount > 0 },
                      { n: 2, label: 'Quantidade', done: cartCount > 0 },
                      { n: 3, label: 'Resumo', done: false },
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


                {/* Barra de controles acima dos setores: régua de preço + legenda de tipos de assento */}
                {(maxPrice > minPrice || specialLegendTypes.length > 0) && (
                  <div className="border-b bg-white px-4 sm:px-6 py-2.5 shrink-0 flex flex-col gap-2.5">
                    {/* Régua de preço (teto de orçamento) */}
                    {maxPrice > minPrice && (
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 leading-none">Orçamento até</p>
                          <p className="text-sm font-black text-slate-900 leading-tight mt-0.5">{brl(effectiveBudget)}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Slider
                            min={minPrice}
                            max={maxPrice}
                            step={5}
                            value={[effectiveBudget]}
                            onValueChange={([v]) => setBudget(v)}
                            aria-label="Orçamento máximo por ingresso"
                          />
                          <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                            <span>{brl(minPrice)}</span>
                            <span>{brl(maxPrice)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-semibold text-slate-600 leading-tight">
                            <span style={{ color: BRAND.green }}>{withinBudgetCount}</span> de {sectorsForSale.length} setores
                          </p>
                          {budget !== null && (
                            <button
                              onClick={() => setBudget(null)}
                              className="text-[10px] font-bold uppercase tracking-wider hover:underline"
                              style={{ color: BRAND.green }}
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Legenda de tipos de assento */}
                    {specialLegendTypes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
                        <span className="uppercase tracking-wider font-bold text-slate-400">Legenda</span>
                        {specialLegendTypes.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border border-black/10 shrink-0" style={{ background: SEAT_COLORS[t] }} />
                            {SEAT_TYPE_LABELS[t]}
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full border border-slate-300 bg-white shrink-0" />
                          Disponível
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ background: BRAND.green }} />
                          Selecionado
                        </span>
                        {hasBlockedSeats && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full bg-slate-400 shrink-0" />
                            Indisponível
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={cn('flex-1 grid overflow-hidden min-h-0', isMobile ? 'grid-cols-1 grid-rows-[minmax(0,48%)_minmax(0,52%)]' : 'grid-cols-[1.4fr_1fr]')}>
                  <div
                    ref={mapWrapperRef}
                    className="relative bg-slate-50 border-r border-b sm:border-b-0 border-slate-200 overflow-hidden select-none min-h-0"
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
                          dimmedSectorIds={dimmedSectorIds}
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
                    {/* Instrução flutuante (oculta no mobile para não poluir o mapa) */}
                    <div className={cn('absolute top-3 right-3 bg-white/90 backdrop-blur text-[10px] uppercase tracking-wider text-slate-600 font-bold rounded-full px-3 py-1 shadow z-10', isMobile && 'hidden')}>
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


                  <div className={cn('bg-white min-h-0 overflow-y-auto', isMobile && 'gw-hide-scroll')}>
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-slate-500 mb-1">
                        {selectedSectorId
                          ? 'Clique nos assentos do mapa para adicioná-los ao carrinho.'
                          : 'Clique em um setor — no mapa ou na lista — para dar zoom e escolher os assentos.'}
                      </p>

                      {sectorsForSale.map((s) => {
                        const isActive = (selectedSectorId || hoveredSectorId) === s.id;
                        const inCart = cart.find((i) => i.sectorId === s.id && i.ticketType === 'inteira');
                        const isBest = s.id === bestValueSectorId;
                        // Fora do orçamento: esmaece a linha (mesmo sinal visual do mapa). Continua clicável.
                        const isDimmed = dimmedSet.has(s.id) && !isActive;
                        return (
                          <div
                            key={s.id}
                            onMouseEnter={() => setHoveredSectorId(s.id)}
                            onMouseLeave={() => setHoveredSectorId(null)}
                            onClick={() => setSelectedSectorId(s.id)}
                            className={cn(
                              'relative flex flex-wrap items-center gap-x-3 gap-y-2 border rounded-xl p-3 cursor-pointer transition',
                              isActive ? 'shadow-md' : 'border-slate-200 hover:border-slate-300',
                              isBest && !isActive && 'border-transparent',
                              isDimmed && 'opacity-50 grayscale',
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
                            <div className="flex-1 min-w-0 basis-[140px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                                {s.available > 0 && s.available <= 20 && (
                                  <span className="text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wider flex items-center gap-0.5 shrink-0" style={{ background: `${BRAND.yellow}33`, color: '#7a5b00' }}>
                                    <Flame className="h-2.5 w-2.5" /> Últimas
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">{s.available} disponíveis · 10x de {brl(s.price / 10)}</p>
                            </div>
                            <div className="text-right shrink-0 ml-auto">
                              <p className="text-[10px] text-slate-400 leading-none">a partir de</p>
                              <p className="text-sm font-bold leading-tight mt-0.5" style={{ color: BRAND.green }}>{brl(s.price)}</p>
                            </div>
                            {inCart ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateQty(cartLineId(s.id, 'inteira'), -1); }}
                                  className="h-8 w-8 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                                ><Minus className="h-3 w-3" /></button>
                                <span className="text-sm font-semibold w-5 text-center">{inCart.qty}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); addToCart({ sectorId: s.id, name: s.name, color: s.color, ticketType: 'inteira', ticketLabel: 'Inteira', price: s.price }); }}
                                  className="h-8 w-8 rounded text-white flex items-center justify-center"
                                  style={{ background: BRAND.green }}
                                ><Plus className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="text-white h-9 w-9 p-0 rounded-full shrink-0"
                                style={{ background: BRAND.green }}
                                onClick={(e) => { e.stopPropagation(); addToCart({ sectorId: s.id, name: s.name, color: s.color, ticketType: 'inteira', ticketLabel: 'Inteira', price: s.price }); }}
                                aria-label="Adicionar ao carrinho"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Rodapé persistente: resumo + ações */}
                <div className="border-t bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <p className="text-[10px] text-slate-500">{cartCount} {cartCount === 1 ? 'ingresso' : 'ingressos'}</p>
                    <p className="text-base font-black text-slate-900">{brl(total)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="relative font-semibold"
                      onClick={() => setCartPanelOpen((v) => !v)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" /> Ver carrinho
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center text-white shadow" style={{ background: BRAND.green }}>
                          {cartCount}
                        </span>
                      )}
                    </Button>
                    <Button
                      className="font-bold text-white"
                      style={{ background: BRAND.green }}
                      disabled={cartCount === 0}
                      onClick={() => setFlowStep('resumo')}
                    >
                      Finalizar <ChevronDown className="h-4 w-4 ml-1 -rotate-90" />
                    </Button>
                  </div>
                </div>

                {/* Carrinho expansível — slide-over (desktop) / bottom-sheet (mobile), contido na moldura */}
                {cartPanelOpen && (
                  <>
                    <div className="absolute inset-0 z-20 bg-black/40" onClick={() => setCartPanelOpen(false)} />
                    <div
                      className={cn(
                        'absolute z-30 bg-white flex flex-col shadow-2xl',
                        isMobile
                          ? 'left-0 right-0 bottom-0 max-h-[80%] rounded-t-2xl animate-in slide-in-from-bottom duration-300'
                          : 'top-0 bottom-0 right-0 w-[380px] animate-in slide-in-from-right duration-300',
                      )}
                    >
                      <div className="flex items-center justify-between p-4 border-b shrink-0">
                        <div>
                          <h4 className="font-bold text-slate-900">Seu carrinho</h4>
                          <p className="text-xs text-slate-500">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCartPanelOpen(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className={cn('flex-1 p-4 overflow-y-auto', isMobile && 'gw-hide-scroll')}>
                        {renderCartItems()}
                      </div>
                      {cart.length > 0 && (
                        <div className="border-t p-4 space-y-3 bg-slate-50 shrink-0">
                          {renderCartTotals()}
                          <Button
                            className="w-full font-bold h-11 text-white"
                            style={{ background: BRAND.green }}
                            onClick={() => { setCartPanelOpen(false); setFlowStep('resumo'); }}
                          >
                            Finalizar compra
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
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
                        const fb = el.parentElement?.querySelector('[data-fallback]');
                        fb?.classList.remove('hidden');
                        fb?.classList.add('flex');
                      }}
                    />
                  ) : null}
                  <div
                    data-fallback
                    className={cn(
                      'w-full h-44 flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400',
                      pendingSeat.seat.viewImageUrl ? 'hidden' : 'flex',
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

          {/* ============ ETAPA: RESUMO DO PEDIDO ============ */}
          {flowStep === 'resumo' && (
            <section key="resumo" className="gw-step flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
              {/* Cabeçalho */}
              <div className="border-b bg-white px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-slate-600 hover:text-slate-900 shrink-0" onClick={() => setFlowStep('ingressos')}>
                  <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar</span>
                </Button>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: BRAND.green }}>Resumo do pedido</p>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{eventInfo.title}</h4>
                </div>
              </div>

              <div className={cn('flex-1 min-h-0 overflow-y-auto', isMobile && 'gw-hide-scroll')}>
                <div className="mx-auto w-full max-w-2xl p-3 sm:p-6 space-y-3 sm:space-y-5">
                  {cartCount === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                      <ShoppingCart className="h-14 w-14 mx-auto opacity-30 mb-3" />
                      <p className="text-sm font-medium">Seu carrinho está vazio.</p>
                      <Button variant="outline" className="mt-4" onClick={() => setFlowStep('ingressos')}>
                        Voltar para ingressos
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Itens */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">Ingressos</p>
                        {renderCartItems()}
                      </div>

                      {/* Termos */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-2.5">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Termos e políticas</p>
                        <a
                          href={TERMS.ticketeira.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          <span className="flex items-center gap-2 min-w-0"><ShieldCheck className="h-4 w-4 shrink-0" style={{ color: BRAND.green }} /> <span className="truncate">{TERMS.ticketeira.label}</span></span>
                          <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                        </a>
                        <button
                          onClick={() => setProdutorTermOpen(true)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          <span className="flex items-center gap-2 min-w-0"><Info className="h-4 w-4 shrink-0" style={{ color: BRAND.green }} /> <span className="truncate">{TERMS.produtor.label}</span></span>
                          <ChevronDown className="h-4 w-4 text-slate-400 -rotate-90 shrink-0" />
                        </button>
                        <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                          Ao clicar em <span className="font-semibold text-slate-700">Finalizar compra</span>, você concorda com os termos acima.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Rodapé: finalizar */}
              {cartCount > 0 && (
                <div className="border-t bg-white px-4 sm:px-6 py-3 shrink-0">
                  <div className="mx-auto w-full max-w-2xl flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] text-slate-500">Total</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums">{brl(total)}</p>
                    </div>
                    <Button
                      className={cn('font-bold h-11 px-5 sm:px-6 text-white', isMobile ? 'flex-1' : '')}
                      style={{ background: BRAND.green }}
                      disabled={cartCount === 0}
                      onClick={() => {
                        toast.success('Compra realizada com sucesso!', { description: 'Simulação — nenhum pagamento foi processado.' });
                        setCart([]);
                        setSelectedSeats([]);
                        setFlowStep('detalhe');
                      }}
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" /> Finalizar compra
                    </Button>
                  </div>
                  <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1 mt-2">
                    <ShieldCheck className="h-3 w-3" style={{ color: BRAND.green }} /> Pagamento criptografado
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ============ MODAL: TERMOS DO PRODUTOR ============ */}
          {produtorTermOpen && (
            <div
              className="fixed inset-0 z-[130] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setProdutorTermOpen(false)}
            >
              <div
                className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                  <h4 className="font-bold text-slate-900 text-sm">{TERMS.produtor.label}</h4>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setProdutorTermOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className={cn('flex-1 p-4 overflow-y-auto', isMobile && 'gw-hide-scroll')}>
                  <Accordion type="single" collapsible className="w-full">
                    {TERMS.produtor.sections.map((sec, i) => (
                      <AccordionItem key={i} value={`term-${i}`}>
                        <AccordionTrigger className="text-sm font-semibold text-slate-800 text-left">{sec.title}</AccordionTrigger>
                        <AccordionContent>
                          <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: sec.html }} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
                <div className="border-t p-4 shrink-0">
                  <Button className="w-full font-bold text-white" style={{ background: BRAND.green }} onClick={() => setProdutorTermOpen(false)}>
                    Entendi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventPreview;
