//
//  RugPullGameView.swift
//  Rubliks
//
//  Симулятор раг пула: монета растёт, затем может резко упасть.
//  Ставь деньги, продавай до падения — или проиграешь вложенное.
//

import SwiftUI

// MARK: - Engine

private final class RugPullGameEngine: ObservableObject {
    enum Phase { case idle; case pumping; case crashed }
    @Published var phase: Phase = .idle
    @Published var balance: Double = 10_000
    @Published var invested: Double = 0
    @Published var multiplier: Double = 1.0
    @Published var multiplierHistory: [Double] = [1.0]
    @Published var betAmount: String = "1000"
    @Published var failedMessage: Bool = false

    private var timer: Timer?
    /// Частые обновления экрана (как сейчас).
    private let tickInterval: TimeInterval = 0.22
    /// Рост за один тик: меньше, чем раньше, чтобы за секунду рост был как при старом интервале 0.45.
    private let growthRange: ClosedRange<Double> = 1.02...1.10
    /// Вероятность мгновенного раг пула сразу при вложении (потеря без роста).
    private let instantRugChance: Double = 0.05
    /// Вероятность раг пула: чем выше множитель, тем выше шанс падения.
    private func rugProbability() -> Double {
        let excess = multiplier - 1.0
        return min(0.78, 0.015 + excess * 0.065)
    }

    func invest() {
        guard phase == .idle else { return }
        let amount = Double(betAmount.replacingOccurrences(of: ",", with: ".")) ?? 0
        guard amount > 0, amount <= balance else { return }
        balance -= amount
        invested = amount
        multiplier = 1.0
        multiplierHistory = [1.0]
        failedMessage = false
        if Double.random(in: 0...1) < instantRugChance {
            phase = .crashed
            invested = 0
            failedMessage = true
            multiplierHistory.append(0)
        } else {
            phase = .pumping
            startTimer()
        }
    }

    func sell() {
        guard phase == .pumping, invested > 0 else { return }
        stopTimer()
        balance += invested * multiplier
        invested = 0
        phase = .idle
        multiplier = 1.0
        multiplierHistory = [1.0]
    }

    private func startTimer() {
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: tickInterval, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(timer!, forMode: .common)
    }

    private func tick() {
        guard phase == .pumping else { return }
        if Double.random(in: 0...1) < rugProbability() {
            // Раг пул: падение
            stopTimer()
            invested = 0
            phase = .crashed
            failedMessage = true
            multiplierHistory.append(0)
            return
        }
        multiplier *= Double.random(in: growthRange)
        var hist = multiplierHistory
        hist.append(multiplier)
        if hist.count > 80 { hist.removeFirst() }
        multiplierHistory = hist
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    func playAgain() {
        phase = .idle
        invested = 0
        multiplier = 1.0
        multiplierHistory = [1.0]
        failedMessage = false
    }
}

// MARK: - Chart

private struct MultiplierChartShape: Shape {
    var points: [Double]
    func path(in rect: CGRect) -> Path {
        guard points.count >= 2 else { return Path() }
        let maxP = points.max() ?? 1
        let minP = max(0.5, points.min() ?? 0.5)
        let range = maxP - minP
        guard range > 0 else { return Path() }
        let count = points.count
        let stepX = rect.width / CGFloat(max(1, count - 1))
        func x(_ i: Int) -> CGFloat { CGFloat(i) * stepX }
        func y(_ p: Double) -> CGFloat {
            let t = (p - minP) / range
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

struct RugPullGameView: View {
    @StateObject private var engine = RugPullGameEngine()

    var body: some View {
        ZStack {
            AppTheme.backgroundLightGray.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 24) {
                    header
                    chartBlock
                    balanceBlock
                    if engine.phase == .idle {
                        betBlock
                        investButton
                    } else if engine.phase == .pumping {
                        multiplierBlock
                        sellButton
                    } else if engine.phase == .crashed {
                        failedBlock
                        playAgainButton
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Раг пул")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var header: some View {
        Text("Монета растёт, но в любой момент может рухнуть. Вложи сумму, продай до падения — или потеряешь вложенное.")
            .font(.system(size: 14))
            .foregroundColor(Color(white: 0.45))
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var chartBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Множитель")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Color(white: 0.4))
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall)
                    .fill(Color(white: 0.15))
                MultiplierChartShape(points: engine.multiplierHistory)
                    .stroke(engine.phase == .crashed ? Color.red : Color.green, lineWidth: 2)
                    .padding(12)
            }
            .frame(height: 160)
        }
    }

    private var balanceBlock: some View {
        HStack {
            Text("Баланс")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(white: 0.5))
            Spacer()
            Text("\(formatMoney(engine.balance)) ₽")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(AppTheme.cardPurpleDark)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
    }

    private var betBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Сумма вложения, ₽")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.35))
            TextField("1000", text: $engine.betAmount)
                .keyboardType(.decimalPad)
                .font(.system(size: 18))
                .padding(14)
                .background(Color.white)
                .cornerRadius(AppTheme.cornerRadiusSmall)
                .overlay(RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall).stroke(Color(white: 0.85), lineWidth: 1))
        }
    }

    private var investButton: some View {
        Button(action: { engine.invest() }) {
            Text("Вложить")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(AppTheme.accentRed)
                .cornerRadius(AppTheme.buttonCornerRadius)
        }
        .buttonStyle(.plain)
    }

    private var multiplierBlock: some View {
        VStack(spacing: 8) {
            Text("× \(String(format: "%.2f", engine.multiplier))")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(engine.multiplier >= 1.5 ? .green : Color(white: 0.25))
            if engine.invested > 0 {
                Text("Сейчас: \(formatMoney(engine.invested * engine.multiplier)) ₽")
                    .font(.system(size: 14))
                    .foregroundColor(Color(white: 0.5))
            }
        }
        .padding(.vertical, 8)
    }

    private var sellButton: some View {
        Button(action: { engine.sell() }) {
            Text("Продать")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.green)
                .cornerRadius(AppTheme.buttonCornerRadius)
        }
        .buttonStyle(.plain)
    }

    private var failedBlock: some View {
        VStack(spacing: 12) {
            Text("FAILED")
                .font(.system(size: 32, weight: .black))
                .foregroundColor(.red)
            Text("Монета рухнула. Вложенные деньги обнулены.")
                .font(.system(size: 15))
                .foregroundColor(Color(white: 0.5))
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.red.opacity(0.08))
        .cornerRadius(AppTheme.cornerRadius)
    }

    private var playAgainButton: some View {
        Button(action: { engine.playAgain() }) {
            Text("Играть снова")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(AppTheme.accentRed)
                .cornerRadius(AppTheme.buttonCornerRadius)
        }
        .buttonStyle(.plain)
    }

    private func formatMoney(_ v: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: v)) ?? "0"
    }
}
