# Lookup examples

Worked examples of the `Lookup` component: plain and keyed selection, server-side search, icons and expandable details, a Dynamics-style header and footer, a multi-entity lookup, and rich secondary text. The prop tables, hierarchy, hover cards and keyboard handling are in the [README](https://github.com/garethcheyne/npm-fluentui-extended#lookup-props).


## Basic Selection (with key)

```tsx
const [selectedKey, setSelectedKey] = useState<string | null>(null);

<Lookup
  options={options}
  selectedKey={selectedKey}
  onOptionSelect={(opt) => setSelectedKey(opt?.key ?? null)}
  placeholder="Search..."
/>
```

## Async Search (API Integration)

For async scenarios, use `selectedOption` to persist the display value when options change:

```tsx
function AsyncLookup() {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchText: string) => {
    setLoading(true);
    const response = await fetch(`/api/accounts?search=${searchText}`);
    setOptions(await response.json());
    setLoading(false);
  };

  return (
    <Lookup
      options={options}
      selectedOption={selected}
      onOptionSelect={setSelected}
      onSearchChange={handleSearch}
      loading={loading}
      searchDebounceMs={300}
      placeholder="Type to search..."
    />
  );
}
```

## With Icons and Expandable Details

Options can include icons and expandable detail rows (click chevron to expand):

```tsx
import { BuildingRegular } from '@fluentui/react-icons';

const options: LookupOption[] = [
  {
    key: '1',
    text: 'Contoso Ltd',
    secondaryText: 'CON001',
    icon: <BuildingRegular />,
    details: [
      { label: 'Phone', value: '555-0100' },
      { label: 'Industry', value: 'Technology' },
      { value: 'Active Customer' },
    ],
    data: { id: 'acc-001', revenue: 5000000 }, // Custom data accessible in onOptionSelect
  },
];
```

## Dynamics 365 Style (Header & Footer)

```tsx
import { Text, Button, Link } from '@fluentui/react-components';
import { AddRegular, PersonSearchRegular } from '@fluentui/react-icons';

<Lookup
  options={options}
  selectedOption={selected}
  onOptionSelect={setSelected}
  header={
    <>
      <Text size={200}>Accounts</Text>
      <Button appearance="outline" size="small">Recent records</Button>
    </>
  }
  footer={
    <>
      <Link style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <AddRegular /> New
      </Link>
      <Link style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PersonSearchRegular /> Advanced
      </Link>
    </>
  }
/>
```

## Multi-Entity Lookup with Filter Buttons

Replicate the native Dynamics 365 lookup pattern where users can filter between entity types:

```tsx
import { Text, Button, Link, ToggleButton } from '@fluentui/react-components';
import { BuildingRegular, PersonRegular, ArrowLeftRegular } from '@fluentui/react-icons';

function MultiEntityLookup() {
  const [showAccounts, setShowAccounts] = useState(true);
  const [showContacts, setShowContacts] = useState(true);

  const options: LookupOption[] = [
    { key: 'acc-1', text: 'Contoso Ltd', icon: <BuildingRegular />, details: [...] },
    { key: 'con-1', text: 'John Smith', icon: <PersonRegular />, details: [...] },
  ];

  // Filter based on key prefix
  const filteredOptions = useMemo(() => 
    options.filter(opt => {
      if (opt.key.startsWith('acc-')) return showAccounts;
      if (opt.key.startsWith('con-')) return showContacts;
      return true;
    }), [showAccounts, showContacts]
  );

  return (
    <Lookup
      options={filteredOptions}
      header={
        // Drill-down view when single entity selected
        showAccounts !== showContacts ? (
          <>
            <Link onClick={() => { setShowAccounts(true); setShowContacts(true); }}>
              <ArrowLeftRegular /> All
            </Link>
            <Text weight="semibold">{showAccounts ? 'Accounts' : 'Contacts'}</Text>
          </>
        ) : (
          // Filter toggles when showing all
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Text size={200}>Results from:</Text>
              <ToggleButton size="small" checked={showAccounts}
                onClick={() => { setShowAccounts(true); setShowContacts(false); }}>
                Accounts
              </ToggleButton>
              <ToggleButton size="small" checked={showContacts}
                onClick={() => { setShowAccounts(false); setShowContacts(true); }}>
                Contacts
              </ToggleButton>
            </div>
            <Button size="small">Recent records</Button>
          </>
        )
      }
    />
  );
}
```

## Rich Secondary Text with React Elements

Both `secondaryText` and `details` support React elements, not just strings:

```tsx
import { Badge } from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';

const options: LookupOption[] = [
  {
    key: '1',
    text: 'John Smith',
    secondaryText: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge appearance="tint" color="success" size="small" icon={<CheckmarkCircleRegular />}>
          Active
        </Badge>
        <span>john.smith@contoso.com</span>
      </span>
    ),
    icon: <PersonRegular />,
    details: [
      { label: 'Status', value: <Badge appearance="filled" color="success" size="small">Verified</Badge> },
      { label: 'Role', value: <Badge appearance="tint" color="brand" size="small">Decision Maker</Badge> },
      { value: <span style={{ color: '#0078d4' }}>View full profile →</span> },
    ],
  },
];
```

