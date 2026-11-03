import { formatPrice, getProducts } from '../lib/api';
import { AddToCart } from './add-to-cart';

// Server Component: gọi thẳng API Nest ở phía server, không cần useEffect.
export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      <h1>Sản phẩm</h1>
      <div className="grid">
        {products.map((p) => (
          <div className="card" key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.name} />
            <div className="body">
              <strong>{p.name}</strong>
              <span className="muted">{p.description}</span>
              <span className="price">{formatPrice(p.price)}</span>
              <AddToCart product={p} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
