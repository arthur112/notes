import { z } from 'zod'

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const
export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const
export const TAX_CLASSES = ['standard', 'reduced', 'zero'] as const
export const WEIGHT_UNITS = ['kg', 'g', 'lb'] as const
export const DIMENSION_UNITS = ['cm', 'in'] as const
export const SHIPPING_CLASSES = ['standard', 'express', 'freight'] as const
export const CATEGORIES = ['Audio', 'Lighting', 'Furniture', 'Accessories', 'Storage'] as const

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]
export type Currency = (typeof CURRENCIES)[number]
export type TaxClass = (typeof TAX_CLASSES)[number]
export type WeightUnit = (typeof WEIGHT_UNITS)[number]
export type DimensionUnit = (typeof DIMENSION_UNITS)[number]
export type ShippingClass = (typeof SHIPPING_CLASSES)[number]

export interface Product {
  // Identification
  id: string
  name: string
  sku: string
  slug?: string
  brand?: string
  category: string
  subcategory?: string
  status: ProductStatus
  description?: string
  tags?: string
  // Pricing
  price: number
  compareAtPrice?: number
  cost?: number
  currency: Currency
  taxClass: TaxClass
  marginPercent?: number
  // Inventory
  stockQuantity: number
  lowStockThreshold?: number
  warehouseLocation?: string
  restockDate?: string
  trackInventory: boolean
  allowBackorder: boolean
  safetyStock?: number
  // Shipping
  weight?: number
  weightUnit: WeightUnit
  length?: number
  width?: number
  height?: number
  dimensionUnit: DimensionUnit
  shippingClass: ShippingClass
  fragile: boolean
  requiresSignature: boolean
  // Attributes
  color?: string
  size?: string
  material?: string
  countryOfOrigin?: string
  warrantyMonths?: number
  manufacturerPartNumber?: string
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  internalNotes?: string
}

// Form schema: readonly fields (id, marginPercent, createdAt, updatedAt,
// createdBy) are managed by the API layer, not the form.
export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  slug: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  status: z.enum(PRODUCT_STATUSES),
  description: z.string().optional(),
  tags: z.string().optional(),
  price: z.number('Price is required').positive('Price must be greater than 0'),
  compareAtPrice: z.number().optional(),
  cost: z.number().optional(),
  currency: z.enum(CURRENCIES),
  taxClass: z.enum(TAX_CLASSES),
  stockQuantity: z
    .number('Stock quantity is required')
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity cannot be negative'),
  lowStockThreshold: z.number().int().optional(),
  warehouseLocation: z.string().optional(),
  restockDate: z.string().optional(),
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),
  safetyStock: z.number().int().optional(),
  weight: z.number().optional(),
  weightUnit: z.enum(WEIGHT_UNITS),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  dimensionUnit: z.enum(DIMENSION_UNITS),
  shippingClass: z.enum(SHIPPING_CLASSES),
  fragile: z.boolean(),
  requiresSignature: z.boolean(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  warrantyMonths: z.number().int().optional(),
  manufacturerPartNumber: z.string().optional(),
  internalNotes: z.string().optional(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const emptyProductFormValues: ProductFormValues = {
  name: '',
  sku: '',
  slug: '',
  brand: '',
  category: '',
  subcategory: '',
  status: 'draft',
  description: '',
  tags: '',
  price: Number.NaN,
  currency: 'EUR',
  taxClass: 'standard',
  stockQuantity: Number.NaN,
  warehouseLocation: '',
  restockDate: '',
  trackInventory: true,
  allowBackorder: false,
  weightUnit: 'kg',
  dimensionUnit: 'cm',
  shippingClass: 'standard',
  fragile: false,
  requiresSignature: false,
  color: '',
  size: '',
  material: '',
  countryOfOrigin: '',
  manufacturerPartNumber: '',
  internalNotes: '',
}

export function computeMarginPercent(price: number, cost?: number): number | undefined {
  if (cost === undefined || price <= 0) return undefined
  return Math.round(((price - cost) / price) * 1000) / 10
}
