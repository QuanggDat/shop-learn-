# Shop học tập: Next.js + NestJS + Stripe

Dự án học cách làm thanh toán online với Stripe Checkout. Người mua chọn hàng, trả tiền trên trang của Stripe, server nhận webhook và đánh dấu đơn là đã thanh toán.

- `api/`: NestJS, cổng 4000. Sản phẩm, đơn hàng (file JSON), tạo Stripe Checkout Session, nhận webhook.
- `web/`: Next.js, cổng 3000. Danh sách sản phẩm, giỏ hàng, trang thành công, danh sách đơn.

Muốn hiểu sâu cách thanh toán hoạt động, đọc [HUONG-DAN.md](HUONG-DAN.md).

## Kiến trúc

```text
Trình duyệt ──► Next.js (web :3000) ──HTTP──► NestJS (api :4000) ──secret key──► Stripe
      │                                              ▲                              │
      └──────── chuyển hướng sang trang trả tiền ────┼──────────────────────────────┤
                                                     └────── webhook (có chữ ký) ◄──┘
```

Web chỉ nói chuyện với API. Chỉ API giữ secret key và tin được Stripe.

## Luồng thanh toán

1. Web gửi `[{ productId, quantity }]` tới `POST /checkout/session`.
2. API lấy giá từ server (không tin giá client), tạo đơn `pending`, tạo Stripe Checkout Session có `metadata.orderId`.
3. API trả `{ url, orderId }`. Web chuyển hướng người mua sang `checkout.stripe.com`.
4. Người mua trả tiền. Stripe chuyển hướng về `/success?orderId=...`.
5. Cùng lúc, Stripe gọi `POST /checkout/webhook` (sự kiện `checkout.session.completed`). API kiểm tra chữ ký rồi đổi đơn thành `paid`.
6. Trang `/success` hỏi lại `GET /orders/:id` mỗi 1,5 giây (tối đa 20 lần) cho tới khi thấy `paid`.

Chỉ webhook mới được đổi đơn sang `paid`. Việc người mua quay về `/success` không chứng minh gì.

Trạng thái đơn: `pending` → `paid` (sự kiện `completed`) hoặc `expired` (sự kiện `expired`).

## Cấu trúc thư mục

```text
api/src/
  main.ts        bật CORS, ValidationPipe, rawBody (cần cho xác thực chữ ký)
  products/      4 sản phẩm mẫu, giá bằng cent
  orders/        đọc/ghi api/data/orders.json
  checkout/      tạo session + nhận webhook
web/
  lib/api.ts     hàm gọi API, formatPrice
  lib/cart.tsx   giỏ hàng (Context + localStorage)
  app/           / (sản phẩm), /cart, /success, /orders
```

## Chạy thử

Cần Node 20+ và tài khoản Stripe (chế độ Test).

1. Cài phụ thuộc: `npm install` trong cả `api/` và `web/`.
2. Lấy secret key ở <https://dashboard.stripe.com/test/apikeys> (dạng `sk_test_...`).
3. Tạo `api/.env` từ `api/.env.example` và điền `STRIPE_SECRET_KEY`.
4. Cài Stripe CLI (`winget install Stripe.StripeCli`), mở terminal mới rồi chạy `stripe login`.
5. Chạy chuyển tiếp webhook và giữ terminal này mở:

   ```bash
   stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:4000/checkout/webhook
   ```

   Copy `whsec_...` ở dòng đầu vào `STRIPE_WEBHOOK_SECRET` trong `api/.env`.
6. Terminal 1: `cd api && npm run dev` (khởi động lại API mỗi khi đổi `.env`).
7. Terminal 2: `cd web && npm run dev`.
8. Mở <http://localhost:3000>, thêm hàng, thanh toán bằng thẻ `4242 4242 4242 4242`, hạn bất kỳ trong tương lai, CVC bất kỳ.
9. Mở <http://localhost:3000/orders>: đơn phải ở trạng thái "Đã thanh toán".

Biến môi trường:

| File | Biến | Ý nghĩa |
| --- | --- | --- |
| `api/.env` | `PORT` | Cổng API (4000) |
| `api/.env` | `WEB_URL` | Địa chỉ web, dùng cho CORS và `success_url` |
| `api/.env` | `STRIPE_SECRET_KEY` | Khóa `sk_test_...` |
| `api/.env` | `STRIPE_WEBHOOK_SECRET` | `whsec_...` từ `stripe listen` |
| `web/.env` | `NEXT_PUBLIC_API_URL` | Địa chỉ API (mặc định `http://localhost:4000`) |

## Gỡ lỗi

| Triệu chứng | Nguyên nhân thường gặp |
| --- | --- |
| `/success` cứ "Đang xác nhận…" | `stripe listen` chưa chạy hoặc `STRIPE_WEBHOOK_SECRET` sai (terminal hiện `[400]`) |
| Đổi `.env` không có tác dụng | Chế độ watch không nạp lại `.env`, hãy chạy lại API |
| Mỗi phiên `stripe listen` ra `whsec` khác | Bình thường, cập nhật lại `api/.env` |
| Web báo không tải được sản phẩm | API chưa chạy ở cổng 4000 |

## Giới hạn của bản học tập

- Đơn lưu trong file JSON, không an toàn khi ghi đồng thời. Dự án thật dùng cơ sở dữ liệu.
- `GET /orders` công khai và trả mọi đơn. Cần đăng nhập và lọc theo người dùng.
- Chưa lưu `event.id` để bỏ qua webhook lặp (hiện việc đặt `paid` nhiều lần vẫn cho kết quả đúng).
- Khi triển khai: đăng ký endpoint webhook HTTPS trong Stripe Dashboard, dùng khóa `sk_live_...` qua biến môi trường, không để khóa trong repo.
