// src/components/layout/LoginPage.tsx
import React, { useState } from "react";
import Image from "next/image"; // Import Image dari Next.js
import { PEOPLE } from "@/lib/data";
import {
  Skull,
  Scroll,
  Eye,
  EyeOff,
  Sword,
  Star,
  Crown,
  ShieldAlert,
  Gem,
} from "lucide-react";

// --- LINK GIF ---
const GIF_NORMAL = "/images/bocchi.gif";
const GIF_ERROR = "/images/Konosuba.gif";
const GIF_SUCCESS = "/images/anya-forger.gif";

// --- BACKGROUNDS ---
const BG_PATTERN = "/images/fragrant.gif";

interface LoginPageProps {
  onLogin: (user: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedUser, setSelectedUser] = useState(PEOPLE[0]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  // Hapus state 'mounted' dan useEffect karena tidak dipakai di JSX

  // Cek apakah user adalah Zaenal (Guild Master)
  const isMaster = selectedUser === "Zaenal";

  // --- DATABASE CREDENTIALS ---
  const CREDENTIALS: Record<string, string> = {
    Zaenal: "Zaenal_1102",
    Rafhan: "101012300238",
    Inas: "104012300268",
    Erpan: "101012300308",
    Hatta: "101012330137",
    Uki: "101012300169",
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = CREDENTIALS[selectedUser];

    if (password === correctPassword) {
      setStatus("success");
      setTimeout(() => {
        onLogin(selectedUser);
      }, 2500);
    } else {
      const errorMsg = isMaster
        ? "Eitssss ga boleh yaaaaaaaaa, meskipun bisa sih inspect web, karena hardcoded"
        : "ih tolol dah, masa nim sendiri lupa.";

      setError(errorMsg);
      setStatus("error");

      setTimeout(() => {
        setStatus("idle");
        setError("");
      }, 3000);
    }
  };

  const currentGif =
    status === "success"
      ? GIF_SUCCESS
      : status === "error"
        ? GIF_ERROR
        : GIF_NORMAL;

  // --- THEME CONFIGURATION (Dynamic Style) ---
  const theme = isMaster
    ? {
        // Tema ROYAL (Zaenal)
        bg: "bg-[#1a0b2e]",
        cardBg: "bg-[#2a1b3d]",
        cardBorder: "border-[#ffd700]", // Emas
        text: "text-[#ffd700]",
        subText: "text-[#d8b4fe]",
        inputBg: "bg-[#4a3b5d]",
        inputText: "text-[#ffd700]",
        inputBorder: "border-[#ffd700]",
        button:
          "bg-gradient-to-r from-purple-700 to-indigo-900 border-purple-400",
        buttonText: "text-white",
        shadow: "shadow-[0_0_50px_rgba(255,215,0,0.3)]",
        icon: <Crown className="animate-bounce" color="#ffd700" size={28} />,
      }
    : {
        // Tema ADVENTURER (User Lain)
        bg: "bg-[#2d1b2e]",
        cardBg: "bg-[#fdf6e3]", // Kertas
        cardBorder: "border-[#5d4037]", // Kayu Coklat
        text: "text-[#5d4037]",
        subText: "text-[#8d6e63]",
        inputBg: "bg-white",
        inputText: "text-[#5d4037]",
        inputBorder: "border-[#5d4037]",
        button: "bg-[#ff4081] border-[#c2185b]", // Pink Konosuba
        buttonText: "text-white",
        shadow: "shadow-2xl",
        icon: <Scroll className="text-[#8d6e63]" size={28} />,
      };

  return (
    <div
      className={`flex min-h-screen w-full items-center justify-center p-4 font-sans overflow-hidden relative transition-colors duration-1000 ${theme.bg}`}
    >
      {/* BACKGROUND ANIMATION (Moving Sky) */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
        <div
          className="absolute inset-0 animate-slide-diagonal"
          style={{ backgroundImage: `url(${BG_PATTERN})` }}
        ></div>
        {isMaster && (
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 via-transparent to-transparent animate-pulse"></div>
        )}
      </div>

      {/* FLOATING PARTICLES */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-10 left-10 animate-spin-slow opacity-60 ${
            isMaster ? "text-yellow-400" : "text-pink-400"
          }`}
        >
          <Star size={40} />
        </div>
        <div
          className={`absolute bottom-20 right-20 animate-bounce opacity-60 ${
            isMaster ? "text-purple-400" : "text-cyan-400"
          }`}
        >
          <Star size={60} />
        </div>
      </div>

      {/* CARD WRAPPER - Ditambah mt-24 untuk fix layout */}
      <div
        className={`relative w-full max-w-md transform transition-all duration-500 mt-24 ${
          status === "error" ? "animate-shake" : ""
        }`}
      >
        {/* AVATAR/GIF DISPLAY (CIRCLE) */}
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 z-20 w-48 h-48 group perspective-1000">
          <div
            className={`absolute inset-0 rounded-full border-4 border-dashed animate-spin-slow ${
              isMaster ? "border-yellow-500" : "border-white/50"
            }`}
          ></div>

          <div
            className={`relative w-full h-full rounded-full border-4 overflow-hidden bg-black transition-all duration-300 transform group-hover:scale-105 ${
              status === "error"
                ? "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]"
                : status === "success"
                  ? "border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.6)]"
                  : isMaster
                    ? "border-yellow-400 shadow-[0_0_40px_rgba(255,215,0,0.5)]"
                    : "border-white shadow-xl"
            }`}
          >
            {/* Menggunakan Next.js Image Component */}
            <Image
              src={currentGif}
              alt="Reaction"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority // Memastikan gambar loading cepat
            />
          </div>

          {status === "error" && (
            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-2 rounded-full border-2 border-white animate-bounce">
              <ShieldAlert size={20} />
            </div>
          )}
        </div>

        {/* MAIN QUEST BOARD */}
        <div
          className={`relative rounded-lg border-[6px] p-8 pt-24 transition-all duration-500 ${theme.cardBg} ${theme.cardBorder} ${theme.shadow}`}
        >
          {!isMaster && (
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] rounded-lg"></div>
          )}

          <div className="text-center mb-8 relative z-10">
            <h1
              className={`text-3xl font-black uppercase tracking-[0.2em] drop-shadow-sm flex items-center justify-center gap-3 ${theme.text}`}
            >
              {theme.icon}
              {isMaster ? "Royal Access" : "Guild Login"}
            </h1>
            <p
              className={`text-xs font-bold mt-2 uppercase tracking-widest ${theme.subText}`}
            >
              {isMaster
                ? "Dominion of the Guild Master"
                : "Adventure Awaits, Hero!"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="group">
              <label
                className={`block text-[10px] font-black uppercase mb-1 tracking-widest ${theme.text}`}
              >
                {isMaster ? "Identify Sovereign" : "Adventurer Name"}
              </label>
              <div className="relative">
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value);
                    setError("");
                    setPassword("");
                    setStatus("idle");
                  }}
                  className={`w-full appearance-none rounded-none border-2 px-4 py-3 font-bold text-lg transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-opacity-50 ${theme.inputBg} ${theme.inputBorder} ${theme.inputText}`}
                >
                  {PEOPLE.map((p) => (
                    <option key={p} value={p}>
                      {p === "Zaenal" ? "👑 Zaenal (Guild Master)" : `⚔️ ${p}`}
                    </option>
                  ))}
                </select>
                <div
                  className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme.text}`}
                >
                  ▼
                </div>
              </div>
            </div>

            <div className="group">
              <label
                className={`block text-[10px] font-black uppercase mb-1 tracking-widest ${theme.text}`}
              >
                {isMaster ? "Royal Decree (NIM)" : "Secret Spell (NIM)"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setStatus("idle");
                  }}
                  className={`w-full rounded-none border-2 px-4 py-3 font-bold text-lg transition-all focus:outline-none focus:ring-4 focus:ring-opacity-50 placeholder:opacity-50 ${theme.inputBg} ${theme.inputBorder} ${theme.inputText}`}
                  placeholder={isMaster ? "********" : "Enter Spell..."}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform ${theme.text}`}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className={`border-l-4 p-3 relative overflow-hidden animate-pulse ${
                  isMaster
                    ? "bg-red-900/50 border-red-500"
                    : "bg-red-100 border-red-500"
                }`}
              >
                <p
                  className={`text-sm font-bold flex items-center gap-2 ${
                    isMaster ? "text-red-200" : "text-red-700"
                  }`}
                >
                  <Skull size={18} /> {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "success"}
              className={`w-full relative overflow-hidden group border-b-4 border-r-4 active:border-0 active:translate-y-1 py-4 text-xl font-black tracking-[0.25em] uppercase transition-all hover:brightness-110 ${theme.button} ${theme.buttonText}`}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {status === "success" ? (
                  <>💥 EXPLOSION! 💥</>
                ) : (
                  <>
                    {isMaster ? (
                      <Gem size={24} />
                    ) : (
                      <Sword className="group-hover:rotate-45 transition-transform" />
                    )}
                    {isMaster ? "ENTER REALM" : "ACCEPT QUEST"}
                  </>
                )}
              </span>
            </button>
          </form>

          <div
            className={`mt-8 text-center border-t-2 border-dashed pt-4 ${
              isMaster ? "border-yellow-700" : "border-[#8d6e63]"
            }`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${theme.subText}`}
            >
              System Version 1.0 •{" "}
              {isMaster
                ? "Hehehehe gabut aja, keasikan bikin login page."
                : "Hehehehe gabut aja kek begini loginnyaa"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) rotate(-2deg); }
          20%, 40%, 60%, 80% { transform: translateX(5px) rotate(2deg); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes spin-slow {
            animation: spin 10s linear infinite;
        }
        @keyframes slide-diagonal {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
        }
        .animate-slide-diagonal {
            animation: slide-diagonal 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
