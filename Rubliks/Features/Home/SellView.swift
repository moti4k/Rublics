//
//  SellView.swift
//  Rubliks
//

import SwiftUI

/// Продажа акций и криптовалюты в рубли (полностью или часть).
struct SellView: View {
    var onComplete: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var portfolio = Portfolio.load()
    @State private var message: String?
    @State private var sellSheet: SellSheetItem?
    @State private var stocks: [StockItem] = []
    private let cryptoPrices = MoexMockService.shared.getCryptoPrices()
    private var stockPrices: [String: Double] {
        Dictionary(uniqueKeysWithValues: stocks.map { ($0.ticker, $0.price) })
    }
}

private enum SellSheetItem: Identifiable {
    case stock(StockHolding)
    case crypto(CryptoHolding)
    var id: String {
        switch self {
        case .stock(let h): return "s-\(h.ticker)"
        case .crypto(let h): return "c-\(h.symbol)"
        }
    }
}

extension SellView {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let msg = message {
                        Text(msg)
                            .font(.system(size: 14))
                            .foregroundColor(msg.hasPrefix("Успех") ? Color(red: 0.2, green: 0.6, blue: 0.35) : AppTheme.accentRed)
                    }
                    if !portfolio.stockHoldings.isEmpty {
                        sectionTitle("Акции")
                        ForEach(portfolio.stockHoldings) { h in
                            sellStockRow(holding: h)
                        }
                    }
                    if !portfolio.cryptoHoldings.isEmpty {
                        sectionTitle("Криптовалюта")
                        ForEach(portfolio.cryptoHoldings) { h in
                            sellCryptoRow(holding: h)
                        }
                    }
                    if portfolio.stockHoldings.isEmpty && portfolio.cryptoHoldings.isEmpty {
                        Text("Нет активов для продажи. Сначала купите акции или криптовалюту.")
                            .font(.system(size: 15))
                            .foregroundColor(Color(white: 0.5))
                            .padding(.top, 20)
                    }
                }
                .padding(20)
            }
            .background(AppTheme.backgroundLightGray)
            .navigationTitle("Продать в рубли")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { dismiss() }
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
            }
            .onAppear { portfolio = Portfolio.load() }
            .task {
                if stocks.isEmpty {
                    stocks = await MoexMockService.shared.fetchStocks()
                }
            }
            .sheet(item: $sellSheet) { item in
                sellAmountSheet(item: item)
            }
        }
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(Color(white: 0.4))
    }

    private func sellStockRow(holding: StockHolding) -> some View {
        let price = stockPrices[holding.ticker] ?? 0
        let value = holding.quantity * price
        return HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(holding.ticker)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(white: 0.2))
                Text("\(formatQty(holding.quantity)) шт. · \(formatMoney(value)) ₽")
                    .font(.system(size: 13))
                    .foregroundColor(Color(white: 0.5))
            }
            Spacer()
            Button("Продать") {
                sellSheet = .stock(holding)
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(AppTheme.accentRed)
            .cornerRadius(10)
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
    }

    private func sellCryptoRow(holding: CryptoHolding) -> some View {
        let price = cryptoPrices[holding.symbol] ?? 0
        let value = holding.amount * price
        return HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(holding.symbol)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(white: 0.2))
                Text("\(formatCrypto(holding.amount)) · \(formatMoney(value)) ₽")
                    .font(.system(size: 13))
                    .foregroundColor(Color(white: 0.5))
            }
            Spacer()
            Button("Продать") {
                sellSheet = .crypto(holding)
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(AppTheme.accentRed)
            .cornerRadius(10)
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
    }

    @ViewBuilder
    private func sellAmountSheet(item: SellSheetItem) -> some View {
        switch item {
        case .stock(let h):
            SellStockAmountSheet(
                holding: h,
                price: stockPrices[h.ticker] ?? 0,
                onSell: { qty in
                    Task {
                        let sold = await performSellStock(ticker: h.ticker, quantity: qty)
                        if sold { await MainActor.run { sellSheet = nil } }
                    }
                },
                onDismiss: { sellSheet = nil }
            )
        case .crypto(let h):
            SellCryptoAmountSheet(
                holding: h,
                price: cryptoPrices[h.symbol] ?? 0,
                onSell: { amount in
                    sellCrypto(symbol: h.symbol, amount: amount)
                    sellSheet = nil
                },
                onDismiss: { sellSheet = nil }
            )
        }
    }

    private func performSellStock(ticker: String, quantity: Double) async -> Bool {
        let prices = await MoexMockService.shared.fetchCurrentPrices(secids: [ticker])
        let price = prices[ticker] ?? stockPrices[ticker] ?? 0
        guard price > 0 else {
            await MainActor.run { message = "Не удалось получить актуальную цену" }
            return false
        }
        await MainActor.run { sellStock(ticker: ticker, quantity: quantity, price: price) }
        return true
    }

    private func sellStock(ticker: String, quantity: Double, price: Double) {
        guard quantity > 0, price > 0 else { return }
        let rub = quantity * price
        var p = Portfolio.load()
        p.balance += rub
        if let i = p.stockHoldings.firstIndex(where: { $0.ticker == ticker }) {
            p.stockHoldings[i].quantity -= quantity
            if p.stockHoldings[i].quantity <= 0 {
                p.stockHoldings.remove(at: i)
            }
        }
        p.save()
        portfolio = p
        message = "Успех! Продано \(formatQty(quantity)) \(ticker) по \(formatMoney(price)) ₽ на \(formatMoney(rub)) ₽."
        onComplete?()
        clearMessageLater()
    }

    private func sellCrypto(symbol: String, amount: Double) {
        guard amount > 0, let price = cryptoPrices[symbol] else { return }
        let rub = amount * price
        var p = Portfolio.load()
        p.balance += rub
        if let i = p.cryptoHoldings.firstIndex(where: { $0.symbol == symbol }) {
            p.cryptoHoldings[i].amount -= amount
            if p.cryptoHoldings[i].amount <= 0 {
                p.cryptoHoldings.remove(at: i)
            }
        }
        p.save()
        portfolio = p
        message = "Успех! Продано \(formatCrypto(amount)) \(symbol) на \(formatMoney(rub)) ₽."
        onComplete?()
        clearMessageLater()
    }

    private func clearMessageLater() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { message = nil }
    }

    private func formatMoney(_ v: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = 2
        return f.string(from: NSNumber(value: v)) ?? "0"
    }
    private func formatQty(_ v: Double) -> String {
        v >= 1 ? String(format: "%.0f", v) : String(format: "%.4f", v)
    }
    private func formatCrypto(_ v: Double) -> String {
        String(format: "%.6f", v)
    }
}

