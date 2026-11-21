import * as React from 'react';

/** 복합 입력의 자체 검증도 Field의 예약된 오류 자리에서 표시한다. 공개 prop은 늘리지 않는다. */
export const FieldErrorContext = React.createContext<{
  id: string;
  container: HTMLDivElement | null;
  hasError: boolean;
} | null>(null);
