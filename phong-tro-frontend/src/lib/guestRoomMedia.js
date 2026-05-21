import { resolveBackendAssetUrl } from './api';

/**
 * Ảnh loại phòng guest — CHỈ dùng link HTTPS trên web (Unsplash CDN).
 * Không lưu file trong public/, không phụ thuộc thư mục deploy.
 * Deploy Vercel/Netlify/host khác: ảnh vẫn load miễn là có internet.
 *
 * Đổi ảnh: copy link ảnh từ web → dán vào ROOM_IMAGE_URLS bên dưới.
 */

/** Link ảnh cố định (copy từ Unsplash / Pexels / Imgur…) */
export const ROOM_IMAGE_URLS = {
  standardCover:
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85',
  standardGallery: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=85',
  ],
  /* Gác lửng — link đã kiểm tra HTTP 200 (một số photo-id Unsplash cũ trả 404) */
  loftCover:
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=85',
  loftGallery: [
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1560448204-61dc36dc98c8?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=85',
  ],
  /* Ban công — phòng sáng, cửa sổ lớn */
  balconyCover:
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
  balconyGallery: [
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=85',
  ],
  heroWorkspace:
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=85',
  heroKitchen:
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=85',
};

/** Chuẩn hóa status từ DB (AVAILABLE / RENTED / MAINTENANCE). */
export function normalizeRoomStatus(status) {
  return String(status || '')
    .trim()
    .toUpperCase();
}

/** Chỉ phòng thật sự trống trên database. */
export function isRoomAvailable(status) {
  return normalizeRoomStatus(status) === 'AVAILABLE';
}

export function isRoomHeld(status) {
  return normalizeRoomStatus(status) === 'HELD';
}

/** Phòng hiển thị trên landing guest (trống + đang giữ). */
export function isRoomVisibleOnGuestListing(status) {
  const s = normalizeRoomStatus(status);
  return s === 'AVAILABLE' || s === 'HELD';
}

export function guestRoomStatusLabel(status) {
  const s = normalizeRoomStatus(status);
  if (s === 'AVAILABLE') return 'Còn phòng';
  if (s === 'HELD') return 'Đang được giữ';
  if (s === 'RENTED') return 'Đã cho thuê';
  if (s === 'MAINTENANCE') return 'Bảo trì';
  return s;
}

/** @typedef {'Phòng thường' | 'Phòng gác lửng' | 'Phòng ban công'} RoomCategoryLabel */

export const ROOM_TYPE_FILTER_OPTIONS = ['Tất cả', 'Phòng thường', 'Phòng gác lửng', 'Phòng ban công'];

export const ROOM_TYPE_CATALOG = [
  {
    id: 'standard',
    label: 'Phòng thường',
    tagline: 'Studio gọn, sáng, đủ tiện nghi',
    description:
      'Không gian 18–25 m² bố trí tối ưu: giường, bàn làm việc, bếp mini và tủ quần áo. Phù hợp sinh viên, nhân viên văn phòng cần chỗ ở yên tĩnh, dễ dọn dẹp.',
    cover: ROOM_IMAGE_URLS.standardCover,
    gallery: ROOM_IMAGE_URLS.standardGallery,
    furnitureDefault: 'Đầy đủ',
    areaHint: '18–25 m²',
    highlights: ['Máy lạnh Inverter', 'Wifi riêng tầng', 'Bếp mini', 'Giường 1m6'],
  },
  {
    id: 'loft',
    label: 'Phòng gác lửng',
    tagline: 'Loft hai tầng — ngủ trên, sinh hoạt dưới',
    description:
      'Thiết kế gác lửng tận dụng chiều cao trần: tầng dưới bếp + sofa + bàn học, gác trên là khu ngủ riêng tư. Cảm giác rộng hơn diện tích sàn, rất “trọ hiện đại”.',
    cover: ROOM_IMAGE_URLS.loftCover,
    gallery: ROOM_IMAGE_URLS.loftGallery,
    furnitureDefault: 'Đầy đủ',
    areaHint: '22–32 m²',
    highlights: ['Gác lửng gỗ', 'Trần cao', 'Kệ sách', 'Đèn led ấm'],
  },
  {
    id: 'balcony',
    label: 'Phòng ban công',
    tagline: 'Ánh sáng tự nhiên, gió mát cả ngày',
    description:
      'Phòng có ban công hoặc cửa sổ lớn nhìn hẻm cây/ngoài trời. Buổi sáng thoáng, tối yên — lý tưởng nếu bạn thích phơi đồ và không gian “không bí”.',
    cover: ROOM_IMAGE_URLS.balconyCover,
    gallery: ROOM_IMAGE_URLS.balconyGallery,
    furnitureDefault: 'Đầy đủ',
    areaHint: '20–28 m²',
    highlights: ['Ban công riêng', 'Cửa kính lớn', 'Rèm blackout', 'Ghế thư giãn'],
  },
];

