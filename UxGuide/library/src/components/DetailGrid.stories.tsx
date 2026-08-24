import type { Meta, StoryObj } from '@storybook/react-vite'
import { DetailField } from './DetailField'
import { DetailGrid } from './DetailGrid'

const meta = {
  title: 'Components/DetailGrid',
  component: DetailGrid,
} satisfies Meta<typeof DetailGrid>
export default meta

type Story = StoryObj<typeof meta>

export const Fields: Story = {
  args: {
    children: (
      <>
        <DetailField label="Name" value="Aurora X1 Wireless Headphones" />
        <DetailField label="SKU" value="AUR-X1-BLK" />
        <DetailField label="Brand" value="Aurora" />
        <DetailField label="Price" value="€199.99" />
        <DetailField label="Restock date" value={undefined} />
        <DetailField label="Tags" value="wireless, anc, bluetooth" />
      </>
    ),
  },
}
