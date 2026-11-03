import { Injectable, NotFoundException } from '@nestjs/common';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // đơn vị nhỏ nhất của tiền tệ (USD: cent) - Stripe cũng dùng như vậy
  image: string;
}

// Dữ liệu mẫu cố định cho dễ học. Thực tế sẽ lấy từ DB.
const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Áo thun trắng',
    description: 'Cotton 100%, form rộng.',
    price: 1500,
    image: 'https://picsum.photos/seed/shirt/400/300',
  },
  {
    id: 'p2',
    name: 'Cốc sứ',
    description: 'Cốc sứ 350ml.',
    price: 800,
    image: 'https://picsum.photos/seed/mug/400/300',
  },
  {
    id: 'p3',
    name: 'Balo laptop',
    description: 'Chống nước, vừa laptop 15 inch.',
    price: 4500,
    image: 'https://picsum.photos/seed/bag/400/300',
  },
  {
    id: 'p4',
    name: 'Sổ tay',
    description: 'Giấy dày 120gsm, 200 trang.',
    price: 600,
    image: 'https://picsum.photos/seed/notebook/400/300',
  },
];

@Injectable()
export class ProductsService {
  findAll(): Product[] {
    return PRODUCTS;
  }

  findOne(id: string): Product {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) throw new NotFoundException(`Không có sản phẩm ${id}`);
    return p;
  }
}
