import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { CartProvider } from '../lib/cart';
import { CartLink } from './cart-link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shop học tập',
  description: 'Next.js + NestJS + Stripe',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <CartProvider>
          <header className="bar">
            <div className="container">
              <Link href="/" className="logo">
                🛍️ Shop học tập
              </Link>
              <nav style={{ display: 'flex', gap: 16 }}>
                <Link href="/orders">Đơn hàng</Link>
                <CartLink />
              </nav>
            </div>
          </header>
          <main className="container">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
