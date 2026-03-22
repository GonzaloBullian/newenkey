import { useState, useEffect, useCallback, useRef } from "react";

const IS_ELECTRON = typeof window !== "undefined" && !!window.newenkey;

const CATEGORIES = {
  all: { label: "Todos", icon: "⌨️", color: "#64748b" },
  snippet: { label: "Snippets", icon: "✍️", color: "#38bdf8" },
  expansion: { label: "Texto", icon: "💬", color: "#22d3ee" },
  open: { label: "Abrir", icon: "🚀", color: "#94a3b8" },
  search: { label: "Buscar", icon: "🔍", color: "#60a5fa" },
  command: { label: "Comandos", icon: "⚡", color: "#a78bfa" },
};

const SEARCH_ENGINES = [
  { id: "google", label: "Google", icon: "🌐" },
  { id: "maps", label: "Maps", icon: "📍" },
  { id: "youtube", label: "YouTube", icon: "▶️" },
  { id: "amazon", label: "Amazon", icon: "📦" },
  { id: "twitter", label: "X", icon: "🐦" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "custom", label: "Custom", icon: "🔗" },
];

// ═══ TEMPLATES ═══
const TEMPLATE_PACKS = [
  {
    id: "email", name: "📧 Emails", desc: "Respuestas rápidas y firmas",
    templates: [
      { name: "Firma formal", trigger: "/firma", text: "Saludos cordiales,\n[Tu Nombre]\n[Tu Cargo]", desc: "Firma profesional" },
      { name: "Recibido", trigger: "/ok", text: "Recibido, lo estoy revisando. Te confirmo en breve.", desc: "Acuse de recibo rápido" },
      { name: "Gracias", trigger: "/thx", text: "Muchas gracias por tu tiempo y la información. Quedo atento a cualquier novedad.", desc: "Agradecimiento formal" },
      { name: "Seguimiento", trigger: "/follow", text: "Buen día, te escribo para dar seguimiento al tema que conversamos. ¿Tenés novedades?", desc: "Follow up amable" },
      { name: "Reunión", trigger: "/meet", text: "¿Te parece si coordinamos una reunión esta semana? Tengo disponibilidad el [día] a las [hora].", desc: "Proponer reunión" },
      { name: "Vacaciones", trigger: "/ooo", text: "Gracias por tu mensaje. En este momento me encuentro fuera de oficina y estaré de regreso el [fecha]. Para temas urgentes, contactar a [nombre] a [email].", desc: "Respuesta automática" },
    ]
  },
  {
    id: "ventas", name: "💼 Ventas", desc: "Seguimiento y cierre",
    templates: [
      { name: "Primer contacto", trigger: "/intro", text: "Hola [nombre], soy [tu nombre] de [empresa]. Vi tu perfil y creo que podríamos generar una buena sinergia. ¿Tenés 15 minutos esta semana para una charla rápida?", desc: "Cold outreach" },
      { name: "Propuesta enviada", trigger: "/sent", text: "Te acabo de enviar la propuesta por email. Cualquier duda que tengas, no dudes en consultarme. ¿Te parece si hablamos el [día] para repasarla juntos?", desc: "Después de enviar propuesta" },
      { name: "Precio", trigger: "/price", text: "El plan incluye [detalle]. La inversión es de $[monto] + IVA. Incluye [beneficios]. ¿Te gustaría avanzar?", desc: "Respuesta sobre precio" },
    ]
  },
  {
    id: "soporte", name: "🛠 Soporte", desc: "Respuestas para atención al cliente",
    templates: [
      { name: "Recibimos tu caso", trigger: "/ticket", text: "Hola, recibimos tu consulta y ya estamos trabajando en ella. Te vamos a estar contactando a la brevedad con una solución. Gracias por tu paciencia.", desc: "Acuse de soporte" },
      { name: "Resuelto", trigger: "/fixed", text: "Tu caso fue resuelto. Si tenés alguna otra consulta no dudes en escribirnos. ¡Gracias por contactarnos!", desc: "Caso cerrado" },
      { name: "Info adicional", trigger: "/info", text: "Para poder ayudarte mejor, necesitaríamos que nos envíes: \n1. [dato]\n2. [dato]\n3. Captura de pantalla del error", desc: "Pedir más datos" },
    ]
  },
  {
    id: "dev", name: "💻 Desarrollo", desc: "Snippets de código y comandos",
    templates: [
      { name: "Console log", trigger: "/cl", text: "console.log('>>> ', );", desc: "Debug rápido JS" },
      { name: "Try catch", trigger: "/try", text: "try {\n  \n} catch (error) {\n  console.error(error);\n}", desc: "Bloque try-catch" },
      { name: "Comentario TODO", trigger: "/todo", text: "// TODO: ", desc: "Marcador de tarea" },
    ]
  },
  {
    id: "datos", name: "📋 Datos personales", desc: "Tu info de siempre",
    templates: [
      { name: "Email", trigger: "/email", text: "tu@email.com", desc: "Tu email rápido" },
      { name: "Teléfono", trigger: "/tel", text: "+54 11 1234-5678", desc: "Tu número" },
      { name: "Dirección", trigger: "/dir", text: "Av. Corrientes 1234, CABA, Argentina", desc: "Tu dirección" },
      { name: "CUIT", trigger: "/cuit", text: "20-12345678-9", desc: "Tu CUIT/CUIL" },
      { name: "CBU", trigger: "/cbu", text: "0000000000000000000000", desc: "Tu CBU" },
    ]
  },
  {
    id: "redes", name: "📱 Redes sociales", desc: "Respuestas para redes",
    templates: [
      { name: "DM bienvenida", trigger: "/dm", text: "¡Hola! Gracias por escribirnos 🙌 ¿En qué te podemos ayudar?", desc: "Respuesta a DM" },
      { name: "Link en bio", trigger: "/bio", text: "¡Gracias por tu interés! Podés encontrar toda la info en el link de nuestra bio 👆", desc: "Redirigir a bio" },
      { name: "Gracias comentario", trigger: "/ty", text: "¡Muchas gracias por tu comentario! 💙", desc: "Agradecer interacción" },
    ]
  },
];

