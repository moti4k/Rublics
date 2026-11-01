//
//  FriendsView.swift
//  Rubliks
//

import SwiftUI

enum FriendsRankingType: String, CaseIterable {
    case balance = "По балансу"
    case videos = "По урокам"
    case quiz = "По квизу"
}

struct FriendsView: View {
    @State private var friends: [FriendStats] = FriendsStorage.load()
    @State private var rankingType: FriendsRankingType = .balance
    @State private var addName: String = ""
    @State private var addId: String = ""
    @State private var stocks: [StockItem] = []

    private var portfolio: Portfolio { Portfolio.load() }
    private var stockPrices: [String: Double] {
        Dictionary(uniqueKeysWithValues: stocks.map { ($0.ticker, $0.price) })
    }
    private var cryptoPrices: [String: Double] { MoexMockService.shared.getCryptoPrices() }
    private var myBalance: Double {
        portfolio.balance
            + portfolio.totalStocksValue(prices: stockPrices)
            + portfolio.totalCryptoValue(prices: cryptoPrices)
            + portfolio.futuresValueRub
    }
    private var myStats: FriendStats {
        FriendStats(
            id: "me",
            name: (UserProfile.loadCurrent()?.displayName).map { $0.isEmpty ? "Вы" : $0 } ?? "Вы",
            balanceRub: myBalance,
            videosWatched: UserStats.videosWatched,
            quizCorrectCount: UserStats.quizCorrectCount
        )
    }
    private var rankedList: [FriendStats] {
        let all = [myStats] + friends
        switch rankingType {
        case .balance:
            return all.sorted { $0.balanceRub > $1.balanceRub }
        case .videos:
            return all.sorted { $0.videosWatched > $1.videosWatched }
        case .quiz:
            return all.sorted { $0.quizCorrectCount > $1.quizCorrectCount }
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                addFriendSection
                rankingSection
                listSection
            }
            .padding(20)
        }
        .background(AppTheme.backgroundLightGray)
        .navigationTitle("Друзья")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { friends = FriendsStorage.load() }
        .task {
            if stocks.isEmpty {
                stocks = await MoexMockService.shared.fetchStocks()
            }
        }
    }

    private var addFriendSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Добавить в друзья")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            HStack(spacing: 12) {
                TextField("Имя", text: $addName)
                    .textFieldStyle(.roundedBorder)
                TextField("ID или код", text: $addId)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.default)
                Button(action: addFriend) {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(AppTheme.accentRed)
                        .clipShape(Circle())
                }
                .disabled(addName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(AppTheme.cornerRadius)
        }
    }

    private var rankingSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Рейтинг друзей")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(white: 0.15))
            Picker("Тип рейтинга", selection: $rankingType) {
                ForEach(FriendsRankingType.allCases, id: \.self) { type in
                    Text(type.rawValue).tag(type)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private var listSection: some View {
        VStack(spacing: 0) {
            ForEach(Array(rankedList.enumerated()), id: \.element.id) { index, stat in
                FriendRowView(rank: index + 1, stat: stat, isMe: stat.id == "me", rankingType: rankingType)
            }
        }
    }

    private func addFriend() {
        let name = addName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        let id = addId.trimmingCharacters(in: .whitespaces).isEmpty ? "f_\(UUID().uuidString.prefix(6))" : addId
        let newFriend = FriendStats(
            id: id,
            name: name,
            balanceRub: Double.random(in: 30_000...150_000),
            videosWatched: Int.random(in: 2...20),
            quizCorrectCount: Int.random(in: 10...80)
        )
        FriendsStorage.addFriend(newFriend)
        friends = FriendsStorage.load()
        addName = ""
        addId = ""
    }
}

struct FriendRowView: View {
    let rank: Int
    let stat: FriendStats
    let isMe: Bool
    let rankingType: FriendsRankingType

    var body: some View {
        HStack(spacing: 16) {
            Text("\(rank)")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(rank <= 3 ? AppTheme.accentRed : Color(white: 0.5))
                .frame(width: 28, alignment: .center)
            VStack(alignment: .leading, spacing: 4) {
                Text(stat.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(white: 0.15))
                if isMe {
                    Text("Это вы")
                        .font(.system(size: 12))
                        .foregroundColor(AppTheme.cardPurpleLight)
                }
            }
            Spacer()
            valueText
        }
        .padding(16)
        .background(isMe ? AppTheme.cardPurpleLight.opacity(0.15) : Color.white)
        .cornerRadius(AppTheme.cornerRadiusSmall)
        .padding(.horizontal, 0)
        .padding(.vertical, 4)
    }

    private var valueText: some View {
        Group {
            switch rankingType {
            case .balance:
                Text(formatMoney(stat.balanceRub))
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(white: 0.2))
            case .videos:
                Text("\(stat.videosWatched) уроков")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(white: 0.2))
            case .quiz:
                Text("\(stat.quizCorrectCount) верных")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(white: 0.2))
            }
        }
    }

    private func formatMoney(_ value: Double) -> String {
        if value >= 1_000_000 {
            return String(format: "%.1fМ ₽", value / 1_000_000)
        }
        if value >= 1_000 {
            return String(format: "%.0f тыс. ₽", value / 1_000)
        }
        return String(format: "%.0f ₽", value)
    }
}
