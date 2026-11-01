//
//  GameTabView.swift
//  Rubliks
//

import SwiftUI

/// Корневой экран вкладки «Игра»: выбор режима — Квиз или Поймай тренд.
struct GameTabView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Выбери игру")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Color(white: 0.2))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)

                NavigationLink(destination: GameView()) {
                    gameCard(
                        title: "Квиз по акциям",
                        subtitle: "Проверь знания: вопросы про биржу и инвестиции",
                        icon: "questionmark.circle.fill"
                    )
                }
                .buttonStyle(.plain)

                NavigationLink(destination: BuySellGameView()) {
                    gameCard(
                        title: "Покупай низко — продавай высоко",
                        subtitle: "Покупай акцию по низкой цене, продавай по высокой. Прибыль — разница цен.",
                        icon: "chart.line.uptrend.xyaxis"
                    )
                }
                .buttonStyle(.plain)

                NavigationLink(destination: FinancialChoiceGameView()) {
                    gameCard(
                        title: "Финансовый выбор",
                        subtitle: "Ситуации и решения: что делать с деньгами? Выбирай и узнавай пояснения.",
                        icon: "lightbulb.fill"
                    )
                }
                .buttonStyle(.plain)

                NavigationLink(destination: RunnerInvestorGameView()) {
                    gameCard(
                        title: "Вперёд, инвестор!",
                        subtitle: "Беги, подпрыгивай, собирай дивиденды и уворачивайся от убытков.",
                        icon: "figure.run"
                    )
                }
                .buttonStyle(.plain)

                NavigationLink(destination: RugPullGameView()) {
                    gameCard(
                        title: "Симулятор раг пула",
                        subtitle: "Монета растёт, потом может резко упасть. Вложи сумму, продай до падения — или потеряешь вложенное.",
                        icon: "chart.line.downtrend.xyaxis"
                    )
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 24)
        }
        .background(AppTheme.backgroundLightGray)
        .navigationTitle("Игра")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func gameCard(title: String, subtitle: String, icon: String) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundColor(AppTheme.cardPurpleLight)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(Color(white: 0.15))
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundColor(Color(white: 0.45))
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(white: 0.6))
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(AppTheme.cornerRadius)
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
                .stroke(AppTheme.cardPurpleLight.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }
}
