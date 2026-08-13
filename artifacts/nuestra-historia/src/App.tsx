import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  ArrowDown, ArrowUpRight, CalendarDays, Check, ChevronRight, CirclePlay,
  FileText, Image as ImageIcon, LayoutDashboard, LogIn, LogOut, Mail,
  Menu, Music2, Pencil, Plus, Quote, Send, Settings2, ShieldCheck,
  Sparkles, Trash2, UploadCloud, Users, X, Heart, LockKeyhole,
} from 'lucide-react';
import {
  useCreateAlbum, useCreateLoveNote, useCreateMedia, useCreateMessage,
  useCreateMusic, useCreateTimeline, useDeleteAlbum, useDeleteLoveNote,
  useDeleteMedia, useDeleteMessage, useDeleteMusic, useDeleteTimeline,
  useGetAdminStory, useGetCurrentUser, useGetPublicStory, useGetLetter,
  useListAlbums, useListLoveNotes, useListMedia, useListMessages, useListMusic,
  useListTimeline, useLogin, useLogout, useRequestUploadUrl, useSaveLetter,
  useUpdateAlbum, useUpdateLoveNote, useUpdateMedia, useUpdateMessage,
  useUpdateTimeline,
  getGetAdminStoryQueryKey, getGetCurrentUserQueryKey, getGetLetterQueryKey,
  getGetPublicStoryQueryKey, getListAlbumsQueryKey, getListLoveNotesQueryKey,
  getListMediaQueryKey, getListMessagesQueryKey, getListMusicQueryKey,
  getListTimelineQueryKey,
  type Album, type GuestMessage, type LoveNote, type MediaItem, type MusicItem,
  type TimelineItem,
  setBaseUrl,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';

const apiBase = import.meta.env.VITE_API_URL ?? '';
if (apiBase) setBaseUrl(apiBase);

const queryClient = new QueryClient();
const img = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('/objects/')) return `${apiBase}/api/storage${path}`;
  if (path.startsWith('http')) return path;
  return `${apiBase}${path}`;
};
const dateLabel = (value: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value + (value.length === 10 ? 'T12:00:00' : '')));

function Shell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  return <div className={admin ? 'admin-shell' : 'public-shell'}>{children}</div>;
}

function PublicNav() {
  return <header className="public-nav">
    <Link href="/" className="wordmark" data-testid="link-home"><span>nuestra</span><i>historia</i></Link>
    <nav className="public-links" aria-label="Navegación de historia">
      <a href="#momentos">Momentos</a><a href="#albumes">Álbumes</a><a href="#carta">Carta</a>
    </nav>
    <Link href="/admin" className="admin-entry" data-testid="link-admin"><LockKeyhole size={14} /> espacio privado</Link>
  </header>;
}

function PublicLoading() {
  return <Shell><div className="loading-page"><div className="loading-mark">S<span>&</span>A</div><div className="skeleton-line wide" /><div className="skeleton-line" /><p>Abriendo el álbum…</p></div></Shell>;
}

function PublicError() {
  return <Shell><div className="empty-page"><div className="empty-icon"><Heart size={28} /></div><h1>Este recuerdo está tomando aire.</h1><p>No pudimos abrir la historia ahora. Probá nuevamente en un momento.</p><button className="button dark" onClick={() => window.location.reload()} data-testid="button-retry-public">Volver a intentar</button></div></Shell>;
}

