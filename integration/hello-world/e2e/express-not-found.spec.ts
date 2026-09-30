import { ArgumentsHost, HttpException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Hello world (express not-found handling)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it.each([
    { prefix: 'api', path: '/api/missing' },
    { prefix: '/api', path: '/api/missing' },
    { prefix: 'api', path: '/api' },
    { prefix: '/api', path: '/api/' },
    { prefix: 'api/', path: '/api/missing' },
    { prefix: '/api/', path: '/api/missing' },
    { prefix: 'api/', path: '/api' },
    { prefix: '/api/', path: '/api/' },
    { prefix: 'api/v1', path: '/api/v1/missing' },
    { prefix: 'api/v1/', path: '/api/v1/missing' },
    { prefix: undefined, path: '/missing' },
    { prefix: '', path: '/missing' },
    { prefix: '/', path: '/missing' },
    { prefix: '/', path: '/' },
    // Outside the global prefix. Express answers these itself unless the
    // not-found handler is mounted at the root as well.
    { prefix: 'api', path: '/missing' },
    { prefix: '/api/', path: '/missing' },
    { prefix: 'api/v1', path: '/api/missing' },
    { prefix: 'api', path: '/' },
  ])(
    'uses the global exception filter for $path with prefix $prefix',
    async ({ prefix, path }) => {
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication();
      if (prefix !== undefined) {
        app.setGlobalPrefix(prefix);
      }
      app.useGlobalFilters({
        catch(exception: HttpException, host: ArgumentsHost) {
          host
            .switchToHttp()
            .getResponse()
            .status(exception.getStatus())
            .json({ handledBy: 'nest' });
        },
      });
      await app.init();

      await request(app.getHttpServer())
        .get(path)
        .expect(404)
        .expect({ handledBy: 'nest' });
    },
  );

  it('uses the global exception filter next to an excluded route', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['hello'] });
    app.useGlobalFilters({
      catch(exception: HttpException, host: ArgumentsHost) {
        host
          .switchToHttp()
          .getResponse()
          .status(exception.getStatus())
          .json({ handledBy: 'nest' });
      },
    });
    await app.init();

    // An excluded route is served outside the prefix, so a miss beside it is
    // outside the prefix too.
    await request(app.getHttpServer())
      .get('/hello/missing')
      .expect(404)
      .expect({ handledBy: 'nest' });
  });
});
