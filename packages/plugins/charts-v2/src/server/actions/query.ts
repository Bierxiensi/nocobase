import { Context, Next } from '@nocobase/actions';
import { formatter } from './formatter';
import { FilterParser } from '@nocobase/database';
import ChartsV2Plugin from '../plugin';

type QueryParams = Partial<{
  uid: string;
  collection: string;
  measures: {
    field: string;
    aggregate?: string;
    alias?: string;
  }[];
  dimensions: {
    field: string;
    alias?: string;
    format?: string;
  }[];
  orders: {
    field: string;
    order: 'asc' | 'desc';
  }[];
  filter: any;
  limit: number;
  sql: {
    fields?: string;
    clauses?: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
}>;

const parseBuilder = (ctx: Context, builder: QueryParams) => {
  const { sequelize } = ctx.db;
  const { collection, measures, dimensions, orders, filter, limit } = builder;
  const repository = ctx.db.getRepository(collection);
  const fields = repository.collection.fields;
  const attributes = [];
  const group = [];
  const order = [];

  measures.forEach((item: { field: string; aggregation: string; alias: string }) => {
    const attribute = [];
    const col = sequelize.col(item.field);
    if (item.aggregation) {
      attribute.push(sequelize.fn(item.aggregation, col));
    } else {
      attribute.push(item.field);
    }
    if (item.alias) {
      attribute.push(item.alias);
    }
    attributes.push(attribute.length > 1 ? attribute : attribute[0]);
  });

  dimensions.forEach((item: { field: string; format: string; alias: string }) => {
    const type = fields.get(item.field).type;
    const attribute = [];
    if (item.format) {
      attribute.push(formatter(sequelize, type, item.field, item.format));
    } else {
      attribute.push(item.field);
    }
    if (item.alias) {
      attribute.push(item.alias);
    }
    attributes.push(attribute.length > 1 ? attribute : attribute[0]);
    group.push(attribute.length > 1 ? attribute[1] : attribute[0]);
  });

  orders?.forEach((item: { field: string; order: string }) => {
    order.push([item.field, item.order || 'ASC']);
  });

  const filterParser = new FilterParser(filter, {
    collection: repository.collection,
  });

  return {
    attributes,
    group,
    order,
    limit: limit > 2000 ? 2000 : limit,
    ...filterParser.toSequelizeParams(),
  };
};

const queryData = async (ctx: Context, builder: QueryParams) => {
  const { collection, measures, dimensions, orders, filter, limit, sql } = builder;
  const repository = ctx.db.getRepository(collection);

  if (!sql) {
    return await repository.find(parseBuilder(ctx, { collection, measures, dimensions, orders, filter, limit }));
  }

  const statement = `SELECT ${sql.fields} FROM ${collection} ${sql.clauses}`;
  const [data] = await ctx.db.sequelize.query(statement);
  return data;
};

export const query = async (ctx: Context, next: Next) => {
  const {
    uid,
    collection,
    measures,
    dimensions,
    orders,
    filter,
    limit,
    sql,
    cache: cacheConfig,
  } = ctx.action.params.values as QueryParams;
  console.log(uid);
  const plugin = ctx.app.getPlugin('charts-v2') as ChartsV2Plugin;
  if (cacheConfig?.enabled && uid) {
    const cache = plugin.cache;
    const data = await cache.get(uid);
    if (data) {
      console.log('cache hit');
      ctx.body = data;
      return next();
    }
  }

  try {
    const data = await queryData(ctx, { collection, measures, dimensions, orders, filter, limit, sql });
    if (cacheConfig?.enabled && uid) {
      const cache = plugin.cache;
      await cache.set(uid, data, cacheConfig.ttl);
    }
    ctx.body = data;
  } catch (err) {
    ctx.app.logger.error('charts query', err);
    ctx.throw(500, err);
  }

  await next();
};