function PublicStoryPage() {
  const story = useGetPublicStory({ query: { queryKey: getGetPublicStoryQueryKey() } });
  const createMessage = useCreateMessage();
  const [messageOpen, setMessageOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedLoose, setSelectedLoose] = useState<MediaItem | null>(null);
  if (story.isLoading) return <PublicLoading />;
  if (story.isError || !story.data) return <PublicError />;
  const data = story.data;
  const timeline = [...data.timeline].sort((a, b) => a.sortOrder - b.sortOrder);
  const albums = [...data.albums].sort((a, b) => a.sortOrder - b.sortOrder);
  const publicMedia = data.media.filter((item) => item.isPublic);
  return <Shell>
    <PublicNav />
    <main>
      <section className="hero" data-testid="section-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> un álbum para volver</div>
          <h1>Sol <em>&</em><br /><strong>Aaron</strong></h1>
          <p>Una colección de días ordinarios que, juntos, se volvieron extraordinarios.</p>
          <a className="scroll-cue" href="#momentos"><span>↓</span> recorrer la historia</a>
        </div>
        <div className="hero-stamp"><span>desde</span><strong>2025</strong><small>Mendoza · Argentina</small></div>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      </section>

      {data.letter && <section id="carta" className="letter-section content-wrap">
        <div className="section-heading"><div><div className="section-kicker">01 / para vos</div><h2>Una carta<br /><em>para abrir.</em></h2></div></div>
        <LetterEnvelope title={data.letter.title} content={data.letter.content} />
      </section>}

      <section id="momentos" className="timeline-section content-wrap">
        <div className="section-heading"><div><div className="section-kicker">02 / el camino</div><h2>Momentos que<br /><em>nos hicieron.</em></h2></div><span className="heading-note">deslizá para recordar <ArrowDown size={16} /></span></div>
        <div className="timeline-list">{timeline.length ? timeline.map((item, index) => <article className={`timeline-card ${index % 2 ? 'offset' : ''}`} key={item.id} data-testid={`card-timeline-${item.id}`}>
          <div className="timeline-image">{item.imageUrl ? <img src={img(item.imageUrl)} alt={item.title} /> : <div className="image-placeholder"><Sparkles size={26} /></div>}<span className="timeline-index">0{index + 1}</span></div>
          <div className="timeline-info"><time>{dateLabel(item.date)}</time><h3>{item.title}</h3><p>{item.description}</p></div>
        </article>) : <ComposedEmpty title="Todavía no hay momentos" text="El primer capítulo está esperando ser escrito." />}</div>
      </section>

      <section id="albumes" className="albums-section content-wrap">
        <div className="section-heading compact"><div><div className="section-kicker">03 / en imágenes</div><h2>Pequeños <em>universos.</em></h2></div><span className="count-badge">{publicMedia.length} recuerdos</span></div>
        {albums.length ? <div className="album-grid">{albums.map((album, index) => {
          const items = publicMedia.filter((media) => media.albumId === album.id);
          return <article className={`album-card album-${index % 3}`} key={album.id} data-testid={`card-album-${album.id}`} onClick={() => setSelectedAlbum(album)} style={{ cursor: 'pointer' }}>
            <div className="album-cover">{album.coverUrl ? <img src={img(album.coverUrl)} alt={album.name} /> : items[0] ? <img src={img(items[0].objectPath)} alt={album.name} /> : <div className="image-placeholder"><ImageIcon size={30} /></div>}<span>{String(items.length).padStart(2, '0')} fotos</span></div>
            <h3>{album.name}</h3><p>{album.description}</p>
          </article>;
        })}</div> : <ComposedEmpty title="El álbum está en blanco" text="Pronto habrá fotos para volver a mirar." />}
        {publicMedia.length > 0 && <div className="mosaic-gallery">{publicMedia.filter((item) => !item.albumId).slice(0, 8).map((item, index) => <div className={`mosaic-item mosaic-${index % 5}`} key={item.id} onClick={() => setSelectedLoose(item)} style={{ cursor: 'pointer' }}>{item.type === 'video' ? <video src={img(item.objectPath)} muted preload="metadata" /> : <img src={img(item.objectPath)} alt={item.title} />}<span>{item.title}</span></div>)}</div>}
      </section>

      <section className="love-section content-wrap"><div className="section-kicker">04 / inventario de ternura</div><h2>Cosas que amo<br /><em>de vos.</em></h2><div className="love-grid">{data.loveNotes.length ? data.loveNotes.map((note, index) => <article className="love-note" key={note.id}><span>0{index + 1}</span><Heart size={17} /><h3>{note.title}</h3><p>{note.content}</p></article>) : <ComposedEmpty title="Un inventario pendiente" text="Hay tanto para decir que puede esperar un poquito." />}</div></section>

      <section className="music-section content-wrap"><div className="music-disc"><div className="disc-label">S + A<br /><small>lado A</small></div></div><div className="music-copy"><div className="section-kicker">05 / banda sonora</div><h2>Canciones que<br /><em>suenan a nosotros.</em></h2><div className="track-list">{data.music.length ? data.music.map((track, index) => <a href={track.url} target="_blank" rel="noreferrer" className="track" key={track.id} data-testid={`link-track-${track.id}`}><span>{String(index + 1).padStart(2, '0')}</span><CirclePlay size={18} /><div><strong>{track.title}</strong><small>{track.artist}</small></div><ArrowUpRight size={16} /></a>) : <p className="muted-copy">La playlist todavía está buscando su primera canción.</p>}</div></div></section>

      <section className="messages-section content-wrap"><div className="section-heading compact"><div><div className="section-kicker">06 / de quienes nos quieren</div><h2>Palabras que<br /><em>quedan.</em></h2></div><button className="button outline" onClick={() => setMessageOpen(true)} data-testid="button-open-message"><Mail size={16} /> dejar un mensaje</button></div><div className="message-grid">{data.messages.length ? data.messages.map((message) => <blockquote key={message.id} data-testid={`quote-message-${message.id}`}><Quote size={20} /><p>“{message.content}”</p><footer><span>{message.name.slice(0, 1).toUpperCase()}</span><strong>{message.name}</strong></footer></blockquote>) : <ComposedEmpty title="El libro de visitas está abierto" text="Sé la primera persona en dejarles unas palabras." />}</div></section>
      <footer className="public-footer"><div className="footer-heart"><Heart size={18} fill="currentColor" /></div><p>Hecho de recuerdos por Sol y Aaron</p><span>Buenos Aires · {new Date().getFullYear()}</span></footer>
    </main>
    {messageOpen && <Modal title="Dejá una huella" onClose={() => setMessageOpen(false)}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); createMessage.mutate({ data: { name: String(form.get('name')), content: String(form.get('content')) } }, { onSuccess: () => { setSent(true); setMessageOpen(false); } }); }}><label>tu nombre<input name="name" required maxLength={80} data-testid="input-message-name" /></label><label>un mensaje<textarea name="content" required maxLength={1000} rows={5} data-testid="input-message-content" /></label><button className="button dark full" disabled={createMessage.isPending} data-testid="button-submit-message">{createMessage.isPending ? 'guardando…' : <><Send size={16} /> enviar con cariño</>}</button></form></Modal>}
    {sent && <div className="toast-note"><Check size={16} /> Gracias. El mensaje quedó esperando aprobación.</div>}
    {selectedAlbum && <AlbumDetailModal album={selectedAlbum} allMedia={publicMedia} onClose={() => setSelectedAlbum(null)} imgFn={img} />}
    {selectedLoose && <div className="modal-backdrop media-viewer" onClick={() => setSelectedLoose(null)}>
      <button className="modal-close viewer-close" onClick={() => setSelectedLoose(null)}><X size={22} /></button>
      {selectedLoose.type === 'video' ? <video src={img(selectedLoose.objectPath)} controls autoPlay /> : <img src={img(selectedLoose.objectPath)} alt={selectedLoose.title} />}
      <div className="viewer-caption"><strong>{selectedLoose.title}</strong>{selectedLoose.description && <p>{selectedLoose.description}</p>}</div>
    </div>}
  </Shell>;
}

