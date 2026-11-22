// R41 사전 글꼴 계측(macOS CoreText). 브라우저 레이아웃 검증을 대신하지 않는다.
// 저장소 루트에서 swift -module-cache-path .qa-shots/r41-measurement/module-cache docs/qa/r41-stat-tile-measure.swift
// 변수 글꼴의 기본 이름은 Thin이다. 아래 wght 축을 본문 400·오류 500으로 명시한다.
import Foundation
import CoreText
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let url = root.appendingPathComponent("node_modules/pretendard/dist/public/variable/PretendardVariable.ttf")
CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
let fontDescriptors = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as! [CTFontDescriptor]
let pretendardName = CTFontCopyPostScriptName(CTFontCreateWithFontDescriptor(fontDescriptors[0], 14, nil)) as String
print("등록한 실제 글꼴: \(pretendardName)")
func measure(_ name: String, _ size: CGFloat, _ text: String) -> Double {
  let font = CTFontCreateWithName(name as CFString, size, nil)
  let features: [[String: Any]] = [[kCTFontFeatureTypeIdentifierKey as String: kNumberSpacingType, kCTFontFeatureSelectorIdentifierKey as String: kMonospacedNumbersSelector]]
  let descriptor = CTFontDescriptorCreateWithAttributes([kCTFontFeatureSettingsAttribute as String: features, kCTFontVariationAttribute as String: [NSNumber(value: 0x77676874): NSNumber(value: 600)]] as CFDictionary)
  let tabular = CTFontCreateCopyWithAttributes(font, size, nil, descriptor)
  let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): tabular]))
  return CTLineGetTypographicBounds(line, nil, nil, nil)
}
for name in [pretendardName] {
  for size in [24.0, 29.0] {
    for text in ["1,284건", "9,999건", "1,284,000,000원", "128.4만건", "12.8억원", "-9,999건", "-9999조원"] {
    print("\(name) | \(size) | \(text) | \(measure(name, size, text))")
    }
  }
}
