import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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
  Ticket,
  Info,
  Star,
  Instagram,
  Facebook,
  Youtube,
  CheckCircle2,
  X,
  Search,
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

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const eventInfo = {
  title: 'Expoingá 2024',
  subtitle: '50ª Exposição Feira Agropecuária e Industrial de Maringá',
  date: '09/05/2024 a 19/05/2024',
  doors: '19:00h',
  venue: 'Parque Internacional de Exposições Francisco Feio Ribeiro',
  city: 'Maringá / PR',
  rating: 4.8,
  reviews: 1284,
  heroGradient:
    'linear-gradient(135deg,#7a1d1d 0%,#b32626 35%,#e63946 65%,#f4a261 100%)',
};

const faqs = [
  { q: 'Há estacionamento no local?', a: 'Sim, terceirizado.' },
  { q: 'É permitido acesso com câmera fotográfica?', a: 'Sim.' },
  { q: 'Há acesso para pessoas com deficiência?', a: 'Sim, com acessibilidade total.' },
  { q: 'Há espaço para fumantes?', a: 'Sim, áreas designadas.' },
  { q: 'Existe venda de alimentos no local?', a: 'Sim.' },
  { q: 'Formas de pagamento aceitas no local?', a: 'Crédito, Débito, Dinheiro e PIX.' },
];

const rules = [
  'Apresentação obrigatória do ingresso impresso ou digital com documento oficial com foto.',
  'O não comparecimento ao evento não dá direito a reembolso.',
  'Meia-entrada apenas com comprovação no local.',
  'Menores de 16 anos somente acompanhados dos pais ou responsáveis legais.',
  'Não é permitida a entrada com alimentos e bebidas externas.',
];

const pointsOfSale = [
  { city: 'Maringá/PR', name: 'Loja Centro', address: 'Av. Brasil, 1502', phone: '(44) 3033-1622' },
  { city: 'Maringá/PR', name: 'Shopping Catuaí', address: 'Av. Colombo, 9161 - L. 232', phone: '(44) 3033-2210' },
  { city: 'Sarandi/PR', name: 'Loja Sarandi', address: 'Av. Londrina, 540', phone: '(44) 3035-9080' },
  { city: 'Paiçandu/PR', name: 'Mercado Central', address: 'R. Bandeirantes, 80', phone: '(44) 3244-1199' },
];

// Mock price ladder for sectors that don't carry price info
const MOCK_PRICES = [480, 280, 220, 180, 150, 120, 90, 380, 650, 420];
const getSectorPrice = (s: Sector, idx: number): number => {
  const seatWithPrice = s.seats.find((x) => typeof x.price === 'number' && x.price! > 0);
  if (seatWithPrice?.price) return seatWithPrice.price;
  return MOCK_PRICES[idx % MOCK_PRICES.length];
};

