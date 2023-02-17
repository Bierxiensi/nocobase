import { CollectionManagerProvider, SchemaInitializerContext, SchemaInitializerProvider } from '@nocobase/client';
import React, { useContext } from 'react';
import { useAuditChangesCollection, useAuditLogsCollection } from './collections';
import { AuditLogsTableActionColumnInitializers } from './initializers/AuditLogsTableActionColumnInitializers';
import { AuditLogsTableActionInitializers } from './initializers/AuditLogsTableActionInitializers';
import { AuditLogsTableColumnInitializers } from './initializers/AuditLogsTableColumnInitializers';

export const AuditLogsBlockProvider: React.FC = (props) => {
  const initializers = useContext(SchemaInitializerContext);
  const auditChangesCollection = useAuditChangesCollection();
  const auditLogsCollection = useAuditLogsCollection();

  return (
    <SchemaInitializerProvider
      initializers={{
        ...initializers,
        AuditLogsTableActionInitializers,
        AuditLogsTableActionColumnInitializers,
        AuditLogsTableColumnInitializers,
      }}
    >
      <CollectionManagerProvider collections={[auditLogsCollection, auditChangesCollection]}>
        {props.children}
      </CollectionManagerProvider>
    </SchemaInitializerProvider>
  );
};
