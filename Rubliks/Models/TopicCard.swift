//
//  TopicCard.swift
//  Rubliks
//

import SwiftUI

struct TopicCard: Identifiable {
    let id: String
    let title: String
    let description: String
    let color: Color
    let route: TopicRoute
}

enum TopicRoute: Hashable {
    case topic(String)
    case chart(secid: String)
    case stocks
}
