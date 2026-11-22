// 브라우저 시작이 차단될 때 Pretendard 글꼴 폭으로 경계 후보를 계산한다.
// swift -module-cache-path .qa-shots/r43-measurement/module-cache docs/qa/r43-steps-measure.swift
import Foundation
import CoreText
let url = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("node_modules/pretendard/dist/public/variable/PretendardVariable.ttf")
CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
let descriptor = (CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as! [CTFontDescriptor])[0]
for (size, weight, labels) in [
  (14.0, 400, ["기본 정보", "가격 입력", "배송 설정", "최종 확인"]),
  (14.0, 600, ["기본 정보", "가격 입력", "배송 설정", "최종 확인", "2 / 4 · "]),
  (13.0, 400, ["상품명과 분류", "판매가와 재고", "완료", "진행 중", "예정", "오류"])
] {
  let variation = CTFontDescriptorCreateCopyWithVariation(descriptor, 0x77676874 as CFNumber, CGFloat(weight))
  let font = CTFontCreateWithFontDescriptor(variation, size, nil)
  for label in labels {
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: label, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
    print("Pretendard \(size)px/\(weight) | \(label) | \(CTLineGetTypographicBounds(line, nil, nil, nil))px")
  }
}
for width in [640.0, 639.0, 600.0, 560.0] {
  // 3개 간격 16px, 마커24 + 내부 간격8 + 패딩8, 첫 3단계 연결선16 + 간격8.
  let label = (width - 48) / 4 - 40 - 24
  print("가로 \(width)px | 첫 3단계 글 영역 \(label)px | 마지막 \(label + 24)px")
}
