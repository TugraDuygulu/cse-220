import 'ui-common/styles/global.css';

import type { Meta, StoryObj } from '@storybook/react';
import { useState, type ComponentProps } from 'react';

import { SearchBox } from './index';

type SearchBoxProps = ComponentProps<typeof SearchBox>;

const meta = {
  title: 'Discovery/SearchBox',
  component: SearchBox,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SearchBox>;

export default meta;

type Story = StoryObj<typeof meta>;

function SearchBoxPlayground(args: SearchBoxProps) {
  const [lastQuery, setLastQuery] = useState('');

  return (
    <div className="w-full max-w-md space-y-3 p-6">
      <SearchBox
        {...args}
        onSearch={(query) => {
          setLastQuery(query);
          args.onSearch?.(query);
        }}
      />
      <p className="text-sm text-muted-foreground">
        {lastQuery
          ? `Last search: ${lastQuery}`
          : 'Expand the search box and submit a query.'}
      </p>
    </div>
  );
}

export const Default: Story = {
  render: (args) => <SearchBoxPlayground {...args} />,
  args: {
    placeholder: 'Search destinations, flavors, or tags...',
    defaultExpanded: false,
  },
};

export const Expanded: Story = {
  render: (args) => <SearchBoxPlayground {...args} />,
  args: {
    placeholder: 'Search destinations, flavors, or tags...',
    defaultExpanded: true,
  },
};
