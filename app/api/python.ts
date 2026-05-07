'use server'

const API_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export async function getTodos() {
  try {
    const response = await fetch(`${API_URL}/todos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always get fresh data
    });

    if (!response.ok) {
      throw new Error('Failed to fetch todos');
    }

    const data = await response.json();
    return { success: true, data: data.todos };
  } catch (error) {
    console.error('Error fetching todos:', error);
    return { success: false, error: 'Failed to fetch todos' };
  }
}

export async function createTodo(task: string) {
  try {
    const response = await fetch(`${API_URL}/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task }),
    });

    if (!response.ok) {
      throw new Error('Failed to create todo');
    }

    const data = await response.json();
    return { success: true, data: data.todos };
  } catch (error) {
    console.error('Error creating todo:', error);
    return { success: false, error: 'Failed to create todo' };
  }
}

export async function deleteTodo(id: number) {
  try {
    const response = await fetch(`${API_URL}/todos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete todo');
    }

    const data = await response.json();
    return { success: true, data: data.todos };
  } catch (error) {
    console.error('Error deleting todo:', error);
    return { success: false, error: 'Failed to delete todo' };
  }
}

export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Service unhealthy');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error checking health:', error);
    return { success: false, error: 'Service unavailable' };
  }
}