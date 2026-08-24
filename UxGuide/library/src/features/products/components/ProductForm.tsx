import { useEffect } from 'react'
import { Controller, useForm, type RegisterOptions } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ErrorSummary, type ErrorSummaryEntry } from '@/components/ErrorSummary'
import { FormSection } from '@/components/FormSection'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  CATEGORIES,
  CURRENCIES,
  DIMENSION_UNITS,
  SHIPPING_CLASSES,
  TAX_CLASSES,
  WEIGHT_UNITS,
  productFormSchema,
  type ProductFormValues,
} from '../types'

export interface ProductFormProps {
  defaultValues: ProductFormValues
  submitting: boolean
  onSubmit: (values: ProductFormValues) => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  sku: 'SKU',
  slug: 'Slug',
  brand: 'Brand',
  category: 'Category',
  subcategory: 'Subcategory',
  status: 'Status',
  description: 'Description',
  tags: 'Tags',
  price: 'Price',
  compareAtPrice: 'Compare-at price',
  cost: 'Cost',
  currency: 'Currency',
  taxClass: 'Tax class',
  stockQuantity: 'Stock quantity',
  lowStockThreshold: 'Low-stock threshold',
  warehouseLocation: 'Warehouse location',
  restockDate: 'Restock date',
  safetyStock: 'Safety stock',
  weight: 'Weight',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  color: 'Color',
  size: 'Size',
  material: 'Material',
  countryOfOrigin: 'Country of origin',
  warrantyMonths: 'Warranty (months)',
  manufacturerPartNumber: 'Manufacturer part no.',
  internalNotes: 'Internal notes',
}

const asNumber = {
  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
} satisfies RegisterOptions<ProductFormValues>

export function ProductForm({
  defaultValues,
  submitting,
  onSubmit,
  onCancel,
  onDirtyChange,
}: ProductFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setFocus,
    formState: { errors, isDirty, submitCount },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange])

  const summaryEntries: ErrorSummaryEntry[] =
    submitCount === 0
      ? []
      : Object.entries(errors).map(([field, error]) => ({
          field,
          label: FIELD_LABELS[field] ?? field,
          message: error?.message ?? 'Invalid value',
        }))

  // Plain render helpers (called, not rendered as components) so field inputs
  // keep stable identity across renders — defining components inline would
  // remount inputs and drop focus on every keystroke.
  const textField = (
    name: keyof ProductFormValues,
    options?: { required?: boolean; type?: 'text' | 'number' | 'date' },
  ) => (
    <Field data-invalid={errors[name] ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {FIELD_LABELS[name]}
        {options?.required ? ' *' : ''}
      </FieldLabel>
      <Input
        id={name}
        type={options?.type ?? 'text'}
        aria-invalid={errors[name] ? true : undefined}
        {...register(name, options?.type === 'number' ? asNumber : undefined)}
      />
      <FieldError errors={errors[name] ? [errors[name]] : undefined} />
    </Field>
  )

  const selectField = (
    name: 'status' | 'category' | 'currency' | 'taxClass' | 'weightUnit' | 'dimensionUnit' | 'shippingClass',
    label: string,
    options: readonly string[],
    required?: boolean,
  ) => (
    <Field data-invalid={errors[name] ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required ? ' *' : ''}
      </FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} aria-invalid={errors[name] ? true : undefined}>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={errors[name] ? [errors[name]] : undefined} />
    </Field>
  )

  const checkboxField = (
    name: 'trackInventory' | 'allowBackorder' | 'fragile' | 'requiresSignature',
    label: string,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Checkbox
            id={name}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
          <FieldLabel htmlFor={name} className="font-normal">
            {label}
          </FieldLabel>
        </div>
      )}
    />
  )

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <ErrorSummary errors={summaryEntries} onSelect={(field) => setFocus(field as keyof ProductFormValues)} />

      <FormSection title="Identification">
        <div className="space-y-4">
          {textField('name', { required: true })}
          {textField('sku', { required: true })}
          {textField('slug')}
          {textField('brand')}
          {selectField('category', 'Category', CATEGORIES, true)}
          {textField('subcategory')}
          {selectField('status', 'Status', ['draft', 'active', 'archived'])}
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>
          {textField('tags')}
        </div>
      </FormSection>

      <FormSection title="Pricing">
        <div className="space-y-4">
          {textField('price', { required: true, type: 'number' })}
          {textField('compareAtPrice', { type: 'number' })}
          {textField('cost', { type: 'number' })}
          {selectField('currency', 'Currency', CURRENCIES)}
          {selectField('taxClass', 'Tax class', TAX_CLASSES)}
        </div>
      </FormSection>

      <FormSection title="Inventory">
        <div className="space-y-4">
          {textField('stockQuantity', { required: true, type: 'number' })}
          {textField('lowStockThreshold', { type: 'number' })}
          {textField('warehouseLocation')}
          {textField('restockDate', { type: 'date' })}
          {textField('safetyStock', { type: 'number' })}
          {checkboxField('trackInventory', 'Track inventory')}
          {checkboxField('allowBackorder', 'Allow backorders')}
        </div>
      </FormSection>

      <FormSection title="Shipping">
        <div className="space-y-4">
          {/* Short coupled fields may share a row — everything else stays single-column. */}
          <div className="grid grid-cols-2 gap-4">
            {textField('weight', { type: 'number' })}
            {selectField('weightUnit', 'Weight unit', WEIGHT_UNITS)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {textField('length', { type: 'number' })}
            {textField('width', { type: 'number' })}
            {textField('height', { type: 'number' })}
          </div>
          {selectField('dimensionUnit', 'Dimension unit', DIMENSION_UNITS)}
          {selectField('shippingClass', 'Shipping class', SHIPPING_CLASSES)}
          {checkboxField('fragile', 'Fragile')}
          {checkboxField('requiresSignature', 'Requires signature on delivery')}
        </div>
      </FormSection>

      <FormSection title="Attributes">
        <div className="space-y-4">
          {textField('color')}
          {textField('size')}
          {textField('material')}
          {textField('countryOfOrigin')}
          {textField('warrantyMonths', { type: 'number' })}
          {textField('manufacturerPartNumber')}
        </div>
      </FormSection>

      <FormSection title="Metadata" muted>
        <Field>
          <FieldLabel htmlFor="internalNotes">Internal notes</FieldLabel>
          <Textarea id="internalNotes" rows={3} {...register('internalNotes')} />
        </Field>
      </FormSection>

      {/* Sticky action bar: reachable from any scroll position in a 40-field form. */}
      <div className="sticky bottom-0 z-20 -mx-6 flex items-center justify-between gap-3 border-t bg-background px-6 py-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save product'}
        </Button>
      </div>
    </form>
  )
}
