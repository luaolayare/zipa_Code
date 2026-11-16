import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';

import './globals.css';

// Las mismas familias que las apps (packages/shared/src/theme.ts).
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const text = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-text' });

export const metadata: Metadata = {
  title: 'Zipa lo tiene · Panel del equipo',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
