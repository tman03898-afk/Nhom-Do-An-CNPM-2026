export const HOLD_REQUEST_STATUSES = [
  { value: 'NEW', label: 'Mới' },
  { value: 'DEPOSIT_PENDING', label: 'Chờ xác minh cọc' },
  { value: 'CONTACTED', label: 'Đã liên hệ' },
  { value: 'VIEW_SCHEDULED', label: 'Đã hẹn xem' },
  { value: 'DEPOSITED', label: 'Đã cọc (OK)' },
  { value: 'CANCELLED', label: 'Từ chối / Hủy' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
];

export const TEMP_HOLD_MINUTES = 15;

export function formatHoldUntil(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function canGuestRequestHold(roomStatus) {
  return String(roomStatus || '').toUpperCase() === 'AVAILABLE';
}

export function isRoomHeld(roomStatus) {
  return String(roomStatus || '').toUpperCase() === 'HELD';
}
