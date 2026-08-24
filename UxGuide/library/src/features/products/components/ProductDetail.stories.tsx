import type { Meta, StoryObj } from '@storybook/react-vite'
import { sampleProduct } from '../fixtures'
import type { Product } from '../types'
import { ProductDetail } from './ProductDetail'

const meta = {
  title: 'Products/ProductDetail',
  component: ProductDetail,
} satisfies Meta<typeof ProductDetail>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { product: sampleProduct },
}

const sparseProduct: Product = {
  id: 'p-2',
  name: 'Unlaunched accessory',
  sku: 'ACC-0001',
  category: 'Accessories',
  status: 'draft',
  price: 9.99,
  currency: 'EUR',
  taxClass: 'standard',
  stockQuantity: 0,
  trackInventory: false,
  allowBackorder: true,
  weightUnit: 'kg',
  dimensionUnit: 'cm',
  shippingClass: 'standard',
  fragile: false,
  requiresSignature: false,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  createdBy: 'j.doe@company.com',
}

export const Sparse: Story = {
  args: { product: sparseProduct },
}
