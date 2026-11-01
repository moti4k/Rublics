//
//  StockItem.swift
//  Rubliks
//

import Foundation

struct StockItem: Identifiable {
    let id: String
    let ticker: String
    let name: String
    let price: Double
    let changePercent: Double
}
