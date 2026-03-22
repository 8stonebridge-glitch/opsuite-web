import { randomUUID } from 'crypto';
import type { Todo, CreateTodoInput, UpdateTodoInput } from './todo-model';

const store = new Map<string, Todo>();

export function clearStore(): void {
  store.clear();
}

export function createTodo(input: CreateTodoInput): Todo {
  if (!input.title || input.title.trim() === '') {
    throw new Error('Title must not be empty or whitespace-only');
  }
  const now = new Date().toISOString();
  const todo: Todo = {
    id: randomUUID(),
    title: input.title.trim(),
    completed: false,
    created_at: now,
    updated_at: now,
  };
  store.set(todo.id, todo);
  return { ...todo };
}

export function getTodo(id: string): Todo | undefined {
  const todo = store.get(id);
  return todo ? { ...todo } : undefined;
}

export function listTodos(): Todo[] {
  return Array.from(store.values()).map((todo) => ({ ...todo }));
}

export function updateTodo(id: string, input: UpdateTodoInput): Todo {
  const todo = store.get(id);
  if (!todo) {
    throw new Error(`Todo with id "${id}" not found`);
  }
  if (input.title !== undefined) {
    if (input.title.trim() === '') {
      throw new Error('Title must not be empty or whitespace-only');
    }
    todo.title = input.title.trim();
  }
  if (input.completed !== undefined) {
    todo.completed = input.completed;
  }
  todo.updated_at = new Date().toISOString();
  store.set(id, todo);
  return { ...todo };
}

export function deleteTodo(id: string): boolean {
  return store.delete(id);
}
