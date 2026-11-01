//
//  Portfolio.swift
//  Rubliks
//

import Foundation

/// Одна позиция по акции: тикер и количество.
struct StockHolding: Codable, Identifiable {
    var id: String { ticker }
    let ticker: String
    var quantity: Double
}

/// Одна позиция по криптовалюте: тикер и количество единиц.
struct CryptoHolding: Codable, Identifiable {
    var id: String { symbol }
    let symbol: String
    var amount: Double
}

/// Портфель пользователя: баланс и активы (для отображения «где лежат деньги»).
struct Portfolio: Codable {
    /// Доступные рубли на счёте.
    var balance: Double
    /// Позиции по акциям.
    var stockHoldings: [StockHolding]
    /// Позиции по криптовалютам (символ и количество).
    var cryptoHoldings: [CryptoHolding]
    /// Вложения во фьючерсы (в рублях).
    var futuresValueRub: Double

    static let `default` = Portfolio(
        balance: 100_000,
        stockHoldings: [],
        cryptoHoldings: [],
        futuresValueRub: 0
    )

    private static let key = "userPortfolio"

    static func load() -> Portfolio {
        guard let data = UserDefaults.standard.data(forKey: key) else { return .default }
        if let decoded = try? JSONDecoder().decode(Portfolio.self, from: data) {
            return decoded
        }
        if let legacy = try? JSONDecoder().decode(PortfolioLegacy.self, from: data) {
            return Portfolio(
                balance: legacy.balance,
                stockHoldings: legacy.stockHoldings,
                cryptoHoldings: [],
                futuresValueRub: legacy.futuresValueRub
            )
        }
        return .default
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: Portfolio.key)
    }

    /// Суммарная стоимость акций по текущим ценам.
    func totalStocksValue(prices: [String: Double]) -> Double {
        stockHoldings.reduce(0) { sum, h in
            sum + (h.quantity * (prices[h.ticker] ?? 0))
        }
    }

    /// Суммарная стоимость крипты по текущим ценам (руб за единицу).
    func totalCryptoValue(prices: [String: Double]) -> Double {
        cryptoHoldings.reduce(0) { sum, h in
            sum + (h.amount * (prices[h.symbol] ?? 0))
        }
    }

    var totalAssetsRub: Double {
        futuresValueRub
    }
}

private struct PortfolioLegacy: Codable {
    var balance: Double
    var stockHoldings: [StockHolding]
    var cryptoValueRub: Double
    var futuresValueRub: Double
}
