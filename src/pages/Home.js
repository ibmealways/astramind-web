import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadCreatorMemory } from "../core/memory/creatorMemory.js";
import { useOSMode } from "../context/ModeContext.js";
import { OS_MODES } from "../core/os/modes.js";
import "../styles/home-realm.css";
import "../styles/home-language.css";

const PORTALS = [
  { to: "/chat", icon: "✦", label: "AstraMind Chat", note: "Think, plan, and create with persistent intelligence.", tone: "cyan" },
  { to: "/control-center", icon: "⚡", label: "Mission Control", note: "Launch autonomous research and production missions.", tone: "violet" },
  { to: "/content", icon: "◈", label: "Creator Studio", note: "Shape scripts, images, audio, video, books, and campaigns.", tone: "magenta" },
  { to: "/research", icon: "⌁", label: "Research OS", note: "Transform live intelligence into persistent artifacts.", tone: "blue" },
  { to: "/content-lab", icon: "⟁", label: "Experiment Lab", note: "Explore science, astronomy, engineering, and future studies.", tone: "emerald" },
  { to: "/finance", icon: "◇", label: "Finance OS", note: "See the signals behind your creator economy.", tone: "gold" },
];

const LANGUAGES = [["en","English"],["es","Español"],["fr","Français"],["de","Deutsch"],["pt","Português"],["ar","العربية"],["hi","हिन्दी"],["zh","中文"],["ja","日本語"],["ko","한국어"]];
const HOME_COPY = {
  en:["WELCOME BEYOND THE INTERFACE","Your imagination","has an operating system.","Enter a living intelligence environment where ideas become missions, missions become artifacts, and every creation remembers what came before.","Enter AstraMind","Open my universe","Calibrate my realm","CHOOSE A PORTAL","Language"],
  es:["MÁS ALLÁ DE LA INTERFAZ","Tu imaginación","tiene un sistema operativo.","Entra en un entorno de inteligencia vivo donde las ideas se convierten en misiones y cada creación conserva su memoria.","Entrar a AstraMind","Abrir mi universo","Calibrar mi reino","ELIGE UN PORTAL","Idioma"],
  fr:["AU-DELÀ DE L’INTERFACE","Votre imagination","a son système d’exploitation.","Entrez dans un environnement intelligent vivant où les idées deviennent des missions et chaque création conserve sa mémoire.","Entrer dans AstraMind","Ouvrir mon univers","Calibrer mon monde","CHOISISSEZ UN PORTAIL","Langue"],
  de:["JENSEITS DER OBERFLÄCHE","Deine Vorstellungskraft","hat ein Betriebssystem.","Betritt eine lebendige Intelligenzumgebung, in der Ideen zu Missionen werden und jede Kreation sich erinnert.","AstraMind betreten","Mein Universum öffnen","Meine Welt kalibrieren","PORTAL AUSWÄHLEN","Sprache"],
  pt:["ALÉM DA INTERFACE","Sua imaginação","tem um sistema operacional.","Entre em um ambiente de inteligência vivo onde ideias viram missões e cada criação mantém sua memória.","Entrar no AstraMind","Abrir meu universo","Calibrar meu reino","ESCOLHA UM PORTAL","Idioma"],
  ar:["ما وراء الواجهة","خيالك","لديه نظام تشغيل.","ادخل بيئة ذكاء حية تتحول فيها الأفكار إلى مهام وتتذكر كل إبداعاتك ما سبقها.","ادخل AstraMind","افتح عالمي","عاير عالمي","اختر بوابة","اللغة"],
  hi:["इंटरफ़ेस से परे आपका स्वागत है","आपकी कल्पना","का अपना ऑपरेटिंग सिस्टम है।","एक जीवंत बुद्धिमत्ता संसार में प्रवेश करें जहाँ विचार मिशन बनते हैं और हर रचना अपनी यात्रा याद रखती है।","AstraMind में प्रवेश करें","मेरा ब्रह्मांड खोलें","मेरा संसार तैयार करें","एक पोर्टल चुनें","भाषा"],
  zh:["欢迎超越界面","你的想象力","拥有自己的操作系统。","进入一个有生命的智能环境，让创意成为任务，让每一次创作延续过去的记忆。","进入 AstraMind","打开我的宇宙","校准我的领域","选择入口","语言"],
  ja:["インターフェースの向こうへ","あなたの想像力には","オペレーティングシステムがある。","アイデアがミッションになり、すべての創作が過去を記憶する、生きた知性の世界へ。","AstraMind に入る","宇宙を開く","世界を調整する","ポータルを選択","言語"],
  ko:["인터페이스 너머에 오신 것을 환영합니다","당신의 상상력에는","운영체제가 있습니다.","아이디어가 미션이 되고 모든 창작이 이전 여정을 기억하는 살아 있는 지능 환경으로 들어오세요.","AstraMind 입장","나의 우주 열기","나의 영역 설정","포털 선택","언어"]
};

