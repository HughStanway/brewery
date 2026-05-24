# Phase 5: Dashboard & Web UI

**Duration:** 2-3 weeks  
**Focus:** Visualization and control interface  
**Deliverables:** Web dashboard for monitoring, artifact exploration, deployment management

**Depends on:** All previous phases (1-4)

---

## 1. Architecture Overview

### 1.1 Technology Stack

```
Frontend:
  - Next.js 15 (React 19)
  - TypeScript
  - Tailwind CSS
  - WebSockets (real-time logs)
  - Recharts (graphs)
  - TanStack Query (data fetching)
  
Backend Integration:
  - REST API (Spring Boot from Phase 1-4)
  - WebSocket for real-time updates
  - GraphQL optional for complex queries
```

### 1.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  Header: Logo | Search | Settings | User            │
├─────────────────────────────────────────────────────┤
│ Sidebar          │  Main Content Area                │
│  - Home          │  ┌─────────────────────────────┐ │
│  - Builds        │  │  Dashboard / Build Runs     │ │
│  - Artifacts     │  │                              │ │
│  - Dependencies  │  │  [Quick Stats Cards]         │ │
│  - Deployments   │  │  [Recent Builds Table]       │ │
│  - Settings      │  │  [Build Status Chart]        │ │
│                  │  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 2. Core Pages & Views

### 2.1 Dashboard / Home

**Purpose:** Overview of system status

**Components:**
- System health indicators
  - Database status
  - Build queue size
  - Disk space usage
  - Service uptime
  
- Quick stats cards
  - Total artifacts: 42
  - Builds today: 12
  - Success rate: 94%
  - Avg build time: 3m 24s
  
- Recent builds (table)
  - Artifact name
  - Version
  - Status (success/failed/building)
  - Duration
  - Timestamp
  
- Build success rate chart (last 7 days)

**API Requirements:**
```
GET /api/dashboard/stats
GET /api/builds?limit=20&offset=0
GET /api/dashboard/metrics?range=7d
```

### 2.2 Builds

**Purpose:** Browse and manage build runs

**Subpages:**
- **Build Runs List**
  - Filters: status, repository, branch, date range
  - Columns: artifact, version, branch, commit, status, duration, timestamp
  - Actions: View logs, retry, cancel
  
- **Build Details**
  - Build metadata
  - Repository/branch/commit info
  - Build logs (real-time streaming)
  - Artifact produced (link to registry)
  - Build performance metrics
  - Dependencies resolved during build
  
**Components:**
- Build status badge
  - Success (green)
  - Failed (red)
  - Building (blue)
  - Pending (gray)
  
- Real-time log viewer
  - Syntax highlighting
  - Searchable
  - Collapsible sections
  - Timestamp on each line
  
**API Requirements:**
```
GET /api/builds?status={status}&repo={repo}&branch={branch}&limit=50
GET /api/builds/{build_id}
GET /api/builds/{build_id}/logs (WebSocket streaming)
POST /api/builds/{build_id}/retry
POST /api/builds/{build_id}/cancel
GET /api/builds/{build_id}/performance-metrics
```

### 2.3 Artifacts

**Purpose:** Browse artifact registry and versions

**Subpages:**
- **Artifact List**
  - Search/filter by name, tag
  - Columns: name, latest version, type, created date, download count
  - Quick actions: View all versions, view metadata
  
- **Artifact Detail**
  - Metadata display
  - All versions (table)
    - Version
    - Build date
    - Size
    - Tags
    - Download count
    - Actions: download, view metadata, view dependencies
  
- **Version Detail**
  - Full metadata (JSON viewer)
  - Checksum verification
  - Dependency list (with version ranges)
  - Build log link
  - Download link
  - Storage info (path, size, checksum)
  - Tags management (add/remove)
  
**Components:**
- Metadata viewer (formatted JSON with syntax highlighting)
- Dependency tree visualization
- Tag badge collection
- Download button

**API Requirements:**
```
GET /api/registry/artifacts?search={q}&type={type}&limit=50
GET /api/registry/artifacts/{name}
GET /api/registry/artifacts/{name}/{version}
GET /api/registry/artifacts/{name}/{version}/download (blob)
POST /api/registry/artifacts/{name}/{version}/tags
DELETE /api/registry/artifacts/{name}/{version}/tags/{tag}
```

### 2.4 Dependencies

**Purpose:** Explore dependency relationships and conflicts

**Subpages:**
- **Dependency Graph Browser**
  - Visual graph display (DAG)
  - Search artifacts
  - Show dependencies forward/reverse
  - Highlight circular dependencies
  - Zoom/pan controls
  - Legend
  
- **Artifact Dependencies**
  - Direct dependencies (table)
  - Transitive dependencies (table with path)
  - Version ranges and resolved versions
  - Conflict indicators
  
- **Reverse Dependencies**
  - Who depends on this artifact?
  - Dependency chains
  - Impact analysis
  
