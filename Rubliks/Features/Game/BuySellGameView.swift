//
//  BuySellGameView.swift
//  Rubliks
//
//  «Покупай низко — продавай высоко»: игрок покупает акцию по текущей цене
//  и продаёт, когда цена выросла (или режет убыток). Прибыль/убыток = разница цен.
//

import SwiftUI

// MARK: - Engine

private final class BuySellGameEngine: ObservableObject {
    enum Phase { case start; case playing }
    @Published var phase: Phase = .start
    @Published var balance: Int = 0
    @Published var currentPrice: Double = 500
    @Published var priceHistory: [Double] = []
    @Published var isHolding: Bool = false
    @Published var buyPrice: Double = 0
    @Published var lastTradeResult: Int? = nil
    @Published var tradeMessageId: UUID = UUID()

    private var timer: Timer?
    private let basePrice: Double = 500
    private let maxPoints = 55
    private let stepRange: ClosedRange<Double> = -12...12
    private let priceMin: Double = 220
    private let priceMax: Double = 780

    func start() {
        stop()
        phase = .playing
        balance = 0
        currentPrice = basePrice
        priceHistory = Array(repeating: basePrice, count: maxPoints)
        isHolding = false
        lastTradeResult = nil

        timer = Timer.scheduledTimer(withTimeInterval: 0.12, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(timer!, forMode: .common)
    }

    private func tick() {
        guard phase == .playing else { return }
        let drift = (basePrice - currentPrice) * 0.02
        let step = Double.random(in: stepRange) + drift
        var next = currentPrice + step
        next = min(priceMax, max(priceMin, next))
        currentPrice = next
        var hist = priceHistory
        hist.append(next)
        if hist.count > maxPoints { hist.removeFirst() }
        priceHistory = hist
    }

    func buy() {
        guard phase == .playing, !isHolding else { return }
        isHolding = true
        buyPrice = currentPrice
    }

    func sell() {
        guard phase == .playing, isHolding else { return }
        let profit = Int(round(currentPrice - buyPrice))
        balance += profit
        lastTradeResult = profit
        tradeMessageId = UUID()
        isHolding = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) { [weak self] in
            self?.lastTradeResult = nil
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }
}

// MARK: - Chart Shape

private struct PriceChartShape: Shape {
    var points: [Double]
    var minP: Double
    var maxP: Double

    func path(in rect: CGRect) -> Path {
        guard points.count >= 2, maxP > minP else { return Path() }
        let count = points.count
        let stepX = rect.width / CGFloat(count - 1)
        func x(_ i: Int) -> CGFloat { CGFloat(i) * stepX }
        func y(_ p: Double) -> CGFloat {
            let t = (p - minP) / (maxP - minP)
            return rect.height - CGFloat(t) * rect.height * 0.9 - rect.height * 0.05
        }
        var path = Path()
        path.move(to: CGPoint(x: x(0), y: y(points[0])))
        for i in 1..<count {
            path.addLine(to: CGPoint(x: x(i), y: y(points[i])))
        }
        return path
    }
}

// MARK: - View

struct BuySellGameView: View {
    @StateObject private var engine = BuySellGameEngine()
    private let appearance = CharacterAppearance.load()

    var body: some View {
        ZStack {
            AppTheme.backgroundLightGray.ignoresSafeArea()

            if engine.phase == .start {
                startScreen
            } else {
                playingScreen
            }
        }
        .navigationTitle("Покупай низко — продавай высоко")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { engine.stop() }
    }