function ComposedEmpty({ title, text }: { title: string; text: string }) { return <div className="composed-empty"><div><Sparkles size={18} /></div><h3>{title}</h3><p>{text}</p></div>; }

function LetterEnvelope({ title, content }: { title: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => setIsRevealed(true), 600);
    } else {
      setIsRevealed(false);
      setTimeout(() => setIsOpen(false), 400);
    }
  };

  return <div className={`letter-envelope-wrapper ${isOpen ? 'open' : ''}`}>
    <button className="letter-open-btn" onClick={handleOpen} data-testid="button-open-letter">
      {isOpen ? (
        <><LockKeyhole size={16} /> cerrar carta</>
      ) : (
        <><Mail size={16} /> abrir carta</>
      )}
    </button>
    <div className="letter-flip-container" onClick={handleOpen}>
      <div className="letter-flip-card">
        <div className="letter-flip-front">
          <div className="envelope-body">
            <div className="envelope-flap" />
            <div className="envelope-front-design">
              <div className="envelope-seal"><Heart size={22} /></div>
              <span className="envelope-to">Para Sol</span>
              <span className="envelope-from">de Aaron</span>
            </div>
          </div>
        </div>
        <div className="letter-flip-back">
          <div className="letter-paper">
            <div className="paper-top"><span>para Sol</span><span>{title || 'carta abierta'}</span></div>
            <Quote className="quote-mark" size={34} />
            <h2>{title || 'Lo que no siempre digo'}</h2>
            <div className="letter-content">{content.split('\n').map((line, index) => <p key={index} className={isRevealed ? 'revealed' : ''} style={{ transitionDelay: `${index * 80}ms` }}>{line || '\u00a0'}</p>)}</div>
            <div className="paper-bottom"><span>con amor, siempre</span><strong>Aaron</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function AlbumDetailModal({ album, allMedia, onClose, imgFn }: { album: Album; allMedia: MediaItem[]; onClose: () => void; imgFn: (p?: string | null) => string }) {
  const items = allMedia.filter((m) => m.albumId === album.id);
  const [viewer, setViewer] = useState<MediaItem | null>(null);
  return <div className="modal-backdrop" role="dialog" onClick={onClose}><div className="modal album-detail-modal" onClick={(e) => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={18} /></button>
    <div className="section-kicker">álbum</div>
    <h2>{album.name}</h2>
    {album.description && <p className="album-detail-desc">{album.description}</p>}
    {items.length ? <div className="album-detail-grid">{items.map((item) => <div className="album-detail-item" key={item.id} onClick={() => setViewer(item)}>
      {item.type === 'video' ? <div className="album-detail-thumb video-thumb"><CirclePlay size={30} /></div> : <img src={imgFn(item.objectPath)} alt={item.title} />}
      <span>{item.title}</span>
    </div>)}</div> : <ComposedEmpty title="Vacío por ahora" text="Todavía no hay fotos en este álbum." />}
  </div>
  {viewer && <div className="modal-backdrop media-viewer" onClick={() => setViewer(null)}>
    <button className="modal-close viewer-close" onClick={() => setViewer(null)}><X size={22} /></button>
    {viewer.type === 'video' ? <video src={imgFn(viewer.objectPath)} controls autoPlay /> : <img src={imgFn(viewer.objectPath)} alt={viewer.title} />}
    <div className="viewer-caption"><strong>{viewer.title}</strong>{viewer.description && <p>{viewer.description}</p>}</div>
  </div>}
  </div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog"><div className="modal"><button className="modal-close" onClick={onClose} data-testid="button-close-modal"><X size={18} /></button><div className="section-kicker">espacio privado</div><h2>{title}</h2>{children}</div></div>;
}

const tabs = [
  ['overview', 'Resumen', LayoutDashboard], ['timeline', 'Momentos', CalendarDays], ['albums', 'Álbumes', ImageIcon],
  ['media', 'Multimedia', UploadCloud], ['letter', 'Carta', FileText], ['love', 'Cosas que amo', Heart],
  ['music', 'Música', Music2], ['messages', 'Mensajes', Mail], ['settings', 'Ajustes', Settings2],
] as const;

function AdminPage() {
  const currentUser = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    window.addEventListener('tab-timeline', () => setTab('timeline'));
    return () => window.removeEventListener('tab-timeline', () => setTab('timeline'));
  }, []);
  if (currentUser.isLoading) return <Shell admin><div className="admin-loading"><div className="loading-mark">S<span>&</span>A</div><div className="skeleton-line wide" /></div></Shell>;
  if (currentUser.isError || !currentUser.data) return <LoginScreen />;
  return <Shell admin><aside className={`admin-sidebar ${mobileNav ? 'open' : ''}`}><div className="side-brand"><span>nuestra</span><i>historia</i><small>espacio de cuidado</small></div><div className="side-user"><div className="avatar">{currentUser.data.displayName.slice(0, 1)}</div><div><strong>{currentUser.data.displayName}</strong><small>administradora</small></div></div><nav>{tabs.map(([key, label, Icon]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setMobileNav(false); }} data-testid={`button-tab-${key}`}><Icon size={17} />{label}{key === 'messages' && <span className="nav-count">!</span>}</button>)}</nav><Link href="/" className="back-public" data-testid="link-back-public"><ArrowUpRight size={16} /> ver historia pública</Link></aside><div className="admin-main"><header className="admin-topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} data-testid="button-mobile-menu"><Menu size={20} /></button><div><span className="section-kicker">panel privado /</span><strong>{tabs.find(([key]) => key === tab)?.[1]}</strong></div><LogoutButton /></header><AdminContent tab={tab} /></div></Shell>;
}

