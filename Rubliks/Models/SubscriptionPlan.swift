//
//  SubscriptionPlan.swift
//  Rubliks
//

import SwiftUI

struct SubscriptionPlan: Identifiable {
    let id: String
    let name: String
    let price: String
    let period: String
    /// Например: "Первая неделя бесплатно, потом 499 ₽/мес"
    let priceSubtitle: String?
    let features: [String]
    let color: Color
    /// Показывать над названием бейдж "Самый выгодный" зелёным.
    let isBestOffer: Bool
}
