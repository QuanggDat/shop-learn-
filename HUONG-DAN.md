# Hướng dẫn: hiểu cách thanh toán trong dự án

Tài liệu này giải thích mã nguồn, cách dự án được dựng, và vì sao tiền được tính là "đã trả" ở server chứ không phải ở trình duyệt. Cách chạy dự án nằm trong [README.md](README.md).

## 1. Ý chính trong 4 câu

1. **Trình duyệt không bao giờ chạm vào thẻ.** Người mua nhập thẻ trên trang `checkout.stripe.com` do Stripe host. Code của bạn không thấy số thẻ.
2. **Giá do server quyết định.** Web chỉ gửi `productId` và `quantity`. API tự tra giá, nên không ai sửa giá bằng cách chỉnh request.
3. **"Đã thanh toán" chỉ được ghi khi Stripe báo về server qua webhook.** Việc người mua quay lại `/success` chưa chứng minh gì, vì ai cũng gõ được URL đó.
4. **Trang `/success` chỉ hỏi lại** trạng thái đơn cho tới khi thấy `paid`, vì webhook có thể đến trễ vài giây.

## 2. Kiến trúc: ai nói chuyện với ai

```text
 ┌────────────────────┐        ┌────────────────────────┐        ┌──────────────────────┐
 │  Next.js (web)     │  HTTP  │  NestJS (api)          │  SDK   │  Stripe              │
 │  cổng 3000         │───────►│  cổng 4000             │───────►│  (chế độ test)       │
 │                    │        │                        │ secret │                      │
 │  /          sản phẩm│        │  products  sản phẩm mẫu │  key   │  Trang thanh toán    │
 │  /cart      giỏ hàng│        │  orders    orders.json │        │  checkout.stripe.com │
 │  /success   chờ xác │◄───────│  checkout  session +   │◄───────│                      │
 │             nhận    │  JSON  │            webhook     │webhook │  Gửi sự kiện         │
 │  /orders    đơn hàng│        │                        │ (chữ ký)│  completed / expired │
 └─────────┬──────────┘        └────────────────────────┘        └──────────▲───────────┘
           │                                                                │
           └────── người mua được chuyển hướng sang Stripe để trả tiền ─────┘
                   rồi quay về /success
```

- Web chỉ nói chuyện với API. Chỉ API giữ secret key.
- Webhook đi từ Stripe về API, không đi qua trình duyệt, nên người mua không giả mạo được.
- Khi chạy trên máy bạn, **Stripe CLI** (`stripe listen`) nhận sự kiện từ Stripe rồi chuyển tiếp về `localhost:4000`. Khi chạy thật, Stripe gọi thẳng vào một URL HTTPS công khai.

## 3. Luồng thanh toán, từng bước

```text
 Trình duyệt (Next.js)           API (NestJS :4000)               Stripe
        │                               │                            │
  1     │── POST /checkout/session ────►│                            │
  2     │                               │  tra giá từ server         │
        │                               │  tạo đơn = pending         │
  3     │                               │── sessions.create ────────►│
  4     │                               │◄─────── session.url ───────│
  5     │◄───── { url, orderId } ───────│                            │
  6     │── chuyển hướng sang checkout.stripe.com ──────────────────►│
        │                               │                            │  người mua nhập thẻ
  7     │◄── redirect về /success?orderId=... ───────────────────────│
  8     │                               │◄── webhook: completed ─────│   ◄── bước quan trọng nhất
  9     │                               │  kiểm tra chữ ký           │
        │                               │  đơn = paid                │
 10     │── GET /orders/:id ───────────►│   (hỏi mỗi 1,5 giây)       │
 11     │◄───── status: "paid" ─────────│                            │
```

