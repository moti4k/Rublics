//
//  CandleData.swift
//  Rubliks
//

import Foundation

struct CandleData: Identifiable {
    let id: String
    let date: Date
    let open: Double
    let high: Double
    let low: Double
    let close: Double
    var volume: Double?
}

struct VolumePoint: Identifiable {
    let id: String
    let date: Date
    let value: Double
}