- **Conflict Report**
  - List detected conflicts
  - Involved artifacts
  - Suggested resolutions
  - Severity indicators
  
**Components:**
- Force-directed graph visualization (D3.js or similar)
- Dependency table with filtering
- Conflict alert component
- Resolution suggestion component

**API Requirements:**
```
GET /api/dependencies/graph/{name}/{version}?depth={depth}&direction={forward|reverse}
GET /api/dependencies/{name}/{version}
GET /api/dependencies/reverse/{name}/{version}
GET /api/dependencies/conflicts
POST /api/dependencies/validate-combination
```

### 2.5 Cascade Rebuilds

**Purpose:** Monitor and manage cascade rebuild chains

**Subpages:**
- **Cascade Chains List**
  - Status: running, success, partial_success, failed
  - Root artifact trigger
  - Timestamp
  - Task count
  - Duration
  
- **Cascade Chain Detail**
  - Root artifact and reason
  - Timeline view of tasks
  - Statistics panel
  - Task list (with status, artifact, duration)
  - Impact summary
  - Log aggregation
  
- **Cascade Analytics**
  - Cascade frequency chart
  - Success rate over time
  - Avg cascade duration
  - Most triggered artifacts
  
**API Requirements:**
```
GET /api/cascade/chains?status={status}&limit=20
GET /api/cascade/chains/{chain_id}
GET /api/cascade/chains/{chain_id}/tasks
GET /api/cascade/statistics
POST /api/cascade/trigger/{name}/{version}
POST /api/cascade/chains/{chain_id}/cancel
```

### 2.6 Deployments

**Purpose:** Manage deployments (Phase 6 integration)

**Subpages:**
- **Deployment List**
  - Service name
  - Current version
  - Status
  - Last updated
  - Health
  
- **Deployment Detail**
  - Service config
  - Version history
  - Deployment logs
  - Health check status
  - Rollback options
  
**API Requirements:**
```
GET /api/deployments
GET /api/deployments/{deployment_id}
POST /api/deployments/{deployment_id}/rollback
POST /api/deployments/{deployment_id}/update-version
GET /api/deployments/{deployment_id}/health
```

---

## 3. Real-Time Features

### 3.1 WebSocket Connections

```
Endpoint: ws://localhost:8080/api/ws

Subscriptions:
  - subscribe:build-logs:{build_id}
    Receives: log lines in real-time
  - subscribe:cascade-chain:{chain_id}
    Receives: task updates, status changes
  - subscribe:deployment-status:{deployment_id}
    Receives: health checks, status changes
  - subscribe:system-metrics
    Receives: resource usage, queue status
```

### 3.2 Real-Time Updates

```javascript
// Build log streaming
ws.subscribe('build-logs:build-123', (line) => {
  addLogLine(line);
  scrollToBottom();
});

// Cascade chain updates
ws.subscribe('cascade-chain:chain-456', (update) => {
  updateTaskStatus(update);
  updateChainProgress(update);
});

// Auto-refresh tables on changes
ws.subscribe('artifacts', () => {
  refetchArtifacts();
});
```

---

## 4. Key Components (React)

### 4.1 Shared Components

```typescript
// Status Badge
<StatusBadge status="success" />  // Green
<StatusBadge status="failed" />   // Red
<StatusBadge status="building" /> // Blue

// Metric Card
<MetricCard
  label="Success Rate"
  value="94%"
  trend="up"
  change="+2%"
/>

// Table with Sorting/Filtering
<DataTable
  columns={columns}
  data={data}
  sortable
  filterable
  pagination
/>

// Build Log Viewer
<LogViewer
  logs={logs}
  realtime={true}
  searchable
  highlightErrors
/>

// Dependency Graph
<DependencyGraph
  artifacts={artifacts}
  edges={dependencies}
  interactive={true}
/>
```

### 4.2 Page Components

```typescript
// Builds Page
export default function BuildsPage() {
  const [builds, setBuilds] = useState([]);
  const [filter, setFilter] = useState({});
  
  useEffect(() => {
    fetchBuilds(filter).then(setBuilds);
  }, [filter]);
  
  return (
    <div>
      <BuildFilters onChange={setFilter} />
      <BuildsTable builds={builds} />
    </div>
  );
}

// Artifact Details
export default function ArtifactDetailPage() {
  const { name, version } = useParams();
  const artifact = useFetch(`/api/registry/artifacts/${name}/${version}`);
  
  return (
    <div>
      <MetadataViewer data={artifact.metadata} />
      <DependencyList dependencies={artifact.dependencies} />
      <VersionHistory versions={artifact.versions} />
    </div>
  );
}
```

---

## 5. State Management

### 5.1 Using TanStack Query

```typescript
// Queries
const useBuilds = (filter) => {
  return useQuery({
    queryKey: ['builds', filter],
    queryFn: () => api.getBuilds(filter),
    refetchInterval: 5000, // Refresh every 5s
  });
};

const useArtifact = (name, version) => {
  return useQuery({
    queryKey: ['artifact', name, version],
    queryFn: () => api.getArtifact(name, version),
    staleTime: 30000, // 30s
  });
};

// Mutations
const useRetryBuild = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buildId) => api.retryBuild(buildId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builds'] });
    },
  });
};
```

