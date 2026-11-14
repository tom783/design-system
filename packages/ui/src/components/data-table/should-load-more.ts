interface LoadMoreInput {
  lastIndex: number;
  rowCount: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  lastRequestedLength: number | null;
}

// 화면 끝에 닿기 전에 다음 묶음이 도착하도록 마지막 10행부터 미리 요청한다.
const THRESHOLD = 10;

// 네트워크 응답 전에 같은 스크롤 구간을 여러 번 지나도 한 길이에서는 한 번만 요청한다.
export function shouldLoadMore({ lastIndex, rowCount, hasMore, loadingMore, lastRequestedLength }: LoadMoreInput): boolean {
  return hasMore === true && !loadingMore && lastRequestedLength !== rowCount &&
    lastIndex >= rowCount - THRESHOLD;
}
