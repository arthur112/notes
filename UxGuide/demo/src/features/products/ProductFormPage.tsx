import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { createProduct, getProduct, updateProduct } from './api'
import { ProductForm } from './components/ProductForm'
import { emptyProductFormValues, type ProductFormValues } from './types'

export function ProductFormPage() {
  // Shared by /products/new (no param) and /products/$productId/edit.
  const { productId } = useParams({ strict: false })
  const navigate = useNavigate()
  const [defaultValues, setDefaultValues] = useState<ProductFormValues | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  // Ref mirror: the blocker evaluates synchronously at navigation time, before
  // a setState flush — after a successful submit we must be able to mark the
  // form clean in the same tick as the navigate() call.
  const dirtyRef = useRef(false)
  const handleDirtyChange = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }

  useEffect(() => {
    if (!productId) {
      setDefaultValues(emptyProductFormValues)
      return
    }
    getProduct(productId).then((product) => {
      if (product) {
        const { id: _id, marginPercent: _margin, createdAt: _c, updatedAt: _u, createdBy: _by, ...values } =
          product
        setDefaultValues({ ...emptyProductFormValues, ...values })
      } else {
        setDefaultValues(emptyProductFormValues)
      }
    })
  }, [productId])

  // Dirty-guard: any navigation away from a dirty form is blocked and routed
  // through the confirm dialog below.
  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
  })

  if (!defaultValues) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const handleSubmit = (values: ProductFormValues) => {
    setSubmitting(true)
    const request = productId
      ? updateProduct(productId, values)
      : createProduct(values)
    request
      .then((product) => {
        if (!product) return
        toast.success(productId ? `Updated “${product.name}”.` : `Created “${product.name}”.`)
        dirtyRef.current = false
        setDirty(false)
        navigate({ to: '/products/$productId', params: { productId: product.id } })
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={productId ? 'Edit product' : 'New product'}
        description={productId ? `Editing ${productId}` : 'Fields marked * are required.'}
      />
      {/* key forces a fresh form when switching between records. */}
      <ProductForm
        key={productId ?? 'new'}
        defaultValues={defaultValues}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: '/products' })}
        onDirtyChange={handleDirtyChange}
      />
      <ConfirmDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.status === 'blocked') blocker.reset()
        }}
        title="Discard unsaved changes?"
        description="You have unsaved changes. Leaving this page discards them."
        confirmLabel="Discard changes"
        onConfirm={() => {
          if (blocker.status === 'blocked') blocker.proceed()
        }}
      />
    </div>
  )
}
