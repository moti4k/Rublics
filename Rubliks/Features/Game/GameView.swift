//
//  GameView.swift
//  Rubliks
//

import SwiftUI

struct GameView: View {
    @State private var quizState: QuizState
    @State private var selectedIndex: Int?
    @State private var showExplanation = false
    private let appearance = CharacterAppearance.load()

    init() {
        let items = MoexMockService.shared.getQuizItems()
        _quizState = State(initialValue: QuizState(currentIndex: 0, selectedOptionIndex: nil, items: items))
        _selectedIndex = State(initialValue: nil)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            AppTheme.backgroundLightGray.ignoresSafeArea()

            if quizState.currentIndex < quizState.items.count {
                let item = quizState.items[quizState.currentIndex]
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        HStack {
                            CharacterAvatarView(appearance: appearance, size: 56)
                            if !appearance.name.isEmpty {
                                Text("\(appearance.name), вперёд!")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color(white: 0.4))
                            }
                            Spacer()
                        }
                        questionBlock(item: item)
                        if showExplanation {
                            explanationBlock(item: item)
                        }
                        optionsBlock(item: item)
                        nextButton
                    }
                    .padding(20)
                }
            } else {
                completionView
            }
        }
        .navigationTitle("Игра")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func questionBlock(item: QuizItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Вопрос \(quizState.currentIndex + 1) из \(quizState.items.count)")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(AppTheme.cardPurpleLight)
            Text(item.question)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(white: 0.12))
                .multilineTextAlignment(.leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadius)
    }

    private func explanationBlock(item: QuizItem) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(Color(red: 0.95, green: 0.75, blue: 0.2))
                Text("Пояснение")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(white: 0.25))
            }
            if let correctIdx = item.correctAnswerIndex, correctIdx >= 0, correctIdx < item.options.count {
                let correctText = item.options[correctIdx]
                let isCorrect = selectedIndex == correctIdx
                HStack(spacing: 8) {
                    Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(isCorrect ? Color.green : Color.red)
                    Text(isCorrect ? "Верно!" : "Правильный ответ: \(correctText)")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color(white: 0.2))
                }
                .padding(.vertical, 4)
            }
            Text(item.explanation)
                .font(.system(size: 15, weight: .regular))
                .foregroundColor(Color(white: 0.35))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppTheme.cardPurpleLight.opacity(0.15))
        .cornerRadius(AppTheme.cornerRadiusSmall)
    }

    private func optionsBlock(item: QuizItem) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Выберите ответ:")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.35))
            ForEach(Array(item.options.enumerated()), id: \.offset) { index, option in
                QuizOptionRow(
                    text: option,
                    isSelected: selectedIndex == index,
                    onTap: { selectedIndex = index }
                )
            }
        }
    }

    private var nextButton: some View {
        Button(action: goNext) {
            HStack {
                Text(showExplanation ? "Далее" : "Ответить")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                Image(systemName: "arrow.right")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(selectedIndex != nil ? AppTheme.accentRed : Color.gray)
            .cornerRadius(AppTheme.buttonCornerRadius)
        }
        .disabled(selectedIndex == nil)
    }

    private var completionView: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 70))
                .foregroundColor(Color.green)
            Text("Квиз пройден!")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            Text("Вы ответили на все вопросы. Загляните в пояснения — они помогут закрепить знания.")
                .font(.system(size: 15))
                .foregroundColor(Color(white: 0.45))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button(action: {
                let items = MoexMockService.shared.getQuizItems()
                quizState = QuizState(currentIndex: 0, selectedOptionIndex: nil, items: items)
                selectedIndex = nil
                showExplanation = false
            }) {
                Text("Начать заново")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 14)
                    .background(AppTheme.accentRed)
                    .cornerRadius(AppTheme.buttonCornerRadius)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func goNext() {
        if showExplanation {
            if quizState.currentIndex < quizState.items.count - 1 {
                quizState = QuizState(currentIndex: quizState.currentIndex + 1, selectedOptionIndex: nil, items: quizState.items)
                selectedIndex = nil
                showExplanation = false
            } else {
                quizState = QuizState(currentIndex: quizState.items.count, selectedOptionIndex: nil, items: quizState.items)
            }
        } else {
            if let idx = selectedIndex,
               let correctIdx = quizState.items[quizState.currentIndex].correctAnswerIndex,
               idx == correctIdx {
                UserStats.quizCorrectCount += 1
            }
            showExplanation = true
        }
    }
}

struct QuizOptionRow: View {
    let text: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    Circle()
                        .stroke(isSelected ? AppTheme.accentRed : Color(white: 0.8), lineWidth: 2)
                        .frame(width: 24, height: 24)
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(AppTheme.accentRed)
                    }
                }
                Text(text)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(Color(white: 0.2))
                    .multilineTextAlignment(.leading)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.white)
            .cornerRadius(AppTheme.cornerRadiusSmall)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.cornerRadiusSmall)
                    .stroke(isSelected ? AppTheme.accentRed : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}
