# Vue 3 Component Test Patterns

The six-instruction methodology adapted for Vue 3 Composition API component tests with Vitest + @vue/test-utils.

## Instruction Mapping

| Backend Instruction | Component Equivalent | How |
|---|---|---|
| TimeControl | `vi.useFakeTimers()` | Same as backend |
| EntitySetup | Seed store + mock API | `createTestingPinia`, MSW handlers |
| ApiCall | User interaction | `wrapper.find().trigger('click')` |
| ResponseValidate | Assert rendered DOM | `expect(wrapper.text()).toContain(...)` |
| EntityValidate | Assert store state | `expect(store.items).toHaveLength(1)` |
| EntityNonExistence | Assert absence | `expect(wrapper.find('.item').exists()).toBe(false)` |

## Example: TodoList Component

```typescript
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { vi } from 'vitest'
import TodoList from '@/components/TodoList.vue'
import { useTodoStore } from '@/stores/todo'

describe('TodoList', () => {
  it('renders todos and allows adding new ones', async () => {
    // EntitySetup — seed the Pinia store
    const wrapper = mount(TodoList, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              todo: {
                todos: [
                  { id: 1, title: 'Existing todo', completed: false },
                ],
              },
            },
          }),
        ],
      },
    })

    // ResponseValidate — assert initial render
    expect(wrapper.text()).toContain('Existing todo')

    // "ApiCall" — user interaction
    await wrapper.find('[data-testid="new-todo-input"]').setValue('Buy milk')
    await wrapper.find('[data-testid="add-todo-btn"]').trigger('click')

    // EntityValidate — check the store state, not just the DOM
    const store = useTodoStore()
    expect(store.addTodo).toHaveBeenCalledWith('Buy milk')
  })

  it('shows empty state when no todos', () => {
    const wrapper = mount(TodoList, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    })

    // ResponseValidate — empty state rendering
    expect(wrapper.text()).toContain('No todos yet')
    expect(wrapper.find('[data-testid="todo-item"]').exists()).toBe(false)
  })
})
```

## EntitySetup Patterns for Vue

**Seed Pinia store via initialState:**
```typescript
createTestingPinia({
  createSpy: vi.fn,
  initialState: {
    auth: { currentUser: { id: 1, name: 'Alice', role: 'admin' } },
    todo: { todos: [{ id: 1, title: 'Test', completed: false }] },
  },
})
```

**Mock API calls via MSW:**
```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('/api/todos', () => HttpResponse.json([
    { id: 1, title: 'Buy milk', completed: false },
  ])),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## The Critical Rule: Assert Store State, Not Just DOM

```typescript
// INCOMPLETE — only checks what's rendered
expect(wrapper.text()).toContain('Todo added')

// COMPLETE — also checks the data layer
const store = useTodoStore()
expect(store.todos).toHaveLength(2)
expect(store.todos[1].title).toBe('Buy milk')
```

This is the frontend equivalent of EntityValidate. The DOM is the "response" — the store is the "database." Check both.

## Use `data-testid` for Selectors

```typescript
// GOOD — stable selector
await wrapper.find('[data-testid="submit-btn"]').trigger('click')

// BAD — breaks when CSS changes
await wrapper.find('.btn-primary').trigger('click')

// GOOD — accessible selector
await wrapper.find('button[aria-label="Submit"]').trigger('click')
```