---

## 6. Project Structure

```
dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (home)
│   ├── builds/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── artifacts/
│   │   ├── page.tsx
│   │   └── [name]/
│   │       └── [version]/
│   │           └── page.tsx
│   ├── dependencies/
│   │   ├── page.tsx
│   │   └── graph/page.tsx
│   ├── cascade/
│   │   ├── page.tsx
│   │   └── [chainId]/page.tsx
│   ├── deployments/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── settings/
│       └── page.tsx
│
├── components/
│   ├── shared/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── MetricCard.tsx
│   │   └── DataTable.tsx
│   ├── builds/
│   │   ├── BuildsList.tsx
│   │   ├── BuildFilters.tsx
│   │   └── LogViewer.tsx
│   ├── artifacts/
│   │   ├── ArtifactsList.tsx
│   │   ├── MetadataViewer.tsx
│   │   └── VersionHistory.tsx
│   ├── dependencies/
│   │   ├── DependencyGraph.tsx
│   │   ├── DependencyTable.tsx
│   │   └── ConflictAlert.tsx
│   └── cascade/
│       ├── CascadeChainList.tsx
│       ├── CascadeTimeline.tsx
│       └── CascadeStats.tsx
│
├── hooks/
│   ├── useBuilds.ts
│   ├── useArtifacts.ts
│   ├── useDependencies.ts
│   ├── useCascadeChains.ts
│   └── useWebSocket.ts
│
├── api/
│   └── client.ts (API configuration)
│
├── lib/
│   ├── utils.ts
│   └── formatting.ts
│
└── public/
    └── assets/
```

---

## 7. Styling & Design

### 7.1 Tailwind Configuration

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    colors: {
      'success': '#10b981',
      'error': '#ef4444',
      'warning': '#f59e0b',
      'info': '#3b82f6',
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

### 7.2 Color Scheme

```
Background: #0f172a (dark)
Surface: #1e293b
Primary: #3b82f6 (blue)
Success: #10b981 (green)
Error: #ef4444 (red)
Warning: #f59e0b (orange)
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// StatusBadge.test.tsx
describe('StatusBadge', () => {
  it('renders success badge', () => {
    render(<StatusBadge status="success" />);
    expect(screen.getByRole('badge')).toHaveClass('bg-green-500');
  });
});

// LogViewer.test.tsx
describe('LogViewer', () => {
  it('displays log lines', () => {
    render(<LogViewer logs={['line1', 'line2']} />);
    expect(screen.getByText('line1')).toBeInTheDocument();
  });
});
```

### 8.2 Integration Tests

```typescript
// Builds page should fetch and display builds
test('renders builds list', async () => {
  render(<BuildsPage />);
  await waitFor(() => {
    expect(screen.getByText('build-123')).toBeInTheDocument();
  });
});
```

### 8.3 E2E Tests (Playwright)

```typescript
// builds.spec.ts
test('navigate to build and view logs', async ({ page }) => {
  await page.goto('/builds');
  await page.click('text=build-123');
  await page.waitForSelector('.log-line');
  expect(await page.isVisible('.log-line')).toBe(true);
});
```

---

## 9. Performance Considerations

### 9.1 Optimization Techniques

- **Code Splitting:** Lazy load pages with `next/dynamic`
- **Image Optimization:** Use `next/image` for all images
- **API Caching:** Cache builds/artifacts with TanStack Query
- **Real-time Limits:** Throttle WebSocket updates (1 per 100ms)
- **Pagination:** Always paginate large lists
- **Virtualization:** For long tables, use `react-window`

### 9.2 Bundle Size

```
Target: < 150KB main bundle
- Next.js: ~50KB
- React: ~30KB
- UI components: ~20KB
- Utilities: ~15KB
- Other: ~35KB
```

---

## 10. API Documentation Integration

Embed interactive API docs:

```
GET /api/swagger.json
GET /api/docs (SwaggerUI)
```

---

## 11. Success Criteria

- [ ] Dashboard loads and displays system status
- [ ] All pages render correctly
- [ ] Tables support sorting and filtering
- [ ] Real-time log streaming works
- [ ] WebSocket connections stable
- [ ] Dependency graph renders without lag
- [ ] API responses < 500ms
- [ ] All pages mobile-responsive
- [ ] Search functionality works
- [ ] Cascade monitoring displays correctly

---

## 12. Next Steps

1. Set up Next.js project structure
2. Implement shared UI components
3. Build dashboard home page
4. Create builds page with log viewer
5. Build artifacts browser
6. Implement dependency graph visualization
7. Create cascade monitoring view
8. Add WebSocket real-time features
9. Implement comprehensive testing
10. Proceed to [Phase 6: Deployment Engine](06_deployment_engine.md)
