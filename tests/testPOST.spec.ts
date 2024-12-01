import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe("POST /todos", () => {

    const logRequestResponse = async (newTodo: any, responseBody: string, responseStatus: number) => {
        const requestBody = JSON.stringify(newTodo);
        await allure.attachment("Request", requestBody, "application/json");
        await allure.attachment("Response", responseBody, "application/json");

        console.log("Response status:", responseStatus);
        console.log("Response body:", responseBody);
    };

    test("должен создать новую задачу и вернуть код 201", async ({ request }) => {
        const randomId = Math.floor(Math.random() * 10000);
        const newTodo = {
            id: randomId,
            text: `Тестовая задача ${randomId}`,
            completed: false
        };

        const response = await request.post('/todos', {
            data: newTodo
        });

        await logRequestResponse(newTodo, await response.text(), response.status());
        expect(response.status()).toBe(201);
    });

    test("должен вернуть 400 при попытке создать задачу с существующим id", async ({ request }) => {
        const todoId = Math.floor(Math.random() * 10000);
        const todo = {
            id: todoId,
            text: "Задача с дубликатом id",
            completed: false
        };

        await request.post('/todos', {
            data: todo
        });

        const response = await request.post('/todos', {
            data: todo
        });

        await logRequestResponse(todo, await response.text(), response.status());
        expect(response.status()).toBe(400);
    });

    test("должен вернуть 400 при отсутствии обязательного поля id", async ({ request }) => {
        const invalidTodo = {
            text: "Задача без id",
            completed: false
        };

        const response = await request.post('/todos', {
            data: invalidTodo
        });

        const responseBody = await response.text();
        await logRequestResponse(invalidTodo, responseBody, response.status());
        
        expect(response.status()).toBe(400);
        expect(responseBody).toContain("Request body deserialize error: missing field `id`");
    });

    test("должен вернуть 400 при отсутствии обязательного поля text", async ({ request }) => {
        const invalidTodo = {
            id: Math.floor(Math.random() * 10000),
            completed: false
        };

        const response = await request.post('/todos', {
            data: invalidTodo
        });

        const responseBody = await response.text();
        await logRequestResponse(invalidTodo, responseBody, response.status());
        
        expect(response.status()).toBe(400);
        expect(responseBody).toContain("Request body deserialize error: missing field `text`");
    });

    test("должен вернуть 400 при неверном типе данных в полях", async ({ request }) => {
        const invalidTodo = {
            id: "не число" as any,
            text: 12345 as any,
            completed: "не булево значение" as any
        };

        const response = await request.post('/todos', {
            data: invalidTodo
        });

        await logRequestResponse(invalidTodo, await response.text(), response.status());
        expect(response.status()).toBe(400);
    });
});