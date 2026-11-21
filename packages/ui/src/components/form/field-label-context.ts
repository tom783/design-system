import * as React from 'react';

/** label의 htmlFor가 연결되지 않는 복합 입력에도 같은 이름을 전달한다. 공개 prop은 늘리지 않는다. */
export const FieldLabelContext = React.createContext<string | undefined>(undefined);
