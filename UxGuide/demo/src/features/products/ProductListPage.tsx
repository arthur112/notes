import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { deleteProduct, listProducts } from './api'
import { ProductTable } from './components/ProductTable'
import type { Product } from './types'

export function ProductListPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listProducts()
      .then(setProducts)
      .catch(() => setError('Could not load products.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${products.length} products`}
        actions={
          <Button asChild>
            <Link to="/products/new">New product</Link>
          </Button>
        }
      />
      <ProductTable
        data={products}
        loading={loading}
        error={error}
        onRetry={load}
        onRowClick={(product) =>
          navigate({ to: '/products/$productId', params: { productId: product.id } })
        }
        onDelete={setPendingDelete}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete product?"
        description={`This permanently deletes “${pendingDelete?.name}”. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (!pendingDelete) return
          deleteProduct(pendingDelete.id).then(() => {
            toast.success(`Deleted “${pendingDelete.name}”.`)
            setPendingDelete(null)
            load()
          })
        }}
      />
    </div>
  )
}
