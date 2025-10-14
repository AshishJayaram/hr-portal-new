# Tabs Component

A reusable tab component for consistent navigation across all pages.

## Basic Usage

```tsx
import Tabs from "@/components/ui/Tabs";

const [activeTab, setActiveTab] = useState('tab1');

<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## With Icons

```tsx
import { User, Settings, Bell } from "lucide-react";

<Tabs
  tabs={[
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## With Counts

```tsx
<Tabs
  tabs={[
    { id: 'inbox', label: 'Inbox', count: 5 },
    { id: 'sent', label: 'Sent', count: 12 },
    { id: 'drafts', label: 'Drafts', count: 3 }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## With Badges

```tsx
<Tabs
  tabs={[
    { id: 'active', label: 'Active', badge: 'New' },
    { id: 'pending', label: 'Pending', badge: '2' },
    { id: 'completed', label: 'Completed' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## Variants

### Default (Underline)
```tsx
<Tabs
  variant="default"
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Pills
```tsx
<Tabs
  variant="pills"
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Underline
```tsx
<Tabs
  variant="underline"
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## Examples for Different Pages

### Dashboard Page
```tsx
<Tabs
  tabs={[
    { id: 'overview', label: 'Overview', icon: <Home className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart className="h-4 w-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="h-4 w-4" /> }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Employees Page
```tsx
<Tabs
  tabs={[
    { id: 'list', label: 'All Employees', count: employees.length },
    { id: 'departments', label: 'Departments' },
    { id: 'roles', label: 'Roles' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Leaves Page
```tsx
<Tabs
  tabs={[
    { id: 'my-leaves', label: 'My Leaves' },
    { id: 'team-leaves', label: 'Team Leaves' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Settings Page
```tsx
<Tabs
  variant="pills"
  tabs={[
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Settings className="h-4 w-4" /> }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `Tab[]` | - | Array of tab objects |
| `activeTab` | `string` | - | Currently active tab ID |
| `onTabChange` | `(tabId: string) => void` | - | Callback when tab changes |
| `className` | `string` | `""` | Additional CSS classes |
| `variant` | `'default' \| 'pills' \| 'underline'` | `'default'` | Tab style variant |

## Tab Object

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the tab |
| `label` | `string` | Display text for the tab |
| `count` | `number` | Optional count badge |
| `icon` | `React.ReactNode` | Optional icon component |
| `badge` | `string` | Optional badge text |
