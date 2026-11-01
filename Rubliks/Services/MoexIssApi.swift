//
//  MoexIssApi.swift
//  Rubliks
//
//  Клиент бесплатного API Мосбиржи (ISS). Данные с задержкой 15 мин.
//  Документация: https://iss.moex.com/iss/reference/
//

import Foundation

enum MoexIssApi {
    private static let base = "https://iss.moex.com/iss"
    private static let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 15
        c.waitsForConnectivity = true
        return URLSession(configuration: c)
    }()

    // MARK: - Candles
    /// interval: 1 (1 мин), 10 (10 мин), 60 (1 час), 24 (1 день)
    static func fetchCandles(secid: String, interval: Int = 24, from: Date? = nil, till: Date? = nil, limit: Int = 100) async throws -> [CandleData] {
        var urlStr = "\(base)/engines/stock/markets/shares/boards/TQBR/securities/\(secid.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? secid)/candles.json?interval=\(interval)&limit=\(limit)"
        let fmt = DateFormatter()
        fmt.timeZone = TimeZone(identifier: "Europe/Moscow")
        if interval == 24 {
            fmt.dateFormat = "yyyy-MM-dd"
        } else {
            fmt.dateFormat = "yyyy-MM-dd HH:mm:ss"
        }
        if let f = from {
            urlStr += "&from=\(fmt.string(from: f).addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        }
        if let t = till {
            urlStr += "&till=\(fmt.string(from: t).addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        }
        guard let url = URL(string: urlStr) else { throw MoexIssError.badUrl }
        let (data, _) = try await session.data(from: url)
        return try parseCandles(data: data, secid: secid)
    }

    private static func parseCandles(data: Data, secid: String) throws -> [CandleData] {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candlesBlock = json["candles"] as? [String: Any],
              let columns = candlesBlock["columns"] as? [String],
              let rows = candlesBlock["data"] as? [[Any]] else {
            throw MoexIssError.parseError
        }
        let colMap = Dictionary(uniqueKeysWithValues: columns.enumerated().map { ($1.lowercased(), $0) })
        let idxOpen = colMap["open"] ?? 0
        let idxClose = colMap["close"] ?? 1
        let idxHigh = colMap["high"] ?? 2
        let idxLow = colMap["low"] ?? 3
        let idxVol = colMap["volume"] ?? 4
        let idxBegin = colMap["begin"] ?? 5

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(identifier: "Europe/Moscow")
        let formatter2 = DateFormatter()
        formatter2.dateFormat = "yyyy-MM-dd HH:mm:ss"
        formatter2.timeZone = TimeZone(identifier: "Europe/Moscow")
        let formatterDateOnly = DateFormatter()
        formatterDateOnly.dateFormat = "yyyy-MM-dd"
        formatterDateOnly.timeZone = TimeZone(identifier: "Europe/Moscow")

        var list: [CandleData] = []
        for (i, row) in rows.enumerated() {
            guard row.count > max(idxOpen, idxClose, idxHigh, idxLow, idxVol, idxBegin),
                  let open = asDouble(row[idxOpen]),
                  let close = asDouble(row[idxClose]),
                  let high = asDouble(row[idxHigh]),
                  let low = asDouble(row[idxLow]) else { continue }
            let vol = asDouble(row[idxVol])
            var date = Date()
            if let beginStr = row[idxBegin] as? String {
                if let d = formatter.date(from: beginStr) ?? formatter2.date(from: beginStr) ?? formatterDateOnly.date(from: beginStr) {
                    date = d
                }
            }
            list.append(CandleData(
                id: "\(secid)_\(i)",
                date: date,
                open: open,
                high: high,
                low: low,
                close: close,
                volume: vol
            ))
        }
        return list.sorted { $0.date < $1.date }
    }

    private static func asDouble(_ v: Any) -> Double? {
        if let n = v as? NSNumber { return n.doubleValue }
        if let s = v as? String { return Double(s) }
        return nil
    }

    // MARK: - Securities + marketdata (текущие цены)
    /// Список тикеров для запроса. Возвращает последнюю цену и открытие для расчёта изменения.
    static func fetchMarketData(secids: [String]) async throws -> [(secid: String, shortname: String, last: Double, open: Double)] {
        let list = secids.prefix(50).joined(separator: ",")
        let urlStr = "\(base)/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&securities=\(list.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? list)"
        guard let url = URL(string: urlStr) else { throw MoexIssError.badUrl }
        let (data, _) = try await session.data(from: url)
        return try parseMarketData(data: data, secids: secids)
    }

    private static func parseMarketData(data: Data, secids: [String]) throws -> [(secid: String, shortname: String, last: Double, open: Double)] {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw MoexIssError.parseError
        }
        let secCols = (json["securities"] as? [String: Any])?["columns"] as? [String] ?? []
        let secData = (json["securities"] as? [String: Any])?["data"] as? [[Any]] ?? []
        let mktCols = (json["marketdata"] as? [String: Any])?["columns"] as? [String] ?? []
        let mktData = (json["marketdata"] as? [String: Any])?["data"] as? [[Any]] ?? []

        let secIdxId = secCols.firstIndex(where: { $0.lowercased() == "secid" }) ?? 0
        let secIdxName = secCols.firstIndex(where: { $0.lowercased() == "shortname" }) ?? 1
        let mktIdxId = mktCols.firstIndex(where: { $0.lowercased() == "secid" }) ?? 0
        let mktIdxLast = mktCols.firstIndex(where: { $0.lowercased() == "last" }) ?? 1
        let mktIdxOpen = mktCols.firstIndex(where: { $0.lowercased() == "open" }) ?? 2

        var nameBySecid: [String: String] = [:]
        for row in secData where row.count > max(secIdxId, secIdxName) {
            if let id = row[secIdxId] as? String, let name = row[secIdxName] as? String {
                nameBySecid[id] = name
            }
        }
        var result: [(secid: String, shortname: String, last: Double, open: Double)] = []
        for row in mktData where row.count > max(mktIdxId, mktIdxLast, mktIdxOpen) {
            guard let secid = row[mktIdxId] as? String,
                  let last = asDouble(row[mktIdxLast]) else { continue }
            let openVal = asDouble(row[mktIdxOpen]) ?? last
            let name = nameBySecid[secid] ?? secid
            result.append((secid: secid, shortname: name, last: last, open: openVal))
        }
        return result
    }
}

enum MoexIssError: Error {
    case badUrl
    case parseError
    case network(Error)
}
