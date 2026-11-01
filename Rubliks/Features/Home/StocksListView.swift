//
//  StocksListView.swift
//  Rubliks
//

import SwiftUI

struct StocksListView: View {
    @State private var stocks: [StockItem] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading && stocks.isEmpty {
                ProgressView("Загрузка котировок…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(stocks) { stock in
                    NavigationLink(value: TopicRoute.chart(secid: stock.ticker)) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(stock.ticker)
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(Color(white: 0.15))
                                Text(stock.name)
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(white: 0.5))
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                Text(formatPrice(stock.price))
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(Color(white: 0.15))
                                Text(formatPercent(stock.changePercent))
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(stock.changePercent >= 0 ? Color.green : Color.red)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .background(AppTheme.backgroundLightGray)
        .navigationTitle("Акции")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            stocks = await MoexMockService.shared.fetchStocks()
            isLoading = false
        }
    }

    private func formatPrice(_ v: Double) -> String {
        if v >= 1000 {
            return String(format: "%.0f ₽", v)
        }
        return String(format: "%.2f ₽", v)
    }

    private func formatPercent(_ v: Double) -> String {
        let sign = v >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", v))%"
    }
}
