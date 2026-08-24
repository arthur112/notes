import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { PageHeader } from './PageHeader'

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
} satisfies Meta<typeof PageHeader>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { title: 'Products' },
}

export const WithActions: Story = {
  args: {
    title: 'Products',
    description: '42 fields per record — list, inspect, create, edit, delete.',
    actions: (
      <>
        <Button variant="outline">Export</Button>
        <Button>New product</Button>
      </>
    ),
  },
}
