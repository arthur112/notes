export function formatMoney(value: number | undefined, currency: string): string | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value)
}

export function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}
