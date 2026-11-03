export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // cent
  image: string;
}

export interface Order {
  id: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: string;
}

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không tải được sản phẩm');
  return res.json();
}

export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${API_URL}/orders/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không tải được đơn hàng');
  return res.json();
}

export async function createCheckoutSession(items: { productId: string; quantity: number }[]) {
  const res = await fetch(`${API_URL}/checkout/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Không tạo được phiên thanh toán');
  return (await res.json()) as { url: string; orderId: string };
}
