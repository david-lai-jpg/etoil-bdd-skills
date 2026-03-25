# React Component Test Patterns

The six-instruction methodology adapted for React component tests with Vitest + @testing-library/react.

## Instruction Mapping

| Backend Instruction | Component Equivalent | How |
|---|---|---|
| TimeControl | `vi.useFakeTimers()` | Same as backend |
| EntitySetup | Seed store + mock API | `useStore.setState()`, MSW handlers |
| ApiCall | User interaction | `userEvent.click()`, `userEvent.type()` |
| ResponseValidate | Assert rendered DOM | `expect(screen.getByText(...))` |
| EntityValidate | Assert store state | `expect(useStore.getState().items)` |
| EntityNonExistence | Assert absence | `expect(screen.queryByText(...)).not.toBeInTheDocument()` |

## Example: TodoList Component

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import TodoList from '@/components/TodoList'
import { useTodoStore } from '@/stores/todo'

describe('TodoList', () => {
  beforeEach(() => {
    // Reset Zustand store between tests
    useTodoStore.setState({ todos: [], loading: false })
  })

  it('renders todos and allows adding new ones', async () => {
    const user = userEvent.setup()

    // EntitySetup — seed the Zustand store
    useTodoStore.setState({
      todos: [{ id: 1, title: 'Existing todo', completed: false }],
    })

    render(<TodoList />)

    // ResponseValidate — assert initial render
    expect(screen.getByText('Existing todo')).toBeInTheDocument()

    // "ApiCall" — user interaction
    await user.type(screen.getByPlaceholderText('Add todo'), 'Buy milk')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    // EntityValidate — check the store state
    const { todos } = useTodoStore.getState()
    expect(todos).toHaveLength(2)
    expect(todos[1].title).toBe('Buy milk')
  })

  it('shows empty state when no todos', () => {
    render(<TodoList />)

    expect(screen.getByText('No todos yet')).toBeInTheDocument()
    expect(screen.queryByTestId('todo-item')).not.toBeInTheDocument()
  })
})
```

## EntitySetup Patterns for React

**Seed Zustand store:**
```typescript
// Direct state injection (Zustand's key advantage for testing)
useTodoStore.setState({
  todos: [{ id: 1, title: 'Test', completed: false }],
  loading: false,
})
```

**Seed TanStack Query cache:**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

// Pre-populate the cache
queryClient.setQueryData(['todos'], [
  { id: 1, title: 'Buy milk', completed: false },
])

render(
  <QueryClientProvider client={queryClient}>
    <TodoList />
  </QueryClientProvider>
)
```

**Mock API calls via MSW:**
```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('/api/todos', () => HttpResponse.json([
    { id: 1, title: 'Buy milk', completed: false },
  ])),
  http.post('/api/todos', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 2, ...body, completed: false }, { status: 201 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## The Critical Rule: Assert Store State, Not Just DOM

```typescript
// INCOMPLETE — only checks rendered output
expect(screen.getByText('Todo added')).toBeInTheDocument()

// COMPLETE — also checks the data layer
const { todos } = useTodoStore.getState()
expect(todos).toHaveLength(2)
expect(todos[1]).toMatchObject({ title: 'Buy milk', completed: false })
```

## Use `userEvent` Over `fireEvent`

```typescript
// GOOD — simulates real user behavior (focus, keydown, input, keyup, blur)
const user = userEvent.setup()
await user.click(button)
await user.type(input, 'Buy milk')

// BAD — fires a single synthetic event, misses intermediate events
fireEvent.click(button)
fireEvent.change(input, { target: { value: 'Buy milk' } })
```

`userEvent` catches bugs that `fireEvent` misses — like handlers that listen for `keydown` instead of `change`.
