import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ErrorSummary } from './ErrorSummary'

const meta = {
  title: 'Components/ErrorSummary',
  component: ErrorSummary,
  args: { onSelect: fn() },
} satisfies Meta<typeof ErrorSummary>
export default meta

type Story = StoryObj<typeof meta>

export const MultipleErrors: Story = {
  args: {
    errors: [
      { field: 'name', label: 'Name', message: 'Name is required' },
      { field: 'sku', label: 'SKU', message: 'SKU is required' },
      { field: 'price', label: 'Price', message: 'Price must be greater than 0' },
    ],
  },
}

export const SingleError: Story = {
  args: {
    errors: [{ field: 'category', label: 'Category', message: 'Category is required' }],
  },
}
