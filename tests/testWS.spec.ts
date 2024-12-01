import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';
import WebSocket from 'ws';

interface WSEvents {
    on(event: 'open', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'message', listener: (data: Buffer) => void): this;
    once(event: 'message', listener: (data: Buffer) => void): this;
}

type ExtendedWebSocket = WebSocket & WSEvents;

const logWSMessage = async (type: string, message: any) => {
    await allure.attachment(
        type,
        JSON.stringify(message, null, 2),
        "application/json"
    );
    console.log(`${type}:`, message);
};

test.describe('WebSocket /ws endpoint', () => {
    let ws: ExtendedWebSocket;

    test.beforeEach(async () => {
        ws = new WebSocket('ws://localhost:8080/ws') as ExtendedWebSocket;

        await new Promise<void>((resolve, reject) => {
            ws.on('open', () => {
                console.log('WebSocket connection opened');
                resolve();
            });
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            });
            setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });
    });

    test.afterEach(async () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });

    test('должен получать уведомления о новых TODO', async ({ request }) => {
        const messages: any[] = [];
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messages.push(message);
        });

        const newTodo = {
            id: Math.floor(Math.random() * 10000),
            text: "Тестовая задача для WebSocket",
            completed: false
        };

        await logWSMessage("Creating TODO", newTodo);
        const response = await request.post('/todos', {
            data: newTodo
        });
        expect(response.status()).toBe(201);

        await new Promise<void>((resolve) => setTimeout(resolve, 1000));

        const notification = messages.find(msg => 
            msg.type === 'new_todo' && 
            msg.data.id === newTodo.id
        );
        
        await logWSMessage("Received notification", notification);
        expect(notification).toBeDefined();
        expect(notification.type).toBe('new_todo');
        expect(notification.data).toMatchObject(newTodo);
    });

    test('должен получать уведомления для нескольких TODO', async ({ request }) => {
        const messages: any[] = [];
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messages.push(message);
        });

        const todos = [];
        for (let i = 0; i < 3; i++) {
            const todo = {
                id: Math.floor(Math.random() * 10000),
                text: `Тестовая задача ${i}`,
                completed: false
            };
            todos.push(todo);

            await logWSMessage(`Creating TODO ${i}`, todo);
            const response = await request.post('/todos', {
                data: todo
            });
            expect(response.status()).toBe(201);
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 2000));

        for (const todo of todos) {
            const notification = messages.find(msg => 
                msg.type === 'new_todo' && 
                msg.data.id === todo.id
            );
            expect(notification).toBeDefined();
            expect(notification.type).toBe('new_todo');
            expect(notification.data).toMatchObject(todo);
        }
    });

    test('должен поддерживать длительное соединение для уведомлений', async ({ request }) => {
        const messages: any[] = [];
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messages.push(message);
        });

        for (let i = 0; i < 3; i++) {
            const todo = {
                id: Math.floor(Math.random() * 10000),
                text: `Задача с задержкой ${i}`,
                completed: false
            };

            await new Promise(resolve => setTimeout(resolve, 1000));
            await logWSMessage(`Creating delayed TODO ${i}`, todo);
            const response = await request.post('/todos', {
                data: todo
            });
            expect(response.status()).toBe(201);
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        expect(messages.length).toBe(3);
        expect(messages.every(msg => msg.type === 'new_todo')).toBeTruthy();
    });

    test('должен обрабатывать потерю соединения и переподключение', async ({ request }) => {
        const messages: any[] = [];
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messages.push(message);
        });

        const firstTodo = {
            id: Math.floor(Math.random() * 10000),
            text: "Задача до переподключения",
            completed: false
        };

        await logWSMessage("Creating first TODO", firstTodo);
        await request.post('/todos', { data: firstTodo });

        await new Promise<void>((resolve) => setTimeout(resolve, 1000));

        const firstNotification = messages.find(msg => 
            msg.type === 'new_todo' && 
            msg.data.id === firstTodo.id
        );
        expect(firstNotification).toBeDefined();

        ws.close();
        await new Promise(resolve => setTimeout(resolve, 1000));

        ws = new WebSocket('ws://localhost:8080/ws') as ExtendedWebSocket;
        
        await new Promise<void>((resolve, reject) => {
            ws.on('open', () => {
                console.log('WebSocket reconnected');
                resolve();
            });
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
        });

        messages.length = 0;
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messages.push(message);
        });

        const secondTodo = {
            id: Math.floor(Math.random() * 10000),
            text: "Задача после переподключения",
            completed: false
        };

        await logWSMessage("Creating second TODO", secondTodo);
        await request.post('/todos', { data: secondTodo });

        await new Promise<void>((resolve) => setTimeout(resolve, 1000));

        const secondNotification = messages.find(msg => 
            msg.type === 'new_todo' && 
            msg.data.id === secondTodo.id
        );
        expect(secondNotification).toBeDefined();
        expect(secondNotification.type).toBe('new_todo');
        expect(secondNotification.data).toMatchObject(secondTodo);
    });

    test('должен получать корректную структуру уведомлений', async ({ request }) => {
        const messages: any[] = [];
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messages.push(message);
        });

        const newTodo = {
            id: Math.floor(Math.random() * 10000),
            text: "Тестовая задача для проверки структуры",
            completed: false
        };

        await logWSMessage("Creating TODO", newTodo);
        const response = await request.post('/todos', {
            data: newTodo
        });
        expect(response.status()).toBe(201);

        await new Promise<void>((resolve) => setTimeout(resolve, 1000));

        const notification = messages.find(msg => msg.type === 'new_todo');
        expect(notification).toBeDefined();
        expect(notification).toHaveProperty('type', 'new_todo');
        expect(notification).toHaveProperty('data');
        expect(notification.data).toHaveProperty('id');
        expect(notification.data).toHaveProperty('text');
        expect(notification.data).toHaveProperty('completed');
        expect(typeof notification.data.id).toBe('number');
        expect(typeof notification.data.text).toBe('string');
        expect(typeof notification.data.completed).toBe('boolean');
    });
});