//
//  ChartView.swift
//  Rubliks
//

import SwiftUI
import Charts

/// Минимальная ширина одной свечи в точках (лучшие практики: 12–14 pt для читаемости).
private let minCandleWidth: CGFloat = 14

/// Масштаб графика: интервал свечей и объём данных.
enum ChartScale: String, CaseIterable {
    case allTime = "Всё время"
    case months = "Месяцы"
    case days = "Дни"
    case hours = "Часы"
    case minutes = "Минуты"
}

struct ChartView: View {
    var secid: String = "SBER"
    private let service = MoexMockService.shared
    @State private var selectedScale: ChartScale = .days
    @State private var candles: [CandleData] = []
    @State private var volumePoints: [VolumePoint] = []
    @State private var showPurchase = false
    @State private var isLoading = true
    /// Зум по оси Y (пинч): 1 = авто, >1 — приближение, <1 — отдаление.
    @State private var yZoomScale: CGFloat = 1
    /// Зум по оси X (ширина свечей): >1 — свечи шире, <1 — уже (больше видно по времени).
    @State private var xZoomScale: CGFloat = 1
    @State private var gestureMagnification: CGFloat = 1
    @State private var isLoadingOlder = false

    private var displayBalance: Double {
        candles.last?.close ?? 0
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Chart card
                VStack(alignment: .leading, spacing: 12) {
                    // Масштаб графика
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(ChartScale.allCases, id: \.self) { scale in
                                Button(action: { selectedScale = scale }) {
                                    Text(scale.rawValue)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(selectedScale == scale ? .white : Color(white: 0.5))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(selectedScale == scale ? AppTheme.accentRed : Color(white: 0.2))
                                        .cornerRadius(8)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 4)
                    }
                    .padding(.horizontal, 12)

                    ZStack {
                        RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
                            .fill(Color(white: 0.15))
                        
                        if isLoading && candles.isEmpty {
                            ProgressView()
                                .tint(.white)
                        } else if candles.isEmpty {
                            Text("Нет данных")
                                .foregroundColor(.white.opacity(0.8))
                        } else {
                            VStack(spacing: 0) {
                                GeometryReader { geo in
                                    let chartW = max(geo.size.width - 24, CGFloat(candles.count) * minCandleWidth * xZoomScale)
                                    let candleW = chartW / CGFloat(candles.count)
                                    ScrollViewReader { proxy in
                                        ScrollView(.horizontal, showsIndicators: false) {
                                            HStack(spacing: 0) {
                                                VStack(spacing: 0) {
                                                    CandlestickChartView(
                                                        candles: candles,
                                                        candleWidth: candleW,
                                                        yZoomScale: yZoomScale * gestureMagnification
                                                    )
                                                    .frame(width: chartW, height: 196)
                                                    .padding(.horizontal, 12)
                                                    .padding(.top, 12)
                                                    if !volumePoints.isEmpty {
                                                        VolumeChartView(points: volumePoints)
                                                            .frame(width: chartW, height: 64)
                                                            .padding(.horizontal, 12)
                                                            .padding(.bottom, 8)
                                                    }
                                                }
                                                .frame(width: chartW)
                                                Color.clear.frame(width: 1).id("chartEnd")
                                            }
                                            .contentShape(Rectangle())
                                            .gesture(
                                                MagnificationGesture()
                                                    .onChanged { gestureMagnification = $0 }
                                                    .onEnded { _ in
                                                        let m = gestureMagnification
                                                        yZoomScale *= m
                                                        yZoomScale = min(4, max(0.5, yZoomScale))
                                                        xZoomScale *= m
                                                        xZoomScale = min(2.5, max(0.4, xZoomScale))
                                                        gestureMagnification = 1
                                                    }
                                            )
                                        }
                                        .frame(maxWidth: .infinity)
                                        .onAppear { proxy.scrollTo("chartEnd", anchor: .trailing) }
                                        .onChange(of: candles.count) { _ in
                                            Task { @MainActor in
                                                try? await Task.sleep(nanoseconds: 100_000_000)
                                                proxy.scrollTo("chartEnd", anchor: .trailing)
                                            }
                                        }
                                    }
                                }
                                .frame(height: volumePoints.isEmpty ? 220 : 284)

                                if !candles.isEmpty, let oldest = candles.first?.date {
                                    Button(action: { Task { await loadOlderCandles(before: oldest) } }) {
                                        HStack(spacing: 6) {
                                            if isLoadingOlder {
                                                ProgressView().scaleEffect(0.8).tint(AppTheme.accentRed)
                                            }
                                            Text(isLoadingOlder ? "Загрузка…" : "Загрузить более старые данные")
                                                .font(.system(size: 12, weight: .medium))
                                                .foregroundColor(AppTheme.accentRed)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 8)
                                    }
                                    .disabled(isLoadingOlder)
                                    .padding(.horizontal, 12)
                                    .padding(.top, 4)
                                }
                            }
                        }
                    }
                    .frame(height: volumePoints.isEmpty ? 220 : (284 + (candles.isEmpty ? 0 : 44)))
                    
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.up.right")
                            .foregroundColor(.green)
                        Text("₽")
                            .foregroundColor(Color(red: 0.75, green: 0.6, blue: 0.15))
                        Text(formatPrice(displayBalance))
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(Color(white: 0.2))
                    }
                    .padding(.horizontal, 12)

                    Button(action: { showPurchase = true }) {
                        HStack(spacing: 8) {
                            Image(systemName: "cart.fill.badge.plus")
                            Text("Купить акцию \(secid)")
                                .font(.system(size: 14, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(AppTheme.accentRed)
                        .cornerRadius(AppTheme.cornerRadiusSmall)
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 12)
                }
                .background(Color(white: 0.96))
                .cornerRadius(AppTheme.cornerRadius)
                .padding(.horizontal, 20)
                
                // Daily tasks
                Button(action: {}) {
                    Text("ЕЖЕДНЕВНЫЕ ЗАДАНИЯ 4/5")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppTheme.accentRed)
                        .cornerRadius(AppTheme.cornerRadiusSmall)
                }
                .padding(.horizontal, 20)
                
                // Play block
                HStack {
                    Text("Обучающее видео")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(AppTheme.cardPurpleDark)
                    Spacer()
                    Button(action: {}) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 48))
                            .foregroundColor(AppTheme.accentRed)
                    }
                }
                .padding(20)
                .background(AppTheme.cardPurpleLight.opacity(0.3))
                .cornerRadius(AppTheme.cornerRadius)
                .padding(.horizontal, 20)
            }
            .padding(.vertical, 20)
        }
        .background(AppTheme.backgroundGray)
        .navigationTitle(secid)
        .navigationBarTitleDisplayMode(.inline)
        .task(id: secid) { await loadCandles() }
        .task(id: selectedScale) { await loadCandles() }
        .onChange(of: secid) { _ in yZoomScale = 1; xZoomScale = 1; gestureMagnification = 1 }
        .onChange(of: selectedScale) { _ in yZoomScale = 1; xZoomScale = 1; gestureMagnification = 1 }
        .refreshable { await loadCandles() }
        .sheet(isPresented: $showPurchase) {
            PurchaseView(assetType: "stock", initialStockTicker: secid)
        }
    }

    private func loadCandles() async {
        isLoading = true
        candles = await service.fetchCandles(secid: secid, scale: selectedScale)
        volumePoints = service.volumeSeries(from: candles, count: candles.count)
        isLoading = false
    }

    private func loadOlderCandles(before: Date) async {
        guard !isLoadingOlder else { return }
        isLoadingOlder = true
        let older = await service.fetchOlderCandles(secid: secid, scale: selectedScale, before: before)
        if !older.isEmpty {
            let merged = (older + candles).sorted { $0.date < $1.date }
            candles = merged
            volumePoints = service.volumeSeries(from: candles, count: candles.count)
        }
        isLoadingOlder = false
    }
    
    private func formatPrice(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "0.00"
    }
}

