import { omit } from 'lodash';
import {
  AssociationScope,
  DataType,
  ForeignKeyOptions,
  HasManyOptions,
  HasManyOptions as SequelizeHasManyOptions,
  Utils,
} from 'sequelize';
import { Collection } from '../collection';
import { Reference } from '../features/ReferencesMap';
import { checkIdentifier } from '../utils';
import { MultipleRelationFieldOptions, RelationField } from './relation-field';

export interface HasManyFieldOptions extends HasManyOptions {
  /**
   * The name of the field to use as the key for the association in the source table. Defaults to the primary
   * key of the source table
   */
  sourceKey?: string;

  /**
   * A string or a data type to represent the identifier in the table
   */
  keyType?: DataType;

  scope?: AssociationScope;

  /**
   * The alias of this model, in singular form. See also the `name` option passed to `sequelize.define`. If
   * you create multiple associations between the same tables, you should provide an alias to be able to
   * distinguish between them. If you provide an alias when creating the assocition, you should provide the
   * same alias when eager loading and when getting associated models. Defaults to the singularized name of
   * target
   */
  as?: string | { singular: string; plural: string };

  /**
   * The name of the foreign key in the target table or an object representing the type definition for the
   * foreign column (see `Sequelize.define` for syntax). When using an object, you can add a `name` property
   * to set the name of the column. Defaults to the name of source + primary key of source
   */
  foreignKey?: string | ForeignKeyOptions;

  /**
   * What happens when delete occurs.
   *
   * Cascade if this is a n:m, and set null if it is a 1:m
   *
   * @default 'SET NULL' or 'CASCADE'
   */
  onDelete?: string;

  /**
   * What happens when update occurs
   *
   * @default 'CASCADE'
   */
  onUpdate?: string;

  /**
   * Should on update and on delete constraints be enabled on the foreign key.
   */
  constraints?: boolean;
  foreignKeyConstraint?: boolean;

  // scope?: AssociationScope;

  /**
   * If `false` the applicable hooks will not be called.
   * The default value depends on the context.
   */
  hooks?: boolean;
}

export class HasManyField extends RelationField {
  get dataType(): any {
    return 'HasMany';
  }

  get foreignKey() {
    if (this.options.foreignKey) {
      return this.options.foreignKey;
    }
    const { model } = this.context.collection;
    return Utils.camelize([model.options.name.singular, this.sourceKey || model.primaryKeyAttribute].join('_'));
  }

  reference(association): Reference {
    const sourceKey = association.sourceKey;

    return {
      sourceCollectionName: this.database.modelCollection.get(association.target).name,
      sourceField: association.foreignKey,
      targetField: sourceKey,
      targetCollectionName: this.database.modelCollection.get(association.source).name,
      onDelete: this.options.onDelete,
    };
  }

  bind() {
    const { database, collection } = this.context;
    const Target = this.TargetModel;
    if (!Target) {
      database.addPendingField(this);
      return false;
    }

    if (collection.model.associations[this.name]) {
      delete collection.model.associations[this.name];
    }

    const association = collection.model.hasMany(Target, {
      constraints: false,
      ...omit(this.options, ['name', 'type', 'target', 'onDelete']),
      as: this.name,
      foreignKey: this.foreignKey,
    });

    // inverse relation
    // this.TargetModel.belongsTo(collection.model);

    // 建立关系之后从 pending 列表中删除
    database.removePendingField(this);

    if (!this.options.foreignKey) {
      this.options.foreignKey = association.foreignKey;
    }

    try {
      checkIdentifier(this.options.foreignKey);
    } catch (error) {
      this.unbind();
      throw error;
    }

    if (!this.options.sourceKey) {
      // @ts-ignore
      this.options.sourceKey = association.sourceKey;
    }
    let tcoll: Collection;
    if (this.target === collection.name) {
      tcoll = collection;
    } else {
      tcoll = database.getCollection(this.target);
    }
    if (tcoll) {
      tcoll.addIndex([this.options.foreignKey]);
    }

    this.database.referenceMap.addReference(this.reference(association));

    return true;
  }

  unbind() {
    const { database, collection } = this.context;
    // 如果关系字段还没建立就删除了，也同步删除待建立关联的关系字段
    database.removePendingField(this);
    // 如果关系表内没有显式的创建外键字段，删除关系时，外键也删除掉
    const tcoll = database.getCollection(this.target);

    if (tcoll) {
      const foreignKey = this.options.foreignKey;
      const field = tcoll.findField((field) => {
        if (field.name === foreignKey) {
          return true;
        }
        return field.type === 'belongsTo' && field.foreignKey === foreignKey;
      });
      if (!field) {
        tcoll.model.removeAttribute(foreignKey);
      }
    }

    const association = collection.model.associations[this.name];

    if (association && !this.options.inherit) {
      this.database.referenceMap.removeReference(this.reference(association));
    }

    this.clearAccessors();
    // 删掉 model 的关联字段
    delete collection.model.associations[this.name];
    // @ts-ignore
    collection.model.refreshAttributes();
  }
}

export interface HasManyFieldOptions extends MultipleRelationFieldOptions, SequelizeHasManyOptions {
  type: 'hasMany';
  target?: string;
}
