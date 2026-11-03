'use client';

import { useCart } from '../lib/cart';
import type { Product } from '../lib/api';

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  return (
    <button type="button" onClick={() => add(product)}>
      Thêm vào giỏ
    </button>
  );
}
