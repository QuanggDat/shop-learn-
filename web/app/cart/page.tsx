'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../lib/cart';
import { createCheckoutSession, formatPrice } from '../../lib/api';

export default function CartPage() {
  const { lines, total, setQuantity } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(
        lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      );
      window.location.href = url; // chuyển sang trang thanh toán của Stripe
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      setLoading(false);
    }
  }

  if (lines.length === 0) {
    return (
      <>
        <h1>Giỏ hàng</h1>
        <p>
          Giỏ hàng trống. <Link href="/">Tiếp tục mua sắm</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Giỏ hàng</h1>
      <div className="panel">
        {lines.map(({ product, quantity }) => (
          <div className="row" key={product.id}>
            <div className="grow">
              <strong>{product.name}</strong>
              <div className="muted">{formatPrice(product.price)}</div>
            </div>
            <div className="qty">
              <button
                type="button"
                className="ghost"
                onClick={() => setQuantity(product.id, quantity - 1)}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                className="ghost"
                onClick={() => setQuantity(product.id, quantity + 1)}
              >
                +
              </button>
            </div>
            <div className="price">{formatPrice(product.price * quantity)}</div>
          </div>
        ))}
        <div className="total">
          <span>Tổng</span>
          <span>{formatPrice(total)}</span>
        </div>
        <button type="button" onClick={checkout} disabled={loading}>
          {loading ? 'Đang chuyển sang Stripe…' : 'Thanh toán với Stripe'}
        </button>
        {error && <p className="error">{error}</p>}
        <p className="muted">
          Thẻ test: 4242 4242 4242 4242, hạn bất kỳ trong tương lai, CVC bất kỳ.
        </p>
      </div>
    </>
  );
}
