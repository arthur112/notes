import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { sampleFormValues } from '../fixtures'
import { emptyProductFormValues } from '../types'
import { ProductForm } from './ProductForm'

const meta = {
  title: 'Products/ProductForm',
  component: ProductForm,
  args: { onSubmit: fn(), onCancel: fn(), onDirtyChange: fn() },
} satisfies Meta<typeof ProductForm>
export default meta

type Story = StoryObj<typeof meta>

export const Create: Story = {
  args: { defaultValues: emptyProductFormValues, submitting: false },
}

export const Edit: Story = {
  args: { defaultValues: sampleFormValues, submitting: false },
}

export const Submitting: Story = {
  args: { defaultValues: sampleFormValues, submitting: true },
}
