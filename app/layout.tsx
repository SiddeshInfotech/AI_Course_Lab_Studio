import type {Metadata} from 'next';
import { Nunito, Playfair_Display } from 'next/font/google';
import './globals.css'; // Global styles

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'AI Lab Studio',
  description: 'Continue your journey into the world of AI',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${nunito.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
