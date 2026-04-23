'use client';

const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === 'true';

export default function ShowcaseBanner() {
  if (!SHOWCASE_MODE) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-amber-200/40 bg-amber-400/95 px-4 py-2 text-xs font-semibold text-amber-950 shadow-lg shadow-amber-500/20 backdrop-blur-sm">
      Modo Demonstração: dados fictícios e comportamento não produtivo
    </div>
  );
}