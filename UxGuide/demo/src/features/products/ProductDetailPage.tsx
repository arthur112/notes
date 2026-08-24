import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteProduct, getProduct } from './api'
import { ProductDetail } from './components/ProductDetail'
import type { Product } from './types'

export function ProductDetailPage() {
  const { productId } = useParams({ from: '/products/$productId' })
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    setLoading(true)
    getProduct(productId)
      .then((result) => setProduct(result ?? null))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <PageHeader title="Product not found" />
        <Button asChild variant="outline">
          <Link to="/products">Back to products</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.sku}
        actions={
          <>
            <Button asChild>
              <Link to="/products/$productId/edit" params={{ productId: product.id }}>
                Edit
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setConfirmingDelete(true)}>
                  Delete…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <ProductDetail product={product} />
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete product?"
        description={`This permanently deletes “${product.name}”. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          deleteProduct(product.id).then(() => {
            toast.success(`Deleted “${product.name}”.`)
            navigate({ to: '/products' })
          })
        }}
      />
    </div>
  )
}