export const HERO_SLIDES = [
  { src: ROOM_IMAGE_URLS.loftCover, alt: 'Phòng gác lửng hiện đại' },
  { src: ROOM_IMAGE_URLS.heroWorkspace, alt: 'Góc làm việc trong phòng trọ' },
  { src: ROOM_IMAGE_URLS.balconyCover, alt: 'Phòng ban công thoáng đãng' },
];

export const HOME_GALLERY_STRIP = [
  { src: ROOM_IMAGE_URLS.heroWorkspace, label: 'Góc làm việc tri thức' },
  { src: ROOM_IMAGE_URLS.loftCover, label: 'Không gian gác lửng' },
  { src: ROOM_IMAGE_URLS.heroKitchen, label: 'Khu vực nấu nướng' },
  { src: ROOM_IMAGE_URLS.balconyCover, label: 'Ban công & ánh sáng' },
];

const CATALOG_BY_LABEL = Object.fromEntries(ROOM_TYPE_CATALOG.map((t) => [t.label, t]));

/**
 * @param {{ room_id?: number, room_number?: string, description?: string | null, area?: number | null }} room
 * @returns {RoomCategoryLabel}
 */
export function inferRoomCategory(room) {
  if (room?.room_type && ROOM_TYPE_FILTER_OPTIONS.includes(room.room_type)) {
    return room.room_type;
  }
  const text = `${room?.description || ''} ${room?.room_number || ''}`.toLowerCase();
  if (/gác|gac|loft|lửng|mezzanine/i.test(text)) return 'Phòng gác lửng';
  if (/ban công|ban cong|balcony|view|mái/i.test(text)) return 'Phòng ban công';
  if (/thường|thuong|studio|đơn|don/i.test(text)) return 'Phòng thường';

  const area = Number(room?.area);
  if (area >= 28) return 'Phòng ban công';
  if (area >= 24) return 'Phòng gác lửng';

  const id = Number(room?.room_id) || 0;
  const labels = /** @type {RoomCategoryLabel[]} */ ([
    'Phòng thường',
    'Phòng gác lửng',
    'Phòng ban công',
  ]);
  return labels[id % labels.length];
}

/**
 * @param {RoomCategoryLabel | string} category
 */
export function getRoomTypeMeta(category) {
  return CATALOG_BY_LABEL[category] || ROOM_TYPE_CATALOG[0];
}

/**
 * @param {RoomCategoryLabel | string} category
 */
export function getRoomCoverImage(category) {
  return getRoomTypeMeta(category).cover;
}

/**
 * @param {RoomCategoryLabel | string} category
 * @returns {string[]}
 */
export function getRoomGallery(category) {
  return getRoomTypeMeta(category).gallery;
}

/** Ảnh thật từ DB hoặc fallback theo loại phòng. */
export function getRoomDisplayImages(room) {
  const uploaded = parseImagesField(room?.images).map((u) => resolveBackendAssetUrl(u));
  if (uploaded.length) return uploaded;
  const category = inferRoomCategory(room || {});
  return getRoomGallery(category);
}

function parseImagesField(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean);
  return [];
}

/**
 * @param {{ room_id: number, room_number?: string, price?: number, area?: number | null, status?: string, description?: string | null, room_type?: string | null, images?: string[] }} r
 */
export function mapApiRoomToGuestCard(r) {
  const category = inferRoomCategory(r);
  const meta = getRoomTypeMeta(category);
  const furniture =
    Number(r.area) > 0 && Number(r.area) < 22 ? 'Cơ bản' : meta.furnitureDefault;
  const displayImages = getRoomDisplayImages(r);

  return {
    id: r.room_id,
    name: r.room_number ? `Phòng ${r.room_number}` : 'Phòng',
    price: r.price || 0,
    size: r.area || 0,
    category,
    tag: r.description?.trim() || meta.tagline,
    furniture,
    image: displayImages[0] || meta.cover,
    images: displayImages,
    rawRoom: r,
    status: guestRoomStatusLabel(r.status),
    available: isRoomAvailable(r.status),
    held: isRoomHeld(r.status),
    holdUntil: r.hold_until || null,
    rawStatus: normalizeRoomStatus(r.status),
  };
}
