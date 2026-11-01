//
//  AppTheme.swift
//  Rubliks
//

import SwiftUI

enum AppTheme {
    // MARK: - Colors
    static let splashGradientStart = Color(red: 0.95, green: 0.4, blue: 0.45)
    static let splashGradientEnd = Color(red: 0.4, green: 0.2, blue: 0.55)
    
    static let accentRed = Color(red: 207/255, green: 54/255, blue: 59/255)
    static let accentRedAlt = Color(red: 217/255, green: 49/255, blue: 58/255)
    
    static let backgroundGray = Color(red: 232/255, green: 232/255, blue: 232/255)
    static let backgroundLightGray = Color(red: 242/255, green: 242/255, blue: 242/255)
    static let searchFieldGray = Color(red: 239/255, green: 239/255, blue: 239/255)
    
    static let cardPurpleDark = Color(red: 94/255, green: 62/255, blue: 143/255)
    static let cardPurpleLight = Color(red: 146/255, green: 118/255, blue: 178/255)
    static let cardPink = Color(red: 226/255, green: 126/255, blue: 150/255)
    
    static let textPrimary = Color.primary
    static let textSecondary = Color.gray
    static let paginationInactive = Color.gray.opacity(0.5)
    
    // MARK: - Typography
    static func titleFont() -> Font { .system(size: 28, weight: .bold) }
    static func headlineFont() -> Font { .system(size: 20, weight: .bold) }
    static func bodyFont() -> Font { .system(size: 16, weight: .regular) }
    static func captionFont() -> Font { .system(size: 14, weight: .regular) }
    
    // MARK: - Layout
    static let cornerRadius: CGFloat = 16
    static let cornerRadiusSmall: CGFloat = 12
    static let buttonCornerRadius: CGFloat = 14
    static let shadowRadius: CGFloat = 4
    static let shadowOpacity: Double = 0.08
}
