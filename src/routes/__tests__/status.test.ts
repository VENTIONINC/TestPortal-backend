import request from 'supertest';
import express from 'express';
import statusRouter from '../status';

const app = express();
app.use('/api', statusRouter);


describe('status route', () => {
  it('GET /api/status returns ok', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
