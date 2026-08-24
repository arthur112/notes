import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DetailField } from '@/components/DetailField'
import { DetailGrid } from '@/components/DetailGrid'
import { FormSection } from '@/components/FormSection'
import type { Product } from '../types'
import { formatDate, formatMoney } from '../format'

export interface ProductDetailProps {
  product: Product
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <div className="space-y-6">
      {/* Key-facts strip: answers 80% of lookups without scrolling. */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">{product.name}</span>
            <Badge>{product.status}</Badge>
          </div>
          <DetailField label="SKU" value={product.sku} />
          <DetailField label="Price" value={formatMoney(product.price, product.currency)} />
          <DetailField label="Stock" value={String(product.stockQuantity)} />
          <DetailField label="Category" value={product.category} />
        </CardContent>
      </Card>

      <FormSection title="Identification">
        <DetailGrid>
          <DetailField label="ID" value={product.id} />
          <DetailField label="Name" value={product.name} />
          <DetailField label="SKU" value={product.sku} />
          <DetailField label="Slug" value={product.slug} />
          <DetailField label="Brand" value={product.brand} />
          <DetailField label="Category" value={product.category} />
          <DetailField label="Subcategory" value={product.subcategory} />
          <DetailField label="Status" value={product.status} />
          <DetailField label="Tags" value={product.tags} />
          <DetailField label="Description" value={product.description} />
        </DetailGrid>
      </FormSection>

      <FormSection title="Pricing">
        <DetailGrid>
          <DetailField label="Price" value={formatMoney(product.price, product.currency)} />
          <DetailField
            label="Compare-at price"
            value={formatMoney(product.compareAtPrice, product.currency)}
          />
          <DetailField label="Cost" value={formatMoney(product.cost, product.currency)} />
          <DetailField label="Currency" value={product.currency} />
          <DetailField label="Tax class" value={product.taxClass} />
          <DetailField
            label="Margin"
            value={
              product.marginPercent === undefined ? undefined : `${product.marginPercent} %`
            }
          />
        </DetailGrid>
      </FormSection>

      <FormSection title="Inventory">
        <DetailGrid>
          <DetailField label="Stock quantity" value={String(product.stockQuantity)} />
          <DetailField
            label="Low-stock threshold"
            value={product.lowStockThreshold?.toString()}
          />
          <DetailField label="Warehouse location" value={product.warehouseLocation} />
          <DetailField label="Restock date" value={product.restockDate} />
          <DetailField label="Track inventory" value={product.trackInventory ? 'Yes' : 'No'} />
          <DetailField label="Allow backorder" value={product.allowBackorder ? 'Yes' : 'No'} />
          <DetailField label="Safety stock" value={product.safetyStock?.toString()} />
        </DetailGrid>
      </FormSection>

      <FormSection title="Shipping">
        <DetailGrid>
          <DetailField
            label="Weight"
            value={product.weight === undefined ? undefined : `${product.weight} ${product.weightUnit}`}
          />
          <DetailField
            label="Dimensions (L×W×H)"
            value={
              product.length === undefined
                ? undefined
                : `${product.length} × ${product.width} × ${product.height} ${product.dimensionUnit}`
            }
          />
          <DetailField label="Shipping class" value={product.shippingClass} />
          <DetailField label="Fragile" value={product.fragile ? 'Yes' : 'No'} />
          <DetailField
            label="Requires signature"
            value={product.requiresSignature ? 'Yes' : 'No'}
          />
        </DetailGrid>
      </FormSection>

      <FormSection title="Attributes">
        <DetailGrid>
          <DetailField label="Color" value={product.color} />
          <DetailField label="Size" value={product.size} />
          <DetailField label="Material" value={product.material} />
          <DetailField label="Country of origin" value={product.countryOfOrigin} />
          <DetailField
            label="Warranty"
            value={
              product.warrantyMonths === undefined ? undefined : `${product.warrantyMonths} months`
            }
          />
          <DetailField label="Manufacturer part no." value={product.manufacturerPartNumber} />
        </DetailGrid>
      </FormSection>

      {/* Metadata: audit data, not working data — last and muted. */}
      <FormSection title="Metadata" muted>
        <DetailGrid>
          <DetailField label="Created at" value={formatDate(product.createdAt)} />
          <DetailField label="Updated at" value={formatDate(product.updatedAt)} />
          <DetailField label="Created by" value={product.createdBy} />
          <DetailField label="Internal notes" value={product.internalNotes} />
        </DetailGrid>
      </FormSection>
    </div>
  )
}
