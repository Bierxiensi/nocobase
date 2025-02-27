import {
  Association,
  BelongsTo,
  BelongsToMany,
  HasMany,
  HasOne,
  Hookable,
  ModelStatic,
  Transactionable,
} from 'sequelize';
import { Model } from './model';
import { UpdateGuard } from './update-guard';
import lodash from 'lodash';

function isUndefinedOrNull(value: any) {
  return typeof value === 'undefined' || value === null;
}

function isStringOrNumber(value: any) {
  return typeof value === 'string' || typeof value === 'number';
}

function getKeysByPrefix(keys: string[], prefix: string) {
  return keys.filter((key) => key.startsWith(`${prefix}.`)).map((key) => key.substring(prefix.length + 1));
}

export function modelAssociations(instance: Model) {
  return (<typeof Model>instance.constructor).associations;
}

export function belongsToManyAssociations(instance: Model): Array<BelongsToMany> {
  const associations = modelAssociations(instance);
  return Object.entries(associations)
    .filter((entry) => {
      const [key, association] = entry;
      return association.associationType == 'BelongsToMany';
    })
    .map((association) => {
      return <BelongsToMany>association[1];
    });
}

export function modelAssociationByKey(instance: Model, key: string): Association {
  return modelAssociations(instance)[key] as Association;
}

type UpdateValue = { [key: string]: any };

interface UpdateOptions extends Transactionable {
  filter?: any;
  filterByTk?: number | string;
  // 字段白名单
  whitelist?: string[];
  // 字段黑名单
  blacklist?: string[];
  // 关系数据默认会新建并建立关联处理，如果是已存在的数据只关联，但不更新关系数据
  // 如果需要更新关联数据，可以通过 updateAssociationValues 指定
  updateAssociationValues?: string[];
  sanitized?: boolean;
  sourceModel?: Model;
}

interface UpdateAssociationOptions extends Transactionable, Hookable {
  updateAssociationValues?: string[];
  sourceModel?: Model;
  context?: any;
  associationContext?: any;
  recursive?: boolean;
}

export async function updateModelByValues(instance: Model, values: UpdateValue, options?: UpdateOptions) {
  if (!options?.sanitized) {
    const guard = new UpdateGuard();
    //@ts-ignore
    guard.setModel(instance.constructor);
    guard.setBlackList(options.blacklist);
    guard.setWhiteList(options.whitelist);
    guard.setAssociationKeysToBeUpdate(options.updateAssociationValues);
    values = guard.sanitize(values);
  }

  await instance.update(values, options);
  await updateAssociations(instance, values, options);
}

export async function updateThroughTableValue(
  instance: Model,
  throughName: string,
  throughValues: any,
  source: Model,
  transaction = null,
) {
  // update through table values
  for (const belongsToMany of belongsToManyAssociations(instance)) {
    // @ts-ignore
    const throughModel = belongsToMany.through.model;
    const throughModelName = throughModel.name;

    if (throughModelName === throughModelName) {
      const where = {
        [belongsToMany.foreignKey]: instance.get(belongsToMany.sourceKey),
        [belongsToMany.otherKey]: source.get(belongsToMany.targetKey),
      };

      return await throughModel.update(throughValues, {
        where,
        transaction,
      });
    }
  }
}

/**
 * update association of instance by values
 * @param instance
 * @param values
 * @param options
 */
