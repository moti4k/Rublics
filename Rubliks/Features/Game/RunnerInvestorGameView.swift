//
//  RunnerInvestorGameView.swift
//  Rubliks
//
//  «Вперёд, инвестор!» — в стиле Google Dino: прыжок и присед, земля-свечи, монеты и жизни.
//

import SwiftUI

private enum RunnerItemType {
    case coin
    case obstacleLow   // камень — перепрыгнуть, -1 жизнь
    case obstacleHigh  // минус — пригнуться, -очки
}

private final class RunnerGameEngine: ObservableObject {
    enum Phase { case start; case playing; case over }
    @Published var phase: Phase = .start
    @Published var score: Int = 0
    @Published var lives: Int = 3
    @Published var characterY: CGFloat = 0.78
    @Published var characterVelocity: CGFloat = 0
    @Published var isCrouching: Bool = false
    @Published var items: [RunnerItem] = []
    @Published var groundOffset: CGFloat = 0
    @Published var bestScore: Int = UserDefaults.standard.integer(forKey: "runnerInvestorBest")
    /// Анимация удара (мигание/тряска)
    @Published var isHitFlashing: Bool = false
    /// Сжатие при отталкивании/приземлении (x, y) — якорь снизу
    @Published var squashScaleX: CGFloat = 1.0
    @Published var squashScaleY: CGFloat = 1.0
    /// Фаза шагов для анимации бега (0..2π)
    @Published var stepPhase: CGFloat = 0

    private var timer: Timer?
    private var spawnTimer: Timer?
    /// Очень слабая гравитация — полёт ещё медленнее, долгое парение
    private let gravity: CGFloat = 0.0026
    private let jumpForce: CGFloat = -0.044
    private let groundY: CGFloat = 0.78
    private let baseSpeed: CGFloat = 0.0095
    private let spawnInterval: TimeInterval = 0.95
    /// Плавный рост скорости: за 60 сек скорость вырастает до ~1.5x, макс 2x
    private let speedGrowthPerSecond: CGFloat = 0.008
    private let maxSpeedMultiplier: CGFloat = 2.0
    /// При приседе в воздухе — быстро тянет вниз к полу
    private let crouchDropBoost: CGFloat = 0.018

    private var gamePlayTime: TimeInterval = 0
    private let charCenterX: CGFloat = 0.22
    private let charWidth: CGFloat = 0.12
    private let charHeightStand: CGFloat = 0.14
    private let charHeightCrouch: CGFloat = 0.08
    /// Зона сбора монет
    private let coinHitboxExtra: CGFloat = 0.06
    /// Штраф очков за минус (пригибаться)
    private let minusPenalty: Int = 10
    /// Ширина/высота хитбоксов препятствий (нормализовано)
    private let rockWidth: CGFloat = 0.06
    private let rockHeight: CGFloat = 0.06
    private let minusWidth: CGFloat = 0.08
    private let minusHeight: CGFloat = 0.05

    func start() {
        stop()
        phase = .playing
        score = 0
        lives = 3
        characterY = groundY
        characterVelocity = 0
        isCrouching = false
        isHitFlashing = false
        squashScaleX = 1.0
        squashScaleY = 1.0
        stepPhase = 0
        items = []
        groundOffset = 0
        gamePlayTime = 0

        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(timer!, forMode: .common)
        spawnTimer = Timer.scheduledTimer(withTimeInterval: spawnInterval, repeats: true) { [weak self] _ in
            self?.spawn()
        }
        RunLoop.main.add(spawnTimer!, forMode: .common)
    }

    private func spawn() {
        guard phase == .playing else { return }
        let roll = Int.random(in: 1...100)
        let type: RunnerItemType
        if roll <= 50 {
            type = .coin
        } else if roll <= 75 {
            type = .obstacleLow
        } else {
            type = .obstacleHigh
        }
        let groundLevel: CGFloat = 0.85  // уровень пола (ноги)
        let y: CGFloat
        switch type {
        case .coin: y = CGFloat.random(in: 0.58...0.66)
        case .obstacleLow: y = groundLevel - rockHeight / 2   // камень стоит на полу
        case .obstacleHigh: y = 0.78   // минус чуть выше (пригибаться)
        }
        let item = RunnerItem(
            id: UUID(),
            x: 1.15,
            y: y,
            type: type
        )
        items.append(item)
    }