function LoginScreen() {
  const login = useLogin();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState<'solsaldena' | 'aarongonzalez'>('solsaldena');
  const [error, setError] = useState(false);
  return <Shell admin><div className="login-page"><div className="login-decoration">S <span>&</span> A</div><div className="login-card"><div className="section-kicker"><ShieldCheck size={14} /> acceso privado</div><h1>Lo que es de<br /><em>los dos.</em></h1><p>Un rincón para seguir juntando historias, sin apuro.</p><form onSubmit={(event) => { event.preventDefault(); setError(false); const password = new FormData(event.currentTarget).get('password'); login.mutate({ data: { username, password: String(password) } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }), onError: () => setError(true) }); }}><label>quién sos<select value={username} onChange={(event) => setUsername(event.target.value as typeof username)} data-testid="select-login-user"><option value="solsaldena">Sol</option><option value="aarongonzalez">Aaron</option></select></label><label>clave<input name="password" type="password" required data-testid="input-login-password" /></label>{error && <p className="form-error">La clave no coincide. Intentá nuevamente.</p>}<button className="button dark full" disabled={login.isPending} data-testid="button-login">{login.isPending ? 'abriendo…' : <><LogIn size={16} /> entrar al álbum</>}</button></form><Link href="/" className="login-back" data-testid="link-login-back">← volver a la historia</Link></div></div></Shell>;
}

function LogoutButton() { const logout = useLogout(); const queryClient = useQueryClient(); return <button className="logout-button" onClick={() => logout.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }) })} data-testid="button-logout"><LogOut size={16} /> salir</button>; }

function AdminContent({ tab }: { tab: string }) {
  const adminStory = useGetAdminStory({ query: { queryKey: getGetAdminStoryQueryKey() } });
  if (adminStory.isLoading) return <div className="admin-content"><div className="admin-skeleton"><div /><div /><div /></div></div>;
  if (adminStory.isError || !adminStory.data) return <div className="admin-content"><ComposedEmpty title="No se pudo abrir el panel" text="Revisá tu conexión e intentá de nuevo." /></div>;
  const data = adminStory.data;
  if (tab === 'overview') return <Overview data={data} />;
  if (tab === 'timeline') return <TimelineAdmin items={data.timeline} />;
  if (tab === 'albums') return <AlbumsAdmin items={data.albums} />;
  if (tab === 'media') return <MediaAdmin items={data.media} albums={data.albums} />;
  if (tab === 'letter') return <LetterAdmin letter={data.letter} />;
  if (tab === 'love') return <LoveAdmin items={data.loveNotes} />;
  if (tab === 'music') return <MusicAdmin items={data.music} />;
  if (tab === 'messages') return <MessagesAdmin items={data.messages} />;
  return <SettingsAdmin />;
}