const DEFAULT_SHORTCUTS = [
  // ═══ TEXTOS RÁPIDOS (expansion) — todos desactivados para que el usuario configure ═══
  { id: 1, name: "✍️ Firma de email", keys: [], type: "expansion", searchEngine: "", description: "Escribí /firma → pega tu firma profesional", enabled: false, snippetText: "—\n[Tu Nombre]\n[Cargo] | [Empresa]\n📱 +54 11 XXXX-XXXX\n📧 email@empresa.com\n🔗 linkedin.com/in/tu-perfil", openTarget: "", customUrl: "", commandText: "", trigger: "/firma" },
  { id: 2, name: "👋 Presentación", keys: [], type: "expansion", searchEngine: "", description: "Escribí /hola → presentación profesional", enabled: false, snippetText: "¡Hola! Soy [Tu Nombre], [cargo] en [Empresa].\nMe dedico a [qué hacés] y me encantaría conectar.\n¿Tenés unos minutos esta semana para charlar?", openTarget: "", customUrl: "", commandText: "", trigger: "/hola" },
  { id: 3, name: "✅ Recibido", keys: [], type: "expansion", searchEngine: "", description: "Escribí /ok → acuse de recibo rápido", enabled: false, snippetText: "Recibido, lo estoy revisando. Te confirmo en breve.", openTarget: "", customUrl: "", commandText: "", trigger: "/ok" },
  { id: 4, name: "🔄 Follow up", keys: [], type: "expansion", searchEngine: "", description: "Escribí /follow → seguimiento amable", enabled: false, snippetText: "¡Hola! Paso a hacer un follow up del mensaje anterior.\n¿Pudiste verlo? Cualquier cosa, acá estoy. ¡Gracias!", openTarget: "", customUrl: "", commandText: "", trigger: "/follow" },
  { id: 5, name: "🙏 Gracias reunión", keys: [], type: "expansion", searchEngine: "", description: "Escribí /thx → agradecimiento post-reunión", enabled: false, snippetText: "¡Gracias por la reunión! Muy productiva.\nQuedo pendiente de los próximos pasos y te actualizo a la brevedad.\n¡Abrazo!", openTarget: "", customUrl: "", commandText: "", trigger: "/thx" },
  { id: 6, name: "💰 Datos bancarios", keys: [], type: "expansion", searchEngine: "", description: "Escribí /cbu → datos para transferencia", enabled: false, snippetText: "Datos para la transferencia:\n🏦 Banco: [Tu Banco]\nCBU: [XXXXXXXXXXXXXXXXXXXX]\nAlias: [tu.alias]\nCUIL: [XX-XXXXXXXX-X]\nTitular: [Tu Nombre]", openTarget: "", customUrl: "", commandText: "", trigger: "/cbu" },
  { id: 7, name: "📱 Mis redes", keys: [], type: "expansion", searchEngine: "", description: "Escribí /redes → links a tus redes sociales", enabled: false, snippetText: "🔗 Mis redes:\n📸 Instagram: @[tu_usuario]\n💼 LinkedIn: linkedin.com/in/[tu-perfil]\n🐦 Twitter/X: @[tu_usuario]\n🌐 Web: [www.tuweb.com]", openTarget: "", customUrl: "", commandText: "", trigger: "/redes" },
  { id: 8, name: "📧 Email", keys: [], type: "expansion", searchEngine: "", description: "Escribí /email → tu dirección de email", enabled: false, snippetText: "tu@email.com", openTarget: "", customUrl: "", commandText: "", trigger: "/email" },
  { id: 9, name: "📞 Teléfono", keys: [], type: "expansion", searchEngine: "", description: "Escribí /tel → tu número", enabled: false, snippetText: "+54 11 XXXX-XXXX", openTarget: "", customUrl: "", commandText: "", trigger: "/tel" },
  { id: 10, name: "👋 Cierre email", keys: [], type: "expansion", searchEngine: "", description: "Escribí /cierre → despedida profesional", enabled: false, snippetText: "¡Quedo atento, gracias! Abrazo grande.", openTarget: "", customUrl: "", commandText: "", trigger: "/cierre" },

  // ═══ ATAJOS DE TECLADO (hotkeys) — desactivados ═══
  { id: 11, name: "🔍 Buscar en Google", keys: ["Ctrl", "Shift", "G"], type: "search", searchEngine: "google", description: "Seleccioná texto → busca en Google", enabled: false, snippetText: "", openTarget: "", customUrl: "", commandText: "", trigger: "" },
  { id: 12, name: "📍 Buscar en Maps", keys: ["Ctrl", "Shift", "M"], type: "search", searchEngine: "maps", description: "Seleccioná texto → busca en Maps", enabled: false, snippetText: "", openTarget: "", customUrl: "", commandText: "", trigger: "" },
  { id: 13, name: "▶️ Buscar en YouTube", keys: ["Ctrl", "Shift", "Y"], type: "search", searchEngine: "youtube", description: "Seleccioná texto → busca en YouTube", enabled: false, snippetText: "", openTarget: "", customUrl: "", commandText: "", trigger: "" },
  { id: 14, name: "💼 Buscar en LinkedIn", keys: ["Ctrl", "Shift", "L"], type: "search", searchEngine: "linkedin", description: "Seleccioná texto → busca en LinkedIn", enabled: false, snippetText: "", openTarget: "", customUrl: "", commandText: "", trigger: "" },
  { id: 15, name: "🚀 Abrir WhatsApp", keys: ["Ctrl", "Alt", "W"], type: "open", searchEngine: "", description: "Abre WhatsApp Web", enabled: false, snippetText: "", openTarget: "https://web.whatsapp.com", customUrl: "", commandText: "", trigger: "" },
  { id: 16, name: "📅 Abrir Calendar", keys: ["Ctrl", "Alt", "C"], type: "open", searchEngine: "", description: "Abre Google Calendar", enabled: false, snippetText: "", openTarget: "https://calendar.google.com", customUrl: "", commandText: "", trigger: "" },
];