    private var currentSpeed: CGFloat {
        let mult = 1.0 + min(CGFloat(gamePlayTime) * speedGrowthPerSecond, maxSpeedMultiplier - 1.0)
        return baseSpeed * mult
    }

    private func tick() {
        guard phase == .playing else { return }
        gamePlayTime += 1.0 / 60.0
        let speed = currentSpeed
        groundOffset += speed
        if groundOffset > 0.08 { groundOffset = 0 }

        let wasFalling = characterVelocity > 0.005
        characterVelocity += gravity
        if isCrouching && characterY < groundY {
            characterVelocity += crouchDropBoost
        }
        characterY += characterVelocity
        if characterY >= groundY {
            characterY = groundY
            if wasFalling {
                triggerLandingSquash()
            }
            characterVelocity = 0
            if !isCrouching {
                stepPhase += 0.22
                if stepPhase > .pi * 2 { stepPhase -= .pi * 2 }
            }
        } else {
            stepPhase = 0
        }
        if characterY < 0.2 { characterY = 0.2 }

        var newItems: [RunnerItem] = []
        let charH = isCrouching ? charHeightCrouch : charHeightStand
        let charTop = characterY - charH / 2
        let charBottom = characterY + charH / 2
        let charLeft = charCenterX - charWidth / 2
        let charRight = charCenterX + charWidth / 2

        for var item in items {
            item.x -= speed
            // Удаляем только при коллизии; если объект прошёл за спину — тоже убираем, чтобы не считать дважды
            let passedCharacter = item.x < charCenterX - 0.18
            if passedCharacter {
                continue
            }
            if item.x < -0.3 {
                continue
            }

            switch item.type {
            case .coin:
                let coinR = 0.04
                let overlapX = charRight > item.x - coinR && charLeft < item.x + coinR
                let overlapY = charBottom > item.y - coinR && charTop < item.y + coinR
                if overlapX && overlapY {
                    score += 10
                    continue
                }
            case .obstacleLow:
                let rockTop = item.y - rockHeight / 2
                let rockBottom = item.y + rockHeight / 2
                let rockLeft = item.x - rockWidth / 2
                let rockRight = item.x + rockWidth / 2
                let overlapX = charRight > rockLeft && charLeft < rockRight
                let overlapY = charBottom > rockTop && charTop < rockBottom
                if overlapX && overlapY {
                    hitByRock()
                    continue
                }
            case .obstacleHigh:
                let minusTop = item.y - minusHeight / 2
                let minusBottom = item.y + minusHeight / 2
                let minusLeft = item.x - minusWidth / 2
                let minusRight = item.x + minusWidth / 2
                let overlapX = charRight > minusLeft && charLeft < minusRight
                let overlapY = charBottom > minusTop && charTop < minusBottom
                if !isCrouching && overlapX && overlapY {
                    score = max(0, score - minusPenalty)
                    continue
                }
            }
            newItems.append(item)
        }
        items = newItems
    }

    private func hitByRock() {
        isHitFlashing = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.isHitFlashing = false
        }
        lives -= 1
        if lives <= 0 {
            phase = .over
            if score > bestScore {
                bestScore = score
                UserDefaults.standard.set(bestScore, forKey: "runnerInvestorBest")
            }
            stop()
        }
    }

    func jump() {
        guard phase == .playing, characterY >= groundY - 0.01 else { return }
        triggerTakeoffSquash()
        characterVelocity = jumpForce
    }

    private func triggerTakeoffSquash() {
        squashScaleX = 1.14
        squashScaleY = 0.86
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.squashScaleX = 1.0
            self?.squashScaleY = 1.0
        }
    }

    private func triggerLandingSquash() {
        squashScaleX = 1.18
        squashScaleY = 0.80
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) { [weak self] in
            self?.squashScaleX = 1.0
            self?.squashScaleY = 1.0
        }
    }

    func setCrouch(_ value: Bool) {
        isCrouching = value
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        spawnTimer?.invalidate()
        spawnTimer = nil
    }
}

