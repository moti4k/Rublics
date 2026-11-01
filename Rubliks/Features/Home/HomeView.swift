//
//  HomeView.swift
//  Rubliks
//

import SwiftUI

struct HomeView: View {
    @State private var searchText = ""
    @State private var portfolio = Portfolio.load()
    @State private var showSell = false
    @State private var stocks: [StockItem] = MoexMockService.shared.getStocks()
    private let news = MoexMockService.shared.getNews()
    private let topics = MoexMockService.shared.getTopicCards()

    private var stockPrices: [String: Double] {
        Dictionary(uniqueKeysWithValues: stocks.map { ($0.ticker, $0.price) })
    }
    private var cryptoPrices: [String: Double] {
        MoexMockService.shared.getCryptoPrices()
    }

    private var totalHoldingsValue: Double {
        portfolio.totalStocksValue(prices: stockPrices)
            + portfolio.totalCryptoValue(prices: cryptoPrices)
            + portfolio.futuresValueRub
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                searchBar
                newsCarousel
                balanceRow
                stocksSection
                topicsSection
                if totalHoldingsValue > 0 {
                    whereMoneySection
                }
            }
        }
        .background(AppTheme.backgroundGray)
        .navigationTitle("Рубликс")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            portfolio = Portfolio.load()
            Task { stocks = await MoexMockService.shared.fetchStocks() }
        }
        .refreshable { stocks = await MoexMockService.shared.fetchStocks() }
        .sheet(isPresented: $showSell) {
            SellView(onComplete: nil)
                .onDisappear { portfolio = Portfolio.load() }
        }
    }

    private var searchBar: some View {
        TextField("Поиск", text: $searchText)
            .font(.system(size: 16, weight: .regular))
            .foregroundColor(Color(white: 0.15))
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(AppTheme.searchFieldGray)
            .cornerRadius(AppTheme.cornerRadiusSmall)
            .padding(.horizontal, 20)
            .padding(.top, 8)
    }

    private var newsCarousel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Новости")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(white: 0.2))
                .padding(.horizontal, 20)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(news) { item in
                        NewsCardView(item: item)
                    }
                }
                .padding(.horizontal, 20)
            }
            .frame(height: 130)
        }
    }

    private var balanceRow: some View {
        HStack {
            Text("БАЛАНС")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Color(white: 0.2))
            Spacer()
            HStack(spacing: 4) {
                Text("₽")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(red: 0.75, green: 0.6, blue: 0.15))
                Text(formatBalance(portfolio.balance))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(white: 0.2))
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
        .padding(.horizontal, 20)
    }

    private var stocksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Акции")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(white: 0.2))
                    .padding(.horizontal, 20)
                Spacer()
                NavigationLink(value: TopicRoute.stocks) {
                    Text("Все акции")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppTheme.accentRed)
                        .padding(.trailing, 20)
                }
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(stocks.prefix(6)) { stock in
                        NavigationLink(value: TopicRoute.chart(secid: stock.ticker)) {
                            StockChipView(stock: stock)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
            }
            .frame(height: 72)
        }
    }

    private var topicsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Обучение")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(white: 0.2))
                .padding(.horizontal, 20)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(topics) { topic in
                    TopicCardView(topic: topic)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
    }

    private var whereMoneySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Где лежат деньги")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(white: 0.2))
                Spacer()
                Button("Продать") {
                    showSell = true
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(AppTheme.accentRed)
            }
            .padding(.horizontal, 20)
            VStack(spacing: 0) {
                ForEach(portfolio.stockHoldings) { h in
                    let val = h.quantity * (stockPrices[h.ticker] ?? 0)
                    if val > 0 {
                        row(label: h.ticker, value: val)
                    }
                }
                if !portfolio.stockHoldings.isEmpty && portfolio.totalStocksValue(prices: stockPrices) > 0 {
                    Divider().padding(.horizontal, 16)
                }
                ForEach(portfolio.cryptoHoldings.filter { (cryptoPrices[$0.symbol] ?? 0) * $0.amount > 0 }) { h in
                    row(label: h.symbol, value: (cryptoPrices[h.symbol] ?? 0) * h.amount)
                }
                if portfolio.futuresValueRub > 0 {
                    row(label: "Фьючерсы", value: portfolio.futuresValueRub)
                }
                Divider()
                    .padding(.horizontal, 16)
                HStack {
                    Text("Итого в активах")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color(white: 0.25))
                    Spacer()
                    Text("\(formatBalance(totalHoldingsValue)) ₽")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(AppTheme.cardPurpleDark)
                }
                .padding(16)
            }
            .background(Color.white)
            .cornerRadius(AppTheme.cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
                    .stroke(AppTheme.cardPurpleLight.opacity(0.25), lineWidth: 1)
            )
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
    }

    private func row(label: String, value: Double) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(Color(white: 0.35))
            Spacer()
            Text("\(formatBalance(value)) ₽")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(Color(white: 0.2))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
    
    private func formatBalance(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "0.00"
    }
}

struct NewsCardView: View {
    let item: NewsItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(item.title)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            Text(item.snippet)
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.white.opacity(0.95))
                .lineLimit(3)
        }
        .frame(width: 280, alignment: .leading)
        .padding(16)
        .background(AppTheme.cardPurpleDark)
        .cornerRadius(AppTheme.cornerRadius)
    }
}

struct TopicCardView: View {
    let topic: TopicCard

    var body: some View {
        NavigationLink(value: topic.route) {
            VStack(alignment: .leading, spacing: 6) {
                Text(topic.title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text(topic.description)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundColor(.white.opacity(0.95))
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(topic.color)
            .cornerRadius(AppTheme.cornerRadius)
        }
        .buttonStyle(.plain)
    }
}

struct StockChipView: View {
    let stock: StockItem

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(stock.ticker)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            Text(stock.price >= 1000 ? String(format: "%.0f ₽", stock.price) : String(format: "%.2f ₽", stock.price))
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color(white: 0.5))
            Text(stock.changePercent >= 0 ? "+\(String(format: "%.1f", stock.changePercent))%" : "\(String(format: "%.1f", stock.changePercent))%")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(stock.changePercent >= 0 ? Color.green : Color.red)
        }
        .frame(width: 100, alignment: .leading)
        .padding(12)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
    }
}

