import { observer } from '@formily/react';
import React, { useContext, useMemo } from 'react';
import { useDesignable } from '../../hooks';
import { CalendarToolbarContext } from './context';
import { getLunarDay } from './utils';

export const Title = observer(
  () => {
    const { DesignableBar } = useDesignable();
    const { date, view, label, showLunar } = useContext(CalendarToolbarContext);

    const lunarElement = useMemo(() => {
      if (!showLunar || view !== 'day') {
        return;
      }
      return <span>{getLunarDay(date)}</span>;
    }, [view, date, showLunar]);

    return (
      <div className="ant-btn-group" style={{ fontSize: '1.75em', fontWeight: 300 }}>
        <span>{label}</span>
        <span style={{ marginLeft: '4px' }}>{lunarElement}</span>
        <DesignableBar />
      </div>
    );
  },
  { displayName: 'Title' },
);