private struct RunnerItem: Identifiable {
    let id: UUID
    var x: CGFloat
    var y: CGFloat
    let type: RunnerItemType
}

struct RunnerInvestorGameView: View {
    @StateObject private var engine = RunnerGameEngine()
    private let appearance = CharacterAppearance.load()

    var body: some View {
        ZStack {
            AppTheme.backgroundLightGray.ignoresSafeArea()

            if engine.phase == .start {
                startScreen
            } else if engine.phase == .playing {
                gameView
            } else {
                gameOverView
            }
        }
        .navigationTitle("Вперёд, инвестор!")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { engine.stop() }
    }

    private var startScreen: some View {
        VStack(spacing: 24) {
            CharacterAvatarView(appearance: appearance, size: 90)
            Text("Вперёд, инвестор!")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(AppTheme.cardPurpleDark)
            Text("Тап — прыжок. Кнопка вниз — присед. Монеты +10. Минусы −10 очков. Камень −1 жизнь. 0 жизней — конец.")
                .font(.system(size: 14))
                .foregroundColor(Color(white: 0.45))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
            HStack(spacing: 20) {
                coinBadge
                obstacleLowBadge
                obstacleHighBadge
            }
            Button(action: { engine.start() }) {
                Text("Бежать!")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var coinBadge: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle().fill(
                    LinearGradient(colors: [Color(red: 0.95, green: 0.8, blue: 0.2), Color(red: 0.85, green: 0.6, blue: 0.1)], startPoint: .topLeading, endPoint: .bottomTrailing)
                ).frame(width: 36, height: 36)
                Text("₽")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
            }
            Text("+10")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(white: 0.4))
        }
    }

    private var obstacleLowBadge: some View {
        VStack(spacing: 4) {
            rockView()
                .frame(width: 36, height: 28)
            Text("−1 жизнь")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(white: 0.4))
        }
    }

    private var obstacleHighBadge: some View {
        VStack(spacing: 4) {
            Image(systemName: "chart.line.downtrend.xyaxis")
                .font(.system(size: 20, weight: .medium))
                .foregroundColor(AppTheme.accentRed)
            Text("−10 очков")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(white: 0.4))
        }
    }

    private var gameView: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            ZStack(alignment: .leading) {
                Color(red: 0.97, green: 0.96, blue: 0.95)
                    .ignoresSafeArea()

                groundCandles(width: w, height: h)
                gameItems(w: w, h: h)
                characterView(w: w, h: h)
                HUD(w: w, h: h)
                crouchButton(w: w, h: h)
            }
            .contentShape(Rectangle())
            .onTapGesture { engine.jump() }
            .gesture(
                DragGesture(minimumDistance: 20)
                    .onChanged { g in
                        if g.translation.height > 30 { engine.setCrouch(true) }
                    }
                    .onEnded { _ in engine.setCrouch(false) }
            )
        }
    }

    private func rockView() -> some View {
        ZStack {
            Ellipse()
                .fill(Color(white: 0.35))
                .frame(width: 32, height: 24)
                .offset(x: 2, y: 2)
            Ellipse()
                .fill(Color(white: 0.28))
                .frame(width: 28, height: 20)
                .offset(x: -1, y: -1)
            Ellipse()
                .fill(Color(white: 0.38))
                .frame(width: 18, height: 14)
                .offset(x: 4, y: 2)
        }
        .shadow(color: .black.opacity(0.2), radius: 1, x: 0, y: 1)
    }

    private func groundCandles(width: CGFloat, height: CGFloat) -> some View {
        // Земля ровно на уровне ног: верх полосы = 0.85 (ноги персонажа), низ = 1.0
        let groundTopFraction: CGFloat = 0.85
        let groundHeight = height * (1.0 - groundTopFraction)
        return VStack(spacing: 0) {
            Spacer(minLength: 0)
            Rectangle()
                .fill(Color(red: 0.91, green: 0.87, blue: 0.80))
                .frame(height: groundHeight)
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(Color(white: 0.50))
                        .frame(height: 3)
                }
                .frame(maxWidth: .infinity)
        }
        .frame(height: height)
    }

    private func gameItems(w: CGFloat, h: CGFloat) -> some View {
        Group {
            ForEach(engine.items) { item in
                switch item.type {
                case .coin:
                    ZStack {
                        Circle()
                            .fill(LinearGradient(colors: [Color(red: 0.95, green: 0.78, blue: 0.2), Color(red: 0.88, green: 0.6, blue: 0.1)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 32, height: 32)
                        Text("₽")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .position(x: item.x * w, y: item.y * h)
                case .obstacleLow:
                    rockView()
                        .frame(width: 44, height: 36)
                        .position(x: item.x * w, y: item.y * h)
                case .obstacleHigh:
                    Image(systemName: "chart.line.downtrend.xyaxis")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundColor(AppTheme.accentRed)
                        .position(x: item.x * w, y: item.y * h)
                }
            }
        }
    }

    private func characterView(w: CGFloat, h: CGFloat) -> some View {
        let size: CGFloat = engine.isCrouching ? 52 : 72
        let onGround = engine.characterY >= 0.77 && !engine.isCrouching
        let stepBounce = onGround ? (1.0 + 0.032 * sin(engine.stepPhase)) : 1.0
        return CharacterAvatarView(appearance: appearance, size: size)
            .scaleEffect(x: 1, y: engine.isCrouching ? 0.5 : 1, anchor: .bottom)
            .scaleEffect(x: engine.squashScaleX, y: engine.squashScaleY, anchor: .bottom)
            .scaleEffect(stepBounce)
            .scaleEffect(engine.isHitFlashing ? 1.06 : 1.0)
            .position(x: w * 0.22, y: h * (engine.characterY + (engine.isCrouching ? 0.035 : 0)))
            .overlay {
                if engine.isHitFlashing {
                    Circle()
                        .fill(Color.red.opacity(0.55))
                        .frame(width: size, height: size)
                }
            }
            .animation(.easeInOut(duration: 0.08).repeatCount(3, autoreverses: true), value: engine.isHitFlashing)
            .animation(.easeInOut(duration: 0.1), value: engine.squashScaleY)
    }

    private func HUD(w: CGFloat, h: CGFloat) -> some View {
        VStack {
            HStack {
                Text("Очки: \(engine.score)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(AppTheme.cardPurpleDark)
                Spacer()
                HStack(spacing: 6) {
                    ForEach(0..<3, id: \.self) { i in
                        Image(systemName: i < engine.lives ? "heart.fill" : "heart")
                            .font(.system(size: 20))
                            .foregroundColor(i < engine.lives ? AppTheme.accentRed : Color(white: 0.75))
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            Spacer()
        }
    }

    private func crouchButton(w: CGFloat, h: CGFloat) -> some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                ZStack {
                    Circle()
                        .fill(AppTheme.cardPurpleDark)
                        .frame(width: 64, height: 64)
                    Image(systemName: "arrow.down.to.line")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(.white)
                }
                .contentShape(Circle())
                .frame(width: 88, height: 88)
                .onLongPressGesture(minimumDuration: 0.02, pressing: { pressing in
                    engine.setCrouch(pressing)
                }, perform: {})
                .padding(.trailing, 20)
                .padding(.bottom, 100)
            }
        }
        .allowsHitTesting(true)
    }

    private var gameOverView: some View {
        VStack(spacing: 24) {
            Text("Стоп!")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(Color(white: 0.2))
            Text("Очки: \(engine.score)")
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(AppTheme.cardPurpleDark)
            if engine.score >= engine.bestScore && engine.score > 0 {
                Text("Новый рекорд!")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(red: 0.9, green: 0.65, blue: 0.2))
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
