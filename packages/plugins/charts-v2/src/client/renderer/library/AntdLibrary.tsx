import { Statistic, Table } from 'antd';
import { lang } from '../../locale';
import { Charts } from '../ChartLibrary';

export const AntdLibrary: Charts = {
  statistic: {
    name: lang('Statistic'),
    component: Statistic,
    schema: {
      type: 'object',
      properties: {
        title: {
          title: lang('Title'),
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
      },
    },
    useProps: ({ data, meta, general, advanced }) => {
      let formatter: (val: any) => any;
      const fieldMeta = Object.values(meta)[0];
      if (fieldMeta && fieldMeta.formatter) {
        formatter = fieldMeta.formatter;
      }
      const value = Object.values(data[0] || {})[0];
      return {
        value,
        formatter,
        ...general,
        ...advanced,
      };
    },
    reference: {
      title: lang('Statistic'),
      link: 'https://ant.design/components/statistic/',
    },
  },
  table: {
    name: lang('Table'),
    component: Table,
    useProps: ({ data, meta, general, advanced }) => {
      let formatter: (val: any) => any;
      const columns = data.length
        ? Object.keys(data[0]).map((item) => ({
            title: item,
            dataIndex: item,
            key: item,
          }))
        : [];
      const dataSource = data.map((item: any) => {
        Object.keys(item).map((key: string) => {
          const fieldMeta = meta[key];
          if (fieldMeta && fieldMeta.formatter) {
            formatter = fieldMeta.formatter;
            item[key] = formatter(item[key]);
          }
        });
        return item;
      });
      return {
        dataSource,
        columns,
        ...general,
        ...advanced,
      };
    },
    reference: {
      title: lang('Table'),
      link: 'https://ant.design/components/table/',
    },
  },
};
