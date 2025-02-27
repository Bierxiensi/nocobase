import { cx } from '@emotion/css';
import { SchemaComponent } from '@nocobase/client';
import React from 'react';
import { useParams } from 'react-router-dom';
import { workflowPageClass } from './style';
import { WorkflowCanvas } from './WorkflowCanvas';

export const WorkflowPage = () => {
  const params = useParams<any>();

  return (
    <div className={cx(workflowPageClass)}>
      <SchemaComponent
        schema={{
          type: 'void',
          properties: {
            [`provider_${params.id}`]: {
              type: 'void',
              'x-decorator': 'ResourceActionProvider',
              'x-decorator-props': {
                collection: {
                  name: 'workflows',
                  fields: [],
                },
                resourceName: 'workflows',
                request: {
                  resource: 'workflows',
                  action: 'get',
                  params: {
                    filter: { id: params.id },
                    appends: [
                      'nodes',
                      'revisions.id',
                      'revisions.createdAt',
                      'revisions.current',
                      'revisions.executed',
                      'revisions.enabled',
                    ],
                  },
                },
              },
              'x-component': 'WorkflowCanvas',
            },
          },
        }}
        components={{
          WorkflowCanvas,
        }}
      />
    </div>
  );
};
