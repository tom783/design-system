// 브라우저 계측이 차단될 때의 글꼴 폭·치수 산술. 렌더 검증은 별도 하네스에 남긴다.
// swift -module-cache-path .qa-shots/r42-measurement/module-cache docs/qa/r42-segmented-measure.swift
import Foundation
import CoreText
let fontURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("node_modules/pretendard/dist/public/variable/PretendardVariable.ttf")
CTFontManagerRegisterFontsForURL(fontURL as CFURL, .process, nil)
let descriptors = CTFontManagerCreateFontDescriptorsFromURL(fontURL as CFURL) as! [CTFontDescriptor]
for weight in [400, 600] {
  let variation = CTFontDescriptorCreateCopyWithVariation(descriptors[0], 0x77676874 as CFNumber, CGFloat(weight))
  let font = CTFontCreateWithFontDescriptor(variation, 14, nil)
  for label in ["일", "주", "월", "일별 매출 현황", "주별 매출 현황", "월별 매출 현황"] {
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: label, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
    print("Pretendard 14px/\(weight) | \(label) | \(CTLineGetTypographicBounds(line, nil, nil, nil))px")
  }
}
for width in [320.0, 240.0, 180.0, 120.0] {
  let cell = (width - 4 - 4) / 3
  print("컨테이너 \(width)px | 칸 \(cell)px | 글 영역 \(cell - 24 - 2)px | 줄바꿈 0 | 높이 sm 32·md 38px")
}