// MARK: - Sell amount sheets

private struct SellStockAmountSheet: View {
    let holding: StockHolding
    let price: Double
    let onSell: (Double) -> Void
    let onDismiss: () -> Void
    @State private var quantityStr: String = ""
    @Environment(\.dismiss) private var envDismiss

    private var maxQty: Double { holding.quantity }
    private var currentQty: Double { Double(quantityStr.replacingOccurrences(of: ",", with: ".")) ?? 0 }
    private var rubValue: Double { currentQty * price }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text("Продать \(holding.ticker)")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(white: 0.2))
                Text("Доступно: \(formatQty(maxQty)) шт.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(white: 0.5))
                TextField("Количество", text: $quantityStr)
                    .keyboardType(.decimalPad)
                    .padding(14)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(white: 0.85), lineWidth: 1))
                if currentQty > 0 {
                    Text("Получите: \(String(format: "%.0f", rubValue)) ₽")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
                HStack(spacing: 12) {
                    Button("Продать всё") {
                        onSell(maxQty)
                        envDismiss()
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(AppTheme.accentRed)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.accentRed, lineWidth: 1))
                    Button("Продать часть") {
                        guard currentQty > 0, currentQty <= maxQty else { return }
                        onSell(currentQty)
                        envDismiss()
                    }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(currentQty > 0 && currentQty <= maxQty ? AppTheme.accentRed : Color.gray)
                    .cornerRadius(12)
                }
                Spacer()
            }
            .padding(20)
            .background(AppTheme.backgroundLightGray)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { onDismiss(); envDismiss() }
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
            }
            .onAppear { quantityStr = formatQty(maxQty) }
        }
    }
    private func formatQty(_ v: Double) -> String {
        v >= 1 ? String(format: "%.0f", v) : String(format: "%.4f", v)
    }
}

private struct SellCryptoAmountSheet: View {
    let holding: CryptoHolding
    let price: Double
    let onSell: (Double) -> Void
    let onDismiss: () -> Void
    @State private var amountStr: String = ""
    @Environment(\.dismiss) private var envDismiss

    private var maxAmount: Double { holding.amount }
    private var currentAmount: Double { Double(amountStr.replacingOccurrences(of: ",", with: ".")) ?? 0 }
    private var rubValue: Double { currentAmount * price }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text("Продать \(holding.symbol)")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(white: 0.2))
                Text("Доступно: \(String(format: "%.6f", maxAmount))")
                    .font(.system(size: 14))
                    .foregroundColor(Color(white: 0.5))
                TextField("Количество", text: $amountStr)
                    .keyboardType(.decimalPad)
                    .padding(14)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(white: 0.85), lineWidth: 1))
                if currentAmount > 0 {
                    Text("Получите: \(String(format: "%.0f", rubValue)) ₽")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
                HStack(spacing: 12) {
                    Button("Продать всё") {
                        onSell(maxAmount)
                        envDismiss()
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(AppTheme.accentRed)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.accentRed, lineWidth: 1))
                    Button("Продать часть") {
                        guard currentAmount > 0, currentAmount <= maxAmount else { return }
                        onSell(currentAmount)
                        envDismiss()
                    }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(currentAmount > 0 && currentAmount <= maxAmount ? AppTheme.accentRed : Color.gray)
                    .cornerRadius(12)
                }
                Spacer()
            }
            .padding(20)
            .background(AppTheme.backgroundLightGray)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { onDismiss(); envDismiss() }
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
            }
            .onAppear { amountStr = String(format: "%.6f", maxAmount) }
        }
    }
}
