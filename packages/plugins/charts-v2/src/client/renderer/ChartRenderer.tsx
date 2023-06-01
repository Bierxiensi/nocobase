import { GeneralSchemaDesigner, SchemaSettings, useAPIClient, useRequest } from '@nocobase/client';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { Empty, Result, Typography } from 'antd';
import { useChartsTranslation } from '../locale';
import { ChartConfigContext, SelectedField } from '../block';
import { useFieldSchema, useField } from '@formily/react';
import { useChart } from './ChartLibrary';
import { ErrorBoundary } from 'react-error-boundary';
import { useFields } from '../hooks';
const { Paragraph, Text } = Typography;

export type QueryProps = Partial<{
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
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };
  filter: any;
}>;

export type ChartRendererProps = {
  collection: string;
  query?: QueryProps;
  config?: {
    chartType: string;
    general: any;
    advanced: string;
  };
  // A flag to indicate whether it is the renderer of the configuration pane.
  configuring?: boolean;
};

export const ChartRenderer: React.FC<ChartRendererProps> & {
  Designer: React.FC;
} = (props) => {
  const { t } = useChartsTranslation();
  const { setData: setQueryData } = useContext(ChartConfigContext);
  const { query, config, collection, configuring } = props;
  const general = config?.general || {};
  const advanced = config?.advanced || {};

  const fields = useFields(collection);
  // If alias is not set, use field title (display name instead of field name) as alias
  const appendAlias = (selectedFields: SelectedField[]) => {
    return selectedFields
      .filter((item) => item.field)
      .map((item) => {
        const field = fields.find((field) => field.name === item.field);
        return {
          ...item,
          alias: item.alias || field.label,
        };
      });
  };
  const appendAliasToQuery = (query: QueryProps) => {
    const { dimensions = [], measures = [] } = query;
    return {
      ...query,
      dimensions: appendAlias(dimensions),
      measures: appendAlias(measures),
    };
  };

  const api = useAPIClient();
  const [data, setData] = useState<any[]>([]);
  const { loading, run } = useRequest(
    () =>
      api
        .request({
          url: 'charts:query',
          method: 'POST',
          data: {
            collection,
            ...appendAliasToQuery(query),
          },
        })
        .then((res) => {
          return res?.data?.data || [];
        }),
    {
      manual: true,
      onSuccess: (data) => {
        setData(data);
      },
      onFinally(params, data, e) {
        if (!configuring) {
          return;
        }
        if (e) {
          setQueryData(e.stack);
          return;
        }
        const sampleData = data.length > 10 ? data.slice(0, 10) : data;
        setQueryData(JSON.stringify(sampleData, null, 2));
      },
    },
  );

  /*
   * For a renderer of a configured chart,
   * only trigger requests when query parameters are really changed
   * For the renderer of the configuration pane,
   * trigger requests when "run query" button is clicked
   */
  const changedQuery = configuring ? query : JSON.stringify(query);
  useEffect(() => {
    if (query?.measures?.length && query?.dimensions?.length) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedQuery, run]);

  const chartType = config?.chartType || '-';
  const [library, type] = chartType.split('-');
  const chart = useChart(library, type);
  const Component = chart?.component;
  const transformer = chart?.transformer;
  const C = () =>
    Component ? (
      <ErrorBoundary
        onError={(error) => {
          console.error(error);
        }}
        FallbackComponent={ErrorFallback}
      >
        <Component {...{ ...general, ...advanced, data: transformer ? transformer(data) : data }} />
      </ErrorBoundary>
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Chart not configured.')} />
    );

  return <C />;
};

ChartRenderer.Designer = function Designer() {
  const { t } = useChartsTranslation();
  const { setVisible, setCurrent } = useContext(ChartConfigContext);
  const field = useField();
  const schema = useFieldSchema();
  return (
    <GeneralSchemaDesigner disableInitializer>
      <SchemaSettings.Item
        key="configure"
        onClick={() => {
          setCurrent({ schema, field, collection: field?.componentProps?.collection });
          setVisible(true);
        }}
      >
        {t('Configure')}
      </SchemaSettings.Item>
      <SchemaSettings.Divider />
      <SchemaSettings.Remove
        // removeParentsIfNoChildren
        breakRemoveOn={{
          'x-component': 'ChartV2Block',
        }}
      />
    </GeneralSchemaDesigner>
  );
};

const ErrorFallback = ({ error }) => {
  const { t } = useChartsTranslation();

  return (
    <div style={{ backgroundColor: 'white' }}>
      <Result status="error" title={t('Render Failed')} subTitle={t('Please check the configuration.')}>
        <Paragraph copyable>
          <Text type="danger" style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>
            {error.message}
          </Text>
        </Paragraph>
      </Result>
    </div>
  );
};
