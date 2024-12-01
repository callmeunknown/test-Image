import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

type Todo = {
    id: number;
    text: string;
    completed: boolean;
};

const logRequestResponse = async (todoId: number, responseBody: string, responseStatus: number) => {
    await allure.attachment(
        "Request URL", 
        `DELETE /todos/${todoId}`, 
        "text/plain"
    );
    await allure.attachment(
        "Request Headers", 
        "Authorization: Basic YWRtaW46YWRtaW4=", // admin:admin в base64
        "text/plain"
    );
    await allure.attachment("Response", responseBody, "application/json");

    console.log("Response status:", responseStatus);
    console.log("Response body:", responseBody);
};

test.describe("DELETE /todos/:id", () => {
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

    test("должен успешно удалить существующую задачу", async ({ request }) => {
        const response = await request.delete(`/todos/${createdTodoId}`, {
            headers: {
                'Authorization': 'Basic YWRtaW46YWRtaW4='
            }
        });

        const responseBody = await response.text();
        await logRequestResponse(createdTodoId, responseBody, response.status());

        expect(response.status()).toBe(204);

        const checkResponse = await request.get('/todos');
        const todos = await checkResponse.json();
        const deletedTodo = todos.find((todo: Todo) => todo.id === createdTodoId);
        expect(deletedTodo).toBeUndefined();
    });

    test("должен вернуть 404 при попытке удалить несуществующую задачу", async ({ request }) => {
        const nonExistentId = 99999;
        const response = await request.delete(`/todos/${nonExistentId}`, {
            headers: {
                'Authorization': 'Basic YWRtaW46YWRtaW4='
            }
        });

        const responseBody = await response.text();
        await logRequestResponse(nonExistentId, responseBody, response.status());

        expect(response.status()).toBe(404);
    });

    test("должен вернуть 401 при отсутствии заголовка Authorization", async ({ request }) => {
        const response = await request.delete(`/todos/${createdTodoId}`);
        const responseBody = await response.text();
        await logRequestResponse(createdTodoId, responseBody, response.status());
        expect(response.status()).toBe(401);
    });

    test("должен вернуть 404 при повторном удалении задачи", async ({ request }) => {
        const firstResponse = await request.delete(`/todos/${createdTodoId}`, {
            headers: {
                'Authorization': 'Basic YWRtaW46YWRtaW4='
            }
        });
        expect(firstResponse.status()).toBe(204);

        const secondResponse = await request.delete(`/todos/${createdTodoId}`, {
            headers: {
                'Authorization': 'Basic YWRtaW46YWRtaW4='
            }
        });

        const responseBody = await secondResponse.text();
        await logRequestResponse(createdTodoId, responseBody, secondResponse.status());
        expect(secondResponse.status()).toBe(404);
    });

    test("должен вернуть 404 при невалидном формате id", async ({ request }) => {
        const invalidId = "invalid-id";
        const response = await request.delete(`/todos/${invalidId}`, {
            headers: {
                'Authorization': 'Basic YWRtaW46YWRtaW4='
            }
        });

        const responseBody = await response.text();
        await logRequestResponse(0, responseBody, response.status());
        expect(response.status()).toBe(404);
    });

    test("должен вернуть 401 при неверных учетных данных", async ({ request }) => {
        const response = await request.delete(`/todos/${createdTodoId}`, {
            headers: {
                'Authorization': 'Basic aW52YWxpZDppbnZhbGlk' // invalid:invalid в base64
            }
        });

        const responseBody = await response.text();
        await logRequestResponse(createdTodoId, responseBody, response.status());
        expect(response.status()).toBe(401);
    });
}); 