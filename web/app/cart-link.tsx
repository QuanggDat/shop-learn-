'use client';

import Link from 'next/link';
import { useCart } from '../lib/cart';

export function CartLink() {
  const { count } = useCart();
  return <Link href="/cart">Giỏ hàng ({count})</Link>;
}
