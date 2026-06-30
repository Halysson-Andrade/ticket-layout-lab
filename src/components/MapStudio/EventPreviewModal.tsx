import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Monitor,
  Smartphone,
  Heart,
  Share2,
  Search,
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
  ChevronRight,
  Star,
  Accessibility,
  Instagram,
  Facebook,
  Youtube,
  CheckCircle2,
  X,
} from 'lucide-react';

interface EventPreviewModalProps {
  open: boolean;
  onClose: () => void;
  mapName?: string;
}

type Device = 'desktop' | 'mobile';

// ---------- MOCKUP DATA ----------
const event = {
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

const sectors = [
  { id: '01', name: 'Camarote Brahma', color: '#fbbf24', price: 480, available: 12, type: 'VIP' },
  { id: '02', name: 'Arquibancada Prime', color: '#22c55e', price: 280, available: 84, type: 'Numerado' },
  { id: '03', name: 'Arquibancada Prime 2', color: '#22c55e', price: 220, available: 156, type: 'Numerado' },
  { id: '04', name: 'Cadeira Numerada', color: '#06b6d4', price: 180, available: 240, type: 'Numerado' },
  { id: '05', name: 'Área do Associado SRM', color: '#f97316', price: 120, available: 60, type: 'Sócio' },
  { id: '06', name: 'Área Prime Diamante', color: '#a855f7', price: 650, available: 8, type: 'VIP' },
  { id: '07', name: 'Área Prime Ouro', color: '#eab308', price: 420, available: 22, type: 'VIP' },
  { id: '08', name: 'Bistrô', color: '#14b8a6', price: 380, available: 18, type: 'Lounge' },
  { id: '09', name: 'Pista / Arquibancada', color: '#ef4444', price: 90, available: 920, type: 'Inteira' },
];

const accessibility = [
  { id: 'AP', name: 'Acessibilidade Pista', color: '#ec4899', price: 45 },
  { id: 'AV', name: 'Acessibilidade VIP', color: '#f43f5e', price: 240 },
];

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

const nearbyEvents = [
  { id: 1, title: 'Henrique & Juliano', date: '10 FEV', city: 'São Paulo - SP', venue: 'Allianz Parque', color: 'from-pink-500 to-orange-500' },
  { id: 2, title: 'Festa Farra', date: '22 FEV', city: 'Curitiba - PR', venue: 'Pedreira Paulo Leminski', color: 'from-violet-500 to-fuchsia-500' },
  { id: 3, title: 'Jorge & Mateus', date: '02 MAR', city: 'Belo Horizonte - MG', venue: 'Mineirão', color: 'from-cyan-500 to-blue-600' },
  { id: 4, title: 'Maiara & Maraisa', date: '15 MAR', city: 'Goiânia - GO', venue: 'Arena Goiânia', color: 'from-emerald-500 to-teal-600' },
];

// ---------- HELPERS ----------
const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type CartItem = { sectorId: string; name: string; price: number; qty: number; color: string };

// ---------- COMPONENT ----------
export const EventPreviewModal: React.FC<EventPreviewModalProps> = ({
  open,
  onClose,
  mapName,
}) => {
  const [device, setDevice] = useState<Device>('desktop');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.sectorId === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0),
    );
  };
  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((i) => i.sectorId !== id));

  const cartCount = cart.reduce((a, b) => a + b.qty, 0);
  const subtotal = cart.reduce((a, b) => a + b.qty * b.price, 0);
  const fee = subtotal * 0.1;
  const total = subtotal + fee;

  const isMobile = device === 'mobile';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1400px] w-[96vw] h-[92vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header da preview */}
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base">Preview — Página do Evento e Carrinho</DialogTitle>
            {mapName && (
              <Badge variant="outline" className="text-xs font-normal">
                {mapName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Área scroll com a preview */}
        <div className="flex-1 overflow-hidden bg-[#eef0f3]">
          <ScrollArea className="h-full">
            <div className="flex justify-center py-6 px-4">
              <div
                className={cn(
                  'bg-white shadow-2xl rounded-xl overflow-hidden transition-all duration-300 relative',
                  isMobile ? 'w-[390px]' : 'w-full max-w-[1280px]',
                )}
              >
                {/* ===== TOP NAV ===== */}
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
                    <div className="flex items-center gap-2">
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
                  </div>
                </header>

                {/* ===== HERO ===== */}
                <section
                  className="relative"
                  style={{ background: event.heroGradient }}
                >
                  <div className={cn('mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-5xl')}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl bg-black/30 aspect-[16/7] flex items-center justify-center relative">
                      {/* placeholder hero */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,200,150,0.4),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(255,100,100,0.5),transparent_60%)]" />
                      <div className="relative z-10 text-center text-white px-4">
                        <p className="text-xs uppercase tracking-widest opacity-80">Circuito Brahma apresenta</p>
                        <h1 className={cn('font-black drop-shadow-lg', isMobile ? 'text-3xl' : 'text-6xl')}>
                          {event.title}
                        </h1>
                        <div className="inline-block mt-3 bg-amber-400/95 text-amber-950 font-bold rounded-full px-4 py-1 text-sm">
                          09 a 19 de Maio
                        </div>
                        <p className="mt-2 text-sm opacity-90">MARINGÁ • PARANÁ • BRASIL</p>
                      </div>
                    </div>

                    {/* Action row */}
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
                        onClick={() => {
                          document.getElementById('preview-sectors')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        COMPRAR INGRESSO
                      </Button>
                    </div>
                  </div>
                </section>

                {/* ===== EVENT INFO + QUICK CTA ===== */}
                <section className={cn('mx-auto', isMobile ? 'px-4 py-6' : 'px-8 py-10 max-w-5xl')}>
                  <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1fr_320px]')}>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{event.title}</h2>
                      <p className="text-sm text-slate-500 mt-1">{event.subtitle}</p>

                      <div className="flex items-center gap-1 mt-3 text-amber-500">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={cn('h-4 w-4', i <= Math.round(event.rating) ? 'fill-amber-500' : '')} />
                        ))}
                        <span className="text-xs text-slate-600 ml-2">
                          {event.rating} • {event.reviews.toLocaleString('pt-BR')} avaliações
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-2"><Calendar className="h-4 w-4" /></div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{event.date}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Abertura {event.doors}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-emerald-50 text-emerald-600 rounded-lg p-2"><MapPin className="h-4 w-4" /></div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{event.venue}</p>
                            <p className="text-xs text-slate-500">{event.city}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick price card (improvement) */}
                    <aside className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 h-fit sticky top-4">
                      <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">A partir de</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">
                        {brl(Math.min(...sectors.map((s) => s.price)))}
                      </p>
                      <p className="text-xs text-slate-500 mb-4">+ taxa de serviço</p>
                      <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11"
                        onClick={() => document.getElementById('preview-sectors')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Escolher ingressos
                      </Button>
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Compra 100% segura
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <CreditCard className="h-4 w-4 text-emerald-600" />
                        Parcele em até 10x sem juros
                      </div>
                    </aside>
                  </div>
                </section>

                {/* ===== SECTOR MAP + LEGEND ===== */}
                <section id="preview-sectors" className="bg-slate-50">
                  <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-6xl')}>
                    <div className="text-center mb-6">
                      <p className="text-xs text-emerald-600 font-bold tracking-widest uppercase">Setores</p>
                      <h3 className={cn('font-black text-slate-900', isMobile ? 'text-2xl' : 'text-4xl')}>
                        Arena de Shows
                      </h3>
                      <p className="text-sm text-slate-500 mt-2">Escolha o setor diretamente pelo mapa ou pela lista abaixo</p>
                    </div>

                    <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1.4fr_1fr]')}>
                      {/* Stylized map */}
                      <div className="bg-gradient-to-br from-rose-900 via-red-700 to-orange-600 rounded-2xl p-6 aspect-[4/3] relative shadow-xl">
                        <div className="absolute inset-6 rounded-full bg-emerald-500/90 flex items-center justify-center">
                          <div className="w-2/3 h-1/3 bg-red-600 rounded-md flex items-center justify-center text-white font-bold text-sm">
                            PALCO
                          </div>
                        </div>
                        {/* Sector tags floating */}
                        {sectors.slice(0, 6).map((s, idx) => {
                          const positions = [
                            'top-3 left-4', 'top-3 right-4',
                            'bottom-3 left-4', 'bottom-3 right-4',
                            'top-1/2 left-2', 'top-1/2 right-2',
                          ];
                          return (
                            <button
                              key={s.id}
                              onClick={() => addToCart(s)}
                              className={cn(
                                'absolute rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-lg hover:scale-110 transition',
                                positions[idx],
                              )}
                              style={{ background: s.color }}
                            >
                              {s.id}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend / Selector */}
                      <div className="space-y-2">
                        {[...sectors, ...accessibility].map((s) => {
                          const isAcc = !('available' in s);
                          const full = sectors.find((x) => x.id === s.id);
                          const available = full?.available ?? 4;
                          return (
                            <button
                              key={s.id}
                              onClick={() => addToCart({ id: s.id, name: s.name, price: s.price, color: s.color })}
                              disabled={available === 0}
                              className="w-full text-left flex items-center gap-3 bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition rounded-xl p-3 group"
                            >
                              <div
                                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                                style={{ background: s.color }}
                              >
                                {isAcc ? <Accessibility className="h-5 w-5" /> : s.id}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                                <p className="text-xs text-slate-500">
                                  {isAcc ? 'Acessibilidade' : `${available} disponíveis`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">a partir de</p>
                                <p className="text-sm font-bold text-emerald-600">{brl(s.price)}</p>
                              </div>
                              <Plus className="h-4 w-4 text-slate-300 group-hover:text-emerald-500" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ===== INFO + RULES ===== */}
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

                {/* ===== LOCATION ===== */}
                <section className="bg-slate-50">
                  <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl')}>
                    <h3 className="text-emerald-600 font-bold text-xl mb-4">Localização</h3>
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <div className="aspect-[16/6] bg-[linear-gradient(135deg,#dbe7f3_0%,#eef4fa_50%,#dbe7f3_100%)] relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,rgba(255,255,255,0.6)_70%)]" />
                        <div className="relative bg-white rounded-lg shadow-lg p-3 max-w-xs">
                          <p className="text-xs font-bold text-slate-900">{event.venue}</p>
                          <p className="text-xs text-slate-500">{event.city}</p>
                          <button className="text-xs text-emerald-600 font-semibold mt-1">Ver mapa ampliado →</button>
                        </div>
                        <MapPin className="absolute h-10 w-10 text-rose-500 fill-rose-500" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ===== POINTS OF SALE ===== */}
                <section className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl')}>
                  <h3 className="text-emerald-600 font-bold text-xl mb-4 flex items-center gap-2">
                    Pontos de venda <ChevronDown className="h-4 w-4" />
                  </h3>
                  <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-4')}>
                    {pointsOfSale.map((p, i) => (
                      <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 text-white text-xs font-semibold px-3 py-2">{p.city}</div>
                        <div className="p-3">
                          <p className="text-sm font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{p.address}</p>
                          <p className="text-xs text-slate-500">{p.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ===== NEARBY EVENTS ===== */}
                <section className="bg-slate-50">
                  <div className={cn('mx-auto', isMobile ? 'px-4 py-8' : 'px-8 py-12 max-w-5xl')}>
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-slate-900">
                      <span className="text-rose-500">❤</span> Próximos a você
                    </h3>
                    <div className={cn('grid gap-4', isMobile ? 'grid-cols-2' : 'grid-cols-4')}>
                      {nearbyEvents.map((e) => (
                        <div key={e.id} className="rounded-lg overflow-hidden bg-white shadow-sm border border-slate-200 hover:shadow-md transition cursor-pointer">
                          <div className={cn('aspect-[4/3] bg-gradient-to-br relative', e.color)}>
                            <div className="absolute inset-0 bg-black/20" />
                            <span className="absolute top-2 left-2 bg-white/90 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded">{e.date}</span>
                            <span className="absolute bottom-2 left-2 right-2 text-white font-bold text-sm drop-shadow">{e.title}</span>
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold text-slate-900">{e.city}</p>
                            <p className="text-[10px] text-slate-500">{e.venue}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ===== FOOTER ===== */}
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
                      GUICHÊ WEB COMERCIALIZAÇÃO DE INGRESSOS — Preview gerada a partir do mapa "{mapName ?? 'sem nome'}"
                    </p>
                  </div>
                </footer>

                {/* ===== MOBILE STICKY CTA ===== */}
                {isMobile && (
                  <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex items-center gap-3 shadow-2xl">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-500">A partir de</p>
                      <p className="text-base font-black text-slate-900">{brl(Math.min(...sectors.map((s) => s.price)))}</p>
                    </div>
                    <Button
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11"
                      onClick={() => document.getElementById('preview-sectors')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Comprar
                    </Button>
                  </div>
                )}

                {/* ===== CART DRAWER (inside preview) ===== */}
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
                                  {i.sectorId}
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
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