export async function updateAssociations(instance: Model, values: any, options: UpdateAssociationOptions = {}) {
  // if no values set, return
  if (!values) {
    return;
  }

  if (options?.updateAssociationValues) {
    options.recursive = true;
  }

  let newTransaction = false;
  let transaction = options.transaction;

  if (!transaction) {
    newTransaction = true;
    transaction = await instance.sequelize.transaction();
  }

  const keys = Object.keys(values);

  try {
    for (const key of Object.keys(modelAssociations(instance))) {
      if (keys.includes(key)) {
        await updateAssociation(instance, key, values[key], {
          ...options,
          transaction,
        });
      }
    }

    // update through table values
    for (const belongsToMany of belongsToManyAssociations(instance)) {
      // @ts-ignore
      const throughModel = belongsToMany.through.model;
      const throughModelName = throughModel.name;

      if (values[throughModelName] && options.sourceModel) {
        const where = {
          [belongsToMany.foreignKey]: instance.get(belongsToMany.sourceKey),
          [belongsToMany.otherKey]: options.sourceModel.get(belongsToMany.targetKey),
        };

        await throughModel.update(values[throughModel.name], {
          where,
          context: options.context,
          transaction,
        });
      }
    }

    if (newTransaction) {
      await transaction.commit();
    }
  } catch (error) {
    if (newTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

function isReverseAssociationPair(a: any, b: any) {
  const typeSet = new Set();
  typeSet.add(a.associationType);
  typeSet.add(b.associationType);

  if (typeSet.size == 1 && typeSet.has('BelongsToMany')) {
    return (
      a.through.tableName === b.through.tableName &&
      a.target.name === b.source.name &&
      b.target.name === a.source.name &&
      a.foreignKey === b.otherKey &&
      a.sourceKey === b.targetKey &&
      a.otherKey === b.foreignKey &&
      a.targetKey === b.sourceKey
    );
  }

  if ((typeSet.has('HasOne') && typeSet.has('BelongsTo')) || (typeSet.has('HasMany') && typeSet.has('BelongsTo'))) {
    const sourceAssoc = a.associationType == 'BelongsTo' ? b : a;
    const targetAssoc = sourceAssoc == a ? b : a;

    return (
      sourceAssoc.source.name === targetAssoc.target.name &&
      sourceAssoc.target.name === targetAssoc.source.name &&
      sourceAssoc.foreignKey === targetAssoc.foreignKey &&
      sourceAssoc.sourceKey === targetAssoc.targetKey
    );
  }

  return false;
}

/**
 * update model association by key
 * @param instance
 * @param key
 * @param value
 * @param options
 */
export async function updateAssociation(
  instance: Model,
  key: string,
  value: any,
  options: UpdateAssociationOptions = {},
) {
  const association = modelAssociationByKey(instance, key);

  if (!association) {
    return false;
  }

  if (options.associationContext && isReverseAssociationPair(association, options.associationContext)) {
    return false;
  }

  switch (association.associationType) {
    case 'HasOne':
    case 'BelongsTo':
      return updateSingleAssociation(instance, key, value, options);
    case 'HasMany':
    case 'BelongsToMany':
      return updateMultipleAssociation(instance, key, value, options);
  }
}

/**
 * update belongsTo and HasOne
 * @param model
 * @param key
 * @param value
 * @param options
 */
export async function updateSingleAssociation(
  model: Model,
  key: string,
  value: any,
  options: UpdateAssociationOptions = {},
) {
  const association = <HasOne | BelongsTo>modelAssociationByKey(model, key);

  if (!association) {
    return false;
  }

  if (!['undefined', 'string', 'number', 'object'].includes(typeof value)) {
    return false;
  }

  if (Array.isArray(value)) {
    throw new Error(`The value of '${key}' cannot be in array format`);
  }

  const { recursive, context, updateAssociationValues = [], transaction } = options;
  const keys = getKeysByPrefix(updateAssociationValues, key);

  try {
    // set method of association
    const setAccessor = association.accessors.set;

    const removeAssociation = async () => {
      await model[setAccessor](null, { transaction });
      model.setDataValue(key, null);
      return true;
    };

    if (isUndefinedOrNull(value)) {
      return await removeAssociation();
    }

    if (isStringOrNumber(value)) {
      await model[setAccessor](value, { context, transaction });
      return true;
    }

    if (value instanceof Model) {
      await model[setAccessor](value, { context, transaction });
      model.setDataValue(key, value);
      return true;
    }

    const createAccessor = association.accessors.create;
    let dataKey: string;
    let M: ModelStatic<Model>;
    if (association.associationType === 'BelongsTo') {
      M = association.target as ModelStatic<Model>;
      // @ts-ignore
      dataKey = association.targetKey;
    } else {
      M = association.target as ModelStatic<Model>;
      dataKey = M.primaryKeyAttribute;
    }

    if (isStringOrNumber(value[dataKey])) {
      const instance: any = await M.findOne({
        where: {
          [dataKey]: value[dataKey],
        },
        transaction,
      });

      if (instance) {
        await model[setAccessor](instance, { context, transaction });

        if (!recursive) {
          return;
        }

        if (updateAssociationValues.includes(key)) {
          await instance.update(value, { ...options, transaction });
        }

        await updateAssociations(instance, value, {
          ...options,
          transaction,
          associationContext: association,
          updateAssociationValues: keys,
        });
        model.setDataValue(key, instance);
        return true;
      }
    }

    const instance = await model[createAccessor](value, { context, transaction });

    await updateAssociations(instance, value, {
      ...options,
      transaction,
      associationContext: association,
      updateAssociationValues: keys,
    });

    model.setDataValue(key, instance);
    // @ts-ignore
    if (association.targetKey) {
      model.setDataValue(association.foreignKey, instance[dataKey]);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * update multiple association of model by value
 * @param model
 * @param key
 * @param value
 * @param options
 */
export async function updateMultipleAssociation(
  model: Model,
  key: string,
  value: any,
  options: UpdateAssociationOptions = {},
) {
  const association = <BelongsToMany | HasMany>modelAssociationByKey(model, key);

  if (!association) {
    return false;
  }

  if (!['undefined', 'string', 'number', 'object'].includes(typeof value)) {
    return false;
  }

  const { recursive, context, updateAssociationValues = [], transaction } = options;
  const keys = getKeysByPrefix(updateAssociationValues, key);

  try {
    const setAccessor = association.accessors.set;

    const createAccessor = association.accessors.create;

    if (isUndefinedOrNull(value)) {
      await model[setAccessor](null, { transaction, context });
      model.setDataValue(key, null);
      return;
    }

    if (isStringOrNumber(value)) {
      await model[setAccessor](value, { transaction, context, individualHooks: true });
      return;
    }

    value = lodash.castArray(value);

    const setItems = []; // to be setted
    const objectItems = []; // to be added

    // iterate item in value
    for (const item of value) {
      if (isUndefinedOrNull(item)) {
        continue;
      }

      if (isStringOrNumber(item)) {
        setItems.push(item);
      } else if (item instanceof Model) {
        setItems.push(item);
      } else if (item.sequelize) {
        setItems.push(item);
      } else if (typeof item === 'object') {
        const targetKey = (association as any).targetKey || 'id';

        if (item[targetKey]) {
          setItems.push(item[targetKey]);
        }

        objectItems.push(item);
      }
    }

    // associate targets in lists1
    await model[setAccessor](setItems, { transaction, context, individualHooks: true });

    const newItems = [];

    for (const item of objectItems) {
      const pk = association.target.primaryKeyAttribute;

      const through = (<any>association).through ? (<any>association).through.model.name : null;

      const accessorOptions = {
        context,
        transaction,
      };

      const throughValue = item[through];

      if (throughValue) {
        accessorOptions['through'] = throughValue;
      }

      if (isUndefinedOrNull(item[pk])) {
        // create new record
        const instance = await model[createAccessor](item, accessorOptions);

        await updateAssociations(instance, item, {
          ...options,
          transaction,
          associationContext: association,
          updateAssociationValues: keys,
        });
        newItems.push(instance);
      } else {
        // set & update record
        const instance = await association.target.findByPk<any>(item[pk], {
          transaction,
        });
        if (!instance) {
          continue;
        }
        const addAccessor = association.accessors.add;

        await model[addAccessor](item[pk], accessorOptions);

        if (!recursive) {
          continue;
        }
        if (updateAssociationValues.includes(key)) {
          await instance.update(item, { ...options, transaction });
        }
        await updateAssociations(instance, item, {
          ...options,
          transaction,
          associationContext: association,
          updateAssociationValues: keys,
        });
        newItems.push(instance);
      }
    }

    model.setDataValue(key, setItems.concat(newItems));
  } catch (error) {
    throw error;
  }
}