async function loadFromDisk() { if (IS_ELECTRON) { const d = await window.newenkey.loadShortcuts(); return d?.length > 0 ? d : DEFAULT_SHORTCUTS; } try { const s = localStorage.getItem("nk_sc"); return s ? JSON.parse(s) : DEFAULT_SHORTCUTS; } catch { return DEFAULT_SHORTCUTS; } }
async function saveToDisk(sc) { if (IS_ELECTRON) await window.newenkey.saveShortcuts(sc); else localStorage.setItem("nk_sc", JSON.stringify(sc)); }
function displayKey(key, m) { if (!m) return key; const mp = { Ctrl:"⌘",Cmd:"⌘",Shift:"⇧",Alt:"⌥",Option:"⌥",Win:"⌘",Meta:"⌘" }; return mp[key]||key; }
function normalizeKey(r, m) { if(r==="Control") return m?"Cmd":"Ctrl"; if(r==="Meta") return "Cmd"; if(r===" ") return "Space"; if(r.length===1) return r.toUpperCase(); return r; }

// ═══ UI COMPONENTS ═══
const KeyBadge = ({ keyName, size="md", isMac=false }) => {
  const s = { sm:"text-[10px] px-1.5 py-0.5 min-w-[22px]", md:"text-xs px-2 py-1 min-w-[28px]", lg:"text-sm px-3 py-1.5 min-w-[36px]" };
  return <span className={`${s[size]} inline-flex items-center justify-center font-mono font-bold rounded-md border select-none`} style={{ background:"linear-gradient(180deg,#1e293b,#0f172a)",borderColor:"#334155",color:"#93c5fd",boxShadow:"0 2px 0 #020617,inset 0 1px 0 rgba(148,163,184,0.08)" }}>{displayKey(keyName,isMac)}</span>;
};
const KeyCombo = ({ keys, size="md", isMac=false }) => <div className="flex items-center gap-1">{keys.map((k,i)=><span key={i} className="flex items-center gap-1"><KeyBadge keyName={k} size={size} isMac={isMac}/>{i<keys.length-1&&<span className="text-[10px] font-bold" style={{color:"#475569"}}>+</span>}</span>)}</div>;
const TriggerBadge = ({ trigger, size="sm" }) => <span className={`font-mono font-bold rounded-lg border select-none inline-flex items-center gap-1 ${size==="sm"?"text-[11px] px-2 py-0.5":"text-sm px-3 py-1.5"}`} style={{ background:"linear-gradient(180deg,#0f2830,#0a1a20)",borderColor:"#164e63",color:"#22d3ee",boxShadow:"0 2px 0 #020617" }}>⌨ {trigger}</span>;
const Modal = ({ isOpen, onClose, children }) => { if(!isOpen) return null; return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(2,6,23,0.8)",backdropFilter:"blur(10px)"}} onClick={onClose}><div className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto" style={{background:"linear-gradient(180deg,#111827,#0c1222)",border:"1px solid #1e293b",boxShadow:"0 25px 60px rgba(0,0,0,0.6)"}} onClick={e=>e.stopPropagation()}>{children}</div></div>; };
const Toast = ({ message, visible }) => <div className="fixed bottom-6 right-6 z-50 transition-all duration-300" style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(12px)",pointerEvents:"none"}}><div className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{background:"#1e293b",border:"1px solid #334155",color:"#93c5fd",boxShadow:"0 8px 25px rgba(0,0,0,0.4)"}}>✅ {message}</div></div>;