| Bước | Điều xảy ra | Code |
| --- | --- | --- |
| 1 | Bấm "Thanh toán với Stripe", web gửi `[{ productId, quantity }]` | `web/app/cart/page.tsx`, `web/lib/api.ts` |
| 2 | API tra giá bằng `ProductsService.findOne`, ghi đơn `pending` | `api/src/checkout/checkout.service.ts` (`createSession`) |
| 3 | Gọi `stripe.checkout.sessions.create` với `mode: 'payment'`, `line_items`, `metadata.orderId`, `success_url` | cùng file |
| 4 | Stripe trả `url` của trang thanh toán và `id` của session (API lưu vào đơn) | cùng file |
| 5 | API trả `{ url, orderId }` cho web | `checkout.controller.ts` |
| 6 | `window.location.href = url`. Người mua rời khỏi site của bạn | `web/app/cart/page.tsx` |
| 7 | Trả tiền xong, Stripe chuyển hướng về `success_url`. Trang hiện "Đang xác nhận…" | `web/app/success/success-view.tsx` |
| 8 | Stripe gửi `POST /checkout/webhook` với sự kiện `checkout.session.completed` và header `stripe-signature` | `checkout.controller.ts` |
| 9 | `constructEvent(rawBody, signature, secret)` kiểm tra chữ ký. Hợp lệ và `payment_status === 'paid'` thì đổi đơn thành `paid`. Sai chữ ký thì trả 400 | `checkout.service.ts` (`handleWebhook`) |
| 10 | `SuccessView` gọi `getOrder` tối đa 20 lần, cách nhau 1,5 giây | `success-view.tsx` |
| 11 | Thấy `paid` thì xóa giỏ hàng và hiện "Thanh toán thành công" | `success-view.tsx` |

Bước 7 và bước 8 xảy ra gần như cùng lúc nhưng độc lập nhau. Trình duyệt có thể về tới `/success` trước khi webhook kịp đến, đó là lý do có bước 10 và 11.

## 4. Vì sao phải có webhook

`/success` là URL công khai. Ai gõ `/success?orderId=...` cũng vào được mà không trả đồng nào. Người mua cũng có thể đóng tab ngay sau khi trả tiền và không bao giờ về trang đó. Cả hai trường hợp đều làm đơn sai nếu bạn dựa vào redirect.

Webhook đi thẳng từ Stripe tới server của bạn, kèm chữ ký tạo bằng một bí mật chỉ Stripe và bạn biết. Vì vậy nó là nguồn sự thật duy nhất cho câu hỏi "đơn này đã trả chưa".

Trạng thái của một đơn:

```text
                 checkout.session.completed
   ┌─────────┐ ──────────────────────────────► ┌──────┐
   │ pending │                                 │ paid │
   └─────────┘ ──────────────────────────────► ┌─────────┐
                 checkout.session.expired      │ expired │
                                               └─────────┘
```

Nếu người mua bỏ giữa chừng, đơn nằm ở `pending` cho tới khi Stripe gửi `expired` (mặc định sau 24 giờ).

## 5. Bản đồ mã nguồn

```text
shop-learn/
├── api/                          NestJS, cổng 4000
│   ├── .env                      khóa Stripe (đã nằm trong .gitignore)
│   └── src/
│       ├── main.ts               bật CORS, ValidationPipe, rawBody
│       ├── app.module.ts         ghép 3 module + ConfigModule
│       ├── products/             danh sách sản phẩm mẫu
│       ├── orders/               đọc/ghi data/orders.json
│       └── checkout/             tạo session + nhận webhook
└── web/                          Next.js, cổng 3000
    ├── lib/api.ts                hàm gọi API, formatPrice
    ├── lib/cart.tsx              giỏ hàng (Context + localStorage)
    └── app/
        ├── layout.tsx            khung trang, thanh điều hướng
        ├── page.tsx              trang chủ (Server Component)
        ├── cart/page.tsx         giỏ hàng + nút thanh toán
        ├── success/              trang chờ xác nhận (polling)
        └── orders/page.tsx       danh sách đơn
```

| File | Vai trò |
| --- | --- |
| `checkout.service.ts` | Trái tim của dự án: `createSession` dựng đơn và phiên thanh toán, `handleWebhook` xác thực và đánh dấu `paid`. |
| `checkout.dto.ts` | Quy định body hợp lệ: ít nhất 1 món, `quantity` là số nguyên từ 1 đến 20. `ValidationPipe` chặn phần còn lại. |
| `main.ts` | `rawBody: true` giữ nguyên bytes của request. Stripe tính chữ ký trên bytes gốc, nên nếu body bị parse thành JSON rồi dựng lại thì chữ ký sẽ sai. |
| `orders.service.ts` | Lưu đơn vào file JSON cho dễ học. Dự án thật dùng cơ sở dữ liệu. |
| `lib/cart.tsx` | Giỏ hàng nằm ở client, lưu `localStorage`. Chỉ đọc `localStorage` sau khi mount để tránh lệch hydration. |
| `app/page.tsx` | Server Component: `await getProducts()` chạy trên server của Next, không cần `useEffect`. |
| `success-view.tsx` | Client Component dùng `useSearchParams` và `setTimeout` để hỏi lại trạng thái đơn. |

