export const CONDITION_GRADES = [
  'Like New',
  'Excellent',
  'Good',
  'Fair',
  'Needs Refurbishment'
]

export const CATEGORIES = [
  'Electronics',
  'Monitors',
  'Laptops',
  'Smartphones',
  'Headphones',
  'Baby Gear',
  'Furniture',
  'Fitness',
  'Kitchen',
  'Books',
  'Fashion',
  'Sports',
  'Home Decor',
  'Toys'
]

export const ROUTING_OPTIONS = {
  direct_resale: { label: 'Direct Resale', color: 'brand-green', icon: '🏷️' },
  refurbish_then_sell: { label: 'Refurbish & Sell', color: 'brand-blue', icon: '🔧' },
  peer_to_peer: { label: 'Peer-to-Peer Exchange', color: 'brand-amber', icon: '🤝' },
  donate: { label: 'Donate', color: 'brand-green', icon: '💚' },
  recycle: { label: 'Recycle', color: 'brand-red', icon: '♻️' }
}

export const SCORE_COLORS = {
  high: '#1D9E75',    // 80+
  medium: '#EF9F27',  // 50-79
  low: '#E24B4A'      // <50
}

export function getScoreColor(score) {
  if (score >= 80) return SCORE_COLORS.high
  if (score >= 50) return SCORE_COLORS.medium
  return SCORE_COLORS.low
}
