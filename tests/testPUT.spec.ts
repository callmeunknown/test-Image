import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

type Todo = {
    id?: number;
    text?: string;
    completed?: boolean;
};

const logRequestResponse = async (updatedTodo: Todo, responseBody: string, responseStatus: number, todoId: number) => {
    const requestBody = JSON.stringify(updatedTodo);
    await allure.attachment(
        "Request URL", 
        `PUT /todos/${todoId}`, 
        "text/plain"
    );
    await allure.attachment("Request Body", requestBody, "application/json");
    await allure.attachment("Response", responseBody, "application/json");

    console.log("Response status:", responseStatus);
    console.log("Response body:", responseBody);
};

test.describe("PUT /todos/:id", () => {
    let createdTodoId: number;

    test.beforeEach(async ({ request }) => {
        const randomId = Math.floor(Math.random() * 10000);
        const newTodo = {
            id: randomId,
            text: `Test TODO ${randomId}`,
            completed: false
        };

        const response = await request.post('/todos', {
            data: newTodo
        });

        expect(response.status()).toBe(201);
        createdTodoId = randomId;
    });


    test("должен вернуть 404 при попытке обновить несуществующую задачу", async ({ request }) => {
        const nonExistentId = 99999;
        const updatedTodo: Todo = {
            id: nonExistentId,
            text: "Обновление несуществующей задачи",
            completed: true
        };

        const response = await request.put(`/todos/${nonExistentId}`, {
            data: updatedTodo
        });

        const responseBody = await response.text();
        await logRequestResponse(updatedTodo, responseBody, response.status(), nonExistentId);

        expect(response.status()).toBe(404);
    });

    test("должен вернуть 401 при обновлении без обязательного поля text", async ({ request }) => {
        const invalidUpdate: Todo = {
            id: createdTodoId,
            completed: true
        };

        const response = await request.put(`/todos/${createdTodoId}`, {
            data: invalidUpdate
        });

        const responseBody = await response.text();
        await logRequestResponse(invalidUpdate, responseBody, response.status(), createdTodoId);

        expect(response.status()).toBe(401);
    });

    test("должен вернуть 401 при неверных типах данных", async ({ request }) => {
        const invalidTodo = {
            id: createdTodoId,
            text: 12345 as any,
            completed: "не булево значение" as any
        };

        const response = await request.put(`/todos/${createdTodoId}`, {
            data: invalidTodo
        });

        const responseBody = await response.text();
        await logRequestResponse(invalidTodo as Todo, responseBody, response.status(), createdTodoId);

        expect(response.status()).toBe(401);
    });

    test("должен обновить задачу с указанием всех полей", async ({ request }) => {
        const fullUpdate: Todo = {
            id: createdTodoId,
            text: "Полностью обновленная задача",
            completed: true
        };

        const response = await request.put(`/todos/${createdTodoId}`, {
            data: fullUpdate
        });

        const responseBody = await response.text();
        await logRequestResponse(fullUpdate, responseBody, response.status(), createdTodoId);

        expect(response.status()).toBe(200);

        const checkResponse = await request.get('/todos');
        const todos = await checkResponse.json();
        const updatedTodoFromList = todos.find((todo: Todo) => todo.id === createdTodoId);
        
        expect(updatedTodoFromList).toBeDefined();
        expect(updatedTodoFromList.text).toBe(fullUpdate.text);
        expect(updatedTodoFromList.completed).toBe(fullUpdate.completed);
    });

    test("должен обновить только поле completed", async ({ request }) => {
        const getResponse = await request.get('/todos');
        const todos = await getResponse.json();
        const currentTodo = todos.find((todo: Todo) => todo.id === createdTodoId);
        
        const partialUpdate: Todo = {
            id: createdTodoId,
            text: currentTodo.text,
            completed: !currentTodo.completed
        };

        const response = await request.put(`/todos/${createdTodoId}`, {
            data: partialUpdate
        });

        const responseBody = await response.text();
        await logRequestResponse(partialUpdate, responseBody, response.status(), createdTodoId);

        expect(response.status()).toBe(200);

        const checkResponse = await request.get('/todos');
        const updatedTodos = await checkResponse.json();
        const updatedTodo = updatedTodos.find((todo: Todo) => todo.id === createdTodoId);
        
        expect(updatedTodo).toBeDefined();
        expect(updatedTodo.text).toBe(currentTodo.text);
        expect(updatedTodo.completed).toBe(!currentTodo.completed);
    });
});