    private var startScreen: some View {
        ScrollView {
            VStack(spacing: 24) {
                CharacterAvatarView(appearance: appearance, size: 90)
                Text("Покупай низко — продавай высоко")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(AppTheme.cardPurpleDark)
                    .multilineTextAlignment(.center)
                Text("Цена «акции» меняется. Нажми «Купить», когда кажется низкой, и «Продать», когда выросла. Прибыль — разница между ценой покупки и продажи.")
                    .font(.system(size: 15))
                    .foregroundColor(Color(white: 0.45))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                HStack(spacing: 20) {
                    VStack(spacing: 4) {
                        Image(systemName: "arrow.down.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(Color(red: 0.2, green: 0.7, blue: 0.4))
                        Text("Купить дёшево")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Color(white: 0.5))
                    }
                    VStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(AppTheme.accentRed)
                        Text("Продать дорого")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Color(white: 0.5))
                    }
                }
                .padding(.top, 8)
                Button(action: { engine.start() }) {
                    Text("Играть")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(AppTheme.accentRed)
                        .cornerRadius(AppTheme.buttonCornerRadius)
                }
                .padding(.horizontal, 32)
                .padding(.top, 8)
            }
            .padding(.vertical, 32)
        }
    }

    private var playingScreen: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Прибыль")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(white: 0.5))
                    Text("\(engine.balance >= 0 ? "+" : "")\(engine.balance) ₽")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(engine.balance >= 0 ? Color(red: 0.15, green: 0.6, blue: 0.35) : AppTheme.accentRed)
                }
                Spacer()
                if engine.isHolding {
                    Text("Куплено по \(Int(engine.buyPrice)) ₽")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppTheme.cardPurpleLight)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 8)

            chartSection

            currentPriceSection

            tradePopup

            buttonsSection

            CharacterAvatarView(appearance: appearance, size: 64)
                .padding(.top, 16)
                .padding(.bottom, 24)
        }
    }

    private var chartSection: some View {
        let points = engine.priceHistory
        let minP = (points.min() ?? 0) - 20
        let maxP = (points.max() ?? 500) + 20

        return VStack(alignment: .leading, spacing: 6) {
            Text("График цены")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Color(white: 0.4))
            GeometryReader { geo in
                ZStack(alignment: .bottomLeading) {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.cardPurpleLight.opacity(0.35), lineWidth: 1)
                        )
                    PriceChartShape(points: points, minP: minP, maxP: maxP)
                        .trim(from: 0, to: 1)
                        .stroke(
                            LinearGradient(
                                colors: [AppTheme.cardPurpleDark.opacity(0.8), AppTheme.cardPurpleLight],
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round)
                        )
                        .padding(12)
                }
            }
            .frame(height: 140)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    private var currentPriceSection: some View {
        Text("\(Int(round(engine.currentPrice))) ₽")
            .font(.system(size: 36, weight: .bold))
            .foregroundColor(AppTheme.cardPurpleDark)
            .contentTransition(.numericText())
            .animation(.easeInOut(duration: 0.2), value: Int(round(engine.currentPrice)))
            .padding(.vertical, 12)
    }

    @ViewBuilder
    private var tradePopup: some View {
        if let result = engine.lastTradeResult {
            let isProfit = result >= 0
            Text("\(isProfit ? "+" : "")\(result) ₽")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(isProfit ? Color(red: 0.15, green: 0.65, blue: 0.35) : AppTheme.accentRed)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.95))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.12), radius: 8, x: 0, y: 4)
                .transition(.asymmetric(
                    insertion: .scale(scale: 0.5).combined(with: .opacity),
                    removal: .opacity
                ))
                .id(engine.tradeMessageId)
                .animation(.spring(response: 0.35, dampingFraction: 0.7), value: engine.tradeMessageId)
        }
    }

    private var buttonsSection: some View {
        HStack(spacing: 16) {
            Button(action: {
                withAnimation(.easeInOut(duration: 0.15)) { engine.buy() }
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.system(size: 22))
                    Text("Купить")
                        .font(.system(size: 17, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(engine.isHolding ? Color.gray : Color(red: 0.2, green: 0.65, blue: 0.35))
                .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .disabled(engine.isHolding)
            .buttonStyle(ScaleButtonStyle())

            Button(action: {
                withAnimation(.easeInOut(duration: 0.15)) { engine.sell() }
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 22))
                    Text("Продать")
                        .font(.system(size: 17, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(!engine.isHolding ? Color.gray : AppTheme.accentRed)
                .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .disabled(!engine.isHolding)
            .buttonStyle(ScaleButtonStyle())
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
    }
}

private struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