export default function Home() {
  const creator = loadCreatorMemory();
  const { setMode } = useOSMode();
  const realmRef = useRef(null);
  const [language, setLanguage] = useState(() => localStorage.getItem("astramind_language") || "en");
  const t = HOME_COPY[language] || HOME_COPY.en;

  useEffect(() => { setMode(OS_MODES.HOME); }, [setMode]);
  useEffect(() => { localStorage.setItem("astramind_language", language); document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr"; }, [language]);

  const moveLight = (event) => {
    const node = realmRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    node.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    node.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  };

  return (
    <main className="home-realm" ref={realmRef} onPointerMove={moveLight}>
      <div className="realm-stars realm-stars-near" aria-hidden="true" />
      <div className="realm-stars realm-stars-far" aria-hidden="true" />
      <div className="realm-aurora" aria-hidden="true" />
      <div className="realm-orbit realm-orbit-one" aria-hidden="true"><i /></div>
      <div className="realm-orbit realm-orbit-two" aria-hidden="true"><i /></div>

      <section className="realm-content">
        <div className="realm-topline"><div className="realm-status"><span /> ASTRAMIND CREATOR REALM · SYSTEM ONLINE</div><label className="realm-language">🌐 {t[8]}<select value={language} onChange={(event)=>setLanguage(event.target.value)}>{LANGUAGES.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select></label></div>
        <div className="realm-hero">
          <div className="realm-copy">
            <p className="realm-kicker">{t[0]}</p>
            <h1>{t[1]}<br /><em>{t[2]}</em></h1>
            <p className="realm-lead">{t[3]}</p>
            {creator ? <div className="realm-identity"><span className="realm-avatar">{String(creator.niche || "C").charAt(0).toUpperCase()}</span><div><small>REALM CALIBRATED FOR</small><strong>{creator.niche || "Creator"} · {creator.platform || "Multi-platform"} · {creator.tone || "Adaptive"}</strong></div></div> : <div className="realm-identity realm-identity-dim"><span className="realm-avatar">?</span><div><small>YOUR REALM IS UNCALIBRATED</small><strong>Define your Creator Identity to personalize AstraMind.</strong></div></div>}
            <div className="realm-actions"><Link className="realm-primary" to="/chat"><span>{t[4]}</span><b>→</b></Link><Link className="realm-secondary" to={creator ? "/creator-dashboard" : "/setup"}>{creator ? t[5] : t[6]}</Link></div>
          </div>

          <div className="realm-core" aria-label="AstraMind intelligence core visualization">
            <div className="core-halo core-halo-outer" /><div className="core-halo core-halo-middle" /><div className="core-halo core-halo-inner" />
            <div className="core-orb"><span>✦</span><small>ASTRAMIND</small></div>
            <div className="core-label core-label-one">MEMORY</div><div className="core-label core-label-two">RESEARCH</div><div className="core-label core-label-three">CREATION</div>
          </div>
        </div>

        <div className="realm-section-heading"><span>{t[7]}</span><p>Every workspace is connected through one continuous intelligence.</p></div>
        <div className="realm-portals">{PORTALS.map((portal, index) => <Portal key={portal.to} {...portal} index={index} />)}</div>
        <footer className="realm-footer"><span>AstraMind Technologies OS</span><i /> <span>Adaptive Creator Intelligence</span><i /> <span>{new Date().getFullYear()}</span></footer>
      </section>
    </main>
  );
}

function Portal({ to, icon, label, note, tone, index }) {
  return <Link to={to} className={`realm-portal portal-${tone}`} style={{ "--portal-delay": `${index * 70}ms` }}><div className="portal-light" /><span className="portal-index">0{index + 1}</span><div className="portal-icon">{icon}</div><h2>{label}</h2><p>{note}</p><b>OPEN PORTAL <span>↗</span></b></Link>;
}
