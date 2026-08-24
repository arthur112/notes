import type { Product, ProductFormValues, ProductStatus } from './types'
import { CATEGORIES, SHIPPING_CLASSES, computeMarginPercent } from './types'

// Demo-scope persistence: products live in a module-level array. Navigations
// keep the data; a browser reload resets to the seeds. No backend on purpose —
// this note is about layout and component architecture, not data fetching.

function delay(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, 300)
  return promise
}

const NAMES: Array<[string, string, ProductStatus]> = [
  ['Aurora Desk Lamp', 'Lighting', 'active'],
  ['Nimbus Bookshelf', 'Furniture', 'active'],
  ['Pulse Wireless Headphones', 'Audio', 'active'],
  ['Quanta USB-C Hub', 'Accessories', 'active'],
  ['Ridgeline Storage Crate', 'Storage', 'active'],
  ['Solstice Floor Lamp', 'Lighting', 'draft'],
  ['Tidal Bookshelf Speaker', 'Audio', 'active'],
  ['Umbra Wall Shelf', 'Furniture', 'active'],
  ['Vertex Cable Organizer', 'Accessories', 'archived'],
  ['Willow Storage Bench', 'Storage', 'active'],
  ['Xenon Monitor Light Bar', 'Lighting', 'active'],
  ['Yew Side Table', 'Furniture', 'draft'],
  ['Zephyr Portable Speaker', 'Audio', 'active'],
  ['Atlas Laptop Stand', 'Accessories', 'active'],
  ['Boreal Drawer Unit', 'Storage', 'active'],
  ['Cascade Pendant Light', 'Lighting', 'active'],
  ['Drift Coffee Table', 'Furniture', 'active'],
  ['Echo Studio Microphone', 'Audio', 'draft'],
  ['Flint Key Organizer', 'Accessories', 'active'],
  ['Grove Filing Cabinet', 'Storage', 'archived'],
  ['Harbor Desk Shelf', 'Furniture', 'active'],
  ['Ion Desk Fan', 'Accessories', 'active'],
  ['Jasper Reading Light', 'Lighting', 'active'],
  ['Kelp Cable Sleeve', 'Accessories', 'draft'],
  ['Lumen Smart Bulb', 'Lighting', 'active'],
]

function seedProducts(): Product[] {
  return NAMES.map(([name, category, status], index) => {
    const n = index + 1
    const price = 19 + n * 7
    const cost = Math.round(price * 0.55 * 100) / 100
    const createdAt = new Date(Date.UTC(2026, 0, n, 9, 0, 0)).toISOString()
    const updatedAt = new Date(Date.UTC(2026, 6, n, 14, 30, 0)).toISOString()
    return {
      id: `p-${n}`,
      name,
      sku: `SKU-${String(1000 + n)}`,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: ['Northwind', 'Acme', 'Fjord'][index % 3],
      category: CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ? category : 'Accessories',
      subcategory: ['Home', 'Office', 'Studio'][index % 3],
      status,
      description: `${name} — demo product ${n} of the UxGuide dense-CRUD seed set.`,
      tags: ['new', 'sale', 'staff-pick'][index % 3],
      price,
      compareAtPrice: n % 4 === 0 ? price + 20 : undefined,
      cost,
      currency: 'EUR',
      taxClass: 'standard',
      marginPercent: computeMarginPercent(price, cost),
      stockQuantity: (n * 13) % 120,
      lowStockThreshold: 10,
      warehouseLocation: `Aisle ${String.fromCharCode(65 + (index % 6))}-${(n % 20) + 1}`,
      restockDate: n % 5 === 0 ? '2026-09-15' : '',
      trackInventory: true,
      allowBackorder: n % 3 === 0,
      safetyStock: 5,
      weight: Math.round((0.2 + n * 0.15) * 100) / 100,
      weightUnit: 'kg',
      length: 10 + n,
      width: 8 + (n % 7),
      height: 5 + (n % 5),
      dimensionUnit: 'cm',
      shippingClass: SHIPPING_CLASSES[index % 3],
      fragile: n % 4 === 0,
      requiresSignature: price > 150,
      color: ['Black', 'White', 'Oak', 'Graphite'][index % 4],
      size: ['S', 'M', 'L'][index % 3],
      material: ['Steel', 'Oak', 'Aluminium', 'Fabric'][index % 4],
      countryOfOrigin: ['DE', 'NL', 'PT', 'DK'][index % 4],
      warrantyMonths: 24,
      manufacturerPartNumber: `MPN-${5000 + n}`,
      createdAt,
      updatedAt,
      createdBy: 'demo.user',
      internalNotes: n % 6 === 0 ? 'Check supplier pricing next quarter.' : '',
    }
  })
}

let products: Product[] = seedProducts()
let idCounter = products.length

export async function listProducts(): Promise<Product[]> {
  await delay()
  return [...products]
}

export async function getProduct(id: string): Promise<Product | undefined> {
  await delay()
  return products.find((product) => product.id === id)
}

export async function createProduct(values: ProductFormValues): Promise<Product> {
  await delay()
  const now = new Date().toISOString()
  const product: Product = {
    ...values,
    id: `p-${++idCounter}`,
    marginPercent: computeMarginPercent(values.price, values.cost),
    createdAt: now,
    updatedAt: now,
    createdBy: 'demo.user',
  }
  products = [...products, product]
  return product
}

export async function updateProduct(
  id: string,
  values: ProductFormValues,
): Promise<Product | undefined> {
  await delay()
  const existing = products.find((product) => product.id === id)
  if (!existing) return undefined
  const updated: Product = {
    ...existing,
    ...values,
    marginPercent: computeMarginPercent(values.price, values.cost),
    updatedAt: new Date().toISOString(),
  }
  products = products.map((product) => (product.id === id ? updated : product))
  return updated
}

export async function deleteProduct(id: string): Promise<void> {
  await delay()
  products = products.filter((product) => product.id !== id)
}