## 6. Hai đoạn code quan trọng nhất

### 6.1. Giá lấy từ server

```ts
const items = dto.items.map((i) => {
  const p = this.products.findOne(i.productId);   // tra theo id
  return { productId: p.id, name: p.name,
           price: p.price, quantity: i.quantity }; // giá của server
});
```

Nếu dùng giá do client gửi lên, người mua mở DevTools, đổi `price` thành 1 và mua balo với 1 cent.

### 6.2. Xác thực webhook

```ts
event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
// ném lỗi nếu chữ ký sai -> API trả 400

if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status === 'paid' && session.metadata?.orderId) {
    this.orders.update(session.metadata.orderId, { status: 'paid' });
  }
}
```

Gửi webhook với chữ ký giả sẽ nhận về `400`. Đặt `status: 'paid'` nhiều lần cho cùng một đơn không gây hại, nên nếu Stripe gửi lại cùng sự kiện thì kết quả vẫn đúng.

## 7. Cách dự án được dựng

1. **Dữ liệu trước.** `products` trả danh sách cố định, `orders` đọc/ghi file JSON. Chưa có Stripe, chạy `GET /products` là thấy kết quả.
2. **Tạo phiên thanh toán.** Thêm `checkout`: DTO, `createSession`, rồi thử bằng `curl` để nhận URL `checkout.stripe.com`.
3. **Webhook.** Thêm `handleWebhook`, bật `rawBody`, chạy `stripe listen` để lấy `whsec_...`.
4. **Giao diện.** Trang chủ (Server Component), giỏ hàng (Client Component với Context), nút thanh toán, trang `/success` có polling.
5. **Hoàn thiện.** Trang `/orders` để thấy đơn đổi từ `pending` sang `paid`.

## 8. Tự thử để hiểu

- Thanh toán bằng thẻ `4242 4242 4242 4242`, rồi mở `/orders` và xem đơn đổi trạng thái.
- Tắt `stripe listen`, thanh toán lại: trang `/success` kẹt ở "Đang xác nhận…" và đơn vẫn `pending`. Đó là bằng chứng redirect không đủ để coi là đã trả.
- Dùng thẻ `4000 0000 0000 0002` (thẻ bị từ chối) để thấy đơn không bao giờ thành `paid`.
- Gửi webhook giả: `curl -X POST localhost:4000/checkout/webhook -H "stripe-signature: t=1,v1=x" -d "{}"` trả `400`.

## 9. Để chạy thật, cần đổi gì

| Việc | Lý do |
| --- | --- |
| Dùng cơ sở dữ liệu thay `orders.json` | File JSON không an toàn khi hai request ghi cùng lúc |
| Đăng ký endpoint webhook HTTPS trong Stripe Dashboard | Dùng `whsec` của endpoint đó, không còn dùng Stripe CLI |
| Chuyển sang `sk_live_...` qua biến môi trường | Không để khóa trong repo |
| Thêm đăng nhập và lọc `GET /orders` theo người dùng | Hiện ai cũng xem được mọi đơn |
| Thu email và địa chỉ giao hàng | Dự án chưa lưu thông tin khách |
| Lưu `event.id` đã xử lý | Bỏ qua sự kiện lặp, quan trọng khi webhook có tác dụng phụ như gửi email |

## 10. Thuật ngữ

| Từ | Nghĩa |
| --- | --- |
| Checkout Session | Một phiên thanh toán do Stripe tạo, có URL riêng và hết hạn sau một thời gian |
| Webhook | Stripe gọi vào server của bạn khi có sự kiện, thay vì bạn phải hỏi liên tục |
| Signing secret (`whsec_...`) | Chuỗi dùng để kiểm tra một webhook có thật sự do Stripe gửi |
| Đơn vị nhỏ nhất | Giá lưu bằng cent: 1500 là $15.00. Stripe cũng dùng cách này nên không bị sai số thập phân |
| Server Component | Chạy trên server của Next, gọi API trực tiếp. Trang chủ dùng loại này |
| Client Component | Chạy trong trình duyệt, dùng được state và `localStorage`. Giỏ hàng và trang success dùng loại này |
