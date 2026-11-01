//
//  CatchTrendGameView.swift
//  Rubliks
//
//  Мини-игра: персонаж ловит падающие монетки и акции, избегает «убытков».
//

import SwiftUI

private final class CatchTrendGameEngine: ObservableObject {
    enum GamePhase { case start; case playing; case over }
    @Published var phase: GamePhase = .start
    @Published var score: Int = 0
    @Published var combo: Int = 0
    @Published var playerX: CGFloat = 0.5
    @Published var fallingItems: [FallingItem] = []
    @Published var bestScore: Int = UserDefaults.standard.integer(forKey: "catchTrendBest")
    var playAreaSize: CGSize = .zero

    private var timer: Timer?
    private var spawnTimer: Timer?
    private let playerWidth: CGFloat = 80
    private let itemSize: CGFloat = 44
    private let fallSpeed: CGFloat = 2.2
    private let spawnInterval: TimeInterval = 0.9

    func start() {
        stop()
        phase = .playing
        score = 0
        combo = 0
        fallingItems = []
        playerX = 0.5

        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(timer!, forMode: .common)
        spawnTimer = Timer.scheduledTimer(withTimeInterval: spawnInterval, repeats: true) { [weak self] _ in
            self?.spawnOne()
        }
        RunLoop.main.add(spawnTimer!, forMode: .common)
    }

    private func spawnOne() {
        guard phase == .playing else { return }
        let w = playAreaSize.width > 0 ? playAreaSize.width : UIScreen.main.bounds.width
        let item = FallingItem(
            id: UUID(),
            x: CGFloat.random(in: 0.15...0.85),
            y: 0,
            isGood: Bool.random()
        )
        fallingItems.append(item)
    }

    private func tick() {
        guard phase == .playing else { return }
        let width = playAreaSize.width > 0 ? playAreaSize.width : UIScreen.main.bounds.width
        let height = playAreaSize.height > 0 ? playAreaSize.height : UIScreen.main.bounds.height
        let playerCenterX = playerX * (width - playerWidth) + playerWidth / 2
        let catchHalf = (playerWidth + itemSize) / 2

        var newItems: [FallingItem] = []
        for var item in fallingItems {
            item.y += fallSpeed
            if item.y > height + itemSize { continue }
            if item.y >= height - 100 && item.y <= height - 40 {
                let dx = abs(item.x * width - playerCenterX)
                if dx < catchHalf {
                    if item.isGood {
                        combo += 1
                        score += 10 * combo
                    } else {
                        phase = .over
                        if score > bestScore {
                            bestScore = score
                            UserDefaults.standard.set(bestScore, forKey: "catchTrendBest")
                        }
                        stop()
                        return
                    }
                    continue
                }
            }
            if item.isGood && item.y > height - 50 { combo = 0 }
            newItems.append(item)
        }
        fallingItems = newItems
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        spawnTimer?.invalidate()
        spawnTimer = nil
    }
}

struct CatchTrendGameView: View {
    @StateObject private var engine = CatchTrendGameEngine()
    private let appearance = CharacterAppearance.load()

    private let playerWidth: CGFloat = 80
    private let itemSize: CGFloat = 44

    var body: some View {
        ZStack {
            AppTheme.backgroundLightGray.ignoresSafeArea()

            if engine.phase == .start {
                startScreen
            } else if engine.phase == .playing {
                gamePlayView
            } else {
                gameOverView
            }
        }
        .navigationTitle("Поймай тренд")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { engine.stop() }
    }

    private var startScreen: some View {
        VStack(spacing: 24) {
            CharacterAvatarView(appearance: appearance, size: 100)
            Text("Поймай тренд!")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(AppTheme.cardPurpleDark)
            Text("Води пальцем — твой персонаж двигается.\nЛови монетки и акции, избегай убытков.")
                .font(.system(size: 15))
                .foregroundColor(Color(white: 0.45))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            HStack(spacing: 16) {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundColor(.green)
                Text("+ очки")
                    .font(.system(size: 14, weight: .medium))
                Image(systemName: "arrow.down.circle.fill")
                    .foregroundColor(AppTheme.accentRed)
                Text("− жизнь")
                    .font(.system(size: 14, weight: .medium))
            }
            .foregroundColor(Color(white: 0.4))
            Button(action: { engine.start() }) {
                Text("Играть")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .padding(.horizontal, 40)
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var gamePlayView: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let posX = engine.playerX * (w - playerWidth) + playerWidth / 2

            ZStack(alignment: .bottom) {
                Color.clear
                    .onAppear { engine.playAreaSize = geo.size }
                    .onChange(of: geo.size) { newSize in engine.playAreaSize = newSize }
                VStack {
                    HStack {
                        Text("Очки: \(engine.score)")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(AppTheme.cardPurpleDark)
                        if engine.combo > 1 {
                            Text("x\(engine.combo)")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.orange)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    Spacer(minLength: 0)
                }

                ForEach(engine.fallingItems) { item in
                    fallingItemView(item: item, width: w, height: h)
                }

                CharacterAvatarView(appearance: appearance, size: 70)
                    .position(x: posX, y: h - 80)
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { g in
                        engine.playerX = max(0, min(1, g.location.x / w))
                    }
            )
        }
    }

    private func fallingItemView(item: FallingItem, width: CGFloat, height: CGFloat) -> some View {
        let x = item.x * width
        let y = height - item.y
        return Group {
            if item.isGood {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: itemSize))
                    .foregroundColor(Color(red: 0.2, green: 0.75, blue: 0.4))
            } else {
                Image(systemName: "arrow.down.circle.fill")
                    .font(.system(size: itemSize))
                    .foregroundColor(AppTheme.accentRed)
            }
        }
        .position(x: x, y: y)
    }

    private var gameOverView: some View {
        VStack(spacing: 24) {
            Text("Игра окончена")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(Color(white: 0.2))
            Text("Очки: \(engine.score)")
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(AppTheme.cardPurpleDark)
            if engine.score >= engine.bestScore && engine.score > 0 {
                Text("Новый рекорд!")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.orange)
            }
            Text("Рекорд: \(engine.bestScore)")
                .font(.system(size: 14))
                .foregroundColor(Color(white: 0.5))
            Button(action: { engine.start() }) {
                Text("Ещё раз")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 14)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

}

private struct FallingItem: Identifiable {
    let id: UUID
    var x: CGFloat
    var y: CGFloat
    let isGood: Bool
}
