import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Тесты производительности POST /todos', () => {
    const createTodo = async (request: any, id: number) => {
        const startTime = process.hrtime();
        
        const response = await request.post('/todos', {
            data: {
                id: id,
                text: `Performance test TODO ${id}`,
                completed: false
            }
        });

        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000;
        
        return {
            status: response.status(),
            responseTime
        };
    };

    test('измерение времени ответа для одиночного запроса (ожидание < 1 сек)', async ({ request }) => {
        const result = await createTodo(request, Math.floor(Math.random() * 10000));
        
        await allure.attachment(
            "Performance Metrics",
            JSON.stringify({ responseTime: result.responseTime }, null, 2),
            "application/json"
        );

        expect(result.status).toBe(201);
        expect(result.responseTime).toBeLessThan(1000);
    });

    test('измерение времени ответа для 10 параллельных запросов', async ({ request }) => {
        const batchSize = 10;
        const results = [];

        const promises = Array.from({ length: batchSize }, (_, i) => 
            createTodo(request, Math.floor(Math.random() * 10000))
        );

        const batchResults = await Promise.all(promises);

        const responseTimes = batchResults.map(r => r.responseTime);
        const stats = {
            min: Math.min(...responseTimes),
            max: Math.max(...responseTimes),
            average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            total: responseTimes.reduce((a, b) => a + b, 0),
            successRate: batchResults.filter(r => r.status === 201).length / batchSize * 100
        };

        await allure.attachment(
            "Performance Metrics",
            JSON.stringify(stats, null, 2),
            "application/json"
        );

        console.log('Performance Statistics:', stats);

        expect(stats.average).toBeLessThan(1000);
        expect(stats.successRate).toBe(100);
    });

    test('измерение времени ответа при последовательной нагрузке (3 итерации по 5 запросов)', async ({ request }) => {
        const iterations = 3;
        const batchSize = 5;
        const results = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = process.hrtime();


            const promises = Array.from({ length: batchSize }, (_, j) => 
                createTodo(request, Math.floor(Math.random() * 10000))
            );

            const batchResults = await Promise.all(promises);
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const batchTime = seconds * 1000 + nanoseconds / 1000000;

            results.push({
                iteration: i + 1,
                batchTime,
                responseTimes: batchResults.map(r => r.responseTime),
                successRate: batchResults.filter(r => r.status === 201).length / batchSize * 100
            });


            await new Promise(resolve => setTimeout(resolve, 1000));
        }


        const summary = {
            totalRequests: iterations * batchSize,
            averageBatchTime: results.reduce((a, b) => a + b.batchTime, 0) / iterations,
            averageResponseTime: results.flatMap(r => r.responseTimes).reduce((a, b) => a + b, 0) / (iterations * batchSize),
            successRate: results.reduce((a, b) => a + b.successRate, 0) / iterations
        };

        await allure.attachment(
            "Load Test Results",
            JSON.stringify({ results, summary }, null, 2),
            "application/json"
        );

        console.log('Load Test Summary:', summary);

        expect(summary.successRate).toBe(100);
        expect(summary.averageResponseTime).toBeLessThan(2000);
    });
}); 