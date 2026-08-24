import {
  CATEGORIES,
  PRODUCT_STATUSES,
  emptyProductFormValues,
  type Product,
  type ProductFormValues,
} from './types'

const NAMES = ['Aurora X1 Wireless Headphones', 'Lumen Desk Lamp', 'Nordic Oak Chair', 'Clip Cable Organizer', 'Stack Storage Box']

export const sampleProduct: Product = {
  // Identification
  id: 'p-1',
  name: 'Aurora X1 Wireless Headphones',
  sku: 'AUR-X1-BLK',
  slug: 'aurora-x1-wireless-headphones',
  brand: 'Aurora',
  category: 'Audio',
  subcategory: 'Headphones',
  status: 'active',
  description:
    'Over-ear wireless headphones with active noise cancellation, 40-hour battery life, and multipoint Bluetooth.',
  tags: 'wireless, anc, bluetooth, over-ear',
  // Pricing
  price: 199.99,
  compareAtPrice: 249.99,
  cost: 92.5,
  currency: 'EUR',
  taxClass: 'standard',
  marginPercent: 53.75,
  // Inventory
  stockQuantity: 148,
  lowStockThreshold: 20,
  warehouseLocation: 'AMS-01 / Aisle 4 / Bin 12',
  restockDate: '2026-09-15',
  trackInventory: true,
  allowBackorder: false,
  safetyStock: 10,
  // Shipping
  weight: 0.32,
  weightUnit: 'kg',
  length: 20,
  width: 18,
  height: 9,
  dimensionUnit: 'cm',
  shippingClass: 'standard',
  fragile: false,
  requiresSignature: false,
  // Attributes
  color: 'Matte black',
  size: 'One size',
  material: 'Recycled ABS, memory foam',
  countryOfOrigin: 'CN',
  warrantyMonths: 24,
  manufacturerPartNumber: 'AUR-2026-X1',
  // Metadata
  createdAt: '2026-01-12T09:30:00.000Z',
  updatedAt: '2026-08-10T14:05:00.000Z',
  createdBy: 'j.doe@company.com',
  internalNotes: 'Top seller in Q2; keep safety stock at 10 through the holiday season.',
}

const DAY_MS = 86_400_000

export function sampleProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, i) => ({
    ...sampleProduct,
    id: `p-${i + 1}`,
    name: `${NAMES[i % NAMES.length]} ${i + 1}`,
    sku: `SKU-${String(i + 1).padStart(4, '0')}`,
    category: CATEGORIES[i % CATEGORIES.length],
    status: PRODUCT_STATUSES[i % PRODUCT_STATUSES.length],
    price: 19 + i * 7,
    stockQuantity: (i * 13) % 120,
    updatedAt: new Date(Date.UTC(2026, 0, 1) - i * DAY_MS).toISOString(),
  }))
}

export const sampleFormValues: ProductFormValues = { ...emptyProductFormValues, ...sampleProduct }