function AdminHead({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) { return <div className="admin-heading"><div><div className="section-kicker">{kicker}</div><h1>{title}</h1></div>{action}</div>; }
function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) { return <div className={`stat ${accent ? 'accent' : ''}`}><strong>{value}</strong><span>{label}</span></div>; }
function Overview({ data }: { data: any }) { return <div className="admin-content"><AdminHead kicker="tu historia, en una mirada" title="Hola, ustedes." action={<Link href="/" className="button outline" data-testid="link-preview-story">ver historia <ArrowUpRight size={15} /></Link>} /><div className="welcome-banner"><div><span className="eyebrow"><span className="eyebrow-dot" /> álbum vivo</span><h2>Cada recuerdo<br />tiene su lugar.</h2><p>Este es el pulso actual de nuestra historia.</p></div><div className="welcome-mark">S <span>&</span> A</div></div><div className="stats-grid"><Stat value={data.timeline.length} label="momentos" /><Stat value={data.media.length} label="fotos y videos" accent /><Stat value={data.loveNotes.length} label="cosas que amo" /><Stat value={data.messages.filter((m: GuestMessage) => !m.isApproved).length} label="mensajes por revisar" /></div><div className="overview-lower"><div className="mini-panel"><div className="panel-title"><span>últimos momentos</span><button onClick={() => window.dispatchEvent(new CustomEvent('tab-timeline'))} data-testid="button-overview-timeline">ver todos <ChevronRight size={14} /></button></div>{data.timeline.slice(-3).reverse().map((item: TimelineItem) => <div className="mini-row" key={item.id}><span className="mini-date">{dateLabel(item.date).slice(0, 6)}</span><strong>{item.title}</strong><ArrowUpRight size={14} /></div>)}</div><div className="mini-panel quote-panel"><Quote size={18} /><p>“Lo mejor de nuestra historia es que todavía la estamos escribiendo.”</p><small>— para volver cuando haga falta</small></div></div></div>; }

function DataList<T extends { id: number }>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => ReactNode }) { return items.length ? <div className="data-list">{items.map(render)}</div> : <ComposedEmpty title={empty} text="Usá el botón de arriba para sumar el primero." />; }
function AdminCrud({ title, kicker, children, onAdd, addLabel = 'nuevo recuerdo' }: { title: string; kicker: string; children: ReactNode; onAdd: () => void; addLabel?: string }) { return <div className="admin-content"><AdminHead kicker={kicker} title={title} action={<button className="button dark" onClick={onAdd} data-testid={`button-add-${kicker.replaceAll(' ', '-')}`}><Plus size={16} /> {addLabel}</button>} />{children}</div>; }

function TimelineAdmin({ items }: { items: TimelineItem[] }) { const [open, setOpen] = useState(false); const [editing, setEditing] = useState<TimelineItem | null>(null); return <><AdminCrud kicker="archivo / timeline" title="Momentos" onAdd={() => { setEditing(null); setOpen(true); }}><DataList items={[...items].sort((a, b) => a.sortOrder - b.sortOrder)} empty="Todavía no hay momentos." render={(item) => <TimelineRow item={item} key={item.id} onEdit={() => { setEditing(item); setOpen(true); }} />} /></AdminCrud>{open && <TimelineForm item={editing} onClose={() => setOpen(false)} />}</>; }
function TimelineRow({ item, onEdit }: { item: TimelineItem; onEdit: () => void }) { const del = useDeleteTimeline(); const qc = useQueryClient(); return <div className="data-row"><div className="row-thumb">{item.imageUrl ? <img src={img(item.imageUrl)} alt="" /> : <CalendarDays size={19} />}</div><div className="row-main"><time>{dateLabel(item.date)}</time><strong>{item.title}</strong><p>{item.description}</p></div><RowActions onEdit={onEdit} onDelete={() => { if (confirm('¿Eliminar este momento?')) del.mutate({ id: item.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListTimelineQueryKey() }) }); }} deleting={del.isPending} /></div>; }
function TimelineForm({ item, onClose }: { item: TimelineItem | null; onClose: () => void }) { const create = useCreateTimeline(); const update = useUpdateTimeline(); const qc = useQueryClient(); return <Modal title={item ? 'Editar momento' : 'Sumar un momento'} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const payload = { date: String(f.get('date')), title: String(f.get('title')), description: String(f.get('description')), imageUrl: String(f.get('imageUrl') || '') || null, sortOrder: Number(f.get('sortOrder') || 0) }; const done = () => { qc.invalidateQueries({ queryKey: getListTimelineQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); onClose(); }; item ? update.mutate({ id: item.id, data: payload }, { onSuccess: done }) : create.mutate({ data: payload }, { onSuccess: done }); }}><Field name="title" label="título" defaultValue={item?.title} required /><Field name="date" label="fecha" type="date" defaultValue={item?.date} required /><Field name="description" label="descripción" defaultValue={item?.description} textarea /><Field name="imageUrl" label="url de imagen (opcional)" defaultValue={item?.imageUrl || ''} /><button className="button dark full" data-testid="button-save-timeline"><Check size={16} /> guardar momento</button></form></Modal>; }