const EventPreview: React.FC = () => {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SNAPSHOT_KEY);
      if (raw) setSnapshot(JSON.parse(raw) as PreviewSnapshot);
    } catch (e) {
      console.error('Falha ao carregar snapshot do mapa', e);
    }
  }, []);

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
      if (found) {
        return prev.map((i) =>
          i.sectorId === s.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { sectorId: s.id, name: s.name, price: s.price, qty: 1, color: s.color }];
    });
    setCartOpen(true);
  };
  const updateQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((i) => (i.sectorId === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0),
    );
  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((i) => i.sectorId !== id));

  const cartCount = cart.reduce((a, b) => a + b.qty, 0);
  const subtotal = cart.reduce((a, b) => a + b.qty * b.price, 0);
  const fee = subtotal * 0.1;
  const total = subtotal + fee;

  const handleSectorClick = (id: string) => {
    const s = sectorsForSale.find((x) => x.id === id);
    if (s) addToCart(s);
  };

  const isMobile = device === 'mobile';

  if (!snapshot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
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

  return (
    <div className="min-h-screen bg-[#eef0f3] flex flex-col">
      {/* Toolbar superior */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao mapa
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-semibold text-slate-900 truncate">
            Preview — Página do Evento
          </span>
          <Badge variant="outline" className="text-xs font-normal hidden sm:inline-flex">
            {snapshot.mapName}
          </Badge>
        </div>
        <div className="flex items-center bg-muted rounded-md p-0.5">
          <Button
            variant={device === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3"
            onClick={() => setDevice('desktop')}
          >
            <Monitor className="h-3.5 w-3.5 mr-1.5" /> Desktop
          </Button>
          <Button
            variant={device === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3"
            onClick={() => setDevice('mobile')}
          >
            <Smartphone className="h-3.5 w-3.5 mr-1.5" /> Mobile
          </Button>
        </div>
      </div>

      {/* Conteúdo da preview */}
      <div className="flex-1 flex justify-center py-6 px-4">
        <div
          className={cn(
            'bg-white shadow-2xl rounded-xl overflow-hidden transition-all duration-300 relative',
            isMobile ? 'w-[390px]' : 'w-full max-w-[1280px]',
          )}
        >
          {/* Top nav */}
          <header className="bg-[#2f3640] text-white">
            <div className={cn('flex items-center justify-between', isMobile ? 'px-4 py-3' : 'px-8 py-4')}>
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500 rounded p-1">
                  <Ticket className="h-4 w-4" />
                </div>
                <span className="font-bold">guichê<span className="text-emerald-400">web</span></span>
              </div>
              {!isMobile && (
                <nav className="flex items-center gap-6 text-sm">
                  <Search className="h-4 w-4 text-emerald-400" />
                  <button className="flex items-center gap-1 text-emerald-400">
                    <MapPin className="h-4 w-4" /> Localização <ChevronDown className="h-3 w-3" />
                  </button>
                  <button className="hover:text-emerald-400">Crie seu evento</button>
                  <button className="border border-emerald-400 text-emerald-400 rounded-full px-4 py-1 flex items-center gap-1">
                    Entrar <User className="h-3 w-3" />
                  </button>
                </nav>
              )}
              <button
                className="relative bg-emerald-500 hover:bg-emerald-600 rounded-full p-2"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Hero */}
          <section className="relative" style={{ background: eventInfo.heroGradient }}>
            <div className={cn('mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-5xl')}>
              <div className="rounded-2xl overflow-hidden shadow-2xl bg-black/30 aspect-[16/7] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,200,150,0.4),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(255,100,100,0.5),transparent_60%)]" />
                <div className="relative z-10 text-center text-white px-4">
                  <p className="text-xs uppercase tracking-widest opacity-80">Circuito Brahma apresenta</p>
                  <h1 className={cn('font-black drop-shadow-lg', isMobile ? 'text-3xl' : 'text-6xl')}>
                    {eventInfo.title}
                  </h1>
                  <div className="inline-block mt-3 bg-amber-400/95 text-amber-950 font-bold rounded-full px-4 py-1 text-sm">
                    09 a 19 de Maio
                  </div>
                  <p className="mt-2 text-sm opacity-90">MARINGÁ • PARANÁ • BRASIL</p>
                </div>
              </div>

              <div className={cn('mt-4 flex items-center gap-3', isMobile && 'flex-wrap')}>
                <button className="bg-white/90 backdrop-blur rounded-full p-2 text-rose-500 hover:scale-110 transition">
                  <Heart className="h-5 w-5" />
                </button>
                <button className="bg-white/90 backdrop-blur rounded-full p-2 text-emerald-600 hover:scale-110 transition">
                  <Share2 className="h-5 w-5" />
                </button>
                <div className="flex-1" />
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full px-8 h-12 shadow-xl"
                  onClick={() => document.getElementById('preview-sectors')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  COMPRAR INGRESSO
                </Button>
              </div>
            </div>
          </section>

          {/* Event info + quick CTA */}
          <section className={cn('mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-5xl')}>
            <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1fr_320px]')}>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{eventInfo.title}</h2>
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
                    <div className="bg-emerald-50 text-emerald-600 rounded-lg p-2"><Calendar className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{eventInfo.date}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Abertura {eventInfo.doors}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-50 text-emerald-600 rounded-lg p-2"><MapPin className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{eventInfo.venue}</p>
                      <p className="text-xs text-slate-500">{eventInfo.city}</p>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 h-fit sticky top-20">
                <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">A partir de</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  {minPrice ? brl(minPrice) : '—'}
                </p>
                <p className="text-xs text-slate-500 mb-4">+ taxa de serviço</p>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11"
                  onClick={() => document.getElementById('preview-sectors')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Escolher ingressos
                </Button>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Compra 100% segura
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  <CreditCard className="h-4 w-4 text-emerald-600" /> Parcele em até 10x sem juros
                </div>
              </aside>
            </div>
          </section>

          {/* Mapa real + lista de setores */}
          <section id="preview-sectors" className="bg-slate-50">
            <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-6xl')}>
              <div className="text-center mb-6">
                <p className="text-xs text-emerald-600 font-bold tracking-widest uppercase">Setores</p>
                <h3 className={cn('font-black text-slate-900', isMobile ? 'text-2xl' : 'text-4xl')}>
                  {snapshot.mapName}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Escolha o setor diretamente pelo mapa ou pela lista abaixo
                </p>
              </div>

              <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1.4fr_1fr]')}>
                {/* SVG do mapa real */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden aspect-[4/3] relative">
                  {sectorsForSale.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 text-center p-6">
                      Nenhum setor criado no mapa ainda.
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
                      onHoverSector={setHoveredSectorId}
                      onClickSector={handleSectorClick}
                    />
                  )}
                  {hoveredSectorId && (
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 text-white text-xs rounded-md px-3 py-2 flex items-center justify-between pointer-events-none">
                      <span className="font-semibold truncate">
                        {sectorsForSale.find((s) => s.id === hoveredSectorId)?.name}
                      </span>
                      <span className="font-bold text-emerald-300">
                        {brl(sectorsForSale.find((s) => s.id === hoveredSectorId)?.price ?? 0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lista/Legenda */}
                <div className="space-y-2">
                  {sectorsForSale.length === 0 ? (
                    <div className="text-sm text-slate-500 p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center">
                      Crie setores no construtor para vê-los aqui.
                    </div>
                  ) : (
                    sectorsForSale.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addToCart(s)}
                        onMouseEnter={() => setHoveredSectorId(s.id)}
                        onMouseLeave={() => setHoveredSectorId(null)}
                        className={cn(
                          'w-full text-left flex items-center gap-3 bg-white border transition rounded-xl p-3 group',
                          hoveredSectorId === s.id
                            ? 'border-emerald-400 shadow-md'
                            : 'border-slate-200 hover:border-emerald-400 hover:shadow-md',
                        )}
                      >
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: s.color }}
                        >
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.available} disponíveis</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">a partir de</p>
                          <p className="text-sm font-bold text-emerald-600">{brl(s.price)}</p>
                        </div>
                        <Plus className="h-4 w-4 text-slate-300 group-hover:text-emerald-500" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Info + Regras */}
          <section className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl')}>
            <div className={cn('grid gap-8', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
              <div>
                <h3 className="text-emerald-600 font-bold text-xl mb-4 flex items-center gap-2">
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
                        <div className="px-3 pb-3 text-sm text-slate-600 border-t border-slate-100 bg-slate-50">
                          {f.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-emerald-600 font-bold text-xl mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Regras da venda on-line
                </h3>
                <ul className="space-y-3">
                  {rules.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
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
              <h3 className="text-emerald-600 font-bold text-xl mb-4">Pontos de venda</h3>
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

          {/* Footer */}
          <footer className="bg-slate-100 border-t border-slate-200">
            <div className={cn('mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-5xl')}>
              <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-4')}>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-emerald-500 rounded p-1"><Ticket className="h-4 w-4 text-white" /></div>
                    <span className="font-bold text-slate-900">guichê<span className="text-emerald-500">web</span></span>
                  </div>
                  <div className="flex gap-3 text-slate-500">
                    <Instagram className="h-4 w-4" />
                    <Facebook className="h-4 w-4" />
                    <Youtube className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-emerald-600 font-bold text-xs mb-2">INSTITUCIONAL</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>Página Inicial</li><li>Blog</li><li>Termos de Uso</li><li>Política de Privacidade</li>
                  </ul>
                </div>
                <div>
                  <p className="text-emerald-600 font-bold text-xs mb-2">EVENTOS</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>Suporte</li><li>Criar Evento</li><li>Procurar Evento</li><li>Categorias</li>
                  </ul>
                </div>
                <div>
                  <p className="text-emerald-600 font-bold text-xs mb-2">ACESSO RÁPIDO</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>Esqueci minha senha</li><li>Formas de pagamento</li><li>Compras canceladas</li>
                  </ul>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-[10px] text-center text-slate-500">
                Preview gerada a partir do mapa "{snapshot.mapName}"
              </p>
            </div>
          </footer>

          {/* Mobile sticky CTA */}
          {isMobile && (
            <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex items-center gap-3 shadow-2xl">
              <div className="flex-1">
                <p className="text-[10px] text-slate-500">A partir de</p>
                <p className="text-base font-black text-slate-900">{minPrice ? brl(minPrice) : '—'}</p>
              </div>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11"
                onClick={() => document.getElementById('preview-sectors')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Comprar
              </Button>
            </div>
          )}

          {/* Cart drawer */}
          {cartOpen && (
            <div className="absolute inset-0 z-50 flex" onClick={() => setCartOpen(false)}>
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
                      <p className="text-xs mt-1">Clique em um setor do mapa para começar.</p>
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
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-sm font-medium w-6 text-center">{i.qty}</span>
                              <button
                                onClick={() => updateQty(i.sectorId, 1)}
                                className="h-6 w-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeFromCart(i.sectorId)}
                                className="ml-auto text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
                      <span className="font-black text-lg text-emerald-600">{brl(total)}</span>
                    </div>
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11">
                      Ir para o pagamento
                    </Button>
                    <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" /> Pagamento criptografado
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
