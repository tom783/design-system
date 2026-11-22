// R40 사전 글꼴 계측(macOS CoreText). 브라우저 레이아웃·키보드 검증을 대신하지 않는다.
// 저장소 루트에서 swift -module-cache-path .qa-shots/r40-measurement/module-cache docs/qa/r40-date-time-measure.swift
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
  let descriptor = CTFontDescriptorCreateWithAttributes([kCTFontFeatureSettingsAttribute as String: features, kCTFontVariationAttribute as String: [NSNumber(value: 0x77676874): NSNumber(value: size == 13 ? 500 : 400)]] as CFDictionary)
  let tabular = CTFontCreateCopyWithAttributes(font, size, nil, descriptor)
  let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): tabular]))
  return CTLineGetTypographicBounds(line, nil, nil, nil)
}
for name in [pretendardName, ".AppleSystemUIFont", "Arial"] {
  for (size, text) in [(14.0, "YYYY-MM-DD HH:mm"), (14.0, "2026-11-15 23:50"), (13.0, "YYYY-MM-DD HH:mm 형식으로 입력하세요."), (14.0, "23"), (14.0, "50")] {
    print("\(name) | \(size) | \(text) | \(measure(name, size, text))")
  }
}