function AlbumsAdmin({ items }: { items: Album[] }) { const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Album | null>(null); const del = useDeleteAlbum(); const qc = useQueryClient(); return <><AdminCrud kicker="archivo / álbumes" title="Álbumes" addLabel="nuevo álbum" onAdd={() => { setEditing(null); setOpen(true); }}><div className="admin-album-grid">{items.map((item) => <div className="admin-album-card" key={item.id}><div className="album-cover">{item.coverUrl ? <img src={img(item.coverUrl)} alt="" /> : <div className="image-placeholder"><ImageIcon size={24} /></div>}</div><strong>{item.name}</strong><p>{item.description}</p><RowActions onEdit={() => { setEditing(item); setOpen(true); }} onDelete={() => { if (confirm('¿Eliminar este álbum? Se perderán todos sus datos.')) del.mutate({ id: item.id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAlbumsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); } }); }} deleting={del.isPending} /></div>)}</div>{!items.length && <ComposedEmpty title="Todavía no hay álbumes." text="Separá los capítulos por momentos." />}</AdminCrud>{open && <AlbumForm item={editing} onClose={() => setOpen(false)} />}</>; }
function AlbumForm({ item, onClose }: { item: Album | null; onClose: () => void }) {
  const request = useRequestUploadUrl();
  const create = useCreateAlbum();
  const update = useUpdateAlbum();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(item?.coverUrl || null);
  const [progress, setProgress] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let coverUrl = item?.coverUrl || '';

    if (file) {
      setProgress('preparando subida…');
      const result = await request.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as any } });
      setProgress('subiendo portada…');
      await fetch(result.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file, credentials: 'include' });
      coverUrl = result.objectPath;
    }

    const payload = { name: String(f.get('name')), description: String(f.get('description')), coverUrl };
    const done = () => { qc.invalidateQueries({ queryKey: getListAlbumsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); onClose(); };

    if (item) update.mutate({ id: item.id, data: payload }, { onSuccess: done });
    else create.mutate({ data: payload }, { onSuccess: done });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  return <Modal title={item ? 'Editar álbum' : 'Nuevo álbum'} onClose={onClose}><form onSubmit={submit}><label className="file-drop"><UploadCloud size={24} /><strong>{file ? file.name : 'Elegir foto de portada'}</strong><small>JPG, PNG, WEBP · hasta 10 MB</small><input type="file" accept="image/*" onChange={handleFileChange} data-testid="input-album-cover" /></label>{previewUrl && <div className="cover-preview"><img src={previewUrl} alt="Vista previa" /></div>}<Field name="name" label="nombre" defaultValue={item?.name} required /><Field name="description" label="descripción" defaultValue={item?.description} textarea /><button className="button dark full" data-testid="button-save-album"><Check size={16} /> guardar álbum</button></form></Modal>;
}

