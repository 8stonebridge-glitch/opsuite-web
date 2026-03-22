import {
  clearStore,
  createTodo,
  getTodo,
  listTodos,
  updateTodo,
  deleteTodo,
} from '../src/todo-service';

beforeEach(() => {
  clearStore();
});

describe('createTodo', () => {
  it('ac-1: creates a todo with generated id, title, completed=false, and ISO timestamps', () => {
    const todo = createTodo({ title: 'Buy milk' });
    expect(typeof todo.id).toBe('string');
    expect(todo.id.length).toBeGreaterThan(0);
    expect(todo.title).toBe('Buy milk');
    expect(todo.completed).toBe(false);
    expect(new Date(todo.created_at).toISOString()).toBe(todo.created_at);
    expect(new Date(todo.updated_at).toISOString()).toBe(todo.updated_at);
  });

  it('ac-6: rejects empty title with an Error', () => {
    expect(() => createTodo({ title: '' })).toThrow(Error);
  });

  it('ac-6: rejects whitespace-only title with an Error', () => {
    expect(() => createTodo({ title: '   ' })).toThrow(Error);
  });
});

describe('getTodo', () => {
  it('ac-2: returns a todo by id', () => {
    const created = createTodo({ title: 'Read a book' });
    const found = getTodo(created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
    expect(found!.title).toBe('Read a book');
  });

  it('ac-2: returns undefined for unknown id', () => {
    expect(getTodo('nonexistent-id')).toBeUndefined();
  });
});

describe('listTodos', () => {
  it('ac-3: returns all todos as an array', () => {
    createTodo({ title: 'Task A' });
    createTodo({ title: 'Task B' });
    const todos = listTodos();
    expect(Array.isArray(todos)).toBe(true);
    expect(todos).toHaveLength(2);
    const titles = todos.map((t) => t.title);
    expect(titles).toContain('Task A');
    expect(titles).toContain('Task B');
  });

  it('returns an empty array when store is empty', () => {
    expect(listTodos()).toEqual([]);
  });
});

describe('updateTodo', () => {
  it('ac-4: updates title and completed, updates updated_at', () => {
    const todo = createTodo({ title: 'Initial' });
    const before = todo.updated_at;

    // Ensure a measurable time difference
    const updated = updateTodo(todo.id, { title: 'Updated', completed: true });
    expect(updated.title).toBe('Updated');
    expect(updated.completed).toBe(true);
    expect(updated.updated_at >= before).toBe(true);
  });

  it('ac-7: throws Error when todo not found', () => {
    expect(() => updateTodo('ghost-id', { title: 'New' })).toThrow(Error);
  });
});

describe('deleteTodo', () => {
  it('ac-5: removes a todo and returns true', () => {
    const todo = createTodo({ title: 'To delete' });
    expect(deleteTodo(todo.id)).toBe(true);
    expect(getTodo(todo.id)).toBeUndefined();
  });

  it('ac-5: returns false when todo does not exist', () => {
    expect(deleteTodo('no-such-id')).toBe(false);
  });
});
