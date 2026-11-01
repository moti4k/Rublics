//
//  PurchaseView.swift
//  Rubliks
//

import SwiftUI

/// Экран покупки актива: криптовалюта, фьючерсы или акции.
struct PurchaseView: View {
    let assetType: String
    /// При открытии с графика — тикер акции для предзаполнения.
    var initialStockTicker: String? = nil
    var onComplete: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var portfolio = Portfolio.load()
    @State private var amountRub: String = ""
    @State private var selectedTicker: String = "SBER"
    @State private var selectedCrypto: String = "BTC"
    @State private var quantityStr: String = ""
    @State private var message: String?
    @State private var showMessage = false
    @State private var stocks: [StockItem] = MoexMockService.shared.getStocks()
    private let cryptoList = MoexMockService.shared.getCryptoList()
    private var stockPrices: [String: Double] {
        Dictionary(uniqueKeysWithValues: stocks.map { ($0.ticker, $0.price) })
    }
    private var cryptoPrices: [String: Double] {
        MoexMockService.shared.getCryptoPrices()
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    balanceBlock
                    if assetType == "stock" {
                        stockForm
                    } else if assetType == "crypto" {
                        cryptoForm
                    } else {
                        amountForm
                    }
                    if let msg = message {
                        Text(msg)
                            .font(.system(size: 14))
                            .foregroundColor(msg.hasPrefix("Успех") ? Color(red: 0.2, green: 0.6, blue: 0.35) : AppTheme.accentRed)
                    }
                }
                .padding(20)
            }
            .background(AppTheme.backgroundLightGray)
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
            }
            .onAppear { portfolio = Portfolio.load() }
            .task {
                if assetType == "stock" {
                    stocks = await MoexMockService.shared.fetchStocks()
                }
                if assetType == "stock", let t = initialStockTicker, stocks.contains(where: { $0.ticker == t }) {
                    selectedTicker = t
                }
                if assetType == "crypto", !cryptoList.isEmpty {
                    selectedCrypto = cryptoList[0].symbol
                }
            }
        }
    }

    private var navigationTitle: String {
        switch assetType {
        case "crypto": return "Купить криптовалюту"
        case "futures": return "Купить фьючерсы"
        case "stock": return "Купить акции"
        default: return "Покупка"
        }
    }

    private var balanceBlock: some View {
        HStack {
            Text("Доступно")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(white: 0.5))
            Spacer()
            Text("\(formatMoney(portfolio.balance)) ₽")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(AppTheme.cardPurpleDark)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
    }

    private var cryptoForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Криптовалюта")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.3))
            Picker("Криптовалюта", selection: $selectedCrypto) {
                ForEach(cryptoList) { c in
                    Text("\(c.symbol) — \(c.name) · \(formatMoney(c.priceRub)) ₽").tag(c.symbol)
                }
            }
            .pickerStyle(.menu)
            Text("Сумма в рублях")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.3))
            TextField("0", text: $amountRub)
                .keyboardType(.decimalPad)
                .font(.system(size: 18, weight: .medium))
                .padding(14)
                .background(Color.white)
                .cornerRadius(AppTheme.cornerRadiusSmall)
                .overlay(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall).stroke(Color(white: 0.85), lineWidth: 1))
            if let price = cryptoPrices[selectedCrypto], let rub = Double(amountRub.replacingOccurrences(of: ",", with: ".")), rub > 0 {
                Text("Получите: \(String(format: "%.6f", rub / price)) \(selectedCrypto)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(white: 0.5))
            }
            Button(action: performPurchaseCrypto) {
                Text("Купить")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
        }
    }

    private var amountForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Сумма в рублях (номинал контракта)")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.3))
            TextField("0", text: $amountRub)
                .keyboardType(.decimalPad)
                .font(.system(size: 18, weight: .medium))
                .padding(14)
                .background(Color.white)
                .cornerRadius(AppTheme.cornerRadiusSmall)
                .overlay(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall).stroke(Color(white: 0.85), lineWidth: 1))
            Button(action: performPurchaseAmount) {
                Text("Купить")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
        }
    }

    private var stockForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Акция")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.3))
            Picker("Акция", selection: $selectedTicker) {
                ForEach(stocks) { s in
                    Text("\(s.ticker) — \(formatMoney(s.price)) ₽").tag(s.ticker)
                }
            }
            .pickerStyle(.menu)

            Text("Количество")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.3))
            TextField("0", text: $quantityStr)
                .keyboardType(.decimalPad)
                .font(.system(size: 18, weight: .medium))
                .padding(14)
                .background(Color.white)
                .cornerRadius(AppTheme.cornerRadiusSmall)
                .overlay(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall).stroke(Color(white: 0.85), lineWidth: 1))

            if let price = stockPrices[selectedTicker], let q = Double(quantityStr), q > 0 {
                Text("Итого: \(formatMoney(price * q)) ₽")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(white: 0.5))
            }

            Button(action: performPurchaseStockWithActualPrice) {
                Text("Купить")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
        }
    }

    private func performPurchaseStockWithActualPrice() {
        let q = Double(quantityStr.replacingOccurrences(of: ",", with: ".")) ?? 0
        guard q > 0 else { message = "Введите количество"; return }
        Task {
            let prices = await MoexMockService.shared.fetchCurrentPrices(secids: [selectedTicker])
            let price = prices[selectedTicker] ?? stockPrices[selectedTicker] ?? 0
            await MainActor.run {
                performPurchaseStock(price: price)
            }
        }
    }

    private func performPurchaseCrypto() {
        let rub = Double(amountRub.replacingOccurrences(of: ",", with: ".")) ?? 0
        guard rub > 0 else { message = "Введите сумму"; return }
        guard rub <= portfolio.balance else { message = "Недостаточно средств"; return }
        guard let price = cryptoPrices[selectedCrypto], price > 0 else { message = "Ошибка цены"; return }
        let units = rub / price

        var p = Portfolio.load()
        p.balance -= rub
        if let i = p.cryptoHoldings.firstIndex(where: { $0.symbol == selectedCrypto }) {
            p.cryptoHoldings[i].amount += units
        } else {
            p.cryptoHoldings.append(CryptoHolding(symbol: selectedCrypto, amount: units))
        }
        p.save()
        portfolio = p
        message = "Успех! Куплено \(String(format: "%.6f", units)) \(selectedCrypto)."
        onComplete?()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { dismiss() }
    }

    private func performPurchaseAmount() {
        let value = Double(amountRub.replacingOccurrences(of: ",", with: ".")) ?? 0
        guard value > 0 else { message = "Введите сумму"; return }
        guard value <= portfolio.balance else { message = "Недостаточно средств"; return }

        var p = Portfolio.load()
        p.balance -= value
        if assetType == "futures" { p.futuresValueRub += value }
        p.save()
        portfolio = p
        message = "Успех! Покупка на \(formatMoney(value)) ₽."
        onComplete?()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { dismiss() }
    }

    private func performPurchaseStock(price: Double) {
        let q = Double(quantityStr.replacingOccurrences(of: ",", with: ".")) ?? 0
        guard q > 0 else { message = "Введите количество"; return }
        guard price > 0 else { message = "Не удалось получить цену"; return }
        let cost = price * q
        guard cost <= portfolio.balance else { message = "Недостаточно средств"; return }

        var p = Portfolio.load()
        p.balance -= cost
        if let i = p.stockHoldings.firstIndex(where: { $0.ticker == selectedTicker }) {
            p.stockHoldings[i].quantity += q
        } else {
            p.stockHoldings.append(StockHolding(ticker: selectedTicker, quantity: q))
        }
        p.save()
        portfolio = p
        message = "Успех! Куплено \(q) шт. \(selectedTicker) по \(formatMoney(price)) ₽."
        onComplete?()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { dismiss() }
    }

    private func formatMoney(_ v: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: v)) ?? "0"
    }
}