function MediaAdmin({ items, albums }: { items: MediaItem[]; albums: Album[] }) { const [open, setOpen] = useState(false); return <><AdminCrud kicker="archivo / multimedia" title="Fotos y videos" addLabel="subir archivo" onAdd={() => setOpen(true)}><div className="media-admin-grid">{items.map((item) => <div className="media-admin-card" key={item.id}><div className="media-preview">{item.type === 'video' ? <CirclePlay size={26} /> : item.objectPath && <img src={img(item.objectPath)} alt="" />}</div><div><strong>{item.title}</strong><span>{item.isPublic ? 'público' : 'privado'} · {albums.find((a) => a.id === item.albumId)?.name || 'sin álbum'}</span></div><MediaRowActions item={item} /></div>)}</div>{!items.length && <ComposedEmpty title="La galería espera imágenes." text="Subí ese recuerdo que todavía vive en tu teléfono." />}</AdminCrud>{open && <MediaForm albums={albums} onClose={() => setOpen(false)} />}</>; }
function MediaRowActions({ item }: { item: MediaItem }) { const del = useDeleteMedia(); const update = useUpdateMedia(); const qc = useQueryClient(); return <div className="row-actions"><button onClick={() => update.mutate({ id: item.id, data: { isPublic: !item.isPublic } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListMediaQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); } })} data-testid={`button-toggle-media-${item.id}`} title="Cambiar visibilidad">{item.isPublic ? <ShieldCheck size={15} /> : <LockKeyhole size={15} />}</button><button onClick={() => { if (confirm('¿Eliminar este archivo?')) del.mutate({ id: item.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListMediaQueryKey() }) }); }} data-testid={`button-delete-media-${item.id}`}><Trash2 size={15} /></button></div>; }
function MediaForm({ albums, item, onClose }: { albums: Album[]; item: MediaItem | null; onClose: () => void }) { const request = useRequestUploadUrl(); const create = useCreateMedia(); const qc = useQueryClient(); const [file, setFile] = useState<File | null>(null); const [progress, setProgress] = useState(''); const [error, setError] = useState(''); const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setError(''); const f = new FormData(e.currentTarget); let objectPath = String(f.get('objectPath') || ''); if (file) { try { setProgress('preparando subida…'); const result = await request.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as any } }); setProgress('subiendo archivo…'); const uploadRes = await fetch(result.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file, credentials: 'include' }); if (!uploadRes.ok) throw new Error('Upload failed: ' + uploadRes.status); objectPath = result.objectPath; } catch (err: any) { setError(err.message || 'Error al subir el archivo'); setProgress(''); return; } } if (!objectPath) { setError('Elegí un archivo para subir'); return; } setProgress('guardando…'); create.mutate({ data: { title: String(f.get('title')), description: String(f.get('description')), date: String(f.get('date')), type: file?.type.startsWith('video') ? 'video' : 'image', objectPath, albumId: f.get('albumId') ? Number(f.get('albumId')) : null, isPublic: f.get('isPublic') === 'on' } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListMediaQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); onClose(); }, onError: (err: any) => { setError(err.message || 'Error al guardar'); setProgress(''); } }); }; return <Modal title="Subir un recuerdo" onClose={onClose}><form onSubmit={submit}><label className="file-drop"><UploadCloud size={24} /><strong>{file ? file.name : 'Elegí una foto o video'}</strong><small>JPG, PNG, WEBP, MP4 · hasta 50 MB</small><input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="input-media-file" /></label>{error && <p className="form-error">{error}</p>}{progress && <p className="form-progress">{progress}</p>}<Field name="title" label="título" required /><Field name="date" label="fecha" type="date" required /><Field name="description" label="descripción" /><label>álbum<select name="albumId" data-testid="select-media-album"><option value="">sin álbum</option>{albums.map((a) => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label><label className="check-line"><input type="checkbox" name="isPublic" defaultChecked data-testid="checkbox-media-public" /> visible en la historia pública</label><button className="button dark full" disabled={!!progress || create.isPending || request.isPending} data-testid="button-save-media"><UploadCloud size={16} /> {progress || 'guardar archivo'}</button></form></Modal>; }

function LetterAdmin({ letter }: { letter: any }) { const save = useSaveLetter(); const qc = useQueryClient(); return <div className="admin-content"><AdminHead kicker="archivo / carta" title="La carta" /><form className="letter-editor" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save.mutate({ data: { title: String(f.get('title')), content: String(f.get('content')) } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetLetterQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); } }); }}><Field name="title" label="título" defaultValue={letter?.title} /><label>cuerpo de la carta<textarea name="content" rows={16} defaultValue={letter?.content} data-testid="textarea-letter-content" /></label><div className="editor-footer"><span>{save.isSuccess ? 'guardado en el álbum' : 'La carta es solo de ustedes.'}</span><button className="button dark" data-testid="button-save-letter"><Check size={16} /> guardar cambios</button></div></form></div>; }

function LoveAdmin({ items }: { items: LoveNote[] }) { const [open, setOpen] = useState(false); const [editing, setEditing] = useState<LoveNote | null>(null); return <><AdminCrud kicker="archivo / ternura" title="Cosas que amo" addLabel="sumar una cosa" onAdd={() => { setEditing(null); setOpen(true); }}><DataList items={items} empty="Todavía no hay notas." render={(item) => <div className="data-row love-admin-row" key={item.id}><div className="note-number">{String(item.sortOrder + 1).padStart(2, '0')}</div><div className="row-main"><strong>{item.title}</strong><p>{item.content}</p></div><RowActions onEdit={() => { setEditing(item); setOpen(true); }} onDelete={() => {}} /></div>} /></AdminCrud>{open && <LoveForm item={editing} onClose={() => setOpen(false)} />}</>; }
function LoveForm({ item, onClose }: { item: LoveNote | null; onClose: () => void }) { const create = useCreateLoveNote(); const update = useUpdateLoveNote(); const qc = useQueryClient(); return <Modal title={item ? 'Editar nota' : 'Una cosa más'} onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const payload = { title: String(f.get('title')), content: String(f.get('content')), sortOrder: Number(f.get('sortOrder') || 0) }; const done = () => { qc.invalidateQueries({ queryKey: getListLoveNotesQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); onClose(); }; item ? update.mutate({ id: item.id, data: payload }, { onSuccess: done }) : create.mutate({ data: payload }, { onSuccess: done }); }}><Field name="title" label="título" defaultValue={item?.title} required /><Field name="content" label="lo que amo" defaultValue={item?.content} textarea required /><Field name="sortOrder" label="orden" type="number" defaultValue={item?.sortOrder ?? 0} /><button className="button dark full" data-testid="button-save-love"><Check size={16} /> guardar nota</button></form></Modal>; }

