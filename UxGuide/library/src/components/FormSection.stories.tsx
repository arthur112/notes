import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { FormSection } from './FormSection'

const meta = {
  title: 'Components/FormSection',
  component: FormSection,
} satisfies Meta<typeof FormSection>
export default meta

type Story = StoryObj<typeof meta>

const fields = (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    <Field>
      <FieldLabel>Name</FieldLabel>
      <Input placeholder="Aurora X1" />
    </Field>
    <Field>
      <FieldLabel>SKU</FieldLabel>
      <Input placeholder="AUR-X1-BLK" />
    </Field>
    <Field>
      <FieldLabel>Brand</FieldLabel>
      <Input placeholder="Aurora" />
    </Field>
  </div>
)

export const Default: Story = {
  args: {
    title: 'Identification',
    description: 'How the record is named and found.',
    children: fields,
  },
}

export const Muted: Story = {
  args: {
    title: 'Metadata',
    description: 'Audit data, not working data — last and muted.',
    muted: true,
    children: fields,
  },
}
