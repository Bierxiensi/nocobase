/*
# 编写 Application 测试用例

# 执行测试
yarn test examples/app/__tests__/app.test.ts
*/
import { MockServer, mockServer } from '@nocobase/test';

describe('app test', () => {
  let app: MockServer;

  beforeEach(() => {
    app = mockServer();
  });

  test('test1', async () => {
    app.resource({
      name: 'test',
      actions: {
        async list(ctx, next) {
          ctx.body = 'test list';
          await next();
        },
      },
    });
    const response = await app.agent().resource('test').list();
    expect(response.body).toEqual({ data: 'test list' });
  });

  afterEach(async () => {
    await app.destroy();
  });
});
