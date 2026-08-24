import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { sampleProducts } from '../fixtures'
import { ProductTable } from './ProductTable'

const meta = {
  title: 'Products/ProductTable',
  component: ProductTable,
  args: { onRowClick: fn(), onDelete: fn(), onRetry: fn() },
} satisfies Meta<typeof ProductTable>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { data: sampleProducts(30), loading: false },
}

export const Loading: Story = {
  args: { data: [], loading: true },
}

export const Empty: Story = {
  args: { data: [], loading: false },
}

export const ErrorWithRetry: Story = {
  args: { data: [], loading: false, error: 'Could not load products. Check your connection and try again.' },
}
