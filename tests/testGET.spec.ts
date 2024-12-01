import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

const logRequestResponse = async (endpoint: string, response: any, queryParams?: string) => {
    await allure.attachment(
        "Request", 
        `GET ${endpoint}${queryParams ? `?${queryParams}` : ''}`, 
        "text/plain"
    );

    const responseBody = await response.text();
    await allure.attachment("Response", responseBody, "application/json");

    console.log("Response status:", response.status());
    console.log("Response body:", responseBody);
};

test.describe('GET /todos endpoint', () => {
    test.beforeEach(async ({ request }) => {
        for (let i = 0; i < 3; i++) {
            const randomId = Math.floor(Math.random() * 10000);
            await request.post('/todos', {
                data: {
                    id: randomId,
                    text: `Test TODO ${randomId}`,
                    completed: i % 2 === 0
                }
            });
        }
    });

    test('должен вернуть список всех задач без параметров', async ({ request }) => {
        const response = await request.get('/todos');
        await logRequestResponse('/todos', response);

        expect(response.status()).toBe(200);
        const todos = await response.json();
        expect(Array.isArray(todos)).toBeTruthy();
        expect(todos.length).toBeGreaterThanOrEqual(3);

        const firstTodo = todos[0];
        expect(firstTodo).toHaveProperty('id');
        expect(firstTodo).toHaveProperty('text');
        expect(firstTodo).toHaveProperty('completed');
    });

    test('должен вернуть ограниченное количество задач с параметром limit', async ({ request }) => {
        const limit = 2;
        const response = await request.get(`/todos?limit=${limit}`);
        await logRequestResponse('/todos', response, `limit=${limit}`);

        expect(response.status()).toBe(200);
        const todos = await response.json();
        expect(todos.length).toBeLessThanOrEqual(limit);
    });

    test('должен пропустить указанное количество задач с параметром offset', async ({ request }) => {
        const offset = 1;
        const response = await request.get(`/todos?offset=${offset}`);
        await logRequestResponse('/todos', response, `offset=${offset}`);

        expect(response.status()).toBe(200);
        const todos = await response.json();
        expect(Array.isArray(todos)).toBeTruthy();
    });

    test('должен корректно применять оба параметра offset и limit', async ({ request }) => {
        const offset = 1;
        const limit = 1;
        const response = await request.get(`/todos?offset=${offset}&limit=${limit}`);
        await logRequestResponse('/todos', response, `offset=${offset}&limit=${limit}`);

        expect(response.status()).toBe(200);
        const todos = await response.json();
        expect(todos.length).toBeLessThanOrEqual(limit);
    });

    test('должен вернуть 400 при невалидных параметрах', async ({ request }) => {
        const response = await request.get('/todos?offset=invalid&limit=abc');
        await logRequestResponse('/todos', response, 'offset=invalid&limit=abc');

        expect(response.status()).toBe(400);
    });
});