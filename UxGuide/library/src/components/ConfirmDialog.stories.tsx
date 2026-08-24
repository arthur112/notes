import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConfirmDialog } from './ConfirmDialog'

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  args: { onOpenChange: fn(), onConfirm: fn() },
} satisfies Meta<typeof ConfirmDialog>
export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    open: true,
    title: 'Delete product?',
    description: 'This permanently deletes "Aurora X1 Wireless Headphones". This action cannot be undone.',
    confirmLabel: 'Delete',
  },
}