// MARK: - Candlestick chart (читаемые свечи, зум по Y, без сжатия по X)
struct CandlestickChartView: View {
    let candles: [CandleData]
    var candleWidth: CGFloat = 14
    var yZoomScale: CGFloat = 1
    
    private var yDomain: ClosedRange<Double> {
        guard !candles.isEmpty else { return 0...1 }
        let lows = candles.map(\.low)
        let highs = candles.map(\.high)
        let dataMin = lows.min() ?? 0
        let dataMax = highs.max() ?? 1
        let padding = max((dataMax - dataMin) * 0.05, 0.5)
        let range = (dataMax - dataMin) + 2 * padding
        let zoomedRange = range / Double(yZoomScale)
        let center = (dataMin + dataMax) / 2
        let minY = center - zoomedRange / 2
        let maxY = center + zoomedRange / 2
        return minY...maxY
    }
    
    var body: some View {
        Chart(candles) { c in
            let isUp = c.close >= c.open
            RectangleMark(
                x: .value("Дата", c.date),
                yStart: .value("Min", min(c.open, c.close)),
                yEnd: .value("Max", max(c.open, c.close)),
                width: .fixed(max(4, candleWidth * 0.8))
            )
            .foregroundStyle(isUp ? Color.green : Color.red)
        }
        .chartYScale(domain: yDomain)
    }
}

struct VolumeChartView: View {
    let points: [VolumePoint]
    
    var body: some View {
        Chart(points) { p in
            BarMark(
                x: .value("Дата", p.date),
                y: .value("Объём", p.value)
            )
            .foregroundStyle(AppTheme.cardPurpleLight.opacity(0.8))
        }
        .chartYScale(domain: .automatic(includesZero: true))
    }
}