function MusicAdmin({ items }: { items: MusicItem[] }) { const [open, setOpen] = useState(false); return <><AdminCrud kicker="archivo / banda sonora" title="Música" addLabel="sumar canción" onAdd={() => setOpen(true)}><DataList items={items} empty="Todavía no hay canciones." render={(item) => <MusicRow item={item} key={item.id} />} /></AdminCrud>{open && <MusicForm onClose={() => setOpen(false)} />}</>; }
function MusicRow({ item }: { item: MusicItem }) { const del = useDeleteMusic(); const qc = useQueryClient(); return <div className="data-row music-admin-row"><div className="music-icon"><Music2 size={18} /></div><div className="row-main"><strong>{item.title}</strong><p>{item.artist}</p></div><a href={item.url} target="_blank" rel="noreferrer" className="row-link" data-testid={`link-admin-track-${item.id}`}><ArrowUpRight size={16} /></a><button className="icon-danger" onClick={() => { if (confirm('¿Quitar esta canción?')) del.mutate({ id: item.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListMusicQueryKey() }) }); }} data-testid={`button-delete-music-${item.id}`}><Trash2 size={15} /></button></div>; }
function MusicForm({ onClose }: { onClose: () => void }) { const create = useCreateMusic(); const qc = useQueryClient(); return <Modal title="Sumar canción" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ data: { title: String(f.get('title')), artist: String(f.get('artist')), url: String(f.get('url')) } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListMusicQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); onClose(); } }); }}><Field name="title" label="canción" required /><Field name="artist" label="artista" required /><Field name="url" label="enlace" type="url" required /><button className="button dark full" data-testid="button-save-music"><Check size={16} /> sumar a la banda sonora</button></form></Modal>; }

function MessagesAdmin({ items }: { items: GuestMessage[] }) { const update = useUpdateMessage(); const del = useDeleteMessage(); const qc = useQueryClient(); return <div className="admin-content"><AdminHead kicker="archivo / libro de visitas" title="Mensajes" /><DataList items={items} empty="Todavía no hay mensajes." render={(item) => <div className={`message-admin-row ${item.isApproved ? '' : 'pending'}`} key={item.id}><div className="message-avatar">{item.name.slice(0, 1)}</div><div className="row-main"><div><strong>{item.name}</strong><time>{dateLabel(item.createdAt)}</time></div><p>{item.content}</p></div><div className="message-actions">{!item.isApproved && <button className="approve" onClick={() => update.mutate({ id: item.id, data: { isApproved: true } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListMessagesQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminStoryQueryKey() }); } })} data-testid={`button-approve-message-${item.id}`}><Check size={15} /> aprobar</button>}<button className="icon-danger" onClick={() => { if (confirm('¿Eliminar este mensaje?')) del.mutate({ id: item.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListMessagesQueryKey() }) }); }} data-testid={`button-delete-message-${item.id}`}><Trash2 size={15} /></button></div></div>} /></div>; }
function SettingsAdmin() { const user = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } }); return <div className="admin-content"><AdminHead kicker="espacio privado" title="Ajustes" /><div className="settings-card"><div className="settings-icon"><Users size={22} /></div><div><span className="section-kicker">cuenta activa</span><h3>{user.data?.displayName}</h3><p>{user.data?.username}</p></div></div><div className="settings-card muted-setting"><div className="settings-icon"><ShieldCheck size={22} /></div><div><h3>Este álbum es de ustedes</h3><p>Solo Sol y Aaron pueden entrar, editar recuerdos y aprobar mensajes.</p></div></div></div>; }
function RowActions({ onEdit, onDelete, deleting = false }: { onEdit: () => void; onDelete: () => void; deleting?: boolean }) { return <div className="row-actions"><button onClick={onEdit} data-testid="button-edit-item"><Pencil size={15} /></button><button onClick={onDelete} disabled={deleting} data-testid="button-delete-item"><Trash2 size={15} /></button></div>; }
function Field({ name, label, defaultValue, type = 'text', required = false, textarea = false }: { name: string; label: string; defaultValue?: string | number; type?: string; required?: boolean; textarea?: boolean }) { return <label>{label}{textarea ? <textarea name={name} defaultValue={defaultValue} rows={4} required={required} data-testid={`textarea-${name}`} /> : <input name={name} defaultValue={defaultValue} type={type} required={required} data-testid={`input-${name}`} />}</label>; }

function AppRouter() { return <ErrorBoundary><Switch><Route path="/" component={PublicStoryPage} /><Route path="/admin" component={AdminPage} /><Route component={() => <Shell><div className="empty-page"><h1>Este capítulo no existe.</h1><Link href="/" className="button dark" data-testid="link-not-found-home">volver al inicio</Link></div></Shell>} /></Switch></ErrorBoundary>; }
export default function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRouter /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }