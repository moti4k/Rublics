//
//  FinancialChoiceGameView.swift
//  Rubliks
//
//  «Финансовый выбор» — сценарии с решениями для детей и подростков.
//  Игрок выбирает вариант, видит результат и короткое пояснение.
//

import SwiftUI

// MARK: - Model

private struct ScenarioItem: Identifiable {
    let id: Int
    let title: String
    let subtitle: String
    let icon: String
    let options: [ScenarioOption]
}

private struct ScenarioOption: Identifiable {
    let id: Int
    let text: String
    let isGood: Bool
    let outcomeTitle: String
    let outcomeDescription: String
}

private let scenarios: [ScenarioItem] = [
    ScenarioItem(
        id: 1,
        title: "Получил 1000₽ на день рождения",
        subtitle: "Что делаешь с деньгами?",
        icon: "gift.fill",
        options: [
            ScenarioOption(id: 0, text: "Часть отложу в копилку, часть потрачу на что хочу", isGood: true, outcomeTitle: "Умный выбор!", outcomeDescription: "Так ты и порадуешь себя, и начнёшь копить на большую цель. Финансисты называют это «планированием»."),
            ScenarioOption(id: 1, text: "Потрачу всё сразу на сладости и развлечения", isGood: false, outcomeTitle: "Не самый выгодный вариант", outcomeDescription: "Деньги быстро закончатся, и ничего не останется на мечту. Попробуй в следующий раз часть отложить.")
        ]
    ),
    ScenarioItem(
        id: 2,
        title: "Друг просит в долг 200₽",
        subtitle: "Он говорит, что вернёт через неделю. У тебя есть эти деньги.",
        icon: "person.2.fill",
        options: [
            ScenarioOption(id: 0, text: "Даю, но договариваемся когда и как вернёт", isGood: true, outcomeTitle: "Правильно!", outcomeDescription: "Договорённость помогает не поссориться и не потерять деньги. Можно даже записать или отправить сообщение."),
            ScenarioOption(id: 1, text: "Даю и не напоминаю — неудобно просить", isGood: false, outcomeTitle: "Рискованно", outcomeDescription: "Без напоминания друг может забыть. Вежливо напомнить — нормально. Так ты учишь и себя, и друга ответственности.")
        ]
    ),
    ScenarioItem(
        id: 3,
        title: "Хочешь новый телефон, а денег не хватает",
        subtitle: "Как поступишь?",
        icon: "iphone",
        options: [
            ScenarioOption(id: 0, text: "Коплю понемногу каждый месяц", isGood: true, outcomeTitle: "Отличная стратегия!", outcomeDescription: "Копить на цель — важный навык. Так ты и телефон получишь, и не будешь никому должен."),
            ScenarioOption(id: 1, text: "Прошу в долг у всех подряд", isGood: false, outcomeTitle: "Лучше не надо", outcomeDescription: "Долги усложняют жизнь. Копить дольше, но спокойнее — ты сам хозяин своим деньгам.")
        ]
    ),
    ScenarioItem(
        id: 4,
        title: "В интернете реклама: «Скидка 90%! Только сегодня!»",
        subtitle: "Товар тебе вроде нравится.",
        icon: "tag.fill",
        options: [
            ScenarioOption(id: 0, text: "Сначала подумаю: нужна ли мне эта вещь вообще", isGood: true, outcomeTitle: "Молодец!", outcomeDescription: "Скидка — не повод покупать. Полезно спросить: «Мне это правда нужно?» Так ты не наберёшь лишнего."),
            ScenarioOption(id: 1, text: "Срочно покупаю, а то упущу", isGood: false, outcomeTitle: "Осторожнее", outcomeDescription: "Такие предложения часто заставляют покупать то, без чего можно обойтись. Пауза и вопрос «а мне это надо?» спасают кошелёк.")
        ]
    ),
    ScenarioItem(
        id: 5,
        title: "Родители выдают карманные деньги раз в неделю",
        subtitle: "Как ими распорядиться?",
        icon: "banknote.fill",
        options: [
            ScenarioOption(id: 0, text: "Часть откладываю, часть трачу на себя", isGood: true, outcomeTitle: "Так и надо!", outcomeDescription: "Распределять деньги — основа финансовой грамотности. Даже маленькая сумма в копилке со временем вырастает."),
            ScenarioOption(id: 1, text: "Трачу всё в первый же день", isGood: false, outcomeTitle: "Можно лучше", outcomeDescription: "Если в конце недели постоянно ноль — попробуй «спрятать» часть в копилку в тот же день. Так проще не потратить.")
        ]
    ),
    ScenarioItem(
        id: 6,
        title: "Нашёл на улице 500₽",
        subtitle: "Никого рядом нет.",
        icon: "eyes",
        options: [
            ScenarioOption(id: 0, text: "Спрошу рядом или отнесу туда, где могут искать потерявшего", isGood: true, outcomeTitle: "Честный поступок!", outcomeDescription: "Чужие деньги возвращать — правильно. Так ты поступаешь как взрослый и ответственный человек."),
            ScenarioOption(id: 1, text: "Оставлю себе", isGood: false, outcomeTitle: "Не лучший выбор", outcomeDescription: "Тот, кто потерял, мог очень нуждаться в этих деньгах. Возврат — это про уважение к другим и к себе.")
        ]
    ),
    ScenarioItem(
        id: 7,
        title: "В соцсетях пишут: «Легко заработать! Переведи 300₽ и получишь больше»",
        subtitle: "Что делаешь?",
        icon: "exclamationmark.shield.fill",
        options: [
            ScenarioOption(id: 0, text: "Не перевожу и рассказываю родителям", isGood: true, outcomeTitle: "Умница!", outcomeDescription: "Так выглядят мошенники. Никто не раздаёт деньги за «входной взнос». Сообщить взрослым — правильный шаг."),
            ScenarioOption(id: 1, text: "Попробую, вдруг правда заплатят", isGood: false, outcomeTitle: "Опасно!", outcomeDescription: "Это типичное мошенничество. Деньги заберут и не вернут. Любое «переведи сначала» в интернете — повод не переводить и спросить взрослых.")
        ]
    )
]

// MARK: - Game State

private final class FinancialChoiceGameState: ObservableObject {
    @Published var phase: Phase = .start
    @Published var currentIndex: Int = 0
    @Published var selectedOptionId: Int? = nil
    @Published var showResult: Bool = false
    @Published var goodChoicesCount: Int = 0

    enum Phase { case start; case playing; case summary }

    var currentScenario: ScenarioItem? {
        guard currentIndex >= 0, currentIndex < scenarios.count else { return nil }
        return scenarios[currentIndex]
    }

    var selectedOption: ScenarioOption? {
        guard let sid = selectedOptionId, let s = currentScenario else { return nil }
        return s.options.first { $0.id == sid }
    }

    var totalScenarios: Int { scenarios.count }

    func start() {
        phase = .playing
        currentIndex = 0
        selectedOptionId = nil
        showResult = false
        goodChoicesCount = 0
    }

    func choose(optionId: Int) {
        guard selectedOptionId == nil else { return }
        selectedOptionId = optionId
        if let opt = currentScenario?.options.first(where: { $0.id == optionId }), opt.isGood {
            goodChoicesCount += 1
            UserStats.quizCorrectCount += 1
        }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
            showResult = true
        }
    }

    func next() {
        if currentIndex + 1 >= scenarios.count {
            phase = .summary
            return
        }
        withAnimation(.easeInOut(duration: 0.25)) {
            showResult = false
            selectedOptionId = nil
            currentIndex += 1
        }
    }

    func replay() {
        start()
    }
}

// MARK: - View

struct FinancialChoiceGameView: View {
    @StateObject private var state = FinancialChoiceGameState()
    private let appearance = CharacterAppearance.load()

    var body: some View {
        ZStack {
            AppTheme.backgroundLightGray.ignoresSafeArea()

            if state.phase == .start {
                startScreen
            } else if state.phase == .playing {
                playingScreen
            } else {
                summaryScreen
            }
        }
        .navigationTitle("Финансовый выбор")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Start

    private var startScreen: some View {
        ScrollView {
            VStack(spacing: 24) {
                CharacterAvatarView(appearance: appearance, size: 90)
                Text("Финансовый выбор")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(AppTheme.cardPurpleDark)
                Text("Читай ситуации и выбирай, как поступить. После выбора увидишь результат и короткое пояснение — так ты научишься принимать решения о деньгах.")
                    .font(.system(size: 15))
                    .foregroundColor(Color(white: 0.45))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 44))
                    .foregroundColor(Color(red: 0.95, green: 0.75, blue: 0.2))
                Button(action: { state.start() }) {
                    Text("Начать")
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

    // MARK: Playing

    private var playingScreen: some View {
        VStack(spacing: 0) {
            progressBar

            if let scenario = state.currentScenario {
                if state.showResult, let opt = state.selectedOption {
                    resultCard(option: opt)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.95)),
                            removal: .opacity
                        ))
                } else {
                    questionCard(scenario: scenario)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.98)),
                            removal: .opacity
                        ))
                }
            }

            Spacer(minLength: 16)
            CharacterAvatarView(appearance: appearance, size: 56)
                .padding(.bottom, 20)
        }
        .padding(.horizontal, 20)
    }

    private var progressBar: some View {
        HStack(spacing: 6) {
            ForEach(0..<state.totalScenarios, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(i <= state.currentIndex ? AppTheme.cardPurpleDark : Color(white: 0.85))
                    .frame(height: 4)
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 12)
        .padding(.bottom, 16)
    }

    private func questionCard(scenario: ScenarioItem) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 12) {
                Image(systemName: scenario.icon)
                    .font(.system(size: 28))
                    .foregroundColor(AppTheme.cardPurpleLight)
                Text("Ситуация \(state.currentIndex + 1) из \(state.totalScenarios)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(white: 0.5))
            }
            Text(scenario.title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            Text(scenario.subtitle)
                .font(.system(size: 15))
                .foregroundColor(Color(white: 0.45))

            VStack(spacing: 12) {
                ForEach(scenario.options) { opt in
                    Button(action: { state.choose(optionId: opt.id) }) {
                        HStack(spacing: 12) {
                            Image(systemName: "circle")
                                .font(.system(size: 20))
                                .foregroundColor(AppTheme.cardPurpleLight)
                            Text(opt.text)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(Color(white: 0.2))
                                .multilineTextAlignment(.leading)
                            Spacer()
                        }
                        .padding(16)
                        .background(Color(white: 0.97))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.cardPurpleLight.opacity(0.4), lineWidth: 1)
                        )
                    }
                    .buttonStyle(ChoiceButtonStyle())
                }
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadius)
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
                .stroke(AppTheme.cardPurpleLight.opacity(0.3), lineWidth: 1)
        )
    }

    private func resultCard(option: ScenarioOption) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                Image(systemName: option.isGood ? "checkmark.circle.fill" : "info.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(option.isGood ? Color(red: 0.2, green: 0.65, blue: 0.35) : Color(red: 0.95, green: 0.6, blue: 0.2))
                Text(option.outcomeTitle)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(option.isGood ? Color(red: 0.15, green: 0.55, blue: 0.3) : Color(white: 0.25))
            }
            Text(option.outcomeDescription)
                .font(.system(size: 15))
                .foregroundColor(Color(white: 0.4))
                .fixedSize(horizontal: false, vertical: true)
            Button(action: { state.next() }) {
                HStack {
                    Text(state.currentIndex + 1 >= state.totalScenarios ? "Узнать результат" : "Далее")
                        .font(.system(size: 16, weight: .bold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(AppTheme.accentRed)
                .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .buttonStyle(ChoiceButtonStyle())
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadius)
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
                .stroke(option.isGood ? Color(red: 0.2, green: 0.65, blue: 0.35).opacity(0.5) : AppTheme.cardPurpleLight.opacity(0.3), lineWidth: 1.5)
        )
    }

    // MARK: Summary

    private var summaryScreen: some View {
        VStack(spacing: 28) {
            Image(systemName: "star.circle.fill")
                .font(.system(size: 70))
                .foregroundColor(Color(red: 0.95, green: 0.75, blue: 0.2))
            Text("Готово!")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            Text("Удачных выборов: \(state.goodChoicesCount) из \(state.totalScenarios)")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(AppTheme.cardPurpleDark)
            Text(summaryMessage)
                .font(.system(size: 15))
                .foregroundColor(Color(white: 0.45))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button(action: { state.replay() }) {
                Text("Пройти ещё раз")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 28)
                    .padding(.vertical, 14)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
            .buttonStyle(ChoiceButtonStyle())
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var summaryMessage: String {
        let p = state.totalScenarios > 0 ? Double(state.goodChoicesCount) / Double(state.totalScenarios) : 0
        if p >= 1.0 { return "Ты отлично справился! Твои решения показывают, что ты думаешь о деньгах осознанно." }
        if p >= 0.7 { return "Хороший результат! Продолжай думать перед выбором — каждая ситуация учит чему-то новому." }
        if p >= 0.5 { return "Неплохо! В следующий раз постарайся чуть больше обдумывать последствия выбора." }
        return "Каждая ситуация — урок. Пройди игру ещё раз и посмотри пояснения к ответам — так станет понятнее."
    }
}

private struct ChoiceButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
