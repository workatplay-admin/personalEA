import { Pact } from '@pact-foundation/pact';
import { like, eachLike } from '@pact-foundation/pact/dsl/matchers';
import axios from 'axios';
import path from 'path';

describe('Email Service Consumer Contract Tests', () => {
  const provider = new Pact({
    consumer: 'dialog-gateway',
    provider: 'email-service',
    port: 1234,
    log: path.resolve(process.cwd(), 'tests/pact/logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'tests/pact/pacts'),
    logLevel: 'INFO',
    spec: 3
  });

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('GET /v1/digest', () => {
    beforeEach(() => {
      const expectedResponse = {
        digest: eachLike({
          email_id: like('email_123'),
          subject: like('Important Project Update'),
          sender: like('alice@example.com'),
          summary: like('Project milestone completed successfully'),
          priority: like('high'),
          action_items: eachLike({
            item: like('Review quarterly reports'),
            confidence: like(0.95),
            due_date: like('2025-06-25T17:00:00Z')
          }),
          confidence_score: like(0.92),
          received_at: like('2025-06-19T14:30:00Z')
        }),
        pagination: {
          limit: like(20),
          cursor: like('eyJpZCI6MTIzLCJ0aW1lc3RhbXAiOiIyMDI1LTA2LTE5VDE0OjMwOjAwWiJ9'),
          has_more: like(false),
          total_count: like(5)
        },
        generated_at: like('2025-06-19T22:15:00Z')
      };

      return provider.addInteraction({
        state: 'user has emails in their inbox',
        uponReceiving: 'a request for email digest',
        withRequest: {
          method: 'GET',
          path: '/v1/digest',
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
            'X-Correlation-ID': like('req_123456789')
          },
          query: {
            limit: '20',
            include_confidence: 'true'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        }
      });
    });

    it('should return email digest with summaries and action items', async () => {
      const response = await axios.get('http://localhost:1234/v1/digest', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Correlation-ID': 'req_123456789'
        },
        params: {
          limit: 20,
          include_confidence: true
        }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('digest');
      expect(response.data).toHaveProperty('pagination');
      expect(response.data).toHaveProperty('generated_at');
      expect(response.data.digest).toBeInstanceOf(Array);
      expect(response.data.digest[0]).toHaveProperty('email_id');
      expect(response.data.digest[0]).toHaveProperty('summary');
      expect(response.data.digest[0]).toHaveProperty('action_items');
      expect(response.data.digest[0]).toHaveProperty('confidence_score');
    });
  });

  describe('POST /v1/sync', () => {
    beforeEach(() => {
      return provider.addInteraction({
        state: 'user has connected email provider',
        uponReceiving: 'a request to sync emails',
        withRequest: {
          method: 'POST',
          path: '/v1/sync',
          headers: {
            'Authorization': like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
            'X-Correlation-ID': like('req_123456789'),
            'X-Idempotency-Key': like('sync_20250619_123456'),
            'Content-Type': 'application/json'
          },
          body: {
            provider: 'gmail',
            sync_type: 'incremental',
            date_range: {
              start: '2025-06-01T00:00:00Z',
              end: '2025-06-19T23:59:59Z'
            }
          }
        },
        willRespondWith: {
          status: 202,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            job_id: like('550e8400-e29b-41d4-a716-446655440000'),
            status: like('pending'),
            created_at: like('2025-06-19T22:15:00Z'),
            message: like('Email sync initiated')
          }
        }
      });
    });

    it('should initiate email sync and return job status', async () => {
      const response = await axios.post('http://localhost:1234/v1/sync', {
        provider: 'gmail',
        sync_type: 'incremental',
        date_range: {
          start: '2025-06-01T00:00:00Z',
          end: '2025-06-19T23:59:59Z'
        }
      }, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Correlation-ID': 'req_123456789',
          'X-Idempotency-Key': 'sync_20250619_123456',
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('job_id');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('created_at');
      expect(response.data.status).toBe('pending');
    });
  });
});