const ShortcutCard = ({ shortcut, onToggle, onEdit, onDelete, isMac }) => {
  const cat = CATEGORIES[shortcut.type] || CATEGORIES.command;
  const isExp = shortcut.type === "expansion";
  return <div className="group relative rounded-xl p-4 transition-all duration-200 hover:translate-y-[-1px]" style={{ background:shortcut.enabled?"linear-gradient(135deg,rgba(15,23,42,0.9),rgba(15,23,42,0.5))":"rgba(15,23,42,0.3)",border:`1px solid ${shortcut.enabled?"#1e293b":"#0f172a"}`,opacity:shortcut.enabled?1:0.45 }}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{background:`${cat.color}10`,border:`1px solid ${cat.color}20`}}>{cat.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-sm truncate" style={{color:"#e2e8f0"}}>{shortcut.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{background:`${cat.color}12`,color:cat.color,border:`1px solid ${cat.color}25`}}>{isExp?"Texto":cat.label}</span></div>
          <p className="text-xs mb-2.5" style={{color:"#64748b"}}>{shortcut.description}</p>
          {isExp ? <TriggerBadge trigger={shortcut.trigger}/> : shortcut.keys?.length>0 && <KeyCombo keys={shortcut.keys} size="sm" isMac={isMac}/>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={()=>onEdit(shortcut)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs hover:bg-white/5" style={{color:"#64748b"}}>✏️</button>
        <button onClick={()=>onDelete(shortcut.id)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs hover:bg-red-500/10" style={{color:"#64748b"}}>🗑️</button>
        <button onClick={()=>onToggle(shortcut.id)} className="w-10 h-5 rounded-full relative transition-all duration-300 ml-1" style={{background:shortcut.enabled?"linear-gradient(90deg,#2563eb,#3b82f6)":"#1e293b"}}>
          <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all duration-300" style={{background:shortcut.enabled?"#e2e8f0":"#475569",left:shortcut.enabled?"22px":"2px"}}/>
        </button>
      </div>
    </div>
  </div>;
};

const KeyRecorder = ({ keys, onChange, isMac }) => {
  const [rec, setRec] = useState(false);
  const pr = useRef(new Set());
  useEffect(() => { if(!rec) return; const d=e=>{e.preventDefault();e.stopPropagation();pr.current.add(normalizeKey(e.key,isMac));}; const u=()=>{const f=[...pr.current];if(f.length>0)onChange(f);setRec(false);}; window.addEventListener("keydown",d,true);window.addEventListener("keyup",u,true); return()=>{window.removeEventListener("keydown",d,true);window.removeEventListener("keyup",u,true);}; },[rec,onChange,isMac]);
  return <div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Combinación de teclas</label>
    <button onClick={()=>{setRec(true);pr.current=new Set();}} className="w-full h-14 rounded-xl flex items-center justify-center gap-2 transition-all" style={{background:rec?"rgba(37,99,235,0.08)":"rgba(15,23,42,0.6)",border:`2px ${rec?"solid":"dashed"} ${rec?"#2563eb":"#334155"}`}}>
      {rec?<span className="text-sm animate-pulse" style={{color:"#3b82f6"}}>⌨️ Presioná tu combinación...</span>:keys.length>0?<KeyCombo keys={keys} size="lg" isMac={isMac}/>:<span className="text-sm" style={{color:"#475569"}}>Hacé click y presioná las teclas</span>}
    </button></div>;
};

const TitleBar = ({ isMac }) => {
  if(!IS_ELECTRON||isMac) return null;
  return <div className="titlebar-drag h-8 flex items-center justify-end px-2 shrink-0" style={{background:"rgba(7,11,20,0.95)"}}>
    <button onClick={()=>window.newenkey.minimize()} className="w-8 h-6 flex items-center justify-center rounded hover:bg-white/5" style={{color:"#64748b",WebkitAppRegion:"no-drag"}}><svg width="10" height="1"><rect width="10" height="1" fill="currentColor"/></svg></button>
    <button onClick={()=>window.newenkey.maximize()} className="w-8 h-6 flex items-center justify-center rounded hover:bg-white/5" style={{color:"#64748b",WebkitAppRegion:"no-drag"}}><svg width="9" height="9"><rect width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/></svg></button>
    <button onClick={()=>window.newenkey.close()} className="w-8 h-6 flex items-center justify-center rounded hover:bg-red-500/20" style={{color:"#64748b",WebkitAppRegion:"no-drag"}}><svg width="10" height="10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/></svg></button>
  </div>;
};

function generateAHK(sc) {
  let s=`; NewenKey\n#SingleInstance Force\n#NoEnv\nSendMode Input\n\n`;
  sc.filter(x=>x.enabled&&x.type!=='expansion').forEach(x=>{const h=x.keys.map(k=>k==="Ctrl"||k==="Cmd"?"^":k==="Shift"?"+":k==="Alt"||k==="Option"?"!":k==="Win"?"#":k.toLowerCase()).join("");s+=`; ${x.name}\n`;if(x.type==="snippet")s+=`${h}::\n  SendInput, ${(x.snippetText||"").replace(/\n/g,"\`n")}\nReturn\n\n`;else if(x.type==="open")s+=`${h}::\n  Run, ${x.openTarget}\nReturn\n\n`;else if(x.type==="search")s+=`${h}::\n  Send, ^c\n  Sleep 50\n  Run, https://google.com/search?q=%clipboard%\nReturn\n\n`;else if(x.type==="command")s+=`${h}::\n  Run, ${x.commandText}\nReturn\n\n`;});
  sc.filter(x=>x.enabled&&x.type==='expansion'&&x.trigger).forEach(x=>{s+=`::${x.trigger}::${(x.snippetText||"").replace(/\n/g,"\`n")}\n\n`;});
  return s;
}

// ═══ MAIN APP ═══
export default function App() {
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMac, setIsMac] = useState(false);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ message:"", visible:false });
  
  // Creation mode: null = choose, "hotkey" or "text"
  const [createMode, setCreateMode] = useState(null);

  // Form
  const [fn,setFn]=useState("");const [fk,setFk]=useState([]);const [ft,setFt]=useState("snippet");
  const [fd,setFd]=useState("");const [fSnippet,setFSnippet]=useState("");const [fOpen,setFOpen]=useState("");
  const [fEngine,setFEngine]=useState("google");const [fCustom,setFCustom]=useState("");const [fCmd,setFCmd]=useState("");
  const [fTrigger,setFTrigger]=useState("");

  useEffect(()=>{(async()=>{if(IS_ELECTRON){const p=await window.newenkey.getPlatform();setIsMac(p.isMac);const st=await window.newenkey.loadSettings();setAutoStart(st.autoStart||false);}else setIsMac(navigator.platform?.toLowerCase().includes("mac"));const d=await loadFromDisk();setShortcuts(d);setLoading(false);})();if(IS_ELECTRON&&window.newenkey.onExpansionFired)window.newenkey.onExpansionFired(d=>flash(`Expandido: ${d.trigger}`));},[]);
  const firstR=useRef(true);
  useEffect(()=>{if(firstR.current){firstR.current=false;return;}if(!loading)saveToDisk(shortcuts);},[shortcuts,loading]);

  const flash=(m)=>{setToast({message:m,visible:true});setTimeout(()=>setToast(t=>({...t,visible:false})),2000);};

  const filtered=shortcuts.filter(s=>{const mc=activeCat==="all"||s.type===activeCat;const ms=!search||s.name.toLowerCase().includes(search.toLowerCase())||s.description.toLowerCase().includes(search.toLowerCase())||(s.trigger||"").toLowerCase().includes(search.toLowerCase());return mc&&ms;});
  const stats={total:shortcuts.length,active:shortcuts.filter(s=>s.enabled).length,hotkeys:shortcuts.filter(s=>s.enabled&&s.type!=="expansion").length,expansions:shortcuts.filter(s=>s.type==="expansion").length};

  const resetForm=()=>{setFn("");setFk([]);setFt("snippet");setFd("");setFSnippet("");setFOpen("");setFEngine("google");setFCustom("");setFCmd("");setFTrigger("");};

  const openNew=()=>{resetForm();setEditing(null);setCreateMode(null);setShowModal(true);};
  const openNewText=()=>{resetForm();setEditing(null);setCreateMode("text");setFt("expansion");setShowModal(true);};
  const openNewHotkey=()=>{resetForm();setEditing(null);setCreateMode("hotkey");setFt("snippet");setShowModal(true);};
  const openEdit=(s)=>{setEditing(s);setCreateMode(s.type==="expansion"?"text":"hotkey");setFn(s.name);setFk(s.keys||[]);setFt(s.type);setFd(s.description);setFSnippet(s.snippetText||"");setFOpen(s.openTarget||"");setFEngine(s.searchEngine||"google");setFCustom(s.customUrl||"");setFCmd(s.commandText||"");setFTrigger(s.trigger||"");setShowModal(true);};

  const canSave=()=>{if(!fn)return false;if(ft==="expansion")return fTrigger.length>0&&fSnippet.length>0;return fk.length>0;};
  const handleSave=()=>{const o={id:editing?editing.id:Date.now(),name:fn,keys:ft==="expansion"?[]:fk,type:ft,description:fd,enabled:editing?editing.enabled:true,snippetText:fSnippet,openTarget:fOpen,searchEngine:fEngine,customUrl:fCustom,commandText:fCmd,trigger:fTrigger};if(editing){setShortcuts(p=>p.map(s=>s.id===editing.id?o:s));flash("Actualizado");}else{setShortcuts(p=>[...p,o]);flash("Creado");}setShowModal(false);resetForm();};
  const handleDelete=(id)=>{setShortcuts(p=>p.filter(s=>s.id!==id));flash("Eliminado");};
  const handleToggle=(id)=>{setShortcuts(p=>p.map(s=>s.id===id?{...s,enabled:!s.enabled}:s));};

  const addTemplate=(t)=>{const exists=shortcuts.some(s=>s.trigger===t.trigger);if(exists){flash("Ya tenés ese trigger");return;}const o={id:Date.now(),name:t.name,keys:[],type:"expansion",description:t.desc,enabled:true,snippetText:t.text,openTarget:"",searchEngine:"",customUrl:"",commandText:"",trigger:t.trigger};setShortcuts(p=>[...p,o]);flash(`Agregado: ${t.trigger}`);};

  const handleExport=async()=>{const s=generateAHK(shortcuts);if(IS_ELECTRON){const ok=await window.newenkey.exportAHK(s);if(ok)flash("AHK exportado");}else{await navigator.clipboard.writeText(s);flash("Copiado");}};
  const handleExportJSON=async()=>{const data=JSON.stringify(shortcuts,null,2);if(IS_ELECTRON){const ok=await window.newenkey.exportJSON(data);if(ok)flash("Pack exportado");}else{await navigator.clipboard.writeText(data);flash("JSON copiado");}};
  const handleImportJSON=async()=>{if(IS_ELECTRON){const imported=await window.newenkey.importJSON();if(imported&&Array.isArray(imported)){const newOnes=imported.map((s,i)=>({...s,id:Date.now()+i,enabled:true}));setShortcuts(p=>[...p,...newOnes]);flash(`${newOnes.length} atajos importados`);setShowExport(false);}else{flash("Archivo no válido");}}else{flash("Import solo en la app de escritorio");}};
  const toggleAutoStart=async()=>{const next=!autoStart;setAutoStart(next);if(IS_ELECTRON)await window.newenkey.setAutoStart(next);flash(next?"Inicio automático activado":"Inicio automático desactivado");};

  const inp={background:"rgba(15,23,42,0.8)",border:"1px solid #1e293b",color:"#e2e8f0"};

  if(loading)return<div className="min-h-screen flex items-center justify-center" style={{background:"#070b14"}}><div className="text-center"><div className="text-3xl mb-3">⚡</div><p className="text-sm" style={{color:"#475569"}}>Cargando...</p></div></div>;

  return (
    <div className="min-h-screen w-full flex flex-col" style={{background:"linear-gradient(170deg,#070b14,#0c1322 35%,#0a0f1a)",color:"#cbd5e1",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.card-anim{animation:fadeUp .25s ease forwards}`}</style>

      <TitleBar isMac={isMac}/>
      <Toast message={toast.message} visible={toast.visible}/>

      {/* Mac drag bar */}
      {isMac && IS_ELECTRON && <div style={{height:38,WebkitAppRegion:"drag",background:"rgba(7,11,20,0.95)"}}/>}

      {/* Header */}
      <div className="sticky top-0 z-30" style={{background:"rgba(7,11,20,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid #111827"}}>
        <div className="h-[1px] w-full" style={{background:"linear-gradient(90deg,transparent,#1e3a5f,#2563eb40,#1e3a5f,transparent)"}}/>
        <div className="max-w-6xl mx-auto px-6 py-4" style={{WebkitAppRegion:isMac&&IS_ELECTRON?"drag":"no-drag"}}>
          <div className="flex items-center justify-between" style={isMac&&IS_ELECTRON?{paddingLeft:68}:{}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{background:"linear-gradient(135deg,#1e3a5f,#2563eb)",boxShadow:"0 4px 15px rgba(37,99,235,0.2)"}}>⚡</div>
              <div>
                <h1 className="text-lg font-bold tracking-tight" style={{fontFamily:"'JetBrains Mono',monospace",background:"linear-gradient(90deg,#93c5fd,#e2e8f0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NewenKey</h1>
                <p className="text-[10px] tracking-[0.2em] uppercase" style={{color:"#475569"}}>by gbull</p>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{WebkitAppRegion:"no-drag"}}>
              <button onClick={()=>setShowSettings(true)} className="h-9 w-9 rounded-lg text-sm flex items-center justify-center transition-all" style={{background:"rgba(15,23,42,0.8)",border:"1px solid #1e293b",color:"#64748b"}}>⚙️</button>
              <button onClick={()=>setShowTemplates(true)} className="h-9 px-4 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5" style={{background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.15)",color:"#22d3ee"}}>📋 Templates</button>
              <button onClick={()=>setShowExport(true)} className="h-9 w-9 rounded-lg text-sm flex items-center justify-center transition-all" style={{background:"rgba(15,23,42,0.8)",border:"1px solid #1e293b",color:"#94a3b8"}}>📥</button>
              <button onClick={openNew} className="h-9 px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5" style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",color:"#fff",boxShadow:"0 4px 12px rgba(37,99,235,0.2)"}}>+ Nuevo</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 flex-1">
        {/* Quick action buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={openNewText} className="flex-1 h-16 rounded-xl flex items-center justify-center gap-3 transition-all hover:translate-y-[-2px]" style={{background:"linear-gradient(135deg,rgba(34,211,238,0.06),rgba(34,211,238,0.02))",border:"1px solid rgba(34,211,238,0.15)"}}>
            <span className="text-2xl">💬</span>
            <div className="text-left"><div className="text-sm font-semibold" style={{color:"#22d3ee"}}>Texto rápido</div><div className="text-[11px]" style={{color:"#475569"}}>Escribí /trigger → se reemplaza</div></div>
          </button>
          <button onClick={openNewHotkey} className="flex-1 h-16 rounded-xl flex items-center justify-center gap-3 transition-all hover:translate-y-[-2px]" style={{background:"linear-gradient(135deg,rgba(56,189,248,0.06),rgba(56,189,248,0.02))",border:"1px solid rgba(56,189,248,0.15)"}}>
            <span className="text-2xl">⌨️</span>
            <div className="text-left"><div className="text-sm font-semibold" style={{color:"#38bdf8"}}>Atajo de teclado</div><div className="text-[11px]" style={{color:"#475569"}}>Ctrl+Shift+X → acción</div></div>
          </button>
        </div>

        {/* Compact stats */}
        <div className="flex items-center gap-4 mb-5 px-1 text-[11px]" style={{color:"#475569"}}>
          <span><strong style={{color:"#94a3b8"}}>{stats.active}</strong> activos</span>
          <span style={{color:"#1e293b"}}>·</span>
          <span><strong style={{color:"#38bdf8"}}>{stats.hotkeys}</strong> hotkeys</span>
          <span style={{color:"#1e293b"}}>·</span>
          <span><strong style={{color:"#22d3ee"}}>{stats.expansions}</strong> textos</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex gap-1.5 flex-1 flex-wrap">
            {Object.entries(CATEGORIES).map(([k,c])=><button key={k} onClick={()=>setActiveCat(k)} className="h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5" style={{background:activeCat===k?`${c.color}15`:"transparent",border:`1px solid ${activeCat===k?`${c.color}30`:"transparent"}`,color:activeCat===k?c.color:"#64748b"}}><span className="text-sm">{c.icon}</span> {c.label}</button>)}
          </div>
          <div className="relative"><input type="text" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="h-8 w-44 rounded-lg pl-8 pr-3 text-xs outline-none" style={inp}/><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{color:"#475569"}}>🔍</span></div>
        </div>

        {/* Grid */}
        {filtered.length>0?<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{filtered.map((s,i)=><div key={s.id} className="card-anim" style={{animationDelay:`${i*40}ms`}}><ShortcutCard shortcut={s} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} isMac={isMac}/></div>)}</div>
        :<div className="text-center py-16"><div className="text-4xl mb-3 opacity-20">⌨️</div><p className="text-sm mb-3" style={{color:"#475569"}}>{shortcuts.length===0?"No tenés atajos todavía":"Sin resultados"}</p></div>}
      </div>

      <div className="text-center py-3 text-[10px] tracking-wider" style={{color:"#334155",borderTop:"1px solid #0f172a"}}>NewenKey · by gbull</div>

      {/* ═══ CREATE/EDIT MODAL ═══ */}
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)}>
        <div className="p-6">
          {/* STEP 1: Choose mode (only when creating new) */}
          {!editing && createMode === null ? (
            <div>
              <h2 className="text-lg font-bold mb-5" style={{fontFamily:"'JetBrains Mono',monospace",color:"#e2e8f0"}}>¿Qué querés crear? ⚡</h2>
              <div className="space-y-3">
                <button onClick={()=>{setCreateMode("text");setFt("expansion");}} className="w-full p-5 rounded-xl text-left transition-all hover:translate-y-[-1px] flex items-center gap-4" style={{background:"linear-gradient(135deg,rgba(34,211,238,0.06),rgba(34,211,238,0.02))",border:"1px solid rgba(34,211,238,0.2)"}}>
                  <span className="text-3xl">💬</span>
                  <div><div className="text-base font-bold" style={{color:"#22d3ee"}}>Texto rápido</div><p className="text-xs mt-1" style={{color:"#64748b"}}>Escribís un trigger como <strong style={{color:"#22d3ee"}}>/firma</strong> y se reemplaza automáticamente por un texto largo. Funciona en cualquier app.</p></div>
                </button>
                <button onClick={()=>{setCreateMode("hotkey");setFt("snippet");}} className="w-full p-5 rounded-xl text-left transition-all hover:translate-y-[-1px] flex items-center gap-4" style={{background:"linear-gradient(135deg,rgba(56,189,248,0.06),rgba(56,189,248,0.02))",border:"1px solid rgba(56,189,248,0.2)"}}>
                  <span className="text-3xl">⌨️</span>
                  <div><div className="text-base font-bold" style={{color:"#38bdf8"}}>Atajo de teclado</div><p className="text-xs mt-1" style={{color:"#64748b"}}>Presionás una combinación como <strong style={{color:"#38bdf8"}}>Ctrl+Shift+M</strong> y ejecuta una acción: pegar texto, buscar, abrir algo o correr un comando.</p></div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-5">
                {!editing && <button onClick={()=>setCreateMode(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors" style={{color:"#64748b",border:"1px solid #1e293b"}}>←</button>}
                <h2 className="text-lg font-bold" style={{fontFamily:"'JetBrains Mono',monospace",color:"#e2e8f0"}}>
                  {editing?"Editar":createMode==="text"?"💬 Texto rápido":"⌨️ Atajo"} ⚡
                </h2>
              </div>

              <div className="space-y-4">
                <div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Nombre</label>
                  <input type="text" value={fn} onChange={e=>setFn(e.target.value)} placeholder={createMode==="text"?"Ej: Firma email":"Ej: Buscar en Maps"} className="w-full h-10 rounded-lg px-3 text-sm outline-none" style={inp}/></div>

                {/* TEXT EXPANSION FIELDS */}
                {createMode==="text" && <>
                  <div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Trigger (lo que escribís)</label>
                    <input type="text" value={fTrigger} onChange={e=>setFTrigger(e.target.value.replace(/\s/g,''))} placeholder="/firma" className="w-full h-10 rounded-lg px-3 text-sm outline-none" style={{...inp,fontFamily:"'JetBrains Mono',monospace"}}/>
                    <p className="text-[10px] mt-1.5" style={{color:"#475569"}}>💡 Usá prefijo <strong style={{color:"#22d3ee"}}>/</strong> o <strong style={{color:"#22d3ee"}}>;</strong> para evitar triggers accidentales. Ej: /firma, /ok, ;dir</p></div>
                  <div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Texto que se expande</label>
                    <textarea value={fSnippet} onChange={e=>setFSnippet(e.target.value)} placeholder="El texto completo..." rows={4} className="w-full rounded-lg p-3 text-sm outline-none resize-none" style={{...inp,fontFamily:"'JetBrains Mono',monospace"}}/></div>
                </>}

                {/* HOTKEY FIELDS */}
                {createMode==="hotkey" && <>
                  <div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Tipo de acción</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[["snippet","✍️","Pegar texto","#38bdf8"],["open","🚀","Abrir","#94a3b8"],["search","🔍","Buscar","#60a5fa"],["command","⚡","Comando","#a78bfa"]].map(([k,ic,lb,cl])=>
                        <button key={k} onClick={()=>setFt(k)} className="h-10 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1" style={{background:ft===k?`${cl}15`:"rgba(15,23,42,0.5)",border:`1px solid ${ft===k?cl:"#1e293b"}`,color:ft===k?cl:"#64748b"}}>{ic} {lb}</button>
                      )}
                    </div></div>
                  <KeyRecorder keys={fk} onChange={setFk} isMac={isMac}/>

                  {ft==="snippet"&&<div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Texto a pegar</label>
                    <textarea value={fSnippet} onChange={e=>setFSnippet(e.target.value)} placeholder="El texto..." rows={3} className="w-full rounded-lg p-3 text-sm outline-none resize-none" style={{...inp,fontFamily:"'JetBrains Mono',monospace"}}/></div>}

                  {ft==="open"&&<div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>URL o ruta</label>
                    <input type="text" value={fOpen} onChange={e=>setFOpen(e.target.value)} placeholder="https://notion.so" className="w-full h-10 rounded-lg px-3 text-sm outline-none" style={{...inp,fontFamily:"'JetBrains Mono',monospace"}}/></div>}

                  {ft==="search"&&<div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Buscador</label>
                    <div className="grid grid-cols-4 gap-2">{SEARCH_ENGINES.map(e=><button key={e.id} onClick={()=>setFEngine(e.id)} className="h-9 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1" style={{background:fEngine===e.id?"rgba(37,99,235,0.12)":"rgba(15,23,42,0.5)",border:`1px solid ${fEngine===e.id?"#2563eb":"#1e293b"}`,color:fEngine===e.id?"#60a5fa":"#64748b"}}>{e.icon} {e.label}</button>)}</div>
                    {fEngine==="custom"&&<input type="text" value={fCustom} onChange={e=>setFCustom(e.target.value)} placeholder="https://ejemplo.com/search?q={query}" className="w-full h-10 rounded-lg px-3 text-sm outline-none mt-2" style={{...inp,fontFamily:"'JetBrains Mono',monospace"}}/>}</div>}

                  {ft==="command"&&<div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Comando</label>
                    <input type="text" value={fCmd} onChange={e=>setFCmd(e.target.value)} placeholder="cmd /c ipconfig | clip" className="w-full h-10 rounded-lg px-3 text-sm outline-none" style={{...inp,fontFamily:"'JetBrains Mono',monospace"}}/></div>}
                </>}

                <div><label className="text-xs font-medium block mb-1.5" style={{color:"#94a3b8"}}>Descripción</label>
                  <input type="text" value={fd} onChange={e=>setFd(e.target.value)} placeholder="Breve descripción" className="w-full h-10 rounded-lg px-3 text-sm outline-none" style={inp}/></div>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={()=>setShowModal(false)} className="flex-1 h-10 rounded-lg text-sm font-medium" style={{background:"rgba(15,23,42,0.6)",border:"1px solid #1e293b",color:"#64748b"}}>Cancelar</button>
                <button onClick={handleSave} disabled={!canSave()} className="flex-1 h-10 rounded-lg text-sm font-semibold transition-all" style={{background:canSave()?"linear-gradient(135deg,#1d4ed8,#2563eb)":"#1e293b",color:canSave()?"#fff":"#475569",boxShadow:canSave()?"0 4px 12px rgba(37,99,235,0.2)":"none"}}>{editing?"Guardar":"Crear"} ⚡</button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ═══ TEMPLATES MODAL ═══ */}
      <Modal isOpen={showTemplates} onClose={()=>setShowTemplates(false)}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-2" style={{fontFamily:"'JetBrains Mono',monospace",color:"#e2e8f0"}}>📋 Templates</h2>
          <p className="text-xs mb-5" style={{color:"#64748b"}}>Textos rápidos listos para usar. Hacé click en + para agregar.</p>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {TEMPLATE_PACKS.map(pack=>(
              <div key={pack.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold" style={{color:"#e2e8f0"}}>{pack.name}</span>
                  <span className="text-[10px]" style={{color:"#475569"}}>— {pack.desc}</span>
                </div>
                <div className="space-y-1.5">
                  {pack.templates.map((t,i)=>{
                    const exists=shortcuts.some(s=>s.trigger===t.trigger);
                    return <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{background:"rgba(15,23,42,0.6)",border:"1px solid #1e293b"}}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold" style={{color:"#e2e8f0"}}>{t.name}</span>
                          <TriggerBadge trigger={t.trigger}/>
                        </div>
                        <p className="text-[11px] truncate" style={{color:"#64748b"}}>{t.text}</p>
                      </div>
                      <button onClick={()=>addTemplate(t)} disabled={exists} className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                        style={exists?{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.15)",color:"#34d399"}:{background:"rgba(37,99,235,0.1)",border:"1px solid rgba(37,99,235,0.2)",color:"#60a5fa"}}>
                        {exists?"✓":"+"}
                      </button>
                    </div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ═══ SETTINGS MODAL ═══ */}
      <Modal isOpen={showSettings} onClose={()=>setShowSettings(false)}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-5" style={{fontFamily:"'JetBrains Mono',monospace",color:"#e2e8f0"}}>⚙️ Configuración</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{background:"rgba(15,23,42,0.6)",border:"1px solid #1e293b"}}>
              <div>
                <div className="text-sm font-semibold" style={{color:"#e2e8f0"}}>Iniciar con {isMac?"macOS":"Windows"}</div>
                <p className="text-xs mt-0.5" style={{color:"#64748b"}}>NewenKey se abre automáticamente al prender la PC</p>
              </div>
              <button onClick={toggleAutoStart} className="w-10 h-5 rounded-full relative transition-all duration-300"
                style={{background:autoStart?"linear-gradient(90deg,#0891b2,#22d3ee)":"#1e293b"}}>
                <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all duration-300"
                  style={{background:autoStart?"#e2e8f0":"#475569",left:autoStart?"22px":"2px"}}/>
              </button>
            </div>
            <div className="p-4 rounded-xl" style={{background:"rgba(15,23,42,0.6)",border:"1px solid #1e293b"}}>
              <div className="text-sm font-semibold mb-1" style={{color:"#e2e8f0"}}>Acerca de</div>
              <p className="text-xs" style={{color:"#64748b"}}>NewenKey v1.0 · by gbull</p>
              <p className="text-xs mt-1" style={{color:"#475569"}}>"Newen" significa fuerza, energía y poder en mapudungun. Cada atajo que creás canaliza tu newen digital.</p>
              <a href="https://www.instagram.com/gonzabull.ai/" target="_blank" rel="noopener" className="mt-3 w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80" style={{background:"linear-gradient(135deg,rgba(131,58,180,0.15),rgba(253,29,29,0.1))",border:"1px solid rgba(131,58,180,0.2)",color:"#c084fc",textDecoration:"none"}}>📸 @gonzabull.ai</a>
            </div>
          </div>
        </div>
      </Modal>

      {/* ═══ IMPORT/EXPORT MODAL ═══ */}
      <Modal isOpen={showExport} onClose={()=>setShowExport(false)}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-5" style={{fontFamily:"'JetBrains Mono',monospace",color:"#e2e8f0"}}>Importar / Exportar</h2>

          {/* Import */}
          <div className="mb-4 p-4 rounded-xl" style={{background:"rgba(34,211,238,0.04)",border:"1px solid rgba(34,211,238,0.15)"}}>
            <div className="text-sm font-semibold mb-1" style={{color:"#22d3ee"}}>📥 Importar atajos</div>
            <p className="text-xs mb-3" style={{color:"#64748b"}}>Cargá un archivo .json con atajos de otro usuario o de un pack descargado. Se agregan a los que ya tenés.</p>
            <button onClick={handleImportJSON} className="w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.2)",color:"#22d3ee"}}>📂 Abrir archivo .json</button>
          </div>

          {/* Export JSON */}
          <div className="mb-4 p-4 rounded-xl" style={{background:"rgba(96,165,250,0.04)",border:"1px solid rgba(96,165,250,0.15)"}}>
            <div className="text-sm font-semibold mb-1" style={{color:"#60a5fa"}}>📤 Exportar tus atajos</div>
            <p className="text-xs mb-3" style={{color:"#64748b"}}>Guardá todos tus atajos como .json para compartir o hacer backup. Otros usuarios pueden importarlo en su NewenKey.</p>
            <button onClick={handleExportJSON} className="w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.2)",color:"#60a5fa"}}>💾 Guardar como .json</button>
          </div>

          {/* Export AHK */}
          <div className="p-4 rounded-xl" style={{background:"rgba(15,23,42,0.6)",border:"1px solid #1e293b"}}>
            <div className="text-sm font-semibold mb-1" style={{color:"#94a3b8"}}>📄 Exportar a AutoHotkey</div>
            <p className="text-xs mb-3" style={{color:"#475569"}}>Para usuarios avanzados de Windows. Genera un script .ahk compatible.</p>
            <button onClick={handleExport} className="w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
              style={{background:"rgba(15,23,42,0.8)",border:"1px solid #1e293b",color:"#64748b"}}>{IS_ELECTRON?"💾 Guardar .ahk":"📋 Copiar .ahk"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
