import { ISchema } from '@formily/react';
import React, { createContext, useContext } from 'react';
import { FieldOption } from '../hooks';
import { lang } from '../locale';
import { QueryProps } from './ChartRendererProvider';

/**
 * @params {usePropsFunc} useProps - Accept the information that the chart component needs to render,
 * process it and return the props of the chart component.
 */
export type usePropsFunc = (props: {
  data: any;
  meta: {
    [field: string]: Partial<{
      formatter: (value: any) => any;
    }>;
  };
  general: any;
  advanced: any;
}) => any;

export type ChartProps = {
  name: string;
  component: React.FC<any>;
  schema?: ISchema;
  useProps?: usePropsFunc;
  // The init function is used to initialize the configuration of the chart component from the query configuration.
  init?: (
    fields: FieldOption[],
    query: {
      measures?: QueryProps['measures'];
      dimensions?: QueryProps['dimensions'];
    },
  ) => {
    general?: any;
    advanced?: any;
  };
  reference?: {
    title: string;
    link: string;
  };
};

export type Charts = {
  [type: string]: ChartProps;
};

export type ChartLibraries = {
  [library: string]: {
    enabled: boolean;
    charts: Charts;
  };
};

export const ChartLibraryContext = createContext<ChartLibraries>({});

export const useCharts = (): Charts => {
  const library = useContext(ChartLibraryContext);
  return Object.values(library)
    .filter((l) => l.enabled)
    .reduce((charts, l) => ({ ...charts, ...l.charts }), {});
};

export const useChartTypes = (): {
  label: string;
  children: (ChartProps & {
    key: string;
    label: string;
    value: string;
  })[];
}[] => {
  const library = useContext(ChartLibraryContext);
  return Object.entries(library)
    .filter(([_, l]) => l.enabled)
    .reduce((charts, [name, l]) => {
      const children = Object.entries(l.charts).map(([type, chart]) => ({
        ...chart,
        key: type,
        label: chart.name,
        value: type,
      }));
      return [
        ...charts,
        {
          label: lang(name),
          children,
        },
      ];
    }, []);
};

export const useToggleChartLibrary = () => {
  const ctx = useContext(ChartLibraryContext);
  return {
    toggle: (library: string) => {
      ctx[library].enabled = !ctx[library].enabled;
    },
  };
};

export const ChartLibraryProvider: React.FC<{
  name: string;
  charts: Charts;
}> = (props) => {
  const { children, charts, name } = props;
  const ctx = useContext(ChartLibraryContext);
  const library = {
    ...ctx,
    [name]: {
      charts,
      enabled: true,
    },
  };
  return <ChartLibraryContext.Provider value={library}>{children}</ChartLibraryContext.Provider>;
};

export const infer = (
  fields: FieldOption[],
  {
    measures,
    dimensions,
  }: {
    measures?: QueryProps['measures'];
    dimensions?: QueryProps['dimensions'];
  },
) => {
  let xField: FieldOption;
  let yField: FieldOption;
  let seriesField: FieldOption;
  let yFields: FieldOption[];
  if (measures?.length) {
    yField = fields.find((f) => f.name === measures[0].field);
    yFields = measures.map((m) => fields.find((f) => f.name === m.field));
  }
  if (dimensions) {
    if (dimensions.length === 1) {
      xField = fields.find((f) => f.name === dimensions[0].field);
    } else if (dimensions.length > 1) {
      // If there is a time field, it is used as the x-axis field by default.
      let xIndex: number;
      dimensions.forEach((d, i) => {
        const field = fields.find((f) => f.name === d.field);
        if (['date', 'time', 'datetime'].includes(field.type)) {
          xField = field;
          xIndex = i;
        }
      });
      if (xIndex) {
        // If there is a time field, the other field is used as the series field by default.
        const index = xIndex === 0 ? 1 : 0;
        seriesField = fields.find((f) => f.name === dimensions[index].field);
      } else {
        xField = fields.find((f) => f.name === dimensions[0].field);
        seriesField = fields.find((f) => f.name === dimensions[1].field);
      }
    }
  }

  return { xField, yField, seriesField, yFields };
};

export const commonInit: ChartProps['init'] = (fields, { measures, dimensions }) => {
  const { xField, yField, seriesField } = infer(fields, { measures, dimensions });
  return {
    general: {
      xField: xField?.label,
      yField: yField?.label,
      seriesField: seriesField?.label,
    },
  };
};
