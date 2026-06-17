/**
 * Chuyển chuỗi tiếng Việt có dấu → slug không dấu, dùng dấu `-`.
 * Vd: "Shop Mỹ phẩm — MKT Zalo" → "shop-my-pham-mkt-zalo"
 */
export const slugify = (input: string): string =>
  input
    .normalize('NFD') // tách dấu khỏi ký tự gốc
    .replace(/[̀-ͯ]/g, '') // bỏ dấu thanh/dấu phụ
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // ký tự lạ → '-'
    .replace(/^-+|-+$/g, '') // bỏ '-' đầu/cuối
